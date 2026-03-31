from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi.testclient import TestClient

from app.db import sqlite
from app.main import app


def _build_client(monkeypatch):
    tmp = TemporaryDirectory(ignore_cleanup_errors=True)
    temp_dir = Path(tmp.name)
    data_dir = temp_dir / "data"

    monkeypatch.setattr(sqlite, "DATA_DIR", data_dir)
    monkeypatch.setattr(sqlite, "DATABASE_PATH", data_dir / "meta.db")

    test_client = TestClient(app)
    return tmp, test_client


def test_get_ai_settings_returns_empty_state_by_default(monkeypatch):
    tmp, client = _build_client(monkeypatch)
    try:
        with client:
            response = client.get("/api/v1/settings/ai")

        assert response.status_code == 200
        assert response.json() == {
            "data": {
                "provider": None,
                "provider_source": None,
                "model_id": None,
                "has_api_key": False,
                "api_key_mask": None,
                "api_key_source": None,
                "updated_at": None,
                }
            }
    finally:
        tmp.cleanup()


def test_put_ai_settings_persists_and_masks_api_key(monkeypatch):
    tmp, client = _build_client(monkeypatch)
    try:
        with client:
            response = client.put(
                "/api/v1/settings/ai",
                json={
                    "provider": "openai",
                    "model_id": "gpt-4.1-mini",
                    "api_key": "sk-test-12345678",
                },
            )
            fetched = client.get("/api/v1/settings/ai")

        assert response.status_code == 200
        assert response.json()["data"] == fetched.json()["data"]
        assert response.json()["data"]["provider"] == "openai"
        assert response.json()["data"]["provider_source"] == "stored"
        assert response.json()["data"]["model_id"] == "gpt-4.1-mini"
        assert response.json()["data"]["has_api_key"] is True
        assert response.json()["data"]["api_key_mask"] == "************5678"
        assert response.json()["data"]["api_key_source"] == "stored"
        assert response.json()["data"]["updated_at"] is not None

        with sqlite.get_connection() as connection:
            row = connection.execute("SELECT * FROM ai_provider_settings WHERE id = 1").fetchone()

        assert row["provider"] == "openai"
        assert row["model_id"] == "gpt-4.1-mini"
        assert row["api_key"] == "sk-test-12345678"
    finally:
        tmp.cleanup()


def test_put_ai_settings_preserves_existing_key_for_same_provider_until_cleared(monkeypatch):
    tmp, client = _build_client(monkeypatch)
    try:
        with client:
            first_save = client.put(
                "/api/v1/settings/ai",
                json={
                    "provider": "openai",
                    "model_id": "gpt-4.1-mini",
                    "api_key": "persisted-key-0001",
                },
            )
            second_save = client.put(
                "/api/v1/settings/ai",
                json={
                    "provider": "openai",
                    "model_id": "gpt-4.1",
                },
            )
            third_save = client.put(
                "/api/v1/settings/ai",
                json={
                    "provider": "openai",
                    "model_id": "gpt-4.1",
                    "clear_api_key": True,
                },
            )

        assert first_save.status_code == 200
        assert second_save.status_code == 200
        assert second_save.json()["data"]["provider"] == "openai"
        assert second_save.json()["data"]["has_api_key"] is True
        assert second_save.json()["data"]["api_key_mask"] == "**************0001"
        assert third_save.status_code == 200
        assert third_save.json()["data"]["has_api_key"] is False
        assert third_save.json()["data"]["api_key_mask"] is None
        assert third_save.json()["data"]["api_key_source"] is None

        with sqlite.get_connection() as connection:
            row = connection.execute("SELECT * FROM ai_provider_settings WHERE id = 1").fetchone()

        assert row["provider"] == "openai"
        assert row["model_id"] == "gpt-4.1"
        assert row["api_key"] is None
    finally:
        tmp.cleanup()


