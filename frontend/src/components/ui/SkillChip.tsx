import { cn } from "@/lib/cn";

/**
 * DESIGN_SYSTEM.md §4 #8 — mono uppercase pills (mockups 01/02/04/06).
 *
 * matched = highlight-yellow fill + `--on-highlight` text (dark ink on yellow
 * in BOTH themes — §3.1, never flips).
 * missing = transparent + 1px red border + red strikethrough.
 *
 * `semantic` (weeks 8–9) marks a matched skill found by meaning rather than by
 * name: same yellow fill plus a dotted `--on-highlight` underline. The results
 * page carries the `≈ MATCHED BY MEANING` legend (§6).
 * `data-chip` hooks page timelines (results/hero markup sequences).
 */
export function SkillChip({
  label,
  status,
  semantic = false,
  className,
}: {
  label: string;
  status: "matched" | "missing";
  semantic?: boolean;
  className?: string;
}) {
  return (
    <span
      data-chip={status}
      className={cn(
        "inline-block whitespace-nowrap rounded-full px-3.5 py-[5px] font-mono text-[11px] uppercase tracking-[0.06em] md:text-[11.5px]",
        status === "matched" && "hl-sweep text-on-highlight",
        status === "missing" &&
          "border border-pen-red/80 text-pen-red line-through decoration-pen-red decoration-1",
        semantic &&
          status === "matched" &&
          "underline decoration-dotted decoration-on-highlight/60 underline-offset-4",
        className
      )}
    >
      {label}
      {semantic && <span className="sr-only"> — matched by meaning</span>}
    </span>
  );
}
