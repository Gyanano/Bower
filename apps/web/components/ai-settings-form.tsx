"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getApiErrorMessage,
  type AIProvider,
  type AISettings,
  updateAiSettings,
} from "@/lib/api";
import { formatUtcTimestamp } from "@/lib/format";

const PROVIDER_DETAILS: Record<
  AIProvider,
  {
    label: string;
    defaultModelId: string;
    modelHelp: string;
    apiKeyHelp: string;
    placeholder: string;
  }
> = {
  openai: {
    label: "OpenAI",
    defaultModelId: "gpt-4.1-mini",
    modelHelp: "Direct OpenAI Responses API connection. Leave the default unless you need a different vision-capable OpenAI model.",
    apiKeyHelp: "Use a direct OpenAI API key from your OpenAI account.",
    placeholder: "gpt-4.1-mini",
  },
  anthropic: {
    label: "Anthropic",
    defaultModelId: "claude-3-5-haiku-latest",
    modelHelp: "Direct Anthropic Messages API connection. Use a Claude model that accepts image input.",
    apiKeyHelp: "Use a direct Anthropic API key from your Anthropic account.",
    placeholder: "claude-3-5-haiku-latest",
  },
  google: {
    label: "Google AI Studio",
    defaultModelId: "gemini-2.5-flash",
    modelHelp: "Direct Google AI Studio Gemini API connection for image analysis.",
    apiKeyHelp: "Use a direct Google AI Studio API key.",
    placeholder: "gemini-2.5-flash",
  },
  volcengine: {
    label: "ByteDance Volcano / Ark",
    defaultModelId: "",
    modelHelp: "Direct ByteDance Ark connection. Enter the model or inference endpoint ID you want this MVP to call.",
    apiKeyHelp: "Use a direct Volcano / Ark API key.",
    placeholder: "ep-xxxxxxxxxxxxxxxx",
  },
};

export function AISettingsForm({ settings }: { settings: AISettings }) {
  const router = useRouter();
  const initialProvider = settings.provider ?? "openai";
  const [provider, setProvider] = useState<AIProvider>(initialProvider);
  const [modelId, setModelId] = useState(settings.model_id ?? PROVIDER_DETAILS[initialProvider].defaultModelId);
  const [apiKey, setApiKey] = useState("");
  const [clearApiKey, setClearApiKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const providerDetails = PROVIDER_DETAILS[provider];
  const isSwitchingProviders = settings.provider !== null && provider !== settings.provider;

  function handleProviderChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextProvider = event.target.value as AIProvider;
    setProvider(nextProvider);
    setModelId(PROVIDER_DETAILS[nextProvider].defaultModelId);
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      await updateAiSettings({
        provider,
        model_id: modelId.trim() || null,
        ...(clearApiKey ? { clear_api_key: true } : {}),
        ...(!clearApiKey && apiKey.trim() ? { api_key: apiKey.trim() } : {}),
      });
      setApiKey("");
      setClearApiKey(false);
      setSuccess("AI settings saved.");
      router.refresh();
    } catch (submissionError) {
      setError(getApiErrorMessage(submissionError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="card stack">
      <div>
        <h2>Active provider</h2>
        <p className="muted">
          Configure the single AI provider used for inspiration image analysis. These settings are stored locally in SQLite for this MVP.
        </p>
      </div>

      {settings.provider_source === "legacy_env" ? (
        <p className="muted">
          Current values are coming from legacy environment fallback. Saving here will switch the app to the local persisted settings path.
        </p>
      ) : null}

      <form className="stack" onSubmit={handleSubmit}>
        <label className="label">
          Provider
          <select className="input" onChange={handleProviderChange} value={provider}>
            {Object.entries(PROVIDER_DETAILS).map(([providerId, details]) => (
              <option key={providerId} value={providerId}>
                {details.label}
              </option>
            ))}
          </select>
        </label>

        <label className="label">
          Model / endpoint ID
          <input
            className="input"
            onChange={(event) => setModelId(event.target.value)}
            placeholder={providerDetails.placeholder}
            type="text"
            value={modelId}
          />
        </label>

        <p className="muted">{providerDetails.modelHelp}</p>

        <label className="label">
          API key
          <input
            className="input"
            disabled={clearApiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={
              isSwitchingProviders
                ? "Paste an API key for the selected provider"
                : settings.has_api_key && !clearApiKey
                  ? "Leave blank to keep the current key"
                  : "Paste a new API key"
            }
            type="password"
            value={apiKey}
          />
        </label>

        <p className="muted">{providerDetails.apiKeyHelp}</p>

        {!isSwitchingProviders && settings.has_api_key && settings.api_key_mask ? (
          <p className="muted">
            Current key: {settings.api_key_mask}
            {settings.api_key_source === "legacy_env" ? " (legacy env)" : " (stored locally)"}
          </p>
        ) : isSwitchingProviders ? (
          <p className="muted">Switching providers requires a new API key unless that provider already has one saved.</p>
        ) : (
          <p className="muted">No API key is currently configured.</p>
        )}

        <label className="muted">
          <input checked={clearApiKey} onChange={(event) => setClearApiKey(event.target.checked)} type="checkbox" /> Clear current API key on save
        </label>

        <button className="button" disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : "Save AI settings"}
        </button>
      </form>

      {settings.updated_at ? <p className="muted">Last saved {formatUtcTimestamp(settings.updated_at)}.</p> : null}
      {success ? <p className="success">{success}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
