"use client";

import { Suspense, useEffect, useState, type CSSProperties } from "react";
import { TopNav } from "./top-nav";
import { SideNav } from "./side-nav";
import { MobileTabBar } from "./mobile-tab-bar";
import type { CopyDictionary } from "@/lib/i18n";

const SIDEBAR_STORAGE_KEY = "bower-sidebar-open";

export function AppShell({
  children,
  copy,
  onSearchClick,
  onUploadClick,
}: {
  children: React.ReactNode;
  copy: CopyDictionary;
  onSearchClick?: () => void;
  onUploadClick?: () => void;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const desktopContentStyle = { "--sidebar-offset": isSidebarOpen ? "15rem" : "0rem" } as CSSProperties;

  useEffect(() => {
    const storedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (storedValue === "false") {
      setIsSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isSidebarOpen));
  }, [isSidebarOpen]);

  return (
    <div className="min-h-screen bg-background">
      <Suspense>
        <SideNav copy={copy} isOpen={isSidebarOpen} />
      </Suspense>

      <div className="min-w-0 transition-[padding-left] duration-500 lg:pl-[var(--sidebar-offset)]" style={desktopContentStyle}>
        <Suspense>
          <TopNav
            copy={copy}
            onSearchClick={onSearchClick}
            onUploadClick={onUploadClick}
            isSidebarOpen={isSidebarOpen}
            onSidebarToggle={() => setIsSidebarOpen((current) => !current)}
          />
        </Suspense>

        <main className="pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      <Suspense>
        <MobileTabBar copy={copy} />
      </Suspense>
    </div>
  );
}
