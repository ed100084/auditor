# 資安稽核助手 Security Audit Assistant

台灣資通安全法規合規稽核的 AI 輔助工具，協助稽核委員系統性地產生稽核問題、記錄回覆，並自動生成符合 IIA 5C 格式的正式稽核發現報告。

🌐 **線上使用**：[https://ed100084.github.io/auditor/](https://ed100084.github.io/auditor/)

---

## 功能概覽

**五步驟稽核精靈：**

| 步驟 | 說明 |
|------|------|
| 1️⃣ 選擇法規框架 | 勾選適用的法規（資通安全法、施行細則、責任等級分級辦法、ISO 27001/27701 等）；或由「快速套用範本」19 個情境範本自動帶入建議設定 |
| 2️⃣ 設定稽核範圍 | 輸入受稽單位、稽核背景與責任等級 |
| 3️⃣ AI 產生稽核問題 | 依 PDCA 多維度框架自動產生 18–25 題，標示維度標籤（P/D/C/A/證據/例外/意識） |
| 4️⃣ 輸入受稽單位回覆 | 逐題填入問答紀錄 |
| 5️⃣ AI 產生稽核發現報告 | 自動生成 IIA 5C 或政府機關 CI 格式報告，含法源依據、應辦事項（法條原文）及建議改善事項 |

**稽核情境範本（19 個）：**

步驟 1 展開「快速套用稽核情境範本」，選擇即自動帶入建議法規框架、責任等級、稽核範圍與情境說明：

| 類別 | 範本數 | 範例 |
|------|-------|------|
| 資安法系列 | 4 | 年度例行合規稽核、事件通報機制稽核、委外安全管理稽核、責任等級控制要求稽核 |
| 醫療特化 | 5 | HIS/PACS/LIS 稽核、電子病歷保護稽核、IoMT 稽核、遠距醫療稽核、供應鏈稽核 |
| 通用 IT | 8 | 存取控制、網路邊界、備份復原、弱點管理、特權帳號、社交工程、雲端安全、演練效能 |
| ISO | 2 | ISO 27001:2022 導入稽核、ISO 27701:2025 隱私管理稽核 |

**我的稽核紀錄（多租戶）：**

- 右上角輸入稽核員姓名（存入 `localStorage`）
- 建立 Session 時自動帶上使用者名稱
- 點擊「我的紀錄」可查看個人歷史稽核清單

---

## 技術架構

```
前端 (GitHub Pages)               後端 (Azure App Service)
┌──────────────────────────┐      ┌──────────────────────────┐
│  static/index.html        │ ───► │  FastAPI + Uvicorn        │
│  static/js/main.js       │      │  llm_service.py           │
│  static/js/api.js        │ ◄─── │  Azure AI Foundry (LLM)   │
│  static/js/ui.js         │      │  SQLite session store     │
│  static/js/state.js      │      └──────────────────────────┘
│  static/css/app.css      │
└──────────────────────────┘
```

| 項目 | 技術 |
|------|------|
| 後端框架 | Python FastAPI + Uvicorn / Gunicorn |
| LLM | Azure AI Foundry (`azure-ai-inference` SDK) |
| 前端 | 純 HTML + Tailwind CSS（CDN）+ ES Modules |
| 部署-後端 | Azure App Service (Linux, Python 3.11) |
| 部署-前端 | GitHub Pages（CI 自動部署 static/ 目錄） |
| 串流 | Server-Sent Events (SSE)，真正 LLM streaming（threading + asyncio.Queue） |
| Session 儲存 | SQLite (`data/auditor.db`)，重啟不清除 |
| 資料驗證 | Pydantic v2 + pydantic-settings v2 |

---

## 支援法規框架

- 資通安全管理法
- 資通安全管理法施行細則
- 資通安全責任等級分級辦法
- 資通安全事件通報及應變辦法
- ISO 27001:2022
- ISO 27701:2019
- 自訂文件上傳（PDF / DOCX / 純文字）

---

## 本機開發

### 環境需求

- Python 3.11+
- Azure AI Foundry 部署端點與 API 金鑰

### 安裝與啟動

```bash
git clone https://github.com/ed100084/auditor.git
cd auditor

python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

pip install -r requirements.txt
```

建立 `.env` 檔案：

```env
AZURE_AI_ENDPOINT=https://<your-endpoint>.inference.ai.azure.com
AZURE_AI_KEY=<your-api-key>
AZURE_AI_MODEL=<model-deployment-name>
AUDITOR_API_KEY=<自訂 API 金鑰，若不設則每次啟動自動產生隨機 UUID>
ALLOWED_ORIGINS=http://localhost:8000
```

啟動伺服器：

```bash
uvicorn main:app --reload --port 8000
```

開啟瀏覽器：[http://localhost:8000](http://localhost:8000)

---

## 部署

### 後端 — Azure App Service

**啟動指令**（Azure Portal → 設定 → 一般設定）：

```
gunicorn -w 2 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000 --timeout 120
```

**必要環境變數**（Azure Portal → 設定 → 環境變數）：

| 變數名稱 | 說明 |
|----------|------|
| `AZURE_AI_ENDPOINT` | Azure AI Foundry 端點 URL |
| `AZURE_AI_KEY` | API 金鑰 |
| `AZURE_AI_MODEL` | 模型部署名稱 |
| `AUDITOR_API_KEY` | 前端存取 API 的金鑰（若不設則每次重啟自動產生隨機 UUID，**建議生產環境明確設定**） |
| `ALLOWED_ORIGINS` | `https://ed100084.github.io` |

> **前端 API Key 設定**：使用者首次開啟 GitHub Pages 網頁時，會彈出提示輸入 API Key（存入 `localStorage`，後續自動使用）。API Key 須與後端 `AUDITOR_API_KEY` 一致。

### 前端 — GitHub Pages

Repository Settings → Pages → **Source: GitHub Actions**

推送到 `main` 分支時，`.github/workflows/pages.yml` 會自動將 `static/` 目錄（index.html、css/、js/）部署至 GitHub Pages。

---

## 專案結構

```
auditor/
├── main.py               # FastAPI app、CORS、路由掛載
├── config.py             # 環境變數設定 (pydantic-settings v2)
├── models.py             # Pydantic v2 資料模型
├── audit_templates.py    # 19 個稽核情境範本資料（資安法系列/醫療特化/通用IT/ISO）
├── llm_service.py        # LLM 呼叫邏輯、Prompt、JSON 修復
├── session_store.py      # SQLite session 持久化 (data/auditor.db)，含 user_name
├── dependencies/
│   └── auth.py           # API Key 認證 dependency
├── frameworks/
│   └── __init__.py       # 法規框架文字與 compact 摘要
├── routers/              # FastAPI 路由
│   ├── session.py        # POST/GET /sessions（含 ?user= 篩選）、GET/DELETE /{id}
│   ├── framework.py
│   ├── questions.py
│   ├── responses.py
│   ├── findings.py
│   └── templates.py      # GET /templates、GET /templates/{id}
├── static/
│   ├── index.html        # 前端 HTML（僅結構，引入 module）
│   ├── css/app.css       # 應用樣式
│   └── js/
│       ├── main.js       # 初始化、事件綁定、全域函式（含範本選擇邏輯）
│       ├── api.js        # API 呼叫、SSE、API Key / 使用者名稱管理
│       ├── ui.js         # 渲染函式（框架、範本、問題、回覆、發現報告、歷史紀錄）
│       └── state.js      # App 狀態物件
├── .github/workflows/
│   ├── main_secauditor.yml  # Azure App Service CI/CD
│   └── pages.yml            # GitHub Pages 自動部署（含 css/ js/）
├── tests/
│   ├── conftest.py
│   ├── test_session_store.py  # 17 個測試（含 user_name / list_sessions）
│   ├── test_frameworks.py     # 10 個測試
│   ├── test_models.py         # 12 個測試
│   ├── test_auth.py           # 7 個測試
│   └── test_templates.py      # 73 個測試（資料完整性 + API）（共 118 個）
└── requirements.txt
```

---

## 執行測試

```bash
pip install -r requirements.txt
pytest tests/ -v
```

覆蓋範圍（118 個測試）：

| 測試檔案 | 測試數 | 說明 |
|----------|--------|------|
| `tests/test_templates.py` | 73 | 19 個範本資料完整性（逐一參數化）+ API 端點 |
| `tests/test_session_store.py` | 17 | SQLite CRUD + user_name + list_sessions 篩選 |
| `tests/test_frameworks.py` | 10 | FRAMEWORK_REGISTRY 完整性 |
| `tests/test_models.py` | 12 | Pydantic v2 序列化/反序列化 |
| `tests/test_auth.py` | 7 | API Key middleware |

---

## 注意事項

- Session 資料持久化至 `data/auditor.db`（SQLite），伺服器重啟不清除，適合正式使用
- `data/auditor.db` 已加入 `.gitignore`，不會提交至版本控制
- LLM 產生的法條引用與原文為 AI 生成，使用前請人工核對法規正確性
- `.env` 已加入 `.gitignore`，請勿將 API 金鑰提交至版本控制
- `AUDITOR_API_KEY` 未設定時每次重啟會產生新的隨機金鑰，前端需重新輸入；生產環境請明確設定固定值
