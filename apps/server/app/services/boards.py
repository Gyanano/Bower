import re
import unicodedata
from uuid import uuid4

from app.db.sqlite import get_connection
from app.errors import AppError
from app.schemas.board import Board, BoardCreateRequest, BoardEnvelope, BoardListEnvelope
from app.utils import utc_now


def _build_board_id() -> str:
    return f"board_{uuid4().hex[:12]}"


def _slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii").lower()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-")
    return slug or "board"


def list_boards() -> BoardListEnvelope:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, name, slug
            FROM boards
            ORDER BY created_at ASC, id ASC
            """
        ).fetchall()

    return BoardListEnvelope(data=[Board.model_validate(dict(row)) for row in rows])


def create_board(payload: BoardCreateRequest) -> BoardEnvelope:
    base_slug = _slugify(payload.name)

    with get_connection() as connection:
        existing_name = connection.execute(
            "SELECT id FROM boards WHERE lower(name) = lower(?) LIMIT 1",
            (payload.name,),
        ).fetchone()
        if existing_name is not None:
            raise AppError(409, "BOARD_ALREADY_EXISTS", "A board with this name already exists")

        existing_slugs = {
            row["slug"]
            for row in connection.execute(
                "SELECT slug FROM boards WHERE slug = ? OR slug GLOB ?",
                (base_slug, f"{base_slug}-*"),
            ).fetchall()
        }

        slug = base_slug
        suffix = 2
        while slug in existing_slugs:
            slug = f"{base_slug}-{suffix}"
            suffix += 1

        board = Board(
            id=_build_board_id(),
            name=payload.name,
            slug=slug,
        )
        connection.execute(
            """
            INSERT INTO boards (id, name, slug, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (board.id, board.name, board.slug, utc_now()),
        )
        connection.commit()

    return BoardEnvelope(data=board)
