"""Fast preview for the analyzing screen (upload_screen.pdf p1/p2).

The analyzing screen must show a real resume remedy before the analysis
finishes, so it cannot wait for `/api/analyze` (which runs matching,
categories and the embedding pass). This module only does what extraction
already does — read the text, count it, and run the dictionary regexes over
both documents — so it answers in milliseconds.

Everything it returns is measured:
- `word_count`, `page_count` come from the uploaded document;
- `tracked_skills` is how many dictionary skills the *posting* names;
- `matched_skills` is how many of those already appear in the resume;
- `excerpt` is the resume's own lines, split into runs so the client can paint
  the highlighted phrases without re-implementing the dictionary.

It deliberately does **not** score: the match percentage is the full
pipeline's job, and previewing it here would let the screen disagree with
`/results`.
"""

from __future__ import annotations

import os

import skills


def _merge_spans(text: str) -> list[tuple[int, int, str]]:
    """Dictionary hits in one line, as `(start, end, skill)` — longest wins.

    The compiled patterns carry word-edge guards, so "java" never matches
    inside "javascript". Overlaps are dropped by preferring the earliest,
    longest span.
    """
    haystack = text.lower()
    found: list[tuple[int, int, str]] = []
    for skill in skills.SKILLS:
        for match in skill["pattern"].finditer(haystack):
            found.append((match.start(), match.end(), skill["name"]))

    found.sort(key=lambda span: (span[0], -(span[1] - span[0])))
    merged: list[tuple[int, int, str]] = []
    for span in found:
        if merged and span[0] < merged[-1][1]:
            continue
        merged.append(span)
    return merged


def _runs(line: str, tracked: set[str]) -> list[dict]:
    """Split a line into highlighted / plain runs for the sheet."""
    cuts = [span for span in _merge_spans(line) if span[2] in tracked]
    if not cuts:
        return [{"text": line, "highlight": False}]

    runs: list[dict] = []
    cursor = 0
    for start, end, _name in cuts:
        if start > cursor:
            runs.append({"text": line[cursor:start], "highlight": False})
        runs.append({"text": line[start:end], "highlight": True})
        cursor = end
    if cursor < len(line):
        runs.append({"text": line[cursor:], "highlight": False})
    return runs


def _excerpt_lines(text: str, tracked: set[str], limit: int = 3) -> list[list[dict]]:
    """Up to `limit` resume lines that show the posting's skills in context.

    Lines without a tracked skill are skipped, so the sheet always shows
    evidence rather than the candidate's name and address. If nothing matches
    yet, fall back to the first substantive lines.
    """
    lines = [" ".join(raw.split()) for raw in text.splitlines()]
    lines = [line for line in lines if len(line.split()) >= 4]

    with_skill = [line for line in lines if any(span[2] in tracked for span in _merge_spans(line))]
    chosen = (with_skill or lines)[:limit]
    return [_runs(line, tracked) for line in chosen]


def build(
    resume_text: str,
    job_description: str,
    filename: str,
    page_count: int,
) -> dict:
    """Measure the preview payload for one upload (see schemas.PreviewResponse).

    Takes the text the extractor already produced — the upload stream can only
    be read once, so this never touches the file again.
    """
    in_resume = skills.count_mentions(resume_text)
    in_posting = skills.count_mentions(job_description)

    tracked = set(in_posting)
    matched = [name for name in in_posting if name in in_resume]
    # Stable, dictionary-order list so the client can animate a count-up.
    matched.sort(key=lambda name: name.lower())

    return {
        "filename": os.path.basename(filename) if filename else "resume",
        "page_count": max(1, page_count),
        "word_count": len(resume_text.split()),
        "excerpt": _excerpt_lines(resume_text, tracked),
        "tracked_skills": len(tracked),
        "matched_skills": len(matched),
        "skills": matched,
    }
