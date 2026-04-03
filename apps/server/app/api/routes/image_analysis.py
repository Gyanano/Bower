import json

from fastapi import APIRouter, File, Form, UploadFile

from app.errors import AppError
from app.schemas.image_analysis import BrowserImageAnalysisEnvelope
from app.schemas.inspiration import ErrorEnvelope, InspirationDetailEnvelope
from app.services.image_analysis import analyze_image, detect_supported_image_mime_type
from app.services.inspirations import create_browser_extension_clip
from app.storage.local_files import MAX_FILE_SIZE_BYTES

router = APIRouter(prefix="/image-analysis", tags=["image-analysis"])


def _error(status_code: int, code: str, message: str) -> AppError:
    return AppError(status_code=status_code, code=code, message=message)


def _parse_json_list_field(field_name: str, raw_value: str) -> list[str]:
    try:
        parsed = json.loads(raw_value)
    except json.JSONDecodeError as exc:
        raise _error(422, "INVALID_ANALYSIS_PAYLOAD", f"{field_name} must be a JSON array of strings") from exc

    if not isinstance(parsed, list):
        raise _error(422, "INVALID_ANALYSIS_PAYLOAD", f"{field_name} must be a JSON array of strings")

    return [str(item).strip() for item in parsed if str(item).strip()]


@router.post(
    "/analyze",
    response_model=BrowserImageAnalysisEnvelope,
    responses={400: {"model": ErrorEnvelope}, 413: {"model": ErrorEnvelope}, 502: {"model": ErrorEnvelope}, 503: {"model": ErrorEnvelope}},
)
async def analyze_browser_image(file: UploadFile = File(...)):
    payload = await file.read()
    if not payload:
        raise _error(400, "MISSING_FILE", "Image file is required")

    if len(payload) > MAX_FILE_SIZE_BYTES:
        raise _error(413, "FILE_TOO_LARGE", f"File exceeds {MAX_FILE_SIZE_BYTES} bytes")

    mime_type = detect_supported_image_mime_type(payload)
    if mime_type is None:
        raise _error(400, "INVALID_FILE_TYPE", "Only PNG, JPEG, and WEBP files are supported")

    return BrowserImageAnalysisEnvelope(data=analyze_image(payload=payload, mime_type=mime_type))


@router.post(
    "/clip",
    response_model=InspirationDetailEnvelope,
    status_code=201,
    responses={
        400: {"model": ErrorEnvelope},
        413: {"model": ErrorEnvelope},
        422: {"model": ErrorEnvelope},
        500: {"model": ErrorEnvelope},
    },
)
async def clip_browser_image(
    file: UploadFile = File(...),
    source_url: str | None = Form(default=None),
    title: str | None = Form(default=None),
    notes: str | None = Form(default=None),
    summary: str = Form(...),
    summary_en: str = Form(...),
    summary_zh: str = Form(...),
    prompt_en: str = Form(...),
    prompt_zh: str = Form(...),
    tags_en: str = Form(default="[]"),
    tags_zh: str = Form(default="[]"),
    colors: str = Form(default="[]"),
):
    analysis = {
        "summary": summary,
        "summary_en": summary_en,
        "summary_zh": summary_zh,
        "prompt_en": prompt_en,
        "prompt_zh": prompt_zh,
        "tags_en": _parse_json_list_field("tags_en", tags_en),
        "tags_zh": _parse_json_list_field("tags_zh", tags_zh),
        "colors": _parse_json_list_field("colors", colors),
    }

    return await create_browser_extension_clip(
        file=file,
        source_url=source_url,
        title=title,
        notes=notes,
        analysis=analysis,
    )
