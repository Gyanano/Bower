from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import FileResponse

from app.schemas.inspiration import (
    ErrorEnvelope,
    InspirationDetailEnvelope,
    InspirationListEnvelope,
)
from app.services.inspirations import (
    create_inspiration,
    get_inspiration_by_id,
    get_inspiration_file_response,
    list_inspirations,
)

router = APIRouter(prefix="/inspirations", tags=["inspirations"])


@router.post(
    "",
    response_model=InspirationDetailEnvelope,
    status_code=201,
    responses={400: {"model": ErrorEnvelope}, 404: {"model": ErrorEnvelope}, 413: {"model": ErrorEnvelope}, 500: {"model": ErrorEnvelope}},
)
async def upload_inspiration(
    file: UploadFile | None = File(default=None),
    source_url: str | None = Form(default=None),
    title: str | None = Form(default=None),
    notes: str | None = Form(default=None),
):
    return await create_inspiration(file=file, source_url=source_url, title=title, notes=notes)


@router.get("", response_model=InspirationListEnvelope)
def fetch_inspirations(limit: int = 20, offset: int = 0):
    return list_inspirations(limit=limit, offset=offset)


@router.get("/{inspiration_id}", response_model=InspirationDetailEnvelope, responses={404: {"model": ErrorEnvelope}})
def fetch_inspiration(inspiration_id: str):
    return get_inspiration_by_id(inspiration_id)


@router.get("/{inspiration_id}/file", responses={404: {"model": ErrorEnvelope}, 500: {"model": ErrorEnvelope}})
def fetch_inspiration_file(inspiration_id: str) -> FileResponse:
    return get_inspiration_file_response(inspiration_id)
