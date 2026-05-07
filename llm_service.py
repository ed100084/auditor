import asyncio
import json
import logging
import re
import threading
import time
import uuid
from typing import List

from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage
from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import HttpResponseError
from fastapi.concurrency import run_in_threadpool

from config import settings
from frameworks import get_framework_text, get_framework_names

logger = logging.getLogger(__name__)

_client = None


def _get_client() -> ChatCompletionsClient:
    global _client
    if _client is None:
        _client = ChatCompletionsClient(
            endpoint=settings.AZURE_AI_ENDPOINT,
            credential=AzureKeyCredential(settings.AZURE_AI_KEY),
        )
    return _client


def _call_with_retry(fn, retries: int = 3, base_delay: float = 5.0):
    """對 429/503 自動重試，指數退避"""
    for attempt in range(retries):
        try:
            return fn()
        except HttpResponseError as e:
            status = e.status_code if hasattr(e, "status_code") else 0
            if status in (429, 503) and attempt < retries - 1:
                wait = base_delay * (2 ** attempt)  # 5s, 10s, 20s
                logger.warning(f"Azure 限流 (HTTP {status})，{wait:.0f}s 後重試 (第{attempt+1}次)...")
                time.sleep(wait)
            else:
                raise
    raise RuntimeError("重試次數已用盡")


def _strip_json_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    return text.strip()


def _repair_truncated_json(text: str) -> str:
    """修復被截斷的 JSON：追蹤括號堆疊，找最後一個完整物件後補上正確收尾"""
    try:
        json.loads(text)
        return text
    except json.JSONDecodeError:
        pass

    # 逐字元追蹤括號堆疊，每次關閉一個 { 時記錄候選截斷點和所需收尾序列
    stack = []          # 儲存未關閉的 '{' 或 '['
    in_string = False
    escape_next = False
    candidates = []     # (截斷位置, 收尾字串)

    for i, ch in enumerate(text):
        if escape_next:
            escape_next = False
            continue
        if ch == '\\' and in_string:
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue

        if ch in ('{', '['):
            stack.append(ch)
        elif ch == '}' and stack and stack[-1] == '{':
            stack.pop()
            closing = ''.join(']' if c == '[' else '}' for c in reversed(stack))
            candidates.append((i + 1, closing))
        elif ch == ']' and stack and stack[-1] == '[':
            stack.pop()

    for pos, closing in reversed(candidates):
        candidate = text[:pos] + closing
        try:
            json.loads(candidate)
            logger.warning(f"JSON 已修復：保留 {pos}/{len(text)} chars，收尾='{closing}'")
            return candidate
        except json.JSONDecodeError:
            continue

    raise ValueError("JSON 無法修復：找不到任何完整物件")


def _build_qa_text(questions: list, responses: list) -> str:
    resp_map = {r["question_id"]: r["response_text"] for r in responses}
    parts = []
    for i, q in enumerate(questions, 1):
        ans = resp_map.get(q["id"], "[未提供回覆]")
        parts.append(
            f"Q{i} [{q.get('category', '')} | {q.get('source_framework', '')}]"
            f"（依據：{q.get('reference', '')}）\n"
            f"問題：{q['text']}\n"
            f"受稽單位回覆：{ans}"
        )
    return "\n\n---\n\n".join(parts)


