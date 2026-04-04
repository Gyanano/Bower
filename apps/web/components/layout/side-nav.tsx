"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { Archive, LayoutGrid, CalendarDays, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CopyDictionary } from "@/lib/i18n";

const sideItems = [
  { labelKey: "navArchive" as const, icon: Archive, href: "/inspirations", matchPath: "/inspirations", matchView: undefined },
  { labelKey: "navCollections" as const, icon: LayoutGrid, href: "/inspirations?view=collections", matchPath: "/inspirations", matchView: "collections" },
  { labelKey: "navTimeline" as const, icon: CalendarDays, href: "/inspirations?view=timeline", matchPath: "/inspirations", matchView: "timeline" },
];

export function SideNav({ copy, isOpen }: { copy: CopyDictionary; isOpen: boolean }) {
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
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden h-screen w-[15rem] overflow-hidden overscroll-none bg-background transition-all duration-500 lg:flex",
        isOpen ? "translate-x-0 border-r border-border opacity-100" : "pointer-events-none -translate-x-full border-r-0 opacity-0",
      )}
      aria-hidden={!isOpen}
    >
      <div className="flex min-w-[15rem] flex-1 flex-col overflow-hidden">
        <div className="border-b border-border px-5 py-6">
          <Link href="/inspirations" className="flex items-center gap-3">
            <Image
              src="/BowerLogo.png"
              alt="Bower"
              width={34}
              height={34}
              className="rounded-full"
            />
            <div className="min-w-0">
              <p className="font-headline text-xl uppercase tracking-[0.18em] text-primary">
                Bower
              </p>
              <p className="font-label text-[9px] uppercase tracking-[0.3em] text-primary/45">
                Your Inspiration Archive
              </p>
            </div>
          </Link>
        </div>

        <div className="min-h-0 flex flex-1 flex-col gap-2 overflow-y-auto overscroll-contain border-b border-border px-3 py-6">
          {sideItems.map((item) => {
            const active = isActive(item);
            const IconComponent = item.icon;
            return (
              <Link
                key={item.labelKey}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300",
                  active
                    ? "bg-primary text-primary-foreground shadow-hover"
                    : "text-primary/55 hover:bg-primary-light hover:text-primary",
                )}
              >
                <IconComponent size={18} strokeWidth={1.6} />
                <span className="font-label text-[14px] uppercase tracking-[0.14em]">
                  {copy[item.labelKey]}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="px-3 py-5">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300",
              pathname.startsWith("/settings")
                ? "bg-surface text-primary"
                : "text-primary/55 hover:bg-primary-light hover:text-primary",
            )}
          >
            <Settings2 size={18} strokeWidth={1.6} />
            <span className="font-label text-[14px] uppercase tracking-[0.14em]">
              {copy.settings}
            </span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
