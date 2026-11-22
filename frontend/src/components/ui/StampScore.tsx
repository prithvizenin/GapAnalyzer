import { cn } from "@/lib/cn";

/**
 * DESIGN_SYSTEM.md §4 #6 — distressed RED circular rubber stamp.
 *
 * Mockups 01/06: two hand-drawn rings (the outer one wobbles, as a real stamp
 * does), the score in the display serif and `MATCH` in mono beneath it. Colour
 * is always red — the number carries the meaning, never the hue.
 */
export function StampScore({
  value,
  size = "md",
  className,
}: {
  value: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "w-[104px] h-[104px]",
    md: "w-[150px] h-[150px]",
    // Mockups 01 (desktop ~230px) / 04 (phone ~132px)
    lg: "w-[132px] h-[132px] md:w-[230px] md:h-[230px]",
  };
  const numSizes = {
    sm: "text-[30px]",
    md: "text-[44px]",
    lg: "text-[38px] md:text-[68px]",
  };
  const labelSizes = {
    sm: "text-[9px]",
    md: "text-[10px]",
    lg: "text-[9px] md:text-[11px]",
  };

  return (
    <div
      role="img"
      aria-label={`${value} percent match`}
      className={cn(
        "relative grid shrink-0 select-none place-items-center text-pen-red",
        sizes[size],
        className
      )}
    >
      {/* Hand-drawn double ring — slightly irregular, like a rubber stamp. */}
      <svg
        aria-hidden
        viewBox="0 0 200 200"
        className="absolute inset-0 h-full w-full -rotate-[4deg]"
        fill="none"
        stroke="currentColor"
      >
        <path
          d="M100 6.5c51 0 93 41.5 93 93.5 0 52.5-42 94-93.5 94C48 194 6 152 6 100 6 47.5 48.5 6.5 100 6.5Z"
          strokeWidth="3"
        />
        <path
          d="M100 17c45.8 0 83 37.4 83 83.5S145.8 184 100 184s-83-37.4-83-83.5S54.2 17 100 17Z"
          strokeWidth="1.6"
          opacity="0.75"
        />
      </svg>

      <span className="relative flex flex-col items-center leading-none">
        <span
          className={cn(
            "font-display font-normal tracking-[-0.01em]",
            numSizes[size]
          )}
        >
          {value}%
        </span>
        <span
          className={cn(
            "mt-1.5 font-mono uppercase tracking-[0.22em]",
            labelSizes[size]
          )}
        >
          Match
        </span>
      </span>
    </div>
  );
}
