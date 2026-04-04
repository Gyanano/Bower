"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  AUTH_STATE_EVENT,
  deleteAccount,
  getAccountStatus,
  getApiErrorMessage,
  loginAccount,
  logoutAccount,
  registerAccount,
  updateAccountProfile,
  type AccountStatus,
} from "@/lib/api";
import type { CopyDictionary } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AccountCard({ copy }: { copy: CopyDictionary }) {
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [mode, setMode] = useState<"register" | "login">("register");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function refreshAccountStatus() {
    try {
      const result = await getAccountStatus();
      setAccountStatus(result.data);
      if (result.data.profile) {
        setProfileName(result.data.profile.display_name);
        setProfileEmail(result.data.profile.email);
      }
    } catch {
      setAccountStatus({ logged_in: false, profile: null });
    }
  }

  useEffect(() => {
    void refreshAccountStatus();

    function handleAuthStateChange() {
      void refreshAccountStatus();
    }

    window.addEventListener("storage", handleAuthStateChange);
    window.addEventListener(AUTH_STATE_EVENT, handleAuthStateChange);
    return () => {
      window.removeEventListener("storage", handleAuthStateChange);
      window.removeEventListener(AUTH_STATE_EVENT, handleAuthStateChange);
    };
  }, []);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFeedback(null);
    setIsBusy(true);
    try {
      const result = await registerAccount({
        display_name: displayName.trim(),
        email: email.trim(),
        password,
      });
      setAccountStatus({ logged_in: true, profile: result.data.profile });
      setProfileName(result.data.profile.display_name);
      setProfileEmail(result.data.profile.email);
      setDisplayName("");
      setEmail("");
      setPassword("");
      setFeedback(copy.accountReady);
    } catch (submissionError) {
      setError(getApiErrorMessage(submissionError));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFeedback(null);
    setIsBusy(true);
    try {
      const result = await loginAccount({
        email: email.trim(),
        password,
      });
      setAccountStatus({ logged_in: true, profile: result.data.profile });
      setProfileName(result.data.profile.display_name);
      setProfileEmail(result.data.profile.email);
      setEmail("");
      setPassword("");
      setFeedback(copy.accountReady);
    } catch (submissionError) {
      setError(getApiErrorMessage(submissionError));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFeedback(null);
    setIsBusy(true);

    try {
      const result = await updateAccountProfile({
        display_name: profileName.trim(),
        email: profileEmail.trim(),
        current_password: currentPassword || undefined,
        new_password: newPassword || undefined,
      });
      setAccountStatus({ logged_in: true, profile: result.data });
      setProfileName(result.data.display_name);
      setProfileEmail(result.data.email);
      setCurrentPassword("");
      setNewPassword("");
      setFeedback(copy.profileSaved);
    } catch (submissionError) {
      setError(getApiErrorMessage(submissionError));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDeleteAccount() {
    if (!window.confirm(copy.deleteAccountConfirm)) {
      return;
    }

    setError(null);
    setFeedback(null);
    setIsBusy(true);
    try {
      await deleteAccount();
      setAccountStatus({ logged_in: false, profile: null });
      setProfileName("");
      setProfileEmail("");
      setCurrentPassword("");
      setNewPassword("");
      setFeedback(copy.accountDeleted);
    } catch (submissionError) {
      setError(getApiErrorMessage(submissionError));
    } finally {
      setIsBusy(false);
    }
  }

  function handleLogout() {
    logoutAccount();
    setAccountStatus({ logged_in: false, profile: null });
    setFeedback(copy.loggedOut);
    setError(null);
    setCurrentPassword("");
    setNewPassword("");
  }

  const loggedInProfile = accountStatus?.profile;

  if (loggedInProfile) {
    return (
      <section className="space-y-5 rounded-[1.5rem] border border-border bg-card p-5 shadow-card lg:p-6">
        <div className="space-y-1">
          <h2 className="font-headline text-2xl text-primary">{copy.accountLabel}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{copy.accountDescription}</p>
        </div>

        <div className="rounded-xl bg-surface px-4 py-3">
          <p className="font-headline text-lg text-primary">{loggedInProfile.display_name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{loggedInProfile.email}</p>
        </div>

        <form className="space-y-4" onSubmit={handleProfileSave}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="font-label text-[10px] font-semibold uppercase tracking-[0.3em] text-foreground">
                {copy.displayName}
              </span>
              <Input value={profileName} onChange={(event) => setProfileName(event.target.value)} />
            </label>
            <label className="space-y-1.5">
              <span className="font-label text-[10px] font-semibold uppercase tracking-[0.3em] text-foreground">
                {copy.emailAddress}
              </span>
              <Input type="email" value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="font-label text-[10px] font-semibold uppercase tracking-[0.3em] text-foreground">
                {copy.currentPassword}
              </span>
              <Input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </label>
            <label className="space-y-1.5">
              <span className="font-label text-[10px] font-semibold uppercase tracking-[0.3em] text-foreground">
                {copy.newPassword}
              </span>
              <Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            </label>
          </div>

          {feedback ? <p className="text-sm text-success">{feedback}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button type="submit" disabled={isBusy} className="bg-primary text-primary-foreground">
              {isBusy ? copy.saving : copy.saveProfile}
            </Button>
            <Button type="button" variant="outline" disabled={isBusy} onClick={handleLogout}>
              {copy.logoutButton}
            </Button>
            <Button type="button" variant="outline" disabled={isBusy} onClick={() => void handleDeleteAccount()}>
              {copy.deleteAccountButton}
            </Button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-[1.5rem] border border-border bg-card p-5 shadow-card lg:p-6">
      <div className="space-y-1">
        <h2 className="font-headline text-2xl text-primary">{copy.accountLabel}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{copy.accountGuestHint}</p>
      </div>

      <div className="inline-flex rounded-full border border-border p-1">
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`rounded-full px-4 py-2 text-sm transition-colors ${mode === "register" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          {copy.registerButton}
        </button>
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-full px-4 py-2 text-sm transition-colors ${mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          {copy.loginButton}
        </button>
      </div>

      <form className="space-y-4" onSubmit={mode === "register" ? handleRegister : handleLogin}>
        {mode === "register" ? (
          <label className="space-y-1.5">
            <span className="font-label text-[10px] font-semibold uppercase tracking-[0.3em] text-foreground">
              {copy.displayName}
            </span>
            <Input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={copy.displayNamePlaceholder}
              required
            />
          </label>
        ) : null}

        <label className="space-y-1.5">
          <span className="font-label text-[10px] font-semibold uppercase tracking-[0.3em] text-foreground">
            {copy.emailAddress}
          </span>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={copy.emailPlaceholder}
            required
          />
        </label>

        <label className="space-y-1.5">
          <span className="font-label text-[10px] font-semibold uppercase tracking-[0.3em] text-foreground">
            {copy.passwordField}
          </span>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={copy.passwordPlaceholder}
            required
          />
        </label>

        {feedback ? <p className="text-sm text-success">{feedback}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button type="submit" disabled={isBusy} className="bg-primary text-primary-foreground">
          {isBusy ? (mode === "register" ? copy.registering : copy.loggingIn) : (mode === "register" ? copy.registerButton : copy.loginButton)}
        </Button>
      </form>
    </section>
  );
}
