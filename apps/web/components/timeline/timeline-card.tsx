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
      className="group relative block"
    >
      <div className="aspect-[4/5] overflow-hidden rounded-xl bg-muted transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-hover">
        <img
          alt={title}
          src={resolveFileUrl(item.file_url)}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        {tags.length > 0 && (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 translate-y-3 rounded-[1.1rem] border border-white/35 bg-white/18 p-3 opacity-0 shadow-[0_18px_45px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
            <div className="flex gap-1.5 flex-wrap">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/30 px-2.5 py-1 font-label text-[8px] uppercase tracking-[0.18em] text-primary/80"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 px-1">
        <h3 className="font-headline text-base uppercase tracking-[0.08em] text-primary leading-tight lg:text-lg">
          {title}
        </h3>
        <p className="mt-1 font-headline text-sm text-muted-foreground italic">
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
