"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Archive, LayoutGrid, CalendarDays, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CopyDictionary } from "@/lib/i18n";

const tabItems = [
  { labelKey: "navArchive" as const, icon: Archive, href: "/inspirations", matchPath: "/inspirations", matchView: undefined },
  { labelKey: "navCollections" as const, icon: LayoutGrid, href: "/inspirations?view=collections", matchPath: "/inspirations", matchView: "collections" },
  { labelKey: "navTimeline" as const, icon: CalendarDays, href: "/inspirations?view=timeline", matchPath: "/inspirations", matchView: "timeline" },
  { labelKey: "navStudio" as const, icon: BarChart3, href: "/insights", matchPath: "/insights", matchView: undefined },
];

export function MobileTabBar({ copy }: { copy: CopyDictionary }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") ?? undefined;

  function isActive(item: typeof tabItems[number]) {
    if (item.matchView) {
      return pathname === item.matchPath && currentView === item.matchView;
    }
    if (item.matchPath === "/inspirations") {
      return pathname === "/inspirations" && !currentView;
    }
    return pathname.startsWith(item.matchPath);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 lg:hidden h-20 px-6 pt-2 bg-background/80 backdrop-blur-xl border-t border-border flex items-start justify-around">
      {tabItems.map((item) => {
        const active = isActive(item);
        const IconComponent = item.icon;
        return (
          <Link
            key={item.labelKey}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 py-1",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <IconComponent size={22} strokeWidth={1.5} />
            <span className="font-label text-[9px] uppercase tracking-[0.2em]">
              {copy[item.labelKey]}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
