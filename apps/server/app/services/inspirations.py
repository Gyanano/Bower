import hashlib
import mimetypes
import os
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile
from fastapi.responses import FileResponse

from app.db.sqlite import get_connection
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
from app.storage.local_files import MAX_FILE_SIZE_BYTES, STORE_DIR, persist_upload

ALLOWED_MIME_TYPES = {"image/png", "image/jpeg", "image/webp"}


def _detect_mime_type(payload: bytes) -> str | None:
    if payload.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"

    if payload.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"

    if payload.startswith(b"RIFF") and payload[8:12] == b"WEBP":
        return "image/webp"

    return None


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _build_id() -> str:
    return f"ins_{uuid4().hex}"


def _normalize_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _error(status_code: int, code: str, message: str) -> AppError:
    return AppError(status_code=status_code, code=code, message=message)


def _row_to_record(row) -> InspirationRecord:
    return InspirationRecord(
        id=row["id"],
        title=row["title"],
        notes=row["notes"],
        source_url=row["source_url"],
        status=row["status"],
        original_filename=row["original_filename"],
        mime_type=row["mime_type"],
        file_size_bytes=row["file_size_bytes"],
        storage_key=row["storage_key"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        archived_at=row["archived_at"],
    )


def _detail_payload(record: InspirationRecord) -> dict:
    return {
        "id": record.id,
        "title": record.title,
        "notes": record.notes,
        "source_url": record.source_url,
        "status": record.status,
        "original_filename": record.original_filename,
        "mime_type": record.mime_type,
        "file_size_bytes": record.file_size_bytes,
        "storage_key": record.storage_key,
        "created_at": record.created_at,
        "updated_at": record.updated_at,
        "archived_at": record.archived_at,
        "file_url": f"/api/v1/inspirations/{record.id}/file",
    }


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

    detected_mime_type = _detect_mime_type(payload)
    if detected_mime_type not in ALLOWED_MIME_TYPES:
        raise _error(400, "INVALID_FILE_TYPE", "Only PNG, JPEG, and WEBP files are supported")

    if len(payload) > MAX_FILE_SIZE_BYTES:
        raise _error(413, "FILE_TOO_LARGE", f"File exceeds {MAX_FILE_SIZE_BYTES} bytes")

    created_at = _utc_now()
    updated_at = created_at
    content_hash = hashlib.sha256(payload).hexdigest()
    storage_key = f"store/{content_hash[:2]}/{content_hash[2:4]}/{content_hash}-{uuid4().hex[:8]}"

    try:
        persisted = persist_upload(payload=payload, storage_key=storage_key)
    except OSError as exc:
        raise _error(500, "SAVE_FAILED", f"Failed to store file locally: {exc}") from exc

    record = InspirationRecord(
        id=_build_id(),
        title=_normalize_optional_text(title),
        notes=_normalize_optional_text(notes),
        source_url=_normalize_optional_text(source_url),
        original_filename=Path(file.filename or "upload").name,
        mime_type=detected_mime_type,
        file_size_bytes=len(payload),
        storage_key=persisted,
        created_at=created_at,
        updated_at=updated_at,
        status="active",
        archived_at=None,
    )

    try:
        with get_connection() as connection:
            connection.execute(
                """
                INSERT INTO inspirations (
                    id,
                    title,
                    notes,
                    source_url,
                    original_filename,
                    mime_type,
                    file_size_bytes,
                    storage_key,
                    created_at,
                    updated_at,
                    status,
                    archived_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record.id,
                    record.title,
                    record.notes,
                    record.source_url,
                    record.original_filename,
                    record.mime_type,
                    record.file_size_bytes,
                    record.storage_key,
                    record.created_at,
                    record.updated_at,
                    record.status,
                    record.archived_at,
                ),
            )
            connection.commit()
    except Exception as exc:
        stored_path = STORE_DIR / Path(record.storage_key).relative_to("store")
        if stored_path.exists():
            os.remove(stored_path)
        raise _error(500, "SAVE_FAILED", f"Failed to write metadata: {exc}") from exc

    return InspirationDetailEnvelope(data=InspirationDetail.model_validate(_detail_payload(record)))


def list_inspirations(limit: int, offset: int, status: str) -> InspirationListEnvelope:
    safe_limit = max(1, min(limit, 100))
    safe_offset = max(offset, 0)
    if status not in {"active", "archived"}:
        raise _error(422, "INVALID_STATUS", "Status must be active or archived")

    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, title, status, original_filename, mime_type, file_size_bytes, created_at, updated_at
            FROM inspirations
            WHERE status = ?
            ORDER BY datetime(created_at) DESC, id DESC
            LIMIT ? OFFSET ?
            """,
            (status, safe_limit, safe_offset),
        ).fetchall()
        total = connection.execute("SELECT COUNT(*) FROM inspirations WHERE status = ?", (status,)).fetchone()[0]

    data = [InspirationListItem.model_validate(dict(row)) for row in rows]
    return InspirationListEnvelope(data=data, meta=PaginationMeta(limit=safe_limit, offset=safe_offset, total=total))


def _fetch_record(inspiration_id: str) -> InspirationRecord:
    with get_connection() as connection:
        row = connection.execute("SELECT * FROM inspirations WHERE id = ?", (inspiration_id,)).fetchone()

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
        updates[field_name] = _normalize_optional_text(getattr(patch, field_name))

    updates["updated_at"] = _utc_now()

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

    archived_at = _utc_now()

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
