import os

# 在所有 import 之前設定必要的環境變數
os.environ.setdefault("AZURE_AI_ENDPOINT", "http://fake-endpoint.example.com")
os.environ.setdefault("AZURE_AI_KEY", "fake-key-for-testing-only")
os.environ.setdefault("AUDITOR_API_KEY", "test-api-key-12345")
