"""LLM resume rewriting — Week 12, point 1 (context.md §9).

The generator answers one question: *how do I say what I already did using the
posting's words?* It may rephrase. It is never allowed to invent.

Three layers keep that honest:

1. **Scope** — the model only ever sees numbered resume lines and returns text
   for those ids. Names, employers, dates, headings and section labels are
   never sent as editable, and are copied through verbatim into
   `revised_resume`.
2. **Guards (deterministic, model-independent)** — a rewrite is rejected when
   it adds a number the original line did not contain, when it names a skill
   the resume does not already evidence (above all a *missing* skill), or when
   it bloats the line past 180% of its length. A rejected line keeps its
   original text, so the worst case is "no improvement", never a false claim.
3. **Additions are drafts, not resume content** — each gap gets one bullet
   template that must contain `[...]` placeholders for facts only the
   candidate can supply; drafts are never spliced into `revised_resume`.

The model is optional. With no key, no credits, a network failure or unusable
JSON, `tailor()` returns `mode = "fallback"`: the resume unchanged plus the
placeholder templates. The endpoint never 500s just because the LLM is down.

Configuration (env):
    GEMINI_API_KEY  Google AI Studio key (GOOGLE_API_KEY / LLM_API_KEY are
                    accepted aliases). The OpenRouter/OpenAI names are only
                    read when LLM_BASE_URL points somewhere other than Google,
                    so a leftover provider key is never sent to Gemini.
    LLM_BASE_URL    default https://generativelanguage.googleapis.com/v1beta/openai
    LLM_MODEL       default gemini-2.5-flash
    LLM_TIMEOUT     seconds, default 60

Gemini is spoken to through its OpenAI-compatible layer, so the request below
is the same chat-completions call either way. Documented in context.md §0/§9.

Where the key goes: `backend/.env` (`GEMINI_API_KEY=...`) — read once at import
and never allowed to override a variable already set in the shell. A blank or
placeholder value counts as "not configured": the rewrite then returns the
labelled `fallback` payload instead of calling the API with a bad key.
"""

import json
import logging
import os
import re
from pathlib import Path

import httpx

import matching
from skills import BY_NAME

logger = logging.getLogger("gapanalyzer")

# Google Gemini's OpenAI-compatible layer — same request shape, different host.
# Override both for any other OpenAI-compatible provider.
_DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai"

_ENV_FILE = Path(__file__).parent / ".env"
# A `your-…` value is the placeholder shipped in .env, not a credential.
_PLACEHOLDER_PREFIX = "your-"


def _load_env_file(path: Path) -> None:
    """Read `KEY=VALUE` lines from backend/.env into the environment.

    Stdlib only — the project has no dotenv dependency and the LLM key is the
    one setting a developer edits by hand. Variables already set in the shell
    always win, so `GEMINI_API_KEY=... python main.py` overrides the file.
    Unreadable/missing file is not an error (env-only setups are normal).
    """
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return
    for raw in lines:
        entry = raw.strip()
        if not entry or entry.startswith("#") or "=" not in entry:
            continue
        name, _, value = entry.partition("=")
        name = name.strip()
        if name.startswith("export "):
            name = name[len("export ") :].strip()
        value = value.strip().strip("'\"")
        if name and name not in os.environ:
            os.environ[name] = value


_load_env_file(_ENV_FILE)

LLM_BASE_URL = os.getenv("LLM_BASE_URL", _DEFAULT_BASE_URL).rstrip("/")
LLM_MODEL = os.getenv("LLM_MODEL", "gemini-2.5-flash")
try:
    LLM_TIMEOUT = float(os.getenv("LLM_TIMEOUT", "60"))
except ValueError:
    LLM_TIMEOUT = 60.0

MAX_LINES = 24          # prompt bound — a resume's strongest 24 content lines
MAX_LINE_CHARS = 400
MIN_LINE_WORDS = 6
MAX_GROWTH = 1.8        # a rewrite may not exceed 180% of the original length
MAX_ADDITIONS = 3       # one draft per gap category at most (see matching)
NOTE_CHARS = 160

# Copy deck (DESIGN_SYSTEM §6) — verbatim.
ADDITION_NOTE = "Only include this if it's true — fill in the placeholders."

_MARKER = re.compile(r"^(\s*(?:[\u2022\u2013\u2014*·-]\s+)?)(\S.*)$")
_HEADING = re.compile(r"^[A-Z][A-Z0-9 &/+.'()\-]{1,40}$")
_CONTACT = re.compile(r"@|https?://|www\.|linkedin\.com", re.IGNORECASE)
_YEAR = re.compile(r"\b(?:19|20)\d{2}\b")
_NUMBER = re.compile(r"\d[\d,.]*%?\+?")

