import pytest
from fastapi.testclient import TestClient

import app.db.sqlite as db_mod
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def _use_temp_db(tmp_path, monkeypatch):
    monkeypatch.setattr(db_mod, "DATA_DIR", tmp_path)
    monkeypatch.setattr(db_mod, "DATABASE_PATH", tmp_path / "meta.db")
    db_mod.initialize_database()


def _register(display_name="Alice", email="alice@example.com", password="secret123"):
    return client.post(
        "/api/v1/settings/account/register",
        json={"display_name": display_name, "email": email, "password": password},
    )


def _login(email="alice@example.com", password="secret123"):
    return client.post(
        "/api/v1/settings/account/login",
        json={"email": email, "password": password},
    )


def _auth_header(token: str):
    return {"Authorization": f"Bearer {token}"}


def test_account_status_guest():
    response = client.get("/api/v1/settings/account")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["logged_in"] is False
    assert data["profile"] is None


def test_register_account():
    response = _register()
    assert response.status_code == 201
    data = response.json()["data"]
    assert "token" in data
    assert data["profile"]["display_name"] == "Alice"
    assert data["profile"]["email"] == "alice@example.com"


def test_register_duplicate_fails():
    _register()
    response = _register()
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "ACCOUNT_EXISTS"


def test_login_success():
    _register()
    response = _login()
    assert response.status_code == 200
    assert response.json()["data"]["profile"]["email"] == "alice@example.com"


def test_login_wrong_password():
    _register()
    response = _login(password="wrong")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_update_profile_display_name():
    token = _register().json()["data"]["token"]
    response = client.put(
        "/api/v1/settings/account/profile",
        json={"display_name": "Bob"},
        headers=_auth_header(token),
    )
    assert response.status_code == 200
    assert response.json()["data"]["display_name"] == "Bob"


def test_update_password():
    token = _register().json()["data"]["token"]
    response = client.put(
        "/api/v1/settings/account/profile",
        json={"current_password": "secret123", "new_password": "newpass456"},
        headers=_auth_header(token),
    )
    assert response.status_code == 200
    assert _login(password="secret123").status_code == 401
    assert _login(password="newpass456").status_code == 200


def test_delete_account():
    token = _register().json()["data"]["token"]
    response = client.delete("/api/v1/settings/account", headers=_auth_header(token))
    assert response.status_code == 204
    status = client.get("/api/v1/settings/account").json()["data"]
    assert status["logged_in"] is False
    assert status["profile"] is None
