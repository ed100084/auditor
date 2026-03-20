from fastapi import APIRouter, HTTPException
from session_store import create_session, get_session, delete_session

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("")
def new_session():
    session_id = create_session()
    return {"session_id": session_id}


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
