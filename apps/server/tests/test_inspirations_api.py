from pathlib import Path
from tempfile import TemporaryDirectory

import pytest
from fastapi.testclient import TestClient

from app.db import sqlite
from app.main import app
from app.services import image_analysis
from app.services import inspirations as inspiration_service
from app.storage import local_files

PNG_BYTES = b"\x89PNG\r\n\x1a\nminimal-png-payload"
TEXT_BYTES = b"plain text payload"


@pytest.fixture()
def client(monkeypatch):
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir_name:
        temp_dir = Path(temp_dir_name)
        data_dir = temp_dir / "data"
        store_dir = data_dir / "store"

        monkeypatch.setattr(sqlite, "DATA_DIR", data_dir)
        monkeypatch.setattr(sqlite, "DATABASE_PATH", data_dir / "meta.db")
        monkeypatch.setattr(local_files, "STORE_DIR", store_dir)
        monkeypatch.setattr(inspiration_service, "STORE_DIR", store_dir)

        with TestClient(app) as test_client:
            yield test_client


def test_upload_list_detail_and_inline_file_flow(client: TestClient):
    initial_list = client.get("/api/v1/inspirations")

    assert initial_list.status_code == 200
    assert initial_list.json() == {"data": [], "meta": {"limit": 20, "offset": 0, "total": 0}}

    response = client.post(
        "/api/v1/inspirations",
        data={"title": "Moodboard", "notes": "Warm tones", "source_url": " https://example.com/ref "},
        files={"file": ("sample.png", PNG_BYTES, "image/png")},
    )

    assert response.status_code == 201
    created = response.json()["data"]
    inspiration_id = created["id"]

    assert created["title"] == "Moodboard"
    assert created["notes"] == "Warm tones"
    assert created["source_url"] == "https://example.com/ref"
    assert created["board_id"] == "board_app_ui"
    assert created["board_name"] == "App UI 参考"
    assert created["status"] == "active"
    assert created["original_filename"] == "sample.png"
    assert created["mime_type"] == "image/png"
    assert created["file_url"] == f"/api/v1/inspirations/{inspiration_id}/file"
    assert created["analysis_status"] == "idle"
    assert created["updated_at"] == created["created_at"]
    assert created["archived_at"] is None

    listed = client.get("/api/v1/inspirations")

    assert listed.status_code == 200
    assert listed.json()["meta"]["total"] == 1
    assert listed.json()["data"][0]["id"] == inspiration_id
    assert listed.json()["data"][0]["board_name"] == "App UI 参考"
    assert listed.json()["data"][0]["status"] == "active"

    detail = client.get(f"/api/v1/inspirations/{inspiration_id}")

    assert detail.status_code == 200
    assert detail.json()["data"] == created

    file_response = client.get(f"/api/v1/inspirations/{inspiration_id}/file")

    assert file_response.status_code == 200
    assert file_response.content == PNG_BYTES
    assert file_response.headers["content-type"] == "image/png"
    assert file_response.headers["content-disposition"].startswith("inline;")
    assert 'filename="sample.png"' in file_response.headers["content-disposition"]


@pytest.mark.parametrize(
    ("files", "expected_status", "expected_code"),
    [
        ({}, 400, "MISSING_FILE"),
        ({"file": ("sample.txt", TEXT_BYTES, "text/plain")}, 400, "INVALID_FILE_TYPE"),
    ],
)
def test_upload_validation_errors(client: TestClient, files, expected_status: int, expected_code: str):
    response = client.post("/api/v1/inspirations", files=files)

    assert response.status_code == expected_status
    assert response.json()["error"]["code"] == expected_code


def test_not_found_and_missing_stored_file_errors(client: TestClient):
    missing_detail = client.get("/api/v1/inspirations/ins_missing")

    assert missing_detail.status_code == 404
    assert missing_detail.json()["error"]["code"] == "INSPIRATION_NOT_FOUND"

    create_response = client.post(
        "/api/v1/inspirations",
        files={"file": ("sample.png", PNG_BYTES, "image/png")},
    )
    inspiration = create_response.json()["data"]
    stored_file = inspiration_service.STORE_DIR / Path(inspiration["storage_key"]).relative_to("store")
    stored_file.unlink()

    missing_file = client.get(f'/api/v1/inspirations/{inspiration["id"]}/file')

    assert missing_file.status_code == 500
    assert missing_file.json()["error"]["code"] == "SAVE_FAILED"


