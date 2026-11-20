import { useRef } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/cn";
import { useMotion, gsap, EASE, T } from "@/lib/motion";

const ITEMS = ["Extracting text", "Finding skills", "Scoring match"];

function Checkbox({ done }: { done: boolean }) {
  const root = useRef<HTMLSpanElement>(null);

  // Red pen checkmark draws itself the moment the row completes (§3.5).
  useMotion(
    root,
    () => {
      const path = root.current?.querySelector<SVGPathElement>("path");
      if (done && path) {
        gsap.fromTo(
          path,
          { strokeDashoffset: 52 },
          { strokeDashoffset: 0, duration: 0.32, ease: "power2.out" }
        );
      }
    },
    [done]
  );

  return (
    <span
      ref={root}
      className={cn(
        "relative grid h-7 w-7 shrink-0 place-items-center rounded-[2px] border-2 md:h-9 md:w-9",
        done ? "border-pen-red" : "border-ink/70"
      )}
    >
      {done && (
        <svg
          aria-hidden
          viewBox="0 0 40 40"
          className="absolute -left-2.5 -top-3 h-[calc(100%+26px)] w-[calc(100%+26px)] text-pen-red"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path strokeDasharray={52} d="M6 21 15.5 30.5 34 5" />
        </svg>
      )}
    </span>
  );
}

/**
 * Screen 03 "Analyzing" — an in-page state of /upload (not a route).
 * Pen-checklist sheet per comps/03-analyzing.png: red checkmarks draw in as
 * `progress` advances; the last row carries the hairline ProgressBar.
 * Simulated until the backend contract (POST /api/analyze) is wired.
 */
export function AnalyzingPanel({ progress }: { progress: number }) {
  const done = [progress >= 25, progress >= 50, progress >= 100];
  const root = useRef<HTMLDivElement>(null);

  // In-page state change (form → analyzing): same entrance, shorter.
  useMotion(root, () => {
    gsap.from(root.current, { y: 18, autoAlpha: 0, duration: T.enter, ease: EASE });
  }, []);

  return (
    <div
      ref={root}
      className="mt-10 flex justify-center px-0 sm:px-6 md:mt-16"
    >
      <Sheet className="relative w-full max-w-[640px] px-7 py-8 md:px-12 md:py-16">
        <ol role="status" aria-live="polite" className="relative z-10">
          {ITEMS.map((label, i) => (
            <li key={label}>
              <div
                className={cn(
                  "flex items-center gap-4 md:gap-5",
                  i > 0 && "pt-6 md:pt-10",
                  i < 2 && "border-b border-rule pb-6 md:pb-10"
                )}
              >
                <Checkbox done={done[i]} />
                <span className="font-mono text-[15px] uppercase tracking-[0.1em] text-ink md:text-[18px]">
                  {label}
                </span>
              </div>
              {i === 2 && (
                <ProgressBar
                  value={progress}
                  className="ml-[44px] mt-4 md:ml-[56px] md:mt-6"
                />
              )}
            </li>
          ))}
        </ol>

        {/* Red pen lying across the corner — pen motif (comp 03) */}
        <svg
          aria-hidden
          viewBox="0 0 240 56"
          className="pointer-events-none absolute -right-3 bottom-6 z-20 w-36 rotate-[-45deg] md:-right-40 md:bottom-5 md:w-96"
        >
          <path d="M8 28 34 20v16Z" fill="var(--color-ink)" />
          <rect
            x="34"
            y="16"
            width="7"
            height="24"
            fill="var(--color-graphite)"
          />
          <rect
            x="41"
            y="12"
            width="175"
            height="32"
            rx="16"
            fill="var(--color-pen-red)"
          />
          <rect
            x="70"
            y="12"
            width="7"
            height="32"
            fill="var(--color-graphite)"
          />
          <path
            d="M192 16h16a6 6 0 0 1 6 6v8"
            fill="none"
            stroke="var(--color-graphite)"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
      </Sheet>
    </div>
  );
}
