import type { Metadata } from "next";
import { getAppPreferences } from "@/lib/api";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bower",
  description: "Local-first inspiration workspace",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const uiLanguage = await getAppPreferences()
    .then((result) => result.data.ui_language)
    .catch(() => "zh-CN" as const);

  return (
    <html lang={uiLanguage}>
      <body>{children}</body>
    </html>
  );
}
