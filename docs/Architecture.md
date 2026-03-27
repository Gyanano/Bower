# The optimal stack for Bower — a Design Style Asset Management System

> *Like a bowerbird curating its collection — Bower captures design inspiration, extracts style DNA with AI, and weaves it into reusable code components. Local-first, agent-ready.*

**The best architecture for Bower is a TypeScript-dominant monorepo with React/Next.js on the frontend, a Python FastAPI backend, SQLite as the database, and Sandpack for live component previews.** This combination uniquely addresses every core requirement — local-first deployment, AI agent consumption, live interactive rendering, and a solo developer's productivity — while leaving a clean migration path to cloud. No existing tool bridges the gap from design inspiration to keyword extraction to code component reuse; Bower occupies a genuinely novel niche. What follows is a concrete, justified blueprint for every layer of the stack.

---

## React and Next.js win the frontend decisively

The live component preview requirement is the single most differentiating technical challenge in this system, and it eliminates every framework except React from serious contention. **Sandpack** (`@codesandbox/sandpack-react`), the open-source in-browser bundler by CodeSandbox that powers the official React documentation at react.dev, provides battle-tested, multi-framework live rendering inside secure cross-origin iframes. It is React-native, composable, self-hostable, and supports React, Vue, Svelte, and vanilla JS templates out of the box. No equivalent exists in Vue, Svelte, or Solid ecosystems with comparable maturity.

The Pinterest-style gallery requires a high-performance virtualized masonry layout. **`masonic`** (by Jared Lunde) delivers exactly this — a red-black interval tree implementation achieving O(log n + m) lookup performance, handling 10,000+ cells with virtualization and auto-sizing. React dominates here; Vue and Svelte have no comparable dedicated masonry library. For drag-and-drop interactions (reordering collections, organizing tags), **`@dnd-kit`** at 10.8 million weekly npm downloads is the gold standard — accessible, customizable, and performant.

The specific frontend toolkit should be:

- **Next.js 15** with App Router (React Server Components for data-heavy pages, client components for interactive UI, built-in API routes as a lightweight proxy layer, and `next/image` for automatic image optimization with blur placeholders and lazy loading)
- **shadcn/ui + Radix UI + Tailwind CSS** for the base component library — components you own and can customize freely, matching the project's "design system management" ethos
- **Zustand** for lightweight client-side state management, **TanStack Query** for server state and caching
- **MDX** for component documentation pages with embedded live code blocks

Vue/Nuxt is the strongest alternative but falls short on two fronts: Sandpack's React wrapper is first-class while its Vue support requires awkward bridging, and the virtualized masonry ecosystem is significantly thinner. Svelte and Solid are eliminated by ecosystem gaps — the niche UI libraries this project demands (masonry grids, sandboxed preview toolkits, rich drag-and-drop) simply don't exist outside React's ecosystem.

---

## Python FastAPI is the right backend for an AI-native, API-first tool

This decision hinges on two requirements that pull in the same direction: the AI/LLM integration core and the dual-interface API design.

**FastAPI generates production-quality OpenAPI 3.1 specifications automatically from Python type hints** — zero additional configuration, zero decorators, zero separate schema files. This matters enormously because the OpenAPI spec becomes the single source of truth that simultaneously powers Swagger UI documentation for human developers, typed frontend client generation (via `openapi-typescript`), MCP server auto-generation (via `FastMCP.from_openapi()`), and CLI tool wrapping. No other framework makes the OpenAPI contract this effortless. Hono with `@hono/zod-openapi` comes closest in TypeScript but requires more manual schema wiring.

For AI integration, although the system uses external LLM endpoints via HTTP (not local ML models), Python's ecosystem still delivers tangible advantages. **`httpx`** provides first-class async HTTP with streaming support for LLM API responses. **Pillow** and **python-multipart** handle image upload processing. **`pydantic-ai`** or **`instructor`** provide structured output parsing from LLM responses — critical for reliably extracting design keywords like "Glassmorphism" or "Neumorphism" from image analysis. The **MCP Python SDK** (22,000+ GitHub stars, the reference implementation) makes exposing the tool as an MCP server trivial, enabling direct integration with Claude, Cursor, and other AI coding assistants.

The concrete backend architecture uses a **single service layer pattern** — one set of business logic functions called by three interfaces:

