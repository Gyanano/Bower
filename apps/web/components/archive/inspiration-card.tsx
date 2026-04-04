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
    <Link href={href} className="group block break-inside-avoid mb-5">
      <div className="relative overflow-hidden rounded-lg bg-muted transition-all duration-500 group-hover:shadow-hover">
        <div className="aspect-[4/5] overflow-hidden">
          <img
            alt={title}
            src={resolveFileUrl(item.file_url)}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>

        {/* Hover overlay with tags */}
        {tags.length > 0 && (
          <div className="absolute bottom-3 left-3 right-3 p-3 rounded-lg bg-background/60 backdrop-blur-md border border-border translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
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

        {/* Processing state */}
        {item.analysis_status === "processing" && (
          <div className="absolute inset-0 bg-background/30 backdrop-blur-sm flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div className="mt-3 px-0.5">
        <h3 className="font-headline text-sm lg:text-base uppercase tracking-[0.1em] text-primary leading-tight">
          {title}
        </h3>
        <p className="font-label text-[9px] uppercase tracking-[0.3em] text-muted-foreground mt-1">
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
