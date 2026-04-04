from dataclasses import dataclass


@dataclass(slots=True)
class InspirationRecord:
    id: str
    board_id: str | None
    board_name: str | None
    title: str | None
    notes: str | None
    source_url: str | None
    analysis_summary: str | None
    analysis_tags_json: str | None
    analysis_prompt_en: str | None
    analysis_prompt_zh: str | None
    analysis_tags_en_json: str | None
    analysis_tags_zh_json: str | None
    analysis_colors_json: str | None
    analysis_status: str
    analysis_error: str | None
    status: str
    original_filename: str
    mime_type: str
    file_size_bytes: int
    storage_key: str
    created_at: str
    updated_at: str
    analyzed_at: str | None
    archived_at: str | None