def test_patch_archive_and_delete_flows(client: TestClient):
    create_response = client.post(
        "/api/v1/inspirations",
        data={"title": "Original", "notes": "First note", "source_url": "https://example.com/start"},
        files={"file": ("sample.png", PNG_BYTES, "image/png")},
    )
    inspiration_id = create_response.json()["data"]["id"]

    patched = client.patch(
        f"/api/v1/inspirations/{inspiration_id}",
        json={"title": "Updated", "notes": " ", "source_url": " https://example.com/updated "},
    )

    assert patched.status_code == 200
    patched_data = patched.json()["data"]
    assert patched_data["title"] == "Updated"
    assert patched_data["notes"] is None
    assert patched_data["source_url"] == "https://example.com/updated"
    assert patched_data["updated_at"] >= patched_data["created_at"]

    archived = client.post(f"/api/v1/inspirations/{inspiration_id}/archive")

    assert archived.status_code == 200
    archived_data = archived.json()["data"]
    assert archived_data["status"] == "archived"
    assert archived_data["archived_at"] is not None
    assert archived_data["updated_at"] == archived_data["archived_at"]

    active_list = client.get("/api/v1/inspirations")
    archived_list = client.get("/api/v1/inspirations?status=archived")

    assert active_list.status_code == 200
    assert active_list.json()["meta"]["total"] == 0
    assert archived_list.status_code == 200
    assert archived_list.json()["meta"]["total"] == 1
    assert archived_list.json()["data"][0]["id"] == inspiration_id
    assert archived_list.json()["data"][0]["status"] == "archived"

    stored_file = inspiration_service.STORE_DIR / Path(archived_data["storage_key"]).relative_to("store")
    assert stored_file.exists()

    deleted = client.delete(f"/api/v1/inspirations/{inspiration_id}")

    assert deleted.status_code == 204
    assert not stored_file.exists()
    assert client.get(f"/api/v1/inspirations/{inspiration_id}").status_code == 404


def test_create_rejects_unsafe_source_url(client: TestClient):
    before_paths = list(inspiration_service.STORE_DIR.rglob("*")) if inspiration_service.STORE_DIR.exists() else []

    response = client.post(
        "/api/v1/inspirations",
        data={"title": "Moodboard", "source_url": "javascript:alert(1)"},
        files={"file": ("sample.png", PNG_BYTES, "image/png")},
    )

    assert response.status_code == 422
    assert response.json()["error"] == {
        "code": "INVALID_SOURCE_URL",
        "message": "Source URL must be a valid http or https URL",
    }
    after_paths = list(inspiration_service.STORE_DIR.rglob("*")) if inspiration_service.STORE_DIR.exists() else []
    assert after_paths == before_paths


def test_create_rejects_whitespace_in_source_url_host(client: TestClient):
    response = client.post(
        "/api/v1/inspirations",
        data={"title": "Moodboard", "source_url": "https://exa mple.com/reference"},
        files={"file": ("sample.png", PNG_BYTES, "image/png")},
    )

    assert response.status_code == 422
    assert response.json()["error"] == {
        "code": "INVALID_SOURCE_URL",
        "message": "Source URL must be a valid http or https URL",
    }


def test_create_rejects_invalid_source_url_port(client: TestClient):
    response = client.post(
        "/api/v1/inspirations",
        data={"title": "Moodboard", "source_url": "https://example.com:99999/reference"},
        files={"file": ("sample.png", PNG_BYTES, "image/png")},
    )

    assert response.status_code == 422
    assert response.json()["error"] == {
        "code": "INVALID_SOURCE_URL",
        "message": "Source URL must be a valid http or https URL",
    }


