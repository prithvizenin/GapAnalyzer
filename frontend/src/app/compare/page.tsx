"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { NavWordmark } from "@/components/Nav";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { Sheet } from "@/components/ui/Sheet";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { StampScore } from "@/components/ui/StampScore";
import { StatusStamp } from "@/components/ui/StatusStamp";
import { AnnotationNumber } from "@/components/ui/AnnotationNumber";
import { CategoryBar } from "@/components/ui/CategoryBar";
import { SkillChip } from "@/components/ui/SkillChip";
import { useMotion, gsap, EASE, T } from "@/lib/motion";
import { API_URL } from "@/lib/api";
import { CATEGORY_LABELS, type SkillCategory } from "@/lib/analysis";
import type { CompareResult } from "@/lib/compare";

const SLOTS = ["01", "02", "03"];

// Copy deck (DESIGN_SYSTEM §6, week 12 stretch) — strings verbatim.
const NO_SESSION = "Upload a resume and run an analysis first.";
const MIN_POSTINGS = "Add at least two job postings to compare.";
const COMPARE_FAILED = "Comparison failed.";
const CONNECTION_ERROR =
  "Couldn't reach the analyzer — is the backend running?";

const POSTING_TITLE =
  "font-display text-[19px] uppercase tracking-[0.02em] md:text-[21px]";
const SUB_LABEL =
  "font-mono text-[11px] uppercase tracking-[0.12em] text-graphite";
const GROUP_LABEL =
  "font-mono text-[10px] uppercase tracking-[0.14em] text-graphite";

type Phase = "empty" | "form" | "loading" | "results";

/**
 * Week 12 stretch — multi-job comparison (no comp; user addition).
 *
 * "Paste 3 postings, see which one the resume matches best, and why"
 * (semester plan). Reads the `resume_text` / `job_description` handoff that
 * /upload stored, scores each posting through `POST /api/compare` with the
 * same pipeline as the single-posting screen, and renders the ranking.
 */
