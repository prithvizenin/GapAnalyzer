import { cn } from "@/lib/cn";

/** Paperclip motif (DESIGN_SYSTEM §4 #5) — exported so titled sheets can put
 *  it inline next to the title (comp 04: MATCHED / MISSING sheets). */
export function Paperclip({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

/**
 * DESIGN_SYSTEM.md §4 #5 — paper-raised, hairline border, paper-lift shadow,
 * optional paperclip, optional ±0.5° rotation. The unit of every screen.
 */
export function Sheet({
  children,
  className,
  clip = false,
  tilt = 0,
}: {
  children: React.ReactNode;
  className?: string;
  clip?: boolean;
  tilt?: number;
}) {
  return (
    <div
      style={tilt ? { transform: `rotate(${tilt}deg)` } : undefined}
      className={cn(
        "relative bg-paper-raised border border-rule shadow-paper rounded-[3px]",
        className
      )}
    >
      {clip && (
        <Paperclip className="absolute -top-4 right-6 w-8 h-8 text-graphite rotate-12" />
      )}
      {children}
    </div>
  );
}
