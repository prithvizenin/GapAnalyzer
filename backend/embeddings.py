"""Semantic matching layer — Weeks 8–9 of the semester plan.

The mid-sem matcher only sees words the resume and posting share. This layer
asks a sentence-embedding model the question the product actually cares about:
*does the resume show evidence of this skill*, even when it is worded
differently? ("Led a cross-functional team and coached two interns" →
Leadership.)

How it works: for each unmatched JD skill, the dictionary's **alias phrases**
("led a team", "continuous delivery", "unit tests") are encoded as queries and
compared against every resume sentence; the best cosine wins. Above
`SEMANTIC_THRESHOLD` the skill becomes evidence the resume already shows it.

Why alias phrases and not the skill label: with a label query
("Does the candidate have experience with Leadership?") every model tested
ranked a *false* sentence ("Worked in an Agile team with strong communication")
above the true paraphrase ("Led a cross-functional team…"). Alias phrases are
short verb/object units — closer to how evidence is actually written — and on
the calibration set they separated the two cleanly.

Calibration (2026-11-17 probes, 12-skill resume + known paraphrases):
- `all-mpnet-base-v2`, alias queries, threshold 0.50:
    Leadership  TP 0.586  vs FP 0.444
    CI/CD       TP 0.665 / 0.537  vs FP 0.442 (Docker-only bullet)
    Unit-Testing TP 0.531  vs FP 0.126
    Kubernetes  TP 0.487  (containers only → correctly *not* promoted)
- rejected: `multi-qa-MiniLM-L6-cos-v1` and `bge-small` (TP below FP),
  `e5-small-v2` (compressed range, .786 vs .822), JD requirement-line queries
  (leak neighbouring skills), per-sentence score normalization (breaks
  single-skill postings).
Precision is deliberately favoured — a false "you already have this" costs the
user more than a missed paraphrase. Week 13's real-resume tests revisit it.

Precision guards: the resume's header/contact lines are never evidence (a
name-and-role line matches every skill weakly and produced real false
positives), and the score is the max over alias variants *and* sentences —
never a single lucky pairing.

The model is optional. Any load/encode failure (offline, missing dependency,
OOM) logs once and returns no evidence, leaving the keyword pipeline intact.
"""

import logging
import os
import re
import threading

import numpy as np

logger = logging.getLogger("gapanalyzer")

MODEL_NAME = os.getenv(
    "EMBEDDING_MODEL", "sentence-transformers/all-mpnet-base-v2"
)
try:
    THRESHOLD = float(os.getenv("SEMANTIC_THRESHOLD", "0.50"))
except ValueError:
    THRESHOLD = 0.50

_MIN_SENTENCE_CHARS = 15
_MAX_SENTENCES = 200
_MAX_HEADER_WORDS = 8

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")
_BULLET = re.compile(r"^[\s•\-–*#]+")
_CONTACT = re.compile(
    r"[\w.+-]+@[\w-]+\.[\w.]+|https?://|www\.|linkedin\.com", re.IGNORECASE
)

_model = None
_model_failed = False
_model_lock = threading.Lock()


def _get_model():
    """Load the bi-encoder once (first request), CPU-only."""
    global _model, _model_failed
    if _model is not None or _model_failed:
        return _model
    with _model_lock:
        if _model is not None or _model_failed:
            return _model
        try:
            from sentence_transformers import SentenceTransformer

            _model = SentenceTransformer(MODEL_NAME)
            logger.info(
                "semantic matching ready: %s (threshold %.2f)",
                MODEL_NAME,
                THRESHOLD,
            )
        except Exception:
            _model_failed = True  # don't retry a broken install on every request
            logger.exception(
                "embedding model unavailable — keyword matching only for this run"
            )
    return _model


def _encode(texts: list[str]):
    model = _get_model()
    if model is None or not texts:
        return None
    try:
        return np.asarray(
            model.encode(
                texts, normalize_embeddings=True, show_progress_bar=False
            )
        )
    except Exception:
        logger.exception("embedding failed — skipping semantic matching")
        return None


def split_sentences(text: str) -> list[str]:
    """Resume text → comparable units (sentences, bullets), minus the header.

    The first non-empty line is dropped when it looks like a name/role header
    (short, no terminal punctuation); contact lines (email/URL/phone) are
    dropped anywhere. Both are identity data, not evidence — in probes the
    header was the top "match" for half the skills.
    """
    sentences: list[str] = []
    seen: set[str] = set()
    header_checked = False
    for line in text.splitlines():
        stripped = _BULLET.sub("", line).strip()
        if not stripped or _CONTACT.search(stripped):
            continue
        if not header_checked:
            header_checked = True
            words = stripped.split()
            if len(words) <= _MAX_HEADER_WORDS and not stripped.endswith(
                (".", "!", "?")
            ):
                continue
        for piece in _SENTENCE_SPLIT.split(stripped):
            sentence = piece.strip()
            if len(sentence) < _MIN_SENTENCE_CHARS or sentence in seen:
                continue
            seen.add(sentence)
            sentences.append(sentence)
            if len(sentences) >= _MAX_SENTENCES:
                return sentences
    return sentences


def find_evidence(
    resume_text: str, queries: dict[str, list[str]]
) -> dict[str, dict]:
    """Answer each skill's alias queries against the resume's sentences.

    `queries` maps a skill name to its query phrases (skill label + aliases).
    Returns only skills whose best phrase×sentence pair clears `THRESHOLD`, as
    `{skill: {"similarity": float, "sentence": str}}`. An empty dict means "no
    semantic evidence" (or the model is unavailable) — never an error.
    """
    sentences = split_sentences(resume_text)
    pairs = {name: phrases for name, phrases in queries.items() if phrases}
    if not sentences or not pairs:
        return {}

    skills = list(pairs)
    phrases: list[str] = []
    spans: list[tuple[int, int]] = []
    for name in skills:
        start = len(phrases)
        phrases.extend(pairs[name])
        spans.append((start, len(phrases)))

    sentence_matrix = _encode(sentences)
    phrase_matrix = _encode(phrases)
    if sentence_matrix is None or phrase_matrix is None:
        return {}

    scores = phrase_matrix @ sentence_matrix.T  # (phrases, sentences)
    evidence: dict[str, dict] = {}
    for skill, (start, end) in zip(skills, spans):
        block = scores[start:end]  # (this skill's phrases, sentences)
        best = int(block.argmax())
        similarity = float(block[best // len(sentences)][best % len(sentences)])
        if similarity >= THRESHOLD:
            evidence[skill] = {
                "similarity": round(similarity, 3),
                "sentence": sentences[best % len(sentences)],
            }
    return evidence
