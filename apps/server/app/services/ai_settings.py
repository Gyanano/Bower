import os
from dataclasses import dataclass
from datetime import datetime, timezone

from app.db.sqlite import get_connection
from app.errors import AppError
from app.schemas.ai_settings import (
    AIProvider,
    AISettings,
    AISettingsEnvelope,
    AISettingsTestEnvelope,
    AISettingsTestRequest,
    AISettingsTestResult,
    AISettingsUpdate,
)

SOURCE_STORED = "stored"
SOURCE_LEGACY_ENV = "legacy_env"

PROVIDER_DEFAULT_MODEL_IDS: dict[AIProvider, str | None] = {
    "openai": "gpt-4.1-mini",
    "anthropic": "claude-3-5-haiku-latest",
    "google": "gemini-2.5-flash",
    "volcengine": None,
}

PROVIDER_ALIASES: dict[str, AIProvider] = {
    "openai": "openai",
    "anthropic": "anthropic",
    "google": "google",
    "gemini": "google",
    "google-ai-studio": "google",
    "google_ai_studio": "google",
    "volcengine": "volcengine",
    "ark": "volcengine",
    "volcano": "volcengine",
    "byteplus": "volcengine",
}

PROVIDER_API_KEY_ENV_NAMES: dict[AIProvider, tuple[str, ...]] = {
    "openai": ("BOWER_OPENAI_API_KEY",),
    "anthropic": ("BOWER_ANTHROPIC_API_KEY",),
    "google": ("BOWER_GOOGLE_API_KEY", "BOWER_GEMINI_API_KEY"),
    "volcengine": ("BOWER_VOLCENGINE_API_KEY", "BOWER_ARK_API_KEY"),
}

PROVIDER_MODEL_ENV_NAMES: dict[AIProvider, tuple[str, ...]] = {
    "openai": ("BOWER_OPENAI_MODEL",),
    "anthropic": ("BOWER_ANTHROPIC_MODEL",),
    "google": ("BOWER_GOOGLE_MODEL", "BOWER_GEMINI_MODEL"),
    "volcengine": (
        "BOWER_VOLCENGINE_MODEL",
        "BOWER_VOLCENGINE_ENDPOINT_ID",
        "BOWER_ARK_MODEL",
        "BOWER_ARK_ENDPOINT_ID",
    ),
}


@dataclass(frozen=True)
class ResolvedAIProviderSettings:
    provider: AIProvider
    model_id: str | None
    api_key: str | None
    provider_source: str
    api_key_source: str | None
    updated_at: str | None
    legacy_openai_base_url: str | None = None


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _normalize_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _normalize_provider(value: str | None) -> AIProvider | None:
    if value is None:
        return None
    return PROVIDER_ALIASES.get(value.strip().lower())


def _mask_api_key(value: str | None) -> str | None:
    normalized = _normalize_optional_text(value)
    if normalized is None:
        return None
    if len(normalized) <= 4:
        return "*" * len(normalized)
    return f"{'*' * max(8, len(normalized) - 4)}{normalized[-4:]}"


def _env_first(names: tuple[str, ...]) -> str | None:
    for name in names:
        value = _normalize_optional_text(os.getenv(name))
        if value is not None:
            return value
    return None


def _fetch_stored_settings_row():
    with get_connection() as connection:
        return connection.execute(
            """
            SELECT provider, model_id, api_key, updated_at
            FROM ai_provider_settings
            WHERE id = 1
            """
        ).fetchone()


