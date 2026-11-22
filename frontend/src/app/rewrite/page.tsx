"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Nav } from "@/components/Nav";
import { PageShell, PageTitle, Eyebrow } from "@/components/ui/PageShell";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { RewriteRow } from "@/components/ui/RewriteRow";
import { TailoringPanel } from "@/components/rewrite/TailoringPanel";
import { useMotion, gsap, EASE, T } from "@/lib/motion";
import { API_URL, readApiKey } from "@/lib/api";

import type { ExportFormat, RewriteResult } from "@/lib/rewrite";

const ROW_LABEL =
  "font-mono text-[9.5px] uppercase tracking-[0.16em] text-graphite";

// Copy deck (DESIGN_SYSTEM §6, week 12) — strings verbatim.
const NO_SESSION = "Upload a resume and a job posting first.";
const TAILOR_FAILED = "Rewrite failed.";
const DOWNLOAD_FAILED = "Download failed.";
const CONNECTION_ERROR =
  "Couldn't reach the analyzer — is the backend running?";
const FALLBACK_NOTE =
  "AI unavailable — the resume is unchanged; gap drafts are templates.";
/** DESIGN_SYSTEM §6 — one plain line naming why the model did not run. */
const FALLBACK_REASONS: Record<string, string> = {
  no_key: "No API key is configured on the server.",
  model_unavailable: "The configured model is no longer available.",
  rate_limited: "The provider is rate-limiting this key — retry in a minute.",
  overloaded: "The provider is briefly overloaded — retry in a minute.",
  unreachable: "The provider could not be reached.",
  provider_error: "The provider returned an error.",
  invalid_key: "The key was rejected — check it and try again.",
  non_json: "The provider returned an unexpected reply.",
  unexpected_body: "The provider returned an unexpected reply.",
  no_candidate_lines:
    "No resume lines could be rewritten from the extracted text.",
};

type Phase = "loading" | "ready" | "error" | "empty";

/**
 * Week 12, point 1 — "tailored resume" review screen (mockups 03 desktop /
 * 08 mobile).
 *
 * Reads the handoff /upload stored (`resume_text` + `job_description`), asks
 * `POST /api/rewrite` for a guarded revision, and reviews the suggested
 * changes side by side with the original document (semester plan week 12,
 * bullet 3): one row per resume line — the rewrite preserves line count, so
 * each rewritten line sits beside the text it replaces. Gap drafts and the
 * downloads sit in the right column; on mobile they stack and the DOCX/PDF
 * pair becomes a sticky footer.
 */
