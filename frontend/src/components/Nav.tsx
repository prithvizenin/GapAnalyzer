import { Button } from "@/components/ui/Button";

/**
 * DESIGN_SYSTEM.md §4 #14 wordmark — serif `GapAnalyzer` + ™, links to `/`.
 * Extracted from Nav for reuse on app screens (report logo, §5).
 */
export function NavWordmark({ className }: { className?: string }) {
  return (
    <a
      href="/"
      className={`flex items-baseline gap-1 shrink-0 transition-opacity duration-150 hover:opacity-70 ${className ?? ""}`}
    >
      <span className="font-display text-[26px] leading-none tracking-tight">
        GapAnalyzer
      </span>
      <span className="font-mono text-[9px] text-graphite translate-y-[-6px]">
        ™
      </span>
    </a>
  );
}

/**
 * DESIGN_SYSTEM.md §4 #14 — serif GapAnalyzer wordmark; mono links;
 * dark Get Started button; hairline bottom rule.
 * Mid-sem: ship HOW IT WORKS only (pricing/FAQ deferred).
 */
export function Nav() {
  return (
    <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur-[2px] border-b border-rule">
      <div className="mx-auto max-w-[1120px] px-6 md:px-12 h-16 md:h-[72px] flex items-center justify-between gap-6">
        <NavWordmark />

        <nav className="hidden md:flex items-center gap-8 font-mono text-[12px] uppercase tracking-[0.08em] text-ink-soft">
          <a
            href="#how-it-works"
            className="hover:text-ink transition-colors duration-150"
          >
            How it works
          </a>
        </nav>

        <Button href="/upload" size="sm">
          Get Started{" "}
          <span
            aria-hidden
            className="inline-block transition-transform duration-150 group-hover:translate-x-1"
          >
            →
          </span>
        </Button>
      </div>
    </header>
  );
}
