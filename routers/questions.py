from fastapi import APIRouter, HTTPException

from matcher import select_questions
from models import ScopeInput, QuestionUpdate
from session_store import get_session, update_session

router = APIRouter(prefix="/sessions", tags=["questions"])


@router.post("/{session_id}/scope")
def save_scope(session_id: str, body: ScopeInput):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    update_session(session_id, {"scope": body.scope, "context": body.context})
    return {"ok": True}


@router.post("/{session_id}/questions/generate")
def gen_questions(session_id: str):
    """從策展題庫挑選稽核問題（純 Python，毫秒級完成）。"""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not session.get("scope"):
        raise HTTPException(status_code=400, detail="請先設定稽核範圍")
    if not session.get("frameworks"):
        raise HTTPException(status_code=400, detail="請先選擇法規框架")

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
    return {"questions": questions}


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
