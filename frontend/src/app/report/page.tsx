"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { NavWordmark } from "@/components/Nav";
import { useMotion, gsap, EASE, T } from "@/lib/motion";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { AnnotationItem } from "@/components/ui/AnnotationItem";
import { SuggestionCard } from "@/components/ui/SuggestionCard";
import { DiffRow } from "@/components/ui/DiffRow";
import {
  CATEGORY_LABELS,
  MOCK_ANALYSIS,
  type AnalysisResult,
  type MissingSkill,
} from "@/lib/analysis";
import { API_URL } from "@/lib/api";

/** Copy deck (DESIGN_SYSTEM §6) fixes screen 05's list to these five, in order. */
const REPORT_SKILLS = [
  "CI/CD",
  "Docker",
  "Kubernetes",
  "System-Design",
  "Leadership",
];

const SUB_LABEL =
  "font-mono text-[13px] uppercase tracking-[0.14em] text-ink md:text-[14px]";

// Copy deck (DESIGN_SYSTEM §6) — strings verbatim.
const DOWNLOAD_FAILED = "Download failed.";
const CONNECTION_ERROR =
  "Couldn't reach the analyzer — is the backend running?";

/**
 * Screen 05 "Gap report detail" from comps/05-gap-report.png.
 * Same data handoff as /results: sessionStorage "analysis", else the §9 mock.
 */
export default function ReportPage() {
  const [data, setData] = useState<AnalysisResult>(MOCK_ANALYSIS);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("analysis");
      if (raw) setData(JSON.parse(raw) as AnalysisResult);
    } catch {
      /* corrupt payload → keep the sample report */
    }
  }, []);

  // Scroll reveals (§3.5): wordmark rises; missing-skills sheet and each
  // right-column block reveal as they enter view (items self-reveal inside).
  useMotion(
    root,
    () => {
      gsap.from(".js-top", { y: 12, autoAlpha: 0, duration: T.enter, ease: EASE });
      gsap.from(".js-sheet", {
        y: 18,
        autoAlpha: 0,
        duration: T.sheet,
        ease: EASE,
        scrollTrigger: { trigger: ".js-sheet", start: "top 88%", once: true },
      });
      gsap.utils.toArray<HTMLElement>(".js-reveal").forEach((el) => {
        gsap.from(el, {
          y: 16,
          autoAlpha: 0,
          duration: T.enter,
          ease: EASE,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });
    },
    [data]
  );

  /** Gap report download — POSTs the analysis on screen to
   *  `/api/report/export` and saves the rendered document. The server keeps
   *  nothing, so the file is exactly the report the user is reading. */
  async function downloadReport() {
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch(`${API_URL}/api/report/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, format: "pdf" }),
      });

      if (!res.ok) {
        let detail: unknown = null;
        try {
          detail = ((await res.json()) as { detail?: unknown } | null)?.detail;
        } catch {
          detail = null;
        }
        throw new Error(
          typeof detail === "string" && detail ? detail : DOWNLOAD_FAILED
        );
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "gap-report.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setDownloadError(
        err instanceof TypeError
          ? CONNECTION_ERROR
          : err instanceof Error && err.message
            ? err.message
            : DOWNLOAD_FAILED
      );
    } finally {
      setDownloading(false);
    }
  }

  const items = REPORT_SKILLS.flatMap((name) => {
    const found: MissingSkill | undefined = data.missing_skills.find(
      (s) => s.skill === name
    );
    return found ? [found] : [];
  });

  return (
    <main ref={root} className="mx-auto max-w-[1120px] px-6 md:px-12 pt-12 md:pt-16 pb-16 md:pb-24">
      {/* Logo → landing (DESIGN_SYSTEM §5 — user addition, not in comp 05) */}
      <div className="js-top mb-7 md:mb-9">
        <NavWordmark />
      </div>

      <StepIndicator active={2} />

      <div className="mt-8 grid gap-7 md:mt-10 md:grid-cols-2 md:gap-8">
        {/* Left: missing skills sheet */}
        <Sheet className="js-sheet p-7 md:p-8">
          <h1 className="font-display text-[26px] uppercase tracking-[0.02em] md:text-[32px]">
            Missing skills
          </h1>
          <ul className="mt-7 space-y-7 md:mt-8 md:space-y-8">
            {items.map((s, i) => (
              <AnnotationItem
                key={s.skill}
                n={i + 1}
                /* chips keep the hyphen (SYSTEM-DESIGN), headings read as words */
                term={s.skill.replace(/-/g, " ")}
                why={s.why}
              />
            ))}
          </ul>
        </Sheet>

        {/* Right: suggestion → example diff → CTA */}
        <div className="flex flex-col gap-7 md:gap-8">
          {/* Weeks 10–11 — one card per gap category (the API returns at most
              three, strongest gap first); `meta` names the category it closes. */}
          {data.recommendations.map((rec, i) => (
            <SuggestionCard
              key={rec.skill}
              n={i + 1}
              text={rec.message}
              meta={CATEGORY_LABELS[rec.category]}
              className="js-reveal"
            />
          ))}

          <section className="js-reveal">
            <h2 className={SUB_LABEL}>Example diff</h2>
            <div className="mt-4">
              <DiffRow
                original={data.diff_example.original}
                suggested={data.diff_example.suggested}
              />
            </div>

            <div className="js-reveal mt-7 max-w-[360px] border-t border-rule pt-7">
              {/* Week 12 entry point (user addition — comp 05 had only the
                  download CTA): review the tailored resume next. */}
              <Button href="/rewrite" mono className="w-full">
                Tailor my resume
                <span aria-hidden>→</span>
              </Button>
              <Button
                mono
                variant="secondary"
                className="mt-3 w-full"
                onClick={downloadReport}
                disabled={downloading}
              >
                {downloading ? "Downloading…" : "Download report"}
                {!downloading && (
                  <Download aria-hidden className="h-4 w-4" strokeWidth={1.5} />
                )}
              </Button>
              {downloadError && (
                <p
                  role="alert"
                  className="mt-3 font-mono text-[12px] text-pen-red"
                >
                  {downloadError}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
