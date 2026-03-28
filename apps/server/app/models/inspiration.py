from dataclasses import dataclass


@dataclass(slots=True)
class InspirationRecord:
    id: str
    title: str | None
    notes: str | None
    source_url: str | None
    original_filename: str
    mime_type: str
    file_size_bytes: int
    storage_key: str
    created_at: str