def resolve_ai_provider_settings() -> ResolvedAIProviderSettings | None:
    stored_row = _fetch_stored_settings_row()
    stored_provider = _normalize_provider(stored_row["provider"]) if stored_row is not None else None
    if stored_provider is not None:
        stored_model_id = _normalize_optional_text(stored_row["model_id"])
        stored_api_key = _normalize_optional_text(stored_row["api_key"])

        return ResolvedAIProviderSettings(
            provider=stored_provider,
            model_id=stored_model_id or PROVIDER_DEFAULT_MODEL_IDS[stored_provider],
            api_key=stored_api_key,
            provider_source=SOURCE_STORED,
            api_key_source=SOURCE_STORED if stored_api_key else None,
            updated_at=_normalize_optional_text(stored_row["updated_at"]),
        )

    legacy_provider = _normalize_provider(os.getenv("BOWER_AI_PROVIDER"))
    if legacy_provider is None:
        return None

    legacy_api_key = _env_first(PROVIDER_API_KEY_ENV_NAMES[legacy_provider])
    return ResolvedAIProviderSettings(
        provider=legacy_provider,
        model_id=_env_first(PROVIDER_MODEL_ENV_NAMES[legacy_provider]) or PROVIDER_DEFAULT_MODEL_IDS[legacy_provider],
        api_key=legacy_api_key,
        provider_source=SOURCE_LEGACY_ENV,
        api_key_source=SOURCE_LEGACY_ENV if legacy_api_key else None,
        updated_at=None,
        legacy_openai_base_url=_normalize_optional_text(os.getenv("BOWER_OPENAI_BASE_URL"))
        if legacy_provider == "openai"
        else None,
    )


def get_ai_settings() -> AISettingsEnvelope:
    resolved = resolve_ai_provider_settings()
    if resolved is None:
        return AISettingsEnvelope(data=AISettings())

    return AISettingsEnvelope(
        data=AISettings(
            provider=resolved.provider,
            provider_source=resolved.provider_source,
            model_id=resolved.model_id,
            has_api_key=resolved.api_key is not None,
            api_key_mask=_mask_api_key(resolved.api_key),
            api_key_source=resolved.api_key_source,
            updated_at=resolved.updated_at,
        )
    )


def update_ai_settings(payload: AISettingsUpdate) -> AISettingsEnvelope:
    existing_row = _fetch_stored_settings_row()
    existing_provider = _normalize_provider(existing_row["provider"]) if existing_row is not None else None
    existing_api_key = _normalize_optional_text(existing_row["api_key"]) if existing_row is not None else None
    legacy_provider = _normalize_provider(os.getenv("BOWER_AI_PROVIDER")) if existing_row is None else None
    legacy_api_key = _env_first(PROVIDER_API_KEY_ENV_NAMES[payload.provider]) if legacy_provider == payload.provider else None

    api_key = existing_api_key if existing_provider == payload.provider else legacy_api_key
    if payload.clear_api_key:
        api_key = None
    elif payload.api_key is not None:
        normalized_api_key = _normalize_optional_text(payload.api_key)
        if normalized_api_key is not None:
            api_key = normalized_api_key

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO ai_provider_settings (id, provider, model_id, api_key, updated_at)
            VALUES (1, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                provider = excluded.provider,
                model_id = excluded.model_id,
                api_key = excluded.api_key,
                updated_at = excluded.updated_at
            """,
            (
                payload.provider,
                _normalize_optional_text(payload.model_id),
                api_key,
                _utc_now(),
            ),
        )
        connection.commit()

    return get_ai_settings()


def test_ai_settings(payload: AISettingsTestRequest) -> AISettingsTestEnvelope:
    if payload.api_key is not None and payload.api_key.strip():
        api_key = payload.api_key.strip()
    else:
        resolved = resolve_ai_provider_settings()
        if resolved is None or resolved.provider != payload.provider or not resolved.api_key:
            raise AppError(
                status_code=422,
                code="AI_PROVIDER_NOT_CONFIGURED",
                message="Provide an API key or save settings for this provider before testing the connection",
            )
        api_key = resolved.api_key

    model_id = _normalize_optional_text(payload.model_id) or PROVIDER_DEFAULT_MODEL_IDS[payload.provider]
    from app.services.image_analysis import test_provider_connection

    message = test_provider_connection(
        provider=payload.provider,
        model_id=model_id,
        api_key=api_key,
        legacy_openai_base_url=_normalize_optional_text(os.getenv("BOWER_OPENAI_BASE_URL")) if payload.provider == "openai" else None,
    )
    return AISettingsTestEnvelope(
        data=AISettingsTestResult(
            success=True,
            provider=payload.provider,
            model_id=model_id,
            message=message,
        )
    )
