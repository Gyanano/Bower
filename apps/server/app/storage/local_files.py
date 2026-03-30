from pathlib import Path

from app.db.sqlite import DATA_DIR

STORE_DIR = DATA_DIR / "store"
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024


def persist_upload(payload: bytes, storage_key: str) -> str:
    relative_path = Path(storage_key).relative_to("store")
    destination = STORE_DIR / relative_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(payload)
    return storage_key
