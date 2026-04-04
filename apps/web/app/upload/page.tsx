import { AppShell } from "@/components/layout/app-shell";
import { UploadPagePanel } from "@/components/archive/upload-page-panel";
import { Footer } from "@/components/layout/footer";
import { PageHero } from "@/components/layout/page-hero";
import { getAppPreferences } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";

export default async function UploadPage() {
  const preferences = await getAppPreferences()
    .then((result) => result.data)
    .catch(() => ({ ui_language: "zh-CN" as const, updated_at: null }));
  const copy = getDictionary(preferences.ui_language);

  return (
    <AppShell copy={copy}>
      <PageHero title={copy.uploadTitle} subtitle={copy.uploadPageDescription} />
      <div className="mx-auto max-w-2xl px-6 pb-16">
        <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-card lg:p-8">
          <UploadPagePanel copy={copy} />
        </div>
      </div>
      <Footer copy={copy} />
    </AppShell>
  );
}
