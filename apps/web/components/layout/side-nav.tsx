"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { Archive, LayoutGrid, CalendarDays, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CopyDictionary } from "@/lib/i18n";

const sideItems = [
  { labelKey: "navArchive" as const, icon: Archive, href: "/inspirations", matchPath: "/inspirations", matchView: undefined },
  { labelKey: "navCollections" as const, icon: LayoutGrid, href: "/inspirations?view=collections", matchPath: "/inspirations", matchView: "collections" },
  { labelKey: "navTimeline" as const, icon: CalendarDays, href: "/inspirations?view=timeline", matchPath: "/inspirations", matchView: "timeline" },
  { labelKey: "navStudio" as const, icon: BarChart3, href: "/insights", matchPath: "/insights", matchView: undefined },
];

export function SideNav({ copy }: { copy: CopyDictionary }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") ?? undefined;

  function isActive(item: typeof sideItems[number]) {
    if (item.matchView) {
      return pathname === item.matchPath && currentView === item.matchView;
    }
    if (item.matchPath === "/inspirations") {
      return pathname === "/inspirations" && !currentView;
    }
    return pathname.startsWith(item.matchPath);
  }

  return (
    <aside className="fixed left-0 top-0 h-full hidden lg:flex flex-col items-center py-10 bg-background w-[72px] border-r border-border z-40">
      <div className="mb-10 flex flex-col items-center">
        <Image
          src="/BowerLogo.png"
          alt="Bower"
          width={32}
          height={32}
          className="rounded-full mb-1"
        />
        <span className="font-label text-[7px] text-primary/40 uppercase tracking-[0.3em]">
          EST. 2024
        </span>
      </div>

      <div className="flex-1 flex flex-col gap-8 justify-center">
        {sideItems.map((item) => {
          const active = isActive(item);
          const IconComponent = item.icon;
          return (
            <Link
              key={item.labelKey}
              href={item.href}
              className={cn(
                "group flex flex-col items-center gap-1.5 transition-all duration-300",
                active
                  ? "text-primary scale-110"
                  : "text-primary/35 hover:text-primary/70"
              )}
            >
              <IconComponent size={20} strokeWidth={1.5} />
              <span className="font-label text-[7px] uppercase tracking-[0.3em]">
                {copy[item.labelKey]}
              </span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
