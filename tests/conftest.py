import os
import sys
from unittest.mock import MagicMock

# 在所有 import 之前設定必要的環境變數
os.environ.setdefault("AZURE_AI_ENDPOINT", "http://fake-endpoint.example.com")
os.environ.setdefault("AZURE_AI_KEY", "fake-key-for-testing-only")
os.environ.setdefault("AUDITOR_API_KEY", "test-api-key-12345")

# config.py 使用 pydantic v1 的 BaseSettings，但本機若安裝 pydantic v2 會失敗。
# 嘗試正常 import；若失敗則注入 mock，讓 auth 測試仍可執行。
try:
    import config as _cfg_check  # noqa: F401
except Exception:
    _mock_cfg = MagicMock()
    _mock_cfg.settings.API_KEY = os.environ["AUDITOR_API_KEY"]
    _mock_cfg.settings.ALLOWED_ORIGINS = "http://localhost"
    _mock_cfg.settings.AZURE_AI_ENDPOINT = os.environ["AZURE_AI_ENDPOINT"]
    _mock_cfg.settings.AZURE_AI_KEY = os.environ["AZURE_AI_KEY"]
    _mock_cfg.settings.AZURE_AI_MODEL = "test-model"
    _mock_cfg.settings.MAX_UPLOAD_SIZE_MB = 10
    _mock_cfg.settings.MAX_CUSTOM_TEXT_CHARS = 50000
    sys.modules["config"] = _mock_cfg
