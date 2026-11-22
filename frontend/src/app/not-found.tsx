"use client";

import { useRef, useSyncExternalStore } from "react";
import { Nav } from "@/components/Nav";
import { Button } from "@/components/ui/Button";
import { HandwrittenNote } from "@/components/ui/HandwrittenNote";
import { NotFoundSheet } from "@/components/ui/NotFoundSheet";
import { useMotion, gsap, EASE } from "@/lib/motion";

/** The path never changes while the 404 is mounted — nothing to subscribe to. */
function subscribeToNothing() {
  return () => {};
}

function getPathname(): string | null {
  return window.location.pathname;
}

/** Server snapshot: the page is statically generated, so the URL is unknown. */
function getNullPath(): string | null {
  return null;
}

/**
 * Custom 404 — `custom404page.pdf` p1 (desktop) / p2 (phone).
 *
 * Desktop is a landing-style two-column page (copy left, tilted evidence sheet
 * right). The phone layout is genuinely different in the mockup, so it is not
 * just a reflow: **sheet first, then the title and body**, no eyebrow (the nav
 * already says `ERROR 404`), no `GET STARTED` button, no route list inside the
 * sheet, and the two CTAs live in a sticky bottom bar (`data-sticky-cta`,
 * same pattern as `/upload` and `/rewrite`).
 *
 * It renders for **every** unmatched URL (root `not-found.tsx` catches them
 * all); nothing in the app calls `notFound()`, so this is the only state it
 * serves. `usePathname` is deliberately not used — it describes the client
 * route, and this page must also describe a URL that never matched anything.
 * The address is read on the client only (`useSyncExternalStore`, server
 * snapshot `null`): the page is statically generated, so the mark-up ships
 * without a path and the pill fills in when it hydrates.
 */
export default function NotFound() {
  const root = useRef<HTMLElement>(null);

  // `useSyncExternalStore` reads the address without a setState-in-effect:
  // the server snapshot is `null` (the page is static), the client snapshot is
  // the live path, so the pill fills in on hydration with no extra render pass.
  const requestedPath = useSyncExternalStore(
    subscribeToNothing,
    getPathname,
    getNullPath
  );

  // The landing's entrance, shortened: copy rises, sheet lands, the pen note
  // and (desktop) route rows settle. Gated by useMotion — reduced motion
  // gets the static, fully visible page.
  useMotion(
    root,
    () => {
      const tl = gsap.timeline({ defaults: { ease: EASE } });
      tl.from(
        ".js-404-sheet",
        { y: 26, autoAlpha: 0, scale: 0.985, duration: 0.52 },
        0
      )
        .from(".js-404-eyebrow", { y: 12, autoAlpha: 0, duration: 0.4 }, 0.06)
        .from(".js-404-title", { y: 18, autoAlpha: 0, duration: 0.46 }, 0.12)
        .from(".js-404-sub", { y: 14, autoAlpha: 0, duration: 0.44 }, 0.2)
        .from(".js-404-cta", { y: 14, autoAlpha: 0, duration: 0.44 }, 0.26)
        .from(
          ".js-404-route",
          { y: 8, autoAlpha: 0, duration: 0.34, stagger: 0.05 },
          0.46
        )
        .from(".js-404-note", { y: 8, autoAlpha: 0, duration: 0.36 }, 0.62);
    },
    []
  );

  return (
    <>
      <Nav status="Error 404" />

      <main
        ref={root}
        className="mx-auto max-w-[1120px] px-6 pt-6 pb-40 md:px-12 md:pt-16 md:pb-20"
      >
        {/* Phone order: sheet → title → body → note.  Desktop: copy left,
            sheet right (DOM order puts the sheet first so the phone reads
            correctly; on `lg` the grid places it back on the right). */}
        <div className="grid items-center gap-8 md:gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12">
          <div className="relative order-1 min-w-0 lg:order-2 lg:pl-2">
            <div className="js-404-sheet">
              <NotFoundSheet requestedPath={requestedPath} />
            </div>
            <div className="js-404-note mt-2 hidden pl-3 md:mt-3 md:block md:pl-5">
              <HandwrittenNote rotate={-3} className="text-[17px] md:text-[19px]">
                Typo? Probably.
              </HandwrittenNote>
            </div>
          </div>

          <div className="order-2 min-w-0 lg:order-1">
            {/* Desktop-only eyebrow — the phone's nav carries `ERROR 404`. */}
            <div className="js-404-eyebrow hidden items-center gap-4 md:flex">
              <span aria-hidden className="h-px w-10 shrink-0 bg-ink-soft md:w-14" />
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft md:text-[11px]">
                Error 404 <span className="text-pen-red">·</span> Page not found
              </p>
            </div>

            <h1 className="js-404-title mt-0 max-w-[15ch] font-display text-[clamp(34px,8.4vw,62px)] leading-[1.06] tracking-[-0.01em] md:mt-6 md:max-w-none">
              This page isn&rsquo;t in the file.
            </h1>

            <p className="js-404-sub mt-4 max-w-[42ch] text-[15.5px] leading-[1.6] text-ink-soft md:mt-6 md:text-[17px]">
              The address may be mistyped, or the page has moved. Nothing is
              lost: your resume and job posting were never stored.
            </p>

            {/* Phone shows the pen note here, right under the body. */}
            <div className="js-404-note mt-4 md:hidden">
              <HandwrittenNote rotate={-3} className="text-[17px]">
                Typo? Probably.
              </HandwrittenNote>
            </div>

            {/* Desktop CTAs — the phone gets the sticky bar below. */}
            <div className="js-404-cta mt-9 hidden gap-4 md:flex">
              <Button href="/" mono>
                Back to home
                <span
                  aria-hidden
                  className="inline-block transition-transform duration-150 group-hover:translate-x-1"
                >
                  →
                </span>
              </Button>
              <Button href="/upload" variant="secondary" mono className="border-ink/70">
                Analyze my resume
              </Button>
            </div>
          </div>
        </div>

        {/* Phone: sticky full-width CTA pair (mockup p2). */}
        <div
          data-sticky-cta="double"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-paper px-6 pt-4 pb-5 md:hidden"
        >
          <Button href="/" mono className="w-full">
            Back to home
            <span
              aria-hidden
              className="inline-block transition-transform duration-150 group-hover:translate-x-1"
            >
              →
            </span>
          </Button>
          <Button
            href="/upload"
            variant="secondary"
            mono
            className="mt-3 w-full bg-paper-raised"
          >
            Analyze my resume
          </Button>
        </div>
      </main>
    </>
  );
}
