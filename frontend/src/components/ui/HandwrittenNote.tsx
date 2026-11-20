import { cn } from "@/lib/cn";

/**
 * DESIGN_SYSTEM.md §4 #17 — Caveat, pen-red, rotated −3°…−6°,
 * max 1–2 per screen.
 */
export function HandwrittenNote({
  children,
  className,
  rotate = -4,
}: {
  children: React.ReactNode;
  className?: string;
  rotate?: number;
}) {
  return (
    <span
      aria-hidden
      style={{ transform: `rotate(${rotate}deg)` }}
      className={cn(
        "inline-block font-hand text-pen-red text-lg leading-tight",
        className
      )}
    >
      {children}
    </span>
  );
}
