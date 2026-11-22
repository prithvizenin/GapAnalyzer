"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMotion, gsap, EASE, T } from "@/lib/motion";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { PageShell, PageTitle, Eyebrow } from "@/components/ui/PageShell";
import { Sheet } from "@/components/ui/Sheet";
import { Dropzone } from "@/components/ui/Dropzone";
import { FileChip } from "@/components/ui/FileChip";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { HandwrittenNote } from "@/components/ui/HandwrittenNote";
import { AnalyzingPanel } from "@/components/upload/AnalyzingPanel";
import type { AnalysisResult } from "@/lib/analysis";
import { API_URL } from "@/lib/api";

/** Client-side pre-checks mirroring the API contract (context.md §9):
 *  400 unsupported type, 413 too large. Backend re-validates. */
const ACCEPT = [".pdf", ".docx", ".txt"];
const MAX_BYTES = 5 * 1024 * 1024;

/** Visual floor for the analyzing checklist (comp 03) — the handoff waits for
 *  it so the screen reads even when the API answers faster. */
const MIN_ANALYZE_MS = 2800;

const PIPELINE_ERROR = "Analysis pipeline failed.";
const CONNECTION_ERROR =
  "Couldn't reach the analyzer — is the backend running?";

const JD_PLACEHOLDER =
  "We are looking for a Frontend Developer with strong React skills, experience in building responsive web applications, and a solid understanding of modern JavaScript, HTML, and CSS.";

/** Mockups 02 (desktop) / 07 (mobile): the two documents side by side,
 *  sentence-case title, sticky full-width CTA on mobile. Submit runs the real
 *  pipeline: POST /api/analyze → sessionStorage ["analysis"] → /results. */
