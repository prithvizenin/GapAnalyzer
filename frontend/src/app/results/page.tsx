"use client";

import { useEffect, useRef, useState } from "react";
import { Nav } from "@/components/Nav";
import { PageShell, Eyebrow } from "@/components/ui/PageShell";
import { useMotion, gsap, EASE, T } from "@/lib/motion";
import { Sheet } from "@/components/ui/Sheet";
import { StampScore } from "@/components/ui/StampScore";
import { StatusStamp } from "@/components/ui/StatusStamp";
import { SkillChip } from "@/components/ui/SkillChip";
import { CategoryBar } from "@/components/ui/CategoryBar";
import { Button } from "@/components/ui/Button";
import { HandwrittenNote } from "@/components/ui/HandwrittenNote";
import {
  CATEGORY_LABELS,
  MOCK_ANALYSIS,
  type AnalysisResult,
  type SkillCategory,
} from "@/lib/analysis";

const CATEGORY_ORDER: SkillCategory[] = ["technical", "tools", "soft"];

/** Results sheet group heading — the §6 bar labels reused as an `h3`
 *  sub-label under the sheet's mono caption (DESIGN_SYSTEM §4 #8). */
const GROUP_LABEL =
  "font-mono text-[10px] uppercase tracking-[0.14em] text-graphite";

/**
 * Score-driven verdict on the MISSING sheet (DESIGN_SYSTEM §4 #7 + §6):
 * match ≥ 70% → green `APPROVED`, below → red `NEEDS WORK`.
 */
const APPROVED_AT = 70;

/**
 * Weeks 10–11 point 1 — skill categorization (DESIGN_SYSTEM §4 #8): the API
 * tags every skill with a dictionary category, and both results sheets group
 * the chips under it. Empty groups are omitted, so a posting that asks for no
 * soft skills draws no `SOFT SKILLS` heading.
 */
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
 * Results overview (mockups 01 desktop / 04 mobile). Renders the §9 response
 * shape; falls back to the mock until /upload POSTs a real analysis (stored
 * under sessionStorage "analysis").
 */
