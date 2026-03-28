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
                original_filename TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                file_size_bytes INTEGER NOT NULL,
                storage_key TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL
            )
            """
        )
        connection.commit()
