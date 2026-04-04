from datetime import datetime, timezone

from app.db.sqlite import DEFAULT_UI_LANGUAGE, get_connection
from app.schemas.preferences import AppPreferences, AppPreferencesEnvelope, AppPreferencesUpdate


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def get_app_preferences() -> AppPreferencesEnvelope:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT ui_language, updated_at
            FROM app_preferences
            WHERE id = 1
            """
        ).fetchone()

    if row is None:
        return AppPreferencesEnvelope(data=AppPreferences(ui_language=DEFAULT_UI_LANGUAGE, updated_at=None))

    return AppPreferencesEnvelope(data=AppPreferences.model_validate(dict(row)))


def update_app_preferences(payload: AppPreferencesUpdate) -> AppPreferencesEnvelope:
    updated_at = _utc_now()
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO app_preferences (id, ui_language, updated_at)
            VALUES (1, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                ui_language = excluded.ui_language,
                updated_at = excluded.updated_at
            """,
            (payload.ui_language, updated_at),
        )
        connection.commit()

    return get_app_preferences()