async def generate_questions(
    framework_ids: List[str],
    custom_text: str,
    scope: str,
    context: str,
    responsibility_level: str | None,
) -> list:
    framework_text = get_framework_text(framework_ids, custom_text, compact=True)
    framework_names = ", ".join(get_framework_names(framework_ids))
    if custom_text:
        framework_names += ", 自訂法規文件"

    level_note = ""
    if responsibility_level:
        level_note = f"\n\n受稽單位責任等級：**{responsibility_level} 級**。請依此等級之適用控制要求產生問題。"

    system_prompt = "\n".join([
        "你是一位資深資通安全稽核委員，擅長以「系統性稽核探詢」手法揭露整體性資安問題。",
        "根據提供的法規框架與稽核範圍，設計一份能辨識系統性缺失的深度稽核問題清單。",
        "",
        "【核心概念：系統性稽核探詢 vs 傳統單問題稽核】",
        "傳統稽核一題只問「有無」某項措施，讓受稽單位得以表面應付。",
        "系統性探詢每題整合多個稽核角度，要求受稽單位交代完整 PDCA 循環。",
        "稽核委員從回答的完整性、前後一致性與邏輯辨別真正的制度成熟度，",
        "並從「說不清楚的部分」找到系統性弱點：制度缺口、執行落差、監控盲點、改善失靈。",
        "",
        "【每題必須覆蓋以下四個角度中的至少三個】",
        "  P 計畫：相關政策/程序是否完備？上次修訂時間與主管單位為何？",
        "  D 執行：實際如何執行？由哪個職位負責？流程時效或頻率為何？",
        "  C 查核：如何驗證執行成效？有哪些指標或稽核機制？最近一次結果為何？",
        "  A 改善：過去發現哪些問題？如何改善？改善效果是否持續追蹤？",
        "",
        "【每題另須包含以下至少一項手法】",
        "  佐證要求：明確請受稽單位提供可查核的文件/紀錄/系統截圖",
        "  例外情境：詢問當發生特定異常或失敗時的處理方式（辨別真實執行能力）",
        "",
        "【問題格式（固定五段結構，各段以 \\n 換行）】",
        "  【{控制領域主題}】{一句話說明本題稽核重點}",
        "  (1) {P 或 D 面問題，要求說明機制或流程}",
        "  (2) {D 或 C 面問題，要求舉例或說明頻率/結果}",
        "  (3) {C 或 A 面問題，要求數字/時間/追蹤結果}",
        "  (4) 例外情境：{描述一個具體失敗/異常場景}，此時如何處理？上次發生是何時？",
        "  ★ 請提供：{指定應出示的文件/截圖/紀錄名稱}",
        "",
        "【輸出規則】",
        "- 僅輸出純 JSON array，不含 markdown 或說明文字",
        '- 格式（每題一個物件，最終輸出為完整 JSON array）：{"id":"<uuid>","text":"【領域】重點\\n(1) 問題一\\n(2) 問題二\\n(3) 問題三\\n(4) 例外情境：描述...\\n★ 請提供：文件","category":"<稽核領域>","source_framework":"<法規名稱>","reference":"<條文或控制編號>","dimension":"systemic"}',
        "- 稽核領域限用：治理與合規、風險管理、資產管理、存取控制、委外管理、事件應變、業務持續、情資威脅、教育訓練、隱私保護",
        "- 產生 10–14 題，依本次稽核範圍與情境的高風險控制領域排序，不必面面俱到但每題需有實質深度",
        "- 各題聚焦不同控制領域（不重複），問題直接具體，避免可用「是/否」一句回答的封閉問題",
        "- text 中的換行一律使用 \\n，不可使用真實換行符或其他跳脫字元",
    ])

    user_message = (
        f"適用法規框架：{framework_names}\n\n"
        f"法規參考內容：\n{framework_text}\n\n"
        f"稽核範圍：{scope}\n\n"
        f"稽核情境/背景：{context}"
        f"{level_note}\n\n"
        "請產生稽核問題清單。"
    )

    msgs = [SystemMessage(content=system_prompt), UserMessage(content=user_message)]
    response = await run_in_threadpool(
        lambda: _call_with_retry(lambda: _get_client().complete(
            messages=msgs,
            model=settings.AZURE_AI_MODEL,
            max_tokens=4096,
            temperature=0.3,
        ))
    )

    logger.info(f"[generate_questions] finish_reason={getattr(response.choices[0], 'finish_reason', 'N/A')}")

    choice = response.choices[0]
    finish_reason = getattr(choice, "finish_reason", None)
    raw = choice.message.content

    if not raw:
        raise ValueError(
            f"模型回傳空內容（finish_reason={finish_reason}）。"
            "可能原因：內容被過濾、Token 超出限制或模型部署問題。"
        )

    raw = _strip_json_fences(raw)
    raw = _repair_truncated_json(raw)
    questions = json.loads(raw)

    # 確保每題都有 UUID id
    for q in questions:
        if not q.get("id"):
            q["id"] = str(uuid.uuid4())

    return questions


