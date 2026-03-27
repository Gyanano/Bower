# Contributing to Bower

> Like a bowerbird curating its collection — Bower captures design inspiration, extracts style DNA with AI, and weaves it into reusable code components. Local-first, agent-ready.

## Branch Management (Git Flow)

This repository follows the **Git Flow** branching model.

### Persistent Branches

| Branch | Purpose | Direct Push |
|--------|---------|-------------|
| `main` | Production-ready releases only | ❌ Protected |
| `develop` | Integration branch for ongoing development | ❌ Protected |

### Temporary Branches

| Branch Prefix | Branched From | Merges Into | Naming Example |
|---------------|---------------|-------------|----------------|
| `feature/` | `develop` | `develop` | `feature/ai-style-extraction` |
| `release/` | `develop` | `main` + `develop` | `release/1.0.0` |
| `hotfix/` | `main` | `main` + `develop` | `hotfix/fix-crash-on-upload` |

---

## Development Workflow

### Starting a new feature

```bash
git checkout develop
git pull origin develop
git flow feature start <feature-name>
# e.g. git flow feature start ai-style-extraction
```

Work on your changes, then open a Pull Request from `feature/<name>` → `develop`.

### Preparing a release

```bash
git flow release start <version>
# e.g. git flow release start 1.0.0
```

Merge into both `main` and `develop` via Pull Requests when ready.

### Hotfixing production

```bash
git flow hotfix start <fix-name>
# e.g. git flow hotfix start fix-crash-on-upload
```

Merge into both `main` and `develop` via Pull Requests when done.

---

## Commit Message Convention

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <short description>

[optional body]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples:**
```
feat(ai): add color palette extraction from uploaded images
fix(preview): resolve Sandpack iframe not rendering on Safari
docs(api): update OpenAPI schema for /styles endpoint
chore(deps): upgrade Pydantic to v2.8
```

---

## Pull Request Guidelines

- All PRs must target `develop` (or `main` for hotfixes via `hotfix/` branches)
- Keep PRs focused — one feature or fix per PR
- Ensure the branch is up to date with its base before requesting review
- At least **one approving review** is required before merging
- Delete the branch after merging
