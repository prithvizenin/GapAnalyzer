"""Predefined skill dictionary + regex extraction (mid-sem, context.md §9).

Dictionary: `data/skill_dictionary.json` — entries are
``{name, category, aliases[], why?}`` where category ∈ technical | tools | soft.

Names are display strings and follow DESIGN_SYSTEM §6 where the copy deck is
specific ("Unit-Testing", "System-Design" keep their chip hyphens — screen 05's
headings turn hyphens into spaces in the frontend).

Matching rules:
- text and aliases are matched case-insensitively with word-edge guards
  ``(?<!\\w)…(?!\\w)`` so "js" never hits "json" and "java" never hits "javascript";
- alias separators also match hyphens/underscores, so "unit testing" hits
  "unit-testing" in a resume;
- only whole words — ambiguous bare tokens ("go", "r") are omitted or use
  unambiguous aliases ("golang").
"""

import json
import re
from pathlib import Path

CATEGORIES = ("technical", "tools", "soft")
_DICTIONARY_PATH = Path(__file__).parent / "data" / "skill_dictionary.json"


def _alias_regex(alias: str) -> str:
    """Turn one alias into a regex fragment (separators are interchangeable)."""
    words = alias.lower().replace("-", " ").replace("_", " ").split()
    if not words:
        return ""
    return r"[\s_\-]+".join(re.escape(word) for word in words)


def _compile_pattern(name: str, aliases: list[str]) -> re.Pattern | None:
    fragments = sorted(
        {f for f in (_alias_regex(a) for a in [name, *aliases]) if f},
        key=len,
        reverse=True,  # longest alias wins at each position
    )
    if not fragments:
        return None
    return re.compile(r"(?<!\w)(?:%s)(?!\w)" % "|".join(fragments))


def _load() -> list[dict]:
    raw = json.loads(_DICTIONARY_PATH.read_text(encoding="utf-8"))
    skills = []
    for entry in raw:
        pattern = _compile_pattern(entry["name"], entry.get("aliases", []))
        if pattern is None:
            continue
        skills.append({**entry, "pattern": pattern})
    return skills


SKILLS: list[dict] = _load()
BY_NAME: dict[str, dict] = {skill["name"]: skill for skill in SKILLS}


def count_mentions(text: str) -> dict[str, int]:
    """How many times each dictionary skill appears in `text` (name → count)."""
    haystack = text.lower()
    counts: dict[str, int] = {}
    for skill in SKILLS:
        hits = len(skill["pattern"].findall(haystack))
        if hits:
            counts[skill["name"]] = hits
    return counts
