from pydantic import BaseModel, Field

from app.schemas.inspiration import ErrorEnvelope


class BrowserImageAnalysisResult(BaseModel):
    summary: str
    summary_en: str
    summary_zh: str
    prompt_en: str
    prompt_zh: str
    tags_en: list[str] = Field(default_factory=list)
    tags_zh: list[str] = Field(default_factory=list)
    colors: list[str] = Field(default_factory=list)


class BrowserImageAnalysisEnvelope(BaseModel):
    data: BrowserImageAnalysisResult


__all__ = ["BrowserImageAnalysisEnvelope", "BrowserImageAnalysisResult", "ErrorEnvelope"]
