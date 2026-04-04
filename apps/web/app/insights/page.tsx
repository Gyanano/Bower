import { AppShell } from "@/components/layout/app-shell";
import { Footer } from "@/components/layout/footer";
import { PageHero } from "@/components/layout/page-hero";
import { getAllInspirations, getAppPreferences, getBoards, type InsightsWarningReason } from "@/lib/api";
import { formatUtcTimestamp } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";

const failedInsightsResult = {
  items: [],
  incomplete: true,
  warningReasons: ["request_failed"] as InsightsWarningReason[],
};

export default async function InsightsPage() {
  const [preferencesResult, boardsResult, activeResult, archivedResult] = await Promise.allSettled([
    getAppPreferences(),
    getBoards(),
    getAllInspirations("active"),
    getAllInspirations("archived"),
  ]);

  const preferences = preferencesResult.status === "fulfilled"
    ? preferencesResult.value.data
    : { ui_language: "zh-CN" as const, updated_at: null };
  const copy = getDictionary(preferences.ui_language);
  const boards = boardsResult.status === "fulfilled" ? boardsResult.value.data : [];
  const activeData = activeResult.status === "fulfilled" ? activeResult.value : failedInsightsResult;
  const archivedData = archivedResult.status === "fulfilled" ? archivedResult.value : failedInsightsResult;
  const allItems = [...activeData.items, ...archivedData.items];
  const hasIncompleteInsights = activeData.incomplete || archivedData.incomplete;
  const insightsWarningMessages = [...new Set([...activeData.warningReasons, ...archivedData.warningReasons])].map((reason) => {
    switch (reason) {
      case "request_limit_reached":
        return copy.insightsLimitReachedWarning;
      case "request_failed":
      default:
        return copy.insightsLoadIssueWarning;
    }
  });
  const analyzedCount = allItems.filter((item) => item.analysis_status === "completed").length;
  const recentAnalysisItems = [...allItems]
    .filter((item) => item.analysis_status === "completed" && item.analyzed_at)
    .sort((left, right) => Date.parse(right.analyzed_at ?? "") - Date.parse(left.analyzed_at ?? ""))
    .slice(0, 6);
  const tagMap = new Map<string, number>();

  for (const item of allItems) {
    const tags = preferences.ui_language === "en" ? item.analysis_tags_en : item.analysis_tags_zh;
    for (const tag of tags) {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    }
  }

  const topTags = [...tagMap.entries()].sort((left, right) => right[1] - left[1]).slice(0, 8);

  return (
    <AppShell copy={copy}>
      <PageHero title={copy.heroStudioTitle} subtitle={copy.heroStudioSubtitle} />

      <div className="px-6 lg:px-12 max-w-6xl mx-auto pb-12">
        {hasIncompleteInsights && (
          <div className="mb-6 p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-sm text-destructive/80 leading-relaxed">
            {copy.insightsIncompleteWarning}
            {insightsWarningMessages.length ? ` (${insightsWarningMessages.join(" · ")})` : ""}
          </div>
        )}

        {/* Metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <article className="p-6 rounded-lg border border-border bg-card">
            <span className="font-label text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {copy.totalReferences}
            </span>
            <strong className="block mt-3 font-headline text-4xl tracking-tight text-primary">
              {allItems.length}
            </strong>
          </article>
          <article className="p-6 rounded-lg border border-border bg-card">
            <span className="font-label text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {copy.analyzedReferences}
            </span>
            <strong className="block mt-3 font-headline text-4xl tracking-tight text-primary">
              {analyzedCount}
            </strong>
          </article>
        </div>

        {/* Detail grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Board distribution */}
          <article className="p-6 rounded-lg border border-border bg-card space-y-4">
            <h2 className="font-headline text-lg uppercase tracking-[0.08em] text-primary">
              {copy.boardDistribution}
            </h2>
            <div className="space-y-3">
              {boards.map((board) => (
                <div key={board.id} className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{board.name}</span>
                  <strong className="text-sm text-primary">
                    {allItems.filter((item) => item.board_id === board.id).length}
                  </strong>
                </div>
              ))}
            </div>
          </article>

          {/* Top tags */}
          <article className="p-6 rounded-lg border border-border bg-card space-y-4">
            <h2 className="font-headline text-lg uppercase tracking-[0.08em] text-primary">
              {copy.topTags}
            </h2>
            <div className="flex flex-wrap gap-2">
              {topTags.map(([tag, count]) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface text-sm text-muted-foreground"
                >
                  {tag} <span className="text-primary/50">·</span> {count}
                </span>
              ))}
            </div>
          </article>

          {/* Recent analysis */}
          <article className="p-6 rounded-lg border border-border bg-card space-y-4">
            <h2 className="font-headline text-lg uppercase tracking-[0.08em] text-primary">
              {copy.recentAnalysis}
            </h2>
            <div className="space-y-3">
              {recentAnalysisItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center gap-2">
                  <span className="text-sm text-muted-foreground truncate">
                    {item.title || item.original_filename}
                  </span>
                  <strong className="text-xs text-primary/60 whitespace-nowrap">
                    {item.analyzed_at ? formatUtcTimestamp(item.analyzed_at, preferences.ui_language) : copy.analyzeReady}
                  </strong>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>

      <Footer copy={copy} />
    </AppShell>
  );
}
