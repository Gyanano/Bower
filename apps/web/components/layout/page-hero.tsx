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
      <h1 className="font-headline text-4xl tracking-[0.12em] text-primary md:text-5xl lg:text-7xl">
        {title}
      </h1>
      <p className="mx-auto mt-4 max-w-2xl font-body text-sm leading-relaxed text-muted-foreground md:text-base">
        {subtitle}
      </p>
    </section>
  );
}
