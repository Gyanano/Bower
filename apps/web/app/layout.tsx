import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bower",
  description: "Local-first inspiration workspace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
