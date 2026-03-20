import io

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.concurrency import run_in_threadpool

from config import settings
from frameworks import FRAMEWORK_REGISTRY
from models import FrameworkSelection
from session_store import get_session, update_session

router = APIRouter(prefix="/sessions", tags=["framework"])


@router.get("/frameworks")
def list_frameworks():
    return [
        {
            "id": fw["id"],
            "name": fw["name"],
            "name_en": fw["name_en"],
            "description": fw["description"],
            "primary": fw["primary"],
        }
        for fw in FRAMEWORK_REGISTRY.values()
    ]


@router.post("/{session_id}/framework")
def set_framework(session_id: str, body: FrameworkSelection):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    update_session(session_id, {
        "frameworks": body.frameworks,
        "responsibility_level": body.responsibility_level,
    })
    return {"ok": True}


@router.post("/{session_id}/upload")
async def upload_custom_doc(session_id: str, file: UploadFile = File(...)):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large")

    filename = (file.filename or "").lower()

    if filename.endswith(".txt"):
        text = content.decode("utf-8", errors="replace")
    elif filename.endswith(".pdf"):
        text = await run_in_threadpool(_extract_pdf, content)
    elif filename.endswith(".docx"):
        text = await run_in_threadpool(_extract_docx, content)
    else:
        raise HTTPException(status_code=400, detail="僅支援 .txt .pdf .docx 格式")

    text = text[: settings.MAX_CUSTOM_TEXT_CHARS]
    update_session(session_id, {"custom_framework_text": text})
    return {"ok": True, "chars": len(text)}


def _extract_pdf(content: bytes) -> str:
    from PyPDF2 import PdfReader
    reader = PdfReader(io.BytesIO(content))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _extract_docx(content: bytes) -> str:
    from docx import Document
    doc = Document(io.BytesIO(content))
    return "\n".join(p.text for p in doc.paragraphs)
