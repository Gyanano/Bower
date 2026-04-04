"use client";

import { Suspense } from "react";
import { TopNav } from "./top-nav";
import { SideNav } from "./side-nav";
import { MobileTabBar } from "./mobile-tab-bar";
import type { CopyDictionary } from "@/lib/i18n";

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
  return (
    <div className="min-h-screen bg-background">
      <Suspense>
        <TopNav copy={copy} onSearchClick={onSearchClick} onUploadClick={onUploadClick} />
        <SideNav copy={copy} />
      </Suspense>

      <main className="pt-[60px] lg:pt-[68px] lg:pl-[72px] pb-24 lg:pb-0">
        {children}
      </main>

      <Suspense>
        <MobileTabBar copy={copy} />
      </Suspense>
    </div>
  );
}
