"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet, Paperclip } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { AnnotationNumber } from "@/components/ui/AnnotationNumber";

/** Free-key page (copy deck, DESIGN_SYSTEM §6). */
const KEY_URL = "https://aistudio.google.com/apikey";

const STEPS = [
  "Open Google AI Studio's API keys page.",
  "Sign in with a Google account — no card required.",
  "Click Create API key, then copy it.",
  "Paste it below and start the tailor.",
];

const TITLE_ID = "gemini-key-title";

/**
 * DESIGN_SYSTEM.md §4 #25 — the Gemini key dialog on `/report`'s
 * `TAILOR MY RESUME →` (user addition, not in a comp).
 *
 * Production ships no shared LLM key, so the person who wants the rewrite
 * supplies their own: this dialog says why, links the free-key process, and
 * hands the key back to the page, which stores it for the tab and sends it with
 * the rewrite request. The key is never written to localStorage and the note
 * under the field says so.
 *
 * Presentational: `open` / `initialKey` in, `onSubmit(key)` / `onClose` out.
 * Escape and the backdrop close it; the field takes focus on open.
 */
export function ApiKeyDialog({
  open,
  initialKey = "",
  onClose,
  onSubmit,
}: {
  open: boolean;
  initialKey?: string;
  onClose: () => void;
  onSubmit: (key: string) => void;
}) {
  const [key, setKey] = useState(initialKey);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setKey(initialKey);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const focus = window.setTimeout(() => inputRef.current?.focus(), 0);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(focus);
    };
  }, [open, initialKey, onClose]);

  if (!open) return null;

  const trimmed = key.trim();

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto px-4 py-6">
      {/* Backdrop — plain ink wash (no glassmorphism, §1) */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/45"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        className="relative w-full max-w-[560px]"
      >
        <Sheet className="max-h-[calc(100vh-3rem)] overflow-y-auto px-6 pt-7 pb-6 md:px-8">
          <div className="flex items-center gap-3">
            <Paperclip className="h-7 w-7 shrink-0 -rotate-12 text-graphite" />
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-graphite">
              Gemini API key
            </p>
          </div>

          <h2
            id={TITLE_ID}
            className="mt-3 font-display text-[24px] uppercase tracking-[0.03em] md:text-[27px]"
          >
            Tailoring needs a key
          </h2>

          <p className="mt-3 text-[14px] leading-relaxed text-ink-soft md:text-[15px]">
            Rewriting your resume runs on Google Gemini, and GapAnalyzer does not
            ship a shared key. Add your own free key — it is used for this
            tailoring run and kept in this tab only.
          </p>

          <div className="mt-5 border-t border-rule pt-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-graphite">
              Get one free
            </p>
            <ol className="mt-3 space-y-2.5">
              {STEPS.map((step, i) => (
                <li
                  key={step}
                  className="flex items-start gap-3 text-[14px] leading-snug text-ink-soft"
                >
                  <AnnotationNumber n={i + 1} />
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
            <a
              href={KEY_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block font-mono text-[12px] uppercase tracking-[0.1em] text-ink-blue underline decoration-pen-red/60 underline-offset-4 transition-colors hover:text-ink"
            >
              aistudio.google.com/apikey ↗
            </a>
          </div>

          <form
            className="mt-5 border-t border-rule pt-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (trimmed) onSubmit(trimmed);
            }}
          >
            <label
              htmlFor="gemini-key"
              className="font-mono text-[11px] uppercase tracking-[0.12em] text-graphite"
            >
              Your key
            </label>
            <input
              id="gemini-key"
              ref={inputRef}
              type="text"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="AIza…"
              className="mt-2 w-full rounded-[3px] border border-rule bg-paper-raised px-4 py-3 font-mono text-[14px] text-ink transition-colors duration-150 placeholder:text-graphite"
            />
            <p className="mt-2 font-mono text-[11px] leading-relaxed text-graphite">
              Kept in this tab only — never stored on the server.
            </p>

            <Button type="submit" mono className="mt-4 w-full" disabled={!trimmed}>
              Tailor my resume
              <span aria-hidden>→</span>
            </Button>

            <div className="mt-4 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="font-mono text-[11px] uppercase tracking-[0.1em] text-graphite transition-colors hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onSubmit("")}
                className="font-mono text-[11px] uppercase tracking-[0.1em] text-graphite underline decoration-rule underline-offset-4 transition-colors hover:text-ink"
              >
                Continue without a key
              </button>
            </div>
          </form>
        </Sheet>
      </div>
    </div>
  );
}
