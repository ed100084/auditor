"""
tests/test_auth.py — API Key 驗證 middleware 測試

使用最小 FastAPI 測試應用，避免需要真實 Azure AI 連線。
透過 monkeypatch 替換 dependencies.auth.settings 來控制 API_KEY 值。
"""
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from unittest.mock import MagicMock

VALID_KEY = "test-api-key-12345"


@pytest.fixture
def auth_app(monkeypatch):
    """建立只掛載 verify_api_key 的最小 FastAPI 測試應用。"""
    import dependencies.auth as auth_module

    mock_settings = MagicMock()
    mock_settings.API_KEY = VALID_KEY
    monkeypatch.setattr(auth_module, "settings", mock_settings)

    from dependencies.auth import verify_api_key

    app = FastAPI()

    @app.get("/protected")
    def protected_endpoint(dep=Depends(verify_api_key)):
        return {"ok": True}

    return TestClient(app)


def test_valid_key_in_header_returns_200(auth_app):
    response = auth_app.get("/protected", headers={"X-API-Key": VALID_KEY})
    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_valid_key_as_query_param_returns_200(auth_app):
    response = auth_app.get(f"/protected?api_key={VALID_KEY}")
    assert response.status_code == 200


def test_wrong_key_returns_401(auth_app):
    response = auth_app.get("/protected", headers={"X-API-Key": "wrong-key"})
    assert response.status_code == 401
    assert "detail" in response.json()


def test_no_key_returns_401(auth_app):
    response = auth_app.get("/protected")
    assert response.status_code == 401


def test_empty_key_returns_401(auth_app):
    response = auth_app.get("/protected", headers={"X-API-Key": ""})
    assert response.status_code == 401


def test_query_param_takes_priority_when_header_absent(auth_app):
    """SSE 端點只能用 query param，需確認 api_key query 有效。"""
    response = auth_app.get(f"/protected?api_key={VALID_KEY}")
    assert response.status_code == 200


def test_header_takes_priority_over_absent_query(auth_app):
    response = auth_app.get("/protected", headers={"X-API-Key": VALID_KEY})
    assert response.status_code == 200
