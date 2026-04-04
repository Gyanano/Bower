"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, Camera, LogIn, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AUTH_STATE_EVENT, getAccountStatus, type AccountStatus } from "@/lib/api";
import type { CopyDictionary } from "@/lib/i18n";

const navItems = [
  { labelKey: "navArchive" as const, href: "/inspirations", matchPath: "/inspirations", matchView: undefined },
  { labelKey: "navCollections" as const, href: "/inspirations?view=collections", matchPath: "/inspirations", matchView: "collections" },
  { labelKey: "navTimeline" as const, href: "/inspirations?view=timeline", matchPath: "/inspirations", matchView: "timeline" },
  { labelKey: "navStudio" as const, href: "/insights", matchPath: "/insights", matchView: undefined },
];

export function TopNav({
  copy,
  onSearchClick,
  onUploadClick,
}: {
  copy: CopyDictionary;
  onSearchClick?: () => void;
  onUploadClick?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") ?? undefined;
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);

  useEffect(() => {
    async function loadAccountStatus() {
      try {
        const result = await getAccountStatus();
        setAccountStatus(result.data);
      } catch {
        setAccountStatus({ logged_in: false, profile: null });
      }
    }

    function handleAuthStateChange() {
      void loadAccountStatus();
    }

    void loadAccountStatus();
    window.addEventListener("storage", handleAuthStateChange);
    window.addEventListener(AUTH_STATE_EVENT, handleAuthStateChange);

    return () => {
      window.removeEventListener("storage", handleAuthStateChange);
      window.removeEventListener(AUTH_STATE_EVENT, handleAuthStateChange);
    };
  }, []);

  function isActive(item: typeof navItems[number]) {
    if (item.matchView) {
      return pathname === item.matchPath && currentView === item.matchView;
    }
    if (item.matchPath === "/inspirations") {
      return pathname === "/inspirations" && !currentView;
    }
    return pathname.startsWith(item.matchPath);
  }

  return (
    <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-6 lg:px-12 py-4 lg:py-5 bg-background/70 backdrop-blur-xl border-b border-border">
      <Link href="/inspirations" className="flex items-center gap-3">
        <Image
          src="/BowerLogo.png"
          alt="Bower"
          width={28}
          height={28}
          className="rounded-full"
        />
        <span className="font-headline text-xl lg:text-2xl uppercase tracking-[0.2em] text-primary">
          BOWER
        </span>
      </Link>

      <div className="hidden md:flex gap-8 lg:gap-12">
        {navItems.map((item) => (
          <Link
            key={item.labelKey}
            href={item.href}
            className={cn(
              "font-label text-[10px] uppercase tracking-[0.4em] transition-colors",
              isActive(item)
                ? "text-primary font-bold border-b-2 border-primary pb-0.5"
                : "text-primary/50 hover:text-primary/80"
            )}
          >
            {copy[item.labelKey]}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {onSearchClick ? (
          <button
            type="button"
            onClick={onSearchClick}
            className="text-primary/60 hover:text-primary transition-colors"
            aria-label={copy.searchPlaceholder}
          >
            <Search size={18} strokeWidth={1.5} />
          </button>
        ) : null}
        {onUploadClick ? (
          <button
            type="button"
            onClick={onUploadClick}
            className="text-primary/60 hover:text-primary transition-colors"
            aria-label={copy.importShot}
          >
            <Camera size={18} strokeWidth={1.5} />
          </button>
        ) : (
          <Link
            href="/upload"
            className="text-primary/60 hover:text-primary transition-colors"
            aria-label={copy.importShot}
          >
            <Camera size={18} strokeWidth={1.5} />
          </Link>
        )}
        <Link
          href="/settings"
          className="text-primary/60 hover:text-primary transition-colors"
          aria-label={copy.settings}
        >
          <Settings2 size={18} strokeWidth={1.5} />
        </Link>
        <Link
          href="/login"
          aria-label={accountStatus?.profile?.display_name ?? copy.signIn}
          className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.28em] text-primary/70 transition-colors hover:text-primary"
        >
          <LogIn size={15} strokeWidth={1.5} className="sm:hidden" />
          <span className="hidden sm:block max-w-[10rem] truncate">
            {accountStatus?.profile?.display_name ?? copy.signIn}
          </span>
        </Link>
      </div>
    </nav>
  );
}
