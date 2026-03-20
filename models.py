from typing import List, Optional
from pydantic import BaseModel


class Question(BaseModel):
    id: str
    text: str
    category: str           # 10 大稽核領域之一
    source_framework: str   # e.g. "資通安全管理法", "ISO 27001"
    reference: str = ""     # e.g. "第15條", "A.16.1"


class Finding(BaseModel):
    title: str
    risk_level: str             # "High" | "Medium" | "Low"
    regulatory_reference: str   # e.g. "資通安全管理法第18條、ISO 27001 A.15.1"
    legal_basis: str            # 法源依據 — 具體條文全名，e.g. "資通安全管理法第18條第1項"
    legal_requirement: str      # 應辦事項 — 法條原文中「應…」的義務段落
    condition: str              # 現況 — 稽核中發現的事實
    criteria: str               # 準則 — 應達到的法規/標準要求
    cause: str                  # 原因 — 造成落差的根本原因
    effect: str                 # 影響 — 可能造成的風險或損害
    recommendation: str         # 建議改善事項 — 稽核委員的具體改善建議與期限


class FindingsReport(BaseModel):
    executive_summary: str
    findings: List[Finding]


class FrameworkSelection(BaseModel):
    frameworks: List[str]
    responsibility_level: Optional[str] = None  # "A" | "B" | "C" | "D" | "E"


class ScopeInput(BaseModel):
    scope: str
    context: str


class QuestionUpdate(BaseModel):
    questions: List[Question]


class QuestionResponseItem(BaseModel):
    question_id: str
    response_text: str


class ResponsesInput(BaseModel):
    responses: List[QuestionResponseItem]


# ─── 政府機關格式（衛福部/數位部 CI 稽核） ────────────────────────
class GovFinding(BaseModel):
    finding_type: str       # "法規不符合" | "待改善缺失" | "建議缺失"
    title: str              # 簡短標題（不符合基準/待改善目標/建議事項）
    legal_basis: str        # 法源依據：法規名稱＋條號
    legal_text: str         # 應辦事項：法條原文（「機關應…」等強制義務段落）
    finding_description: str  # 稽核發現說明：觀察到的具體事實
    evidence: List[str]     # 佐證資料：文件/系統畫面/訪談紀錄等清單
    recommendation: str     # 改善建議：具體改善措施與建議期限


class GovFindingsReport(BaseModel):
    executive_summary: str
    findings: List[GovFinding]
