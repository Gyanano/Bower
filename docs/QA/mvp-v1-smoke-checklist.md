# MVP v1 Smoke Checklist

## Start

1. Copy the values you need from `apps/server/.env.example` into your local shell environment
2. Set `BOWER_AI_PROVIDER=openai`
3. Set `BOWER_OPENAI_API_KEY` to a real key if you want to test AI analysis
4. Optionally set `BOWER_OPENAI_MODEL` or `BOWER_OPENAI_BASE_URL` for your chosen OpenAI-compatible endpoint
5. Run `npm run dev:server`
6. In a second terminal, run `npm run dev:web`
7. Open `http://127.0.0.1:3000`

## Phase 2A manual smoke

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

- [ ] Try uploading a `.txt` file and confirm it is rejected
- [ ] Stop the backend and open `/inspirations`
- [ ] Confirm the frontend shows a failure state instead of crashing

## If Analyze fails, capture

Paste back:

1. the full page error message
2. the relevant backend terminal output
3. the model name used in your chosen backend configuration
