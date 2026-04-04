"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { User, Cpu, Languages, ArrowLeft } from "lucide-react";
import { AccountCard } from "@/components/account/account-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
  const [clearApiKey, setClearApiKey] = useState(false);
  const [uiLanguage, setUiLanguage] = useState<UILanguage>(preferences.ui_language);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  function handleProviderChange(nextProvider: AIProvider) {
    setProvider(nextProvider);
    setModelId(providerDetails[nextProvider].modelPlaceholder);
  }

  async function persistSettings() {
    await Promise.all([
      updateAiSettings({
        provider,
        model_id: modelId.trim() || null,
        ...(clearApiKey ? { clear_api_key: true as const } : {}),
        ...(!clearApiKey && apiKey.trim() ? { api_key: apiKey.trim() } : {}),
      }),
      updateAppPreferences({ ui_language: uiLanguage }),
    ]);
    setApiKey("");
    setClearApiKey(false);
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

  return (
    <div className="mx-auto w-full max-w-5xl px-6 pb-10">
        {/* Desktop layout */}
        <div className="hidden min-h-[36rem] md:grid grid-cols-[200px_1fr] gap-8">
          {/* Sidebar */}
          <aside className="space-y-1 pt-2">
            <p className="font-headline text-lg uppercase tracking-[0.1em] text-primary mb-4">
              {copy.settings}
            </p>
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-md text-muted-foreground">
              <User size={15} /> <span className="text-sm">{copy.accountLabel}</span>
            </div>
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-primary-light text-primary font-medium">
              <Cpu size={15} /> <span className="text-sm">{copy.aiProvider}</span>
            </div>
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-md text-muted-foreground">
              <Languages size={15} /> <span className="text-sm">{copy.uiLanguage}</span>
            </div>
            <Separator className="my-3" />
            <Link
              href="/inspirations"
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft size={15} /> <span className="text-sm">{copy.backToWorkspace}</span>
            </Link>
          </aside>

          {/* Content */}
          <main className="space-y-8">
            <AccountCard copy={copy} />

            <div>
              <h2 className="font-headline text-2xl text-primary">{copy.providerSectionTitle}</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {copy.providerSectionDescription}
              </p>
            </div>

            <form className="space-y-5 max-w-lg" onSubmit={handleSave}>
              <div className="space-y-1.5">
                <label className="font-label text-[10px] uppercase tracking-[0.3em] text-foreground font-semibold">
                  {copy.aiProvider}
                </label>
                <select
                  onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
                  value={provider}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {Object.entries(providerDetails).map(([id, d]) => (
                    <option key={id} value={id}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-label text-[10px] uppercase tracking-[0.3em] text-foreground font-semibold">
                  {copy.aiModel}
                </label>
                <Input
                  onChange={(e) => setModelId(e.target.value)}
                  placeholder={providerDetails[provider].modelPlaceholder}
                  value={modelId}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-label text-[10px] uppercase tracking-[0.3em] text-foreground font-semibold">
                  {copy.apiKey}
                </label>
                <Input
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={settings.has_api_key ? copy.keepCurrentKeyPlaceholder : "sk-..."}
                  type="password"
                  value={apiKey}
                />
                <p className="text-xs text-muted-foreground">
                  {copy.currentKey}: {settings.api_key_mask ?? copy.noneLabel}
                  {settings.updated_at ? ` · ${formatUtcTimestamp(settings.updated_at, uiLanguage)}` : ""}
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input
                  checked={clearApiKey}
                  onChange={(e) => setClearApiKey(e.target.checked)}
                  type="checkbox"
                  className="rounded border-input"
                />
                {copy.clearApiKey}
              </label>

              <Separator />

              {/* Language */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-surface">
                <div>
                  <h2 className="font-headline text-base uppercase tracking-[0.08em] text-primary">
                    {copy.uiLanguage}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{copy.languageDescription}</p>
                </div>
                <div className="flex rounded-md bg-background border border-border p-0.5">
                  <button
                    type="button"
                    onClick={() => setUiLanguage("zh-CN")}
                    className={cn(
                      "px-3 py-1.5 rounded text-sm transition-colors",
                      uiLanguage === "zh-CN" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    )}
                  >
                    简体中文
                  </button>
                  <button
                    type="button"
                    onClick={() => setUiLanguage("en")}
                    className={cn(
                      "px-3 py-1.5 rounded text-sm transition-colors",
                      uiLanguage === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    )}
                  >
                    English
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
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
              </div>
            </form>

            {feedback && <p className="text-sm text-success">{feedback}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </main>
        </div>

        {/* Mobile layout */}
        <div className="md:hidden space-y-6">
          <AccountCard copy={copy} />

          <div className="space-y-4">
            <div className="space-y-3 p-4 rounded-lg bg-card border border-border">
              <label className="block space-y-1.5">
                <span className="font-label text-[10px] uppercase tracking-[0.3em] font-semibold">{copy.aiProvider}</span>
                <select
                  onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
                  value={provider}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {Object.entries(providerDetails).map(([id, d]) => (
                    <option key={id} value={id}>{d.label}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="font-label text-[10px] uppercase tracking-[0.3em] font-semibold">{copy.aiModel}</span>
                <Input onChange={(e) => setModelId(e.target.value)} value={modelId} />
              </label>
            </div>

            <div className="space-y-3 p-4 rounded-lg bg-card border border-border">
              <label className="block space-y-1.5">
                <span className="font-label text-[10px] uppercase tracking-[0.3em] font-semibold">{copy.apiKey}</span>
                <Input
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={settings.has_api_key ? copy.keepCurrentKeyPlaceholder : "sk-..."}
                  type="password"
                  value={apiKey}
                />
              </label>
              <p className="text-xs text-muted-foreground">{copy.storedLocally}</p>
            </div>

            <div className="space-y-3 p-4 rounded-lg bg-card border border-border">
              <label className="block space-y-1.5">
                <span className="font-label text-[10px] uppercase tracking-[0.3em] font-semibold">{copy.uiLanguage}</span>
                <select
                  onChange={(e) => setUiLanguage(e.target.value as UILanguage)}
                  value={uiLanguage}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="zh-CN">简体中文</option>
                  <option value="en">English</option>
                </select>
              </label>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                disabled={isTesting || isSaving}
                onClick={() => void handleTest()}
              >
                {isTesting ? copy.testing : copy.testConnection}
              </Button>
              <Button
                className="w-full bg-primary text-primary-foreground"
                disabled={isSaving || isTesting}
                onClick={() => void handleTestAndSave()}
              >
                {isSaving ? copy.saving : copy.saveAndTest}
              </Button>
            </div>

            {feedback && <p className="text-sm text-success">{feedback}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>
    </div>
  );
}
