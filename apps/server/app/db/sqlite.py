import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[4]
DATA_DIR = BASE_DIR / "data"
DATABASE_PATH = DATA_DIR / "meta.db"


def get_connection() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS inspirations (
                id TEXT PRIMARY KEY,
                title TEXT NULL,
                notes TEXT NULL,
                source_url TEXT NULL,
                analysis_summary TEXT NULL,
                analysis_tags_json TEXT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                original_filename TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                file_size_bytes INTEGER NOT NULL,
                storage_key TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT '',
                analyzed_at TEXT NULL,
                archived_at TEXT NULL
            )
            """
        )

        columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(inspirations)").fetchall()
        }
        if "status" not in columns:
            connection.execute("ALTER TABLE inspirations ADD COLUMN status TEXT NOT NULL DEFAULT 'active'")
        if "updated_at" not in columns:
            connection.execute("ALTER TABLE inspirations ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''")
            connection.execute("UPDATE inspirations SET updated_at = created_at WHERE updated_at = ''")
        if "analysis_summary" not in columns:
            connection.execute("ALTER TABLE inspirations ADD COLUMN analysis_summary TEXT NULL")
        if "analysis_tags_json" not in columns:
            connection.execute("ALTER TABLE inspirations ADD COLUMN analysis_tags_json TEXT NULL")
        if "analyzed_at" not in columns:
            connection.execute("ALTER TABLE inspirations ADD COLUMN analyzed_at TEXT NULL")
        if "archived_at" not in columns:
            connection.execute("ALTER TABLE inspirations ADD COLUMN archived_at TEXT NULL")

        connection.execute("UPDATE inspirations SET status = 'active' WHERE status IS NULL OR status = ''")
        connection.execute("UPDATE inspirations SET updated_at = created_at WHERE updated_at = ''")
        connection.commit()
