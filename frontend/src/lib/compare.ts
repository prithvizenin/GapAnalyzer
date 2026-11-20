/** Shapes of the `POST /api/compare` contract (context.md §9, week 12 stretch). */

import type {
  MatchedSkill,
  MissingSkill,
  SkillCategory,
} from "@/lib/analysis";

export interface ComparePosting {
  /** 1 = best match. Postings arrive sorted best-first. */
  rank: number;
  job_title: string;
  company: string;
  match_score: number;
  categories: Record<SkillCategory, number>;
  /** What the resume brings to this posting (week 12 bullet 4 — the "why"
   *  next to the score); same shape as the single-posting response. */
  matched_skills: MatchedSkill[];
  missing_skills: MissingSkill[];
  /** The "and why" line, served by the API (DESIGN_SYSTEM §6 pattern). */
  reason: string;
}

export interface CompareResult {
  postings: ComparePosting[];
}
