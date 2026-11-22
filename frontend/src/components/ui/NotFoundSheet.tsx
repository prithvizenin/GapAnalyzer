"use client";

import Link from "next/link";
import { Sheet } from "@/components/ui/Sheet";
import { StatusStamp } from "@/components/ui/StatusStamp";
import { Eyebrow } from "@/components/ui/PageShell";

/**
 * DESIGN_SYSTEM.md §4 #28 — the 404's evidence sheet (`custom404page.pdf`
 * p1/p2). The requested path is filed like a missing keyword: red pill,
 * struck through, marked NOT FOUND, then the ruled slip with the big 404.
 *
 * Presentational: `/not-found` owns the layout, copy and the reveal.
 */

const ROUTES = [
  { href: "/upload", label: "/upload" },
  { href: "/results", label: "/results" },
  { href: "/compare", label: "/compare" },
];

/** Not every route is worth showing in full — a long or hostile URL must not
 *  blow the sheet's measure, so the pill truncates with an ellipsis. */
function pathLabel(path: string | null) {
  if (!path || path === "/") return "/";
  const clean = path.split("?")[0].split("#")[0];
  return clean.length > 42 ? `${clean.slice(0, 39)}…` : clean;
}

export function NotFoundSheet({ requestedPath }: { requestedPath: string | null }) {
  return (
    <div className="relative">
      <Sheet
        tilt={-1.4}
        className="px-6 pt-8 pb-7 md:px-9 md:pt-9 md:pb-8"
      >
        <StatusStamp
          label="Not found"
          rotate={12}
          className="absolute -top-4 right-4 bg-paper-raised px-2.5 py-1 text-[9px] md:-top-5 md:right-6 md:text-[10px]"
        />

        <Eyebrow>Requested page</Eyebrow>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 md:mt-3">
          <span className="inline-block max-w-full truncate rounded-full border border-pen-red px-4 py-1.5 font-mono text-[12.5px] tracking-[0.02em] text-pen-red line-through decoration-pen-red decoration-1 md:text-[13.5px]">
            {pathLabel(requestedPath)}
          </span>
          <p className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-graphite md:block md:text-[11px]">
            Not found
          </p>
        </div>

        {/* Ruled slip: the page of paper that never made it into the file. */}
        <div className="ruled-404 relative mt-5 flex min-h-[108px] items-center justify-center rounded-[2px] border border-dashed border-ink/50 px-4 md:mt-6 md:min-h-[150px]">
          <span className="font-display text-[56px] leading-none text-pen-red md:text-[68px]">
            404
          </span>
        </div>

        <Eyebrow className="mt-6 hidden md:block">Try one of these instead</Eyebrow>

        <ul className="mt-1 hidden md:block">
          {ROUTES.map((route) => (
            <li key={route.href} className="js-404-route">
              <Link
                href={route.href}
                className="group flex items-center justify-between gap-4 border-b border-rule py-3 font-mono text-[13px] text-ink transition-colors duration-150 hover:text-pen-red"
              >
                <span>{route.label}</span>
                <span
                  aria-hidden
                  className="text-pen-red transition-transform duration-150 group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}

export { pathLabel };
