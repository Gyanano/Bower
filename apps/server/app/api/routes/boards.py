from fastapi import APIRouter, status

from app.schemas.board import BoardCreateRequest, BoardEnvelope, BoardListEnvelope
from app.schemas.inspiration import ErrorEnvelope
from app.services.boards import create_board, list_boards

router = APIRouter(prefix="/boards", tags=["boards"])


@router.get("", response_model=BoardListEnvelope)
def fetch_boards():
    return list_boards()


@router.post("", response_model=BoardEnvelope, status_code=status.HTTP_201_CREATED, responses={409: {"model": ErrorEnvelope}, 422: {"model": ErrorEnvelope}})
def save_board(payload: BoardCreateRequest):
    return create_board(payload)
