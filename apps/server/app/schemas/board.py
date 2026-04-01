from pydantic import BaseModel


class Board(BaseModel):
    id: str
    name: str
    slug: str


class BoardListEnvelope(BaseModel):
    data: list[Board]
