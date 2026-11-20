/** Shapes of the `POST /api/rewrite` contract (context.md §9, week 12). */

import type { SkillCategory } from "@/lib/analysis";

/** One candidate resume line. `changed: false` covers both "the model left it
 *  alone" and "the fabrication guard rejected the proposal" — the original
 *  text is used either way (`backend/rewrite.py`). */
export interface RewrittenLine {
  id: string;
  original: string;
  revised: string;
  changed: boolean;
  note: string;
}

/** A gap-closing bullet *draft*: a template with `[...]` placeholders, never
 *  spliced into `revised_resume`. */
export interface Addition {
  skill: string;
  category: SkillCategory;
  draft: string;
  note: string;
}

export interface RewriteResult {
  /** `llm` when the provider answered with usable JSON; `fallback` when no key,
   *  a network failure or off-spec output left the resume unchanged. */
  mode: "llm" | "fallback";
  /** Why the model did not run when `mode` is `fallback` (`""` on success):
   *  `no_key` · `model_unavailable` · `rate_limited` · `overloaded` ·
   *  `unreachable` · `provider_error` · `invalid_key` (a rejected key supplied
   *  in the tailor dialog) · `non_json` · `unexpected_body` ·
   *  `no_candidate_lines`. */
  reason?: string;
  model: string;
  revised_resume: string;
  rewrites: RewrittenLine[];
  additions: Addition[];
  stats: { candidates: number; changed: number; rejected: number };
}

export type ExportFormat = "docx" | "pdf";