SYSTEM_PROMPT = (
    "You are a resume editor for a job-gap analyzer. You rewrite the candidate's "
    "own lines so the posting's vocabulary appears where the candidate ALREADY "
    "has that evidence.\n"
    "Hard rules:\n"
    "- Never invent an employer, client, date, degree, certification, tool, "
    "person or number. Every number in a rewrite must already be in that line.\n"
    "- Never claim a skill the resume does not already show.\n"
    "- Keep the same tense and voice; keep each rewrite within 60% of the "
    "original length; keep it a single line.\n"
    "- Omit any line that needs no change.\n"
    "Then draft one bullet per missing skill. A draft MUST use square-bracket "
    "placeholders for facts only the candidate can supply, e.g. "
    "'Implemented CI/CD with [tool], cutting deploy time by [X]%'. Never state "
    "facts about the candidate.\n"
    "Return JSON only, no prose, in this shape:\n"
    '{"rewrites": [{"id": "L12", "text": "...", "note": "..."}], '
    '"additions": [{"skill": "...", "draft": "...", "note": "..."}]}'
)


# ---------------------------------------------------------------- text helpers


def _split_line(line: str) -> tuple[str, str]:
    """`"- Built X"` → `("- ", "Built X")` so the bullet marker survives edits."""
    match = _MARKER.match(line)
    return (match.group(1), match.group(2)) if match else ("", line.strip())


def _numbers(text: str) -> set[str]:
    return {token.rstrip("+%").replace(",", "") for token in _NUMBER.findall(text)}


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip()


def _candidate_lines(text: str) -> list[tuple[int, str, str]]:
    """Resume lines the editor may touch: `(line_index, marker, body)`.

    Skips blank lines, headings (`SUMMARY`, `SKILLS`), contact lines, dated
    employer/title rows, short labels and very long blocks. Whatever is not
    selected is copied through untouched.
    """
    picked: list[tuple[int, str, str]] = []
    for index, raw in enumerate(text.splitlines()):
        marker, body = _split_line(raw)
        if not body or len(body) > MAX_LINE_CHARS:
            continue
        if _CONTACT.search(body) or _YEAR.search(body):
            continue
        if len(body.split()) < MIN_LINE_WORDS:
            continue
        if _HEADING.match(body) and len(body.split()) <= 4:
            continue
        picked.append((index, marker, body))
        if len(picked) >= MAX_LINES:
            break
    return picked


# ------------------------------------------------------------------- the guard


def _guard(
    original: str, revised: str, evidenced: set[str], blocked: set[str]
) -> bool:
    """May this rewrite replace the original line?

    Model-independent, so the same rules hold for any provider. `evidenced`
    are skills the resume already shows somewhere; `blocked` are the gap
    skills, which must never be asserted as present.
    """
    if not revised or not revised.strip():
        return False
    if len(revised) > max(120, int(len(original) * MAX_GROWTH)):
        return False

    original_skills = set(matching.count_mentions(original))
    new_skills = set(matching.count_mentions(revised)) - original_skills
    if new_skills & blocked:
        return False
    if new_skills - evidenced:
        return False

    if _numbers(revised) - _numbers(original):
        return False

    # A rewrite must still read as prose, not a bare keyword list.
    return bool(re.search(r"[A-Za-z]{3}", revised))


def _valid_draft(draft: str) -> bool:
    """Drafts are templates: they must leave facts for the candidate to fill."""
    return (
        len(draft) >= 20
        and "[" in draft
        and "]" in draft
        and _numbers(draft) == set()  # no numbers anywhere, bracketed or not
    )


def _draft_template(skill: str) -> str:
    """Deterministic template used when the model is unavailable or off-spec."""
    return (
        f"{skill}: [project or employer] — [what you did with {skill}], "
        "[measurable result]."
    )


# --------------------------------------------------------------------- the LLM


_GOOGLE_HOST = "generativelanguage.googleapis.com"


def _api_key() -> str:
    """The credential for the provider `LLM_BASE_URL` points at.

    Key names are matched to the host: on the default Gemini base URL only
    Gemini key names count, so a leftover OPENROUTER_API_KEY / OPENAI_API_KEY
    in the shell can never be sent to Google (and an OpenRouter base URL still
    ignores GEMINI_API_KEY). A blank value or the `.env` placeholder counts as
    missing, so an unconfigured checkout degrades to `fallback` instead of
    spending a request on a bogus credential.
    """
    if _GOOGLE_HOST in LLM_BASE_URL:
        names = ("GEMINI_API_KEY", "GOOGLE_API_KEY", "LLM_API_KEY")
    else:
        names = (
            "LLM_API_KEY",
            "OPENROUTER_API_KEY",
            "OPENAI_API_KEY",
        )
    for name in names:
        value = (os.getenv(name) or "").strip()
        if value and not value.startswith(_PLACEHOLDER_PREFIX):
            return value
    return ""


def _json_object(content: str) -> dict | None:
    """Parse a JSON object out of a model reply (fences, stray prose tolerated)."""
    text = (content or "").strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        return None
    try:
        parsed = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None


