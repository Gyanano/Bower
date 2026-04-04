# Bower

<p align="center">
  <img src="./BowerLogo.png" alt="Bower logo" width="140" height="140" />
</p>

<p align="center">
  Local-first design archive for collecting inspiration, organizing boards, and extracting visual cues with AI.
</p>

## Overview

Bower is a local-first design style asset management system built for visual research workflows. It helps you collect reference images, organize them into boards, annotate context, and run AI analysis for summaries and tags, while keeping your files and database on your own machine.

The project includes:

- A Next.js web app for archive browsing, timeline review, board management, upload, settings, and account flows
- A FastAPI backend for storage, metadata, board APIs, and AI analysis
- A bundled browser extension for sending web images into the same Bower workflow

## Core Features

- Upload inspiration images in `PNG`, `JPEG`, or `WEBP`
- Add titles, source links, and notes to each record
- Organize references into boards and archive views
- Analyze images with AI to generate summaries and tags
- Review materials through archive, collections, and timeline pages
- Keep data local with SQLite and filesystem-backed storage

## Product Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 15, React 19, TypeScript |
| Backend | FastAPI, Uvicorn |
| Database | SQLite |
| File Storage | Local filesystem, content-addressable storage |
| AI Providers | OpenAI, Anthropic, Google AI Studio, ByteDance Volcano / Ark |
| Workspace | pnpm workspaces, Turbo |
| Python Tooling | uv |

## Repository Layout

```text
apps/
  server/          FastAPI backend
  web/             Next.js frontend
browser-extension/ Chrome extension for sending images into Bower
docs/
  Architecture.md  Design rationale and architecture notes
  QA/              Smoke test checklists
```

## Quick Start

### Prerequisites

- Node.js `18+`
- `pnpm`
- [`uv`](https://docs.astral.sh/uv/)
- An API key for your chosen AI provider if you want image analysis

### Install

```bash
npm run install:web
npm run sync:server
```

### Configure

The preferred configuration path is the in-app settings page at `/settings/ai` after starting the app.

Legacy environment variables are still available for local automation or CI:

```bash
# Choose one provider
BOWER_AI_PROVIDER=openai

# OpenAI
BOWER_OPENAI_API_KEY=your-key
BOWER_OPENAI_MODEL=gpt-4.1-mini
BOWER_OPENAI_BASE_URL=https://api.openai.com

# Anthropic
BOWER_ANTHROPIC_API_KEY=your-key
BOWER_ANTHROPIC_MODEL=claude-3-5-haiku-latest

# Google AI Studio
BOWER_GOOGLE_API_KEY=your-key
BOWER_GOOGLE_MODEL=gemini-2.5-flash

# ByteDance Volcano / Ark
BOWER_ARK_API_KEY=your-key
BOWER_ARK_MODEL=your-endpoint-id
```

Frontend local env:

```bash
# apps/web/.env.local
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

### Run

```bash
# Terminal 1
npm run dev:server

# Terminal 2
npm run dev:web
```

Open `http://localhost:3000` for the web app and `http://localhost:8000/docs` for the API docs.

## Browser Extension

The repository also ships with a browser extension in [`browser-extension/`](./browser-extension) for analyzing images directly from the web and feeding them into the Bower workflow.

- Manifest: [`browser-extension/manifest.json`](./browser-extension/manifest.json)
- Popup settings: [`browser-extension/popup.html`](./browser-extension/popup.html)
- Background worker: [`browser-extension/background.js`](./browser-extension/background.js)

Load it as an unpacked extension in a Chromium-based browser after the backend is available.

## Development

### Frontend

```bash
cd apps/web
npm run build
npm run lint
```

### Backend

```bash
npm run test:server
```

Single-file example:

```bash
uv run --directory apps/server pytest tests/test_inspirations_api.py
```

## Architecture Notes

- API responses use envelope objects: `{ "data": ... }` and `{ "error": ... }`
- Files are stored locally using content-addressable paths
- SQLite schema setup and migrations run on backend startup
- AI provider settings can be changed in-app without editing env files

See [`docs/Architecture.md`](./docs/Architecture.md) for the full rationale.

## Contributing

This repository follows Git Flow:

- Create feature work from `develop`
- Open pull requests back into `develop`
- Keep `main` production-only

Use Conventional Commits for commit messages, for example `feat(ui): polish archive workspace`.
