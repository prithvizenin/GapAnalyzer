import { cn } from "@/lib/cn";

/**
 * DESIGN_SYSTEM.md §4 #7 — rotated bordered status stamps.
 * red: GOOD MATCH / ON TRACK / NEEDS WORK; green: APPROVED / IMPROVED.
 * ±rotation, 2px border, mono caps. Presentational only: the 1.25→1 land
 * is a GSAP tween driven by the owning page timeline (or DiffRow) —
 * target `[data-stamp]`. Rotation lives in the inline transform, so the
 * tween animates `scale` and leaves it intact.
 */
export function StatusStamp({
  label,
  tone = "red",
  rotate = -8,
  className,
}: {
  label: string;
  tone?: "red" | "green";
  rotate?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      data-stamp
      style={{ transform: `rotate(${rotate}deg)` }}
      className={cn(
        "inline-block border-[2.5px] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] leading-none",
        tone === "red" && "border-pen-red text-pen-red",
        tone === "green" && "border-stamp-green text-stamp-green",
        className
      )}
    >
      {label}
    </span>
  );
}
