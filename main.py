import os

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from config import settings
from dependencies.auth import verify_api_key
from routers import session, framework, questions, responses, findings, templates

app = FastAPI(title="資安稽核助手 API", version="1.0.0")


# 靜態 JS 檔案不快取，確保部署後使用者立即取得新版
@app.middleware("http")
async def no_cache_js(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/static/") and request.url.path.endswith(".js"):
        response.headers["Cache-Control"] = "no-cache, must-revalidate"
    return response


# CORS
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth dependency applied to all /api/ routes
api_auth = [Depends(verify_api_key)]

app.include_router(framework.list_router, prefix="/api", dependencies=api_auth)
app.include_router(session.router, prefix="/api", dependencies=api_auth)
app.include_router(framework.router, prefix="/api", dependencies=api_auth)
app.include_router(questions.router, prefix="/api", dependencies=api_auth)
app.include_router(responses.router, prefix="/api", dependencies=api_auth)
app.include_router(findings.router, prefix="/api", dependencies=api_auth)
# Templates are static public data — no auth required
app.include_router(templates.router, prefix="/api")

# Serve static frontend
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

    @app.get("/")
    def root():
        return FileResponse(os.path.join(static_dir, "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
