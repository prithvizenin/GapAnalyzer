import { Fragment } from "react";
import { Sheet } from "@/components/ui/Sheet";
import type { ExcerptLine, ExcerptRun } from "@/lib/analysis";

/**
 * DESIGN_SYSTEM.md §4 #29 — the analyzing screen's resume sheet
 * (upload_screen.pdf p1/p2).
 *
 * This is the document being read, not a results sheet: the uploaded file's
 * name, the page count, a few of its real lines with the posting's skills
 * already painted by the highlighter, placeholder rules for the rest of the
 * page, and the running `MATCHED SO FAR` count.
 *
 * Presentational — the page owns the counts, the excerpt and the reveal.
 * `excerpt` arrives pre-split into runs from `POST /api/preview`, so nothing
 * here re-derives what counts as a skill.
 */
export function ScanSheet({
  filename,
  pageCount,
  excerpt,
  matched,
  tracked,
}: {
  filename: string;
  pageCount: number;
  excerpt: ExcerptLine[];
  matched: number;
  tracked: number;
}) {
  // The count the sheet reports; the total is the posting's tracked skills,
  // the same number the checklist's `COMPARING N SKILLS` line uses.
  const shownName = filename.toUpperCase();

  return (
    <Sheet tilt={-1.2} className="px-6 pb-7 pt-7 md:px-9 md:pb-8 md:pt-8">
      <div className="flex items-baseline justify-between gap-4">
        <p className="truncate font-mono text-[10.5px] uppercase tracking-[0.16em] text-graphite md:text-[11px]">
          {shownName}
        </p>
        <p className="shrink-0 whitespace-nowrap font-mono text-[10.5px] uppercase tracking-[0.16em] text-graphite max-md:hidden md:text-[11px]">
          Page 1 of {pageCount}
        </p>
      </div>

      {/* The excerpt sits inside a red margin rule, like a marked-up page. */}
      <div className="mt-5 border-l-2 border-pen-red pl-4 md:mt-6 md:pl-5">
        {excerpt.length === 0 ? (
          // Nothing extractable to show yet — keep the page's shape, say nothing.
          <div aria-hidden className="space-y-3">
            <div className="h-2.5 w-full bg-rule/70" />
            <div className="h-2.5 w-4/5 bg-rule/70" />
          </div>
        ) : (
          <>
            {/* Desktop (p1): each resume line on its own row, like a page. */}
            <div className="hidden space-y-4 md:block">
              {excerpt.map((line, i) => (
                <p
                  key={i}
                  className="text-[15.5px] leading-[1.55] text-ink"
                >
                  {line.map((run, j) => (
                    <Run key={j} run={run} />
                  ))}
                </p>
              ))}
            </div>

            {/* Phone (p2): the same runs as one flowing paragraph, no page
                column, no per-line rules. */}
            <p className="text-[14.5px] leading-[1.6] text-ink md:hidden">
              {excerpt.map((line, i) => (
                <Fragment key={i}>
                  {i > 0 && " "}
                  {line.map((run, j) => (
                    <Run key={j} run={run} />
                  ))}
                </Fragment>
              ))}
            </p>
          </>
        )}

        {/* Placeholder rules: the rest of the page, still unread. Desktop only
            — p2's sheet is a single paragraph. */}
        <div aria-hidden className="mt-5 hidden space-y-3 md:block">
          <div className="h-2.5 w-11/12 bg-rule/70" />
          <div className="h-2.5 w-full bg-rule/70" />
          <div className="h-2.5 w-3/4 bg-rule/70" />
        </div>
      </div>

      <div className="mt-6 flex items-baseline justify-between gap-4 border-t border-rule pt-5 md:mt-7">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-graphite md:text-[11px]">
          Matched so far
        </p>
        <p className="flex items-baseline font-display text-[30px] leading-none text-pen-red md:text-[34px]">
          <span>{matched}</span>
          <span className="mx-1.5 text-[17px] italic md:mx-2 md:text-[19px]">of</span>
          <span>{tracked}</span>
        </p>
      </div>
    </Sheet>
  );
}

/** One excerpt run — plain text, or a phrase the posting asks for, painted by
 *  the highlighter. Shared by the desktop rows and the phone paragraph. */
function Run({ run }: { run: ExcerptRun }) {
  return run.highlight ? (
    <mark className="hl-sweep px-[2px] text-on-highlight">{run.text}</mark>
  ) : (
    <span>{run.text}</span>
  );
}
