from pydantic import BaseModel, Field, field_validator


class Board(BaseModel):
    id: str
    name: str
    slug: str


class BoardEnvelope(BaseModel):
    data: Board


class BoardListEnvelope(BaseModel):
    data: list[Board]


class BoardCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Board name is required")
        return normalized