```
FastAPI REST API  →  ┐
MCP Server        →  ├→  Core Service Layer  →  SQLite + File Storage
CLI (typer)       →  ┘
```

Key libraries: `fastapi` + `uvicorn` (server), `pydantic` v2 (validation with Rust-core performance), `httpx` (async LLM calls), `Pillow` (image processing), `aiosqlite` + `sqlite-vec` (database), `mcp` SDK (agent integration), `typer` (CLI).

**The cross-language tradeoff is real but manageable.** Running TypeScript on the frontend and Python on the backend means two ecosystems to maintain. For a solo developer, this is the primary cost. The payoff is substantial: FastAPI's OpenAPI generation saves weeks of API documentation work, and Python's AI tooling avoids fighting upstream against an ecosystem that thinks in Python. The monorepo structure (described below) and shared JSON schemas via OpenAPI keep the two worlds synchronized.

If a single-language TypeScript stack is a hard requirement, **Hono** with `@hono/zod-openapi` running on Bun is the best alternative. Hono is lightweight (~14KB), supports OpenAPI generation from Zod schemas, runs on every JavaScript runtime, and pairs naturally with the React frontend. The tradeoff is weaker MCP SDK support (the TypeScript MCP SDK exists but is less mature) and more manual wiring for structured LLM output parsing.

---

## SQLite is the only correct database choice for local-first

This is the least ambiguous decision in the entire stack. **SQLite with sqlite-vec and FTS5 extensions delivers embedded vector search, full-text search, and relational metadata storage in a single zero-configuration file.** No database server to install, no connection strings to configure, no Docker container to manage. Users download the tool and it works.

The data model maps cleanly to relational tables: `style_collections` (uploaded references with AI-extracted keywords), `components` (code files linked to styles), `tags` (many-to-many relationships), `assets` (file metadata with content hashes), and `embeddings` (vector representations for semantic similarity search).

**sqlite-vec** (by Alex Garcia, Mozilla Builders project) provides in-database vector search supporting float32, int8, and binary quantization with SIMD acceleration. At the scale this tool operates — thousands to tens of thousands of design style embeddings, not millions — brute-force KNN search is fast enough, and keeping everything in one file massively simplifies backup, portability, and deployment. **FTS5** provides built-in full-text search for keyword and tag queries without any external search engine.

The cloud migration path is clean: **LibSQL/Turso** is a SQLite-compatible fork that adds embedded replicas (zero-latency local reads with automatic cloud sync) and native vector search built into the SQL engine. Switching from `aiosqlite` to the `libsql-client` requires minimal code changes. For teams that need PostgreSQL, the well-defined service layer makes a database adapter swap straightforward, though for a personal tool this is unlikely to be necessary.

The key SQLite performance insight: **SQLite reads and writes blobs under 100KB approximately 35% faster than the filesystem** (per sqlite.org benchmarks) due to reduced syscall overhead. This means generated thumbnails and small preview images belong in SQLite, while original uploaded images belong on the filesystem.

---

## A tiered preview architecture solves the rendering challenge

Rendering live interactive component previews is the hardest technical problem in this system. The solution requires four tiers, not one monolithic approach.

**Tier 1 — Gallery view** uses pre-rendered static thumbnails in a virtualized masonry grid. Rendering 50–200 simultaneous Sandpack iframe instances is not feasible; each iframe bootstraps a separate JavaScript context with a bundler. Instead, capture screenshots when components are added to the system (using Playwright in a background process or via uploaded screenshots). Serve these through `masonic` for the virtualized grid and `next/image` for optimized lazy loading with blur-up placeholders. On hover, display a larger preview or animated GIF. On click, navigate to the detail page.

**Tier 2 — Detail page** uses **Sandpack** for full interactive rendering. The `SandpackProvider` wraps the preview iframe with the component's source files, npm dependencies, and the appropriate framework template (React, Vue, Svelte, or vanilla JS). The preview renders live and interactive inside a secure cross-origin iframe. An expandable code editor (`SandpackCodeEditor`) lets users inspect and modify the component code with instant hot-module-reloading feedback.

**Tier 3 — Inline documentation** uses **react-live** for lightweight, zero-iframe previews of simple React component variations within MDX documentation sections. No bundler overhead, instant feedback — ideal for showing prop variations and usage examples.

