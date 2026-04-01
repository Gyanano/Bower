from app.db.sqlite import get_connection
from app.schemas.board import Board, BoardListEnvelope


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
