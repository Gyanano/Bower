from pydantic import BaseModel, ConfigDict


class InspirationBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str | None = None
    status: str
    original_filename: str
    mime_type: str
    file_size_bytes: int
    created_at: str
    updated_at: str


class InspirationListItem(InspirationBase):
    pass


class InspirationDetail(InspirationBase):
    notes: str | None = None
    source_url: str | None = None
    storage_key: str
    file_url: str
    archived_at: str | None = None


class InspirationMetadataPatch(BaseModel):
    title: str | None = None
    notes: str | None = None
    source_url: str | None = None


class PaginationMeta(BaseModel):
    limit: int
    offset: int
    total: int


class InspirationListEnvelope(BaseModel):
    data: list[InspirationListItem]
    meta: PaginationMeta


class InspirationDetailEnvelope(BaseModel):
    data: InspirationDetail


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorEnvelope(BaseModel):
    error: ErrorDetail