**Tier 4 — Deep dive mode** offers full Sandpack with file explorer, console, and test runner for users who want to experiment extensively with a component.

The security model across all tiers: self-host the Sandpack bundler on a separate subdomain (`preview.yourdomain.com`), apply `sandbox="allow-scripts"` to all preview iframes (never combine `allow-scripts` with `allow-same-origin`), validate all `postMessage` origins, and use CSP `frame-ancestors` headers. This provides browser-enforced origin isolation — malicious component code cannot access the host application's cookies, localStorage, or DOM.

---

## One API serves both humans and AI agents through OpenAPI and MCP

The dual-interface requirement is best solved by treating the OpenAPI specification as the single source of truth that generates everything else. FastAPI produces this spec automatically from type hints. From this single spec:

The **web frontend** consumes the REST API directly, with typed client code auto-generated by `openapi-typescript`. Every endpoint returns consistent JSON structures with envelope formatting (`{ "data": [...], "meta": { "total": 150, "page": 1 }, "links": { "next": "..." } }`), cursor-based pagination, and structured error codes (`ASSET_NOT_FOUND`, `INVALID_TAG`). Rich field descriptions in the OpenAPI spec serve double duty: they document the API for human developers and provide context for LLMs parsing the spec.

**AI agents** interact through two channels. The REST API itself is agent-friendly by design — consistent JSON responses, structured error handling, idempotency keys on write operations, and comprehensive filtering via query parameters (`/api/v1/styles?tags=minimalist,dark&sort=-created_at`). The **MCP server** provides a higher-level integration via `FastMCP.from_openapi()`, which auto-generates MCP tools from the OpenAPI spec. This enables Claude, Cursor, and other MCP-compatible assistants to directly call `search_styles`, `get_component`, `analyze_style`, and other operations. The MCP server supports STDIO transport for local IDE integration and StreamableHTTP for remote access.

The **CLI** (`typer`) wraps the same REST API endpoints, enabling scriptable workflows:
```bash
bower add --image ./screenshot.png --tags "minimalist,dark-mode"
bower search "warm gradient cards"
bower serve     # starts FastAPI server
bower mcp       # starts MCP server (STDIO)
```

Authentication scales with deployment mode: no auth for localhost (the server only binds to `127.0.0.1`), API keys for cloud-deployed instances, and MCP transport handles its own auth context.

---

## Content-addressable storage bridges local and cloud seamlessly

The file storage strategy uses a **hybrid architecture**: a content-addressable store (CAS) on the filesystem for original images and code files, SQLite BLOBs for generated thumbnails under 100KB, and a storage abstraction interface that swaps between local filesystem and S3-compatible object storage via configuration.

Files are stored by their SHA-256 hash in a sharded directory structure (`store/ab/cd/abcdef1234...`), preventing directory bloat and enabling automatic deduplication. The same CSS file uploaded across ten different style collections is stored once. Every version of a file creates a new hash, providing natural version history tracked as a linked list in SQLite (`asset_versions(asset_id, version, content_hash, created_at)`).

The image pipeline processes uploads through **Sharp** (libvips-based, ~20x faster than alternatives): generate a 200×200 WebP thumbnail (stored in SQLite BLOB), an 800px preview (stored in cache directory), and a 1920px optimized WebP for web serving. Original files go into the CAS unmodified.

The complete local data directory:
```
~/.bower/
├── store/          # CAS: originals + code files (sharded by hash)
├── cache/          # Generated previews, optimized images (safe to delete)
├── meta.db         # SQLite: metadata, tags, relationships, FTS5, sqlite-vec
├── thumbnails.db   # SQLite: thumbnail BLOBs (<100KB each)
└── config.json     # Local configuration
```

Backup is trivial: copy the directory. Cloud migration swaps `LocalFsStorage` for `S3Storage` in the configuration — the same `StorageAdapter` interface (`put`, `get`, `has`, `delete`, `list`) abstracts both backends. No MinIO or heavyweight object storage needed locally.

---

## pnpm and Turborepo provide the monorepo foundation

The project splits into five workspace packages under a **pnpm + Turborepo** monorepo. Turborepo (now Go-based, acquired by Vercel) provides task orchestration with aggressive caching — **3x faster builds than Nx** in benchmarks with ~20 lines of configuration versus ~200. pnpm's content-addressable `node_modules` is the most disk-efficient package manager for monorepos.

