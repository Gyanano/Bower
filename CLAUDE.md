# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bower is a local-first design style asset management system. Users upload inspiration images, add metadata, and trigger AI analysis to extract style tags and summaries. The stack is Next.js 15 (frontend) + FastAPI (backend) + SQLite + local filesystem.

## Development Commands

### Start dev servers (run in separate terminals)
```bash
npm run dev:server   # FastAPI backend on http://localhost:8000
npm run dev:web      # Next.js frontend on http://localhost:3000
```

### Install dependencies
```bash
npm run install:web   # Install frontend deps
npm run sync:server   # Create/update apps/server/.venv via uv (requires uv)
```

### Frontend
```bash
cd apps/web
npm run lint         # ESLint via Next.js
npm run build        # Production build
```

### Backend tests
```bash
npm run test:server                                                        # All tests
uv run --directory apps/server pytest tests/test_inspirations_api.py      # Single file
uv run --directory apps/server pytest tests/test_inspirations_api.py::test_name  # Single test
```

OpenAPI docs available at http://localhost:8000/docs when server is running.

## Environment Variables

**Backend** (`apps/server/.env` — see `.env.example`):

Set `BOWER_AI_PROVIDER` to one of `openai`, `gemini`, or `doubao`, then supply the matching vars:

| Provider | Key var | Model var | Base URL var | Default base URL |
|----------|---------|-----------|--------------|-----------------|
| `openai` | `BOWER_OPENAI_API_KEY` | `BOWER_OPENAI_MODEL` (`gpt-4.1-mini`) | `BOWER_OPENAI_BASE_URL` | `https://api.openai.com` |
| `gemini` | `BOWER_GEMINI_API_KEY` | `BOWER_GEMINI_MODEL` (`gemini-2.0-flash`) | `BOWER_GEMINI_BASE_URL` | `https://generativelanguage.googleapis.com` |
| `doubao` | `BOWER_DOUBAO_API_KEY` | `BOWER_DOUBAO_MODEL` (`doubao-vision-pro-32k`) | `BOWER_DOUBAO_BASE_URL` | `https://ark.cn-beijing.volces.com/api/v3` |

OpenAI uses the Responses API (`/v1/responses`). Doubao uses the OpenAI Chat Completions-compatible API (`{base_url}/chat/completions`). Gemini uses the Google Generative AI API (`/v1beta/models/{model}:generateContent`). All base URL vars support custom values for proxies or compatible endpoints.

**Frontend** (`apps/web/.env.local`):
```
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

## Architecture

### Monorepo layout
- `apps/web/` — Next.js 15 App Router frontend
- `apps/server/` — Python FastAPI backend
- `docs/Architecture.md` — Full design rationale with decision justifications

### Backend layers (`apps/server/app/`)
```
api/routes/        → HTTP endpoint definitions (thin, delegates to services)
services/          → Business logic (inspirations.py, image_analysis.py)
db/sqlite.py       → SQLite connection, schema init, migrations on startup
storage/local_files.py → Content-addressable file store (SHA-256 sharded paths)
models/            → Python dataclasses (internal records)
schemas/           → Pydantic schemas (API validation + serialization)
errors.py          → AppError class with status_code, code string, message
```

All routes return envelopes: `{ "data": ... }` for success, `{ "error": { "code": "...", "message": "..." } }` for errors.

### Frontend layers (`apps/web/`)
```
app/               → Next.js App Router pages (Server Components for data, "use client" for interaction)
components/        → Reusable React components
lib/api.ts         → Typed fetch wrapper + all API endpoint functions
lib/format.ts      → Date/URL formatting utilities
```

### Data flow for image upload
1. Frontend posts `multipart/form-data` to `POST /api/v1/inspirations`
2. Backend validates MIME type from file bytes (PNG/JPEG/WEBP, max 10MB)
3. File stored at `data/store/<sha256[0:2]>/<sha256[2:4]>/<full-sha256>`
4. Metadata inserted into SQLite `inspirations` table
5. Returns `InspirationDetailEnvelope`

### AI analysis flow
`POST /api/v1/inspirations/{id}/analyze` → reads file from CAS → base64 encodes → sends to OpenAI with JSON schema for structured output (summary + tags) → updates DB columns `analysis_summary`, `analysis_tags_json`, `analyzed_at`

## Key Conventions

- **API responses** always use the envelope pattern — never return bare objects
- **Error codes** are SCREAMING_SNAKE_CASE strings (e.g., `INSPIRATION_NOT_FOUND`, `FILE_TOO_LARGE`)
- **Frontend** uses vanilla CSS only — no Tailwind or component libraries
- **TypeScript strict mode** is enabled; avoid `any`
- **Git Flow**: feature branches off `develop`, PRs back to `develop`; `main` is production-only
- **Commit messages**: Conventional Commits format — `feat(scope): description`
