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
    resp = client.get("/api/v1/settings/account")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["logged_in"] is False
    assert data["profile"] is None


def test_register_account():
    resp = _register()
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert "token" in data
    assert data["profile"]["display_name"] == "Alice"
    assert data["profile"]["email"] == "alice@example.com"
    assert "created_at" in data["profile"]


def test_register_duplicate_fails():
    _register()
    resp = _register()
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "ACCOUNT_EXISTS"


def test_login_success():
    _register()

    resp = _login()
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "token" in data
    assert data["profile"]["display_name"] == "Alice"
    assert data["profile"]["email"] == "alice@example.com"


def test_login_wrong_password():
    _register()
    resp = _login(password="wrong")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_login_nonexistent_email():
    _register()
    resp = _login(email="nobody@example.com")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_account_status_logged_in():
    reg = _register()
    token = reg.json()["data"]["token"]

    resp = client.get("/api/v1/settings/account", headers=_auth_header(token))
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["logged_in"] is True
    assert data["profile"]["display_name"] == "Alice"


def test_update_profile_display_name():
    reg = _register()
    token = reg.json()["data"]["token"]

    resp = client.put(
        "/api/v1/settings/account/profile",
        json={"display_name": "Bob"},
        headers=_auth_header(token),
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["display_name"] == "Bob"
    assert resp.json()["data"]["email"] == "alice@example.com"


def test_update_password():
    reg = _register()
    token = reg.json()["data"]["token"]

    resp = client.put(
        "/api/v1/settings/account/profile",
        json={"current_password": "secret123", "new_password": "newpass456"},
        headers=_auth_header(token),
    )
    assert resp.status_code == 200

    # old password should fail
    resp = _login(password="secret123")
    assert resp.status_code == 401

    # new password should work
    resp = _login(password="newpass456")
    assert resp.status_code == 200


def test_delete_account():
    reg = _register()
    token = reg.json()["data"]["token"]

    resp = client.delete("/api/v1/settings/account", headers=_auth_header(token))
    assert resp.status_code == 204

    # should be back to guest
    resp = client.get("/api/v1/settings/account")
    data = resp.json()["data"]
    assert data["logged_in"] is False
    assert data["profile"] is None

    # old token should be rejected after jwt_secret rotation
    resp = client.put(
        "/api/v1/settings/account/profile",
        json={"display_name": "ghost"},
        headers=_auth_header(token),
    )
    assert resp.status_code == 401
