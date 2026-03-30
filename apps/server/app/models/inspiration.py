from dataclasses import dataclass


@dataclass(slots=True)
class InspirationRecord:
    id: str
    title: str | None
    notes: str | None
    source_url: str | None
    analysis_summary: str | None
    analysis_tags_json: str | None
    status: str
    original_filename: str
    mime_type: str
    file_size_bytes: int
    storage_key: str
    created_at: str
    updated_at: str
    analyzed_at: str | None
    archived_at: str | None
