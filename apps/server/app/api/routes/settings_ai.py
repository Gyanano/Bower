from fastapi import APIRouter

from app.schemas.ai_settings import AISettingsEnvelope, AISettingsUpdate
from app.schemas.inspiration import ErrorEnvelope
from app.services.ai_settings import get_ai_settings, update_ai_settings

router = APIRouter(prefix="/settings/ai", tags=["settings"])


@router.get("", response_model=AISettingsEnvelope)
def fetch_ai_settings():
    return get_ai_settings()


@router.put("", response_model=AISettingsEnvelope, responses={422: {"model": ErrorEnvelope}})
def save_ai_settings(payload: AISettingsUpdate):
    return update_ai_settings(payload)
