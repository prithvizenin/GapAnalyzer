"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useMotion, gsap, EASE, T } from "@/lib/motion";
import { cn } from "@/lib/cn";

/** The three things the guarded rewrite actually does, in order. */
const STEPS = [
  "Reading your resume",
  "Rewriting each line against the posting",
  "Checking nothing was invented",
];

/** Decorative rule widths inside a page thumbnail (percent). */
const LINES = [92, 74, 86, 62, 90, 70];

/** One page of the glide band — a hint of ruled paper, one line rewritten. */
function PageThumb({ tilt = 0, mark = -1 }: { tilt?: number; mark?: number }) {
  return (
    <div
      aria-hidden
      style={tilt ? { transform: `rotate(${tilt}deg)` } : undefined}
      className="relative h-[104px] w-[80px] shrink-0 rounded-[2px] border border-rule bg-paper-raised shadow-paper md:h-[122px] md:w-[94px]"
    >
      <div className="p-2 md:p-2.5">
        <div className="h-[5px] w-8/12 rounded-full bg-ink/70" />
        <div className="mt-2 h-px bg-rule" />
        <div className="mt-2 space-y-[5px]">
          {LINES.map((width, i) => (
            <div key={i} className="relative">
              {i === mark && (
                <span className="absolute inset-y-0 -left-1.5 w-[2px] bg-stamp-green" />
              )}
              <div
                style={{ width: `${width}%` }}
                className={cn(
                  "h-[3px] rounded-full",
                  i === mark ? "bg-ink/60" : "bg-graphite/40"
                )}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** One full set of pages. Rendered twice so the glide loops seamlessly. */
function PageSet() {
  return (
    <div className="flex gap-3 pr-3 md:gap-4 md:pr-4">
      <PageThumb tilt={-2} />
      <PageThumb tilt={1.5} mark={3} />
      <PageThumb tilt={-1} />
      <PageThumb tilt={2} mark={2} />
    </div>
  );
}

/**
 * Tailoring loader for `/rewrite` (DESIGN_SYSTEM §4 #26) — a gliding band of
 * resume pages with one line marked green, so the wait reads as the document
 * being rewritten rather than a bare "loading…" line. `POST /api/rewrite`
 * can take up to two minutes against the live model (§9), so the panel names
 * the current step and creeps a hairline bar toward — never to — 100%;
 * the page swaps to the review the instant the payload lands.
 */
export function TailoringPanel() {
  const root = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(6);
  const [step, setStep] = useState(0);

  // Eases toward 92% and stops: the real finish line is the response, so the
  // bar never claims done. Reset on unmount with the page's own teardown.
  useEffect(() => {
    const id = window.setInterval(() => {
      setProgress((p) => p + Math.max(0.8, (92 - p) * 0.06));
    }, 700);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % STEPS.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, []);

  useMotion(root, () => {
    gsap.from(".js-tailor-in", {
      y: 16,
      autoAlpha: 0,
      duration: T.enter,
      ease: EASE,
    });

    const track = root.current?.querySelector<HTMLElement>(".js-track");
    if (!track) return;
    // The set is rendered twice, so half the track width is one seamless loop:
    // the page that glides off the left edge is already back on the right.
    gsap.to(track, {
      x: () => -track.scrollWidth / 2,
      duration: 22,
      ease: "none",
      repeat: -1,
    });
  }, []);

  return (
    <div className="mt-8 flex justify-center md:mt-12">
      <Sheet className="js-tailor-in relative w-full max-w-[560px] overflow-hidden px-6 py-8 text-center md:px-10 md:py-11">
        {/* Glide band — masked at both edges so pages enter and leave softly */}
        <div
          aria-hidden
          className="relative -mx-6 overflow-hidden px-6 [mask-image:linear-gradient(to_right,transparent,black_14%,black_86%,transparent)] md:-mx-10"
        >
          <div className="js-track flex w-max">
            <PageSet />
            <PageSet />
          </div>
        </div>

        <div role="status" aria-live="polite">
          <p className="mt-7 font-mono text-[10.5px] uppercase tracking-[0.16em] text-graphite">
            Tailoring
          </p>
          <h2 className="mt-2 font-display text-[22px] uppercase leading-[1.15] tracking-[0.02em] md:text-[26px]">
            Your resume is being tailored
          </h2>
          <p className="mt-3 font-mono text-[11.5px] leading-[1.6] text-graphite">
            {STEPS[step]}
          </p>
        </div>

        <ProgressBar value={progress} className="mt-6" />

        <p className="mt-3 font-mono text-[11px] leading-[1.6] text-graphite">
          The model rewrites one line at a time — this can take a minute.
        </p>
      </Sheet>
    </div>
  );
}
