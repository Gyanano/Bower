import hashlib
import json
import mimetypes
import os
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit
from uuid import uuid4

from fastapi import UploadFile
from fastapi.responses import FileResponse

from app.db.sqlite import DEFAULT_BOARDS, get_connection
from app.errors import AppError
from app.models.inspiration import InspirationRecord
from app.schemas.inspiration import (
    InspirationDetail,
    InspirationDetailEnvelope,
    InspirationListEnvelope,
    InspirationListItem,
    InspirationMetadataPatch,
    PaginationMeta,
)
from app.services.image_analysis import SUPPORTED_IMAGE_MIME_TYPES, analyze_image, detect_supported_image_mime_type
from app.storage.local_files import MAX_FILE_SIZE_BYTES, STORE_DIR, persist_upload
from app.utils import utc_now

ALLOWED_MIME_TYPES = SUPPORTED_IMAGE_MIME_TYPES


def _build_id() -> str:
    return f"ins_{uuid4().hex}"


def _normalize_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _normalize_source_url(value: str | None) -> str | None:
    normalized = _normalize_optional_text(value)
    if normalized is None:
        return None

    if any(character.isspace() for character in normalized):
        raise _error(422, "INVALID_SOURCE_URL", "Source URL must be a valid http or https URL")

    try:
        parsed = urlsplit(normalized)
    except ValueError as exc:
        raise _error(422, "INVALID_SOURCE_URL", "Source URL must be a valid http or https URL") from exc

    if parsed.scheme not in {"http", "https"} or not parsed.netloc or not parsed.hostname:
        raise _error(422, "INVALID_SOURCE_URL", "Source URL must be a valid http or https URL")

    try:
        _ = parsed.port
    except ValueError as exc:
        raise _error(422, "INVALID_SOURCE_URL", "Source URL must be a valid http or https URL") from exc

    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, parsed.query, parsed.fragment))


def _error(status_code: int, code: str, message: str) -> AppError:
    return AppError(status_code=status_code, code=code, message=message)


def _parse_json_list(raw_items: str | None) -> list[str]:
    if not raw_items:
        return []

    try:
        parsed = json.loads(raw_items)
    except json.JSONDecodeError:
        return []

    if not isinstance(parsed, list):
        return []

    return [str(item).strip() for item in parsed if str(item).strip()]


def _default_board_id() -> str:
    return DEFAULT_BOARDS[0][0]


def _validate_board_id(board_id: str | None) -> str:
    candidate = _normalize_optional_text(board_id) or _default_board_id()
    with get_connection() as connection:
        row = connection.execute("SELECT id FROM boards WHERE id = ?", (candidate,)).fetchone()
    if row is None:
        raise _error(422, "BOARD_NOT_FOUND", "Selected board does not exist")
    return candidate


def _normalize_string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []

    normalized: list[str] = []
    for item in value:
        text = _normalize_optional_text(str(item))
        if text:
            normalized.append(text)
    return normalized


