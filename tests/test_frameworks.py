"""
tests/test_frameworks.py — FRAMEWORK_REGISTRY 完整性與 get_framework_text 正確性測試
"""
from frameworks import FRAMEWORK_REGISTRY, get_framework_text, get_framework_names

EXPECTED_IDS = {
    "csma_core",
    "csma_classification",
    "csma_incident",
    "csma_sharing",
    "iso27001",
    "iso27701",
}


def test_all_six_frameworks_present():
    assert set(FRAMEWORK_REGISTRY.keys()) == EXPECTED_IDS


def test_each_framework_has_required_keys():
    required = {"id", "name", "name_en", "description", "text"}
    for fid, fw in FRAMEWORK_REGISTRY.items():
        missing = required - fw.keys()
        assert not missing, f"框架 {fid} 缺少欄位：{missing}"


def test_each_framework_text_nonempty():
    for fid, fw in FRAMEWORK_REGISTRY.items():
        assert fw["text"].strip(), f"框架 {fid} 的 text 不可為空"


def test_get_framework_text_single():
    text = get_framework_text(["csma_core"])
    assert "資通安全管理法" in text or len(text) > 100


def test_get_framework_text_multiple():
    text = get_framework_text(["csma_core", "iso27001"])
    assert len(text) > 200


def test_get_framework_text_with_custom():
    custom = "自訂測試法規內容，請稽核是否符合。"
    text = get_framework_text(["csma_core"], custom_text=custom)
    assert custom in text


def test_get_framework_text_compact_shorter_than_full():
    full = get_framework_text(["csma_core"], compact=False)
    compact = get_framework_text(["csma_core"], compact=True)
    assert len(compact) < len(full)


def test_get_framework_text_unknown_id_ignored():
    text = get_framework_text(["nonexistent_framework"])
    assert text == ""


def test_get_framework_names_returns_chinese_names():
    names = get_framework_names(["csma_core", "iso27001"])
    assert "資通安全管理法" in names
    assert "ISO 27001:2022" in names


def test_get_framework_names_unknown_ignored():
    names = get_framework_names(["csma_core", "does_not_exist"])
    assert len(names) == 1
    assert "資通安全管理法" in names
