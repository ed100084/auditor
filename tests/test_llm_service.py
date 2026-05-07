import pytest

from llm_service import _normalize_questions


def test_normalize_questions_accepts_question_text_aliases():
    questions = _normalize_questions([
        {
            "id": "q1",
            "question_text": "請說明資安維護計畫如何定期審查。",
            "category": "治理與合規",
            "framework": "資通安全管理法",
            "reference": "第10條",
        }
    ])

    assert questions == [
        {
            "id": "q1",
            "text": "請說明資安維護計畫如何定期審查。",
            "category": "治理與合規",
            "source_framework": "資通安全管理法",
            "reference": "第10條",
            "dimension": "systemic",
        }
    ]


def test_normalize_questions_composes_nested_question_parts():
    questions = _normalize_questions([
        {
            "title": "事件通報流程",
            "questions": ["誰負責通報？", "如何確認時限？"],
            "evidence_request": ["事件通報紀錄", "演練報告"],
        }
    ])

    assert questions[0]["text"] == (
        "事件通報流程\n"
        "誰負責通報？\n"
        "如何確認時限？\n"
        "事件通報紀錄\n"
        "演練報告"
    )


def test_normalize_questions_scans_unknown_nested_fields():
    questions = _normalize_questions([
        {
            "category": "委外管理",
            "source_framework": "資通安全管理法",
            "reference": "第15條",
            "audit_detail": {
                "main_question": "請說明委外廠商資安要求如何納入契約。",
                "follow_up": ["如何驗證廠商落實？", "缺失如何追蹤？"],
            },
        }
    ])

    assert "請說明委外廠商資安要求如何納入契約。" in questions[0]["text"]
    assert "如何驗證廠商落實？" in questions[0]["text"]
    assert questions[0]["category"] == "委外管理"


def test_normalize_questions_rejects_empty_question_text():
    with pytest.raises(ValueError):
        _normalize_questions([{"id": "q1", "category": "治理與合規"}])
