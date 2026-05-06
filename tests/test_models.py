"""
tests/test_models.py — Pydantic model 序列化 / 反序列化測試
"""
import pytest
from models import (
    Question,
    Finding,
    FindingsReport,
    GovFinding,
    GovFindingsReport,
    FrameworkSelection,
    ScopeInput,
    QuestionResponseItem,
    ResponsesInput,
)


# ─── Question ────────────────────────────────────────────────────

def test_question_valid():
    q = Question(
        id="q-001",
        text="是否有書面資通安全政策？",
        category="治理與合規",
        source_framework="資通安全管理法",
        reference="第10條",
    )
    assert q.id == "q-001"
    assert q.reference == "第10條"


def test_question_reference_optional():
    q = Question(
        id="q-002",
        text="稽核問題文字",
        category="風險管理",
        source_framework="ISO 27001",
    )
    assert q.reference == ""


def test_question_dict_round_trip():
    data = {
        "id": "abc",
        "text": "問題",
        "category": "存取控制",
        "source_framework": "ISO 27001:2022",
        "reference": "A.8.2",
    }
    q = Question(**data)
    assert q.model_dump() == data


# ─── Finding ─────────────────────────────────────────────────────

def test_finding_valid():
    f = Finding(
        title="未建立資安政策",
        risk_level="High",
        regulatory_reference="資通安全管理法第10條",
        legal_basis="資通安全管理法第10條第1項",
        legal_requirement="各機關應訂定資通安全維護計畫",
        condition="未見任何書面政策文件",
        criteria="應有書面資安政策並定期更新",
        cause="人員資源不足，未指定負責人",
        effect="可能導致法規不符合及稽核缺失",
        recommendation="建議 1 個月內完成書面政策制訂",
    )
    assert f.risk_level == "High"


def test_findings_report_serialization():
    report = FindingsReport(
        executive_summary="整體資安狀況須改善。",
        findings=[],
    )
    d = report.model_dump()
    assert d["executive_summary"] == "整體資安狀況須改善。"
    assert d["findings"] == []


def test_findings_report_from_dict():
    data = {
        "executive_summary": "稽核總結",
        "findings": [
            {
                "title": "缺失項目",
                "risk_level": "Medium",
                "regulatory_reference": "ISO 27001 A.5.1",
                "legal_basis": "ISO/IEC 27001:2022 條款 5.1",
                "legal_requirement": "組織應建立資訊安全政策",
                "condition": "無書面政策",
                "criteria": "應有已核准之政策",
                "cause": "管理層未推動",
                "effect": "ISMS 稽核無法通過",
                "recommendation": "3 個月內完成政策制訂",
            }
        ],
    }
    report = FindingsReport(**data)
    assert len(report.findings) == 1
    assert report.findings[0].risk_level == "Medium"


# ─── GovFinding ──────────────────────────────────────────────────

def test_gov_finding_valid():
    gf = GovFinding(
        finding_type="法規不符合",
        title="未依規定通報資安事件",
        legal_basis="資通安全事件通報及應變辦法第6條",
        legal_text="機關應於知悉資通安全事件後1小時內通報",
        finding_description="訪談發現機關未建立通報流程",
        evidence=["訪談紀錄", "系統日誌"],
        recommendation="1 個月內建立通報程序並辦理演練",
    )
    assert gf.finding_type == "法規不符合"
    assert len(gf.evidence) == 2


def test_gov_findings_report_serialization():
    report = GovFindingsReport(
        executive_summary="政府機關稽核總結",
        findings=[],
    )
    d = report.model_dump()
    assert d["findings"] == []


# ─── Other models ────────────────────────────────────────────────

def test_framework_selection_defaults():
    fs = FrameworkSelection(frameworks=["csma_core"])
    assert fs.responsibility_level is None


def test_scope_input():
    si = ScopeInput(scope="全院資安稽核", context="A 級機關")
    assert si.scope == "全院資安稽核"


def test_responses_input():
    ri = ResponsesInput(
        responses=[
            QuestionResponseItem(question_id="q1", response_text="已完成"),
            QuestionResponseItem(question_id="q2", response_text="尚未建立"),
        ]
    )
    assert len(ri.responses) == 2
    assert ri.responses[0].response_text == "已完成"
