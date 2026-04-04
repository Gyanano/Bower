"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CopyDictionary } from "@/lib/i18n";

export function FilterBar({
  copy,
  tags,
  activeTag,
  status,
  boardName,
  buildHref,
}: {
  copy: CopyDictionary;
  tags: string[];
  activeTag: string | null;
  status: "active" | "archived";
  boardName: string | null;
  buildHref: (overrides: Record<string, string | null | undefined>) => string;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 lg:px-12 py-4">
      {/* Tag filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href={buildHref({ tag: null })}
          className={cn(
            "px-3 py-1.5 rounded-full font-label text-[10px] uppercase tracking-[0.2em] transition-colors border",
            !activeTag
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-transparent text-primary/60 border-border hover:border-primary/30"
          )}
        >
          {copy.filterAll}
        </Link>
        {tags.map((tag) => (
          <Link
            key={tag}
            href={buildHref({ tag })}
            className={cn(
              "px-3 py-1.5 rounded-full font-label text-[10px] uppercase tracking-[0.2em] transition-colors border",
              activeTag === tag
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent text-primary/60 border-border hover:border-primary/30"
            )}
          >
            {tag}
          </Link>
        ))}
      </div>

      {/* Status + board filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-full border border-border overflow-hidden">
          <Link
            href={buildHref({ status: "active", selected: null })}
            className={cn(
              "px-3 py-1.5 font-label text-[10px] uppercase tracking-[0.2em] transition-colors",
              status === "active"
                ? "bg-primary text-primary-foreground"
                : "text-primary/50 hover:text-primary/80"
            )}
          >
            {copy.active}
          </Link>
          <Link
            href={buildHref({ status: "archived", selected: null })}
            className={cn(
              "px-3 py-1.5 font-label text-[10px] uppercase tracking-[0.2em] transition-colors",
              status === "archived"
                ? "bg-primary text-primary-foreground"
                : "text-primary/50 hover:text-primary/80"
            )}
          >
            {copy.archived}
          </Link>
        </div>
        {boardName && (
          <Link
            href={buildHref({ board: null, selected: null })}
            className="px-3 py-1.5 rounded-full bg-surface font-label text-[10px] uppercase tracking-[0.2em] text-primary/60 hover:text-primary transition-colors"
          >
            {boardName} &times;
          </Link>
        )}
      </div>
    </div>
  );
}
