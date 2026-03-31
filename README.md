# Bower

A local-first design style asset management system. Upload inspiration images, annotate them with metadata, and use AI to extract style tags and summaries — all stored on your machine.

## What it does

- **Upload** design inspiration images (PNG, JPEG, WEBP)
- **Annotate** with title, source URL, and notes
- **Analyze** with AI to generate style tags and a summary
- **Browse** your saved inspirations with filtering and pagination
- **Archive** or delete inspirations to keep your library clean

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript |
| Backend | Python FastAPI, Uvicorn |
| Database | SQLite (local file) |
| File storage | Local filesystem (content-addressable) |
| AI | OpenAI / Anthropic / Google AI Studio / ByteDance Volcano |
| Monorepo | pnpm workspaces + Turbo |
| Python env | uv |

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- An API key for your chosen AI provider (required only for image analysis)

### Install

```bash
# Frontend
npm run install:web

# Backend (creates apps/server/.venv automatically)
npm run sync:server
```

### Configure

AI provider is configured in-app at `/settings/ai` after starting the server — no env files needed for normal use.

For the legacy env var path (or CI), copy `apps/server/.env.example` and set:

```bash
# Choose one provider
BOWER_AI_PROVIDER=openai        # or: anthropic, google, volcengine

# OpenAI
BOWER_OPENAI_API_KEY=your-key
BOWER_OPENAI_MODEL=gpt-4.1-mini          # optional
BOWER_OPENAI_BASE_URL=https://api.openai.com  # optional, for proxies

# Anthropic
BOWER_ANTHROPIC_API_KEY=your-key
BOWER_ANTHROPIC_MODEL=claude-3-5-haiku-latest  # optional

# Google AI Studio
BOWER_GOOGLE_API_KEY=your-key
BOWER_GOOGLE_MODEL=gemini-2.5-flash      # optional

# ByteDance Volcano / Ark
BOWER_ARK_API_KEY=your-key
BOWER_ARK_MODEL=your-endpoint-id        # required (no default)
```

**Frontend**
```bash
# apps/web/.env.local
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

### Run

```bash
# Terminal 1 — backend
npm run dev:server

# Terminal 2 — frontend
npm run dev:web
```

Open http://localhost:3000. API docs at http://localhost:8000/docs.

### Test

```bash
npm run test:server
```

## Project Structure

```
apps/
  web/       Next.js frontend
  server/    FastAPI backend
docs/
  Architecture.md    Design decisions and rationale
  QA/                Smoke test checklist
```

See `docs/Architecture.md` for a full explanation of architectural decisions.

## Contributing

This project uses Git Flow. Work happens on `feature/*` branches off `develop`. See `CONTRIBUTING.md` for branching rules and commit message conventions.
