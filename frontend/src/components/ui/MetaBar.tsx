import { cn } from "@/lib/cn";

/**
 * DESIGN_SYSTEM.md §4 #19 — footer mono row with hairline above (comp 04):
 * `RESUME ANALYSIS REPORT · CANDIDATE ID: #4827 · DATE: APR 25, 2025`.
 * Three-up on ≥sm, stacked on mobile.
 */
export function MetaBar({
  id = "#4827",
  date = "APR 25, 2025",
  className,
}: {
  id?: string;
  date?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-t border-rule pt-4 font-mono text-[11px] uppercase tracking-[0.1em] text-ink md:text-[12px]",
        className
      )}
    >
      <div className="flex flex-col gap-1.5 sm:grid sm:grid-cols-3 sm:gap-4">
        <span>Resume analysis report</span>
        <span className="sm:text-center">Candidate id: {id}</span>
        <span className="sm:text-right">Date: {date}</span>
      </div>
    </div>
  );
}
