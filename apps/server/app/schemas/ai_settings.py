from typing import Literal

from pydantic import BaseModel, model_validator

AIProvider = Literal["openai", "anthropic", "google", "volcengine"]
AISettingsSource = Literal["stored", "legacy_env"]


class AISettings(BaseModel):
    provider: AIProvider | None = None
    provider_source: AISettingsSource | None = None
    model_id: str | None = None
    has_api_key: bool = False
    api_key_mask: str | None = None
    api_key_source: AISettingsSource | None = None
    updated_at: str | None = None


class AISettingsUpdate(BaseModel):
    provider: AIProvider
    model_id: str | None = None
    api_key: str | None = None
    clear_api_key: bool = False

    @model_validator(mode="after")
    def validate_api_key_clear_state(self):
        if self.clear_api_key and self.api_key and self.api_key.strip():
            raise ValueError("api_key cannot be provided when clear_api_key is true")
        return self


class AISettingsEnvelope(BaseModel):
    data: AISettings