def _call_llm(system: str, user: dict) -> tuple[dict | None, str]:
    """One chat-completions call. Returns `(parsed_json_or_None, model_label)`."""
    key = _api_key()
    if not key:
        logger.info(
            "no Gemini API key — rewrite runs in fallback mode "
            "(set GEMINI_API_KEY in backend/.env)"
        )
        return None, ""

    body: dict = {
        "model": LLM_MODEL,
        "temperature": 0.2,
        "max_tokens": 1800,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": json.dumps(user, ensure_ascii=False)},
        ],
    }
    headers = {
        "Authorization": f"Bearer {key}",
        # Ignored by Gemini; used for attribution when the base URL is OpenRouter.
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "GapAnalyzer",
    }

    for attempt in (0, 1):
        try:
            response = httpx.post(
                f"{LLM_BASE_URL}/chat/completions",
                headers=headers,
                json=body,
                timeout=LLM_TIMEOUT,
            )
        except httpx.HTTPError:
            logger.exception("rewrite provider unreachable — fallback mode")
            return None, ""

        if response.status_code == 200:
            try:
                content = response.json()["choices"][0]["message"]["content"]
            except (KeyError, IndexError, ValueError):
                logger.warning("rewrite provider returned an unexpected body")
                return None, ""
            parsed = _json_object(content)
            if parsed is None:
                logger.warning("rewrite provider returned non-JSON — fallback mode")
            return parsed, f"{LLM_BASE_URL.split('//')[-1].split('/')[0]}:{LLM_MODEL}"

        # Some providers reject `response_format` — retry once without it.
        if attempt == 0 and response.status_code in (400, 404, 415, 422):
            body.pop("response_format", None)
            continue
        logger.warning(
            "rewrite provider %s: %s",
            response.status_code,
            response.text[:200],
        )
        return None, ""

    return None, ""


# ------------------------------------------------------------------ assembly


def _apply(text: str, replacements: dict[int, str]) -> str:
    """Splice approved rewrites back in, preserving every other line verbatim."""
    out: list[str] = []
    for index, raw in enumerate(text.splitlines()):
        if index in replacements:
            marker, _ = _split_line(raw)
            out.append(f"{marker}{replacements[index]}")
        else:
            out.append(raw)
    return "\n".join(out)


def tailor(resume_text: str, jd_text: str) -> dict:
    """Rewrite the resume for the posting, or degrade to a safe fallback.

    Returns the `RewriteResponse` payload (context.md §9): `mode`, `model`,
    `revised_resume`, per-line `rewrites`, gap `additions` and `stats`.
    """
    analysis = matching.analyze(resume_text, jd_text)
    evidenced = {skill["skill"] for skill in analysis["matched_skills"]}
    gaps = analysis["missing_skills"][:MAX_ADDITIONS]
    blocked = {gap["skill"] for gap in gaps}
    lines = _candidate_lines(resume_text)

    parsed: dict | None = None
    model_label = ""
    if lines:
        parsed, model_label = _call_llm(
            SYSTEM_PROMPT,
            {
                "job_description": jd_text[:2500],
                "skills_already_evidenced": sorted(evidenced),
                "missing_skills": sorted(blocked),
                "lines": [{"id": f"L{index}", "text": body} for index, _, body in lines],
            },
        )

    model_rewrites: dict[str, dict] = {}
    if parsed:
        for entry in parsed.get("rewrites") or []:
            if isinstance(entry, dict) and isinstance(entry.get("id"), str):
                model_rewrites[entry["id"]] = entry

    rewrites: list[dict] = []
    replacements: dict[int, str] = {}
    rejected = 0
    for index, _, original in lines:
        entry = model_rewrites.get(f"L{index}") or {}
        revised = _clean(entry.get("text", ""))
        note = _clean(entry.get("note", ""))[:NOTE_CHARS]
        if not revised or revised == original:
            rewrites.append(
                {
                    "id": f"L{index}",
                    "original": original,
                    "revised": original,
                    "changed": False,
                    "note": "",
                }
            )
            continue
        if not _guard(original, revised, evidenced, blocked):
            rejected += 1
            rewrites.append(
                {
                    "id": f"L{index}",
                    "original": original,
                    "revised": original,
                    "changed": False,
                    "note": "",
                }
            )
            continue
        replacements[index] = revised
        rewrites.append(
            {
                "id": f"L{index}",
                "original": original,
                "revised": revised,
                "changed": True,
                "note": note,
            }
        )

    model_additions: dict[str, dict] = {}
    if parsed:
        for entry in parsed.get("additions") or []:
            if isinstance(entry, dict) and isinstance(entry.get("skill"), str):
                model_additions[entry["skill"]] = entry

    additions: list[dict] = []
    for gap in gaps:
        skill = gap["skill"]
        entry = model_additions.get(skill) or {}
        draft = _clean(entry.get("draft", ""))
        if not _valid_draft(draft):
            draft = _draft_template(skill)
        additions.append(
            {
                "skill": skill,
                "category": BY_NAME[skill]["category"],
                "draft": draft,
                "note": ADDITION_NOTE,
            }
        )

    changed = sum(1 for item in rewrites if item["changed"])
    return {
        "mode": "llm" if parsed is not None else "fallback",
        "model": model_label,
        "revised_resume": _apply(resume_text, replacements),
        "rewrites": rewrites,
        "additions": additions,
        "stats": {
            "candidates": len(lines),
            "changed": changed,
            "rejected": rejected,
        },
    }
