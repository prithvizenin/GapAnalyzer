"use client";

import { useEffect, useRef, useState } from "react";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { NavWordmark } from "@/components/Nav";
import { useMotion, gsap, EASE, T } from "@/lib/motion";
import { Sheet, Paperclip } from "@/components/ui/Sheet";
import { StampScore } from "@/components/ui/StampScore";
import { StatusStamp } from "@/components/ui/StatusStamp";
import { SkillChip } from "@/components/ui/SkillChip";
import { CategoryBar } from "@/components/ui/CategoryBar";
import { MetaBar } from "@/components/ui/MetaBar";
import { Button } from "@/components/ui/Button";
import {
  CATEGORY_LABELS,
  MOCK_ANALYSIS,
  type AnalysisResult,
  type SkillCategory,
} from "@/lib/analysis";

const CATEGORY_ORDER: SkillCategory[] = ["technical", "tools", "soft"];

/**
 * Score-driven verdict on the MISSING sheet (DESIGN_SYSTEM §4 #7 + §6):
 * match ≥ 70% → green `APPROVED`, below → red `NEEDS WORK`.
 */
const APPROVED_AT = 70;

const SHEET_TITLE =
  "font-display text-[22px] uppercase tracking-[0.03em] md:text-[24px]";
const SUB_LABEL =
  "font-mono text-[11px] uppercase tracking-[0.12em] text-graphite";
const GROUP_LABEL =
  "font-mono text-[10px] uppercase tracking-[0.14em] text-graphite";

/** Weeks 10–11, point 1 — skill categorization: the API already tags every
 *  skill (DESIGN_SYSTEM §9 contract) but the sheets used to render one flat
 *  blob. Chips now sit under their dictionary category, labelled with the
 *  existing §6 bar labels; empty groups are omitted so a posting that asks for
 *  no soft skills shows no SOFT SKILLS heading. */
function groupByCategory<T extends { skill: string; category: SkillCategory }>(
  skills: T[]
) {
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    items: skills.filter((s) => s.category === category),
  })).filter((group) => group.items.length > 0);
}

/**
 * Screen 04 "Results overview" from comps/04-results-overview.png.
 * Renders the §9 response shape; falls back to the mock until /upload POSTs a
 * real analysis (stored under sessionStorage "analysis") — context.md §9.
 */
