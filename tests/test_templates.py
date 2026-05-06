"""
測試稽核情境範本資料完整性與 API 端點
"""
import pytest
from fastapi.testclient import TestClient

from audit_templates import (
    TEMPLATES,
    get_all_templates,
    get_template,
    get_templates_by_category,
    AuditTemplate,
)
from main import app

client = TestClient(app)

VALID_CATEGORIES = {"資安法系列", "醫療特化", "通用IT", "ISO"}
VALID_FRAMEWORKS = {
    "csma_core", "csma_classification", "csma_incident",
    "csma_sharing", "iso27001", "iso27701",
}
VALID_LEVELS = {"A", "B", "C", "D", "E"}

# ─── 資料完整性 ────────────────────────────────────────────────────

class TestTemplateData:
    def test_total_count(self):
        assert len(TEMPLATES) == 19

    def test_category_counts(self):
        by_cat = {}
        for t in TEMPLATES:
            by_cat[t.category] = by_cat.get(t.category, 0) + 1
        assert by_cat.get("資安法系列", 0) == 4
        assert by_cat.get("醫療特化", 0) == 5
        assert by_cat.get("通用IT", 0) == 8
        assert by_cat.get("ISO", 0) == 2

    def test_unique_ids(self):
        ids = [t.id for t in TEMPLATES]
        assert len(ids) == len(set(ids)), "存在重複的範本 id"

    @pytest.mark.parametrize("tmpl", TEMPLATES)
    def test_required_fields_non_empty(self, tmpl: AuditTemplate):
        assert tmpl.id.strip(), f"{tmpl.id}: id 不可為空"
        assert tmpl.name.strip(), f"{tmpl.id}: name 不可為空"
        assert tmpl.category in VALID_CATEGORIES, f"{tmpl.id}: 無效類別 '{tmpl.category}'"
        assert len(tmpl.description) >= 20, f"{tmpl.id}: description 太短"
        assert len(tmpl.scope) >= 20, f"{tmpl.id}: scope 太短"
        assert len(tmpl.context) >= 30, f"{tmpl.id}: context 太短"
        assert len(tmpl.focus_areas) >= 3, f"{tmpl.id}: focus_areas 至少 3 項"
        assert len(tmpl.suggested_frameworks) >= 1, f"{tmpl.id}: 至少一個建議框架"
        assert tmpl.estimated_questions >= 10, f"{tmpl.id}: estimated_questions 不合理"

    @pytest.mark.parametrize("tmpl", TEMPLATES)
    def test_suggested_frameworks_valid(self, tmpl: AuditTemplate):
        for fw in tmpl.suggested_frameworks:
            assert fw in VALID_FRAMEWORKS, f"{tmpl.id}: 無效框架 '{fw}'"

    @pytest.mark.parametrize("tmpl", TEMPLATES)
    def test_responsibility_levels_valid(self, tmpl: AuditTemplate):
        for lvl in tmpl.responsibility_levels:
            assert lvl in VALID_LEVELS, f"{tmpl.id}: 無效責任等級 '{lvl}'"

    def test_get_all_templates_returns_list(self):
        result = get_all_templates()
        assert isinstance(result, list)
        assert len(result) == 19

    def test_get_template_found(self):
        t = get_template("csma_annual")
        assert t is not None
        assert t.id == "csma_annual"
        assert t.category == "資安法系列"

    def test_get_template_not_found(self):
        assert get_template("nonexistent_id") is None

    def test_get_templates_by_category(self):
        medical = get_templates_by_category("醫療特化")
        assert len(medical) == 5
        assert all(t.category == "醫療特化" for t in medical)

    def test_category_iso(self):
        iso = get_templates_by_category("ISO")
        assert len(iso) == 2
        ids = {t.id for t in iso}
        assert "iso27001_audit" in ids
        assert "iso27701_audit" in ids


# ─── API 端點 ──────────────────────────────────────────────────────

API_KEY_HEADER = {"X-API-Key": "test-api-key-12345"}


class TestTemplatesAPI:
    def test_list_templates_success(self):
        res = client.get("/api/templates", headers=API_KEY_HEADER)
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) == 19

    def test_list_templates_schema(self):
        res = client.get("/api/templates", headers=API_KEY_HEADER)
        first = res.json()[0]
        required_keys = {
            "id", "name", "category", "description",
            "scope", "context", "focus_areas",
            "suggested_frameworks", "responsibility_levels",
            "estimated_questions",
        }
        assert required_keys.issubset(first.keys())

    def test_get_template_detail_success(self):
        res = client.get("/api/templates/csma_annual", headers=API_KEY_HEADER)
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == "csma_annual"
        assert data["category"] == "資安法系列"
        assert len(data["scope"]) > 20
        assert len(data["context"]) > 30

    def test_get_template_medical(self):
        res = client.get("/api/templates/health_his", headers=API_KEY_HEADER)
        assert res.status_code == 200
        data = res.json()
        assert data["category"] == "醫療特化"
        assert "csma_core" in data["suggested_frameworks"]

    def test_get_template_not_found(self):
        res = client.get("/api/templates/no_such_template", headers=API_KEY_HEADER)
        assert res.status_code == 404

    def test_list_templates_no_auth(self):
        res = client.get("/api/templates")
        assert res.status_code == 401

    def test_get_template_no_auth(self):
        res = client.get("/api/templates/csma_annual")
        assert res.status_code == 401

    def test_all_template_ids_accessible(self):
        from audit_templates import TEMPLATES as tpls
        for t in tpls:
            res = client.get(f"/api/templates/{t.id}", headers=API_KEY_HEADER)
            assert res.status_code == 200, f"無法取得範本 {t.id}"
