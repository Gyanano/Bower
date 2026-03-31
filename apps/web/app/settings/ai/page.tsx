import { AISettingsForm } from "@/components/ai-settings-form";
import { getAiSettings, getApiErrorMessage } from "@/lib/api";

export default async function AISettingsPage() {
  try {
    const result = await getAiSettings();

    return (
      <main className="stack">
        <section className="card stack">
          <h1>AI settings</h1>
          <p className="muted">
            Manage the single active provider for image analysis. This MVP supports OpenAI, Anthropic, Google AI Studio, and ByteDance Volcano / Ark.
          </p>
        </section>
        <AISettingsForm settings={result.data} />
      </main>
    );
  } catch (error) {
    return (
      <main className="stack">
        <section className="card stack">
          <h1>AI settings</h1>
          <p className="muted">Could not load AI settings right now.</p>
          <p className="error">{getApiErrorMessage(error)}</p>
        </section>
      </main>
    );
  }
}
