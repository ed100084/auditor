from question_generator import generate_rule_questions


def test_generate_rule_questions_returns_nonempty_standard_questions():
    questions = generate_rule_questions(
        framework_ids=["csma_core", "csma_classification", "csma_incident"],
        scope="年度資通安全管理制度稽核",
        context="受稽單位為資訊部門，重點包含委外管理與事件通報。",
        responsibility_level="B",
    )

    assert len(questions) == 10
    for question in questions:
        assert question["id"]
        assert len(question["text"]) > 50
        assert question["category"]
        assert question["source_framework"]
        assert question["reference"]
        assert question["dimension"] == "systemic"
        assert question["generated_by"] == "rules"


def test_generate_rule_questions_includes_custom_reference_when_uploaded():
    questions = generate_rule_questions(
        framework_ids=["csma_core"],
        custom_text="internal policy",
        scope="自訂規範稽核",
    )

    assert questions[0]["reference"] == "自訂文件"
    assert "自訂法規或內部文件" in questions[0]["text"]


def test_generate_rule_questions_ignores_unknown_frameworks_but_still_returns_questions():
    questions = generate_rule_questions(
        framework_ids=["unknown"],
        scope="一般資安稽核",
    )

    assert len(questions) == 10
    assert all(question["text"] for question in questions)
