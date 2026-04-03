"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, type FormEvent } from "react";
import {
  getApiErrorMessage,
  testAiSettings,
  type AIProvider,
  type AISettings,
  type AccountStatus,
  type AppPreferences,
  type UILanguage,
  updateAiSettings,
  updateAppPreferences,
  getAccountStatus,
  registerAccount,
  loginAccount,
  updateAccountProfile,
  deleteAccount,
  logoutAccount,
} from "@/lib/api";
import { type CopyDictionary } from "@/lib/i18n";
import { formatUtcTimestamp } from "@/lib/format";
import { Icon } from "@/components/icons";

type SettingsSection = "account" | "ai-provider" | "language";

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

  // Section navigation
  const [activeSection, setActiveSection] = useState<SettingsSection>("ai-provider");

  // AI Provider state
  const initialProvider = settings.provider ?? "openai";
  const [provider, setProvider] = useState<AIProvider>(initialProvider);
  const [modelId, setModelId] = useState(settings.model_id ?? providerDetails[initialProvider].modelPlaceholder);
  const [apiKey, setApiKey] = useState("");
  const [clearApiKey, setClearApiKey] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Language state
  const [uiLanguage, setUiLanguage] = useState<UILanguage>(preferences.ui_language);
  const [langFeedback, setLangFeedback] = useState<string | null>(null);
  const [langError, setLangError] = useState<string | null>(null);
  const [isLangSaving, setIsLangSaving] = useState(false);

  // Account state
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [accountMode, setAccountMode] = useState<"register" | "login">("register");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCurrentPassword, setEditCurrentPassword] = useState("");
  const [editNewPassword, setEditNewPassword] = useState("");
  const [accountFeedback, setAccountFeedback] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [isAccountBusy, setIsAccountBusy] = useState(false);

  // Fetch account status on mount
  useEffect(() => {
    getAccountStatus()
      .then((result) => {
        setAccountStatus(result.data);
        if (result.data.profile) {
          setEditName(result.data.profile.display_name);
          setEditEmail(result.data.profile.email);
        }
      })
      .catch(() => {
        setAccountStatus({ logged_in: false, profile: null });
      });
  }, []);

  // --- AI Provider handlers ---

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

  async function handleAiSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAiError(null);
    setAiFeedback(null);
    setIsSaving(true);
    try {
      await updateAiSettings(buildAiSettingsUpdatePayload());
      setApiKey("");
      setClearApiKey(false);
      setAiFeedback(copy.actionSaved);
      router.refresh();
    } catch (submissionError) {
      setAiError(getApiErrorMessage(submissionError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTest() {
    setAiError(null);
    setAiFeedback(null);
    setIsTesting(true);
    try {
      const result = await testAiSettings(buildAiSettingsTestPayload());
      setAiFeedback(result.data.message);
    } catch (submissionError) {
      setAiError(getApiErrorMessage(submissionError));
    } finally {
      setIsTesting(false);
    }
  }

  async function handleTestAndSave() {
    setAiError(null);
    setAiFeedback(null);
    setIsTesting(true);
    try {
      const result = await testAiSettings(buildAiSettingsTestPayload());
      setAiFeedback(result.data.message);
      setIsTesting(false);
      setIsSaving(true);
      await updateAiSettings(buildAiSettingsUpdatePayload());
      setApiKey("");
      setClearApiKey(false);
      setAiFeedback(copy.actionSaved);
      router.refresh();
    } catch (submissionError) {
      setAiError(getApiErrorMessage(submissionError));
    } finally {
      setIsTesting(false);
      setIsSaving(false);
    }
  }

  // --- Mobile combined handler ---

  async function handleMobileSaveAll() {
    setAiError(null);
    setAiFeedback(null);
    setLangError(null);
    setLangFeedback(null);
    setIsTesting(true);

    try {
      const testResult = await testAiSettings(buildAiSettingsTestPayload());
      setAiFeedback(testResult.data.message);
    } catch (submissionError) {
      setAiError(getApiErrorMessage(submissionError));
      setIsTesting(false);
      return;
    }

    setIsTesting(false);
    setIsSaving(true);

    const errors: string[] = [];
    const [aiResult, langResult] = await Promise.allSettled([
      updateAiSettings(buildAiSettingsUpdatePayload()),
      updateAppPreferences({ ui_language: uiLanguage }),
    ]);

    if (aiResult.status === "rejected") {
      errors.push(getApiErrorMessage(aiResult.reason));
    } else {
      setApiKey("");
      setClearApiKey(false);
    }

    if (langResult.status === "rejected") {
      errors.push(getApiErrorMessage(langResult.reason));
    }

    setIsSaving(false);

    if (errors.length > 0) {
      setAiError(errors.join("; "));
    } else {
      setAiFeedback(copy.actionSaved);
      router.refresh();
    }
  }

  // --- Language handlers ---

  async function handleLangSave() {
    setLangError(null);
    setLangFeedback(null);
    setIsLangSaving(true);
    try {
      await updateAppPreferences({ ui_language: uiLanguage });
      setLangFeedback(copy.languageSaved);
      router.refresh();
    } catch (submissionError) {
      setLangError(getApiErrorMessage(submissionError));
    } finally {
      setIsLangSaving(false);
    }
  }

  // --- Account handlers ---

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountError(null);
    setAccountFeedback(null);
    setIsAccountBusy(true);
    try {
      const result = await registerAccount({
        display_name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
      });
      setAccountStatus({ logged_in: true, profile: result.data.profile });
      setEditName(result.data.profile.display_name);
      setEditEmail(result.data.profile.email);
      setRegName("");
      setRegEmail("");
      setRegPassword("");
      setAccountFeedback(copy.actionSaved);
    } catch (submissionError) {
      setAccountError(getApiErrorMessage(submissionError));
    } finally {
      setIsAccountBusy(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountError(null);
    setAccountFeedback(null);
    setIsAccountBusy(true);
    try {
      const result = await loginAccount({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      setAccountStatus({ logged_in: true, profile: result.data.profile });
      setEditName(result.data.profile.display_name);
      setEditEmail(result.data.profile.email);
      setLoginEmail("");
      setLoginPassword("");
      setAccountFeedback(copy.actionSaved);
    } catch (submissionError) {
      setAccountError(getApiErrorMessage(submissionError));
    } finally {
      setIsAccountBusy(false);
    }
  }

  async function handleUpdateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountError(null);
    setAccountFeedback(null);
    setIsAccountBusy(true);
    try {
      const payload: Parameters<typeof updateAccountProfile>[0] = {};
      if (editName.trim()) payload.display_name = editName.trim();
      if (editEmail.trim()) payload.email = editEmail.trim();
      if (editNewPassword) {
        payload.current_password = editCurrentPassword;
        payload.new_password = editNewPassword;
      }
      const result = await updateAccountProfile(payload);
      setAccountStatus({ logged_in: true, profile: result.data });
      setEditCurrentPassword("");
      setEditNewPassword("");
      setAccountFeedback(copy.actionSaved);
    } catch (submissionError) {
      setAccountError(getApiErrorMessage(submissionError));
    } finally {
      setIsAccountBusy(false);
    }
  }

  async function handleLogout() {
    logoutAccount();
    setAccountStatus({ logged_in: false, profile: null });
    setAccountFeedback(null);
    setAccountError(null);
  }

  async function handleDeleteAccount() {
    if (!confirm(copy.deleteAccountConfirm)) return;
    setAccountError(null);
    setIsAccountBusy(true);
    try {
      await deleteAccount();
      setAccountStatus({ logged_in: false, profile: null });
      setAccountFeedback(null);
    } catch (submissionError) {
      setAccountError(getApiErrorMessage(submissionError));
    } finally {
      setIsAccountBusy(false);
    }
  }

  // --- Render helpers ---

  function renderAccountSection() {
    if (!accountStatus) return null;

    if (accountStatus.logged_in && accountStatus.profile) {
      return (
        <>
          <h1>{copy.accountSectionTitle}</h1>
          <p className="settings-description">{copy.loggedInAs}</p>

          <div className="account-profile-card">
            <div className="profile-name">{accountStatus.profile.display_name}</div>
            <div className="profile-email">{accountStatus.profile.email}</div>
          </div>

          <h2 className="settings-sub-heading">{copy.editProfile}</h2>
          <form className="settings-form" onSubmit={handleUpdateProfile}>
            <label className="field">
              <span>{copy.displayName}</span>
              <input
                onChange={(e) => setEditName(e.target.value)}
                placeholder={copy.displayNamePlaceholder}
                type="text"
                value={editName}
              />
            </label>
            <label className="field">
              <span>{copy.emailLabel}</span>
              <input
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder={copy.emailPlaceholder}
                type="email"
                value={editEmail}
              />
            </label>
            <label className="field">
              <span>{copy.currentPasswordLabel}</span>
              <input
                onChange={(e) => setEditCurrentPassword(e.target.value)}
                placeholder=""
                type="password"
                value={editCurrentPassword}
              />
            </label>
            <label className="field">
              <span>{copy.newPasswordLabel}</span>
              <input
                onChange={(e) => setEditNewPassword(e.target.value)}
                placeholder={copy.newPasswordPlaceholder}
                type="password"
                value={editNewPassword}
              />
            </label>
            <div className="settings-actions">
              <button className="primary-button" disabled={isAccountBusy} type="submit">
                {isAccountBusy ? copy.updatingProfile : copy.updateProfile}
              </button>
            </div>
          </form>

          <div className="account-actions">
            <button className="secondary-button" onClick={handleLogout} type="button">
              <Icon name="log-out" width={16} height={16} />
              <span>{copy.logoutButton}</span>
            </button>
            <button className="danger-button" disabled={isAccountBusy} onClick={handleDeleteAccount} type="button">
              {copy.deleteAccount}
            </button>
          </div>

          {accountFeedback ? <p className="form-success">{accountFeedback}</p> : null}
          {accountError ? <p className="form-error">{accountError}</p> : null}
        </>
      );
    }

    // Guest state
    return (
      <>
        <h1>{copy.accountSectionTitle}</h1>
        <p className="settings-description">{copy.accountSectionDescription}</p>

        <div className="account-guest-card">
          <Icon name="user" width={24} height={24} />
          <div>
            <strong>{copy.guestMode}</strong>
            <p>{copy.guestModeDescription}</p>
          </div>
        </div>

        {accountMode === "register" ? (
          <>
            <h2 className="settings-sub-heading">{copy.createAccount}</h2>
            <form className="settings-form" onSubmit={handleRegister}>
              <label className="field">
                <span>{copy.displayName}</span>
                <input
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder={copy.displayNamePlaceholder}
                  required
                  type="text"
                  value={regName}
                />
              </label>
              <label className="field">
                <span>{copy.emailLabel}</span>
                <input
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder={copy.emailPlaceholder}
                  required
                  type="email"
                  value={regEmail}
                />
              </label>
              <label className="field">
                <span>{copy.passwordLabel}</span>
                <input
                  minLength={6}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder={copy.passwordPlaceholder}
                  required
                  type="password"
                  value={regPassword}
                />
              </label>
              <div className="settings-actions">
                <button className="primary-button" disabled={isAccountBusy} type="submit">
                  {isAccountBusy ? copy.registering : copy.createAccount}
                </button>
              </div>
            </form>
            <button className="account-mode-switch" onClick={() => setAccountMode("login")} type="button">
              {copy.alreadyHaveAccount}
            </button>
          </>
        ) : (
          <>
            <h2 className="settings-sub-heading">{copy.loginButton}</h2>
            <form className="settings-form" onSubmit={handleLogin}>
              <label className="field">
                <span>{copy.emailLabel}</span>
                <input
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder={copy.emailPlaceholder}
                  required
                  type="email"
                  value={loginEmail}
                />
              </label>
              <label className="field">
                <span>{copy.passwordLabel}</span>
                <input
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder={copy.passwordPlaceholder}
                  required
                  type="password"
                  value={loginPassword}
                />
              </label>
              <div className="settings-actions">
                <button className="primary-button" disabled={isAccountBusy} type="submit">
                  {isAccountBusy ? copy.loggingIn : copy.loginButton}
                </button>
              </div>
            </form>
            <button className="account-mode-switch" onClick={() => setAccountMode("register")} type="button">
              {copy.noAccountYet}
            </button>
          </>
        )}

        {accountFeedback ? <p className="form-success">{accountFeedback}</p> : null}
        {accountError ? <p className="form-error">{accountError}</p> : null}
      </>
    );
  }

  function renderAiProviderSection() {
    return (
      <>
        <h1>{copy.providerSectionTitle}</h1>
        <p className="settings-description">{copy.providerSectionDescription}</p>

        <form className="settings-form" onSubmit={handleAiSave}>
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

          <div className="settings-actions">
            <button className="secondary-button" disabled={isTesting || isSaving} onClick={() => void handleTest()} type="button">
              {isTesting ? copy.testing : copy.testConnection}
            </button>
            <button className="primary-button" disabled={isSaving || isTesting} type="submit">
              {isSaving ? copy.saving : copy.saveSettings}
            </button>
          </div>
        </form>

        {aiFeedback ? <p className="form-success">{aiFeedback}</p> : null}
        {aiError ? <p className="form-error">{aiError}</p> : null}
      </>
    );
  }

  function renderLanguageSection() {
    return (
      <>
        <h1>{copy.languageSectionTitle}</h1>
        <p className="settings-description">{copy.languageSectionDescription}</p>

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
          <button className="primary-button" disabled={isLangSaving} onClick={() => void handleLangSave()} type="button">
            {isLangSaving ? copy.saving : copy.saveSettings}
          </button>
        </div>

        {langFeedback ? <p className="form-success">{langFeedback}</p> : null}
        {langError ? <p className="form-error">{langError}</p> : null}
      </>
    );
  }

  return (
    <div className="settings-screen">
      {/* Desktop layout */}
      <div className="settings-desktop-frame">
        <aside className="settings-sidebar">
          <div className="settings-sidebar-title">{copy.settings}</div>
          <button
            className={`settings-nav-item${activeSection === "account" ? " active" : ""}`}
            onClick={() => setActiveSection("account")}
            type="button"
          >
            <Icon name="user" width={16} height={16} />
            <span>{copy.accountLabel}</span>
          </button>
          <button
            className={`settings-nav-item${activeSection === "ai-provider" ? " active" : ""}`}
            onClick={() => setActiveSection("ai-provider")}
            type="button"
          >
            <Icon name="cpu" width={16} height={16} />
            <span>{copy.aiProvider}</span>
          </button>
          <button
            className={`settings-nav-item${activeSection === "language" ? " active" : ""}`}
            onClick={() => setActiveSection("language")}
            type="button"
          >
            <Icon name="brush" width={16} height={16} />
            <span>{copy.uiLanguage}</span>
          </button>
          <Link className="settings-nav-item backlink" href="/inspirations">
            <Icon name="layout" width={16} height={16} />
            <span>{copy.backToWorkspace}</span>
          </Link>
        </aside>

        <main className="settings-content">
          {activeSection === "account" && renderAccountSection()}
          {activeSection === "ai-provider" && renderAiProviderSection()}
          {activeSection === "language" && renderLanguageSection()}
        </main>
      </div>

      {/* Mobile layout */}
      <div className="settings-mobile-frame">
        <div className="settings-mobile-topbar">
          <h1>{copy.settings}</h1>
        </div>

        {/* Account section (mobile) */}
        <div className="settings-mobile-section">
          <h2>{copy.accountLabel}</h2>
          {accountStatus?.logged_in && accountStatus.profile ? (
            <div className="mobile-list-group">
              <div className="mobile-list-item">
                <span>{copy.displayName}</span>
                <span className="mobile-value">{accountStatus.profile.display_name}</span>
              </div>
              <div className="mobile-list-item">
                <span>{copy.emailLabel}</span>
                <span className="mobile-value">{accountStatus.profile.email}</span>
              </div>
              <div className="mobile-list-item">
                <button className="account-mode-switch" onClick={handleLogout} type="button">
                  {copy.logoutButton}
                </button>
              </div>
            </div>
          ) : (
            <div className="mobile-list-group">
              <div className="mobile-list-item">
                <span>{copy.guestMode}</span>
                <button
                  className="account-mode-switch"
                  onClick={() => setActiveSection("account")}
                  type="button"
                >
                  {copy.createAccount}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* AI Provider section (mobile) */}
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

        {/* API Key section (mobile) */}
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

        {/* Language section (mobile) */}
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
            disabled={isSaving || isTesting || isLangSaving}
            onClick={() => void handleMobileSaveAll()}
            type="button"
          >
            {isSaving || isLangSaving ? copy.saving : copy.saveAndTest}
          </button>
        </div>

        {aiFeedback ? <p className="form-success">{aiFeedback}</p> : null}
        {aiError ? <p className="form-error">{aiError}</p> : null}
      </div>
    </div>
  );
}
