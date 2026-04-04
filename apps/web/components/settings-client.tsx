"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
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
import { Icon } from "@/components/icons";

const providerDetails: Record<
  AIProvider,
  {
    label: string;
    modelPlaceholder: string;
  }
> = {
  openai: {
    label: "OpenAI",
    modelPlaceholder: "gpt-4.1-mini",
  },
  anthropic: {
    label: "Anthropic",
    modelPlaceholder: "claude-3-5-haiku-latest",
  },
  google: {
    label: "Google AI Studio",
    modelPlaceholder: "gemini-2.5-flash",
  },
  volcengine: {
    label: "ByteDance Volcano / Ark",
    modelPlaceholder: "ep-xxxxxxxxxxxxxxxx",
  },
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

  function buildAiSettingsUpdatePayload() {
    return {
      provider,
      model_id: modelId.trim() || null,
      ...(clearApiKey ? { clear_api_key: true as const } : {}),
      ...(!clearApiKey && apiKey.trim() ? { api_key: apiKey.trim() } : {}),
    };
  }

  function buildAiSettingsTestPayload() {
    return {
      provider,
      model_id: modelId.trim() || null,
      api_key: apiKey.trim() || null,
    };
  }

  function handleProviderChange(nextProvider: AIProvider) {
    setProvider(nextProvider);
    setModelId(providerDetails[nextProvider].modelPlaceholder);
  }

  async function persistSettings() {
    await Promise.all([
      updateAiSettings(buildAiSettingsUpdatePayload()),
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
      const result = await testAiSettings(buildAiSettingsTestPayload());
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
      const result = await testAiSettings(buildAiSettingsTestPayload());
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
    <div className="settings-screen">
      <div className="settings-desktop-frame">
        <aside className="settings-sidebar">
          <div className="settings-sidebar-title">{copy.settings}</div>
          <div className="settings-nav-item">
            <Icon name="user" width={16} height={16} />
            <span>{copy.accountLabel}</span>
          </div>
          <div className="settings-nav-item active">
            <Icon name="cpu" width={16} height={16} />
            <span>{copy.aiProvider}</span>
          </div>
          <div className="settings-nav-item">
            <Icon name="brush" width={16} height={16} />
            <span>{copy.uiLanguage}</span>
          </div>
          <Link className="settings-nav-item backlink" href="/inspirations">
            <Icon name="layout" width={16} height={16} />
            <span>{copy.backToWorkspace}</span>
          </Link>
        </aside>

        <main className="settings-content">
          <h1>{copy.providerSectionTitle}</h1>
          <p className="settings-description">{copy.providerSectionDescription}</p>

          <form className="settings-form" onSubmit={handleSave}>
            <label className="field">
              <span>{copy.aiProvider}</span>
              <select onChange={(event) => handleProviderChange(event.target.value as AIProvider)} value={provider}>
                {Object.entries(providerDetails).map(([providerId, details]) => (
                  <option key={providerId} value={providerId}>
                    {details.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>{copy.aiModel}</span>
              <input
                onChange={(event) => setModelId(event.target.value)}
                placeholder={providerDetails[provider].modelPlaceholder}
                type="text"
                value={modelId}
              />
            </label>

            <label className="field">
              <span>{copy.apiKey}</span>
              <input
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={settings.has_api_key ? copy.keepCurrentKeyPlaceholder : "sk-..."}
                type="password"
                value={apiKey}
              />
            </label>

            <p className="field-help">
              {copy.currentKey}: {settings.api_key_mask ?? copy.noneLabel}
              {settings.updated_at ? ` · ${formatUtcTimestamp(settings.updated_at, uiLanguage)}` : ""}
            </p>

            <label className="checkbox-row">
              <input checked={clearApiKey} onChange={(event) => setClearApiKey(event.target.checked)} type="checkbox" />
              <span>{copy.clearApiKey}</span>
            </label>

            <div className="language-card">
              <div>
                <h2>{copy.uiLanguage}</h2>
                <p>{copy.languageDescription}</p>
              </div>
              <div className="language-toggle">
                <button
                  className={uiLanguage === "zh-CN" ? "selected" : ""}
                  onClick={() => setUiLanguage("zh-CN")}
                  type="button"
                >
                  简体中文
                </button>
                <button
                  className={uiLanguage === "en" ? "selected" : ""}
                  onClick={() => setUiLanguage("en")}
                  type="button"
                >
                  English
                </button>
              </div>
            </div>

            <div className="settings-actions">
              <button className="secondary-button" disabled={isTesting || isSaving} onClick={() => void handleTest()} type="button">
                {isTesting ? copy.testing : copy.testConnection}
              </button>
              <button className="primary-button" disabled={isSaving || isTesting} type="submit">
                {isSaving ? copy.saving : copy.saveSettings}
              </button>
            </div>
          </form>

          {feedback ? <p className="form-success">{feedback}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
        </main>
      </div>

      <div className="settings-mobile-frame">
        <div className="settings-mobile-topbar">
          <h1>{copy.settings}</h1>
        </div>

        <div className="settings-mobile-section">
          <h2>{copy.aiProvider}</h2>
          <div className="mobile-list-group">
            <label className="mobile-list-item">
              <span>{copy.aiProvider}</span>
              <select onChange={(event) => handleProviderChange(event.target.value as AIProvider)} value={provider}>
                {Object.entries(providerDetails).map(([providerId, details]) => (
                  <option key={providerId} value={providerId}>
                    {details.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="mobile-list-item">
              <span>{copy.aiModel}</span>
              <input onChange={(event) => setModelId(event.target.value)} type="text" value={modelId} />
            </label>
          </div>
        </div>

        <div className="settings-mobile-section">
          <h2>{copy.apiKey}</h2>
          <div className="mobile-list-group single-input">
            <input
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={settings.has_api_key ? copy.keepCurrentKeyPlaceholder : "sk-..."}
              type="password"
              value={apiKey}
            />
          </div>
          <p className="mobile-helper-text">{copy.storedLocally}</p>
        </div>

        <div className="settings-mobile-section">
          <h2>{copy.uiLanguage}</h2>
          <div className="mobile-list-group">
            <label className="mobile-list-item">
              <span>{copy.uiLanguage}</span>
              <select onChange={(event) => setUiLanguage(event.target.value as UILanguage)} value={uiLanguage}>
                <option value="zh-CN">简体中文</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>
        </div>

        <div className="settings-mobile-actions">
          <button className="secondary-button full-width" disabled={isTesting || isSaving} onClick={() => void handleTest()} type="button">
            {isTesting ? copy.testing : copy.testConnection}
          </button>
          <button
            className="primary-button full-width"
            disabled={isSaving || isTesting}
            onClick={() => void handleTestAndSave()}
            type="button"
          >
            {isSaving ? copy.saving : copy.saveAndTest}
          </button>
        </div>

        {feedback ? <p className="form-success">{feedback}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </div>
  );
}
