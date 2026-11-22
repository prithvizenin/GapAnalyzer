"use client";

import { useRef } from "react";
import { Eyebrow, PageTitle } from "@/components/ui/PageShell";
import { Button } from "@/components/ui/Button";
import { HandwrittenNote } from "@/components/ui/HandwrittenNote";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ScanSheet } from "@/components/upload/ScanSheet";
import type { Preview } from "@/lib/analysis";
import { cn } from "@/lib/cn";
import { useMotion, gsap, EASE, T } from "@/lib/motion";

/** Estimate for the whole pipeline, for the `ABOUT N SECONDS LEFT` line only.
 *  The response is the real finish line — this never gates anything. */
const ESTIMATE_SECONDS = 20;

/** Red pen checkmark that draws itself when its row completes (§3.5). */
function Checkbox({ done }: { done: boolean }) {
  const root = useRef<HTMLSpanElement>(null);

  useMotion(
    root,
    () => {
      const path = root.current?.querySelector<SVGPathElement>(".js-check");
      if (done && path) {
        gsap.fromTo(
          path,
          { strokeDashoffset: 52 },
          { strokeDashoffset: 0, duration: 0.32, ease: "power2.out" }
        );
      }
    },
    [done]
  );

  return (
    <span
      ref={root}
      data-check={done ? "done" : "todo"}
      className={cn(
        "grid h-[26px] w-[26px] shrink-0 place-items-center border-2 md:h-[30px] md:w-[30px]",
        done ? "border-pen-red" : "border-ink/70"
      )}
    >
      {done && (
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-[22px] w-[22px] text-pen-red md:h-[26px] md:w-[26px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Slightly overhanging, hand-drawn — it reads as a pen stroke. */}
          <path className="js-check" strokeDasharray={52} d="M4 12.5 9.5 18.5 21 3" />
        </svg>
      )}
    </span>
  );
}

/** One checklist row: box, mono label, and the measured sub-line. */
function Row({
  label,
  detail,
  done,
  last,
}: {
  label: string;
  detail: React.ReactNode;
  done: boolean;
  last?: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-start gap-3.5 py-4 md:gap-4 md:py-5",
        !last && "border-b border-rule"
      )}
    >
      <Checkbox done={done} />
      <div className="min-w-0">
        <p className="font-mono text-[13px] uppercase tracking-[0.14em] text-ink md:text-[14.5px]">
          {label}
        </p>
        <p className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-graphite md:text-[11.5px]">
          {detail}
        </p>
      </div>
    </li>
  );
}

/**
 * Screen 03 "Analyzing" — an in-page state of `/upload` (not a route).
 *
 * `upload_screen.pdf` p1 (desktop) / p2 (phone). Desktop is two columns: the
 * pen checklist on the left, the resume being read on the right. The phone
 * stacks them, drops the desktop eyebrow's step row into the nav, and moves
 * `CANCEL` into a sticky bottom bar beside the pen note.
 *
 * Every number here is measured by `POST /api/preview` — word count, page
 * count, tracked and matched skills — so the screen never claims work that
 * has not happened. `preview` is `null` until that call answers (or if it is
 * unavailable), and the copy degrades to the honest in-progress state.
 */
export function AnalyzingPanel({
  progress,
  preview,
  onCancel,
}: {
  progress: number;
  preview: Preview | null;
  onCancel: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);

  const extractDone = progress >= 25;
  const skillsDone = progress >= 50;
  const done = [extractDone, skillsDone, false];

  // Remaining wait, from the same pacing timer that drives `progress`. The
  // label is only shown while there is something left to say.
  const secondsLeft = preview
    ? Math.max(1, Math.round(((100 - progress) / 100) * ESTIMATE_SECONDS))
    : null;

  const wordLine = preview
    ? `${preview.word_count.toLocaleString("en-US")} words read`
    : "reading the document";
  const trackedLine = preview
    ? `${preview.tracked_skills} skills tracked`
    : "scanning for skills";

  // p1 pairs the comparison with the remaining wait; p2 shows only the wait.
  const waitText =
    secondsLeft === null
      ? "scoring the match"
      : secondsLeft > 1
        ? `about ${secondsLeft} seconds left`
        : "about a second left";
  const scoringLine = preview ? (
    <>
      <span className="hidden md:inline">
        Comparing {preview.tracked_skills} skills ·{" "}
      </span>
      {waitText}
    </>
  ) : (
    "comparing against the posting"
  );

  // In-page state change (form → analyzing): same entrance, shorter.
  useMotion(
    root,
    () => {
      const tl = gsap.timeline({ defaults: { ease: EASE } });
      tl.from(".js-an-head", { y: 12, autoAlpha: 0, duration: T.enter }, 0)
        .from(".js-an-sheet", { y: 22, autoAlpha: 0, scale: 0.985, duration: 0.5 }, 0.16)
        .from(".js-an-note", { y: 8, autoAlpha: 0, duration: 0.34 }, 0.36);
    },
    []
  );

  return (
    <div ref={root}>
      <div className="grid items-start gap-9 md:gap-10 lg:grid-cols-[1fr_0.92fr] lg:gap-14">
        {/* Left: the work being done. DOM order is head → checklist → sheet,
            which is exactly the phone's stacked order (p2). */}
        <div className="js-an-head min-w-0">
          <Eyebrow>
            Analyzing <span className="text-pen-red">·</span> Step 3 of 3
          </Eyebrow>
          <PageTitle className="mt-4 max-w-[16ch] md:mt-5">
            Reading your resume against the posting.
          </PageTitle>

          <ol
            role="status"
            aria-live="polite"
            className="mt-7 border-t border-rule md:mt-9"
          >
            <Row label="Extracting text" detail={wordLine} done={done[0]} />
            <Row label="Finding skills" detail={trackedLine} done={done[1]} />
            <Row label="Scoring match" detail={scoringLine} done={false} last />

            {/* p1 indents the bar to the label column (checkbox + gap) and
                runs it to the column's right edge — it reads as the row's
                meter, not a full-width rule. */}
            <li className="py-4 pl-[40px] md:py-5 md:pl-[46px]">
              <ProgressBar value={progress} pen />
            </li>
          </ol>

          {/* Desktop CTA row (p1): hairline, then CANCEL + the pen note. */}
          <div className="js-an-note mt-1 hidden items-center gap-6 border-t border-rule pt-5 md:flex">
            <Button variant="secondary" size="sm" mono onClick={onCancel}>
              Cancel
            </Button>
            <HandwrittenNote rotate={-2} className="text-[18px] md:text-[20px]">
              First run can take a minute.
            </HandwrittenNote>
          </div>
        </div>

        <div className="min-w-0 lg:pt-3">
          <div className="js-an-sheet">
            <ScanSheet
              filename={preview?.filename ?? "your resume"}
              pageCount={preview?.page_count ?? 1}
              excerpt={preview?.excerpt ?? []}
              matched={preview?.matched_skills ?? 0}
              tracked={preview?.tracked_skills ?? 0}
            />
          </div>

          {/* Phone: the sticky bar below pairs the note with CANCEL (p2), so
              the note is not repeated here. */}
        </div>
      </div>

      {/* Phone: sticky bar pairs the note with CANCEL (p2). */}
      <div
        data-sticky-cta
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-5 border-t border-rule bg-paper px-6 py-4 md:hidden"
      >
        <HandwrittenNote rotate={-2} className="text-[16px]">
          First run can take a minute.
        </HandwrittenNote>
        <Button variant="secondary" size="sm" mono onClick={onCancel} className="shrink-0">
          Cancel
        </Button>
      </div>
    </div>
  );
}
