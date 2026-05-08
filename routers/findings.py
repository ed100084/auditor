from typing import Any

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from session_store import get_session, update_session
from llm_service import stream_findings, stream_gov_findings

router = APIRouter(prefix="/sessions", tags=["findings"])


class FindingsInput(BaseModel):
    findings: Any = None


@router.get("/{session_id}/findings/stream")
async def findings_stream(
    session_id: str,
    format: str = Query(default="iia5c", description="報告格式：iia5c 或 gov"),
):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not session.get("responses"):
        raise HTTPException(status_code=400, detail="請先輸入受稽單位回覆")

    if format == "gov":
        generator = await stream_gov_findings(session)
    else:
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


@router.put("/{session_id}/findings")
def save_findings(session_id: str, body: FindingsInput):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    update_session(session_id, {"findings": body.findings})
    return {"ok": True}
