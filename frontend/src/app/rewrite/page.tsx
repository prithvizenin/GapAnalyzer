"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { NavWordmark } from "@/components/Nav";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { Sheet, Paperclip } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { RewriteRow } from "@/components/ui/RewriteRow";
import { SuggestionCard } from "@/components/ui/SuggestionCard";
import { useMotion, gsap, EASE, T } from "@/lib/motion";
import { API_URL } from "@/lib/api";
import { CATEGORY_LABELS } from "@/lib/analysis";
import { cn } from "@/lib/cn";
import type { ExportFormat, RewriteResult } from "@/lib/rewrite";

const SHEET_TITLE =
  "font-display text-[22px] uppercase tracking-[0.03em] md:text-[24px]";
const SUB_LABEL =
  "font-mono text-[11px] uppercase tracking-[0.12em] text-graphite";
/** Per-row labels inside the side-by-side review (same weight as §4 #24). */
const ROW_LABEL =
  "font-mono text-[10px] uppercase tracking-[0.14em] text-graphite";

// Copy deck (DESIGN_SYSTEM §6, week 12) — strings verbatim.
const NO_SESSION = "Upload a resume and a job posting first.";
const TAILOR_FAILED = "Rewrite failed.";
const DOWNLOAD_FAILED = "Download failed.";
const CONNECTION_ERROR =
  "Couldn't reach the analyzer — is the backend running?";
const FALLBACK_NOTE =
  "AI unavailable — the resume is unchanged; gap drafts are templates.";

type Phase = "loading" | "ready" | "error" | "empty";

/**
 * Week 12, point 1 — "tailored resume" review screen (no comp; user addition).
 *
 * Reads the handoff /upload stored (`resume_text` + `job_description`), asks
 * `POST /api/rewrite` for a guarded revision, and reviews the suggested
 * changes side by side with the original document (semester plan week 12,
 * bullet 3): one row per resume line — the rewrite preserves line count, so
 * each rewritten line sits beside the text it replaces — plus one RewriteRow
 * per changed line (carrying the model's note) and the gap drafts with their
 * placeholders intact. The downloads render the text on screen
 * (`POST /api/rewrite/export`) — the server stores nothing.
 */
