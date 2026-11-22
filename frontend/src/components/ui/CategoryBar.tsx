import { cn } from "@/lib/cn";

/**
 * DESIGN_SYSTEM.md §4 #9 — mono label above a thin track with an ink fill and
 * the mono percentage at the right (mockups 01/04: Technical 80 / Tools 60 /
 * Soft skills 45). Values 0–100. The fill carries `data-bar` — the GSAP
 * ink-fill tween (scaleX from 0, left origin) lives in the results timeline.
 */
export function CategoryBar({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className={cn(className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink md:text-[11px]">
          {label}
        </p>
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-ink md:text-[11px]">
          {pct}%
        </span>
      </div>
      <div className="mt-1.5 h-[5px] border border-rule bg-paper-raised md:h-[6px]">
        <div
          data-bar
          className="h-full bg-ink"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
