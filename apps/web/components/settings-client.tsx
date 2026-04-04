"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Cpu, Languages } from "lucide-react";
import { AccountCard } from "@/components/account/account-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  getApiErrorMessage,
  testAiSettings,
  type AIProvider,
  type AISettings,
  type AppPreferences,
  type UILanguage,
  updateAiSettings,
  updateAppPreferences,
} from "@/lib/api";
import { type CopyDictionary } from "@/lib/i18n";
import { formatUtcTimestamp } from "@/lib/format";

const providerDetails: Record<AIProvider, { label: string; modelPlaceholder: string }> = {
  openai: { label: "OpenAI", modelPlaceholder: "gpt-4.1-mini" },
  anthropic: { label: "Anthropic", modelPlaceholder: "claude-3-5-haiku-latest" },
  google: { label: "Google AI Studio", modelPlaceholder: "gemini-2.5-flash" },
  volcengine: { label: "ByteDance Volcano / Ark", modelPlaceholder: "ep-xxxxxxxxxxxxxxxx" },
};

export function SettingsClient({
  copy,
  preferences,
  settings,
}: {
  copy: CopyDictionary;
  preferences: AppPreferences;
  settings: AISettings;
}) {
  const router = useRouter();
  const initialProvider = settings.provider ?? "openai";
  const [provider, setProvider] = useState<AIProvider>(initialProvider);
  const [modelId, setModelId] = useState(settings.model_id ?? providerDetails[initialProvider].modelPlaceholder);
  const [apiKey, setApiKey] = useState("");
  const [isApiKeyDirty, setIsApiKeyDirty] = useState(false);
  const [clearApiKey, setClearApiKey] = useState(false);
  const [uiLanguage] = useState<UILanguage>("zh-CN");
  const [storedProvider, setStoredProvider] = useState<AIProvider | null>(settings.provider);
  const [hasStoredKey, setHasStoredKey] = useState(settings.has_api_key);
  const [storedKeyMask, setStoredKeyMask] = useState(settings.api_key_mask ?? "");
  const [keyUpdatedAt, setKeyUpdatedAt] = useState(settings.updated_at);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  function handleProviderChange(nextProvider: AIProvider) {
    setProvider(nextProvider);
    setModelId(providerDetails[nextProvider].modelPlaceholder);
  }

  async function persistSettings() {
    const [aiSettingsResult] = await Promise.all([
      updateAiSettings({
        provider,
        model_id: modelId.trim() || null,
        ...(clearApiKey ? { clear_api_key: true as const } : {}),
        ...(!clearApiKey && isApiKeyDirty && apiKey.trim() ? { api_key: apiKey.trim() } : {}),
      }),
      updateAppPreferences({ ui_language: uiLanguage }),
    ]);
    setApiKey("");
    setIsApiKeyDirty(false);
    setClearApiKey(false);
    setStoredProvider(aiSettingsResult.data.provider);
    setHasStoredKey(aiSettingsResult.data.has_api_key);
    setStoredKeyMask(aiSettingsResult.data.api_key_mask ?? "");
    setKeyUpdatedAt(aiSettingsResult.data.updated_at);
    setFeedback(copy.actionSaved);
    router.refresh();
  }

  async function handleTest() {
    setError(null);
    setFeedback(null);
    setIsTesting(true);
    try {
      const result = await testAiSettings({
        provider,
        model_id: modelId.trim() || null,
        api_key: apiKey.trim() || null,
      });
      setFeedback(result.data.message);
    } catch (submissionError) {
      setError(getApiErrorMessage(submissionError));
    } finally {
      setIsTesting(false);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFeedback(null);
    setIsSaving(true);
    try {
      await persistSettings();
    } catch (submissionError) {
      setError(getApiErrorMessage(submissionError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTestAndSave() {
    setError(null);
    setFeedback(null);
    setIsTesting(true);
    try {
      const result = await testAiSettings({
        provider,
        model_id: modelId.trim() || null,
        api_key: apiKey.trim() || null,
      });
      setFeedback(result.data.message);
      setIsTesting(false);
      setIsSaving(true);
      await persistSettings();
    } catch (submissionError) {
      setError(getApiErrorMessage(submissionError));
    } finally {
      setIsTesting(false);
      setIsSaving(false);
    }
  }

  function handleApiKeyFocus() {
    if (!clearApiKey && hasVisibleStoredKey && !isApiKeyDirty) {
      setApiKey("");
      setIsApiKeyDirty(true);
    }
  }

  function handleApiKeyBlur() {
    if (!clearApiKey && hasVisibleStoredKey && isApiKeyDirty && !apiKey.trim()) {
      setApiKey("");
      setIsApiKeyDirty(false);
    }
  }

  const hasVisibleStoredKey = hasStoredKey && storedProvider === provider;
  const displayedApiKeyValue =
    clearApiKey
      ? ""
      : isApiKeyDirty
        ? apiKey
        : hasVisibleStoredKey
          ? storedKeyMask
          : "";

  return (
    <div className="mx-auto w-full max-w-4xl px-6 pb-10">
      <div className="space-y-8">
        <AccountCard copy={copy} authMode="manageOnly" />

        <section className="rounded-[1.5rem] border border-border bg-card p-5 shadow-card lg:p-7">
          <div className="mb-6 flex items-start gap-3">
            <div className="mt-1 rounded-full bg-primary-light p-2 text-primary">
              <Cpu size={18} strokeWidth={1.6} />
            </div>
            <div className="space-y-1">
              <h2 className="font-headline text-2xl text-primary">{copy.providerSectionTitle}</h2>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {copy.providerSectionDescription}
              </p>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSave}>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="font-label text-[10px] font-semibold uppercase tracking-[0.3em] text-foreground">
                  {copy.aiProvider}
                </span>
                <select
                  onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
                  value={provider}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {Object.entries(providerDetails).map(([id, detail]) => (
                    <option key={id} value={id}>{detail.label}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="font-label text-[10px] font-semibold uppercase tracking-[0.3em] text-foreground">
                  {copy.aiModel}
                </span>
                <Input
                  onChange={(e) => setModelId(e.target.value)}
                  placeholder={providerDetails[provider].modelPlaceholder}
                  value={modelId}
                />
              </label>
            </div>

            <div className="space-y-3 rounded-[1.25rem] border border-border bg-surface/60 p-4">
              <label className="space-y-1.5">
                <span className="font-label text-[10px] font-semibold uppercase tracking-[0.3em] text-foreground">
                  {copy.apiKey}
                </span>
                <Input
                  onBlur={handleApiKeyBlur}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setIsApiKeyDirty(true);
                  }}
                  onFocus={handleApiKeyFocus}
                  placeholder={hasVisibleStoredKey ? undefined : "sk-..."}
                  type="password"
                  value={displayedApiKeyValue}
                />
              </label>

              {hasVisibleStoredKey && keyUpdatedAt ? (
                <p className="text-xs text-muted-foreground">
                  {copy.updatedAtLabel} {formatUtcTimestamp(keyUpdatedAt, uiLanguage)}
                </p>
              ) : null}

              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input
                  checked={clearApiKey}
                  onChange={(e) => setClearApiKey(e.target.checked)}
                  type="checkbox"
                  className="rounded border-input"
                />
                {copy.clearApiKey}
              </label>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={isTesting || isSaving}
                onClick={() => void handleTest()}
              >
                {isTesting ? copy.testing : copy.testConnection}
              </Button>
              <Button type="submit" disabled={isSaving || isTesting} className="bg-primary text-primary-foreground">
                {isSaving ? copy.saving : copy.saveSettings}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isSaving || isTesting}
                onClick={() => void handleTestAndSave()}
              >
                {isSaving || isTesting ? copy.testing : copy.saveAndTest}
              </Button>
            </div>
          </form>
        </section>

        <section className="rounded-[1.5rem] border border-border bg-card p-5 shadow-card lg:p-7">
          <div className="mb-6 flex items-start gap-3">
            <div className="mt-1 rounded-full bg-primary-light p-2 text-primary">
              <Languages size={18} strokeWidth={1.6} />
            </div>
            <div className="space-y-1">
              <h2 className="font-headline text-2xl text-primary">{copy.uiLanguage}</h2>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {copy.languageDescription}
              </p>
            </div>
          </div>

          <div className="inline-flex rounded-full border border-border bg-background p-1">
            <button
              type="button"
              className={cn(
                "rounded-full px-4 py-2 text-sm transition-colors",
                uiLanguage === "zh-CN" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              简体中文
            </button>
            <button
              type="button"
              disabled
              className={cn(
                "cursor-not-allowed rounded-full px-4 py-2 text-sm transition-colors text-muted-foreground/70",
              )}
            >
              English (coming soon)
            </button>
          </div>
        </section>

        {feedback ? <p className="text-sm text-success">{feedback}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
