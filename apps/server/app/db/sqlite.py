import sqlite3
from pathlib import Path

from app.utils import utc_now

BASE_DIR = Path(__file__).resolve().parents[4]
DATA_DIR = BASE_DIR / "data"
DATABASE_PATH = DATA_DIR / "meta.db"

DEFAULT_BOARDS = (
    ("board_app_ui", "App UI 参考", "app-ui-reference"),
    ("board_landing", "落地页排版", "landing-page-layout"),
)
DEFAULT_UI_LANGUAGE = "zh-CN"


def get_connection() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.execute("PRAGMA foreign_keys = ON")
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS boards (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                slug TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS app_preferences (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                ui_language TEXT NOT NULL,
                jwt_secret TEXT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS local_user (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                display_name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS inspirations (
                id TEXT PRIMARY KEY,
                board_id TEXT NULL,
                title TEXT NULL,
                notes TEXT NULL,
                source_url TEXT NULL,
                analysis_summary TEXT NULL,
                analysis_tags_json TEXT NULL,
                analysis_prompt_en TEXT NULL,
                analysis_prompt_zh TEXT NULL,
                analysis_tags_en_json TEXT NULL,
                analysis_tags_zh_json TEXT NULL,
                analysis_colors_json TEXT NULL,
                analysis_status TEXT NOT NULL DEFAULT 'idle',
                analysis_error TEXT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                original_filename TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                file_size_bytes INTEGER NOT NULL,
                storage_key TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT '',
                analyzed_at TEXT NULL,
                archived_at TEXT NULL,
                FOREIGN KEY (board_id) REFERENCES boards(id)
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS ai_provider_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                provider TEXT NOT NULL,
                model_id TEXT NULL,
                api_key TEXT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS local_user (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                display_name TEXT NOT NULL,
                email TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )

        pref_columns = {row["name"] for row in connection.execute("PRAGMA table_info(app_preferences)").fetchall()}
        if "jwt_secret" not in pref_columns:
            connection.execute("ALTER TABLE app_preferences ADD COLUMN jwt_secret TEXT NULL")

        preference_columns = {row["name"] for row in connection.execute("PRAGMA table_info(app_preferences)").fetchall()}
        if "jwt_secret" not in preference_columns:
            connection.execute("ALTER TABLE app_preferences ADD COLUMN jwt_secret TEXT NULL")

        columns = {row["name"] for row in connection.execute("PRAGMA table_info(inspirations)").fetchall()}
        board_id_added = "board_id" not in columns
        if board_id_added:
            connection.execute("ALTER TABLE inspirations ADD COLUMN board_id TEXT NULL")
        if "status" not in columns:
            connection.execute("ALTER TABLE inspirations ADD COLUMN status TEXT NOT NULL DEFAULT 'active'")
        if "updated_at" not in columns:
            connection.execute("ALTER TABLE inspirations ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''")
            connection.execute("UPDATE inspirations SET updated_at = created_at WHERE updated_at = ''")
        if "analysis_summary" not in columns:
            connection.execute("ALTER TABLE inspirations ADD COLUMN analysis_summary TEXT NULL")
        if "analysis_tags_json" not in columns:
            connection.execute("ALTER TABLE inspirations ADD COLUMN analysis_tags_json TEXT NULL")
        if "analysis_prompt_en" not in columns:
            connection.execute("ALTER TABLE inspirations ADD COLUMN analysis_prompt_en TEXT NULL")
        if "analysis_prompt_zh" not in columns:
            connection.execute("ALTER TABLE inspirations ADD COLUMN analysis_prompt_zh TEXT NULL")
        if "analysis_tags_en_json" not in columns:
            connection.execute("ALTER TABLE inspirations ADD COLUMN analysis_tags_en_json TEXT NULL")
        if "analysis_tags_zh_json" not in columns:
            connection.execute("ALTER TABLE inspirations ADD COLUMN analysis_tags_zh_json TEXT NULL")
        if "analysis_colors_json" not in columns:
            connection.execute("ALTER TABLE inspirations ADD COLUMN analysis_colors_json TEXT NULL")
        if "analysis_status" not in columns:
            connection.execute("ALTER TABLE inspirations ADD COLUMN analysis_status TEXT NOT NULL DEFAULT 'idle'")
        if "analysis_error" not in columns:
            connection.execute("ALTER TABLE inspirations ADD COLUMN analysis_error TEXT NULL")
        if "analyzed_at" not in columns:
            connection.execute("ALTER TABLE inspirations ADD COLUMN analyzed_at TEXT NULL")
        if "archived_at" not in columns:
            connection.execute("ALTER TABLE inspirations ADD COLUMN archived_at TEXT NULL")

        seeded_at = utc_now()
        for board_id, board_name, board_slug in DEFAULT_BOARDS:
            connection.execute(
                """
                INSERT INTO boards (id, name, slug, created_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    slug = excluded.slug
                """,
                (board_id, board_name, board_slug, seeded_at),
            )

        connection.execute(
            """
            INSERT INTO app_preferences (id, ui_language, updated_at)
            VALUES (1, ?, ?)
            ON CONFLICT(id) DO NOTHING
            """,
            (DEFAULT_UI_LANGUAGE, seeded_at),
        )

        default_board_id = DEFAULT_BOARDS[0][0]
        if board_id_added:
            connection.execute(
                "UPDATE inspirations SET board_id = ? WHERE board_id IS NULL OR board_id = ''",
                (default_board_id,),
            )

        connection.execute("UPDATE inspirations SET status = 'active' WHERE status IS NULL OR status = ''")
        connection.execute("UPDATE inspirations SET updated_at = created_at WHERE updated_at = ''")
        connection.execute(
            """
            UPDATE inspirations
            SET analysis_tags_en_json = analysis_tags_json
            WHERE
                (analysis_tags_en_json IS NULL OR analysis_tags_en_json = '')
                AND analysis_tags_json IS NOT NULL
                AND analysis_tags_json != ''
            """
        )
        connection.execute(
            """
            UPDATE inspirations
            SET analysis_tags_zh_json = analysis_tags_json
            WHERE
                (analysis_tags_zh_json IS NULL OR analysis_tags_zh_json = '')
                AND analysis_tags_json IS NOT NULL
                AND analysis_tags_json != ''
            """
        )
        connection.execute(
            """
            UPDATE inspirations
            SET analysis_status = 'failed'
            WHERE
                coalesce(analysis_error, '') != ''
                AND (analysis_status IS NULL OR analysis_status = '' OR analysis_status = 'idle')
            """
        )
        connection.execute(
            """
            UPDATE inspirations
            SET analysis_status = 'completed'
            WHERE
                (
                    coalesce(analysis_summary, '') != ''
                    OR coalesce(analysis_tags_json, '') != ''
                    OR coalesce(analysis_tags_en_json, '') != ''
                    OR coalesce(analysis_tags_zh_json, '') != ''
                    OR coalesce(analysis_prompt_en, '') != ''
                    OR coalesce(analysis_prompt_zh, '') != ''
                    OR coalesce(analysis_colors_json, '') != ''
                    OR coalesce(analyzed_at, '') != ''
                )
                AND (analysis_status IS NULL OR analysis_status = '' OR analysis_status = 'idle')
            """
        )
        connection.execute(
            """
            UPDATE inspirations
            SET analysis_status = 'idle'
            WHERE analysis_status IS NULL OR analysis_status = ''
            """
        )
        connection.commit()
