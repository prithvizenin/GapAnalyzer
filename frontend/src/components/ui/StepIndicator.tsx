import { Fragment, useRef } from "react";
import { cn } from "@/lib/cn";
import { useMotion, gsap, EASE, T } from "@/lib/motion";

const STEPS = [
  { n: "01", label: "Upload" },
  { n: "02", label: "Analyze" },
  { n: "03", label: "Report" },
];

/**
 * DESIGN_SYSTEM.md §4 #13 — centered mono uppercase `01 UPLOAD — 02 ANALYZE —
 * 03 REPORT`, active step ink + red hand-underline, hairline rule below;
 * collapses to active-step-only < 640px.
 */
export function StepIndicator({ active }: { active: number }) {
  const root = useRef<HTMLElement>(null);

  // Steps row rises once; the active step's red underline draws itself in
  // (red pen, §3.5) — re-runs when `active` advances (form → analyzing).
  useMotion(
    root,
    () => {
      gsap.from(root.current, { y: 10, autoAlpha: 0, duration: T.enter, ease: EASE });
      const path = root.current?.querySelector<SVGPathElement>(
        "[data-step-underline]"
      );
      if (path) {
        gsap.fromTo(
          path,
          { strokeDashoffset: 1 },
          { strokeDashoffset: 0, duration: T.draw, ease: EASE, delay: 0.18 }
        );
      }
    },
    [active]
  );

  return (
    <nav ref={root} aria-label="Analysis progress">
      <ol className="flex flex-wrap items-center justify-center gap-x-4 gap-y-4 font-mono text-[14px] md:gap-x-7 md:text-[18px] uppercase tracking-[0.08em]">
        {STEPS.map((step, i) => (
          <Fragment key={step.n}>
            {i > 0 && (
              <span aria-hidden className="hidden text-graphite sm:block">
                —
              </span>
            )}
            <li
              aria-current={i === active ? "step" : undefined}
              className={cn(
                "relative",
                i === active ? "text-ink" : "hidden text-graphite sm:block"
              )}
            >
              {step.n} {step.label}
              {i === active && (
                <svg
                  aria-hidden
                  viewBox="0 0 200 10"
                  preserveAspectRatio="none"
                  className="absolute -bottom-2 left-0 h-2.5 w-[calc(100%+6px)] -translate-x-[3px] text-pen-red"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                >
                  <path
                    data-step-underline
                    pathLength={1}
                    strokeDasharray={1}
                    d="M4 6C48 2 118 3 196 6"
                  />
                </svg>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
      <div className="mt-5 border-t border-rule md:mt-6" />
    </nav>
  );
}
