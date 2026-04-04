"use client";

import Link from "next/link";
import { X, Copy, CopyCheck, Clock, RefreshCw, Archive as ArchiveIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getApiOrigin, type Board, type InspirationDetail, type UILanguage } from "@/lib/api";
import { formatUtcTimestamp } from "@/lib/format";
import type { CopyDictionary } from "@/lib/i18n";

function resolveFileUrl(fileUrl: string) {
  if (!fileUrl) return "";
  return fileUrl.startsWith("http://") || fileUrl.startsWith("https://")
    ? fileUrl
    : `${getApiOrigin()}${fileUrl}`;
}

export function InspectorPanel({
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
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground font-label text-xs uppercase tracking-widest">
        {copy.noSelection}
      </div>
    );
  }

  const safeSourceUrl =
    selectedItem.source_url &&
    (selectedItem.source_url.startsWith("http://") || selectedItem.source_url.startsWith("https://"))
      ? selectedItem.source_url
      : null;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
        <h3 className="font-label text-[10px] uppercase tracking-[0.3em] text-primary font-semibold">
          {copy.fullPrompt}
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md bg-muted p-0.5">
            <button
              type="button"
              onClick={() => onLanguageChange("en")}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-label transition-colors",
                analysisLanguage === "en"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange("zh")}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-label transition-colors",
                analysisLanguage === "zh"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              中
            </button>
          </div>
          <Link
            href={onCloseHref}
            className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} />
          </Link>
        </div>
      </div>

      {/* Preview image */}
      <div className="px-4 pt-4">
        <div className="aspect-video rounded-lg overflow-hidden bg-muted">
          <img
            alt={selectedItem.title || selectedItem.original_filename || copy.unknown}
            src={resolveFileUrl(selectedItem.file_url)}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-4">
          {/* Board selector */}
          <div className="space-y-1.5">
            <label className="font-label text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-semibold">
              {copy.saveToBoard}
            </label>
            <select
              disabled={isUpdatingBoard}
              onChange={(e) => void onBoardChange(e.target.value)}
              value={selectedBoardValue}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm font-body"
            >
              <option value="">{copy.noBoard}</option>
              {boards.map((board) => (
                <option key={board.id} value={board.id}>{board.name}</option>
              ))}
            </select>
          </div>

          <Separator />

          {/* Prompt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-label text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-semibold">
                {copy.fullPrompt}
              </label>
              <button
                type="button"
                onClick={() => void onCopy(promptValue)}
                className="flex items-center gap-1 text-primary/60 hover:text-primary font-label text-[9px] uppercase tracking-widest transition-colors"
              >
                <Copy size={10} /> {copy.copyAll}
              </button>
            </div>
            <div className="p-3 rounded-md border border-border bg-surface text-sm font-mono leading-relaxed text-foreground/80 whitespace-pre-wrap min-h-[120px]">
              {promptValue || selectedItem.analysis_error || copy.analyzeReady}
            </div>
          </div>

          <Separator />

          {/* Tags */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-label text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-semibold">
                {copy.styleTags}
              </label>
              <button
                type="button"
                onClick={() => void onCopy(shareableTags)}
                className="flex items-center gap-1 text-primary/60 hover:text-primary font-label text-[9px] uppercase tracking-widest transition-colors"
              >
                <CopyCheck size={10} /> {copy.copyTags}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tagsValue.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => void onCopy(tag)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-background text-sm hover:border-primary/30 transition-colors"
                >
                  <span>{tag}</span>
                  <Copy size={10} className="text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Colors */}
          {selectedItem.analysis_colors.length > 0 && (
            <div className="space-y-2">
              <label className="font-label text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-semibold">
                {copy.colors}
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedItem.analysis_colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => void onCopy(color)}
                    aria-label={color}
                    className="w-7 h-7 rounded-md border border-border cursor-pointer hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Source URL */}
          {selectedItem.source_url && (
            <>
              <Separator />
              <div className="space-y-1">
                <label className="font-label text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-semibold">
                  {copy.sourceUrl}
                </label>
                {safeSourceUrl ? (
                  <a
                    href={safeSourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary/70 hover:text-primary break-all transition-colors"
                  >
                    {selectedItem.source_url}
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground break-all">{selectedItem.source_url}</span>
                )}
              </div>
            </>
          )}

          {/* Notes */}
          {selectedItem.notes && (
            <>
              <Separator />
              <div className="space-y-1">
                <label className="font-label text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-semibold">
                  {copy.notes}
                </label>
                <p className="text-sm text-muted-foreground leading-relaxed">{selectedItem.notes}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Footer actions */}
          <div className="space-y-3 pb-4">
            <p className="flex items-center gap-1.5 font-label text-[9px] uppercase tracking-widest text-muted-foreground">
              <Clock size={10} />
              {selectedItem.analyzed_at
                ? `${copy.parsedAt} ${formatUtcTimestamp(selectedItem.analyzed_at, language)}`
                : copy.analyzeReady}
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                disabled={isAnalyzing}
                onClick={() => void onAnalyze()}
                className="font-label text-[9px] uppercase tracking-widest"
              >
                <RefreshCw size={12} className={isAnalyzing ? "animate-spin" : ""} />
                {isAnalyzing ? copy.analyzing : copy.analyzeAgain}
              </Button>
              {selectedItem.status === "active" ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isArchiving}
                  onClick={() => void onArchive()}
                  className="font-label text-[9px] uppercase tracking-widest"
                >
                  <ArchiveIcon size={12} />
                  {copy.archive}
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isDeleting}
                  onClick={() => void onDelete()}
                  className="font-label text-[9px] uppercase tracking-widest"
                >
                  <Trash2 size={12} />
                  {copy.delete}
                </Button>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
