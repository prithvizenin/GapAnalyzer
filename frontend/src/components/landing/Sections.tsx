"use client";

import { useRef } from "react";
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
      <div className="mx-auto max-w-[1120px] px-6 py-6 md:px-12 md:py-7">
        <ol className="flex flex-wrap items-center gap-x-4 gap-y-3 font-mono text-[11px] uppercase tracking-[0.16em] md:gap-x-6 md:text-[12px]">
          {STEPS.map((step, i) => (
            <li key={step.n} className="flex items-center gap-4 md:gap-6">
              <span className="flex items-baseline gap-2">
                <span className="text-graphite">{step.n}</span>
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
  { title: "AI-powered analysis", body: "Precise, contextual feedback in seconds." },
  {
    title: "Detailed gap report",
    body: "See what's missing, why it matters, and how to fix it.",
  },
  { title: "Actionable next steps", body: "Tailored tips to close the gap." },
  {
    title: "Apply with confidence",
    body: "Rewrites reuse your own facts. Nothing is invented.",
  },
];

/** Copy deck FeatureRow (mockups 05/06) — 4 hairline-split columns, mono caps
 *  title over a short line, no icons. Columns cascade in on scroll (§3.5). */
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
      className="mx-auto max-w-[1120px] px-6 pb-16 md:px-12 md:pb-24"
    >
      <div className="grid grid-cols-1 border-t border-rule sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature, i) => (
          <div
            key={feature.title}
            className={`js-feat py-6 sm:px-7 sm:py-7 lg:border-l lg:border-rule ${
              i === 0 ? "lg:border-l-0" : ""
            } ${i < FEATURES.length - 1 ? "border-b border-rule sm:border-b-0" : ""}`}
          >
            <h3 className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink">
              {feature.title}
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
              {feature.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
