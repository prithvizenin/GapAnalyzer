"use client";

import { useRef } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { useMotion, gsap, EASE, T } from "@/lib/motion";

const STEPS = [
  { n: "01", label: "Upload" },
  { n: "02", label: "Analyze" },
  { n: "03", label: "Report" },
];

/** Copy deck steps band — target of the nav's #how-it-works anchor.
 *  Reveals on scroll (§3.5). */
export function StepsBand() {
  const root = useRef<HTMLElement>(null);
  useMotion(root, () => {
    gsap.from(root.current, {
      y: 14,
      autoAlpha: 0,
      duration: T.enter,
      ease: EASE,
      scrollTrigger: { trigger: root.current!, start: "top 88%", once: true },
    });
  }, []);

  return (
    <section
      ref={root}
      id="how-it-works"
      className="border-y border-rule bg-paper"
    >
      <div className="mx-auto max-w-[1120px] px-6 md:px-12 py-7">
        <ol className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 font-mono text-[12px] md:text-[13px] uppercase tracking-[0.14em]">
          {STEPS.map((step, i) => (
            <li key={step.n} className="flex items-center gap-5">
              <span className="flex items-baseline gap-2">
                <span className="text-pen-red">{step.n}</span>
                <span className="text-ink">{step.label}</span>
              </span>
              {i < STEPS.length - 1 && (
                <span aria-hidden className="text-graphite">
                  —
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    title: "AI-powered analysis",
    body: "Get precise, contextual feedback in seconds.",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  },
  {
    title: "Detailed gap report",
    body: "See what's missing, why it matters, and how to fix it.",
    icon: (
      <>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5M9 13h6M9 17h4" />
      </>
    ),
  },
  {
    title: "Actionable next steps",
    body: "Get tailored tips to close the gap and stand out.",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" />
      </>
    ),
  },
  {
    title: "Apply with confidence",
    body: "Build a resume that gets you interviews.",
    icon: <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z" />,
  },
];

/** Copy deck FeatureRow — 4 columns split by hairlines (from comp 01).
 *  Columns cascade in together when the row enters view (§3.5). */
export function FeatureRow() {
  const root = useRef<HTMLElement>(null);
  useMotion(root, () => {
    gsap.from(".js-feat", {
      y: 18,
      autoAlpha: 0,
      duration: T.enter,
      stagger: 0.08,
      ease: EASE,
      scrollTrigger: { trigger: root.current!, start: "top 88%", once: true },
    });
  }, []);

  return (
    <section
      ref={root}
      className="mx-auto max-w-[1120px] px-6 md:px-12 pb-20 md:pb-28"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-rule">
        {FEATURES.map((feature, i) => (
          <div
            key={feature.title}
            className={`js-feat px-0 sm:px-7 py-8 sm:border-l border-rule ${
              i === 0 ? "sm:border-l-0" : ""
            } ${i < FEATURES.length - 1 ? "border-b sm:border-b-0" : ""}`}
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-ink"
            >
              {feature.icon}
            </svg>
            <h3 className="font-mono text-[12px] uppercase tracking-[0.1em] mt-4 mb-2">
              {feature.title}
            </h3>
            <p className="text-[14px] leading-relaxed text-ink-soft">
              {feature.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
