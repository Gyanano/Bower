from typing import Literal

from pydantic import BaseModel

UILanguage = Literal["zh-CN", "en"]


class AppPreferences(BaseModel):
    ui_language: UILanguage = "zh-CN"
    updated_at: str | None = None


class AppPreferencesUpdate(BaseModel):
    ui_language: UILanguage


class AppPreferencesEnvelope(BaseModel):
    data: AppPreferences