export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jd, setJd] = useState("");
  const [phase, setPhase] = useState<"form" | "analyzing">("form");
  const [progress, setProgress] = useState(0);
  const handoffTimer = useRef<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const errRef = useRef<HTMLParagraphElement>(null);

  // Scroll reveals for the form sheets + CTA (§3.5). Re-runs on phase flips
  // so returning from analyzing re-enters the form; panel/steps self-animate.
  useMotion(
    root,
    () => {
      gsap.utils.toArray<HTMLElement>(".js-sheet").forEach((el, i) => {
        gsap.from(el, {
          y: 18,
          autoAlpha: 0,
          duration: T.sheet,
          delay: i * 0.08,
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
    [phase]
  );

  // A validation/API error rises into its slot under the dropzone.
  useMotion(
    root,
    () => {
      if (error && errRef.current) {
        gsap.from(errRef.current, { y: 8, autoAlpha: 0, duration: 0.3, ease: EASE });
      }
    },
    [error]
  );

  // Checklist progress — visual pacing for the real request (rows check at
  // 25/50/100%); holds at 100% until the handoff navigates.
  useEffect(() => {
    if (phase !== "analyzing") return;
    const start = performance.now();
    const id = window.setInterval(() => {
      const p = Math.min(
        100,
        ((performance.now() - start) / MIN_ANALYZE_MS) * 100
      );
      setProgress(p);
      if (p >= 100) window.clearInterval(id);
    }, 60);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(
    () => () => {
      if (handoffTimer.current) window.clearTimeout(handoffTimer.current);
    },
    []
  );

  function handleFile(next: File | null) {
    if (!next) {
      setFile(null);
      setError(null);
      return;
    }
    const name = next.name.toLowerCase();
    if (!ACCEPT.some((ext) => name.endsWith(ext))) {
      setError("Unsupported file type — PDF, DOCX, or TXT only.");
      return;
    }
    if (next.size > MAX_BYTES) {
      setError("File too large — 5 MB max.");
      return;
    }
    setError(null);
    setFile(next);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file || !jd.trim()) return;
    setError(null);
    setProgress(0);
    setPhase("analyzing");
    const startedAt = performance.now();

    try {
      const body = new FormData();
      body.append("resume", file);
      body.append("job_description", jd);

      const res = await fetch(`${API_URL}/api/analyze`, {
        method: "POST",
        body,
      });

      let payload: unknown = null;
      try {
        payload = await res.json();
      } catch {
        payload = null; // non-JSON body → handled below
      }

      if (!res.ok) {
        const detail = (payload as { detail?: unknown } | null)?.detail;
        throw new Error(
          typeof detail === "string" && detail ? detail : PIPELINE_ERROR
        );
      }
      const analysis = payload as AnalysisResult | null;
      if (!analysis || typeof analysis.match_score !== "number") {
        throw new Error(PIPELINE_ERROR);
      }

      // Handoff for /results, /report and /rewrite (context.md §9).
      sessionStorage.setItem("analysis", JSON.stringify(analysis));
      sessionStorage.setItem("resume_text", analysis.resume_text ?? "");
      // The page format measured from the uploaded file — /rewrite sends it
      // back on export so the download keeps the resume's own design.
      sessionStorage.setItem(
        "resume_layout",
        JSON.stringify(analysis.resume_layout ?? null)
      );
      sessionStorage.setItem("job_description", jd);

      // Let the checklist finish its run before the handoff (comp 03 pacing).
      const remaining = MIN_ANALYZE_MS - (performance.now() - startedAt) + 350;
      handoffTimer.current = window.setTimeout(
        () => router.push("/results"),
        Math.max(0, remaining)
      );
    } catch (err) {
      // Network failure → copy-deck connection line; API errors → `detail`.
      setError(
        err instanceof TypeError
          ? CONNECTION_ERROR
          : err instanceof Error && err.message
            ? err.message
            : PIPELINE_ERROR
      );
      setPhase("form");
    }
  }

  if (phase === "analyzing") {
    return (
      <>
        <Nav step={1} />
        <PageShell>
          <div ref={root}>
            <AnalyzingPanel progress={progress} />
          </div>
        </PageShell>
      </>
    );
  }

  const valid = Boolean(file) && jd.trim().length > 0;

  return (
    <>
      <Nav step={1} />
      <PageShell className="pb-28 md:pb-20">
        <div ref={root}>
          <header className="max-w-[640px]">
            <PageTitle>Put the two documents side by side.</PageTitle>
            <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-ink-soft md:text-[16px]">
              PDF, DOCX or TXT up to 5 MB, or paste the text. Nothing is stored.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="mt-8 md:mt-10">
            <div className="grid items-start gap-5 md:grid-cols-2 md:gap-7">
              <Sheet className="js-sheet p-5 md:p-7">
                <Eyebrow>Your resume</Eyebrow>
                <div className="mt-4">
                  <Dropzone file={file} error={error} onSelect={handleFile} />
                  {file && (
                    <div className="mt-3">
                      <FileChip file={file} onRemove={() => handleFile(null)} />
                    </div>
                  )}
                  {error && (
                    <p
                      ref={errRef}
                      role="alert"
                      className="mt-3 font-mono text-[10.5px] uppercase leading-[1.6] tracking-[0.1em] text-pen-red md:text-[11px]"
                    >
                      {error}
                    </p>
                  )}
                </div>
              </Sheet>

              <Sheet className="js-sheet p-5 md:p-7">
                <label htmlFor="jd">
                  <Eyebrow>Job description</Eyebrow>
                </label>
                <div className="mt-4">
                  <Textarea
                    id="jd"
                    ruled
                    rows={8}
                    value={jd}
                    onChange={(e) => setJd(e.target.value)}
                    placeholder={JD_PLACEHOLDER}
                    aria-required
                    className="min-h-[168px] md:min-h-[248px]"
                  />
                </div>
              </Sheet>
            </div>

            {/* Desktop CTA row: button + the one handwritten line (mockup 02) */}
            <div className="js-reveal hidden items-center gap-6 md:col-span-2 md:mt-8 md:flex">
              <Button
                type="submit"
                mono
                disabled={!valid}
                className="min-w-[240px] px-10"
              >
                Analyze the gap
              </Button>
              <HandwrittenNote rotate={-2} className="text-[18px] md:text-[20px]">
                First run can take a minute.
              </HandwrittenNote>
            </div>

            {/* Mobile: sticky full-width CTA (mockup 07) */}
            <div
              data-sticky-cta
              className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-paper px-6 py-4 md:hidden"
            >
              <Button type="submit" mono disabled={!valid} className="w-full">
                Analyze the gap
              </Button>
            </div>
          </form>
        </div>
      </PageShell>
    </>
  );
}
