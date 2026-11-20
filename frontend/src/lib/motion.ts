/**
 * Motion engine — DESIGN_SYSTEM.md §3.5 ("the dossier marks itself up").
 *
 * GSAP + ScrollTrigger own every authored animation; CSS transitions remain
 * only for hover/press/focus feedback. Every tween runs inside a
 * `gsap.matchMedia("(prefers-reduced-motion: no-preference)")` scope, so
 * reduced-motion users get the natural, fully visible state.
 *
 * Conventions:
 * - `from`/`fromTo` assume elements sit at their natural visible CSS state —
 *   never hide content with CSS.
 * - Scroll reveals: `scrollTrigger: { start: "top 88%", once: true }`.
 * - Scope tweens through `gsap.context(..., rootRef)` so revert() cleans up
 *   triggers and inline styles together (important when data re-renders).
 */
import {
  useEffect,
  useLayoutEffect,
  type RefObject,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  // Fonts finishing after triggers are created can shift layout — re-measure.
  document.fonts?.ready.then(() => ScrollTrigger.refresh()).catch(() => {});
}

/** Confident deceleration — GSAP's match for cubic-bezier(0.16, 1, 0.3, 1). */
export const EASE = "expo.out";

/** Standard durations (seconds) from the §3.5 budget. */
export const T = {
  enter: 0.44,
  sheet: 0.52,
  stamp: 0.34,
  draw: 0.46,
  chip: 0.36,
};

const NO_REDUCED = "(prefers-reduced-motion: no-preference)";

/**
 * Run `build` (tweens / timelines / ScrollTriggers) scoped to `root`,
 * only when the user allows motion. Reverts cleanly on unmount and on
 * `deps` changes (e.g. real data replacing the mock payload).
 */
export function useMotion(
  root: RefObject<HTMLElement | null>,
  build: () => void,
  deps: unknown[] = []
) {
  // Layout effect on the client (applies `from` start-states before paint,
  // so SSR-visible content never flashes); plain effect during SSR.
  const useIsoLayout =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;

  useIsoLayout(() => {
    const mm = gsap.matchMedia();
    mm.add(NO_REDUCED, () => {
      const ctx = gsap.context(build, root.current ?? undefined);
      return () => ctx.revert();
    });
    return () => mm.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export { gsap, ScrollTrigger };
