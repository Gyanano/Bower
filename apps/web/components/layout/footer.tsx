import Image from "next/image";
import type { CopyDictionary } from "@/lib/i18n";

export function Footer({ copy }: { copy: CopyDictionary }) {
  return (
    <footer className="w-full px-6 py-14 lg:px-12 lg:py-16">
      <div className="flex items-center justify-between gap-6 border-t border-border pt-8">
        <div className="min-w-0">
          <p className="font-headline text-base leading-relaxed text-primary lg:text-lg">
            {copy.footerBrand} &copy; 2026
          </p>
          <p className="mt-1 font-body text-sm leading-relaxed text-muted-foreground lg:text-base">
            {copy.footerTagline}
          </p>
        </div>

        <Image
          src="/BowerLogo.png"
          alt="Bower"
          width={64}
          height={64}
          className="mr-6 shrink-0 rounded-full opacity-60 lg:mr-8"
        />
      </div>
    </footer>
  );
}
