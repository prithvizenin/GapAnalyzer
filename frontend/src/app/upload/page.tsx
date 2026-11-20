"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMotion, gsap, EASE, T } from "@/lib/motion";
import { useRouter } from "next/navigation";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { Sheet } from "@/components/ui/Sheet";
import { Dropzone } from "@/components/ui/Dropzone";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
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

/** Screen 02 (upload / paste) from comps/02-upload.png, plus the in-page
 *  analyzing state (screen 03, comps/03-analyzing.png). No Nav per
 *  DESIGN_SYSTEM §5's component list for this screen.
 *  Submit runs the real pipeline: POST /api/analyze → sessionStorage
 *  ["analysis"] → /results (both results screens read that key). */
export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jd, setJd] = useState("");
  const [phase, setPhase] = useState<"form" | "analyzing">("form");
  const [progress, setProgress] = useState(0);
  const handoffTimer = useRef<number | null>(null);
  const root = useRef<HTMLElement>(null);

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
          delay: i * 0.1,
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
    [phase]
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
      <main ref={root} className="mx-auto max-w-[1120px] px-6 md:px-12 pt-12 md:pt-16 pb-16 md:pb-24">
        <StepIndicator active={1} />
        <AnalyzingPanel progress={progress} />
      </main>
    );
  }

  const valid = Boolean(file) && jd.trim().length > 0;

  return (
    <main ref={root} className="mx-auto max-w-[1120px] px-6 md:px-12 pt-12 md:pt-16 pb-16 md:pb-24">
      <StepIndicator active={0} />

      <form
        onSubmit={handleSubmit}
        className="mt-8 grid items-start gap-6 md:mt-10 md:grid-cols-2 md:gap-7"
      >
        <Sheet className="js-sheet p-7 md:p-9">
          <h1 className="mb-6 font-display text-[22px] uppercase tracking-[0.03em] md:text-[24px]">
            Your resume
          </h1>
          <Dropzone file={file} error={error} onSelect={handleFile} />
        </Sheet>

        <Sheet className="js-sheet p-7 md:p-9">
          <label
            htmlFor="jd"
            className="mb-6 block font-display text-[22px] uppercase tracking-[0.03em] md:text-[24px]"
          >
            Job description
          </label>
          <Textarea
            id="jd"
            ruled
            rows={13}
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder={JD_PLACEHOLDER}
            aria-required
          />
        </Sheet>

        <div className="js-reveal flex justify-center md:col-span-2 md:mt-4">
          <Button
            type="submit"
            mono
            disabled={!valid}
            className="w-full px-10 sm:min-w-[310px] sm:w-auto md:px-14"
          >
            Analyze the gap
          </Button>
        </div>
      </form>
    </main>
  );
}
