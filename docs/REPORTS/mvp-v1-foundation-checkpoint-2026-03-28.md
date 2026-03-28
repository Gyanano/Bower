# MVP v1 Foundation Checkpoint — 2026-03-28

## Status

`feature/mvp-v1-foundation` is now a **reviewable local-first foundation checkpoint**.

This is not a feature-complete MVP yet, but it establishes the first end-to-end vertical slice:

- upload an inspiration image
- save it locally
- list saved inspirations
- open a detail view

## Scope Landed In This Checkpoint

### Backend

- FastAPI app with:
  - `GET /health`
  - `POST /api/v1/inspirations`
  - `GET /api/v1/inspirations`
  - `GET /api/v1/inspirations/{id}`
  - `GET /api/v1/inspirations/{id}/file`
- SQLite metadata persistence
- local filesystem image storage
- structured error handling for invalid upload and missing resources

### Frontend

- Next.js app with:
  - home page
  - upload page
  - inspirations list page
  - inspiration detail page
- list-page fallback state when API fetch fails

### Developer workflow

- feature branch created and pushed: `feature/mvp-v1-foundation`
- local npm-based frontend run path added for easier Windows testing

## Validation Evidence

### Automated

- `python -m pytest apps/server/tests/test_inspirations_api.py` ✅ `4 passed`
- `npm run build:web` ✅ passed

### Manual smoke

Manual smoke was performed against the local app flow and confirmed:

- backend starts correctly
- frontend starts correctly
- uploaded image persists locally after restart
- invalid `.txt` upload is rejected
- stopping backend causes the frontend list page to show a failure state instead of crashing

## What This Checkpoint Proves

- the local-first storage model is viable
- the first upload → persist → browse → detail flow works
- the repo now has a usable frontend/backend skeleton to build on
- the current branch is suitable for collaborator review and continued development

## What Is Still Out Of Scope

This checkpoint does **not** yet include:

- AI analysis
- tags / summary generation
- metadata editing
- archive / delete flows
- search / filtering
- auth / sync / cloud storage
- collections, components, tokens, MCP, or CLI features

## Current Product Read

This version is best understood as:

**a working foundation prototype**

Not yet:

- a feature-complete MVP
- a polished daily-use product

## Main Decisions Captured

- keep the product **local-first** for MVP
- use **SQLite + local filesystem** as the first storage model
- preserve a thin **Next.js + FastAPI** split
- favor a narrow vertical slice before adding AI and richer product behavior

## Suggested Next Roadmap

### Phase 2A — Basic usability

- metadata edit flow
- archive / delete flow
- better success / empty / error states

### Phase 2B — Core product value

- AI analyze endpoint
- generated summary + tags
- detail-page display of AI output

### Phase 2C — Retrieval quality

- keyword search
- tag filtering

## Recommended Use Of This Artifact

Use this report as the **checkpoint summary** and keep `docs/TASKS/mvp-v1-foundation-build-spec.md` as the original scoped build spec.

This keeps one doc for **planned scope** and one doc for **actual landed status + evidence + next steps**.
