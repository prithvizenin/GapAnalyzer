/** Shapes of the `POST /api/analyze` contract (context.md §9) plus the mock
 *  response screens render until the backend exists. */
export type SkillCategory = "technical" | "tools" | "soft";

/** Display labels for the three categories (DESIGN_SYSTEM §6 bar labels) —
 *  shared by the results bars, the chip-group headings and the report's
 *  suggestion cards so the wording stays identical everywhere. */
export const CATEGORY_LABELS: Record<SkillCategory, string> = {
  technical: "Technical",
  tools: "Tools",
  soft: "Soft Skills",
};

export interface MatchedSkill {
  skill: string;
  category: SkillCategory;
  /** Weeks 8–9: dictionary keyword hit, or embedding evidence in other words. */
  matched_by: "keyword" | "semantic";
  /** Cosine similarity for semantic matches; null/absent for keyword hits. */
  similarity?: number | null;
}

export interface MissingSkill {
  skill: string;
  category: SkillCategory;
  jd_mentions: number;
  why: string;
}

/** Weeks 10–11: one suggestion per gap category. `message` is the copy-deck
 *  line; the rest labels the card without parsing UI copy. */
export interface Recommendation {
  skill: string;
  category: SkillCategory;
  jd_mentions: number;
  message: string;
}

export interface ResumeLayout {
  source?: string;
  page?: { width: number; height: number };
  margin?: { top: number; bottom: number; left: number; right: number };
  font?: { family: string; bold: string; italic: string };
  size?: Record<string, number>;
  leading?: Record<string, number>;
  bullet?: { char: string; indent: number };
  /** One role per resume line — the exporter's stylesheet for the download. */
  roles?: string[];
}

export interface AnalysisResult {
  /** Week 12: the extracted resume text, echoed by the API so /rewrite can
   *  reuse it without a second upload (context.md §9). */
  resume_text: string;
  /** The uploaded page's measured format (backend/layout.py): /rewrite posts
   *  it back on export so the download keeps the resume's own design. */
  resume_layout?: ResumeLayout;
  match_score: number;
  matched_skills: MatchedSkill[];
  missing_skills: MissingSkill[];
  categories: Record<SkillCategory, number>;
  recommendations: Recommendation[];
  /** Week 13: up to four plain-language steps for `/results` (the landing
   *  hero sheet's block) — add the top gaps, raise the weakest category, keep
   *  the strongest overlaps prominent, open the summary with the title. */
  improvement_plan: string[];
  /** Week 13: one-sentence verdict banded on the score. */
  overall_assessment: string;
  job_title: string;
  company: string;
  diff_example: { original: string; suggested: string };
}

/** Sample response (DESIGN_SYSTEM.md §6 sample data) shown until /upload POSTs
 *  a real one. `why` for the report's five (CI/CD, Docker, Kubernetes,
 *  System-Design, Leadership) is the copy-deck text; the rest are
 *  placeholders for future use. */
export const MOCK_ANALYSIS: AnalysisResult = {
  resume_text: `Jane Doe — Frontend Developer
- Built responsive web applications with JavaScript, React, HTML and CSS
- Experience with Docker and Kubernetes for containerization and orchestration
- Integrated REST APIs across products
- Worked in an Agile team with strong communication and teamwork
- Git version control and Webpack builds`,
  match_score: 68,
  matched_skills: [
    { skill: "JavaScript", category: "technical", matched_by: "keyword" },
    { skill: "React", category: "technical", matched_by: "keyword" },
    { skill: "HTML", category: "technical", matched_by: "keyword" },
    { skill: "CSS", category: "technical", matched_by: "keyword" },
    { skill: "API Integration", category: "technical", matched_by: "keyword" },
    { skill: "Problem Solving", category: "soft", matched_by: "keyword" },
    { skill: "Teamwork", category: "soft", matched_by: "keyword" },
    { skill: "Communication", category: "soft", matched_by: "keyword" },
    { skill: "Agile", category: "soft", matched_by: "keyword" },
    { skill: "Git", category: "tools", matched_by: "keyword" },
    { skill: "Webpack", category: "tools", matched_by: "keyword" },
  ],
  missing_skills: [
    {
      skill: "Node.js",
      category: "technical",
      jd_mentions: 2,
      why: "The posting expects server-side JavaScript experience.",
    },
    {
      skill: "TypeScript",
      category: "technical",
      jd_mentions: 3,
      why: "Requested for type-safe frontend development across the posting.",
    },
    {
      skill: "Docker",
      category: "tools",
      jd_mentions: 2,
      why: "Widely used for containerization and deployment in production environments.",
    },
    {
      skill: "Kubernetes",
      category: "tools",
      jd_mentions: 1,
      why: "Important for scaling and managing containerized applications in cloud environments.",
    },
    {
      skill: "AWS",
      category: "tools",
      jd_mentions: 2,
      why: "Cloud infrastructure is listed among the role's requirements.",
    },
    {
      skill: "CI/CD",
      category: "tools",
      jd_mentions: 3,
      why: "Commonly required in modern web development roles, especially for deployment and automation.",
    },
    {
      skill: "Unit-Testing",
      category: "technical",
      jd_mentions: 2,
      why: "The posting asks for tested, maintainable code.",
    },
    {
      skill: "GraphQL",
      category: "technical",
      jd_mentions: 1,
      why: "Listed as the API layer the team works with.",
    },
    {
      skill: "System-Design",
      category: "technical",
      jd_mentions: 2,
      why: "Key for designing scalable and reliable systems, especially at senior levels.",
    },
    {
      skill: "Leadership",
      category: "soft",
      jd_mentions: 2,
      why: "Valued for team management, mentorship, and cross-functional collaboration.",
    },
    {
      skill: "Mentoring",
      category: "soft",
      jd_mentions: 1,
      why: "Mentioned alongside growing junior engineers.",
    },
  ],
  categories: { technical: 80, tools: 60, soft: 45 },
  recommendations: [
    {
      skill: "CI/CD",
      category: "tools",
      jd_mentions: 3,
      message: "Add a bullet mentioning CI/CD — the posting emphasizes it 3 times.",
    },
    {
      skill: "TypeScript",
      category: "technical",
      jd_mentions: 3,
      message:
        "Add a bullet mentioning TypeScript — the posting emphasizes it 3 times.",
    },
    {
      skill: "Leadership",
      category: "soft",
      jd_mentions: 2,
      message:
        "Add a bullet mentioning Leadership — the posting emphasizes it 2 times.",
    },
  ],
  improvement_plan: [
    "Work CI/CD, TypeScript and AWS into your resume — the posting asks for them 8 times.",
    "Raise soft skills coverage (45%) — describe real work with Leadership in a project or bullet.",
    "Keep React and JavaScript near the top of the resume — your strongest overlaps with this posting.",
    "Open your summary with the posting's own title, Senior Frontend Developer — it is the first line a screener reads.",
  ],
  overall_assessment:
    "Partial match — 11 of the posting's 22 tracked skills appear, and soft skills is the weakest area at 45%.",
  job_title: "Senior Frontend Developer",
  company: "Acme Technologies",
  diff_example: {
    original:
      "Experience with Docker and Kubernetes for containerization and orchestration.",
    suggested:
      "Experience with CI/CD, Docker and Kubernetes for containerization and orchestration.",
  },
};
