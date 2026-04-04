import { AppShell } from "@/components/layout/app-shell";
import { Footer } from "@/components/layout/footer";
import { PageHero } from "@/components/layout/page-hero";
import { SettingsClient } from "@/components/settings-client";
import {
  getAiSettings,
  getAppPreferences,
} from "@/lib/api";
import { getDictionary } from "@/lib/i18n";

export default async function SettingsPage() {
  const [preferencesResult, settingsResult] = await Promise.allSettled([
    getAppPreferences(),
    getAiSettings(),
  ]);

  const preferences = preferencesResult.status === "fulfilled"
    ? preferencesResult.value.data
    : { ui_language: "zh-CN" as const, updated_at: null };
  const copy = getDictionary(preferences.ui_language);

  return (
    <AppShell copy={copy}>
      <PageHero title={copy.settings} subtitle={copy.providerSectionDescription} />
      <SettingsClient
        copy={copy}
        preferences={preferences}
        settings={settingsResult.status === "fulfilled"
          ? settingsResult.value.data
          : {
              provider: null,
              provider_source: null,
              model_id: null,
              has_api_key: false,
              api_key_mask: null,
              api_key_source: null,
              updated_at: null,
            }}
      />
      <Footer copy={copy} />
    </AppShell>
  );
}
