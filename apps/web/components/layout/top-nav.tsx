"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Search, Camera, LogIn, Settings2 } from "lucide-react";
import { AUTH_STATE_EVENT, getAccountStatus, type AccountStatus } from "@/lib/api";
import type { CopyDictionary } from "@/lib/i18n";

export function TopNav({
  copy,
  onSearchClick,
  onUploadClick,
  isSidebarOpen,
  onSidebarToggle,
}: {
  copy: CopyDictionary;
  onSearchClick?: () => void;
  onUploadClick?: () => void;
  isSidebarOpen: boolean;
  onSidebarToggle: () => void;
}) {
  const pathname = usePathname();
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

  return (
    <nav className="sticky top-0 z-40 flex h-[60px] items-center justify-between border-b border-border bg-background/88 px-4 backdrop-blur-xl lg:h-[72px] lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSidebarToggle}
          className="hidden text-primary/70 transition-colors hover:text-primary lg:inline-flex"
          aria-label={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
        >
          <Menu size={18} strokeWidth={1.6} />
        </button>
        <Link href="/inspirations" className="flex items-center gap-3 lg:hidden">
          <Image
            src="/BowerLogo.png"
            alt="Bower"
            width={28}
            height={28}
            className="rounded-full"
          />
          <div className="min-w-0">
            <span className="font-headline text-lg uppercase tracking-[0.2em] text-primary lg:text-xl">
              Bower
            </span>
            <p className="font-label text-[9px] uppercase tracking-[0.28em] text-primary/40">
              {pathname.startsWith("/settings") ? copy.settings : copy.footerBrand}
            </p>
          </div>
        </Link>
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
          className="text-primary/60 transition-colors hover:text-primary lg:hidden"
          aria-label={copy.settings}
        >
          <Settings2 size={18} strokeWidth={1.5} />
        </Link>
        <Link
          href="/login"
          aria-label={accountStatus?.profile?.display_name ?? copy.signIn}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4.5 py-2 text-[13px] uppercase tracking-[0.14em] text-primary/70 transition-colors hover:text-primary"
        >
          <LogIn size={14} strokeWidth={1.6} className="shrink-0" />
          <span className="hidden max-w-[10rem] truncate font-label text-[14px] leading-none tracking-[0.1em] sm:block">
            {accountStatus?.profile?.display_name ?? copy.signIn}
          </span>
        </Link>
      </div>
    </nav>
  );
}
