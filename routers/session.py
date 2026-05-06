from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from models import SessionCreate
from session_store import create_session, get_session, delete_session, list_sessions

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("")
def new_session(body: Optional[SessionCreate] = None):
    user_name = body.user_name if body else ""
    session_id = create_session(user_name=user_name)
    return {"session_id": session_id, "user_name": user_name}


@router.get("")
def list_sessions_endpoint(user: Optional[str] = Query(None)):
    return list_sessions(user_name=user)


@router.get("/{session_id}")
def get_session_state(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.delete("/{session_id}")
def remove_session(session_id: str):
    if not delete_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    return {"ok": True}
