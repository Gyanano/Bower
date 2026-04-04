"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Footer } from "@/components/layout/footer";
import { PageHero } from "@/components/layout/page-hero";
import { TimelineSection } from "./timeline-section";
import { formatCalendarDate } from "@/lib/format";
import type { InspirationListItem, UILanguage } from "@/lib/api";
import type { CopyDictionary } from "@/lib/i18n";

function groupByDate(items: InspirationListItem[], language: UILanguage) {
  const groups = new Map<string, { label: string; items: InspirationListItem[] }>();

  // Sort by created_at descending
  const sorted = [...items].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );

  for (const item of sorted) {
    const date = new Date(item.created_at);
    const dateKey = date.toISOString().slice(0, 10);
    const existing = groups.get(dateKey);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(dateKey, {
        label: formatCalendarDate(date, language),
        items: [item],
      });
    }
  }

  return [...groups.values()];
}

export function TimelineView({
  items,
  language,
  copy,
}: {
  items: InspirationListItem[];
  language: UILanguage;
  copy: CopyDictionary;
}) {
  const dateGroups = useMemo(() => groupByDate(items, language), [items, language]);

  return (
    <AppShell copy={copy}>
      <PageHero title={copy.heroTimelineTitle} subtitle={copy.heroTimelineSubtitle} className="pb-10 lg:pb-14" />

      {/* Timeline sections */}
      <div className="mx-auto max-w-[1480px] px-4 lg:px-12">
        {dateGroups.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-label text-sm uppercase tracking-widest text-muted-foreground">
              {copy.emptyState}
            </p>
          </div>
        ) : (
          dateGroups.map((group) => (
            <TimelineSection
              key={group.label}
              dateLabel={group.label}
              items={group.items}
              language={language}
              copy={copy}
            />
          ))
        )}
      </div>

      <Footer copy={copy} />
    </AppShell>
  );
}
