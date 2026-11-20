import { cn } from "@/lib/cn";

/**
 * DESIGN_SYSTEM.md §4 #18 — blue circled hand-number, used by
 * AnnotationItem (#10) and SuggestionCard (#11).
 */
export function AnnotationNumber({
  n,
  className,
}: {
  n: number;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-grid h-10 w-10 shrink-0 place-items-center", className)}>
      {/* hand-drawn circle with a slight overshoot */}
      <svg
        aria-hidden
        viewBox="0 0 40 40"
        className="absolute inset-0 h-full w-full -rotate-6 text-ink-blue"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      >
        <path d="M21.5 4.2C30 3.6 36.8 10.4 36.6 19.6 36.4 28.8 29.4 35.8 20.2 36.4 11 37 4 30.4 3.6 21.2 3.2 12 10.4 4.8 19 4" />
      </svg>
      <span className="font-hand text-[19px] font-semibold leading-none text-ink-blue">
        {n}
      </span>
    </span>
  );
}
