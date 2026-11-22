"""Pydantic models — locks the response to the context.md §9 contract."""

from typing import Literal

from pydantic import BaseModel, Field

Category = Literal["technical", "tools", "soft"]


class MatchedSkill(BaseModel):
    skill: str
    category: Category
    # Weeks 8–9 (context.md §9): dictionary hit vs. embedding evidence.
    matched_by: Literal["keyword", "semantic"] = "keyword"
    similarity: float | None = None


class MissingSkill(BaseModel):
    skill: str
    category: Category
    jd_mentions: int
    why: str


class Recommendation(BaseModel):
    """Weeks 10–11, point 2 — one actionable suggestion per gap category.

    `message` is the DESIGN_SYSTEM §6 copy-deck line, verbatim. The skill,
    category and mention count travel alongside it so the report can label the
    card without parsing UI copy.
    """

    skill: str
    category: Category
    jd_mentions: int
    message: str


class Categories(BaseModel):
    technical: int
    tools: int
    soft: int


class DiffExample(BaseModel):
    original: str
    suggested: str


class RewriteRequest(BaseModel):
    """Week 12 — the resume text to tailor plus the posting to tailor it for.

    Plain JSON: the frontend already holds both strings after /api/analyze.

    `api_key` (week 13, user addition) is the viewer's own Gemini key from the
    tailor dialog, used ahead of the server's `GEMINI_API_KEY` so a deployed
    install needs no shared credential. Optional: blank means "use the
    server's key"; the value is never stored or echoed.
    """

    resume_text: str
    job_description: str
    api_key: str = ""


class RewrittenLine(BaseModel):
    """One candidate resume line: original, proposed text and whether it stuck.

    `changed: false` covers both "the model left it alone" and "the fabrication
    guard rejected the proposal" — in either case the original text is used.
    """

    id: str
    original: str
    revised: str
    changed: bool
    note: str = ""


class Addition(BaseModel):
    """A gap-closing bullet *draft* — a template, never inserted in the resume.

    `draft` always contains `[...]` placeholders so the candidate supplies the
    evidence; that is how the generator avoids fabricating experience.
    """

    skill: str
    category: Category
    draft: str
    note: str


class RewriteStats(BaseModel):
    candidates: int
    changed: int
    rejected: int


class RewriteResponse(BaseModel):
    mode: Literal["llm", "fallback"]
    # Why the model did not run, when `mode == "fallback"` (`""` on success):
    # no_key · model_unavailable · rate_limited · overloaded · unreachable ·
    # provider_error · invalid_key · non_json · unexpected_body ·
    # no_candidate_lines. The screen names the cause instead of blaming "the
    # AI" for every case; `invalid_key` only occurs for a user-supplied key.
    reason: str = ""
    model: str
    revised_resume: str
    rewrites: list[RewrittenLine]
    additions: list[Addition]
    stats: RewriteStats


class ReportExportRequest(BaseModel):
    """The gap report as a document — /report's `DOWNLOAD REPORT` button.

    Mirrors `AnalysisResponse` minus `resume_text`: the report renders the
    analysis, not the resume. Extra fields the client sends (it spreads the
    whole analysis payload) are ignored by Pydantic. `format` is validated in
    the route so a bad value returns the project's 400 copy.
    """

    match_score: int
    matched_skills: list[MatchedSkill]
    missing_skills: list[MissingSkill]
    categories: Categories
    recommendations: list[Recommendation] = Field(default_factory=list)
    job_title: str = ""
    company: str = ""
    diff_example: DiffExample
    format: str = "pdf"


class ExportRequest(BaseModel):
    """Week 12, point 1 — render a reviewed resume as a downloadable document.

    `format` is validated in the route (not a Literal) so an unsupported value
    returns the project's 400 copy instead of FastAPI's 422 envelope.

    `layout` is the profile measured from the uploaded file (`layout.profile`,
    handed back by `/api/analyze` and echoed by the client). It carries the
    page geometry, per-role type sizes and line roles, so the download is
    rebuilt in the candidate's own format; absent or partial → `TEMPLATE`.
    """

    resume_text: str
    format: str
    layout: dict | None = None


class CompareRequest(BaseModel):
    """Week 12 stretch — one resume against two or three postings.

    The resume travels as text (the client already holds it after
    `/api/analyze`); `job_descriptions` is validated in the route so the count
    errors use the project's copy instead of FastAPI's 422 envelope.
    """

    resume_text: str
    job_descriptions: list[str]


class ExcerptRun(BaseModel):
    """One run of a resume line: plain text or a highlighted skill name."""

    text: str
    highlight: bool = False


class PreviewResponse(BaseModel):
    """`POST /api/preview` — what the analyzing screen shows while it waits.

    Everything is measured, never invented: the resume's own text, its word and
    page counts, the skills the *posting* asks for that this analyzer tracks,
    and which of those already appear in the resume. It answers in extraction
    time (no matching, no embeddings), so the screen can render a real excerpt
    and real counters before the full analysis lands.
    """

    filename: str
    page_count: int
    word_count: int
    # The resume lines shown on the sheet, pre-split into runs so the client
    # paints the highlighted phrases without parsing text itself.
    excerpt: list[list[ExcerptRun]] = Field(default_factory=list)
    tracked_skills: int
    matched_skills: int
    # Tracked skills the posting names *and* the resume already contains.
    skills: list[str] = Field(default_factory=list)


class ComparePosting(BaseModel):
    """One ranked posting. `reason` is the "and why" the plan asks for.

    Week 12 bullet 4: `matched_skills` travels with the gaps so a ranked card
    can show what the resume actually brings to that posting — the score alone
    says *which* posting won, not why it did.
    """

    rank: int
    job_title: str
    company: str
    match_score: int
    categories: Categories
    matched_skills: list[MatchedSkill]
    missing_skills: list[MissingSkill]
    reason: str


class CompareResponse(BaseModel):
    postings: list[ComparePosting]


class AnalysisResponse(BaseModel):
    # Week 12: the extracted resume text travels back with the analysis so the
    # client can hand it to /api/rewrite without re-uploading the file.
    resume_text: str
    # The uploaded page's measured format (layout.py): the client stores it
    # beside `resume_text` and posts it back on export, so the download keeps
    # the resume's own design. Pasted text → the reference template.
    resume_layout: dict = Field(default_factory=dict)
    match_score: int
    matched_skills: list[MatchedSkill]
    missing_skills: list[MissingSkill]
    categories: Categories
    recommendations: list[Recommendation]
    # Week 13: the hero sheet's improvement block, derived from the analysis.
    # `improvement_plan` is at most four ordered steps (`/results`);
    # `overall_assessment` is the one-sentence verdict banded on the score.
    improvement_plan: list[str]
    overall_assessment: str
    job_title: str
    company: str
    diff_example: DiffExample