```
bower/
├── apps/
│   ├── web/            # Next.js frontend
│   ├── server/         # Python FastAPI backend (outside pnpm, managed separately)
│   ├── cli/            # TypeScript CLI tool
│   └── sandbox/        # Sandpack preview sandbox (separate domain for security)
├── packages/
│   ├── shared/         # TypeScript types, Zod schemas, constants
│   ├── storage/        # Storage abstraction (CAS, image pipeline)
│   ├── database/       # SQLite schema, migrations, queries
│   └── ui/             # Shared React UI components
├── turbo.json
├── pnpm-workspace.yaml
├── Dockerfile
└── docker-compose.yml
```

The Python backend lives in `apps/server/` with its own `pyproject.toml` managed by **uv** (the fast Python package manager). A root-level `Makefile` or `just` file orchestrates cross-language development: `just dev` starts both the TypeScript frontend and Python backend simultaneously. Shared types stay in sync through the OpenAPI spec — `openapi-typescript` auto-generates TypeScript types from FastAPI's spec on each build.

---

## Lessons from existing tools that should shape this system

**Karakeep** (formerly Hoarder, 15,600+ GitHub stars) is the closest open-source analog for the collection side. It uses Next.js App Router, Drizzle ORM, tRPC, Puppeteer for page archival, and OpenAI/Ollama for AI-powered automatic tagging. Its architecture validates the core technical choices — Next.js frontend, AI tagging via configurable LLM endpoints, full-text search (Meilisearch) — and provides a concrete reference implementation for the collection workflow.

**Storybook v10** (84,000+ stars, released November 2025) demonstrates the gold-standard component preview architecture: a manager UI communicating with a sandboxed preview iframe via postMessage event bus. Its **Component Story Format (CSF)** is a portable, framework-agnostic specification for defining components — adopting CSF as the internal component format for this tool would ensure compatibility with the broader ecosystem.

**Eagle App** (400,000+ users) proves that **color-based search** is a killer feature for design asset management. Finding assets by dominant color palette — a capability absent from component libraries — would be a powerful differentiator. Eagle's transparent JSON-based library structure (not encrypted, browsable by any tool) validates the plain-file storage approach.

**Style Dictionary v4** (by Amazon, 1.1M weekly npm downloads) established the definitive token pipeline pattern: parse → transform → format. The **W3C Design Tokens Community Group (DTCG) spec reached v1 stable in October 2025**, backed by Adobe, Google, Microsoft, Meta, Figma, and Sketch. Building the token layer on DTCG-compliant JSON processed by Style Dictionary ensures maximum interoperability with the broader design tooling ecosystem.

**Bit.dev** pioneered component-level versioning with individual dependency tracking, and recently added a **built-in MCP server** for Cursor and GitHub Copilot integration — direct validation that exposing component libraries via MCP is the current best practice for AI-assisted development.

---

## Conclusion: Bower at the intersection of three unsolved problems

No existing tool connects design inspiration collection, AI-powered style keyword extraction, and code component reuse in a single workflow. Eagle manages visual assets but has no code connection. Storybook documents components but has no inspiration pipeline. Bit shares components but has no visual curation. Bower occupies a genuinely unserved niche.

The recommended stack — **React/Next.js, Python FastAPI, SQLite with sqlite-vec, Sandpack, pnpm/Turborepo** — is optimized for three constraints simultaneously: a solo developer's productivity (no unnecessary infrastructure), local-first simplicity (one directory, one database file, one server process), and agent-first extensibility (OpenAPI + MCP as the contract layer). The tiered preview architecture (static thumbnails in gallery, Sandpack on detail pages) resolves the fundamental tension between rendering density and interactive fidelity. The content-addressable storage model provides deduplication, natural versioning, and trivial cloud migration through a single adapter interface swap.

Three architectural bets deserve emphasis. First, **MCP as the primary AI integration channel** — not just a REST API, but a first-class MCP server that makes every component and style queryable by AI coding assistants, which is where developer tooling is heading in 2026. Second, **the W3C DTCG token spec as the styling lingua franca** — this reached stability in October 2025 and is now the non-negotiable standard. Third, **color-based search** borrowed from Eagle App — enabling "find me all components with a warm, earthy palette" queries would be the feature that makes Bower indispensable rather than merely useful.