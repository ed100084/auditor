# 資安稽核助手 Security Audit Assistant

台灣資通安全法規合規稽核的 AI 輔助工具，協助稽核委員系統性地產生稽核問題、記錄回覆，並自動生成符合 IIA 5C 格式的正式稽核發現報告。

🌐 **線上使用**：[https://ed100084.github.io/auditor/](https://ed100084.github.io/auditor/)

---

## 功能概覽

**五步驟稽核精靈：**

| 步驟 | 說明 |
|------|------|
| 1️⃣ 選擇法規框架 | 勾選適用的法規（資通安全法、施行細則、責任等級分級辦法、ISO 27001/27701 等） |
| 2️⃣ 設定稽核範圍 | 輸入受稽單位、稽核背景與責任等級 |
| 3️⃣ AI 產生稽核問題 | 依 PDCA 多維度框架自動產生 18–25 題，標示維度標籤（P/D/C/A/證據/例外/意識） |
| 4️⃣ 輸入受稽單位回覆 | 逐題填入問答紀錄 |
| 5️⃣ AI 產生稽核發現報告 | 自動生成 IIA 5C 格式報告，含法源依據、應辦事項（法條原文）及建議改善事項 |

**稽核發現報告欄位（IIA 5C + 法規延伸）：**

- **法源依據** — 違反的具體法條名稱與條號
- **應辦事項** — 法條原文中強制義務段落（「機關應…」原文）
- **現況** (Condition) — 稽核發現的具體事實
- **準則** (Criteria) — 應達到的合規狀態
- **原因** (Cause) — 落差的根本原因
- **影響** (Effect) — 可能造成的風險或損害
- **建議改善事項** (Recommendation) — 具體改善措施與建議期限

---

## 技術架構

```
前端 (GitHub Pages)          後端 (Azure App Service)
┌─────────────────────┐      ┌──────────────────────────┐
│  static/index.html  │ ───► │  FastAPI + Uvicorn        │
│  單頁五步驟精靈      │      │  llm_service.py           │
│  Tailwind CSS       │ ◄─── │  Azure AI Foundry (LLM)   │
│  SSE 串流接收        │      │  In-memory session store  │
└─────────────────────┘      └──────────────────────────┘
```

| 項目 | 技術 |
|------|------|
| 後端框架 | Python FastAPI + Uvicorn / Gunicorn |
| LLM | Azure AI Foundry (`azure-ai-inference` SDK) |
| 前端 | 純 HTML + Tailwind CSS（CDN），無框架 |
| 部署-後端 | Azure App Service (Linux, Python 3.11) |
| 部署-前端 | GitHub Pages (`index.html` at repo root) |
| 串流 | Server-Sent Events (SSE) |
| 資料驗證 | Pydantic v1 |

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
| `ALLOWED_ORIGINS` | `https://ed100084.github.io` |

### 前端 — GitHub Pages

Repository Settings → Pages → Branch: `main`，資料夾: `/ (root)`

`index.html`（repo 根目錄）即為前端入口，與 `static/index.html` 保持同步。

---

## 專案結構

```
auditor/
├── main.py               # FastAPI app、CORS、路由掛載
├── config.py             # 環境變數設定 (Pydantic BaseSettings)
├── models.py             # Pydantic 資料模型
├── llm_service.py        # LLM 呼叫邏輯、Prompt、JSON 修復
├── session_store.py      # In-memory session 儲存
├── frameworks/
│   └── __init__.py       # 法規框架文字與 compact 摘要
├── routers/              # FastAPI 路由
├── static/
│   └── index.html        # 前端單頁應用
├── index.html            # GitHub Pages 入口（同步自 static/）
└── requirements.txt
```

---

## 注意事項

- Session 資料存於記憶體，伺服器重啟後清除，不適合多人共用長期使用
- LLM 產生的法條引用與原文為 AI 生成，使用前請人工核對法規正確性
- `.env` 已加入 `.gitignore`，請勿將 API 金鑰提交至版本控制
