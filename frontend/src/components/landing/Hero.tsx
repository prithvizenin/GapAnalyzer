"use client";

import { useRef } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { StampScore } from "@/components/ui/StampScore";
import { StatusStamp } from "@/components/ui/StatusStamp";
import { SkillChip } from "@/components/ui/SkillChip";
import { HandwrittenNote } from "@/components/ui/HandwrittenNote";
import { useMotion, gsap, EASE, T } from "@/lib/motion";

const MISSING_SKILLS = [
  "React",
  "TypeScript",
  "Next.js",
  "Unit Testing",
  "System Design",
  "AWS",
];

const RECOMMENDATIONS = [
  "Add hands-on React and Next.js projects to your resume.",
  "Highlight your experience with TypeScript and testing.",
  "Include any AWS or cloud-related work if applicable.",
  "Tailor your summary to match the job's key requirements.",
];

function ReportSheet() {
  return (
    <Sheet clip className="js-sheet w-full max-w-[460px] mx-auto lg:mx-0">
      {/* Header */}
      <div className="flex items-center justify-between px-7 pt-7 pb-4 border-b border-rule">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink">
          Gap Analysis Report
        </span>
        <span className="font-mono text-[11px] text-graphite">APR 23, 2025</span>
      </div>

      {/* Match score */}
      <div className="flex items-start gap-6 px-7 py-6 border-b border-rule">
        <div className="shrink-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-graphite mb-3">
            Match Score
          </p>
          <StampScore value={72} size="md" />
        </div>
        <div className="pt-1 min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-graphite">
            Job Title
          </p>
          <p className="text-[14px] font-medium mt-0.5 mb-3 truncate">
            Senior Frontend Developer
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-graphite">
            Company
          </p>
          <p className="text-[14px] font-medium mt-0.5">Acme Technologies</p>
        </div>
        <div className="hidden sm:block ml-auto pt-2">
          <StatusStamp label="Good Match" tone="red" rotate={7} />
        </div>
      </div>

      {/* Key missing skills */}
      <div className="px-7 py-5 border-b border-rule relative">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-graphite">
            Key Missing Skills
          </p>
          <HandwrittenNote rotate={-5} className="text-[15px] flex items-center gap-1">
            Focus here
            <svg
              aria-hidden
              viewBox="0 0 32 24"
              className="w-6 h-5 text-pen-red"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M30 3 C 18 2, 8 8, 4 18" />
              <path d="M4 18 l 7 -3 M4 18 l 1.5 -7" />
            </svg>
          </HandwrittenNote>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {MISSING_SKILLS.map((skill) => (
            <SkillChip key={skill} label={skill} status="missing" />
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="px-7 py-5 border-b border-rule relative">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-graphite mb-3">
          Top Recommendations
        </p>
        <ol className="space-y-2">
          {RECOMMENDATIONS.map((rec, i) => (
            <li key={rec} className="flex gap-3 text-[13.5px] leading-snug text-ink-soft">
              <span className="font-display text-ink shrink-0">{i + 1}.</span>
              <span>{rec}</span>
            </li>
          ))}
        </ol>
        <div className="flex items-center justify-end gap-2 mt-3">
          <HandwrittenNote rotate={-4} className="text-[15px]">
            Great foundation!
          </HandwrittenNote>
          <span aria-hidden className="text-pen-red text-lg leading-none">
            ★
          </span>
        </div>
      </div>

      {/* Overall assessment */}
      <div className="flex items-end justify-between gap-4 px-7 py-5">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-graphite mb-2">
            Overall Assessment
          </p>
          <p className="text-[13.5px] leading-snug text-ink-soft">
            You&apos;re a strong candidate, but there are a few key skills and
            keywords missing from your resume.
          </p>
        </div>
        <StatusStamp label="On Track" tone="green" rotate={-6} className="shrink-0" />
      </div>
    </Sheet>
  );
}

export function Hero() {
  const root = useRef<HTMLElement>(null);

  // The landing's one authored sequence (§3.5): copy rises → sheet lands →
  // red scribble draws → chips rise → stamps land. Above the fold, so it
  // plays on load (scroll reveals live in Sections).
  useMotion(root, () => {
    const tl = gsap.timeline({ defaults: { ease: EASE } });
    tl.from(".js-eyebrow", { y: 12, autoAlpha: 0, duration: 0.4 }, 0)
      .from(".js-title", { y: 18, autoAlpha: 0, duration: 0.46 }, 0.06)
      .from(".js-sub", { y: 14, autoAlpha: 0, duration: 0.44 }, 0.16)
      .from(".js-cta", { y: 14, autoAlpha: 0, duration: 0.44 }, 0.26)
      .from(
        ".js-sheet",
        { y: 26, autoAlpha: 0, scale: 0.985, rotate: -0.6, duration: T.sheet },
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
      )
      .from(
        "[data-stamp]",
        { scale: 1.25, autoAlpha: 0, duration: T.stamp, stagger: 0.14 },
        0.78
      );
  }, []);

  return (
    <section
      ref={root}
      className="mx-auto max-w-[1120px] px-6 md:px-12 pt-14 md:pt-20 pb-16 md:pb-24"
    >
      <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-start">
        {/* Left: copy */}
        <div className="pt-2 min-w-0">
          <div className="js-eyebrow border-t border-rule pt-4 flex items-center gap-4">
            <p className="font-mono text-[11px] md:text-[12px] uppercase tracking-[0.14em] text-ink-soft">
              Resume <span className="text-pen-red">→</span> Job Description Gap
              Analyzer
            </p>
            <span aria-hidden className="flex-1 border-t border-rule" />
          </div>

          <h1 className="js-title font-display text-[clamp(40px,7vw,64px)] leading-[1.05] tracking-tight mt-6">
            Know exactly what your resume is missing.
          </h1>

          <p className="js-sub text-[16px] md:text-[17px] leading-[1.6] text-ink-soft max-w-[52ch] mt-6">
            Upload your resume and a job description. Get a clear, AI-powered gap
            analysis with your match score, missing skills, and actionable next
            steps — so you can apply with confidence and get hired faster.
          </p>

          <div className="js-cta flex flex-wrap items-center gap-6 mt-9">
            <div className="relative">
              <Button href="/upload" size="md">
                Analyze my resume{" "}
                <span aria-hidden className="inline-block transition-transform duration-150 group-hover:translate-x-1">
                  →
                </span>
              </Button>
              {/* red pen scribble underline */}
              <svg
                aria-hidden
                viewBox="0 0 210 14"
                preserveAspectRatio="none"
                className="absolute -bottom-3.5 left-1 w-[104%] h-3.5 text-pen-red"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <path className="js-scribble" pathLength={1} strokeDasharray={1} d="M3 8 C 45 2, 90 11, 130 6 S 185 4, 206 8" />
                <path className="js-scribble" pathLength={1} strokeDasharray={1} d="M10 11.5 C 60 7, 120 13, 198 9" />
              </svg>
            </div>

            <div className="flex items-center gap-1">
              <HandwrittenNote rotate={-3} className="text-[17px] text-[19px]">
                Better matches.
                <br />
                More interviews.
                <br />
                Your next chapter.
              </HandwrittenNote>
            </div>
          </div>
        </div>

        {/* Right: report sheet */}
        <div className="lg:pt-8 min-w-0">
          <ReportSheet />
        </div>
      </div>
    </section>
  );
}
