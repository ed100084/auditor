"""
LLM 服務（僅用於稽核發現報告生成）

設計決策：
─────────
本檔案只保留 Step 5 的稽核發現生成。
Step 3 的問題生成已改用 question_bank + matcher（純 Python，無 LLM）。

提供：
─────
- stream_findings()      IIA 5C 格式稽核發現（SSE 串流）
- stream_gov_findings()  政府機關格式稽核發現（SSE 串流）
"""

import asyncio
import json
import logging
import re
import threading
import time
import uuid

from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage
from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import HttpResponseError

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
    """對 429/503 自動重試，指數退避。"""
    for attempt in range(retries):
        try:
            return fn()
        except HttpResponseError as e:
            status = getattr(e, "status_code", 0)
            if status in (429, 503) and attempt < retries - 1:
                wait = base_delay * (2 ** attempt)
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
    """LLM 輸出 token 超出限制時自動修復尾部斷裂的 JSON。"""
    try:
        json.loads(text)
        return text
    except json.JSONDecodeError:
        pass

    stack = []
    in_string = False
    escape_next = False
    candidates = []

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


def generate_focused_questions(session: dict, focus: dict) -> list:
    """Use the LLM to choose high-value audit questions from selected scope items."""
    selected_items = focus.get("selected_items") or []
    if not selected_items:
        return []

    count = max(6, min(18, int(focus.get("question_count") or 12)))
    template_name = focus.get("template_name") or "稽核面向"
    depth = focus.get("question_depth") or "standard"
    frameworks = ", ".join(get_framework_names(session.get("frameworks", []))) or "資通安全管理法"
    item_text = "\n".join(
        f"{index + 1}. [{item.get('id', '')}] {item.get('text', '')}"
        for index, item in enumerate(selected_items)
    )

    json_schema = (
        '{"questions":[{"text":"string","category":"string",'
        '"source_framework":"string","reference":"string",'
        '"dimension_label":"治理制度|流程執行|技術控制|佐證文件|例外改善"}]}'
    )
    system_prompt = "\n".join([
        "你是衛福部所屬醫院資安稽核委員，負責將稽核範圍聚焦成高價值訪談問題。",
        "你的任務是從稽核人員勾選的範圍項目中挑重點，不是把所有項目平均塞進每一題。",
        "",
        "輸出規則：",
        "- 僅輸出純 JSON object，不含 markdown 或說明文字",
        f"- 格式：{json_schema}",
        f"- questions 最多 {count} 題，至少 6 題",
        "- 每題只能聚焦一個主要稽核重點",
        "- 不要複製整段稽核範圍，不要產生總論式問題",
        "- 問題必須能引導受稽單位提供流程、責任人、紀錄位置、樣本母體、例外案例或改善證據",
        "- 依醫療營運風險、病歷個資、關鍵系統可用性、委外維運、通報應變、可抽核性排序",
        "- wording 使用繁體中文，務實、可訪談、可抽核",
        "- category 使用策略面、管理面或技術面，必要時加上子主題",
        "- source_framework 優先使用本次框架名稱",
        "- reference 填入被挑選的範圍項目短名，不要填整段長文",
    ])
    user_prompt = "\n\n".join([
        f"稽核面向：{template_name}",
        f"問題深度：{depth}",
        f"適用框架：{frameworks}",
        f"稽核範圍：\n{session.get('scope', '')}",
        f"稽核情境：\n{session.get('context', '')}",
        f"可挑選範圍項目：\n{item_text}",
    ])

    response = _call_with_retry(lambda: _get_client().complete(
        messages=[
            SystemMessage(content=system_prompt),
            UserMessage(content=user_prompt),
        ],
        model=settings.AZURE_AI_MODEL,
        max_tokens=3500,
        temperature=0.25,
    ))
    raw = response.choices[0].message.content if response.choices else ""
    data = json.loads(_repair_truncated_json(_strip_json_fences(raw)))
    questions = data.get("questions") if isinstance(data, dict) else []
    normalized = []
    for item in questions[:count]:
        text = str(item.get("text", "")).strip()
        if not text:
            continue
        normalized.append({
            "id": str(uuid.uuid4()),
            "text": text,
            "category": str(item.get("category") or template_name),
            "source_framework": str(item.get("source_framework") or frameworks.split(",")[0]),
            "reference": str(item.get("reference") or template_name),
            "dimension": "focused",
            "dimension_label": str(item.get("dimension_label") or "系統性探詢"),
            "generated_by": "llm_focus",
        })
    return normalized


async def _stream_sse(msgs: list, max_tokens: int, temperature: float):
    """Azure streaming → SSE bridge（threading + asyncio.Queue）。"""
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue()

    def _run_stream():
        try:
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


# ─── IIA 5C 格式稽核發現 ──────────────────────────────────────
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


# ─── 政府機關格式稽核發現 ─────────────────────────────────────
async def stream_gov_findings(session: dict):
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
        "- legal_text：應辦事項，直接引用法條原文中的強制義務段落",
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