export default function RewritePage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] = useState<RewriteResult | null>(null);
  const [original, setOriginal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<ExportFormat | null>(null);
  const started = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  /** Measured page format of the uploaded resume (backend/layout.py). */
  const resumeLayout = useRef<unknown>(null);

  useEffect(() => {
    if (started.current) return; // StrictMode double-mount guard
    started.current = true;

    let resume = "";
    let jd = "";
    try {
      resume = window.sessionStorage.getItem("resume_text") ?? "";
      jd = window.sessionStorage.getItem("job_description") ?? "";
      const storedLayout = window.sessionStorage.getItem("resume_layout");
      resumeLayout.current = storedLayout ? JSON.parse(storedLayout) : null;
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
        // The viewer's own Gemini key from the tailor dialog (§4 #25). Omitted
        // when they continued without one, so the server's environment key (or
        // the labelled fallback) answers instead.
        const apiKey = readApiKey();
        const res = await fetch(`${API_URL}/api/rewrite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resume_text: resume,
            job_description: jd,
            ...(apiKey ? { api_key: apiKey } : {}),
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
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
        });
      });
      gsap.utils.toArray<HTMLElement>(".js-reveal").forEach((el) => {
        gsap.from(el, {
          y: 14,
          autoAlpha: 0,
          duration: T.enter,
          ease: EASE,
          scrollTrigger: { trigger: el, start: "top 95%", once: true },
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
          // The uploaded page's format — the download is rebuilt in it.
          layout: resumeLayout.current,
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

  const draftNote = data?.additions[0]?.note ?? "";

  // Week 12 bullet 3 — the whole document, original beside revised. The
  // backend's `_apply` preserves the line count (only approved lines are
  // replaced), so index i on the left became index i on the right; changed
  // indexes come from the `L{n}` rewrite ids.
  const originalLines = original.split("\n");
  const revisedLines = data?.revised_resume.split("\n") ?? [];
  const notesById = new Map((data?.rewrites ?? []).map((line) => [line.id, line.note]));
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
      note: notesById.get(`L${index}`) ?? "",
    })
  );

  const progressLine = data
    ? `${data.stats.changed} of ${data.stats.candidates} lines rewritten`
    : "";

  return (
    <>
      <Nav step={3} />
      <PageShell className="pb-28 md:pb-20">
        <div ref={root}>
          <header className="js-top flex flex-col gap-2 md:flex-row md:items-end md:justify-between md:gap-8">
            <PageTitle>Tailored resume</PageTitle>
            {phase === "ready" && (
              <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-graphite md:pb-2 md:text-[11px]">
                {progressLine}
              </p>
            )}
          </header>

          {phase === "loading" && <TailoringPanel />}

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
            <div className="mt-6 grid items-start gap-6 md:mt-8 md:grid-cols-[minmax(0,1fr)_300px] md:gap-7 lg:grid-cols-[minmax(0,1fr)_330px]">
              {/* Left: the whole document, original beside revised */}
              <Sheet className="js-sheet p-5 md:p-7">
                <Eyebrow>Side-by-side review</Eyebrow>

                {data.mode === "fallback" && (
                  <div className="mt-4 border-l-2 border-pen-red pl-4">
                    <p className="font-mono text-[11.5px] leading-[1.6] text-pen-red">
                      {FALLBACK_NOTE}
                    </p>
                    {data.reason && (
                      <p className="mt-1.5 font-mono text-[10.5px] leading-[1.6] text-graphite">
                        Reason:{" "}
                        {FALLBACK_REASONS[data.reason] ?? data.reason}
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-5 hidden grid-cols-2 md:grid">
                  <p className={ROW_LABEL}>Original</p>
                  <p className={`${ROW_LABEL} pl-4`}>Revised</p>
                </div>

                <div className="mt-2 space-y-2 md:space-y-2.5">
                  {reviewRows.map((row) => (
                    <RewriteRow
                      key={row.index}
                      original={row.original}
                      revised={row.revised}
                      changed={row.changed}
                      note={row.note}
                    />
                  ))}
                </div>
              </Sheet>

              {/* Right: gap drafts then downloads (mockup 03) */}
              <div className="flex flex-col gap-6 md:sticky md:top-6 md:gap-7">
                {data.additions.length > 0 ? (
                  <Sheet className="js-reveal p-5 md:p-6">
                    <Eyebrow>Gap drafts</Eyebrow>
                    <div className="mt-4 space-y-5">
                      {data.additions.map((addition) => (
                        <div
                          key={addition.skill}
                          className="border-l-2 border-pen-red pl-4"
                        >
                          <p className="font-mono text-[12.5px] leading-[1.7] text-ink md:text-[13px]">
                            {addition.draft}
                          </p>
                        </div>
                      ))}
                    </div>
                    {draftNote && (
                      <p className="mt-4 font-mono text-[10.5px] leading-[1.6] text-graphite">
                        {draftNote}
                      </p>
                    )}
                  </Sheet>
                ) : (
                  <Sheet className="js-reveal p-5 md:p-6">
                    <Eyebrow>Gap drafts</Eyebrow>
                    <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.12em] text-graphite">
                      No gaps drafted
                    </p>
                  </Sheet>
                )}

                <Sheet className="js-reveal hidden p-5 md:block md:p-6">
                  <Eyebrow>Download</Eyebrow>
                  <div className="mt-4 grid gap-2.5">
                    <Button
                      mono
                      className="w-full"
                      onClick={() => download("docx")}
                      disabled={downloading !== null}
                    >
                      Download DOCX
                    </Button>
                    <Button
                      mono
                      variant="secondary"
                      className="w-full"
                      onClick={() => download("pdf")}
                      disabled={downloading !== null}
                    >
                      Download PDF
                    </Button>
                  </div>
                  {error && (
                    <p
                      role="alert"
                      className="mt-3 font-mono text-[11px] leading-[1.6] text-pen-red"
                    >
                      {error}
                    </p>
                  )}
                </Sheet>
              </div>
            </div>
          )}

          {/* Mobile: sticky download pair (mockup 08) */}
          {phase === "ready" && data && (
            <div
            data-sticky-cta
            className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-paper px-5 py-4 md:hidden"
          >
              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  mono
                  className="w-full"
                  onClick={() => download("docx")}
                  disabled={downloading !== null}
                >
                  DOCX
                </Button>
                <Button
                  mono
                  variant="secondary"
                  className="w-full"
                  onClick={() => download("pdf")}
                  disabled={downloading !== null}
                >
                  PDF
                </Button>
              </div>
            </div>
          )}
        </div>
      </PageShell>
    </>
  );
}
