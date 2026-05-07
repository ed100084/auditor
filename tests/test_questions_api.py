from fastapi.testclient import TestClient

from main import app


API_KEY_HEADER = {"X-API-Key": "test-api-key-12345"}


def test_generate_questions_uses_rule_generator_and_persists(monkeypatch, tmp_path):
    import session_store

    monkeypatch.setattr(session_store, "DB_PATH", tmp_path / "questions.db")
    client = TestClient(app)

    created = client.post(
        "/api/sessions",
        headers=API_KEY_HEADER,
        json={"user_name": "tester"},
    )
    assert created.status_code == 200
    session_id = created.json()["session_id"]

    framework = client.post(
        f"/api/sessions/{session_id}/framework",
        headers=API_KEY_HEADER,
        json={"frameworks": ["csma_core", "csma_classification", "csma_incident"], "responsibility_level": "B"},
    )
    assert framework.status_code == 200

    scope = client.post(
        f"/api/sessions/{session_id}/scope",
        headers=API_KEY_HEADER,
        json={
            "scope": "年度資通安全管理制度稽核",
            "context": "受稽單位為資訊部門，重點包含委外管理與事件通報。",
        },
    )
    assert scope.status_code == 200

    generated = client.post(
        f"/api/sessions/{session_id}/questions/generate",
        headers=API_KEY_HEADER,
    )
    assert generated.status_code == 200
    questions = generated.json()["questions"]
    assert len(questions) == 10
    assert all(question["text"].strip() for question in questions)
    assert all(question["generated_by"] == "rules" for question in questions)

    stored = client.get(f"/api/sessions/{session_id}/questions", headers=API_KEY_HEADER)
    assert stored.status_code == 200
    assert stored.json()["questions"] == questions