export default function ResultsPage() {
  const [data, setData] = useState<AnalysisResult>(MOCK_ANALYSIS);
  const approved = data.match_score >= APPROVED_AT;
  const hasSemanticMatches = data.matched_skills.some(
    (s) => s.matched_by === "semantic"
  );
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("analysis");
      if (raw) setData(JSON.parse(raw) as AnalysisResult);
    } catch {
      /* corrupt payload → keep the sample report */
    }
  }, []);

  // The markup sequence (§3.5): score stamp settles and bars ink-fill as the
  // top block enters; sheets → chips → verdict stamp as the right column does.
  useMotion(
    root,
    () => {
      const tlA = gsap.timeline();
      tlA
        .from(".js-score-stamp", {
          scale: 1.08,
          autoAlpha: 0,
          duration: 0.4,
          ease: EASE,
        })
        .from(
          "[data-bar]",
          {
            scaleX: 0,
            transformOrigin: "left center",
            duration: 0.56,
            stagger: 0.09,
            ease: EASE,
          },
          0.12
        );

      const tlB = gsap.timeline({
        scrollTrigger: {
          trigger: ".js-block-b",
          start: "top 92%",
          once: true,
        },
      });
      tlB
        .from(".js-sheet", {
          y: 18,
          autoAlpha: 0,
          duration: T.enter,
          stagger: 0.08,
          ease: EASE,
        })
        .from(
          '[data-chip="matched"]',
          { y: 7, autoAlpha: 0, duration: 0.32, stagger: 0.03, ease: EASE },
          0.2
        )
        .from(
          '[data-chip="missing"]',
          { y: 7, autoAlpha: 0, duration: 0.32, stagger: 0.03, ease: EASE },
          0.26
        )
        .from(
          "[data-stamp]",
          { scale: 1.2, autoAlpha: 0, duration: T.stamp, ease: EASE },
          0.6
        );

      gsap.from(".js-plan", {
        y: 16,
        autoAlpha: 0,
        duration: T.enter,
        ease: EASE,
        scrollTrigger: { trigger: ".js-plan", start: "top 92%", once: true },
      });
    },
    [data]
  );

  return (
    <>
      <Nav step={3} />
      <PageShell className="pb-28 md:pb-20">
        <div ref={root}>
          <h1 className="sr-only">Gap analysis results</h1>

          <div className="grid items-start gap-5 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] md:gap-7 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
            {/* Score card: stamp, role, company, category bars.
                Desktop (mockup 01) stacks them centred; phone (mockup 04) puts
                the stamp beside the bars so the card stays short. */}
            <Sheet className="js-sheet p-5 md:p-7">
              <div className="flex items-center gap-5 md:block">
                <div className="js-score-stamp shrink-0 md:mx-auto md:w-fit">
                  <StampScore value={data.match_score} size="lg" />
                </div>
                <div className="min-w-0 flex-1 md:flex-none">
                  <div className="text-left md:mt-5 md:text-center">
                    <p className="font-display text-[21px] leading-tight tracking-tight md:text-[26px]">
                      {data.job_title}
                    </p>
                    <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-graphite md:text-[10px]">
                      {data.company}
                    </p>
                  </div>
                  <div className="mt-4 space-y-3.5 md:mt-7 md:space-y-4">
                    {CATEGORY_ORDER.map((key) => (
                      <CategoryBar
                        key={key}
                        label={CATEGORY_LABELS[key]}
                        value={data.categories[key]}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Sheet>

            {/* Right column: matched then missing (mockups 01/04) */}
            <div className="js-block-b space-y-5 md:space-y-6">
              <Sheet className="js-sheet px-5 py-5 md:px-7 md:py-6">
                <Eyebrow>Matched — keywords found in both</Eyebrow>
                {data.matched_skills.length === 0 ? (
                  <p className="mt-4 font-mono text-[12px] uppercase tracking-[0.1em] text-graphite">
                    No keywords matched
                  </p>
                ) : (
                  <>
                    <div className="mt-4 space-y-4">
                      {groupByCategory(data.matched_skills).map((group) => (
                        <div key={group.category}>
                          <h3 className={GROUP_LABEL}>{group.label}</h3>
                          <div className="mt-2 flex flex-wrap gap-2">
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
                      <p className="mt-4 font-mono text-[9.5px] uppercase tracking-[0.16em] text-graphite">
                        ≈ Matched by meaning
                      </p>
                    )}
                  </>
                )}
              </Sheet>

              <Sheet className="js-sheet px-5 py-5 md:px-7 md:py-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
                  <div className="min-w-0 flex-1">
                    <Eyebrow>
                      <span className="hidden md:inline">
                        Missing — keywords not found in resume
                      </span>
                      <span className="md:hidden">Missing</span>
                    </Eyebrow>
                    <div className="mt-4 space-y-4">
                      {groupByCategory(data.missing_skills).map((group) => (
                        <div key={group.category}>
                          <h3 className={GROUP_LABEL}>{group.label}</h3>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {group.items.map((s) => (
                              <SkillChip
                                key={s.skill}
                                label={s.skill}
                                status="missing"
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Desktop (mockup 01): verdict stamp top-right with the pen
                      note beneath it. Phone (mockup 04) draws neither — the
                      sticky CTA carries the next step. */}
                  <div className="hidden shrink-0 flex-col items-end gap-7 md:flex">
                    <StatusStamp
                      label={approved ? "Approved" : "Needs Work"}
                      tone={approved ? "green" : "red"}
                      rotate={-6}
                      className="mt-0.5"
                    />
                    <HandwrittenNote rotate={-3} className="text-[20px]">
                      Focus here ↑
                    </HandwrittenNote>
                  </div>
                </div>
              </Sheet>
            </div>
          </div>

          {/* Top recommendations + overall assessment (mockup 01 bottom) —
              one sheet, two columns split by a hairline. */}
          <section className="js-plan mt-5 md:mt-7">
            <Sheet className="grid gap-6 px-6 py-6 md:grid-cols-[1.15fr_0.85fr] md:gap-10 md:px-8 md:py-7">
              <div className="order-last md:order-none">
                <Eyebrow>Top recommendations</Eyebrow>
                <ol className="mt-4 space-y-3.5">
                  {data.improvement_plan.map((step, i) => (
                    <li
                      key={step}
                      className="flex gap-3.5 text-[14px] leading-snug text-ink md:text-[15px]"
                    >
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-ink-blue font-mono text-[10px] text-ink-blue">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="order-first border-t border-rule pt-6 md:order-none md:border-l md:border-t-0 md:pl-10 md:pt-0">
                <Eyebrow>Overall assessment</Eyebrow>
                <p className="mt-3 font-display text-[19px] leading-[1.35] text-ink md:text-[21px]">
                  {data.overall_assessment}
                </p>
              </div>
            </Sheet>
          </section>

          {/* Entry points (mockup 01 bottom row). Phone (mockup 04) draws only
              the sticky CTA, so the inline row is desktop-only. */}
          <div className="mt-6 hidden gap-3 sm:flex-row md:mt-7 md:flex">
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
            <p className="ml-auto self-center text-right font-mono text-[10px] uppercase tracking-[0.16em] text-graphite md:text-[11px]">
              Resume analysis report · Sample data
            </p>
          </div>

          {/* Mobile: sticky full-width CTA (mockup 04) */}
          <div
            data-sticky-cta
            className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-paper px-5 py-4 md:hidden"
          >
            <Button href="/report" mono className="w-full">
              View gap report
              <span aria-hidden>→</span>
            </Button>
          </div>
        </div>
      </PageShell>
    </>
  );
}
