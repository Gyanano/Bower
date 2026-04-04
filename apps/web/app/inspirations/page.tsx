import { WorkspaceClient } from "@/components/workspace-client";
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
  const status = params?.status === "archived" ? "archived" : "active";
  const query = typeof params?.q === "string" ? params.q : "";
  const boardId = typeof params?.board === "string" ? params.board : "";
  const selectedId = typeof params?.selected === "string" ? params.selected : "";
  const composeOpen = params?.compose === "1";

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

  if (listResult.status === "rejected") {
    return (
      <main className="page-state">
        <h1>{copy.allInspirations}</h1>
        <p>{getApiErrorMessage(listResult.reason)}</p>
      </main>
    );
  }

  const selectedItem =
    selectedId
      ? await getInspiration(selectedId)
          .then((result) => result.data)
          .catch(() => null)
      : null;

  return (
    <WorkspaceClient
      boards={boardsResult.status === "fulfilled" ? boardsResult.value.data : []}
      composeOpen={composeOpen}
      copy={copy}
      items={listResult.value.data}
      language={language}
      query={query}
      selectedItem={selectedItem}
      status={status}
    />
  );
}
