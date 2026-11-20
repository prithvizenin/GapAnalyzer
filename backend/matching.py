"""Scoring + response assembly — the §9 contract payload.

Mid-sem approach, exactly what the mid-sem report claims (keyword-overlap /
TF-IDF, no embeddings):

- **skill coverage** — JD-required dictionary skills found in the resume,
  weighted by how often the posting mentions them (term frequency);
- **semantic promotion** (weeks 8–9) — dictionary misses are re-checked with
  sentence embeddings (`embeddings.py`) and count toward coverage at 0.75
  weight when the resume evidences them in different words;
- **text similarity** — TF-IDF cosine between resume and JD (scikit-learn);
- **match_score** = round(100 * (0.6 * coverage + 0.4 * cosine)); when the
  posting contains no dictionary skills at all, the cosine alone is used.

Category scores = matched / required per category (100 when the posting asks
for nothing in that category — no gap). `recommendations` give one copy-deck
suggestion per gap category (weeks 10–11); `diff_example` inserts the top missing skill before
the earliest posting-required skill mention in the resume sentence that shares
the most words with that skill's posting context. Both are the documented
mid-sem heuristics (context.md §9) and become LLM features end-sem.
"""

import re

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

import embeddings
from skills import BY_NAME, CATEGORIES, count_mentions

_SCORE_SKILL_WEIGHT = 0.6  # dictionary coverage
_SCORE_TFIDF_WEIGHT = 0.4  # cosine similarity
_SEMANTIC_CREDIT = 0.75    # paraphrased evidence counts, but not as surely as a name
_RECOMMENDATION_LIMIT = 3  # one suggestion per skill category
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+|\n+")
_LEAD_BULLETS = re.compile(r"^[•\-–*]\s*")


def _weighted_coverage(
    required: dict[str, int],
    resume: dict[str, int],
    semantic: set[str],
) -> float:
    total = sum(required.values())
    if total == 0:
        return 0.0
    hit = sum(count for name, count in required.items() if name in resume)
    hit += _SEMANTIC_CREDIT * sum(
        required[name] for name in semantic if name in required
    )
    return hit / total


def _tfidf_cosine(resume_text: str, jd_text: str) -> float:
    try:
        matrix = TfidfVectorizer(
            stop_words="english", ngram_range=(1, 2)
        ).fit_transform([resume_text, jd_text])
        similarity = cosine_similarity(matrix[0:1], matrix[1:2])[0][0]
    except ValueError:  # empty vocabulary (stopwords-only / too short)
        return 0.0
    return max(0.0, min(1.0, float(similarity)))


def _category_scores(
    required: dict[str, int], held: set[str]
) -> dict[str, int]:
    scores: dict[str, int] = {}
    for category in CATEGORIES:
        wanted = [name for name in required if BY_NAME[name]["category"] == category]
        if not wanted:
            scores[category] = 100  # nothing required → no gap
            continue
        found = sum(1 for name in wanted if name in held)
        scores[category] = round(100 * found / len(wanted))
    return scores


def _semantic_queries(name: str) -> list[str]:
    """Phrases the embeddings layer compares against each resume sentence.

    The dictionary's aliases are the query — they read the way evidence is
    written ("led a team", "continuous delivery", "unit tests"), whereas the
    bare skill label pulled generic team/communication sentences and ranked
    false positives above true paraphrases in calibration (embeddings.py).
    """
    aliases = BY_NAME[name].get("aliases") or []
    return sorted({name.lower(), *(alias.lower() for alias in aliases)})


def _recommendation(skill: dict) -> dict:
    """One suggestion payload: the copy-deck message plus the fields the report
    needs to label the card (so the UI never parses its own copy)."""
    mentions = skill["jd_mentions"]
    if mentions == 1:
        message = (
            f"Add a bullet mentioning {skill['skill']} — "
            "the posting mentions it once."
        )
    else:
        message = (
            f"Add a bullet mentioning {skill['skill']} — "
            f"the posting emphasizes it {mentions} times."
        )
    return {
        "skill": skill["skill"],
        "category": skill["category"],
        "jd_mentions": mentions,
        "message": message,
    }


