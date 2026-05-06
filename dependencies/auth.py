from fastapi import Header, HTTPException, Query
from typing import Optional

from config import settings


def verify_api_key(
    x_api_key: Optional[str] = Header(None),
    api_key: Optional[str] = Query(None),
):
    """Check X-API-Key header (or api_key query param for SSE endpoints)."""
    key = x_api_key or api_key
    if key != settings.API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
