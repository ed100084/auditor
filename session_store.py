import uuid
from datetime import datetime
from typing import Dict, Any, Optional


_sessions: Dict[str, dict] = {}


def create_session() -> str:
    session_id = str(uuid.uuid4())
    _sessions[session_id] = {
        "session_id": session_id,
        "created_at": datetime.utcnow().isoformat(),
        "frameworks": [],
        "responsibility_level": None,
        "custom_framework_text": "",
        "scope": "",
        "context": "",
        "questions": [],
        "responses": [],
        "findings": None,
    }
    return session_id


def get_session(session_id: str) -> Optional[dict]:
    return _sessions.get(session_id)


def update_session(session_id: str, data: dict) -> bool:
    if session_id not in _sessions:
        return False
    _sessions[session_id].update(data)
    return True


def delete_session(session_id: str) -> bool:
    return bool(_sessions.pop(session_id, None))
