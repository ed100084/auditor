from fastapi import APIRouter, HTTPException
from models import ResponsesInput
from session_store import get_session, update_session

router = APIRouter(prefix="/sessions", tags=["responses"])


@router.post("/{session_id}/responses")
def save_responses(session_id: str, body: ResponsesInput):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    responses = [r.dict() for r in body.responses]
    update_session(session_id, {"responses": responses})
    return {"ok": True, "count": len(responses)}
