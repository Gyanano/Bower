import { ArchiveView } from "@/components/archive/archive-view";
import { CollectionsView } from "@/components/collections/collections-view";
import { TimelineView } from "@/components/timeline/timeline-view";
import {
  getApiErrorMessage,
  getAppPreferences,
  getBoards,
  getInspiration,
  getInspirations,
} from "@/lib/api";
import { getDictionary } from "@/lib/i18n";

export default async function InspirationsPage({ searchParams }: PageProps<"/inspirations">) {
  const params = searchParams ? await searchParams : undefined;
  const view = typeof params?.view === "string" ? params.view : undefined;
  const status = params?.status === "archived" ? "archived" : "active";
  const query = typeof params?.q === "string" ? params.q : "";
  const boardId = typeof params?.board === "string" ? params.board : "";
  const selectedId = typeof params?.selected === "string" ? params.selected : "";

  const [preferencesResult, boardsResult, listResult] = await Promise.allSettled([
    getAppPreferences(),
    getBoards(),
    getInspirations({
      board_id: boardId || undefined,
      q: query || undefined,
      status,
    }),
  ]);

  const language = preferencesResult.status === "fulfilled" ? preferencesResult.value.data.ui_language : "zh-CN";
  const copy = getDictionary(language);
  const boards = boardsResult.status === "fulfilled" ? boardsResult.value.data : [];

  if (listResult.status === "rejected") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <h1 className="font-headline text-3xl uppercase tracking-[0.15em] text-primary">
            {copy.allInspirations}
          </h1>
          <p className="text-muted-foreground">{getApiErrorMessage(listResult.reason)}</p>
        </div>
      </main>
    );
  }

  const items = listResult.value.data;

  const selectedItem =
    selectedId
      ? await getInspiration(selectedId)
          .then((result) => result.data)
          .catch(() => null)
      : null;

  if (view === "collections") {
    return (
      <CollectionsView
        boards={boards}
        items={items}
        language={language}
        copy={copy}
      />
    );
  }

  if (view === "timeline") {
    return (
      <TimelineView
        items={items}
        language={language}
        copy={copy}
      />
    );
  }

  return (
    <ArchiveView
      boards={boards}
      language={language}
      query={query}
      selectedItem={selectedItem}
      status={status}
      items={items}
      copy={copy}
    />
  );
}
