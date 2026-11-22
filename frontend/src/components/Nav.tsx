import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const STEPS = [
  { n: "01", label: "Upload" },
  { n: "02", label: "Analyze" },
  { n: "03", label: "Report" },
];

/**
 * DESIGN_SYSTEM.md §4 #14 wordmark — serif `GapAnalyzer`, links to `/`.
 * Extracted from Nav for reuse on app screens (§5).
 */
export function NavWordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "shrink-0 transition-opacity duration-150 hover:opacity-70",
        className
      )}
    >
      <span className="font-display text-[26px] leading-none tracking-tight md:text-[28px]">
        GapAnalyzer
      </span>
    </Link>
  );
}

/**
 * The step row lives in the nav on app screens (mockups 01/03/04/07/08):
 * `01 UPLOAD — 02 ANALYZE — 03 REPORT`, the active step inked and
 * red-underlined, the others graphite. Below `sm` only the active step shows.
 * `active` is the 1-based step number shown in the row.
 */
function NavSteps({ active }: { active: number }) {
  return (
    <nav aria-label="Analysis progress">
      <ol className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.12em] md:gap-4 md:text-[12px]">
        {STEPS.map((step, i) => {
          const current = i + 1 === active;
          return (
            <li key={step.n} className="flex items-center gap-3 md:gap-4">
              {i > 0 && (
                <span aria-hidden className="hidden text-graphite sm:inline">
                  —
                </span>
              )}
              <span
                aria-current={current ? "step" : undefined}
                className={cn(
                  "relative whitespace-nowrap",
                  current ? "text-ink" : "hidden text-graphite sm:inline"
                )}
              >
                {step.n} {step.label}
                {current && (
                  <span
                    aria-hidden
                    className="absolute -bottom-1.5 left-0 h-px w-full bg-pen-red"
                  />
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * DESIGN_SYSTEM.md §4 #14 — serif GapAnalyzer wordmark; mono links;
 * dark Get Started button; hairline bottom rule.
 *
 * On app screens (`step`) the step row takes the right side (mockups), and
 * the marketing links/CTA are dropped. `status` is the 404's variant: the
 * marketing nav with a mono `ERROR 404` label where the phone shows the
 * compact step row (custom404page p2).
 */
export function Nav({ step, status }: { step?: number; status?: string }) {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between gap-6 px-6 md:h-[84px] md:px-12">
        <NavWordmark />

        {typeof step === "number" ? (
          <NavSteps active={step} />
        ) : (
          <div className="flex items-center gap-6 md:gap-8">
            {status && (
              <p className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.16em] text-graphite sm:hidden">
                {status}
              </p>
            )}
            <nav className="hidden md:block">
              <a
                href="#how-it-works"
                className="font-mono text-[11px] uppercase tracking-[0.12em] text-graphite transition-colors duration-150 hover:text-ink md:text-[12px]"
              >
                How it works
              </a>
            </nav>
            <Button
              href="/upload"
              mono
              size="sm"
              className={cn(
                "shrink-0 whitespace-nowrap",
                // The 404's phone nav shows only the status label (p2).
                status && "max-sm:hidden"
              )}
            >
              Get Started
              <span
                aria-hidden
                className="inline-block transition-transform duration-150 group-hover:translate-x-1"
              >
                →
              </span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