export default function RewritePage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] = useState<RewriteResult | null>(null);
  const [original, setOriginal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<ExportFormat | null>(null);
  const started = useRef(false);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (started.current) return; // StrictMode double-mount guard
    started.current = true;

    let resume = "";
    let jd = "";
    try {
      resume = window.sessionStorage.getItem("resume_text") ?? "";
      jd = window.sessionStorage.getItem("job_description") ?? "";
    } catch {
      /* storage blocked → treated as no session */
    }
    if (!resume.trim() || !jd.trim()) {
      setPhase("empty");
      return;
    }
    setOriginal(resume);

    void (async () => {
      try {
        const res = await fetch(`${API_URL}/api/rewrite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume_text: resume, job_description: jd }),
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
            typeof detail === "string" && detail ? detail : TAILOR_FAILED
          );
        }
        const result = payload as RewriteResult | null;
        if (!result || typeof result.revised_resume !== "string") {
          throw new Error(TAILOR_FAILED);
        }
        setData(result);
        setPhase("ready");
      } catch (err) {
        setError(
          err instanceof TypeError
            ? CONNECTION_ERROR
            : err instanceof Error && err.message
              ? err.message
              : TAILOR_FAILED
        );
        setPhase("error");
      }
    })();
  }, []);

  // Scroll reveals (§3.5): top chrome rises, sheets + right-column blocks
  // reveal once as they enter. Re-runs when the payload lands.
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
    [phase, data]
  );

  async function download(format: ExportFormat) {
    if (!data) return;
    setDownloading(format);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/rewrite/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: data.revised_resume,
          format,
        }),
      });
      if (!res.ok) throw new Error(DOWNLOAD_FAILED);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tailored-resume.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(
        err instanceof TypeError
          ? CONNECTION_ERROR
          : err instanceof Error && err.message
            ? err.message
            : DOWNLOAD_FAILED
      );
    } finally {
      setDownloading(null);
    }
  }

  const changed = data?.rewrites.filter((line) => line.changed) ?? [];
  const draftNote = data?.additions[0]?.note ?? "";

  // Week 12 bullet 3 — the whole document, original beside revised. The
  // backend's `_apply` preserves the line count (only approved lines are
  // replaced), so index i on the left became index i on the right; changed
  // indexes come from the `L{n}` rewrite ids.
  const originalLines = original.split("\n");
  const revisedLines = data?.revised_resume.split("\n") ?? [];
  const changedIndexes = new Set(
    (data?.rewrites ?? [])
      .filter((line) => line.changed)
      .map((line) => Number(line.id.slice(1)))
  );
  const reviewRows = Array.from(
    { length: Math.max(originalLines.length, revisedLines.length) },
    (_, index) => ({
      index,
      original: originalLines[index] ?? "",
      revised: revisedLines[index] ?? "",
      changed: changedIndexes.has(index),
    })
  );

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
        Tailored resume
      </h1>

      {phase === "loading" && (
        <p role="status" aria-live="polite" className={`${SUB_LABEL} mt-8`}>
          Tailoring…
        </p>
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

      {phase === "error" && error && (
        <div className="js-sheet mt-8">
          <p role="alert" className="font-mono text-[13px] text-pen-red">
            {error}
          </p>
          <Button href="/upload" mono variant="secondary" className="mt-6">
            Upload a resume
          </Button>
        </div>
      )}

      {phase === "ready" && data && (
        <div className="mt-8 space-y-7 md:mt-10 md:space-y-8">
          {/* Week 12 bullet 3 — the suggested changes reviewed side by side
              with the original: one row per resume line, so a rewritten line
              sits next to the text it replaces. Changed rows wear the §4 #24
              green left rule; unchanged text stays graphite and collapses to
              a single column below `md` (it would only repeat itself). */}
          <Sheet className="js-sheet p-7 md:p-8">
            <div className="flex items-center gap-3">
              <Paperclip className="h-7 w-7 shrink-0 -rotate-12 text-graphite" />
              <h2 className={SHEET_TITLE}>Side-by-side review</h2>
            </div>

            <div className="mt-5 border-t border-rule pt-5">
              <p className={SUB_LABEL}>
                {data.stats.changed} of {data.stats.candidates} lines rewritten
              </p>
              {data.mode === "fallback" && (
                <p className="mt-3 font-mono text-[11.5px] leading-[1.6] text-pen-red">
                  {FALLBACK_NOTE}
                </p>
              )}

              <div className="mt-5 hidden grid-cols-2 gap-x-8 md:grid">
                <p className={ROW_LABEL}>Original</p>
                <p className={ROW_LABEL}>Revised</p>
              </div>

              <div className="mt-2 divide-y divide-rule">
                {reviewRows.map((row) => (
                  <div
                    key={row.index}
                    className={cn(
                      "grid gap-1 py-2 md:grid-cols-2 md:gap-x-8",
                      row.changed && "border-l-2 border-stamp-green pl-3 md:pl-4"
                    )}
                  >
                    <div className={cn(!row.changed && "hidden md:block")}>
                      {row.changed && (
                        <p className={`${ROW_LABEL} md:hidden`}>Original</p>
                      )}
                      <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-[1.6] text-graphite">
                        {row.original || "\u00a0"}
                      </pre>
                    </div>
                    <div>
                      {row.changed && (
                        <p className={`${ROW_LABEL} md:hidden`}>Revised</p>
                      )}
                      <pre
                        className={cn(
                          "whitespace-pre-wrap break-words font-mono text-[12.5px] leading-[1.6]",
                          row.changed ? "text-ink" : "text-graphite"
                        )}
                      >
                        {row.revised || "\u00a0"}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Sheet>

          <div className="grid gap-7 md:grid-cols-2 md:gap-8">
            {/* Left: changed lines, with the model's note per line */}
            <section className="js-reveal">
              <h2 className={SUB_LABEL}>Changed lines</h2>
              <div className="mt-4 space-y-4">
                {changed.length === 0 ? (
                  <p className="font-mono text-[13px] uppercase tracking-[0.1em] text-graphite">
                    No lines needed changing
                  </p>
                ) : (
                  changed.map((line) => (
                    <RewriteRow
                      key={line.id}
                      original={line.original}
                      revised={line.revised}
                      note={line.note}
                    />
                  ))
                )}
              </div>
            </section>

            {/* Right: gap drafts → downloads */}
            <div className="flex flex-col gap-7 md:gap-8">
              {data.additions.length > 0 && (
                <section className="js-reveal">
                  <h2 className={SUB_LABEL}>Gap drafts</h2>
                  {draftNote && (
                    <p className="mt-2 font-mono text-[11.5px] leading-[1.6] text-graphite">
                      {draftNote}
                    </p>
                  )}
                  <div className="mt-4 space-y-4">
                    {data.additions.map((addition, i) => (
                      <SuggestionCard
                        key={addition.skill}
                        n={i + 1}
                        text={addition.draft}
                        meta={CATEGORY_LABELS[addition.category]}
                      />
                    ))}
                  </div>
                </section>
              )}

              <div className="js-reveal border-t border-rule pt-7">
                <h2 className={SUB_LABEL}>Download</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Button
                    mono
                    className="w-full"
                    onClick={() => download("docx")}
                    disabled={downloading !== null}
                  >
                    Download DOCX
                    <Download
                      aria-hidden
                      className="h-4 w-4"
                      strokeWidth={1.5}
                    />
                  </Button>
                  <Button
                    mono
                    variant="secondary"
                    className="w-full"
                    onClick={() => download("pdf")}
                    disabled={downloading !== null}
                  >
                    Download PDF
                    <Download
                      aria-hidden
                      className="h-4 w-4"
                      strokeWidth={1.5}
                    />
                  </Button>
                </div>
                {error && (
                  <p role="alert" className="mt-3 font-mono text-[12px] text-pen-red">
                    {error}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
