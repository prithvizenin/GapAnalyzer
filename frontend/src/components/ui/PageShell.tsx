import { cn } from "@/lib/cn";

/**
 * App screens (mockups 01/03/04/07/08) sit directly under the nav's hairline:
 * wordmark left, step row right, then the page content — no centred step
 * indicator, no second wordmark. This wrapper supplies the shared measure and
 * rhythm so every screen lines up with the mockups.
 */
export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "mx-auto max-w-[1120px] px-6 pt-8 pb-16 md:px-12 md:pt-12 md:pb-20",
        className
      )}
    >
      {children}
    </main>
  );
}

/** Page title in the mockups' display serif — sentence case, tight leading. */
export function PageTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={cn(
        "font-display text-[34px] leading-[1.08] tracking-[-0.01em] md:text-[46px]",
        className
      )}
    >
      {children}
    </h1>
  );
}

/** Small mono caption used above blocks and beside titles (mockups). */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "font-mono text-[10px] uppercase tracking-[0.16em] text-graphite md:text-[11px]",
        className
      )}
    >
      {children}
    </p>
  );
}
