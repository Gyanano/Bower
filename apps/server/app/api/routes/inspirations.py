from fastapi import APIRouter, File, Form, Response, UploadFile
from fastapi.responses import FileResponse

from app.schemas.inspiration import (
    ErrorEnvelope,
    InspirationDetailEnvelope,
    InspirationListEnvelope,
    InspirationMetadataPatch,
)
from app.services.inspirations import (
    archive_inspiration,
    create_inspiration,
    delete_archived_inspiration,
    get_inspiration_by_id,
    get_inspiration_file_response,
    list_inspirations,
    update_inspiration_metadata,
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
def fetch_inspirations(limit: int = 20, offset: int = 0, status: str = "active"):
    return list_inspirations(limit=limit, offset=offset, status=status)


@router.get("/{inspiration_id}", response_model=InspirationDetailEnvelope, responses={404: {"model": ErrorEnvelope}})
def fetch_inspiration(inspiration_id: str):
    return get_inspiration_by_id(inspiration_id)


@router.patch(
    "/{inspiration_id}",
    response_model=InspirationDetailEnvelope,
    responses={404: {"model": ErrorEnvelope}, 422: {"model": ErrorEnvelope}},
)
def patch_inspiration_metadata(inspiration_id: str, patch: InspirationMetadataPatch):
    return update_inspiration_metadata(inspiration_id, patch)


@router.post("/{inspiration_id}/archive", response_model=InspirationDetailEnvelope, responses={404: {"model": ErrorEnvelope}})
def archive_inspiration_item(inspiration_id: str):
    return archive_inspiration(inspiration_id)


@router.delete("/{inspiration_id}", status_code=204, responses={404: {"model": ErrorEnvelope}, 409: {"model": ErrorEnvelope}})
def delete_inspiration_item(inspiration_id: str):
    delete_archived_inspiration(inspiration_id)
    return Response(status_code=204)


@router.get("/{inspiration_id}/file", responses={404: {"model": ErrorEnvelope}, 500: {"model": ErrorEnvelope}})
def fetch_inspiration_file(inspiration_id: str) -> FileResponse:
    return get_inspiration_file_response(inspiration_id)
