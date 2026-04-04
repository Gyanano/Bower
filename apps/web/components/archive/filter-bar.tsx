"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CopyDictionary } from "@/lib/i18n";

export function FilterBar({
  copy,
  boards,
  activeBoardId,
  status,
  buildHref,
}: {
  copy: CopyDictionary;
  boards: Array<{ id: string; name: string }>;
  activeBoardId: string | null;
  status: "active" | "archived";
  buildHref: (overrides: Record<string, string | null | undefined>) => string;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) {
      return;
    }

    function updateScrollState() {
      const currentNode = scrollerRef.current;
      if (!currentNode) {
        return;
      }

      const maxScrollLeft = currentNode.scrollWidth - currentNode.clientWidth;
      setCanScrollLeft(currentNode.scrollLeft > 4);
      setCanScrollRight(maxScrollLeft - currentNode.scrollLeft > 4);
    }

    updateScrollState();
    node.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      node.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [boards]);

  return (
    <div className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:gap-6 lg:px-12">
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div
          ref={scrollerRef}
          className="hide-scrollbar flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1"
        >
          <Link
            href={buildHref({ board: null, selected: null })}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 font-label text-[14px] uppercase tracking-[0.1em] transition-colors",
              !activeBoardId
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent text-primary/60 border-border hover:border-primary/30",
            )}
          >
            {copy.filterAll}
          </Link>
          {boards.map((board) => (
            <Link
              key={board.id}
              href={buildHref({ board: board.id, selected: null })}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 font-label text-[14px] uppercase tracking-[0.1em] transition-colors",
                activeBoardId === board.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent text-primary/60 border-border hover:border-primary/30",
              )}
            >
              {board.name}
            </Link>
          ))}
        </div>

        {canScrollLeft ? (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center bg-gradient-to-r from-background via-background/88 to-transparent pr-6">
            <ChevronLeft size={16} strokeWidth={1.7} className="text-primary/35" />
          </div>
        ) : null}

        {canScrollRight ? (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-1 bg-gradient-to-l from-background via-background/88 to-transparent pl-8">
            <span className="hidden font-label text-[9px] uppercase tracking-[0.2em] text-primary/38 xl:inline">
              Scroll
            </span>
            <ChevronRight size={16} strokeWidth={1.7} className="text-primary/35" />
          </div>
        ) : null}
      </div>

      <div className="flex min-w-[12rem] shrink-0 items-center justify-end gap-3">
        <div className="flex items-center rounded-full border border-border overflow-hidden">
          <Link
            href={buildHref({ status: "active", selected: null })}
            className={cn(
              "px-3.5 py-1.5 font-label text-[14px] uppercase tracking-[0.1em] transition-colors",
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
              "px-3.5 py-1.5 font-label text-[14px] uppercase tracking-[0.1em] transition-colors",
              status === "archived"
                ? "bg-primary text-primary-foreground"
                : "text-primary/50 hover:text-primary/80"
            )}
          >
            {copy.archived}
          </Link>
        </div>
      </div>
    </div>
  );
}
