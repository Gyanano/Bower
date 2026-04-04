"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Footer } from "@/components/layout/footer";
import { PageHero } from "@/components/layout/page-hero";
import { InspirationCard } from "./inspiration-card";
import { FilterBar } from "./filter-bar";
import { InspectorPanel } from "./inspector-panel";
import { UploadDialog } from "./upload-dialog";
import {
  analyzeInspiration,
  archiveInspiration,
  deleteInspiration,
  getApiOrigin,
  getApiErrorMessage,
  updateInspiration,
  type Board,
  type InspirationDetail,
  type InspirationListItem,
  type UILanguage,
} from "@/lib/api";
import { type CopyDictionary, getAnalysisLanguage } from "@/lib/i18n";

function resolveFileUrl(fileUrl: string) {
  if (!fileUrl) return "";
  return fileUrl.startsWith("http://") || fileUrl.startsWith("https://")
    ? fileUrl
    : `${getApiOrigin()}${fileUrl}`;
}

export function ArchiveView({
  boards,
  language,
  query,
  selectedItem,
  status,
  items,
  copy,
}: {
  boards: Board[];
  language: UILanguage;
  query: string;
  selectedItem: InspirationDetail | null;
  status: "active" | "archived";
  items: InspirationListItem[];
  copy: CopyDictionary;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<string | null>(null);
  const [analysisLanguage, setAnalysisLanguage] = useState<"en" | "zh">(getAnalysisLanguage(language));
  const [boardSelection, setBoardSelection] = useState(selectedItem?.board_id ?? "");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUpdatingBoard, setIsUpdatingBoard] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const selectedBoardId = searchParams.get("board") ?? "";
  const selectedBoard = boards.find((b) => b.id === selectedBoardId) ?? null;

  const promptValue =
    analysisLanguage === "en" ? selectedItem?.analysis_prompt_en ?? "" : selectedItem?.analysis_prompt_zh ?? "";
  const tagsValue =
    analysisLanguage === "en" ? selectedItem?.analysis_tags_en ?? [] : selectedItem?.analysis_tags_zh ?? [];
  const shareableTags = useMemo(() => tagsValue.join(", "), [tagsValue]);

  const filteredItems = useMemo(() => {
    if (!selectedBoardId) {
      return items;
    }

    return items.filter((item) => item.board_id === selectedBoardId);
  }, [items, selectedBoardId]);

  const availableBoards = useMemo(() => {
    const boardCounts = new Map<string, number>();
    for (const item of items) {
      if (item.board_id) {
        boardCounts.set(item.board_id, (boardCounts.get(item.board_id) ?? 0) + 1);
      }
    }
    return boards
      .filter((board) => boardCounts.has(board.id))
      .sort((left, right) => {
        const rightCount = boardCounts.get(right.id) ?? 0;
        const leftCount = boardCounts.get(left.id) ?? 0;
        return rightCount - leftCount || left.name.localeCompare(right.name);
      });
  }, [boards, items]);

  useEffect(() => {
    setAnalysisLanguage(getAnalysisLanguage(language));
  }, [language]);

  useEffect(() => {
    setBoardSelection(selectedItem?.board_id ?? "");
  }, [selectedItem?.board_id, selectedItem?.id]);

  const buildHref = useCallback(
    (overrides: Record<string, string | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(overrides)) {
        if (value === null || value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const nextQuery = params.toString();
      return nextQuery ? `/inspirations?${nextQuery}` : "/inspirations";
    },
    [searchParams],
  );

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  }

  async function handleCopyText(value: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      showToast(copy.actionCopied);
    } catch {
      showToast(copy.clipboardUnavailable);
    }
  }

  async function handleBoardChange(nextBoardId: string) {
    if (!selectedItem) return;
    setBoardSelection(nextBoardId);
    setIsUpdatingBoard(true);
    try {
      await updateInspiration(selectedItem.id, { board_id: nextBoardId || null });
      router.refresh();
      showToast(copy.actionSaved);
    } catch (error) {
      setBoardSelection(selectedItem.board_id ?? "");
      showToast(getApiErrorMessage(error));
    } finally {
      setIsUpdatingBoard(false);
    }
  }

  async function handleAnalyze() {
    if (!selectedItem) return;
    setIsAnalyzing(true);
    try {
      const p = analyzeInspiration(selectedItem.id);
      router.refresh();
      await p;
      router.refresh();
    } catch (error) {
      showToast(getApiErrorMessage(error));
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleArchive() {
    if (!selectedItem) return;
    setIsArchiving(true);
    try {
      await archiveInspiration(selectedItem.id);
      router.push(buildHref({ selected: null }));
      router.refresh();
      showToast(copy.actionArchived);
    } catch (error) {
      showToast(getApiErrorMessage(error));
    } finally {
      setIsArchiving(false);
    }
  }

  async function handleDelete() {
    if (!selectedItem) return;
    if (!window.confirm(copy.deleteArchivedConfirm)) return;
    setIsDeleting(true);
    try {
      await deleteInspiration(selectedItem.id);
      router.push(buildHref({ selected: null }));
      router.refresh();
    } catch (error) {
      showToast(getApiErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AppShell
      copy={copy}
      onSearchClick={() => setSearchOpen(!searchOpen)}
      onUploadClick={() => setUploadOpen(true)}
    >
      <PageHero title={copy.heroArchiveTitle} subtitle={copy.heroArchiveSubtitle} />

      {/* Search bar (collapsible) */}
      {searchOpen && (
        <div className="px-6 lg:px-12 pb-4 animate-slide-up">
          <form action="/inspirations" className="max-w-lg mx-auto">
            <input name="status" type="hidden" value={status} />
            {selectedBoard ? <input name="board" type="hidden" value={selectedBoard.id} /> : null}
            <input
              autoFocus
              defaultValue={query}
              name="q"
              placeholder={copy.searchPlaceholder}
              type="search"
              className="w-full h-10 rounded-full border border-border bg-background px-5 text-sm font-body placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </form>
        </div>
      )}

      {/* Filter bar */}
      <FilterBar
        copy={copy}
        boards={availableBoards}
        activeBoardId={selectedBoardId || null}
        status={status}
        buildHref={buildHref}
      />

      {/* Content area */}
      <div className={`flex ${selectedItem ? "gap-0" : ""}`}>
        <div className={`flex-1 min-w-0 px-6 py-6 lg:px-12 ${selectedItem ? "lg:pr-0" : ""}`}>
          {filteredItems.length === 0 ? (
            <div className="text-center py-20">
              <p className="font-label text-sm uppercase tracking-widest text-muted-foreground">
                {copy.emptyState}
              </p>
            </div>
          ) : selectedItem ? (
            <div className="mx-auto flex max-w-4xl justify-center">
              <div className="w-full overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-card">
                <div className="flex min-h-[28rem] items-center justify-center bg-card p-6 lg:min-h-[calc(100vh-16rem)] lg:p-10">
                  <img
                    alt={selectedItem.title || selectedItem.original_filename || copy.unknown}
                    src={resolveFileUrl(selectedItem.file_url)}
                    className="max-h-[70vh] w-full object-contain"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredItems.map((item) => (
                <InspirationCard
                  key={item.id}
                  item={item}
                  language={language}
                  href={buildHref({ selected: item.id })}
                  copy={copy}
                />
              ))}
            </div>
          )}
        </div>

        {/* Inspector */}
        {selectedItem && (
          <aside className="w-full border-l border-border lg:sticky lg:top-[72px] lg:h-[calc(100vh-72px)] lg:w-[340px] lg:min-w-[340px]">
            <InspectorPanel
              analysisLanguage={analysisLanguage}
              boards={boards}
              copy={copy}
              isAnalyzing={isAnalyzing}
              isArchiving={isArchiving}
              isDeleting={isDeleting}
              isUpdatingBoard={isUpdatingBoard}
              language={language}
              onAnalyze={handleAnalyze}
              onArchive={handleArchive}
              onBoardChange={handleBoardChange}
              onCloseHref={buildHref({ selected: null })}
              onCopy={handleCopyText}
              onDelete={handleDelete}
              onLanguageChange={setAnalysisLanguage}
              promptValue={promptValue}
              selectedBoardValue={boardSelection}
              selectedItem={selectedItem}
              shareableTags={shareableTags}
              tagsValue={tagsValue}
            />
          </aside>
        )}
      </div>

      {!selectedItem && <Footer copy={copy} />}

      {/* Upload dialog */}
      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        copy={copy}
        buildHref={buildHref}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed right-6 bottom-6 z-50 px-4 py-3 rounded-lg bg-foreground/90 text-background text-sm shadow-elevated animate-slide-up">
          {toast}
        </div>
      )}
    </AppShell>
  );
}