def test_put_ai_settings_switching_provider_without_new_key_does_not_reuse_old_key(monkeypatch):
    tmp, client = _build_client(monkeypatch)
    try:
        with client:
            first_save = client.put(
                "/api/v1/settings/ai",
                json={
                    "provider": "openai",
                    "model_id": "gpt-4.1-mini",
                    "api_key": "persisted-key-0001",
                },
            )
            second_save = client.put(
                "/api/v1/settings/ai",
                json={
                    "provider": "google",
                    "model_id": "gemini-2.5-flash",
                },
            )

        assert first_save.status_code == 200
        assert second_save.status_code == 200
        assert second_save.json()["data"]["provider"] == "google"
        assert second_save.json()["data"]["has_api_key"] is False
        assert second_save.json()["data"]["api_key_mask"] is None
        assert second_save.json()["data"]["api_key_source"] is None

        with sqlite.get_connection() as connection:
            row = connection.execute("SELECT * FROM ai_provider_settings WHERE id = 1").fetchone()

        assert row["provider"] == "google"
        assert row["model_id"] == "gemini-2.5-flash"
        assert row["api_key"] is None
    finally:
        tmp.cleanup()


def test_get_ai_settings_uses_legacy_env_fallback_when_unsaved(monkeypatch):
    tmp, client = _build_client(monkeypatch)
    monkeypatch.setenv("BOWER_AI_PROVIDER", "google-ai-studio")
    monkeypatch.setenv("BOWER_GOOGLE_API_KEY", "google-key-1234")
    monkeypatch.setenv("BOWER_GOOGLE_MODEL", "gemini-2.5-flash")

    try:
        with client:
            response = client.get("/api/v1/settings/ai")

        assert response.status_code == 200
        assert response.json()["data"] == {
            "provider": "google",
            "provider_source": "legacy_env",
            "model_id": "gemini-2.5-flash",
            "has_api_key": True,
            "api_key_mask": "***********1234",
            "api_key_source": "legacy_env",
            "updated_at": None,
        }
    finally:
        tmp.cleanup()


def test_put_ai_settings_persists_legacy_env_key_when_saving_same_provider_without_new_key(monkeypatch):
    tmp, client = _build_client(monkeypatch)
    monkeypatch.setenv("BOWER_AI_PROVIDER", "google-ai-studio")
    monkeypatch.setenv("BOWER_GOOGLE_API_KEY", "google-key-1234")
    monkeypatch.setenv("BOWER_GOOGLE_MODEL", "gemini-2.5-flash")

    try:
        with client:
            saved = client.put(
                "/api/v1/settings/ai",
                json={
                    "provider": "google",
                    "model_id": "gemini-2.5-flash",
                },
            )
            fetched = client.get("/api/v1/settings/ai")

        assert saved.status_code == 200
        assert saved.json()["data"] == fetched.json()["data"]
        assert saved.json()["data"]["provider"] == "google"
        assert saved.json()["data"]["provider_source"] == "stored"
        assert saved.json()["data"]["has_api_key"] is True
        assert saved.json()["data"]["api_key_mask"] == "***********1234"
        assert saved.json()["data"]["api_key_source"] == "stored"

        with sqlite.get_connection() as connection:
            row = connection.execute("SELECT * FROM ai_provider_settings WHERE id = 1").fetchone()

        assert row["provider"] == "google"
        assert row["model_id"] == "gemini-2.5-flash"
        assert row["api_key"] == "google-key-1234"
    finally:
        tmp.cleanup()


def test_get_ai_settings_does_not_fallback_to_legacy_env_after_key_is_cleared(monkeypatch):
    tmp, client = _build_client(monkeypatch)
    monkeypatch.setenv("BOWER_AI_PROVIDER", "openai")
    monkeypatch.setenv("BOWER_OPENAI_API_KEY", "legacy-openai-key-9999")
    monkeypatch.setenv("BOWER_OPENAI_MODEL", "gpt-4.1-mini")

    try:
        with client:
            first_save = client.put(
                "/api/v1/settings/ai",
                json={
                    "provider": "openai",
                    "model_id": "gpt-4.1-mini",
                    "api_key": "stored-openai-key-0001",
                },
            )
            cleared = client.put(
                "/api/v1/settings/ai",
                json={
                    "provider": "openai",
                    "model_id": "gpt-4.1-mini",
                    "clear_api_key": True,
                },
            )
            fetched = client.get("/api/v1/settings/ai")

        assert first_save.status_code == 200
        assert cleared.status_code == 200
        assert cleared.json()["data"] == fetched.json()["data"]
        assert fetched.json()["data"]["provider"] == "openai"
        assert fetched.json()["data"]["provider_source"] == "stored"
        assert fetched.json()["data"]["has_api_key"] is False
        assert fetched.json()["data"]["api_key_mask"] is None
        assert fetched.json()["data"]["api_key_source"] is None
    finally:
        tmp.cleanup()
