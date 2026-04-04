import Link from "next/link";
import type { CopyDictionary } from "@/lib/i18n";

export function BoardCard({
  name,
  count,
  coverUrl,
  href,
  copy,
}: {
  name: string;
  count: number;
  coverUrl: string | null;
  href: string;
  copy: CopyDictionary;
}) {
  return (
    <Link href={href} className="group block">
      <div className="aspect-square rounded-lg overflow-hidden bg-muted transition-all duration-500 group-hover:shadow-hover">
        {coverUrl ? (
          <img
            alt={name}
            src={coverUrl}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-body text-3xl font-semibold text-primary/22">
              空
            </span>
          </div>
        )}
      </div>
      <div className="mt-3 px-0.5">
        <h3 className="font-headline text-sm lg:text-base uppercase tracking-[0.1em] text-primary leading-tight">
          {name}
        </h3>
        <p className="font-label text-[9px] uppercase tracking-[0.3em] text-muted-foreground mt-1">
          {count} {copy.artifactCount}
        </p>
      </div>
    </Link>
  );
}