async def _stream_sse(msgs: list, max_tokens: int, temperature: float):
    """真正的 LLM streaming：逐 token 透過 SSE 推送給前端。
    以 daemon thread 執行 Azure streaming call，透過 asyncio.Queue 橋接到 async generator。
    JSON 截斷時透過 repair 事件通知前端替換 buffer，_repair_truncated_json 作為 fallback。
    """
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue()

    def _run_stream():
        try:
            # 初始請求失敗時（429/503）自動重試；mid-stream 錯誤直接傳遞
            response = _call_with_retry(lambda: _get_client().complete(
                messages=msgs,
                model=settings.AZURE_AI_MODEL,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=True,
            ))
            finish_reason = None
            for update in response:
                if update.choices:
                    choice = update.choices[0]
                    if choice.delta and choice.delta.content:
                        token = choice.delta.content
                        asyncio.run_coroutine_threadsafe(
                            queue.put(("token", token)), loop
                        ).result(timeout=30)
                    if choice.finish_reason:
                        finish_reason = str(choice.finish_reason)
            asyncio.run_coroutine_threadsafe(
                queue.put(("done", finish_reason)), loop
            ).result(timeout=5)
        except Exception as exc:
            asyncio.run_coroutine_threadsafe(
                queue.put(("error", exc)), loop
            ).result(timeout=5)

    thread = threading.Thread(target=_run_stream, daemon=True)
    thread.start()

    buffer = []
    finish_reason = None

    while True:
        kind, value = await asyncio.wait_for(queue.get(), timeout=120)
        if kind == "error":
            raise value
        if kind == "done":
            finish_reason = value
            break
        # kind == "token"
        buffer.append(value)
        yield f"data: {json.dumps({'chunk': value})}\n\n"

    thread.join(timeout=5)

    if finish_reason and finish_reason not in ("stop",):
        logger.warning(f"LLM finish_reason={finish_reason}，嘗試修復 JSON")

    raw = _strip_json_fences("".join(buffer))
    try:
        json.loads(raw)
    except json.JSONDecodeError:
        try:
            repaired = _repair_truncated_json(raw)
            logger.warning("JSON 已修復，透過 repair 事件通知前端替換 buffer")
            yield f"data: {json.dumps({'repair': repaired})}\n\n"
        except ValueError:
            logger.error("JSON 修復失敗，前端將顯示重試提示")

    yield "data: [DONE]\n\n"


async def stream_findings(session: dict):
    framework_ids = session.get("frameworks", [])
    custom_text = session.get("custom_framework_text", "")
    framework_text = get_framework_text(framework_ids, custom_text)
    framework_names = ", ".join(get_framework_names(framework_ids))
    if custom_text:
        framework_names += ", 自訂法規文件"

    scope = session.get("scope", "")
    context = session.get("context", "")
    responsibility_level = session.get("responsibility_level")
    questions = session.get("questions", [])
    responses = session.get("responses", [])

    level_note = f"，受稽單位責任等級：{responsibility_level} 級" if responsibility_level else ""

    qa_text = _build_qa_text(questions, responses)

    json_schema = (
        '{"executive_summary":"string","findings":['
        '{"title":"string","risk_level":"High|Medium|Low",'
        '"regulatory_reference":"string","legal_basis":"string",'
        '"legal_requirement":"string","condition":"string",'
        '"criteria":"string","cause":"string","effect":"string",'
        '"recommendation":"string"}]}'
    )
    system_prompt = "\n".join([
        "你是一位資深資通安全稽核委員，負責撰寫正式稽核發現報告。",
        "根據稽核問答紀錄，對照適用法規框架，識別不符合事項並產生結構化稽核發現。",
        "",
        "輸出規則：",
        "- 僅輸出純 JSON object，不含 markdown、說明文字或其他內容",
        f"- 格式：{json_schema}",
        "- executive_summary：繁體中文，2-3 段，適合機關首長閱覽",
        "- legal_basis：法源依據，列出所有適用的具體法條全名（條號層級）",
        "  範例：「資通安全管理法第18條第1項、資通安全責任等級分級辦法第7條第1項」",
        "  若適用多個法條請以頓號（、）連接",
        "- legal_requirement：應辦事項，直接引用法條原文中規定義務的段落",
        "  即法條中「機關應…」、「應辦理…」、「不得…」等強制規定的原文文字",
        "  若涉及多條法規，分段列出各條文的義務原文",
        "  範例：「資通安全管理法第18條：各機關辦理資通安全稽核，應就資通安全政策…」",
        "- condition：現況，稽核發現的具體事實（引用受稽單位回覆為佐證）",
        "- criteria：準則，以白話說明本項應達到的合規狀態（非法條原文）",
        "- cause：原因，造成落差的根本原因（制度面、人員面、技術面）",
        "- effect：影響，可能造成的風險或損害（具體描述）",
        "- recommendation：建議改善事項，稽核委員針對缺失提出的具體改善措施與建議完成期限",
        "",
        "風險等級判定：",
        "- High：可能立即造成資安事件、法律責任或重大營運影響",
        "- Medium：存在控制缺口，若不改善可能演變為事件",
        "- Low：最佳實踐落差，近期風險有限",
        "",
        "重要原則：",
        "- 僅針對有具體證據支持的問題產生發現",
        "- 若回覆顯示已完全符合要求，不產生該項發現",
        "- regulatory_reference 為簡短引用（標題旁顯示），legal_basis 為完整條文全名",
        "- legal_requirement 必須是法條原文，不可改寫或摘要",
        "- 發現依風險等級由高至低排序",
    ])

    user_message = (
        f"稽核範圍：{scope}{level_note}\n"
        f"適用法規框架：{framework_names}\n\n"
        f"法規參考內容：\n{framework_text}\n\n"
        f"稽核問答紀錄：\n{qa_text}\n\n"
        "請產生稽核發現報告。"
    )

    msgs = [SystemMessage(content=system_prompt), UserMessage(content=user_message)]
    return _stream_sse(msgs, max_tokens=8192, temperature=0.2)


