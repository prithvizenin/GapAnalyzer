import { cn } from "@/lib/cn";

/**
 * DESIGN_SYSTEM.md §4 #6 — distressed RED circular rubber stamp with star
 * accents. Color is always red regardless of score; the number carries meaning.
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
    sm: "w-24 h-24",
    md: "w-36 h-36",
    lg: "w-44 h-44",
  };
  const numSizes = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-5xl",
  };

  return (
    <div
      role="img"
      aria-label={`${value} percent match`}
      className={cn(
        "relative grid place-items-center rounded-full border-[3px] border-pen-red text-pen-red -rotate-6 select-none",
        sizes[size],
        className
      )}
    >
      {/* inner ring */}
      <span
        aria-hidden
        className="absolute inset-[7px] rounded-full border border-pen-red/70"
      />
      {/* star accents */}
      <span
        aria-hidden
        className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] leading-none"
      >
        ★
      </span>
      <span
        aria-hidden
        className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] leading-none"
      >
        ★
      </span>
      <span className="flex flex-col items-center leading-none">
        <span
          className={cn(
            "font-display font-normal tracking-tight",
            numSizes[size]
          )}
        >
          {value}%
        </span>
        <span className="font-mono uppercase tracking-[0.18em] mt-1 text-[10px] md:text-[11px]">
          Match
        </span>
      </span>
    </div>
  );
}
