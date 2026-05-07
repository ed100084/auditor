# 資安稽核助手 Security Audit Assistant

台灣資通安全法規合規稽核的 AI 輔助工具，協助稽核委員系統性地產生稽核問題、記錄回覆，並自動生成符合 IIA 5C 格式的正式稽核發現報告。

🌐 **線上使用**：[https://ed100084.github.io/auditor/](https://ed100084.github.io/auditor/)

---

## ⚠️ 交接狀態（2026-05-07）

### 未解決的 Bug

#### 🔴 「產生稽核問題」結果為空（0 題）

**症狀：** 完成 Step 2 後點「產生稽核問題」，Step 3 顯示 0 題，清單空白。

**已排查的根本原因：**

`llm_service.py` 的 system prompt 中，格式範例曾是一個完整 JSON array：
```
[{"id":"...","text":"..."}]
```
LLM 將這段當作「期望的完整輸出範本」，照著輸出空陣列或只有 1 題。

**已嘗試的修正（commit `a77937d`）：**  
將格式範例改回單一物件（不含外層 `[...]`），但使用者回報問題仍然存在，**尚未確認實際效果或找到真正根因**。

---

**接手者請先做這幾件事：**

**Step 1：確認 commit 是否已推送**
```bash
git log origin/main --oneline -5
```
最新應是 `a77937d`。若不是，先執行：
```bash
git push origin main
```
（注意：在 Claude Code 內 git push 會被系統攔截，需在獨立終端機手動執行）

**Step 2：直接 call API 看 LLM 回傳什麼**
```bash
# 1. 建立 session
curl -X POST https://secauditor.azurewebsites.net/api/sessions \
  -H "X-API-Key: YOUR_KEY" -H "Content-Type: application/json" \
  -d '{"user_name":"test"}'
# → 取得 session_id

# 2. 設定框架
curl -X POST https://secauditor.azurewebsites.net/api/sessions/{SESSION_ID}/framework \
  -H "X-API-Key: YOUR_KEY" -H "Content-Type: application/json" \
  -d '{"frameworks":["csma_core"],"responsibility_level":null}'

# 3. 設定範圍
curl -X POST https://secauditor.azurewebsites.net/api/sessions/{SESSION_ID}/scope \
  -H "X-API-Key: YOUR_KEY" -H "Content-Type: application/json" \
  -d '{"scope":"醫院資訊系統稽核","context":"年度例行資安稽核，稽核對象為醫療資訊部門"}'

# 4. 產生問題（觀察回傳）
curl -X POST https://secauditor.azurewebsites.net/api/sessions/{SESSION_ID}/questions/generate \
  -H "X-API-Key: YOUR_KEY"
```
- 若回傳 `{"questions":[]}` → LLM 就是回傳空陣列，prompt 需繼續調整
- 若回傳有 questions → 是前端 JS 問題

**Step 3：看 Azure 伺服器 log**
- Azure Portal → App Service `secauditor` → 監視 → Log stream
- 關鍵 log：`[generate_questions] finish_reason=...`
  - `stop` = 正常完成
  - `content_filter` = 內容被 Azure 過濾
  - `length` = 超出 token 限制（`max_tokens=4096`，可嘗試降低 prompt 長度）

**Step 4：若需繼續調整 prompt**

關鍵檔案：`llm_service.py` line 136–172（`generate_questions` 的 `system_prompt`）

可嘗試：
- 在 prompt 最末加強指令：`"重要：必須產生至少 10 個物件，不可回傳空陣列。"`
- 調高 temperature（目前 0.3）
- 縮短 framework_text（`compact=True` 已啟用，但各框架的 `compact()` 實作可再精簡）
- 換模型：`config.py` 的 `AZURE_AI_MODEL`（目前 `Kimi-K2.5`）

---

### Git 狀態

| Commit | 內容 | 推送狀態 |
|--------|------|----------|
| `a77937d` | fix: LLM 格式範例改回單一物件 | ⚠️ **尚未確認是否已推送** |
| `d6594da` | 手機 textarea 自動展高 + no-cache middleware | ✅ 已推送 |
| `735fc44` | fix ES module 分裂 | ✅ 已推送 |

---

### 已知次要問題

- **手機 textarea 高度**：commit `d6594da` 已用 `scrollHeight` 修正，但未在真實手機驗證最終效果
- **git push 被攔截**：Claude Code 內的 git push 會被系統安全分類器攔截，需在獨立終端手動執行

---

### 重要架構陷阱（ES Module 分裂）

前端的 3 個 JS 檔案（`main.js`、`ui.js`、`api.js`）都從 `state.js` import 共用狀態物件 `S`。  
**瀏覽器以 URL 完整字串（含 query string）作為 module 識別 key。** 若 import 路徑不一致，會產生多個 S 實例，導致狀態修改跨不了檔案邊界。

目前三個 JS 檔統一使用 `?v=20260507d`：
```js
// main.js
import { S } from './state.js?v=20260507d';

// ui.js
import { S } from './state.js?v=20260507d';  // ← 必須與 main.js 完全一致
```
以及 `index.html`：
```html
<script type="module" src="js/main.js?v=20260507d"></script>
```

**修改 JS 時，若要更新 version，三個地方必須同步改。**  
`main.py` 已加 `Cache-Control: no-cache` middleware，未來可省略 version bump，但舊有的 `?v=...` 不能移除（移除後舊瀏覽器 cache 的版本會沿用舊路徑）。

---

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