def test_patch_rejects_unsafe_source_url(client: TestClient):
    created = client.post(
        "/api/v1/inspirations",
        data={"title": "Original"},
        files={"file": ("sample.png", PNG_BYTES, "image/png")},
    )

    response = client.patch(
        f'/api/v1/inspirations/{created.json()["data"]["id"]}',
        json={"source_url": "ftp://example.com/reference"},
    )

    assert response.status_code == 422
    assert response.json()["error"] == {
        "code": "INVALID_SOURCE_URL",
        "message": "Source URL must be a valid http or https URL",
    }


def test_patch_rejects_malformed_source_url(client: TestClient):
    created = client.post(
        "/api/v1/inspirations",
        data={"title": "Original"},
        files={"file": ("sample.png", PNG_BYTES, "image/png")},
    )

    response = client.patch(
        f'/api/v1/inspirations/{created.json()["data"]["id"]}',
        json={"source_url": "http://[::1"},
    )

    assert response.status_code == 422
    assert response.json()["error"] == {
        "code": "INVALID_SOURCE_URL",
        "message": "Source URL must be a valid http or https URL",
    }


def test_analyze_flow_persists_summary_tags_and_timestamp(client: TestClient, monkeypatch):
    create_response = client.post(
        "/api/v1/inspirations",
        data={"title": "Reference"},
        files={"file": ("sample.png", PNG_BYTES, "image/png")},
    )
    inspiration_id = create_response.json()["data"]["id"]

    def fake_analyze_image(*, payload: bytes, mime_type: str):
        assert payload == PNG_BYTES
        assert mime_type == "image/png"
        return {
            "summary": "Soft neutral interior with warm wood accents.",
            "prompt_en": "A soft neutral interior with warm wood accents, minimal editorial styling.",
            "prompt_zh": "一个柔和中性色调、带温暖木质点缀的极简室内编辑风格画面。",
            "tags_en": ["interior", "warm tones", "wood", "minimal"],
            "tags_zh": ["室内", "暖色调", "木质", "极简"],
            "colors": ["#E8E8ED", "#8E8E93", "#1C1C1E"],
        }

    monkeypatch.setattr(image_analysis, "analyze_image", fake_analyze_image)
    monkeypatch.setattr(inspiration_service, "analyze_image", fake_analyze_image)

    response = client.post(f"/api/v1/inspirations/{inspiration_id}/analyze")

    assert response.status_code == 200
    analyzed = response.json()["data"]
    assert analyzed["analysis_summary"] == "Soft neutral interior with warm wood accents."
    assert analyzed["analysis_tags"] == ["interior", "warm tones", "wood", "minimal"]
    assert analyzed["analysis_prompt_en"] == "A soft neutral interior with warm wood accents, minimal editorial styling."
    assert analyzed["analysis_prompt_zh"] == "一个柔和中性色调、带温暖木质点缀的极简室内编辑风格画面。"
    assert analyzed["analysis_tags_zh"] == ["室内", "暖色调", "木质", "极简"]
    assert analyzed["analysis_colors"] == ["#E8E8ED", "#8E8E93", "#1C1C1E"]
    assert analyzed["analysis_status"] == "completed"
    assert analyzed["analyzed_at"] is not None
    assert analyzed["updated_at"] == analyzed["analyzed_at"]

    detail = client.get(f"/api/v1/inspirations/{inspiration_id}")

    assert detail.status_code == 200
    assert detail.json()["data"]["analysis_summary"] == analyzed["analysis_summary"]
    assert detail.json()["data"]["analysis_tags"] == analyzed["analysis_tags"]
    assert detail.json()["data"]["analyzed_at"] == analyzed["analyzed_at"]


