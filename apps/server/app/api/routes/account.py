from fastapi import APIRouter, Header, Response

from app.schemas.account import (
    AccountLogin,
    AccountProfileEnvelope,
    AccountProfileUpdate,
    AccountRegister,
    AccountStatusEnvelope,
    AuthTokenEnvelope,
)
from app.schemas.inspiration import ErrorEnvelope
from app.services.account import (
    delete_account,
    get_account_status,
    login_account,
    register_account,
    update_account_profile,
)

router = APIRouter(prefix="/settings/account", tags=["account"])


@router.get("", response_model=AccountStatusEnvelope)
def fetch_account_status(authorization: str | None = Header(default=None)):
    return get_account_status(authorization)


@router.post("/register", response_model=AuthTokenEnvelope, status_code=201, responses={409: {"model": ErrorEnvelope}})
def create_account(payload: AccountRegister):
    return register_account(payload)


@router.post("/login", response_model=AuthTokenEnvelope, responses={401: {"model": ErrorEnvelope}})
def authenticate_account(payload: AccountLogin):
    return login_account(payload)


@router.put("/profile", response_model=AccountProfileEnvelope, responses={401: {"model": ErrorEnvelope}, 404: {"model": ErrorEnvelope}})
def modify_account_profile(payload: AccountProfileUpdate, authorization: str | None = Header(default=None)):
    return update_account_profile(authorization, payload)


@router.delete("", status_code=204, responses={401: {"model": ErrorEnvelope}})
def remove_account(authorization: str | None = Header(default=None)):
    delete_account(authorization)
    return Response(status_code=204)
