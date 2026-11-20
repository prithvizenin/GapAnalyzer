import { useRef } from "react";
import { AnnotationNumber } from "@/components/ui/AnnotationNumber";
import { useMotion, gsap, EASE, T } from "@/lib/motion";

/**
 * DESIGN_SYSTEM.md §4 #10 — blue circled hand-number + red-scribble-underlined
 * term + 1–2 line why-description (comp 05's MISSING SKILLS list).
 * Self-reveals on scroll (own ScrollTrigger, §3.5) then draws its scribbles
 * with the red pen; sits at its own scroll position so items cascade naturally.
 */
export function AnnotationItem({
  n,
  term,
  why,
}: {
  n: number;
  term: string;
  why: string;
}) {
  const root = useRef<HTMLLIElement>(null);

  useMotion(root, () => {
    const tl = gsap.timeline({
      scrollTrigger: { trigger: root.current!, start: "top 88%", once: true },
    });
    tl.from(root.current, { y: 16, autoAlpha: 0, duration: T.enter, ease: EASE }).fromTo(
      "[data-scribble]",
      { strokeDashoffset: 1 },
      {
        strokeDashoffset: 0,
        duration: T.draw,
        ease: EASE,
        stagger: 0.08,
      },
      "-=0.18"
    );
  }, []);

  return (
    <li ref={root} className="flex gap-4 md:gap-5">
      <AnnotationNumber n={n} className="mt-1" />
      <div className="min-w-0">
        <span className="relative inline-block">
          <h3 className="font-display text-[19px] uppercase tracking-[0.02em] md:text-[21px]">
            {term}
          </h3>
          {/* red pen scribble underline (draws in — §3.5 red pen) */}
          <svg
            aria-hidden
            viewBox="0 0 140 10"
            preserveAspectRatio="none"
            className="absolute -bottom-1 left-0 h-2.5 w-full text-pen-red"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path data-scribble pathLength={1} strokeDasharray={1} d="M3 6C34 2 74 8 137 4" />
            <path data-scribble pathLength={1} strokeDasharray={1} d="M10 8.5C46 5 96 10 130 6.5" />
          </svg>
        </span>
        <p className="mt-3 font-mono text-[13.5px] leading-[1.6] text-ink-soft md:text-[14px]">
          {why}
        </p>
      </div>
    </li>
  );
}
