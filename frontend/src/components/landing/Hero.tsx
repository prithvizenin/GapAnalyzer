"use client";

import { useRef } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { StampScore } from "@/components/ui/StampScore";
import { SkillChip } from "@/components/ui/SkillChip";
import { HandwrittenNote } from "@/components/ui/HandwrittenNote";
import { useMotion, gsap, EASE, T } from "@/lib/motion";

const MISSING_SKILLS = ["TypeScript", "Next.js", "Unit Testing", "System Design", "AWS"];

/**
 * The floating report preview on the landing hero (mockups 05/06): tilted
 * sheet, `GAP ANALYSIS REPORT`, role + company, the red score stamp, the
 * missing-skill chips and one suggestion behind a red rule.
 */
function ReportSheet() {
  return (
    <Sheet
      tilt={-1.4}
      className="js-sheet mx-auto w-full max-w-[520px] px-7 pt-7 pb-8 md:px-9 md:pt-8 md:pb-9"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-graphite">
            Gap Analysis Report
          </p>
          <p className="mt-3 font-display text-[24px] leading-tight tracking-tight md:text-[27px]">
            Senior Frontend Developer
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-graphite">
            Acme Technologies
          </p>
        </div>
        <StampScore value={72} size="sm" className="-mt-1 shrink-0" />
      </div>

      <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.16em] text-graphite">
        Key Missing Skills
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {MISSING_SKILLS.map((skill) => (
          <SkillChip key={skill} label={skill} status="missing" />
        ))}
      </div>

      <div className="mt-6 border-l-2 border-pen-red pl-4">
        <p className="text-[13.5px] leading-snug text-ink-soft md:text-[14px]">
          Add a bullet mentioning CI/CD. The posting emphasizes it 3 times.
        </p>
      </div>
    </Sheet>
  );
}

export function Hero() {
  const root = useRef<HTMLElement>(null);

  // The landing's one authored sequence (§3.5): copy rises → sheet lands →
  // red scribble draws → chips rise. Above the fold, so it plays on load.
  useMotion(
    root,
    () => {
      const tl = gsap.timeline({ defaults: { ease: EASE } });
      tl.from(".js-eyebrow", { y: 12, autoAlpha: 0, duration: 0.4 }, 0)
        .from(".js-title", { y: 18, autoAlpha: 0, duration: 0.46 }, 0.06)
        .from(".js-sub", { y: 14, autoAlpha: 0, duration: 0.44 }, 0.16)
        .from(".js-cta", { y: 14, autoAlpha: 0, duration: 0.44 }, 0.26)
        .from(
          ".js-sheet",
          { y: 26, autoAlpha: 0, scale: 0.985, duration: T.sheet },
          0.2
        )
        .fromTo(
          ".js-scribble",
          { strokeDashoffset: 1 },
          { strokeDashoffset: 0, duration: T.draw, stagger: 0.08 },
          0.55
        )
        .from(
          '[data-chip="missing"]',
          { y: 7, autoAlpha: 0, duration: 0.34, stagger: 0.05 },
          0.62
        );
    },
    []
  );

  return (
    <section
      ref={root}
      className="mx-auto max-w-[1120px] px-6 pt-10 pb-14 md:px-12 md:pt-16 md:pb-20"
    >
      <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
        {/* Left: copy */}
        <div className="min-w-0">
          <div className="js-eyebrow flex items-center gap-4">
            <span aria-hidden className="h-px w-10 shrink-0 bg-ink-soft md:w-14" />
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft md:text-[11px]">
              Resume <span className="text-pen-red">→</span> Job Description Gap
              Analyzer
            </p>
          </div>

          <h1 className="js-title mt-6 font-display text-[clamp(44px,8vw,72px)] leading-[1.02] tracking-[-0.01em] md:mt-7">
            Know exactly what your resume is missing.
          </h1>

          <p className="js-sub mt-6 max-w-[46ch] text-[16px] leading-[1.6] text-ink-soft md:text-[17px]">
            Upload your resume and a job description. See your match score, the
            skills the posting wants that your resume never shows, and a
            tailored version you can download.
          </p>

          <div className="js-cta mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="relative w-full sm:w-auto">
              <Button href="/upload" mono className="w-full sm:w-auto">
                Analyze my resume
                <span
                  aria-hidden
                  className="inline-block transition-transform duration-150 group-hover:translate-x-1"
                >
                  →
                </span>
              </Button>
              {/* red pen scribble underline */}
              <svg
                aria-hidden
                viewBox="0 0 240 14"
                preserveAspectRatio="none"
                className="absolute -bottom-3 left-0 h-3 w-[101%] text-pen-red"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <path
                  className="js-scribble"
                  pathLength={1}
                  strokeDasharray={1}
                  d="M3 8 C 55 2, 110 11, 160 6 S 215 4, 237 8"
                />
              </svg>
            </div>

            <HandwrittenNote
              rotate={-2}
              className="text-[17px] md:text-[19px]"
            >
              No account. Nothing stored.
            </HandwrittenNote>
          </div>
        </div>

        {/* Right: report preview + the one handwritten arrow */}
        <div className="relative min-w-0 lg:pl-4">
          <ReportSheet />
          <div className="mt-3 flex items-center justify-end gap-1 pr-2">
            <HandwrittenNote rotate={-3} className="text-[18px] md:text-[20px]">
              Focus here
            </HandwrittenNote>
            <svg
              aria-hidden
              viewBox="0 0 24 32"
              className="h-7 w-5 text-pen-red"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 30 C 12 20, 10 12, 12 3" />
              <path d="M6 9 L12 2.5 L18 9" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
