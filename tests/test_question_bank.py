"""題庫資料完整性測試。"""
import pytest

from question_bank import BANK, CATEGORIES, get_all, get_by_framework, get_by_id, stats


def test_bank_not_empty():
    assert len(BANK) >= 20, "題庫應至少包含 20 題"


def test_unique_ids():
    ids = [q["id"] for q in BANK]
    assert len(ids) == len(set(ids)), "題庫存在重複 ID"


def test_required_fields():
    required = {"id", "framework_ids", "category", "reference", "weight", "scope_tags",
                "applicable_levels", "text"}
    for q in BANK:
        missing = required - q.keys()
        assert not missing, f"題目 {q.get('id')} 缺少欄位：{missing}"


def test_categories_valid():
    for q in BANK:
        assert q["category"] in CATEGORIES, f"題目 {q['id']} 使用未定義 category：{q['category']}"


def test_framework_ids_valid():
    from frameworks import FRAMEWORK_REGISTRY
    valid = set(FRAMEWORK_REGISTRY.keys())
    for q in BANK:
        for fw in q["framework_ids"]:
            assert fw in valid, f"題目 {q['id']} 引用未知框架 ID：{fw}"


def test_text_format_5_section():
    """每題本文應為 5 段結構（包含 (1)(2)(3)(4) 與 ★）。"""
    for q in BANK:
        text = q["text"]
        assert text.startswith("【"), f"題目 {q['id']} 應以【領域】開頭"
        for marker in ["(1)", "(2)", "(3)", "(4)", "★"]:
            assert marker in text, f"題目 {q['id']} 缺少 {marker} 標記"


def test_weight_in_range():
    for q in BANK:
        assert 1 <= q["weight"] <= 10, f"題目 {q['id']} weight={q['weight']} 超出 1–10"


def test_applicable_levels_valid():
    valid = {"A", "B", "C", "D", "E"}
    for q in BANK:
        for lvl in q["applicable_levels"]:
            assert lvl in valid, f"題目 {q['id']} 引用未知責任等級：{lvl}"


def test_get_by_id():
    first = BANK[0]
    assert get_by_id(first["id"]) is first
    assert get_by_id("not_exist") is None


def test_get_by_framework():
    items = get_by_framework("csma_core")
    assert len(items) > 0
    for q in items:
        assert "csma_core" in q["framework_ids"]


def test_categories_well_distributed():
    """確保 10 大類別都有題目（避免某類別完全空缺）。"""
    s = stats()
    missing = [c for c in CATEGORIES if c not in s["by_category"]]
    assert not missing, f"以下 category 無題目：{missing}"


def test_get_all_returns_full_bank():
    assert get_all() is BANK
