"use client";

import { useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

const THEME_KEY = "theme";
/** Fallback crossfade (§3.5): 220ms + buffer before the temporary `theme-anim`
 *  class (and its `!important` transitions) comes back off. */
const SWAP_MS = 280;

/** View Transitions aren't in every TS DOM lib yet — narrow local shape. */
type ViewTransitionLike = { finished: Promise<void> };
type WithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => ViewTransitionLike;
};

/** Read the applied theme from the DOM — the boot script (layout.tsx) has
 *  already decided it before React hydrates. */
function currentTheme(): Theme {
  return document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";
}

/** Distance from the toggle's centre to the farthest viewport corner: the
 *  radius the reveal circle must reach to cover the page. */
function revealRadius(x: number, y: number): number {
  const width = window.innerWidth;
  const height = window.innerHeight;
  return Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
}

/** Fallback for browsers without View Transitions: the §3.5 per-element
 *  crossfade. `theme-anim` goes on before the flip (with a forced style flush)
 *  so the transition captures the outgoing palette. */
function crossfade(next: Theme) {
  const root = document.documentElement;
  root.classList.add("theme-anim");
  void root.offsetHeight;
  root.classList.toggle("dark", next === "dark");
  window.setTimeout(() => root.classList.remove("theme-anim"), SWAP_MS);
}

/**
 * DESIGN_SYSTEM.md §4 #23 — fixed paper slip, bottom-right, every screen.
 *
 * The §3.5 theme swap opens from this button: the new palette sweeps across the
 * page as a radial reveal (View Transitions), so the theme change reads as ink
 * spreading over the paper instead of every element fading through grey. The
 * two icons are stacked and quarter-turn into each other.
 */
export function ThemeToggle() {
  // SSR renders the light state; the effect syncs to the boot script's
  // decision right after hydration (suppressHydrationWarning on <html>).
  const [theme, setTheme] = useState<Theme>("light");
  const buttonRef = useRef<HTMLButtonElement>(null);
  /** Ignore clicks while a reveal is in flight — a second one mid-flight
   *  would snapshot a half-revealed page. */
  const busyRef = useRef(false);

  useEffect(() => {
    setTheme(currentTheme());

    // Follow the system while the user has no explicit preference stored.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystem = (e: MediaQueryListEvent) => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(THEME_KEY);
      } catch {}
      if (stored !== "light" && stored !== "dark") {
        const next: Theme = e.matches ? "dark" : "light";
        // No gesture to anchor a reveal to — crossfade (or snap).
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          document.documentElement.classList.toggle("dark", next === "dark");
        } else {
          crossfade(next);
        }
        setTheme(next);
      }
    };
    mq.addEventListener("change", onSystem);
    return () => mq.removeEventListener("change", onSystem);
  }, []);

  const toggle = () => {
    if (busyRef.current) return;
    const next: Theme = theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}

    const root = document.documentElement;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const startViewTransition = (document as WithViewTransition)
      .startViewTransition;

    setTheme(next);

    // Reduced motion swaps instantly; browsers without View Transitions keep
    // the older crossfade. Neither path touches the view-transition CSS.
    if (reduced || typeof startViewTransition !== "function") {
      if (reduced) root.classList.toggle("dark", next === "dark");
      else crossfade(next);
      return;
    }

    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      root.style.setProperty("--theme-origin-x", `${x}px`);
      root.style.setProperty("--theme-origin-y", `${y}px`);
      root.style.setProperty("--theme-origin-r", `${revealRadius(x, y)}px`);
    }

    busyRef.current = true;
    const transition = startViewTransition.call(document, () => {
      root.classList.toggle("dark", next === "dark");
    });
    transition.finished.finally(() => {
      busyRef.current = false;
    });
  };

  const label =
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      data-theme-toggle
      className="fixed right-5 bottom-5 z-[70] grid h-11 w-11 place-items-center rounded-[3px] border border-rule bg-paper-raised text-ink-soft shadow-paper transition-[color,border-color,background-color,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-ink active:scale-[0.94]"
    >
      {/* Stacked icons crossfade through a quarter turn — the only `dark:`
          utilities in the system, so no component branches on theme (§3.1). */}
      <Moon
        size={20}
        strokeWidth={1.5}
        aria-hidden
        className="absolute rotate-0 scale-100 opacity-100 transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] dark:-rotate-90 dark:scale-50 dark:opacity-0"
      />
      <Sun
        size={20}
        strokeWidth={1.5}
        aria-hidden
        className="absolute rotate-90 scale-50 opacity-0 transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] dark:rotate-0 dark:scale-100 dark:opacity-100"
      />
    </button>
  );
}
