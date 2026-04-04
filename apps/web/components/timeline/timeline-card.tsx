"use client";

import Link from "next/link";
import { getApiOrigin, type InspirationListItem, type UILanguage } from "@/lib/api";
import type { CopyDictionary } from "@/lib/i18n";

function resolveFileUrl(fileUrl: string) {
  if (!fileUrl) return "";
  return fileUrl.startsWith("http://") || fileUrl.startsWith("https://")
    ? fileUrl
    : `${getApiOrigin()}${fileUrl}`;
}

export function TimelineCard({
  item,
  language,
  copy,
}: {
  item: InspirationListItem;
  language: UILanguage;
  copy: CopyDictionary;
}) {
  const tags = language === "en" ? item.analysis_tags_en : item.analysis_tags_zh;
  const title = item.title || item.original_filename || copy.unknown;

  return (
    <Link
      href={`/inspirations?selected=${item.id}`}
      className="min-w-[280px] md:min-w-[360px] snap-start group relative flex-shrink-0"
    >
      <div className="aspect-[4/5] rounded-xl overflow-hidden bg-muted transition-all duration-500 group-hover:shadow-hover">
        <img
          alt={title}
          src={resolveFileUrl(item.file_url)}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        {/* Hover overlay */}
        {tags.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-background/60 backdrop-blur-md border border-border translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
            <div className="flex items-center justify-between mb-2">
              <span className="font-label text-[9px] uppercase tracking-[0.2em] text-primary font-bold">
                {tags[0]}
              </span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-surface-high rounded-full font-label text-[8px] uppercase tracking-widest text-primary/70"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 px-1">
        <h3 className="font-headline text-base lg:text-lg uppercase tracking-[0.1em] text-primary leading-tight">
          {title}
        </h3>
        <p className="font-label text-[9px] uppercase tracking-[0.3em] text-muted-foreground mt-1 italic">
          {item.board_name
            ? `${item.board_name}`
            : tags.length > 0
              ? tags[0]
              : copy.analyzeReady}
        </p>
      </div>
    </Link>
  );
}
