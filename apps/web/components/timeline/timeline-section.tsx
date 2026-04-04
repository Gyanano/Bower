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
    <div className="relative mb-16 flex gap-5 md:gap-10 lg:mb-24">
      {/* Timeline axis */}
      <div className="flex w-10 flex-shrink-0 flex-col items-center md:w-16">
        <div className="sticky top-36 flex flex-col items-center">
          <span className="mb-4 font-label text-[10px] font-bold uppercase tracking-[0.3em] text-primary [writing-mode:vertical-lr] rotate-180 md:text-xs">
            {dateLabel}
          </span>
          <div className="w-px h-48 bg-primary/20" />
        </div>
      </div>

      <div className="flex-1 pb-2">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
