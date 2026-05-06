"""
tests/test_session_store.py — SQLite session CRUD 測試

每個測試透過 monkeypatch 替換 session_store.DB_PATH 為 tmp_path，
確保測試隔離（不污染 data/auditor.db）。
"""
import pytest


@pytest.fixture(autouse=True)
def isolated_db(tmp_path, monkeypatch):
    import session_store
    monkeypatch.setattr(session_store, "DB_PATH", tmp_path / "test.db")


def test_create_session_returns_uuid():
    import session_store
    sid = session_store.create_session()
    assert isinstance(sid, str)
    assert len(sid) == 36  # UUID4 格式


def test_get_nonexistent_session_returns_none():
    import session_store
    result = session_store.get_session("does-not-exist")
    assert result is None


def test_create_and_get_session():
    import session_store
    sid = session_store.create_session()
    session = session_store.get_session(sid)

    assert session is not None
    assert session["session_id"] == sid
    assert session["questions"] == []
    assert session["responses"] == []
    assert session["frameworks"] == []
    assert session["findings"] is None
    assert session["scope"] == ""
    assert "created_at" in session
    assert "updated_at" in session


def test_update_session_scalar_field():
    import session_store
    sid = session_store.create_session()

    result = session_store.update_session(sid, {"scope": "醫院資安稽核"})
    assert result is True

    session = session_store.get_session(sid)
    assert session["scope"] == "醫院資安稽核"


def test_update_session_json_fields():
    import session_store
    sid = session_store.create_session()

    questions = [{"id": "q1", "text": "是否有資安政策？", "category": "治理與合規",
                  "source_framework": "資通安全管理法", "reference": "第10條"}]
    responses = [{"question_id": "q1", "response_text": "有，每年更新一次"}]

    session_store.update_session(sid, {"questions": questions, "responses": responses})
    session = session_store.get_session(sid)

    assert session["questions"] == questions
    assert session["responses"] == responses


def test_update_session_findings():
    import session_store
    sid = session_store.create_session()

    findings = {"executive_summary": "整體合規狀況良好", "findings": []}
    session_store.update_session(sid, {"findings": findings})
    session = session_store.get_session(sid)

    assert session["findings"] == findings


def test_update_nonexistent_session_returns_false():
    import session_store
    result = session_store.update_session("no-such-session", {"scope": "X"})
    assert result is False


def test_delete_session():
    import session_store
    sid = session_store.create_session()

    deleted = session_store.delete_session(sid)
    assert deleted is True

    assert session_store.get_session(sid) is None


def test_delete_nonexistent_session_returns_false():
    import session_store
    result = session_store.delete_session("no-such-session")
    assert result is False


def test_multiple_sessions_isolated():
    import session_store
    sid1 = session_store.create_session()
    sid2 = session_store.create_session()

    session_store.update_session(sid1, {"scope": "單位A稽核"})
    session_store.update_session(sid2, {"scope": "單位B稽核"})

    assert session_store.get_session(sid1)["scope"] == "單位A稽核"
    assert session_store.get_session(sid2)["scope"] == "單位B稽核"

    session_store.delete_session(sid1)
    assert session_store.get_session(sid1) is None
    assert session_store.get_session(sid2) is not None
