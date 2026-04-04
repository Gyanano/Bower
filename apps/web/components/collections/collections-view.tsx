"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Footer } from "@/components/layout/footer";
import { PageHero } from "@/components/layout/page-hero";
import { BoardCard } from "./board-card";
import { getApiOrigin, type Board, type InspirationListItem, type UILanguage } from "@/lib/api";
import type { CopyDictionary } from "@/lib/i18n";

export function CollectionsView({
  boards,
  items,
  language,
  copy,
}: {
  boards: Board[];
  items: InspirationListItem[];
  language: UILanguage;
  copy: CopyDictionary;
}) {
  // Group items by board and compute stats
  const boardStats = boards.map((board) => {
    const boardItems = items.filter((item) => item.board_id === board.id);
    const allTags: string[] = [];
    for (const item of boardItems) {
      const tags = language === "en" ? item.analysis_tags_en : item.analysis_tags_zh;
      allTags.push(...tags);
    }
    // Find primary tag
    const tagCounts = new Map<string, number>();
    for (const tag of allTags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
    const primaryTag = [...tagCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    // Cover image from first item
    const coverItem = boardItems[0] ?? null;
    const coverUrl = coverItem
      ? coverItem.file_url.startsWith("http")
        ? coverItem.file_url
        : `${getApiOrigin()}${coverItem.file_url}`
      : null;

    return {
      board,
      count: boardItems.length,
      primaryTag,
      coverUrl,
    };
  });

  // Also gather unassigned items
  const unassigned = items.filter((item) => !item.board_id);

  return (
    <AppShell copy={copy}>
      <PageHero title={copy.heroCollectionsTitle} subtitle={copy.heroCollectionsSubtitle} />

      {/* Board grid */}
      <div className="px-6 lg:px-12 py-8">
        {boardStats.length === 0 && unassigned.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-label text-sm uppercase tracking-widest text-muted-foreground">
              {copy.emptyState}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8">
            {boardStats.map(({ board, count, primaryTag, coverUrl }) => (
              <BoardCard
                key={board.id}
                name={board.name}
                count={count}
                primaryTag={primaryTag}
                coverUrl={coverUrl}
                href={`/inspirations?board=${board.id}`}
                copy={copy}
              />
            ))}

            {/* Unassigned bucket */}
            {unassigned.length > 0 && (
              <BoardCard
                name={copy.noBoard}
                count={unassigned.length}
                primaryTag={null}
                coverUrl={
                  unassigned[0]
                    ? unassigned[0].file_url.startsWith("http")
                      ? unassigned[0].file_url
                      : `${getApiOrigin()}${unassigned[0].file_url}`
                    : null
                }
                href="/inspirations"
                copy={copy}
              />
            )}
          </div>
        )}
      </div>

      <Footer copy={copy} />
    </AppShell>
  );
}
