import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bower MVP Foundation",
  description: "Local-first inspiration upload foundation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <nav className="nav">
            <Link href="/">Home</Link>
            <Link href="/upload">Upload</Link>
            <Link href="/inspirations">Inspirations</Link>
            <Link href="/settings/ai">AI settings</Link>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