export default function ComparePage() {
  const [resume, setResume] = useState("");
  const [postings, setPostings] = useState<string[]>(["", "", ""]);
  const [phase, setPhase] = useState<Phase>("form");
  const [data, setData] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (loaded.current) return; // StrictMode double-mount guard
    loaded.current = true;

    let text = "";
    let jd = "";
    try {
      text = window.sessionStorage.getItem("resume_text") ?? "";
      jd = window.sessionStorage.getItem("job_description") ?? "";
    } catch {
      /* storage blocked → treated as no session */
    }
    if (!text.trim()) {
      setPhase("empty");
      return;
    }
    setResume(text);
    // The posting already analysed this session is the natural first slot.
    setPostings([jd, "", ""]);
  }, []);

  useMotion(
    root,
    () => {
      gsap.from(".js-top", { y: 12, autoAlpha: 0, duration: T.enter, ease: EASE });
      gsap.utils.toArray<HTMLElement>(".js-sheet").forEach((el) => {
        gsap.from(el, {
          y: 18,
          autoAlpha: 0,
          duration: T.sheet,
          ease: EASE,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });
      gsap.utils.toArray<HTMLElement>(".js-reveal").forEach((el) => {
        gsap.from(el, {
          y: 14,
          autoAlpha: 0,
          duration: T.enter,
          ease: EASE,
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
        });
      });
    },
    // `resume` too: the form only renders once the session text is read.
    [phase, data, resume]
  );

  const filled = postings.map((value) => value.trim()).filter(Boolean);
  const valid = filled.length >= 2;
  const resumeLine =
    resume.split("\n").find((line) => line.trim())?.trim() ?? "";
  // Semantic hits keep their dotted underline (§4 #8), which needs the §6
  // legend once for the whole ranking — same as /results.
  const semanticMatch = Boolean(
    data?.postings.some((posting) =>
      posting.matched_skills.some((skill) => skill.matched_by === "semantic")
    )
  );

  function updatePosting(index: number, value: string) {
    setPostings((current) =>
      current.map((item, i) => (i === index ? value : item))
    );
    if (error) setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) {
      setError(MIN_POSTINGS);
      return;
    }
    setError(null);
    setPhase("loading");

    try {
      const res = await fetch(`${API_URL}/api/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: resume,
          job_descriptions: filled,
        }),
      });

      let payload: unknown = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }

      if (!res.ok) {
        const detail = (payload as { detail?: unknown } | null)?.detail;
        throw new Error(
          typeof detail === "string" && detail ? detail : COMPARE_FAILED
        );
      }

      const result = payload as CompareResult | null;
      if (!result || !Array.isArray(result.postings) || !result.postings.length) {
        throw new Error(COMPARE_FAILED);
      }
      setData(result);
      setPhase("results");
    } catch (err) {
      setError(
        err instanceof TypeError
          ? CONNECTION_ERROR
          : err instanceof Error && err.message
            ? err.message
            : COMPARE_FAILED
      );
      setPhase("form");
    }
  }

  return (
    <main
      ref={root}
      className="mx-auto max-w-[1120px] px-6 md:px-12 pt-12 md:pt-16 pb-16 md:pb-24"
    >
      <div className="js-top mb-7 md:mb-9">
        <NavWordmark />
      </div>

      <StepIndicator active={2} />

      <h1 className="mt-8 font-display text-[26px] uppercase tracking-[0.02em] md:mt-10 md:text-[32px]">
        Compare postings
      </h1>

      {resume && (
        <div className="mt-5">
          <p className={SUB_LABEL}>Using this resume</p>
          <p className="mt-1 truncate font-mono text-[13px] text-ink-soft">
            {resumeLine}
          </p>
        </div>
      )}

      {phase === "empty" && (
        <Sheet className="js-sheet mt-8 p-7 md:p-8">
          <p className="font-mono text-[14px] leading-[1.6] text-ink-soft">
            {NO_SESSION}
          </p>
          <Button href="/upload" mono className="mt-6">
            Upload a resume
          </Button>
        </Sheet>
      )}

      {phase === "loading" && (
        <p role="status" aria-live="polite" className={`${SUB_LABEL} mt-8`}>
          Comparing…
        </p>
      )}

      {(phase === "form" || phase === "loading") && resume && (
        <form onSubmit={handleSubmit} className="mt-8 space-y-5 md:mt-10">
          {postings.map((value, index) => (
            <Sheet key={index} className="js-sheet p-6 md:p-7">
              <label htmlFor={`posting-${index}`} className={GROUP_LABEL}>
                Posting {SLOTS[index]}
              </label>
              <Textarea
                id={`posting-${index}`}
                ruled
                rows={6}
                value={value}
                onChange={(e) => updatePosting(index, e.target.value)}
                placeholder={
                  index === 0
                    ? "Paste the job description"
                    : "Paste another posting"
                }
                className="mt-3"
              />
            </Sheet>
          ))}

          <div className="js-reveal flex justify-center md:mt-4">
            <Button
              type="submit"
              mono
              disabled={!valid || phase === "loading"}
              className="w-full px-10 sm:w-auto sm:min-w-[310px]"
            >
              Compare postings
            </Button>
          </div>

          {error && (
            <p
              role="alert"
              className="text-center font-mono text-[12.5px] text-pen-red"
            >
              {error}
            </p>
          )}
        </form>
      )}

      {phase === "results" && data && (
        <section className="mt-8 md:mt-10">
          <h2 className={SUB_LABEL}>Ranked postings</h2>
          {semanticMatch && (
            <p className={`${GROUP_LABEL} mt-2`}>≈ Matched by meaning</p>
          )}
          <div className="mt-4 space-y-5">
            {data.postings.map((posting) => (
              <Sheet
                key={posting.rank}
                className="js-sheet p-6 md:p-8"
              >
                <div className="flex flex-wrap items-start gap-4 md:gap-5">
                  <AnnotationNumber n={posting.rank} className="mt-1" />
                  <div className="min-w-0 flex-1">
                    <h3 className={POSTING_TITLE}>
                      {posting.job_title || "Untitled posting"}
                    </h3>
                    {posting.company && (
                      <p className={`${SUB_LABEL} mt-1`}>{posting.company}</p>
                    )}
                    <p className="mt-3 font-mono text-[13px] leading-[1.6] text-ink-soft md:text-[13.5px]">
                      {posting.reason}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-center gap-3">
                    <StampScore value={posting.match_score} size="sm" />
                    {posting.rank === 1 && (
                      <StatusStamp label="Best match" tone="green" rotate={-6} />
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 border-t border-rule pt-5 sm:grid-cols-3">
                  {(Object.keys(CATEGORY_LABELS) as SkillCategory[]).map(
                    (key) => (
                      <CategoryBar
                        key={key}
                        label={CATEGORY_LABELS[key]}
                        value={posting.categories[key]}
                      />
                    )
                  )}
                </div>

                {posting.matched_skills.length > 0 && (
                  <div className="mt-5">
                    <p className={GROUP_LABEL}>Matched</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2.5">
                      {posting.matched_skills.slice(0, 5).map((skill) => (
                        <SkillChip
                          key={skill.skill}
                          label={skill.skill}
                          status="matched"
                          semantic={skill.matched_by === "semantic"}
                        />
                      ))}
                      {posting.matched_skills.length > 5 && (
                        <span className={`${GROUP_LABEL} ml-1`}>
                          +{posting.matched_skills.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {posting.missing_skills.length > 0 && (
                  <div className="mt-5">
                    <p className={GROUP_LABEL}>Top gaps</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2.5">
                      {posting.missing_skills.slice(0, 5).map((skill) => (
                        <SkillChip
                          key={skill.skill}
                          label={skill.skill}
                          status="missing"
                        />
                      ))}
                      {posting.missing_skills.length > 5 && (
                        <span className={`${GROUP_LABEL} ml-1`}>
                          +{posting.missing_skills.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </Sheet>
            ))}
          </div>

          <div className="js-reveal mt-8 flex justify-center">
            <Button
              variant="secondary"
              mono
              onClick={() => {
                setData(null);
                setError(null);
                setPhase("form");
              }}
            >
              Compare again
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}
