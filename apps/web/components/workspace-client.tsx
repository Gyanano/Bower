"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  analyzeInspiration,
  archiveInspiration,
  createInspiration,
  deleteInspiration,
  getApiOrigin,
  getApiErrorMessage,
  type Board,
  type InspirationDetail,
  type InspirationListItem,
  type UILanguage,
  updateInspiration,
} from "@/lib/api";
import { type CopyDictionary, getAnalysisLanguage } from "@/lib/i18n";
import { formatCalendarDate, formatUtcTimestamp, getSafeHttpUrl } from "@/lib/format";
import { Icon } from "@/components/icons";

function resolveFileUrl(fileUrl: string) {
  if (!fileUrl) {
    return "";
  }

  return fileUrl.startsWith("http://") || fileUrl.startsWith("https://")
    ? fileUrl
    : `${getApiOrigin()}${fileUrl}`;
}

export function WorkspaceClient({
  boards,
  composeOpen,
  language,
  query,
  selectedItem,
  status,
  items,
  copy,
}: {
  boards: Board[];
  composeOpen: boolean;
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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUpdatingBoard, setIsUpdatingBoard] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedBoardId = searchParams.get("board") ?? "";
  const selectedBoard = boards.find((board) => board.id === selectedBoardId) ?? null;
  const promptValue =
    analysisLanguage === "en" ? selectedItem?.analysis_prompt_en ?? "" : selectedItem?.analysis_prompt_zh ?? "";
  const tagsValue =
    analysisLanguage === "en" ? selectedItem?.analysis_tags_en ?? [] : selectedItem?.analysis_tags_zh ?? [];

  const shareableTags = useMemo(() => tagsValue.join(", "), [tagsValue]);
  const mobileDate = useMemo(() => formatCalendarDate(new Date(), language), [language]);

  useEffect(() => {
    setAnalysisLanguage(getAnalysisLanguage(language));
  }, [language]);

  useEffect(() => {
    setBoardSelection(selectedItem?.board_id ?? "");
  }, [selectedItem?.board_id, selectedItem?.id]);

  function buildHref(overrides: Record<string, string | null | undefined>) {
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
  }

  async function handleCopyText(value: string) {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setToast(copy.actionCopied);
      window.setTimeout(() => setToast(null), 1800);
    } catch {
      setToast(copy.clipboardUnavailable);
      window.setTimeout(() => setToast(null), 1800);
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setUploadError(null);
    setIsUploading(true);

    try {
      const created = await createInspiration(formData);
      const nextHref = buildHref({ compose: null, selected: created.data.id });
      form.reset();
      setSelectedFileName("");
      router.push(nextHref);
      router.refresh();

      void (async () => {
        try {
          await analyzeInspiration(created.data.id);
        } catch {
          // The page refresh will surface the failed state from the backend.
        } finally {
          router.refresh();
        }
      })();
    } catch (error) {
      setUploadError(getApiErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  }

  async function handleBoardChange(nextBoardId: string) {
    if (!selectedItem) {
      return;
    }

    const normalizedBoardId = nextBoardId || null;
    setBoardSelection(nextBoardId);
    setIsUpdatingBoard(true);
    try {
      await updateInspiration(selectedItem.id, { board_id: normalizedBoardId });
      router.refresh();
      setToast(copy.actionSaved);
      window.setTimeout(() => setToast(null), 1800);
    } catch (error) {
      setBoardSelection(selectedItem.board_id ?? "");
      setToast(getApiErrorMessage(error));
      window.setTimeout(() => setToast(null), 2400);
    } finally {
      setIsUpdatingBoard(false);
    }
  }

  async function handleAnalyze() {
    if (!selectedItem) {
      return;
    }

    setIsAnalyzing(true);
    try {
      const analyzePromise = analyzeInspiration(selectedItem.id);
      router.refresh();
      await analyzePromise;
      router.refresh();
    } catch (error) {
      setToast(getApiErrorMessage(error));
      window.setTimeout(() => setToast(null), 2400);
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleArchive() {
    if (!selectedItem) {
      return;
    }

    setIsArchiving(true);
    try {
      await archiveInspiration(selectedItem.id);
      router.push(buildHref({ selected: null }));
      router.refresh();
      setToast(copy.actionArchived);
      window.setTimeout(() => setToast(null), 1800);
    } catch (error) {
      setToast(getApiErrorMessage(error));
      window.setTimeout(() => setToast(null), 2400);
    } finally {
      setIsArchiving(false);
    }
  }

  async function handleDelete() {
    if (!selectedItem) {
      return;
    }

    const confirmed = window.confirm(copy.deleteArchivedConfirm);
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteInspiration(selectedItem.id);
      router.push(buildHref({ selected: null }));
      router.refresh();
    } catch (error) {
      setToast(getApiErrorMessage(error));
      window.setTimeout(() => setToast(null), 2400);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="workspace-screen">
      <div className={`workspace-body ${selectedItem ? "has-inspector" : "without-inspector"}`}>
        <aside className="workspace-sidebar">
          <div>
            <p className="sidebar-label">{copy.libraryLabel}</p>
            <Link className="sidebar-link active" href="/inspirations">
              <Icon name="layout" width={16} height={16} />
              <span>{copy.allInspirations}</span>
            </Link>
            <Link className="sidebar-link" href="/insights">
              <Icon name="sparkles" width={16} height={16} />
              <span>{copy.insights}</span>
            </Link>

            <p className="sidebar-label boards">{copy.boardsLabel}</p>
            {boards.map((board) => (
              <Link
                className={`sidebar-link ${selectedBoard?.id === board.id ? "selected-board" : ""}`}
                href={buildHref({ board: board.id, selected: null })}
                key={board.id}
              >
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

        <main className="workspace-main">
          <header className="workspace-toolbar">
            <div className="mobile-hero">
              <p className="mobile-date">{mobileDate}</p>
              <div className="mobile-hero-row">
                <h1>{copy.todayInspirations}</h1>
                <button className="icon-button soft" type="button">
                  <Icon name="grid" width={16} height={16} />
                </button>
              </div>
            </div>

            <div className="toolbar-row">
              <form action="/inspirations" className="search-form">
                <input name="status" type="hidden" value={status} />
                {selectedBoard ? <input name="board" type="hidden" value={selectedBoard.id} /> : null}
                <Icon className="search-icon" name="search" width={16} height={16} />
                <input defaultValue={query} name="q" placeholder={copy.searchPlaceholder} type="search" />
              </form>

              <Link className="primary-button" href={buildHref({ compose: "1" })}>
                <Icon name="plus" width={16} height={16} />
                <span>{copy.importShot}</span>
              </Link>
            </div>

            <div className="toolbar-meta">
              <div className="status-pill-group">
                <Link className={`status-pill ${status === "active" ? "active" : ""}`} href={buildHref({ status: "active", selected: null })}>
                  {copy.active}
                </Link>
                <Link className={`status-pill ${status === "archived" ? "active" : ""}`} href={buildHref({ status: "archived", selected: null })}>
                  {copy.archived}
                </Link>
              </div>
              {selectedBoard ? (
                <Link className="toolbar-board-link" href={buildHref({ board: null, selected: null })}>
                  {selectedBoard.name}
                </Link>
              ) : null}
            </div>
          </header>

          {selectedItem ? (
            <div className="selected-preview-shell">
              <div className="selected-preview-stage">
                <img
                  alt={selectedItem.title || selectedItem.original_filename || copy.unknown}
                  className="selected-preview-image"
                  src={resolveFileUrl(selectedItem.file_url)}
                />
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="workspace-empty">{copy.emptyState}</div>
          ) : (
            <div className="masonry-grid">
              {items.map((item) => (
                <WorkspaceImageCard key={item.id} item={item} language={language} href={buildHref({ selected: item.id })} copy={copy} />
              ))}
            </div>
          )}
        </main>

        <aside className={`workspace-inspector ${selectedItem ? "visible" : ""}`}>
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
      </div>

      {composeOpen ? (
        <div className="overlay-shell">
          <div className="overlay-backdrop" />
          <div className="compose-panel">
            <div className="compose-header">
              <div>
                <h2>{copy.uploadTitle}</h2>
                <p>{copy.uploadHint}</p>
              </div>
              <Link aria-label={copy.close} className="icon-button" href={buildHref({ compose: null })}>
                <Icon name="x" width={18} height={18} />
              </Link>
            </div>
            <form className="compose-form" onSubmit={handleUpload}>
              <label className="field">
                <span>{copy.imageFileLabel}</span>
                <div className="file-picker-row">
                  <label className="file-picker-button" htmlFor="compose-file-input">
                    {copy.chooseFile}
                  </label>
                  <span className="file-picker-name">{selectedFileName || copy.noFileSelected}</span>
                </div>
                <input
                  accept="image/png,image/jpeg,image/webp"
                  className="file-input"
                  id="compose-file-input"
                  name="file"
                  onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name ?? "")}
                  required
                  type="file"
                />
              </label>
              <label className="field">
                <span>{copy.titleField}</span>
                <input name="title" placeholder={copy.titlePlaceholder} type="text" />
              </label>
              <label className="field">
                <span>{copy.urlField}</span>
                <input name="source_url" placeholder="https://example.com" type="url" />
              </label>
              <label className="field">
                <span>{copy.notesField}</span>
                <textarea name="notes" placeholder={copy.notesPlaceholder} rows={4} />
              </label>
              {uploadError ? <p className="form-error">{uploadError}</p> : null}
              <div className="compose-actions">
                <Link className="secondary-button" href={buildHref({ compose: null })}>
                  {copy.cancel}
                </Link>
                <button className="primary-button" disabled={isUploading} type="submit">
                  {isUploading ? copy.saving : copy.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selectedItem ? (
        <div className="mobile-sheet-shell">
          <Link aria-label={copy.close} className="mobile-sheet-backdrop" href={buildHref({ selected: null })} />
          <div className="mobile-sheet">
            <div className="mobile-sheet-handle" />
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
          </div>
        </div>
      ) : null}

      <div className="mobile-tabbar">
        <Link className="mobile-tab active" href="/inspirations">
          <Icon name="layout" width={22} height={22} />
          <span>{copy.mobileNotebook}</span>
        </Link>
        <Link className="mobile-add" href={buildHref({ compose: "1" })}>
          <Icon name="plus" width={26} height={26} />
        </Link>
        <Link className="mobile-tab" href="/settings">
          <Icon name="settings" width={22} height={22} />
          <span>{copy.settings}</span>
        </Link>
      </div>

      {toast ? <div className="floating-toast">{toast}</div> : null}
    </div>
  );
}

function WorkspaceImageCard({
  item,
  language,
  href,
  copy,
}: {
  item: InspirationListItem;
  language: UILanguage;
  href: string;
  copy: CopyDictionary;
}) {
  const cardTags = language === "en" ? item.analysis_tags_en : item.analysis_tags_zh;
  const title = item.title || item.original_filename || copy.unknown;

  return (
    <Link className="masonry-card" href={href}>
      <div className="masonry-image-wrap">
        <img alt={title} className="masonry-image" src={resolveFileUrl(item.file_url)} />
      </div>
      <div className="masonry-content">
        <p className="masonry-title">{title}</p>
        {item.analysis_status === "processing" ? (
          <div className="masonry-processing">
            <div className="shimmer-chip" />
            <div className="shimmer-chip short" />
            <p className="masonry-meta">
              <Icon className="spin" name="loader" width={12} height={12} /> {copy.analyzing}
            </p>
          </div>
        ) : item.analysis_status === "failed" ? (
          <p className="masonry-error">{item.analysis_error ?? copy.analysisFailed}</p>
        ) : cardTags.length > 0 ? (
          <div className="masonry-tags">
            {cardTags.slice(0, 3).map((tag) => (
              <span className="masonry-tag" key={tag}>{tag}</span>
            ))}
          </div>
        ) : (
          <p className="masonry-placeholder">{copy.analyzeReady}</p>
        )}
      </div>
    </Link>
  );
}

function InspectorPanel({
  analysisLanguage,
  boards,
  copy,
  isAnalyzing,
  isArchiving,
  isDeleting,
  isUpdatingBoard,
  language,
  onAnalyze,
  onArchive,
  onBoardChange,
  onCloseHref,
  onCopy,
  onDelete,
  onLanguageChange,
  promptValue,
  selectedBoardValue,
  selectedItem,
  shareableTags,
  tagsValue,
}: {
  analysisLanguage: "en" | "zh";
  boards: Board[];
  copy: CopyDictionary;
  isAnalyzing: boolean;
  isArchiving: boolean;
  isDeleting: boolean;
  isUpdatingBoard: boolean;
  language: UILanguage;
  onAnalyze: () => Promise<void>;
  onArchive: () => Promise<void>;
  onBoardChange: (boardId: string) => Promise<void>;
  onCloseHref: string;
  onCopy: (value: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onLanguageChange: (language: "en" | "zh") => void;
  promptValue: string;
  selectedBoardValue: string;
  selectedItem: InspirationDetail | null;
  shareableTags: string;
  tagsValue: string[];
}) {
  if (!selectedItem) {
    return <div className="inspector-empty">{copy.noSelection}</div>;
  }

  const safeSourceUrl = getSafeHttpUrl(selectedItem.source_url);

  return (
    <div className="inspector-panel">
      <div className="inspector-header">
        <h3>{copy.fullPrompt}</h3>
        <div className="inspector-toggle">
          <button
            className={analysisLanguage === "en" ? "selected" : ""}
            onClick={() => onLanguageChange("en")}
            type="button"
          >
            EN
          </button>
          <button
            className={analysisLanguage === "zh" ? "selected" : ""}
            onClick={() => onLanguageChange("zh")}
            type="button"
          >
            中
          </button>
        </div>
        <Link className="inspector-close" href={onCloseHref}>
          <Icon name="x" width={16} height={16} />
        </Link>
      </div>

      <div className="inspector-scroll">
        <label className="inspector-select">
          <span>{copy.saveToBoard}</span>
          <select disabled={isUpdatingBoard} onChange={(event) => void onBoardChange(event.target.value)} value={selectedBoardValue}>
            <option value="">{copy.noBoard}</option>
            {boards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name}
              </option>
            ))}
          </select>
        </label>

        <section className="inspector-section">
          <div className="section-head">
            <label>{copy.fullPrompt}</label>
            <button onClick={() => void onCopy(promptValue)} type="button">
              <Icon name="copy" width={12} height={12} /> {copy.copyAll}
            </button>
          </div>
          <div className="prompt-box">{promptValue || selectedItem.analysis_error || copy.analyzeReady}</div>
        </section>

        <section className="inspector-section">
          <div className="section-head">
            <label>{copy.styleTags}</label>
            <button onClick={() => void onCopy(shareableTags)} type="button">
              <Icon name="copy-check" width={12} height={12} /> {copy.copyTags}
            </button>
          </div>
          <div className="tag-list">
            {tagsValue.map((tag) => (
              <button className="tag-chip" key={tag} onClick={() => void onCopy(tag)} type="button">
                <span>{tag}</span>
                <Icon name="copy" width={12} height={12} />
              </button>
            ))}
          </div>
        </section>

        <section className="inspector-section">
          <label>{copy.colors}</label>
          <div className="color-list">
            {selectedItem.analysis_colors.map((color) => (
              <button
                aria-label={color}
                className="color-chip"
                key={color}
                onClick={() => void onCopy(color)}
                style={{ backgroundColor: color }}
                type="button"
              />
            ))}
          </div>
        </section>

        {selectedItem.source_url ? (
          <section className="inspector-info">
            <p>{copy.sourceUrl}</p>
            {safeSourceUrl ? (
              <a href={safeSourceUrl} rel="noreferrer" target="_blank">{selectedItem.source_url}</a>
            ) : (
              <span>{selectedItem.source_url}</span>
            )}
          </section>
        ) : null}

        {selectedItem.notes ? (
          <section className="inspector-info">
            <p>{copy.notes}</p>
            <span>{selectedItem.notes}</span>
          </section>
        ) : null}

        <div className="inspector-footer">
          <span>
            <Icon name="clock" width={12} height={12} />{" "}
            {selectedItem.analyzed_at ? `${copy.parsedAt} ${formatUtcTimestamp(selectedItem.analyzed_at, language)}` : copy.analyzeReady}
          </span>
          <div className="footer-actions">
            <button className="ghost-button" disabled={isAnalyzing} onClick={() => void onAnalyze()} type="button">
              <Icon name="refresh" width={13} height={13} /> {isAnalyzing ? copy.analyzing : copy.analyzeAgain}
            </button>
            {selectedItem.status === "active" ? (
              <button className="ghost-button" disabled={isArchiving} onClick={() => void onArchive()} type="button">
                <Icon name="archive" width={13} height={13} /> {copy.archive}
              </button>
            ) : (
              <button className="danger-button" disabled={isDeleting} onClick={() => void onDelete()} type="button">
                <Icon name="trash" width={13} height={13} /> {copy.delete}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
