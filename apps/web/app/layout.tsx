import type { Metadata } from "next";
import { Newsreader, Space_Grotesk, Manrope } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getAppPreferences } from "@/lib/api";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-headline",
  display: "swap",
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-label",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Bower",
  description: "Local-first design style asset management — curated by AI, owned by you.",
  icons: {
    icon: "/BowerLogo.png",
    apple: "/BowerLogo.png",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const uiLanguage = await getAppPreferences()
    .then((result) => result.data.ui_language)
    .catch(() => "zh-CN" as const);

  return (
    <html
      lang={uiLanguage}
      className={`${newsreader.variable} ${spaceGrotesk.variable} ${manrope.variable}`}
    >
      <body>
        <TooltipProvider delayDuration={300}>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
