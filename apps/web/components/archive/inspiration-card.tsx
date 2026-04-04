"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { getApiOrigin, type InspirationListItem, type UILanguage } from "@/lib/api";
import type { CopyDictionary } from "@/lib/i18n";

function resolveFileUrl(fileUrl: string) {
  if (!fileUrl) return "";
  return fileUrl.startsWith("http://") || fileUrl.startsWith("https://")
    ? fileUrl
    : `${getApiOrigin()}${fileUrl}`;
}

export function InspirationCard({
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
  const tags = language === "en" ? item.analysis_tags_en : item.analysis_tags_zh;
  const title = item.title || item.original_filename || copy.unknown;

  return (
    <Link href={href} className="group flex h-full flex-col">
      <div className="relative h-[21rem] overflow-hidden rounded-[1.25rem] border border-border bg-card transition-all duration-500 group-hover:shadow-hover">
        <div className="h-full w-full overflow-hidden">
          <img
            alt={title}
            src={resolveFileUrl(item.file_url)}
            className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-[1.03]"
          />
        </div>

        {tags.length > 0 && (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 translate-y-3 rounded-[1.1rem] border border-white/35 bg-white/18 p-3 opacity-0 shadow-[0_18px_45px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
            <div className="flex flex-wrap gap-1.5">
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

        {/* Processing state */}
        {item.analysis_status === "processing" && (
          <div className="absolute inset-0 bg-background/30 backdrop-blur-sm flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div className="mt-3 flex min-h-[5.5rem] flex-1 flex-col px-0.5">
        <h3 className="line-clamp-3 font-headline text-sm leading-tight tracking-[0.06em] text-primary lg:text-base">
          {title}
        </h3>
        <p className="mt-auto pt-2 font-label text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
          {item.analysis_status === "completed" && tags.length > 0
            ? `${tags.length} ${copy.artifactCount} / ${tags[0]}`
            : item.analysis_status === "processing"
              ? copy.analyzing
              : item.analysis_status === "failed"
                ? copy.analysisFailed
                : copy.analyzeReady}
        </p>
      </div>
    </Link>
  );
}
