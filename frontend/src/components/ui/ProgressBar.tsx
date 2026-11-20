import { cn } from "@/lib/cn";

/**
 * DESIGN_SYSTEM.md §4 #20 — hairline track, ink fill, optional mono
 * percentage (comp 03 shows no numeric label, so it stays off by default).
 */
export function ProgressBar({
  value,
  showValue = false,
  className,
}: {
  value: number;
  showValue?: boolean;
  className?: string;
}) {
  const pct = Math.round(value);
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-3 flex-1 overflow-hidden border border-rule bg-paper-raised md:h-3.5"
      >
        <div
          className="h-full bg-ink transition-[width] duration-300 ease-out"
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      {showValue && (
        <span className="font-mono text-[11px] tabular-nums text-graphite">
          {pct}%
        </span>
      )}
    </div>
  );
}
