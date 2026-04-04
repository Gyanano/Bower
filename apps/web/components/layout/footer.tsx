import Image from "next/image";
import type { CopyDictionary } from "@/lib/i18n";

export function Footer({ copy }: { copy: CopyDictionary }) {
  return (
    <footer className="w-full flex flex-col items-center gap-6 px-6 lg:px-12 py-16 lg:py-24 max-w-5xl mx-auto border-t border-border">
      <div className="flex flex-col items-center gap-3">
        <Image
          src="/BowerLogo.png"
          alt="Bower"
          width={48}
          height={48}
          className="rounded-full opacity-40"
        />
        <p className="font-headline italic text-primary text-lg lg:text-xl">
          {copy.footerBrand} &copy; 2024
        </p>
      </div>
      <p className="font-label text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
        {copy.footerTagline}
      </p>
    </footer>
  );
}
