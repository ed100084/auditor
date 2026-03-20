import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from config import settings
from routers import session, framework, questions, responses, findings

app = FastAPI(title="資安稽核助手 API", version="1.0.0")

# CORS
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(session.router, prefix="/api")
app.include_router(framework.router, prefix="/api")
app.include_router(questions.router, prefix="/api")
app.include_router(responses.router, prefix="/api")
app.include_router(findings.router, prefix="/api")

# Framework list endpoint (not session-scoped)
from routers.framework import list_frameworks
app.get("/api/frameworks")(list_frameworks)

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
