import { cn } from "@/lib/cn";
import { Sheet } from "@/components/ui/Sheet";
import { AnnotationNumber } from "@/components/ui/AnnotationNumber";

/**
 * DESIGN_SYSTEM.md §4 #11 — sheet with paperclip, blue circled number,
 * red vertical rule at left margin, body copy, red double-underline
 * flourish (comp 05's SUGGESTION card).
 *
 * `meta` (weeks 10–11) is the category label the suggestion closes — rendered
 * right-aligned in the header. `/report` stacks one card per gap category.
 */
export function SuggestionCard({
  n,
  text,
  meta,
  className,
}: {
  n: number;
  text: string;
  meta?: string;
  className?: string;
}) {
  return (
    <Sheet clip tilt={0.5} className={cn("px-7 pt-7 pb-6 md:px-8", className)}>
      <div className="flex items-center gap-4">
        <AnnotationNumber n={n} />
        <p className="font-mono text-[13px] uppercase tracking-[0.14em] text-ink md:text-[14px]">
          Suggestion
        </p>
        {meta && (
          <span className="ml-auto font-mono text-[11px] uppercase tracking-[0.14em] text-graphite">
            {meta}
          </span>
        )}
      </div>

      <div className="mt-4 border-t border-rule" />

      <div className="mt-4 border-l-2 border-pen-red pl-4 md:pl-5">
        <p className="font-mono text-[14.5px] leading-[1.65] text-ink md:text-[15.5px]">
          {text}
        </p>
        {/* red double-underline flourish */}
        <svg
          aria-hidden
          viewBox="0 0 150 14"
          preserveAspectRatio="none"
          className="mt-3 h-3 w-32 text-pen-red"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <path d="M3 5C40 1 95 8 147 4" />
          <path d="M8 10C50 6 105 12 142 8" />
        </svg>
      </div>
    </Sheet>
  );
}
