from fastapi import APIRouter

from app.schemas.preferences import AppPreferencesEnvelope, AppPreferencesUpdate
from app.services.preferences import get_app_preferences, update_app_preferences

router = APIRouter(prefix="/settings/preferences", tags=["settings"])


@router.get("", response_model=AppPreferencesEnvelope)
def fetch_app_preferences():
    return get_app_preferences()


@router.put("", response_model=AppPreferencesEnvelope)
def save_app_preferences(payload: AppPreferencesUpdate):
    return update_app_preferences(payload)
