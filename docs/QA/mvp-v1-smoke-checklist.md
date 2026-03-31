# MVP v1 Smoke Checklist

## Start

1. Run `npm run dev:server`
2. In a second terminal, run `npm run dev:web`
3. Open `http://127.0.0.1:3000/settings/ai`
4. Select one provider: OpenAI, Anthropic, Google AI Studio, or ByteDance Volcano / Ark
5. Enter an API key
6. Enter `Model / endpoint ID` if needed for your chosen provider
7. Save settings
8. Refresh `/settings/ai` and confirm the API key remains masked rather than displayed in full

Optional legacy fallback:

- if you are intentionally testing the old path, set `BOWER_AI_PROVIDER` plus the provider-specific API key/model env vars before starting the backend

## Phase 2A manual smoke

- [ ] Open `http://127.0.0.1:3000/settings/ai`
- [ ] Save a provider configuration successfully
- [ ] Refresh and confirm the selected provider and masked API key state persist
- [ ] Open `http://127.0.0.1:3000/upload`
- [ ] Upload any local `.png`, `.jpg`, or `.webp` test image
- [ ] Open `/inspirations`
- [ ] Confirm the uploaded item appears
- [ ] Open the detail page
- [ ] Edit `title`
- [ ] Edit `notes`
- [ ] Edit `source_url`
- [ ] Save changes
- [ ] Refresh and confirm edits persist
- [ ] Archive the item
- [ ] Confirm it disappears from the active list
- [ ] Open the archived view and confirm it appears there
- [ ] Trigger delete and confirm the 2-step delete flow appears

## Phase 2B manual smoke

- [ ] Open an inspiration detail page
- [ ] Click `Analyze`
- [ ] Confirm either success or a clear error state
- [ ] On success, confirm `summary` appears
- [ ] On success, confirm `tags` appear
- [ ] Refresh and confirm analysis data persists

## Failure-path smoke

- [ ] Open `/settings/ai`, clear the API key, save, and confirm the key state is removed
- [ ] Open an inspiration detail page and confirm `Analyze` fails with a clear provider-not-configured message when no key is present
- [ ] Try uploading a `.txt` file and confirm it is rejected
- [ ] Stop the backend and open `/inspirations`
- [ ] Confirm the frontend shows a failure state instead of crashing

## If Analyze fails, capture

Paste back:

1. the full page error message
2. the relevant backend terminal output
3. the provider plus `Model / endpoint ID` used in `/settings/ai`