def _recommendations(missing_skills: list[dict]) -> list[dict]:
    """Weeks 10–11, point 2 — personalized suggestions.

    One suggestion per skill category: the posting's worst gap in technical,
    tools and soft skills. The results screen already scores those three areas,
    so advice spread across them is more useable than three notes about whichever
    category happens to be mentioned most often.

    `missing_skills` arrives sorted by mention count, so the first skill seen for
    a category is its strongest gap; the picked three are then re-sorted across
    categories by mention count (then name) so the most emphasised gap reads
    first — the §9 contract's CI/CD example stays recommendation #1.
    """
    worst: dict[str, dict] = {}
    for skill in missing_skills:
        worst.setdefault(skill["category"], skill)
    picked = sorted(
        worst.values(), key=lambda item: (-item["jd_mentions"], item["skill"])
    )
    return [_recommendation(skill) for skill in picked[:_RECOMMENDATION_LIMIT]]


def _sentence_candidates(resume_text: str) -> list[str]:
    candidates = []
    for piece in _SENTENCE_SPLIT.split(resume_text):
        sentence = _LEAD_BULLETS.sub("", piece).strip()
        if len(sentence) >= 15:
            candidates.append(sentence)
    return candidates


def _earliest_position(sentence: str, names: list[str]) -> int | None:
    lowered = sentence.lower()
    earliest: int | None = None
    for name in names:
        for match in BY_NAME[name]["pattern"].finditer(lowered):
            if earliest is None or match.start() < earliest:
                earliest = match.start()
    return earliest


_WORD_RE = re.compile(r"[a-z0-9+#/]{3,}")
_STOPWORDS = frozenset(
    {
        "the", "and", "for", "with", "that", "this", "these", "those", "you",
        "your", "are", "our", "who", "will", "has", "have", "had", "not", "but",
        "all", "can", "may", "plus", "etc", "what", "when", "where", "which",
        "their", "they", "them", "from", "into", "than", "then", "also", "able",
    }
)


def _target_context(jd_text: str, target: str) -> set[str]:
    """Content words from the posting's windows around the target skill."""
    lowered = jd_text.lower()
    context: set[str] = set()
    for match in BY_NAME[target]["pattern"].finditer(lowered):
        window = lowered[max(0, match.start() - 40) : match.end() + 40]
        context |= {
            word for word in _WORD_RE.findall(window) if word not in _STOPWORDS
        }
    return context


def _diff_example(
    resume_text: str,
    jd_text: str,
    required: dict[str, int],
    missing_skills: list[dict],
) -> tuple[str, str]:
    """Insert the top missing skill before the earliest posting-required skill
    mention in the resume sentence most relevant to that skill's posting
    context (reproduces the §9 contract example). Empty strings when no
    sensible insertion point exists."""
    if not missing_skills:
        return "", ""
    target = missing_skills[0]["skill"]
    target_pattern = BY_NAME[target]["pattern"]
    context = _target_context(jd_text, target)
    required_names = list(required)

    by_context: list[tuple[tuple[int, int, int], str, list[str]]] = []
    by_anchor: list[tuple[tuple[int, int], str, list[str]]] = []
    for sentence in _sentence_candidates(resume_text):
        if target_pattern.search(sentence.lower()):
            continue  # already mentioned — nothing to insert
        found = count_mentions(sentence)
        anchors = [name for name in required_names if name in found]
        overlap = len(context & set(_WORD_RE.findall(sentence.lower())))
        if overlap:
            by_context.append(
                ((overlap, len(anchors), len(sentence)), sentence, anchors)
            )
        elif anchors:
            by_anchor.append(((len(anchors), len(sentence)), sentence, anchors))

    chosen = None
    if by_context:
        best = max(by_context, key=lambda item: item[0])
        if best[2]:  # context-relevant sentence needs an insertion anchor
            chosen = best
    if chosen is None and by_anchor:
        chosen = max(by_anchor, key=lambda item: item[0])
    if chosen is None:
        return "", ""

    sentence, anchors = chosen[1], chosen[2]
    position = _earliest_position(sentence, anchors)
    if position is None:
        return "", ""
    suggested = f"{sentence[:position]}{target}, {sentence[position:]}"
    return sentence, suggested


def _jd_metadata(jd_text: str) -> tuple[str, str]:
    """Best-effort job title (first short line) + company (labelled line)."""
    lines = [line.strip() for line in jd_text.splitlines() if line.strip()]
    job_title = lines[0] if lines and len(lines[0]) <= 80 else ""
    match = re.search(
        r"(?im)^\s*(?:company|about\s+us)\s*[:\-–]\s*(.+)$", jd_text
    )
    company = match.group(1).strip() if match else ""
    return job_title, company


