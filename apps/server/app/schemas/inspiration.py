from pydantic import BaseModel, ConfigDict, Field


class InspirationBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    board_id: str | None = None
    board_name: str | None = None
    title: str | None = None
    status: str
    original_filename: str
    mime_type: str
    file_size_bytes: int
    created_at: str
    updated_at: str
    file_url: str
    analysis_status: str = "idle"
    analysis_error: str | None = None
    analysis_tags_en: list[str] = Field(default_factory=list)
    analysis_tags_zh: list[str] = Field(default_factory=list)


class InspirationListItem(InspirationBase):
    pass


class InspirationDetail(InspirationBase):
    notes: str | None = None
    source_url: str | None = None
    analysis_summary: str | None = None
    analysis_tags: list[str] = Field(default_factory=list)
    analysis_prompt_en: str | None = None
    analysis_prompt_zh: str | None = None
    analysis_colors: list[str] = Field(default_factory=list)
    storage_key: str
    analyzed_at: str | None = None
    archived_at: str | None = None


class InspirationMetadataPatch(BaseModel):
    title: str | None = None
    notes: str | None = None
    source_url: str | None = None
    board_id: str | None = None


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
