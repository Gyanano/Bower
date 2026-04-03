import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.db.sqlite import get_connection
from app.errors import AppError
from app.schemas.account import (
    AccountLogin,
    AccountProfile,
    AccountProfileEnvelope,
    AccountProfileUpdate,
    AccountRegister,
    AccountStatus,
    AccountStatusEnvelope,
    AuthToken,
    AuthTokenEnvelope,
)
from app.utils import utc_now

JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 30


def _get_or_create_jwt_secret() -> str:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT jwt_secret FROM app_preferences WHERE id = 1"
        ).fetchone()
        if row and row["jwt_secret"]:
            return row["jwt_secret"]
        secret = secrets.token_hex(32)
        connection.execute(
            "UPDATE app_preferences SET jwt_secret = ? WHERE id = 1",
            (secret,),
        )
        connection.commit()
        return secret


def _create_jwt(user_id: int) -> str:
    secret = _get_or_create_jwt_secret()
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRY_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, secret, algorithm=JWT_ALGORITHM)


def _verify_jwt(token: str) -> int | None:
    secret = _get_or_create_jwt_secret()
    try:
        payload = jwt.decode(token, secret, algorithms=[JWT_ALGORITHM])
        sub = payload.get("sub")
        return int(sub) if sub is not None else None
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, ValueError):
        return None


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def _fetch_user_row():
    with get_connection() as connection:
        return connection.execute(
            "SELECT display_name, email, password_hash, created_at, updated_at FROM local_user WHERE id = 1"
        ).fetchone()


def _row_to_profile(row) -> AccountProfile:
    return AccountProfile(
        display_name=row["display_name"],
        email=row["email"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _extract_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    return None


def get_account_status(authorization: str | None) -> AccountStatusEnvelope:
    token = _extract_token(authorization)
    if token:
        user_id = _verify_jwt(token)
        if user_id is not None:
            row = _fetch_user_row()
            if row:
                return AccountStatusEnvelope(
                    data=AccountStatus(logged_in=True, profile=_row_to_profile(row))
                )
    return AccountStatusEnvelope(data=AccountStatus(logged_in=False, profile=None))


def register_account(payload: AccountRegister) -> AuthTokenEnvelope:
    existing = _fetch_user_row()
    if existing is not None:
        raise AppError(409, "ACCOUNT_EXISTS", "An account already exists on this device")

    now = utc_now()
    password_hash = _hash_password(payload.password)

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO local_user (id, display_name, email, password_hash, created_at, updated_at)
            VALUES (1, ?, ?, ?, ?, ?)
            """,
            (payload.display_name, payload.email, password_hash, now, now),
        )
        connection.commit()

    row = _fetch_user_row()
    profile = _row_to_profile(row)
    token = _create_jwt(1)
    return AuthTokenEnvelope(data=AuthToken(token=token, profile=profile))


def login_account(payload: AccountLogin) -> AuthTokenEnvelope:
    row = _fetch_user_row()
    if row is None:
        raise AppError(401, "INVALID_CREDENTIALS", "Invalid email or password")

    if row["email"] != payload.email:
        raise AppError(401, "INVALID_CREDENTIALS", "Invalid email or password")

    if not _verify_password(payload.password, row["password_hash"]):
        raise AppError(401, "INVALID_CREDENTIALS", "Invalid email or password")

    profile = _row_to_profile(row)
    token = _create_jwt(1)
    return AuthTokenEnvelope(data=AuthToken(token=token, profile=profile))


def update_account_profile(authorization: str | None, payload: AccountProfileUpdate) -> AccountProfileEnvelope:
    token = _extract_token(authorization)
    if not token or _verify_jwt(token) is None:
        raise AppError(401, "AUTH_REQUIRED", "Authentication required")

    row = _fetch_user_row()
    if row is None:
        raise AppError(404, "ACCOUNT_NOT_FOUND", "No account found")

    if payload.new_password:
        if not payload.current_password or not _verify_password(payload.current_password, row["password_hash"]):
            raise AppError(401, "INVALID_CREDENTIALS", "Current password is incorrect")

    now = utc_now()
    new_display_name = payload.display_name if payload.display_name is not None else row["display_name"]
    new_email = payload.email if payload.email is not None else row["email"]
    new_password_hash = _hash_password(payload.new_password) if payload.new_password else row["password_hash"]

    with get_connection() as connection:
        connection.execute(
            """
            UPDATE local_user
            SET display_name = ?, email = ?, password_hash = ?, updated_at = ?
            WHERE id = 1
            """,
            (new_display_name, new_email, new_password_hash, now),
        )
        connection.commit()

    updated_row = _fetch_user_row()
    return AccountProfileEnvelope(data=_row_to_profile(updated_row))


def delete_account(authorization: str | None) -> None:
    token = _extract_token(authorization)
    if not token or _verify_jwt(token) is None:
        raise AppError(401, "AUTH_REQUIRED", "Authentication required")

    with get_connection() as connection:
        connection.execute("DELETE FROM local_user WHERE id = 1")
        connection.commit()
