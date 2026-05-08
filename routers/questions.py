import uuid

from fastapi import APIRouter, HTTPException

from frameworks import get_framework_names
from matcher import select_questions
from models import ScopeInput, QuestionGenerateInput, QuestionUpdate
from session_store import get_session, update_session
from llm_service import generate_focused_questions

router = APIRouter(prefix="/sessions", tags=["questions"])


@router.post("/{session_id}/scope")
def save_scope(session_id: str, body: ScopeInput):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    update_session(session_id, {"scope": body.scope, "context": body.context})
    return {"ok": True}


@router.post("/{session_id}/questions/generate")
def gen_questions(session_id: str, body: QuestionGenerateInput | None = None):
    """優先用 LLM 從勾選範圍挑重點；失敗時改用規則題庫或本地聚焦 fallback。"""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not session.get("scope"):
        raise HTTPException(status_code=400, detail="請先設定稽核範圍")
    if not session.get("frameworks"):
        raise HTTPException(status_code=400, detail="請先選擇法規框架")

    focus = body.model_dump() if body and hasattr(body, "model_dump") else (body.dict() if body else {})
    questions = []
    source = "rules"
    if focus.get("selected_items"):
        try:
            questions = generate_focused_questions(session, focus)
            source = "llm-focus" if questions else "rules-focus"
        except Exception:
            questions = []
            source = "rules-focus"

    if not questions and focus.get("selected_items"):
        questions = _fallback_focused_questions(session, focus)

    if questions:
        update_session(session_id, {"questions": questions})
        return {"questions": questions, "source": source}

    questions = select_questions(
        framework_ids=session["frameworks"],
        scope=session["scope"],
        context=session.get("context", ""),
        responsibility_level=session.get("responsibility_level"),
    )

    if not questions:
        raise HTTPException(
            status_code=500,
            detail="題庫未能匹配任何問題；請確認所選框架是否在 question_bank.py 中有對應題目。",
        )

    update_session(session_id, {"questions": questions})
    return {"questions": questions, "source": "rules"}


def _fallback_focused_questions(session: dict, focus: dict) -> list:
    selected_items = focus.get("selected_items") or []
    if not selected_items:
        return []
    count = max(6, min(18, int(focus.get("question_count") or 6)))
    template_name = focus.get("template_name") or "稽核面向"
    framework_names = get_framework_names(session.get("frameworks") or [])
    framework = framework_names[0] if framework_names else "資通安全管理法"
    patterns = [
        ("現場流程", "請受稽單位用最近一次實際案例說明「{item}」如何執行，包含提出、核准、執行、覆核與結案。"),
        ("責任分工", "針對「{item}」，誰是主要負責人、覆核人與備援人員？例外或爭議由誰核准？"),
        ("母體清冊", "「{item}」目前以哪份清冊、系統或報表作為抽核母體？誰維護，多久更新一次？"),
        ("抽核佐證", "如果現在抽核「{item}」，可從哪裡取得樣本、紀錄位置與判斷標準？"),
        ("例外追蹤", "「{item}」最近一年是否有例外、逾期、未落實或緊急處理？請挑一案說明原因、核准與改善追蹤。"),
        ("管理監督", "主管如何知道「{item}」有持續運作？是否有指標、報表、會議紀錄或改善追蹤紀錄？"),
        ("系統控制", "「{item}」哪些控制靠系統自動執行，哪些仍靠人工判斷？人工處理是否留下理由與覆核紀錄？"),
        ("風險判斷", "就「{item}」來看，最可能影響醫療服務、病歷個資或關鍵系統可用性的失控情境是什麼？目前怎麼防？"),
    ]
    questions = []
    for index, item in enumerate(selected_items[:count]):
        item_text = str(item.get("text", "")).strip()
        if not item_text:
            continue
        category, template = patterns[index % len(patterns)]
        short_ref = item_text.split("、")[0].replace("。", "")[:24]
        questions.append({
            "id": str(uuid.uuid4()),
            "text": template.format(item=item_text),
            "category": f"{template_name}-{category}",
            "source_framework": framework,
            "reference": short_ref or template_name,
            "dimension": "focused",
            "dimension_label": "系統性探詢",
            "generated_by": "rules_focus",
        })
    return questions


@router.get("/{session_id}/questions")
def get_questions(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"questions": session.get("questions", [])}


@router.put("/{session_id}/questions")
def update_questions(session_id: str, body: QuestionUpdate):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    questions = [q.dict() for q in body.questions]
    update_session(session_id, {"questions": questions})
    return {"ok": True, "count": len(questions)}
