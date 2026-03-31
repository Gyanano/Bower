from fastapi import APIRouter

from app.schemas.board import BoardListEnvelope
from app.services.boards import list_boards

router = APIRouter(prefix="/boards", tags=["boards"])


@router.get("", response_model=BoardListEnvelope)
def fetch_boards():
    return list_boards()
