"""matcher.select_questions 行為測試。"""
import pytest

from matcher import select_questions, DEFAULT_TARGET


def test_returns_target_count_by_default():
    qs = select_questions(framework_ids=["csma_core"], scope="年度合規稽核")
    assert len(qs) == DEFAULT_TARGET


def test_returns_clean_question_dicts():
    qs = select_questions(framework_ids=["csma_core"], scope="年度合規稽核")
    for q in qs:
        assert q["id"]
        assert q["text"].startswith("【"), "問題本文應為 5 段結構"
        assert q["category"]
        assert q["source_framework"]
        assert q["reference"]
        assert q["dimension"] == "systemic"
        assert q["bank_id"]
        # 不應有奇怪的多餘欄位
        assert "prompts" not in q
        assert "evidence" not in q


def test_unique_ids_per_call():
    """每次呼叫產生新 UUID，使用者編輯時不會誤刪其他題。"""
    qs1 = select_questions(framework_ids=["csma_core"], scope="x")
    qs2 = select_questions(framework_ids=["csma_core"], scope="x")
    ids1 = {q["id"] for q in qs1}
    ids2 = {q["id"] for q in qs2}
    assert ids1.isdisjoint(ids2)


def test_same_inputs_same_bank_ids():
    """同樣輸入應選出同樣題目（可重現性）。"""
    qs1 = select_questions(framework_ids=["csma_core"], scope="存取控制 帳號")
    qs2 = select_questions(framework_ids=["csma_core"], scope="存取控制 帳號")
    assert [q["bank_id"] for q in qs1] == [q["bank_id"] for q in qs2]


def test_responsibility_level_filter():
    """指定 D 級時，applicable_levels=['A','B','C'] 的題目應被排除。"""
    qs = select_questions(
        framework_ids=["csma_core", "csma_classification"],
        responsibility_level="D",
        scope="一般稽核",
    )
    bank_ids = {q["bank_id"] for q in qs}
    # CISO 題目限 A/B/C，不應出現
    assert "gov_ciso" not in bank_ids


def test_scope_keyword_boost():
    """scope 中含 MFA 關鍵字時，access_mfa 應被優先選出。"""
    qs = select_questions(
        framework_ids=["csma_core"],
        scope="MFA 多因子驗證部署稽核",
    )
    bank_ids = [q["bank_id"] for q in qs]
    assert "access_mfa" in bank_ids
    # 且應排在前列
    assert bank_ids.index("access_mfa") < 5


def test_category_diversity():
    """選出的題目應分散於多個 category（不會 12 題都是同一類）。"""
    qs = select_questions(
        framework_ids=["csma_core", "csma_classification", "csma_incident", "iso27001"],
        scope="年度全面稽核",
    )
    cats = {q["category"] for q in qs}
    assert len(cats) >= 5, f"類別多樣性不足：{cats}"


def test_unknown_framework_falls_back_to_bank():
    qs = select_questions(framework_ids=["unknown_framework"], scope="x")
    assert len(qs) == DEFAULT_TARGET


def test_iso_only_returns_iso_questions():
    qs = select_questions(framework_ids=["iso27701"], scope="隱私個資")
    bank_ids = {q["bank_id"] for q in qs}
    # 應包含 iso27701 的隱私題目
    assert any(bid.startswith("privacy_") for bid in bank_ids)


def test_target_count_override():
    qs = select_questions(framework_ids=["csma_core"], scope="x", target_count=5)
    assert len(qs) == 5
