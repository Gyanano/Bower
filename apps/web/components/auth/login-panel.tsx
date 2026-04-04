"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AUTH_STATE_EVENT,
  getAccountStatus,
  getApiErrorMessage,
  loginAccount,
  logoutAccount,
  registerAccount,
  type AccountStatus,
} from "@/lib/api";
import type { CopyDictionary } from "@/lib/i18n";

export function LoginPanel({ copy }: { copy: CopyDictionary }) {
  const router = useRouter();
  const [mode, setMode] = useState<"register" | "login">("register");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);

  useEffect(() => {
    async function loadAccountStatus() {
      try {
        const result = await getAccountStatus();
        setAccountStatus(result.data);
      } catch {
        setAccountStatus({ logged_in: false, profile: null });
      }
    }

    function handleAuthStateChange() {
      void loadAccountStatus();
    }

    void loadAccountStatus();
    window.addEventListener("storage", handleAuthStateChange);
    window.addEventListener(AUTH_STATE_EVENT, handleAuthStateChange);

    return () => {
      window.removeEventListener("storage", handleAuthStateChange);
      window.removeEventListener(AUTH_STATE_EVENT, handleAuthStateChange);
    };
  }, []);

  function handleSignOut() {
    logoutAccount();
    setEmail("");
    setPassword("");
    setFeedback(copy.loggedOut);
    setError(null);
    setAccountStatus({ logged_in: false, profile: null });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFeedback(null);
    setIsBusy(true);
    try {
      if (mode === "register") {
        const result = await registerAccount({
          display_name: displayName.trim(),
          email: email.trim(),
          password,
        });
        setAccountStatus({ logged_in: true, profile: result.data.profile });
      } else {
        const result = await loginAccount({
          email: email.trim(),
          password,
        });
        setAccountStatus({ logged_in: true, profile: result.data.profile });
      }
      setDisplayName("");
      setEmail("");
      setPassword("");
      setFeedback(copy.accountReady);
      router.push("/inspirations");
    } catch (submissionError) {
      setError(getApiErrorMessage(submissionError));
    } finally {
      setIsBusy(false);
    }
  }

  if (accountStatus?.profile) {
    return (
      <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-card lg:p-8">
        <p className="font-headline text-2xl text-primary">{accountStatus.profile.display_name}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {accountStatus.profile.email}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {copy.accountReady}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild className="bg-primary text-primary-foreground">
            <Link href="/inspirations">{copy.continueToWorkspace}</Link>
          </Button>
          <Button type="button" variant="outline" onClick={handleSignOut}>
            {copy.clearLocalAccess}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-card lg:p-8">
      <div className="mb-5 inline-flex rounded-full border border-border p-1">
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

      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === "register" ? (
          <div className="space-y-1.5">
            <label className="font-label text-[10px] font-semibold uppercase tracking-[0.3em] text-foreground">
              {copy.displayName}
            </label>
            <Input
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={copy.displayNamePlaceholder}
              value={displayName}
            />
          </div>
        ) : null}

        <div className="space-y-1.5">
          <label className="font-label text-[10px] font-semibold uppercase tracking-[0.3em] text-foreground">
            {copy.emailAddress}
          </label>
          <Input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder={copy.emailPlaceholder}
            type="email"
            value={email}
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-label text-[10px] font-semibold uppercase tracking-[0.3em] text-foreground">
            {copy.passwordField}
          </label>
          <Input
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder={copy.passwordPlaceholder}
            type="password"
            value={password}
          />
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {copy.accountGuestHint}
        </p>

        {feedback ? <p className="text-sm text-success">{feedback}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button type="submit" disabled={isBusy} className="w-full bg-primary text-primary-foreground">
          {isBusy ? (mode === "register" ? copy.registering : copy.loggingIn) : (mode === "register" ? copy.registerButton : copy.loginButton)}
        </Button>
      </form>
    </div>
  );
}
