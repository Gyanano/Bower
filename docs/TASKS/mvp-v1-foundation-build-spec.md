# MVP Foundation Build Spec — Slice 1

## Objective

Build the first local-first vertical slice for Bower that supports:

- upload an inspiration image
- save its metadata and file reference locally
- list saved inspirations
- view a single inspiration detail page

This slice exists to establish a reviewable foundation only.

## In Scope

- local-only upload/save/list/detail flow
- minimal backend API for inspiration items
- local filesystem storage for original uploads
- SQLite metadata storage
- minimal frontend skeleton for upload, list, and detail pages
- basic error handling for invalid file, missing item, and storage failure

## Out of Scope

- AI extraction, tagging, search, auth, sync, cloud storage
- collections, components, tokens, MCP, CLI
- bulk upload, edit/delete UI, and advanced background processing

## API Contracts

Base path: `/api/v1`

### `POST /api/v1/inspirations`

Upload and save one inspiration item.

Request:
- `multipart/form-data`
  - `file`: image file (`image/png`, `image/jpeg`, `image/webp`)
  - `source_url`?: string
  - `title`?: string
  - `notes`?: string

Response `201`:

```json
{
  "data": {
    "id": "ins_01H...",
    "title": "Landing page reference",
    "notes": "Optional notes",
    "source_url": "https://example.com",
    "original_filename": "example.png",
    "mime_type": "image/png",
    "file_size_bytes": 245123,
    "storage_key": "store/ab/cd/abcdef...",
    "created_at": "2026-03-28T12:00:00Z"
  }
}
```

Errors:
- `400 INVALID_FILE_TYPE`
- `400 MISSING_FILE`
- `413 FILE_TOO_LARGE`
- `500 SAVE_FAILED`

### `GET /api/v1/inspirations`

List saved inspirations.

Query params:
- `limit`? integer, default `20`, max `100`
- `offset`? integer, default `0`

Response `200`:

```json
{
  "data": [
    {
      "id": "ins_01H...",
      "title": "Landing page reference",
      "original_filename": "example.png",
      "mime_type": "image/png",
      "file_size_bytes": 245123,
      "created_at": "2026-03-28T12:00:00Z"
    }
  ],
  "meta": {
    "limit": 20,
    "offset": 0,
    "total": 1
  }
}
```

### `GET /api/v1/inspirations/{id}`

Fetch one inspiration item.

Response `200`:

```json
{
  "data": {
    "id": "ins_01H...",
    "title": "Landing page reference",
    "notes": "Optional notes",
    "source_url": "https://example.com",
    "original_filename": "example.png",
    "mime_type": "image/png",
    "file_size_bytes": 245123,
    "storage_key": "store/ab/cd/abcdef...",
    "created_at": "2026-03-28T12:00:00Z",
    "file_url": "/api/v1/inspirations/ins_01H.../file"
  }
}
```

Errors:
- `404 INSPIRATION_NOT_FOUND`

### `GET /api/v1/inspirations/{id}/file`

Serve the original uploaded image for local display.

### Error Envelope

```json
{
  "error": {
    "code": "INSPIRATION_NOT_FOUND",
    "message": "Inspiration item not found"
  }
}
```

## Data Model

### Storage

- SQLite for metadata
- local filesystem for original uploads

### Table: `inspirations`

- `id` TEXT PRIMARY KEY
- `title` TEXT NULL
- `notes` TEXT NULL
- `source_url` TEXT NULL
- `original_filename` TEXT NOT NULL
- `mime_type` TEXT NOT NULL
- `file_size_bytes` INTEGER NOT NULL
- `storage_key` TEXT NOT NULL UNIQUE
- `created_at` TEXT NOT NULL

### Preferred Local Storage Layout

```text
data/
  store/
    ab/
      cd/
        abcdef...
  meta.db
```

Fallback if needed:

```text
data/
  uploads/
  meta.db
```

## Repo Structure

```text
apps/
  web/
  server/
packages/
  shared/
docs/
```

### Server

```text
apps/server/
  app/
    main.py
    api/routes/inspirations.py
    models/inspiration.py
    schemas/inspiration.py
    services/inspirations.py
    db/sqlite.py
    db/migrations/
    storage/local_files.py
```

### Web

```text
apps/web/
  app/upload/page.tsx
  app/inspirations/page.tsx
  app/inspirations/[id]/page.tsx
  lib/api/
  components/
```

## Acceptance Criteria

### Upload -> Save

- user can submit a supported image from the web UI
- server stores the file locally and writes one SQLite row
- API returns `201` with new item payload
- invalid file type is rejected with structured error

### List

- user can open the list page and see saved items from SQLite
- new upload appears in the list without manual DB inspection
- list response includes `meta.total`

### Detail

- user can open a detail page by item id
- detail page shows saved metadata and renders the stored image
- unknown id returns `404 INSPIRATION_NOT_FOUND`

## Recommended Implementation Order

1. Create repo skeleton
2. Implement FastAPI app, SQLite setup, and local file storage
3. Add `inspirations` table and persistence
4. Add upload/list/detail/file endpoints
5. Build Next.js upload/list/detail pages
6. Connect frontend to backend
7. Run basic validation

## Notable Risks

- current repo has no app scaffolding, so bootstrap work may dominate
- file path portability should be centralized early
- shared type drift can happen if contracts are duplicated
- avoid over-engineering storage before the first slice is reviewable
