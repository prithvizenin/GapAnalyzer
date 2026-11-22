"""Security probes for the GapAnalyzer API (run against a live server).

Every case here used to be reachable from the browser as a 500: the export
endpoints trust the client-supplied `layout` profile field by field, so a
crafted payload can carry a string width, a 1e9-pt page or a 9-float colour.
"""
import json

import httpx

BASE = "http://localhost:8000"
RESUME = (
    "Jane Doe\n"
    "- Built responsive web apps with JavaScript and React\n"
    "- Experience with Docker for deployments"
)
JD = "Senior Frontend Developer\nWe need React, TypeScript and Docker.\nCompany: Acme"

LAYOUTS = {
    "string width": {"page": {"width": "abc", "height": 792}},
    "huge page": {"page": {"width": 1e9, "height": -5}},
    "tiny page": {"page": {"width": 100, "height": 100}},
    "small page, huge margins": {
        "page": {"width": 150, "height": 150},
        "margin": {"top": 149, "bottom": 149, "left": 149, "right": 149},
    },
    "bad font": {"font": {"family": "NoSuchFont", "bold": "X"}},
    "bad color": {"color": {"text": "zzz"}},
    "bad size": {"size": {"body": "huge", "name": -3}},
    "bad roles": {"roles": ["name", "evil", "body"]},
    "neg margin": {"margin": {"left": -100, "right": 10**6}},
    "bad bullet": {"bullet": {"char": "X" * 50, "indent": "big"}},
}

failures = 0


def report(name, r):
    global failures
    ok = r.status_code == 200
    failures += 0 if ok else 1
    print(f"{'PASS' if ok else 'FAIL'}  {name:26} -> {r.status_code} {len(r.content)}b")


# 0. the happy path still works
r = httpx.post(
    f"{BASE}/api/analyze",
    data={"resume_text": RESUME, "job_description": JD},
    timeout=180,
)
report("analyze happy path", r)

# 1. hostile layouts on both export formats
for label, layout in LAYOUTS.items():
    for fmt in ("pdf", "docx"):
        r = httpx.post(
            f"{BASE}/api/rewrite/export",
            json={"resume_text": RESUME, "format": fmt, "layout": layout},
            timeout=60,
        )
        report(f"{label} [{fmt}]", r)

# 2. NaN / Infinity literals are not valid JSON, but a hostile client sends them
raw = json.dumps(
    {"resume_text": RESUME, "format": "pdf", "layout": {"page": {"width": 1, "height": 1}}}
).replace('"width": 1', '"width": NaN', 1)
r = httpx.post(
    f"{BASE}/api/rewrite/export",
    content=raw.encode(),
    headers={"content-type": "application/json"},
    timeout=60,
)
print(f"INFO  nan literal                 -> {r.status_code}")

# 3. oversized upload is rejected by length, not 500
r = httpx.post(
    f"{BASE}/api/analyze",
    files={"resume": ("big.txt", b"a" * 6_000_000, "text/plain")},
    data={"job_description": JD},
    timeout=60,
)
print(f"{'PASS' if r.status_code == 413 else 'FAIL'}  6MB upload                 -> {r.status_code}")

# 4. report export never 500s on a malformed analysis payload. Pydantic rejects
#    a wrong-typed field with 422 (safe, and the correct contract answer); the
#    point of the check is that it is never a 500 and never echoes the body.
body = {
    "match_score": "nope",
    "matched_skills": [],
    "missing_skills": [
        {"skill": "X", "category": "tools", "jd_mentions": "lots", "why": "y"}
    ],
    "categories": {"technical": "a", "tools": None, "soft": 3},
    "diff_example": {"original": "", "suggested": ""},
    "format": "pdf",
}
r = httpx.post(f"{BASE}/api/report/export", json=body, timeout=60)
ok = r.status_code in (200, 422)
failures += 0 if ok else 1
print(f"{'PASS' if ok else 'FAIL'}  report export junk        -> {r.status_code} {len(r.content)}b")

# 5. a payload that passes validation but carries absurd numbers still renders
weird = {
    "match_score": 10**9,
    "matched_skills": [],
    "missing_skills": [],
    "categories": {"technical": -5, "tools": 10**9, "soft": 0},
    "diff_example": {"original": "", "suggested": ""},
    "format": "docx",
}
r = httpx.post(f"{BASE}/api/report/export", json=weird, timeout=60)
report("report export absurd ints", r)

print(f"\nFAILURES: {failures}")
raise SystemExit(1 if failures else 0)
