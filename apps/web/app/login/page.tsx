import { LoginPanel } from "@/components/auth/login-panel";
import { AppShell } from "@/components/layout/app-shell";
import { Footer } from "@/components/layout/footer";
import { PageHero } from "@/components/layout/page-hero";
import { getAppPreferences } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";

export default async function LoginPage() {
  const preferences = await getAppPreferences()
    .then((result) => result.data)
    .catch(() => ({ ui_language: "zh-CN" as const, updated_at: null }));
  const copy = getDictionary(preferences.ui_language);

  return (
    <AppShell copy={copy}>
      <PageHero title={copy.signIn} subtitle={copy.localOnlyAccessNote} />
      <div className="mx-auto max-w-xl px-6 pb-16">
        <LoginPanel copy={copy} />
      </div>
      <Footer copy={copy} />
    </AppShell>
  );
}