async def stream_gov_findings(session: dict):
    """政府機關格式稽核發現報告（衛福部/數位部 CI 稽核格式）"""
    framework_ids = session.get("frameworks", [])
    custom_text = session.get("custom_framework_text", "")
    framework_text = get_framework_text(framework_ids, custom_text)
    framework_names = ", ".join(get_framework_names(framework_ids))
    if custom_text:
        framework_names += ", 自訂法規文件"

    scope = session.get("scope", "")
    context = session.get("context", "")
    responsibility_level = session.get("responsibility_level")
    questions = session.get("questions", [])
    responses = session.get("responses", [])

    level_note = f"，受稽單位責任等級：{responsibility_level} 級" if responsibility_level else ""
    qa_text = _build_qa_text(questions, responses)

    json_schema = (
        '{"executive_summary":"string","findings":['
        '{"finding_type":"法規不符合|待改善缺失|建議缺失",'
        '"title":"string",'
        '"legal_basis":"string",'
        '"legal_text":"string",'
        '"finding_description":"string",'
        '"evidence":["string"],'
        '"recommendation":"string"}]}'
    )

    system_prompt = "\n".join([
        "你是一位資深資通安全稽核委員，依照台灣政府機關資安稽核格式（衛福部/數位部 CI 稽核）撰寫正式稽核發現報告。",
        "根據稽核問答紀錄，對照適用法規框架，識別缺失並產生結構化稽核發現。",
        "",
        "【稽核發現類型定義】",
        "- 法規不符合：有明確法規條文要求，但受稽單位完全未執行或嚴重偏離，屬強制改善事項",
        "- 待改善缺失：執行不完整、程序不健全，或雖有執行但未達預期效果，需限期改善",
        "- 建議缺失：現況雖符合法規基本要求，但仍有強化空間，屬建議性質",
        "",
        "【欄位說明】",
        "- finding_type：三種類型之一（法規不符合 / 待改善缺失 / 建議缺失）",
        "- title：本項缺失的簡短標題，20 字以內",
        "- legal_basis：法源依據，具體條文全名（條號層級），例：「資通安全管理法第18條第1項」",
        "  若適用多個法條以頓號（、）連接",
        "- legal_text：應辦事項，直接引用法條原文中的強制義務段落（「機關應…」「應辦理…」「不得…」等）",
        "  格式：「[法規名稱第X條]：原文內容」，若涉及多條法規分段列出",
        "  此欄位必須是法條原文，不可自行改寫或摘要",
        "- finding_description：稽核發現說明，具體描述觀察到的不符合事實，引用受稽單位回覆為佐證",
        "- evidence：佐證資料清單（array），列出已確認的文件/系統畫面/訪談內容等，若無具體佐證則填 [\"受稽單位訪談紀錄\"]",
        "- recommendation：改善建議，具體可執行的改善措施，依發現類型給予建議完成期限",
        "  法規不符合：建議 1 個月內完成；待改善缺失：3 個月內；建議缺失：6 個月內",
        "",
        "【輸出規則】",
        "- 僅輸出純 JSON object，不含 markdown 或說明文字",
        f"- 格式：{json_schema}",
        "- executive_summary：繁體中文，2-3 段，適合機關首長閱覽",
        "- 發現依類型排序：法規不符合 → 待改善缺失 → 建議缺失",
        "- 僅針對有具體缺失的項目產生發現，若受稽單位回覆顯示已完全符合則不產生",
        "- legal_text 必須是法條原文，不可改寫",
    ])

    user_message = (
        f"稽核範圍：{scope}{level_note}\n"
        f"適用法規框架：{framework_names}\n\n"
        f"法規參考內容：\n{framework_text}\n\n"
        f"稽核問答紀錄：\n{qa_text}\n\n"
        "請以政府機關稽核格式產生稽核發現報告。"
    )

    msgs = [SystemMessage(content=system_prompt), UserMessage(content=user_message)]
    return _stream_sse(msgs, max_tokens=8192, temperature=0.2)