export default function ResultsPage() {
  const [data, setData] = useState<AnalysisResult>(MOCK_ANALYSIS);
  const approved = data.match_score >= APPROVED_AT;
  const hasSemanticMatches = data.matched_skills.some(
    (s) => s.matched_by === "semantic"
  );
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("analysis");
      if (raw) setData(JSON.parse(raw) as AnalysisResult);
    } catch {
      /* corrupt payload → keep the sample report */
    }
  }, []);

  // The markup sequence (§3.5): top chrome rises; score stamp settles and
  // bars ink-fill as block A enters; sheets → chips → verdict stamp as the
  // sheets section enters. Reverts + re-runs when the real payload lands.
  useMotion(
    root,
    () => {
      gsap.from(".js-top", { y: 12, autoAlpha: 0, duration: T.enter, ease: EASE });

      const blockA = root.current!.querySelector<HTMLElement>(".js-block-a");
      const tlA = gsap.timeline({
        scrollTrigger: { trigger: blockA!, start: "top 88%", once: true },
      });
      tlA.from(
        ".js-score-stamp",
        { scale: 1.1, rotate: 5, autoAlpha: 0, duration: 0.38, ease: EASE },
        0
      ).from(
        "[data-bar]",
        { scaleX: 0, transformOrigin: "left center", duration: 0.56, stagger: 0.09, ease: EASE },
        0.15
      );

      const blockB = root.current!.querySelector<HTMLElement>(".js-block-b");
      const tlB = gsap.timeline({
        scrollTrigger: { trigger: blockB!, start: "top 88%", once: true },
      });
      const matched = gsap.utils.toArray<HTMLElement>('[data-chip="matched"]');
      const missing = gsap.utils.toArray<HTMLElement>('[data-chip="missing"]');
      tlB.from(".js-sheet", { y: 18, autoAlpha: 0, duration: T.enter, stagger: 0.08, ease: EASE }, 0);
      // Guard empty sets — a no-match payload has zero matched chips (§9).
      if (matched.length) {
        tlB.fromTo(
          matched,
          { backgroundSize: "0% 100%" },
          { backgroundSize: "100% 100%", duration: T.chip, stagger: 0.04, ease: EASE },
          0.3
        );
      }
      if (missing.length) {
        tlB.from(missing, { y: 7, autoAlpha: 0, duration: 0.34, stagger: 0.04, ease: EASE }, 0.34);
      }
      tlB.from("[data-stamp]", { scale: 1.25, autoAlpha: 0, duration: T.stamp, ease: EASE }, 0.85);

      gsap.from(".js-meta", {
        y: 14,
        autoAlpha: 0,
        duration: T.enter,
        ease: EASE,
        scrollTrigger: { trigger: ".js-meta", start: "top 92%", once: true },
      });

      gsap.from(".js-compare", {
        y: 14,
        autoAlpha: 0,
        duration: T.enter,
        ease: EASE,
        scrollTrigger: { trigger: ".js-compare", start: "top 92%", once: true },
      });
    },
    [data]
  );

  return (
    <main ref={root} className="mx-auto max-w-[1120px] px-6 md:px-12 pt-12 md:pt-16 pb-12 md:pb-16">
      <h1 className="sr-only">Gap analysis results</h1>

      {/* Logo → landing (DESIGN_SYSTEM §5 — user addition, not in comp 04) */}
      <div className="js-top mb-7 md:mb-9">
        <NavWordmark />
      </div>

      <StepIndicator active={2} />

      {/* Score stamp + category bars */}
      <section className="js-block-a mt-10 flex flex-col items-center gap-10 md:mt-14 md:grid md:grid-cols-2 md:items-center md:gap-8 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:pr-24">
        <div className="js-score-stamp justify-self-center">
          <StampScore value={data.match_score} size="lg" />
        </div>
        <div className="w-full space-y-7 md:space-y-8">
          {(Object.keys(CATEGORY_LABELS) as SkillCategory[]).map((key) => (
            <CategoryBar
              key={key}
              label={CATEGORY_LABELS[key]}
              value={data.categories[key]}
            />
          ))}
        </div>
      </section>

      {/* Matched / Missing sheets — focal markup sequence (§3.5): sheets
          rise, then chips swipe in staggered; verdict stamp lands last. */}
      <section className="js-block-b mt-10 grid gap-6 md:mt-14 md:grid-cols-2 md:gap-7">
        <Sheet className="js-sheet px-7 pt-7 pb-8 md:px-8">
          <div className="flex items-center gap-3">
            <Paperclip className="h-7 w-7 shrink-0 -rotate-12 text-graphite" />
            <h2 className={SHEET_TITLE}>Matched</h2>
          </div>
          <div className="mt-5 border-t border-rule pt-5">
            <p className={SUB_LABEL}>Keywords found in both</p>
            {data.matched_skills.length === 0 ? (
              <p className="mt-4 font-mono text-[13px] uppercase tracking-[0.1em] text-graphite">
                No keywords matched
              </p>
            ) : (
              <>
                <div className="mt-4 space-y-4">
                  {groupByCategory(data.matched_skills).map((group) => (
                    <div key={group.category}>
                      <h3 className={GROUP_LABEL}>{group.label}</h3>
                      <div className="mt-2 flex flex-wrap gap-2.5">
                        {group.items.map((s) => (
                          <SkillChip
                            key={s.skill}
                            label={s.skill}
                            status="matched"
                            semantic={s.matched_by === "semantic"}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {hasSemanticMatches && (
                  <p className={`${SUB_LABEL} mt-5`}>≈ Matched by meaning</p>
                )}
              </>
            )}
          </div>
        </Sheet>

        <Sheet className="js-sheet relative px-7 pt-7 pb-10 md:px-8">
          <div className="flex items-center gap-3">
            <Paperclip className="h-7 w-7 shrink-0 -rotate-12 text-graphite" />
            <h2 className={SHEET_TITLE}>Missing</h2>
          </div>
          <div className="mt-5 border-t border-rule pt-5">
            <p className={SUB_LABEL}>Keywords not found in resume</p>
            <div className="mt-4 space-y-4">
              {groupByCategory(data.missing_skills).map((group) => (
                <div key={group.category}>
                  <h3 className={GROUP_LABEL}>{group.label}</h3>
                  <div className="mt-2 flex flex-wrap gap-2.5">
                    {group.items.map((s) => (
                      <SkillChip key={s.skill} label={s.skill} status="missing" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <StatusStamp
            label={approved ? "Approved" : "Needs Work"}
            tone={approved ? "green" : "red"}
            rotate={-8}                className="pointer-events-none absolute -bottom-4 right-6"
          />
        </Sheet>
      </section>

      {/* Screen 04 → 05 (comp 04 has no CTA): the gap report is where the
          suggestions and the TAILOR MY RESUME → download path live, so it
          needs an entry point here — without it /report was unreachable from
          the UI. Compare stays as the week-12 stretch entry point. */}
      <div className="js-compare mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row md:mt-14">
        <Button href="/report" mono className="w-full sm:w-auto">
          View gap report
          <span aria-hidden>→</span>
        </Button>
        <Button
          href="/compare"
          variant="secondary"
          mono
          className="w-full sm:w-auto"
        >
          Compare other postings
        </Button>
      </div>

      <MetaBar className="js-meta mt-12 md:mt-16" />
    </main>
  );
}
