# Security Audit Assistant

AI-assisted security audit workflow for selecting audit frameworks, generating audit questions, collecting responses, and producing findings reports.

The project has two deployable parts:

- Backend: FastAPI service on Azure App Service
- Frontend: static HTML/CSS/JavaScript published to GitHub Pages

## Main Features

- Framework selection for CSMA, ISO 27001, ISO 27701, and custom uploaded references
- Audit templates for common scopes such as annual CSMA audits, medical systems, IT operations, and ISO audits
- AI-generated audit questions based on selected frameworks and audit scope
- Response collection and report generation
- Two report formats:
  - IIA 5C style findings
  - Government-style findings and recommendations
- Session storage with SQLite
- API key protection for `/api/*` endpoints

## Project Structure

```text
auditor/
  main.py                 FastAPI app, CORS, static frontend mount
  config.py               Environment settings
  models.py               Pydantic request/response models
  audit_templates.py      Built-in audit templates
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

Optional syntax checks for the frontend modules:

```bash
node --check static/js/api.js
node --check static/js/state.js
node --check static/js/ui.js
node --check static/js/main.js
```

## Deployment

Backend deployment is handled by `.github/workflows/main_secauditor.yml`.

Frontend deployment is handled by `.github/workflows/pages.yml`, which publishes the contents of `static/` to GitHub Pages.

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
