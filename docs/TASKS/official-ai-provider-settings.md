# Official AI Provider Settings

## Objective

Replace env-var-only AI provider configuration with user-managed settings in the product UI so users can choose and maintain official provider connections without editing local environment state.

## Why this exists

- env-var-only setup is too hidden and brittle for regular product use
- official providers should be first-class before any relay or aggregator path
- provider choice and credentials need a stable in-app home for future analysis features

## In Scope

- add a user-managed settings flow for AI provider configuration
- support official provider setup for OpenAI, Anthropic, Google AI Studio, and ByteDance Volcano/Ark
- define the product path around direct provider connections rather than relay/openrouter-style middlemen

## Out of Scope

- implementation details
- QA execution
- prioritizing relay, proxy, or aggregator providers

## Acceptance Criteria

- users can manage AI provider settings from the UI instead of relying only on environment variables
- the settings experience clearly supports OpenAI, Anthropic, Google AI Studio, and ByteDance Volcano/Ark as official providers
- provider selection and saved configuration are framed around direct official endpoints, not relay/openrouter-style intermediaries
- any remaining environment variable support is treated as legacy or fallback behavior, not the primary product path

## Approved Implementation Shape

- dedicated product page: `/settings/ai`
- single active provider at a time for the current MVP image-analysis flow
- local persisted settings in SQLite, kept intentionally narrow rather than introducing a generic app-wide settings system
- masked API key state returned to the UI after load/save
- legacy environment-variable fallback remains secondary and is only used when no local UI-managed setting exists
- provider copy uses a field label of `Model / endpoint ID`

## Founder Decisions Still Open

- none captured in this task artifact beyond the approved provider priority and non-goals

## Traceability

- branch/worktree: `feature/official-ai-provider-settings`
- artifact intent: single concise task doc for approved scope
