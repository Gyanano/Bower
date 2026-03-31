import Link from "next/link";
import { Icon } from "@/components/icons";
import { getAppPreferences, getBoards, getInspirations } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";

export default async function InsightsPage() {
  const [preferencesResult, boardsResult, activeResult, archivedResult] = await Promise.allSettled([
    getAppPreferences(),
    getBoards(),
    getInspirations({ status: "active", limit: 100 }),
    getInspirations({ status: "archived", limit: 100 }),
  ]);

  const preferences = preferencesResult.status === "fulfilled"
    ? preferencesResult.value.data
    : { ui_language: "zh-CN" as const, updated_at: null };
  const copy = getDictionary(preferences.ui_language);
  const boards = boardsResult.status === "fulfilled" ? boardsResult.value.data : [];
  const activeItems = activeResult.status === "fulfilled" ? activeResult.value.data : [];
  const archivedItems = archivedResult.status === "fulfilled" ? archivedResult.value.data : [];
  const allItems = [...activeItems, ...archivedItems];
  const analyzedCount = allItems.filter((item) => item.analysis_status === "completed").length;
  const tagMap = new Map<string, number>();

  for (const item of allItems) {
    const tags = preferences.ui_language === "en" ? item.analysis_tags_en : item.analysis_tags_zh;
    for (const tag of tags) {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    }
  }

  const topTags = [...tagMap.entries()].sort((left, right) => right[1] - left[1]).slice(0, 8);

  return (
    <div className="workspace-screen">
      <div className="workspace-body">
        <aside className="workspace-sidebar">
          <div>
            <p className="sidebar-label">Library</p>
            <Link className="sidebar-link" href="/inspirations">
              <Icon name="layout" width={16} height={16} />
              <span>{copy.allInspirations}</span>
            </Link>
            <Link className="sidebar-link active" href="/insights">
              <Icon name="sparkles" width={16} height={16} />
              <span>{copy.insights}</span>
            </Link>

            <p className="sidebar-label boards">Boards</p>
            {boards.map((board) => (
              <Link className="sidebar-link" href={`/inspirations?board=${board.id}`} key={board.id}>
                <span className="sidebar-board-mark" />
                <span>{board.name}</span>
              </Link>
            ))}
          </div>

          <Link className="sidebar-link" href="/settings?section=ai">
            <Icon name="settings" width={16} height={16} />
            <span>{copy.openSettings}</span>
          </Link>
        </aside>

        <main className="workspace-main workspace-main-full">
          <div className="insights-page insights-page-shell">
            <header className="insights-header">
              <div>
                <h1>{copy.insightsHeadline}</h1>
                <p>{copy.insightsDescription}</p>
              </div>
            </header>

            <section className="insights-metrics">
              <article className="insight-card">
                <span>{copy.totalReferences}</span>
                <strong>{allItems.length}</strong>
              </article>
              <article className="insight-card">
                <span>{copy.analyzedReferences}</span>
                <strong>{analyzedCount}</strong>
              </article>
            </section>

            <section className="insights-grid">
              <article className="insight-card">
                <h2>{copy.boardDistribution}</h2>
                <div className="insight-list">
                  {boards.map((board) => (
                    <div className="insight-row" key={board.id}>
                      <span>{board.name}</span>
                      <strong>{allItems.filter((item) => item.board_id === board.id).length}</strong>
                    </div>
                  ))}
                </div>
              </article>

              <article className="insight-card">
                <h2>{copy.topTags}</h2>
                <div className="insight-tags">
                  {topTags.map(([tag, count]) => (
                    <span className="insight-tag" key={tag}>
                      {tag} · {count}
                    </span>
                  ))}
                </div>
              </article>

              <article className="insight-card">
                <h2>{copy.recentAnalysis}</h2>
                <div className="insight-list">
                  {allItems.slice(0, 6).map((item) => (
                    <div className="insight-row" key={item.id}>
                      <span>{item.title || item.original_filename}</span>
                      <strong>{item.analysis_status}</strong>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
