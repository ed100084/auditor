# 資安稽核助手

AI-assisted security audit workflow for selecting audit frameworks, defining audit scope, generating open-ended audit questions, collecting auditee responses, and producing findings reports.

The project has two deployable parts:

- Backend: FastAPI service on Azure App Service
- Frontend: static HTML/CSS/JavaScript published to GitHub Pages

Current public frontend:

```text
https://ed100084.github.io/auditor/
```

Current application version:

```text
v2026.05.08.14
```

## Main Features

- Framework selection for Taiwan CSMA requirements, ISO 27001, ISO 27701, healthcare scenarios, and IT control domains
- MOHW hospital-oriented audit-scope templates grouped by strategy, management, and technical tabs, with removable scope items for each dimension
- Adjustable audit-question generation by question depth, question count, and audit dimension
- Open-ended audit questions with rule-based fallback when the LLM or API response is unavailable
- Easier auditee response collection with autosave-oriented text areas
- Persistent audit sessions stored in SQLite, designed for cross-device use between phone and desktop
- Short session URLs such as `https://ed100084.github.io/auditor/?session=001`
- "My audit records" panel for loading and deleting saved audit sessions
- Visible frontend and API version indicators to reduce cache confusion
- Finding generation with LLM support and local fallback drafts
- Two report formats:
  - IIA 5C style findings
  - Government / MOHW-style findings and recommendations
- Session storage with SQLite
- API key protection for `/api/*` endpoints

## User Workflow

1. Choose audit frameworks and responsibility level.
2. Define audit scope and context manually, or start from a common template.
3. Generate and edit open-ended audit questions.
4. Collect auditee responses.
5. Generate audit findings in the selected format.

Saved sessions are reusable across devices. After a session is created, the app displays a short URL:

```text
https://ed100084.github.io/auditor/?session=001
```

Entering that URL on another device loads the same audit record, as long as the API key is available in that browser.

## Project Structure

```text
auditor/
  main.py                 FastAPI app, CORS, static frontend mount
  config.py               Environment settings
  models.py               Pydantic request/response models
  audit_templates.py      Legacy/backend audit templates API
  llm_service.py          Azure AI integration and JSON repair helpers
  session_store.py        SQLite session persistence
  dependencies/
    auth.py               API key validation
  frameworks/             Framework registry and reference text
  routers/                FastAPI routers
  static/
    index.html            Frontend shell
    css/app.css           Frontend styles
    js/                   ES module frontend code
  tests/                  Unit and API tests
```

## Session Persistence

The backend stores audit sessions in SQLite under `data/auditor.db`.

New sessions use short numeric IDs:

```text
001
002
003
```

The frontend exposes these as short URLs:

```text
https://ed100084.github.io/auditor/?session=001
```

Older UUID-based session IDs are still supported if they already exist in the database.

## Local Setup

Requirements:

- Python 3.11+
- Azure AI Foundry endpoint, key, and model deployment

Create and activate a virtual environment, then install dependencies:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env`:

```env
AZURE_AI_ENDPOINT=https://<your-endpoint>.inference.ai.azure.com
AZURE_AI_KEY=<your-key>
AZURE_AI_MODEL=<model-deployment-name>
AUDITOR_API_KEY=<shared-api-key>
ALLOWED_ORIGINS=http://localhost:8000,https://ed100084.github.io
```

Run locally:

```bash
uvicorn main:app --reload --port 8000
```

Open:

```text
http://localhost:8000
```

## Tests

```bash
pytest tests -q
```

Current expected test count:

```text
141 passed
```

Frontend syntax check:

```bash
node --check static/js/app.js
```

## Deployment

Backend deployment is handled by `.github/workflows/main_secauditor.yml`.

Frontend deployment is handled by `.github/workflows/pages.yml`, which publishes the contents of `static/` to GitHub Pages.

The frontend intentionally cache-busts CSS/JS assets with versioned query strings in `static/index.html`. When changing frontend behavior, update:

- visible app version in `static/index.html`
- `VERSION` in `static/js/app.js`
- CSS/JS query-string version in `static/index.html`
- `APP_VERSION` in `main.py` when backend-visible behavior changes

Recommended Azure startup command:

```bash
gunicorn -w 2 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000 --timeout 120
```

Required Azure App Service settings:

```env
AZURE_AI_ENDPOINT=<endpoint>
AZURE_AI_KEY=<key>
AZURE_AI_MODEL=<deployment-name>
AUDITOR_API_KEY=<shared-api-key>
ALLOWED_ORIGINS=https://ed100084.github.io
```

## Notes

- Runtime data is stored under `data/` and is ignored by git.
- `.env`, SQLite databases, Python caches, pytest caches, virtual environments, and Claude worktrees are ignored.
- API key auth accepts either `X-API-Key` or `api_key` query parameter. The query parameter is used by SSE endpoints.
- Do not commit `.claude/settings.local.json`; it is local tooling state.
