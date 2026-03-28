from pathlib import Path
from tempfile import TemporaryDirectory

import pytest
from fastapi.testclient import TestClient

from app.db import sqlite
from app.main import app
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
    assert created["original_filename"] == "sample.png"
    assert created["mime_type"] == "image/png"
    assert created["file_url"] == f"/api/v1/inspirations/{inspiration_id}/file"

    listed = client.get("/api/v1/inspirations")

    assert listed.status_code == 200
    assert listed.json()["meta"]["total"] == 1
    assert listed.json()["data"][0]["id"] == inspiration_id

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
