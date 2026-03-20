from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from session_store import get_session
from llm_service import stream_findings

router = APIRouter(prefix="/sessions", tags=["findings"])


@router.get("/{session_id}/findings/stream")
async def findings_stream(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not session.get("responses"):
        raise HTTPException(status_code=400, detail="請先輸入受稽單位回覆")

    generator = await stream_findings(session)
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{session_id}/findings")
def get_findings(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"findings": session.get("findings")}
