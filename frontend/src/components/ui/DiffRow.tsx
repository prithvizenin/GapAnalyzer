import { useRef } from "react";
import { StatusStamp } from "@/components/ui/StatusStamp";
import { useMotion, gsap, EASE, T } from "@/lib/motion";

/** Split `suggested` into common-prefix / inserted phrase / remainder so the
 *  added phrase can carry the highlighter swipe. Mid-sem heuristic per the
 *  §9 contract (single insertion — becomes the LLM diff end-sem). */
function splitInsertion(original: string, suggested: string) {
  let p = 0;
  while (
    p < original.length &&
    p < suggested.length &&
    original[p] === suggested[p]
  ) {
    p++;
  }
  if (p >= suggested.length) return { pre: suggested, added: "", post: "" };
  const tail = original.slice(p);
  const idx = tail ? suggested.indexOf(tail, p) : suggested.length;
  if (idx === -1) return { pre: suggested, added: "", post: "" };
  const raw = suggested.slice(p, idx);
  const added = raw.trimEnd();
  return {
    pre: suggested.slice(0, p),
    added,
    post: raw.slice(added.length) + suggested.slice(idx),
  };
}

/**
 * DESIGN_SYSTEM.md §4 #12 — ORIGINAL vs SUGGESTED boxes side by side
 * (stacked <640px); the suggested box gets a yellow highlighter swipe on the
 * added phrase + green IMPROVED stamp (comp 05's EXAMPLE DIFF).
 */
export function DiffRow({
  original,
  suggested,
}: {
  original: string;
  suggested: string;
}) {
  const { pre, added, post } = splitInsertion(original, suggested);
  const root = useRef<HTMLDivElement>(null);

  // One authored reveal: boxes rise → highlighter paints the added phrase →
  // IMPROVED stamp lands (§3.5). Re-runs when the data payload changes.
  useMotion(
    root,
    () => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root.current!, start: "top 88%", once: true },
      });
      tl.from(root.current, { y: 16, autoAlpha: 0, duration: T.enter, ease: EASE })
        .fromTo(
          "mark",
          { backgroundSize: "0% 100%" },
          { backgroundSize: "100% 100%", duration: T.chip, ease: EASE },
          "-=0.12"
        )
        .from(
          "[data-stamp]",
          { scale: 1.25, autoAlpha: 0, duration: T.stamp, ease: EASE },
          "-=0.05"
        );
    },
    [original, suggested]
  );

  return (
    <div ref={root} className="grid gap-4 sm:grid-cols-2">
      <div className="border border-rule bg-paper-raised">
        <p className="border-b border-rule px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink">
          Original
        </p>
        <p className="px-5 py-4 font-mono text-[13.5px] leading-[1.6] text-ink-soft">
          <span aria-hidden>{"• "}</span>
          {original}
        </p>
      </div>

      <div className="relative border border-rule bg-paper-raised">
        <p className="border-b border-rule px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink">
          Suggested
        </p>
        <p className="px-5 pt-4 pb-11 font-mono text-[13.5px] leading-[1.6] text-ink-soft">
          <span aria-hidden>{"• "}</span>
          {pre}
          {/* dark ink on the yellow in both themes — §3.1 `--on-highlight` */}
          <mark className="hl-sweep bg-transparent text-on-highlight">{added}</mark>
          {post}
        </p>
        <StatusStamp
          label="Improved"
          tone="green"
          rotate={-8}
          className="pointer-events-none absolute bottom-3 right-4"
        />
      </div>
    </div>
  );
}
