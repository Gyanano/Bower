from pydantic import BaseModel, EmailStr, Field, model_validator


class AccountRegister(BaseModel):
    display_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6)


class AccountLogin(BaseModel):
    email: EmailStr
    password: str


class AccountProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = None
    current_password: str | None = None
    new_password: str | None = Field(default=None, min_length=6)

    @model_validator(mode="after")
    def validate_password_change(self):
        if self.new_password and not self.current_password:
            raise ValueError("current_password is required when setting a new password")
        return self


class AccountProfile(BaseModel):
    display_name: str
    email: str
    created_at: str
    updated_at: str


class AccountProfileEnvelope(BaseModel):
    data: AccountProfile


class AccountStatus(BaseModel):
    logged_in: bool
    profile: AccountProfile | None = None


class AccountStatusEnvelope(BaseModel):
    data: AccountStatus


class AuthToken(BaseModel):
    token: str
    profile: AccountProfile


class AuthTokenEnvelope(BaseModel):
    data: AuthToken