def _compare_reason(rank: int, posting: dict) -> str:
    """The "and why" line for one ranked posting.

    Deterministic and derived from the same numbers the card shows — the score
    carries the ranking, the gap count and top gap explain it. Copy pattern is
    documented in DESIGN_SYSTEM §6.
    """
    score = posting["match_score"]
    missing = posting["missing_skills"]
    head = (
        f"Highest match at {score}%" if rank == 1 else f"{score}% match"
    )
    if not missing:
        return f"{head}; no skill gaps found in the posting."
    count = len(missing)
    gaps = f"{count} missing skill" + ("" if count == 1 else "s")
    return f"{head}; {gaps}, starting with {missing[0]['skill']}."


def compare(resume_text: str, jd_texts: list[str]) -> dict:
    """Rank one resume against several postings — week 12 stretch add-on.

    Reuses `analyze` per posting (dictionary + TF-IDF + embeddings), so every
    score is directly comparable to the single-posting screen. Sorted by score,
    then fewest gaps, then title; `rank` and `reason` are stamped afterwards.

    Each posting carries its `matched_skills` next to its gaps: the ranked card
    has to show what supports the score, not only what is missing (week 12
    bullet 4 — "see which one the resume matches best, and why").
    """
    postings = []
    for jd_text in jd_texts:
        analysis = analyze(resume_text, jd_text)
        postings.append(
            {
                "job_title": analysis["job_title"],
                "company": analysis["company"],
                "match_score": analysis["match_score"],
                "categories": analysis["categories"],
                "matched_skills": analysis["matched_skills"],
                "missing_skills": analysis["missing_skills"],
                "rank": 0,
                "reason": "",
            }
        )

    ranked = sorted(
        postings,
        key=lambda p: (-p["match_score"], len(p["missing_skills"]), p["job_title"]),
    )
    for rank, posting in enumerate(ranked, start=1):
        posting["rank"] = rank
        posting["reason"] = _compare_reason(rank, posting)
    return {"postings": ranked}


def analyze(resume_text: str, jd_text: str) -> dict:
    required = count_mentions(jd_text)      # what the posting asks for
    present = count_mentions(resume_text)   # what the resume shows

    keyword_matches = sorted(name for name in required if name in present)
    unmatched = [name for name in required if name not in present]

    # Weeks 8–9: ask the embeddings layer which unmatched skills the resume
    # evidences in other words. Precision-first — see embeddings.py.
    evidence = embeddings.find_evidence(
        resume_text, {name: _semantic_queries(name) for name in unmatched}
    )
    semantic_matches = sorted(name for name in unmatched if name in evidence)
    missing = sorted(
        (name for name in unmatched if name not in evidence),
        key=lambda name: (-required[name], name),
    )

    matched_skills = [
        {
            "skill": name,
            "category": BY_NAME[name]["category"],
            "matched_by": "keyword",
            "similarity": None,
        }
        for name in keyword_matches
    ] + [
        {
            "skill": name,
            "category": BY_NAME[name]["category"],
            "matched_by": "semantic",
            "similarity": evidence[name]["similarity"],
        }
        for name in semantic_matches
    ]
    matched_skills.sort(key=lambda item: item["skill"])

    missing_skills = []
    for name in missing:
        mentions = required[name]
        why = BY_NAME[name].get("why") or (
            f"Mentioned {mentions} time{'s' if mentions != 1 else ''} "
            "in the posting but not found in your resume."
        )
        missing_skills.append(
            {
                "skill": name,
                "category": BY_NAME[name]["category"],
                "jd_mentions": mentions,
                "why": why,
            }
        )

    coverage = _weighted_coverage(required, present, set(semantic_matches))
    cosine = _tfidf_cosine(resume_text, jd_text)
    blend = (
        _SCORE_SKILL_WEIGHT * coverage + _SCORE_TFIDF_WEIGHT * cosine
        if required
        else cosine
    )
    match_score = round(100 * max(0.0, min(1.0, blend)))

    recommendations = _recommendations(missing_skills)
    original, suggested = _diff_example(
        resume_text, jd_text, required, missing_skills
    )
    job_title, company = _jd_metadata(jd_text)

    return {
        "match_score": match_score,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "categories": _category_scores(
            required, set(keyword_matches) | set(semantic_matches)
        ),
        "recommendations": recommendations,
        "job_title": job_title,
        "company": company,
        "diff_example": {"original": original, "suggested": suggested},
    }
