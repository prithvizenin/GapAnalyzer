import { cn } from "@/lib/cn";

/**
 * DESIGN_SYSTEM.md §4 #20 — hairline track, ink fill, optional mono
 * percentage (comp 03 shows no numeric label, so it stays off by default).
 *
 * `pen` rides a pencil tip at the edge of the fill (analyzing screen,
 * upload_screen.pdf p1): graphite point, red barrel, ferrule band, tilted so
 * the point dips below the bar. Decorative — `aria-hidden` — and desktop only,
 * since p2's phone bar is a plain fill. It sits on the fill's right edge, so
 * the bar still reads as a measurement, not a control.
 */
export function ProgressBar({
  value,
  showValue = false,
  pen = false,
  className,
}: {
  value: number;
  showValue?: boolean;
  pen?: boolean;
  className?: string;
}) {
  const pct = Math.round(value);
  const width = Math.min(100, Math.max(0, value));
  // The pen rides the fill's edge but stops short of the track's end, so it
  // never overhangs into the layout when the analysis completes.
  const penAt = Math.min(width, 97);
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative h-3 flex-1 overflow-visible border border-rule bg-paper-raised md:h-3.5"
      >
        <div
          className="h-full bg-ink transition-[width] duration-300 ease-out"
          style={{ width: `${width}%` }}
        />
        {pen && (
          // Desktop only — upload_screen.pdf p2's phone bar is a plain fill.
          // p1 measures a tilted pencil: the graphite point hangs below the bar
          // (the fill is ink, so a point inside it would vanish) while the red
          // barrel rides the fill's edge and lifts to the right, with the
          // ferrule band just behind the point.
          <svg
            aria-hidden
            viewBox="0 0 78 34"
            style={{ left: `${penAt}%` }}
            className="pointer-events-none absolute top-1/2 hidden h-[31px] w-[72px] -translate-x-[7px] -translate-y-1/2 md:block"
          >
            <g transform="rotate(-9 16 17)">
              {/* graphite point — apex under the bar, base flush on the barrel */}
              <path d="M0 28 16 9v22Z" fill="var(--color-ink)" />
              {/* red barrel, round cap, flush against the point */}
              <rect
                x="14"
                y="6"
                width="62"
                height="21"
                rx="10.5"
                fill="var(--color-pen-red)"
              />
              {/* ferrule band just behind the point */}
              <rect
                x="25"
                y="6"
                width="5"
                height="21"
                fill="var(--color-graphite)"
                opacity="0.5"
              />
            </g>
          </svg>
        )}
      </div>
      {showValue && (
        <span className="font-mono text-[11px] tabular-nums text-graphite">
          {pct}%
        </span>
      )}
    </div>
  );
}
