# Backlog

This document tracks follow-up items that are intentionally deferred from the current implementation pass.

## Current Follow-ups

### Frontend localization cleanup

- Route newly introduced hardcoded UI copy through the shared `i18n` dictionary instead of leaving untranslated strings inline.
- Review at least these files first:
  - `apps/web/components/collections/board-card.tsx`
  - `apps/web/components/layout/side-nav.tsx`
  - `apps/web/components/layout/top-nav.tsx`
  - `apps/web/components/archive/filter-bar.tsx`

### Settings locale persistence regression coverage

- Add a frontend regression test that proves a non-default language preference is preserved after saving AI settings.
- Minimum expected scenario:
  - start with `ui_language = "en"`
  - open the settings screen
  - save AI settings
  - confirm the saved preference still remains `en`

## Notes

- These items came from PR review feedback after fixing the blocking bug where saving AI settings could overwrite the saved UI language preference.
- They are intentionally deferred because the blocker has already been fixed, while the repository still lacks a dedicated frontend test setup for this area.
