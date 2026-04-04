"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Footer } from "@/components/layout/footer";
import { InspirationCard } from "./inspiration-card";
import { FilterBar } from "./filter-bar";
import { InspectorPanel } from "./inspector-panel";
import { UploadDialog } from "./upload-dialog";
import {
  analyzeInspiration,
  archiveInspiration,
  deleteInspiration,
  getApiErrorMessage,
  updateInspiration,
  type Board,
  type InspirationDetail,
  type InspirationListItem,
  type UILanguage,
} from "@/lib/api";
import { type CopyDictionary, getAnalysisLanguage } from "@/lib/i18n";

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
  const activeTag = searchParams.get("tag") ?? null;

  const promptValue =
    analysisLanguage === "en" ? selectedItem?.analysis_prompt_en ?? "" : selectedItem?.analysis_prompt_zh ?? "";
  const tagsValue =
    analysisLanguage === "en" ? selectedItem?.analysis_tags_en ?? [] : selectedItem?.analysis_tags_zh ?? [];
  const shareableTags = useMemo(() => tagsValue.join(", "), [tagsValue]);

  // Collect top tags from all items for filter bar
  const topTags = useMemo(() => {
    const tagMap = new Map<string, number>();
    for (const item of items) {
      const tags = language === "en" ? item.analysis_tags_en : item.analysis_tags_zh;
      for (const tag of tags) {
        tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
      }
    }
    return [...tagMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag]) => tag);
  }, [items, language]);

  // Filter items by active tag
  const filteredItems = useMemo(() => {
    if (!activeTag) return items;
    return items.filter((item) => {
      const tags = language === "en" ? item.analysis_tags_en : item.analysis_tags_zh;
      return tags.includes(activeTag);
    });
  }, [items, activeTag, language]);

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
      {/* Hero */}
      <section className="pt-12 lg:pt-20 pb-6 lg:pb-10 text-center px-6">
        <h1 className="font-headline text-4xl md:text-5xl lg:text-7xl uppercase tracking-[0.15em] text-primary mb-3">
          {copy.heroArchiveTitle}
        </h1>
        <p className="font-label text-[10px] lg:text-xs uppercase tracking-[0.5em] text-muted-foreground italic">
          {copy.heroArchiveSubtitle}
        </p>
        {/* Decorative divider */}
        <div className="flex justify-center mt-6">
          <div className="w-px h-10 bg-primary/20" />
        </div>
      </section>

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
        tags={topTags}
        activeTag={activeTag}
        status={status}
        boardName={selectedBoard?.name ?? null}
        buildHref={buildHref}
      />

      {/* Content area */}
      <div className={`flex ${selectedItem ? "gap-0" : ""}`}>
        {/* Grid */}
        <div className={`flex-1 min-w-0 px-6 lg:px-12 py-6 ${selectedItem ? "hidden lg:block lg:pr-0" : ""}`}>
          {filteredItems.length === 0 ? (
            <div className="text-center py-20">
              <p className="font-label text-sm uppercase tracking-widest text-muted-foreground">
                {copy.emptyState}
              </p>
            </div>
          ) : (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-5">
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
          <aside className="w-full lg:w-[340px] lg:min-w-[340px] border-l border-border h-[calc(100vh-68px)] sticky top-[68px]">
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
