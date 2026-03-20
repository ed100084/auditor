from fastapi import APIRouter, HTTPException
from models import ScopeInput, QuestionUpdate
from session_store import get_session, update_session
from llm_service import generate_questions

router = APIRouter(prefix="/sessions", tags=["questions"])


@router.post("/{session_id}/scope")
def save_scope(session_id: str, body: ScopeInput):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    update_session(session_id, {"scope": body.scope, "context": body.context})
    return {"ok": True}


@router.post("/{session_id}/questions/generate")
async def gen_questions(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not session.get("scope"):
        raise HTTPException(status_code=400, detail="請先設定稽核範圍")
    if not session.get("frameworks"):
        raise HTTPException(status_code=400, detail="請先選擇法規框架")

    questions = await generate_questions(
        framework_ids=session["frameworks"],
        custom_text=session.get("custom_framework_text", ""),
        scope=session["scope"],
        context=session.get("context", ""),
        responsibility_level=session.get("responsibility_level"),
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
