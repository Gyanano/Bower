import { cn } from "@/lib/utils";

export function PageHero({
  title,
  subtitle,
  className,
}: {
  title: string;
  subtitle: string;
  className?: string;
}) {
  return (
    <section className={cn("px-6 pt-12 pb-8 text-center lg:px-12 lg:pt-20 lg:pb-12", className)}>
      <h1 className="font-headline text-4xl uppercase tracking-[0.15em] text-primary md:text-5xl lg:text-7xl">
        {title}
      </h1>
      <p className="mx-auto mt-4 max-w-2xl font-headline text-sm leading-relaxed text-muted-foreground italic md:text-base">
        {subtitle}
      </p>
      <div className="mt-7 flex justify-center">
        <div className="h-px w-24 bg-primary/25 lg:w-36" />
      </div>
    </section>
  );
}