def test_boards_search_and_board_filtering(client: TestClient, monkeypatch):
    first = client.post(
        "/api/v1/inspirations",
        data={"title": "Concrete UI"},
        files={"file": ("first.png", PNG_BYTES, "image/png")},
    ).json()["data"]
    second = client.post(
        "/api/v1/inspirations",
        data={"title": "Landing Hero"},
        files={"file": ("second.png", PNG_BYTES, "image/png")},
    ).json()["data"]

    client.patch(f'/api/v1/inspirations/{second["id"]}', json={"board_id": "board_landing"})

    def fake_analyze_image(*, payload: bytes, mime_type: str):
        return {
            "summary": "Landing page hero scene.",
            "prompt_en": "A landing page hero with crisp typography and blue accents.",
            "prompt_zh": "一个具有清晰排版和蓝色点缀的落地页头图区块。",
            "tags_en": ["landing", "hero", "typography"],
            "tags_zh": ["落地页", "头图", "排版"],
            "colors": ["#E8E8ED", "#8E8E93", "#1C1C1E"],
        }

    monkeypatch.setattr(image_analysis, "analyze_image", fake_analyze_image)
    monkeypatch.setattr(inspiration_service, "analyze_image", fake_analyze_image)
    client.post(f'/api/v1/inspirations/{second["id"]}/analyze')

    boards = client.get("/api/v1/boards")
    search = client.get("/api/v1/inspirations?q=landing")
    filtered = client.get("/api/v1/inspirations?board_id=board_landing")

    assert boards.status_code == 200
    assert [board["id"] for board in boards.json()["data"]] == ["board_app_ui", "board_landing"]
    assert search.status_code == 200
    assert [item["id"] for item in search.json()["data"]] == [second["id"]]
    assert filtered.status_code == 200
    assert [item["id"] for item in filtered.json()["data"]] == [second["id"]]


def test_analyze_requires_configured_provider(client: TestClient, monkeypatch):
    create_response = client.post(
        "/api/v1/inspirations",
        files={"file": ("sample.png", PNG_BYTES, "image/png")},
    )
    inspiration_id = create_response.json()["data"]["id"]

    monkeypatch.delenv("BOWER_AI_PROVIDER", raising=False)
    monkeypatch.delenv("BOWER_OPENAI_API_KEY", raising=False)

    response = client.post(f"/api/v1/inspirations/{inspiration_id}/analyze")

    assert response.status_code == 503
    assert response.json()["error"] == {
        "code": "AI_PROVIDER_NOT_CONFIGURED",
        "message": "AI analysis provider is not configured",
    }


def test_delete_requires_archived_status_and_patch_requires_fields(client: TestClient):
    create_response = client.post(
        "/api/v1/inspirations",
        files={"file": ("sample.png", PNG_BYTES, "image/png")},
    )
    inspiration_id = create_response.json()["data"]["id"]

    delete_response = client.delete(f"/api/v1/inspirations/{inspiration_id}")
    empty_patch_response = client.patch(f"/api/v1/inspirations/{inspiration_id}", json={})
    invalid_status_response = client.get("/api/v1/inspirations?status=all")

    assert delete_response.status_code == 409
    assert delete_response.json()["error"]["code"] == "INSPIRATION_NOT_ARCHIVED"
    assert empty_patch_response.status_code == 422
    assert empty_patch_response.json()["error"]["code"] == "INVALID_REQUEST"
    assert invalid_status_response.status_code == 422
    assert invalid_status_response.json()["error"]["code"] == "INVALID_STATUS"


def test_delete_succeeds_when_file_cleanup_fails_after_metadata_delete(client: TestClient, monkeypatch):
    create_response = client.post(
        "/api/v1/inspirations",
        files={"file": ("sample.png", PNG_BYTES, "image/png")},
    )
    inspiration_id = create_response.json()["data"]["id"]

    archived = client.post(f"/api/v1/inspirations/{inspiration_id}/archive")
    archived_data = archived.json()["data"]
    stored_file = inspiration_service.STORE_DIR / Path(archived_data["storage_key"]).relative_to("store")

    assert stored_file.exists()

    def fail_remove(_path):
        raise OSError("simulated cleanup failure")

    monkeypatch.setattr(inspiration_service.os, "remove", fail_remove)

    deleted = client.delete(f"/api/v1/inspirations/{inspiration_id}")

    assert deleted.status_code == 204
    assert stored_file.exists()
    assert client.get(f"/api/v1/inspirations/{inspiration_id}").status_code == 404
