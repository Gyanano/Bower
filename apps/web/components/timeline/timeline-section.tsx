"use client";

import { TimelineCard } from "./timeline-card";
import type { InspirationListItem, UILanguage } from "@/lib/api";
import type { CopyDictionary } from "@/lib/i18n";

export function TimelineSection({
  dateLabel,
  items,
  language,
  copy,
}: {
  dateLabel: string;
  items: InspirationListItem[];
  language: UILanguage;
  copy: CopyDictionary;
}) {
  return (
    <div className="relative flex gap-6 md:gap-12 mb-20 lg:mb-28">
      {/* Timeline axis */}
      <div className="flex flex-col items-center w-10 md:w-16 flex-shrink-0">
        <div className="sticky top-36 flex flex-col items-center">
          <span className="font-label text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-primary mb-4 [writing-mode:vertical-lr] rotate-180">
            {dateLabel}
          </span>
          <div className="w-px h-48 bg-primary/20" />
        </div>
      </div>

      {/* Horizontal scrolling cards */}
      <div className="flex-1 overflow-hidden">
        <div className="flex gap-6 overflow-x-auto hide-scrollbar pb-6 px-2 -mx-2 snap-x">
          {items.map((item) => (
            <TimelineCard
              key={item.id}
              item={item}
              language={language}
              copy={copy}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