def _row_to_record(row) -> InspirationRecord:
    return InspirationRecord(
        id=row["id"],
        board_id=row["board_id"],
        board_name=row["board_name"] if "board_name" in row.keys() else None,
        title=row["title"],
        notes=row["notes"],
        source_url=row["source_url"],
        analysis_summary=row["analysis_summary"],
        analysis_tags_json=row["analysis_tags_json"],
        analysis_prompt_en=row["analysis_prompt_en"],
        analysis_prompt_zh=row["analysis_prompt_zh"],
        analysis_tags_en_json=row["analysis_tags_en_json"],
        analysis_tags_zh_json=row["analysis_tags_zh_json"],
        analysis_colors_json=row["analysis_colors_json"],
        analysis_status=row["analysis_status"],
        analysis_error=row["analysis_error"],
        status=row["status"],
        original_filename=row["original_filename"],
        mime_type=row["mime_type"],
        file_size_bytes=row["file_size_bytes"],
        storage_key=row["storage_key"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        analyzed_at=row["analyzed_at"],
        archived_at=row["archived_at"],
    )


def _analysis_tags_payload(
    *,
    analysis_tags_json: str | None,
    analysis_tags_en_json: str | None,
    analysis_tags_zh_json: str | None,
) -> tuple[list[str], list[str]]:
    legacy_tags = _parse_json_list(analysis_tags_json)
    analysis_tags_en = _parse_json_list(analysis_tags_en_json) or legacy_tags
    analysis_tags_zh = _parse_json_list(analysis_tags_zh_json) or legacy_tags
    return analysis_tags_en, analysis_tags_zh


def _detail_payload(record: InspirationRecord) -> dict[str, object]:
    analysis_tags_en, analysis_tags_zh = _analysis_tags_payload(
        analysis_tags_json=record.analysis_tags_json,
        analysis_tags_en_json=record.analysis_tags_en_json,
        analysis_tags_zh_json=record.analysis_tags_zh_json,
    )
    return {
        "id": record.id,
        "board_id": record.board_id,
        "board_name": record.board_name,
        "title": record.title,
        "notes": record.notes,
        "source_url": record.source_url,
        "analysis_summary": record.analysis_summary,
        "analysis_tags": analysis_tags_en,
        "analysis_prompt_en": record.analysis_prompt_en,
        "analysis_prompt_zh": record.analysis_prompt_zh,
        "analysis_tags_en": analysis_tags_en,
        "analysis_tags_zh": analysis_tags_zh,
        "analysis_colors": _parse_json_list(record.analysis_colors_json),
        "analysis_status": record.analysis_status,
        "analysis_error": record.analysis_error,
        "status": record.status,
        "original_filename": record.original_filename,
        "mime_type": record.mime_type,
        "file_size_bytes": record.file_size_bytes,
        "storage_key": record.storage_key,
        "created_at": record.created_at,
        "updated_at": record.updated_at,
        "analyzed_at": record.analyzed_at,
        "archived_at": record.archived_at,
        "file_url": f"/api/v1/inspirations/{record.id}/file",
    }


def _fetch_record_query() -> str:
    return """
        SELECT inspirations.*, boards.name AS board_name
        FROM inspirations
        LEFT JOIN boards ON boards.id = inspirations.board_id
    """


def _find_record_by_source_url(source_url: str) -> InspirationRecord | None:
    with get_connection() as connection:
        row = connection.execute(
            (
                f"{_fetch_record_query()} "
                "WHERE inspirations.source_url = ? AND inspirations.status = 'active' "
                "ORDER BY datetime(inspirations.created_at) DESC, inspirations.id DESC LIMIT 1"
            ),
            (source_url,),
        ).fetchone()

    if row is None:
        return None

    return _row_to_record(row)


async def create_inspiration(
    file: UploadFile | None,
    source_url: str | None,
    title: str | None,
    notes: str | None,
) -> InspirationDetailEnvelope:
    if file is None:
        raise _error(400, "MISSING_FILE", "Image file is required")

    payload = await file.read()
    if not payload:
        raise _error(400, "MISSING_FILE", "Image file is required")

    detected_mime_type = detect_supported_image_mime_type(payload)
    if detected_mime_type not in ALLOWED_MIME_TYPES:
        raise _error(400, "INVALID_FILE_TYPE", "Only PNG, JPEG, and WEBP files are supported")

    if len(payload) > MAX_FILE_SIZE_BYTES:
        raise _error(413, "FILE_TOO_LARGE", f"File exceeds {MAX_FILE_SIZE_BYTES} bytes")

    normalized_source_url = _normalize_source_url(source_url)
    created_at = utc_now()
    updated_at = created_at
    content_hash = hashlib.sha256(payload).hexdigest()
    storage_key = f"store/{content_hash[:2]}/{content_hash[2:4]}/{content_hash}-{uuid4().hex[:8]}"

    try:
        persisted = persist_upload(payload=payload, storage_key=storage_key)
    except OSError as exc:
        raise _error(500, "SAVE_FAILED", f"Failed to store file locally: {exc}") from exc

    record = InspirationRecord(
        id=_build_id(),
        board_id=_default_board_id(),
        board_name=None,
        title=_normalize_optional_text(title),
        notes=_normalize_optional_text(notes),
        source_url=normalized_source_url,
        analysis_summary=None,
        analysis_tags_json=None,
        analysis_prompt_en=None,
        analysis_prompt_zh=None,
        analysis_tags_en_json=None,
        analysis_tags_zh_json=None,
        analysis_colors_json=None,
        analysis_status="idle",
        analysis_error=None,
        status="active",
        original_filename=Path(file.filename or "upload").name,
        mime_type=detected_mime_type,
        file_size_bytes=len(payload),
        storage_key=persisted,
        created_at=created_at,
        updated_at=updated_at,
        analyzed_at=None,
        archived_at=None,
    )

    try:
        with get_connection() as connection:
            connection.execute(
                """
                INSERT INTO inspirations (
                    id,
                    board_id,
                    title,
                    notes,
                    source_url,
                    analysis_summary,
                    analysis_tags_json,
                    analysis_prompt_en,
                    analysis_prompt_zh,
                    analysis_tags_en_json,
                    analysis_tags_zh_json,
                    analysis_colors_json,
                    analysis_status,
                    analysis_error,
                    original_filename,
                    mime_type,
                    file_size_bytes,
                    storage_key,
                    created_at,
                    updated_at,
                    status,
                    analyzed_at,
                    archived_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record.id,
                    record.board_id,
                    record.title,
                    record.notes,
                    record.source_url,
                    record.analysis_summary,
                    record.analysis_tags_json,
                    record.analysis_prompt_en,
                    record.analysis_prompt_zh,
                    record.analysis_tags_en_json,
                    record.analysis_tags_zh_json,
                    record.analysis_colors_json,
                    record.analysis_status,
                    record.analysis_error,
                    record.original_filename,
                    record.mime_type,
                    record.file_size_bytes,
                    record.storage_key,
                    record.created_at,
                    record.updated_at,
                    record.status,
                    record.analyzed_at,
                    record.archived_at,
                ),
            )
            connection.commit()
    except Exception as exc:
        stored_path = STORE_DIR / Path(record.storage_key).relative_to("store")
        if stored_path.exists():
            try:
                os.remove(stored_path)
            except OSError:
                pass
        raise _error(500, "SAVE_FAILED", f"Failed to write metadata: {exc}") from exc

    return get_inspiration_by_id(record.id)


async def create_browser_extension_clip(
    file: UploadFile | None,
    source_url: str | None,
    title: str | None,
    notes: str | None,
    analysis: dict[str, object],
) -> InspirationDetailEnvelope:
    if file is None:
        raise _error(400, "MISSING_FILE", "Image file is required")

    normalized_source_url = _normalize_source_url(source_url)
    if normalized_source_url:
        existing_record = _find_record_by_source_url(normalized_source_url)
        if existing_record is not None:
            return get_inspiration_by_id(existing_record.id)

    payload = await file.read()
    if not payload:
        raise _error(400, "MISSING_FILE", "Image file is required")

    detected_mime_type = detect_supported_image_mime_type(payload)
    if detected_mime_type not in ALLOWED_MIME_TYPES:
        raise _error(400, "INVALID_FILE_TYPE", "Only PNG, JPEG, and WEBP files are supported")

    if len(payload) > MAX_FILE_SIZE_BYTES:
        raise _error(413, "FILE_TOO_LARGE", f"File exceeds {MAX_FILE_SIZE_BYTES} bytes")

    tags_en = _normalize_string_list(analysis.get("tags_en"))
    tags_zh = _normalize_string_list(analysis.get("tags_zh"))
    colors = _normalize_string_list(analysis.get("colors"))
    summary = _normalize_optional_text(
        str(analysis.get("summary") or analysis.get("summary_en") or analysis.get("summary_zh") or "")
    )
    created_at = utc_now()
    updated_at = created_at
    content_hash = hashlib.sha256(payload).hexdigest()
    storage_key = f"store/{content_hash[:2]}/{content_hash[2:4]}/{content_hash}-{uuid4().hex[:8]}"

    try:
        persisted = persist_upload(payload=payload, storage_key=storage_key)
    except OSError as exc:
        raise _error(500, "SAVE_FAILED", f"Failed to store file locally: {exc}") from exc

    record = InspirationRecord(
        id=_build_id(),
        board_id=_default_board_id(),
        board_name=None,
        title=_normalize_optional_text(title) or summary,
        notes=_normalize_optional_text(notes),
        source_url=normalized_source_url,
        analysis_summary=summary,
        analysis_tags_json=json.dumps(tags_en),
        analysis_prompt_en=_normalize_optional_text(str(analysis.get("prompt_en") or "")),
        analysis_prompt_zh=_normalize_optional_text(str(analysis.get("prompt_zh") or "")),
        analysis_tags_en_json=json.dumps(tags_en),
        analysis_tags_zh_json=json.dumps(tags_zh),
        analysis_colors_json=json.dumps(colors),
        analysis_status="completed",
        analysis_error=None,
        status="active",
        original_filename=Path(file.filename or "upload").name,
        mime_type=detected_mime_type,
        file_size_bytes=len(payload),
        storage_key=persisted,
        created_at=created_at,
        updated_at=updated_at,
        analyzed_at=created_at,
        archived_at=None,
    )

    try:
        with get_connection() as connection:
            connection.execute(
                """
                INSERT INTO inspirations (
                    id,
                    board_id,
                    title,
                    notes,
                    source_url,
                    analysis_summary,
                    analysis_tags_json,
                    analysis_prompt_en,
                    analysis_prompt_zh,
                    analysis_tags_en_json,
                    analysis_tags_zh_json,
                    analysis_colors_json,
                    analysis_status,
                    analysis_error,
                    original_filename,
                    mime_type,
                    file_size_bytes,
                    storage_key,
                    created_at,
                    updated_at,
                    status,
                    analyzed_at,
                    archived_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record.id,
                    record.board_id,
                    record.title,
                    record.notes,
                    record.source_url,
                    record.analysis_summary,
                    record.analysis_tags_json,
                    record.analysis_prompt_en,
                    record.analysis_prompt_zh,
                    record.analysis_tags_en_json,
                    record.analysis_tags_zh_json,
                    record.analysis_colors_json,
                    record.analysis_status,
                    record.analysis_error,
                    record.original_filename,
                    record.mime_type,
                    record.file_size_bytes,
                    record.storage_key,
                    record.created_at,
                    record.updated_at,
                    record.status,
                    record.analyzed_at,
                    record.archived_at,
                ),
            )
            connection.commit()
    except Exception as exc:
        stored_path = STORE_DIR / Path(record.storage_key).relative_to("store")
        if stored_path.exists():
            try:
                os.remove(stored_path)
            except OSError:
                pass
        raise _error(500, "SAVE_FAILED", f"Failed to write metadata: {exc}") from exc

    return get_inspiration_by_id(record.id)


def list_inspirations(limit: int, offset: int, status: str, q: str | None = None, board_id: str | None = None) -> InspirationListEnvelope:
    safe_limit = max(1, min(limit, 100))
    safe_offset = max(offset, 0)
    if status not in {"active", "archived"}:
        raise _error(422, "INVALID_STATUS", "Status must be active or archived")

    search = _normalize_optional_text(q)
    board_filter = _normalize_optional_text(board_id)
    filters = ["inspirations.status = ?"]
    values: list[object] = [status]

    if board_filter:
        filters.append("inspirations.board_id = ?")
        values.append(board_filter)

    if search:
        like_search = f"%{search.lower()}%"
        filters.append(
            """
            (
                lower(coalesce(inspirations.title, '')) LIKE ?
                OR lower(inspirations.original_filename) LIKE ?
                OR lower(coalesce(inspirations.notes, '')) LIKE ?
                OR lower(coalesce(inspirations.source_url, '')) LIKE ?
                OR lower(coalesce(inspirations.analysis_prompt_en, '')) LIKE ?
                OR lower(coalesce(inspirations.analysis_prompt_zh, '')) LIKE ?
                OR lower(coalesce(inspirations.analysis_tags_json, '')) LIKE ?
                OR lower(coalesce(inspirations.analysis_tags_en_json, '')) LIKE ?
                OR lower(coalesce(inspirations.analysis_tags_zh_json, '')) LIKE ?
            )
            """
        )
        values.extend([like_search] * 9)

    where_clause = " AND ".join(filters)

    with get_connection() as connection:
        rows = connection.execute(
            f"""
            SELECT
                inspirations.id,
                inspirations.board_id,
                boards.name AS board_name,
                inspirations.title,
                inspirations.status,
                inspirations.original_filename,
                inspirations.mime_type,
                inspirations.file_size_bytes,
                inspirations.created_at,
                inspirations.updated_at,
                inspirations.analyzed_at,
                inspirations.analysis_status,
                inspirations.analysis_error,
                inspirations.analysis_tags_json,
                inspirations.analysis_tags_en_json,
                inspirations.analysis_tags_zh_json
            FROM inspirations
            LEFT JOIN boards ON boards.id = inspirations.board_id
            WHERE {where_clause}
            ORDER BY datetime(inspirations.created_at) DESC, inspirations.id DESC
            LIMIT ? OFFSET ?
            """,
            (*values, safe_limit, safe_offset),
        ).fetchall()
        total = connection.execute(
            f"""
            SELECT COUNT(*)
            FROM inspirations
            LEFT JOIN boards ON boards.id = inspirations.board_id
            WHERE {where_clause}
            """,
            values,
        ).fetchone()[0]

    data: list[InspirationListItem] = []
    for row in rows:
        payload = dict(row)
        payload["file_url"] = f'/api/v1/inspirations/{payload["id"]}/file'
        analysis_tags_en, analysis_tags_zh = _analysis_tags_payload(
            analysis_tags_json=payload.pop("analysis_tags_json"),
            analysis_tags_en_json=payload.pop("analysis_tags_en_json"),
            analysis_tags_zh_json=payload.pop("analysis_tags_zh_json"),
        )
        payload["analysis_tags_en"] = analysis_tags_en
        payload["analysis_tags_zh"] = analysis_tags_zh
        data.append(InspirationListItem.model_validate(payload))

    return InspirationListEnvelope(data=data, meta=PaginationMeta(limit=safe_limit, offset=safe_offset, total=total))


def _fetch_record(inspiration_id: str) -> InspirationRecord:
    with get_connection() as connection:
        row = connection.execute(f"{_fetch_record_query()} WHERE inspirations.id = ?", (inspiration_id,)).fetchone()

    if row is None:
        raise _error(404, "INSPIRATION_NOT_FOUND", "Inspiration item not found")

    return _row_to_record(row)


def get_inspiration_by_id(inspiration_id: str) -> InspirationDetailEnvelope:
    record = _fetch_record(inspiration_id)
    return InspirationDetailEnvelope(data=InspirationDetail.model_validate(_detail_payload(record)))


def update_inspiration_metadata(inspiration_id: str, patch: InspirationMetadataPatch) -> InspirationDetailEnvelope:
    if not patch.model_fields_set:
        raise _error(422, "INVALID_REQUEST", "At least one metadata field must be provided")

    updates: dict[str, str | None] = {}
    for field_name in patch.model_fields_set:
        if field_name == "source_url":
            updates[field_name] = _normalize_source_url(getattr(patch, field_name))
        elif field_name == "board_id":
            value = getattr(patch, field_name)
            updates[field_name] = None if value is None else _validate_board_id(value)
        else:
            updates[field_name] = _normalize_optional_text(getattr(patch, field_name))

    updates["updated_at"] = utc_now()

    assignments = ", ".join(f"{field_name} = ?" for field_name in updates)
    values = [updates[field_name] for field_name in updates]

    with get_connection() as connection:
        cursor = connection.execute(
            f"UPDATE inspirations SET {assignments} WHERE id = ?",
            (*values, inspiration_id),
        )
        connection.commit()

    if cursor.rowcount == 0:
        raise _error(404, "INSPIRATION_NOT_FOUND", "Inspiration item not found")

    return get_inspiration_by_id(inspiration_id)


def archive_inspiration(inspiration_id: str) -> InspirationDetailEnvelope:
    record = _fetch_record(inspiration_id)
    if record.status == "archived":
        return InspirationDetailEnvelope(data=InspirationDetail.model_validate(_detail_payload(record)))

    archived_at = utc_now()

    with get_connection() as connection:
        connection.execute(
            """
            UPDATE inspirations
            SET status = 'archived', archived_at = ?, updated_at = ?
            WHERE id = ?
            """,
            (archived_at, archived_at, inspiration_id),
        )
        connection.commit()

    return get_inspiration_by_id(inspiration_id)


def analyze_inspiration(inspiration_id: str) -> InspirationDetailEnvelope:
    record = _fetch_record(inspiration_id)
    stored_path = STORE_DIR / Path(record.storage_key).relative_to("store")

    processing_at = utc_now()
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE inspirations
            SET analysis_status = 'processing', analysis_error = NULL, updated_at = ?
            WHERE id = ?
            """,
            (processing_at, inspiration_id),
        )
        connection.commit()

    if not stored_path.exists():
        message = "Stored file is missing from local storage"
        with get_connection() as connection:
            connection.execute(
                """
                UPDATE inspirations
                SET analysis_status = 'failed', analysis_error = ?, updated_at = ?
                WHERE id = ?
                """,
                (message, utc_now(), inspiration_id),
            )
            connection.commit()
        raise _error(500, "SAVE_FAILED", message)

    try:
        payload = stored_path.read_bytes()
    except OSError as exc:
        message = f"Failed to read stored file locally: {exc}"
        with get_connection() as connection:
            connection.execute(
                """
                UPDATE inspirations
                SET analysis_status = 'failed', analysis_error = ?, updated_at = ?
                WHERE id = ?
                """,
                (message, utc_now(), inspiration_id),
            )
            connection.commit()
        raise _error(500, "SAVE_FAILED", message) from exc

    try:
        analysis = analyze_image(payload=payload, mime_type=record.mime_type)
    except AppError as exc:
        failed_at = utc_now()
        with get_connection() as connection:
            connection.execute(
                """
                UPDATE inspirations
                SET analysis_status = 'failed', analysis_error = ?, updated_at = ?
                WHERE id = ?
                """,
                (exc.message, failed_at, inspiration_id),
            )
            connection.commit()
        raise

    analyzed_at = utc_now()

    with get_connection() as connection:
        connection.execute(
            """
            UPDATE inspirations
            SET
                analysis_summary = ?,
                analysis_tags_json = ?,
                analysis_prompt_en = ?,
                analysis_prompt_zh = ?,
                analysis_tags_en_json = ?,
                analysis_tags_zh_json = ?,
                analysis_colors_json = ?,
                analysis_status = 'completed',
                analysis_error = NULL,
                analyzed_at = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                str(analysis["summary"]),
                json.dumps(list(analysis["tags_en"])),
                str(analysis["prompt_en"]),
                str(analysis["prompt_zh"]),
                json.dumps(list(analysis["tags_en"])),
                json.dumps(list(analysis["tags_zh"])),
                json.dumps(list(analysis["colors"])),
                analyzed_at,
                analyzed_at,
                inspiration_id,
            ),
        )
        connection.commit()

    return get_inspiration_by_id(inspiration_id)


def delete_archived_inspiration(inspiration_id: str) -> None:
    record = _fetch_record(inspiration_id)
    if record.status != "archived":
        raise _error(409, "INSPIRATION_NOT_ARCHIVED", "Only archived inspirations can be deleted")

    stored_path = STORE_DIR / Path(record.storage_key).relative_to("store")

    with get_connection() as connection:
        connection.execute("DELETE FROM inspirations WHERE id = ?", (inspiration_id,))
        connection.commit()

    if stored_path.exists():
        try:
            os.remove(stored_path)
        except OSError:
            pass


def get_inspiration_file_response(inspiration_id: str) -> FileResponse:
    record = _fetch_record(inspiration_id)
    stored_path = STORE_DIR / Path(record.storage_key).relative_to("store")

    if not stored_path.exists():
        raise _error(500, "SAVE_FAILED", "Stored file is missing from local storage")

    media_type = record.mime_type or mimetypes.guess_type(record.original_filename)[0] or "application/octet-stream"
    return FileResponse(
        path=stored_path,
        filename=record.original_filename,
        media_type=media_type,
        content_disposition_type="inline",
    )
