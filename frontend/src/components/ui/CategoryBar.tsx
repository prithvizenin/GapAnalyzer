import { cn } from "@/lib/cn";

/**
 * DESIGN_SYSTEM.md §4 #9 — mono label above, white track + hairline border +
 * ink fill, mono % at right (comp 04: Technical 80 / Tools 60 / Soft skills 45).
 * Values 0–100. The fill carries `data-bar` — the GSAP ink-fill tween
 * (scaleX from 0, left origin) lives in the results timeline (§3.5).
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
      <p className="font-mono text-[13px] uppercase tracking-[0.12em] text-ink md:text-[15px]">
        {label}
      </p>
      <div className="mt-2 flex items-center gap-4 md:gap-5">
        <div className="h-3 flex-1 border border-rule bg-paper-raised md:h-3.5">
          <div
            data-bar
            className="h-full bg-ink"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-9 shrink-0 text-right font-mono text-[13px] md:text-[14px]">
          {pct}%
        </span>
      </div>
    </div>
  );
}
