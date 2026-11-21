"""Backend smoke test — the project's verification for the API (no pytest suite).

Start the API first (cd backend && python main.py), then:  python smoke_test.py
73 checks: contract shape + copy-deck strings on the happy paths (TXT upload,
pasted text, real PDF, DOCX), the full error contract (400/413/422), the
weeks 8–9 semantic layer (paraphrase promoted to semantic, distractor stays
missing), the weeks 10–11 categorized suggestions, the improvement plan /
overall assessment, the rewrite fallback reasons, the week 12 rewrite /
compare / exports, and the
gap-report download.
Override the target with  GAPANALYZER_API=http://host:port  if needed.
"""

import pathlib
import sys
import tempfile

import httpx

import layout
import report
import rewrite

BASE = __import__("os").environ.get("GAPANALYZER_API", "http://localhost:8000")
PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent

JD = """Senior Frontend Developer

We are looking for a Frontend Developer with strong React skills, experience in
building responsive web applications, and a solid understanding of modern
JavaScript, HTML, and CSS.
- TypeScript and unit testing experience
- CI/CD pipelines and Docker for deployment
- AWS cloud services; CI/CD automation preferred
- Leadership and mentoring of junior engineers
- CI/CD best practices
- Kubernetes is a plus

Company: Acme Technologies
"""
RESUME = """Jane Doe - Frontend Developer
Experience:
- Built responsive web applications with JavaScript, React, HTML and CSS
- Experience with Docker and Kubernetes for containerization and orchestration
- Integrated REST APIs across products
- Worked in an Agile team with strong communication and teamwork
- Git version control and Webpack builds
"""
EXPECTED_SENT = (
    "Experience with Docker and Kubernetes for containerization and orchestration"
)
EXPECTED_SUGG = (
    "Experience with CI/CD, Docker and Kubernetes "
    "for containerization and orchestration"
)

results: list[tuple[str, bool, str]] = []


def check(name: str, cond: bool, info: str = "") -> None:
    results.append((name, bool(cond), info))


def post(**kwargs) -> httpx.Response:
    return httpx.post(f"{BASE}/api/analyze", timeout=30, **kwargs)


def main() -> int:
    tmp = pathlib.Path(tempfile.mkdtemp())
    (tmp / "resume.txt").write_text(RESUME, encoding="utf-8")
    (tmp / "blank.txt").write_text("   \n \n", encoding="utf-8")
    (tmp / "fake.exe").write_bytes(b"MZ not a resume")
    (tmp / "big.txt").write_bytes(b"x" * (6 * 1024 * 1024))
    from docx import Document

    doc = Document()
    for line in RESUME.splitlines():
        doc.add_paragraph(line)
    doc.save(tmp / "resume.docx")

    # --- happy paths -------------------------------------------------------
    r = post(
        files={"resume": ("resume.txt", (tmp / "resume.txt").read_bytes(), "text/plain")},
        data={"job_description": JD},
    )
    check("txt: 200", r.status_code == 200, str(r.status_code))
    if r.status_code == 200:
        d = r.json()
        check(
            "contract keys",
            set(d)
            == {
                "resume_text", "resume_layout", "match_score",
                "matched_skills", "missing_skills",
                "categories", "recommendations", "improvement_plan",
                "overall_assessment", "job_title", "company", "diff_example",
            },
            str(set(d)),
        )
        check(
            "match_score range",
            isinstance(d["match_score"], int) and 0 <= d["match_score"] <= 100,
            str(d["match_score"]),
        )
        matched = {s["skill"] for s in d["matched_skills"]}
        check(
            "matched has React/JS/HTML/CSS",
            {"React", "JavaScript", "HTML", "CSS"} <= matched,
            str(sorted(matched)),
        )
        m0 = d["missing_skills"][0]
        check(
            "missing[0] = CI/CD x3",
            m0["skill"] == "CI/CD" and m0["jd_mentions"] == 3,
            f"{m0['skill']} x{m0['jd_mentions']}",
        )
        check(
            "why verbatim",
            m0["why"]
            == "Commonly required in modern web development roles, "
            "especially for deployment and automation.",
            m0["why"],
        )
        check(
            "missing all valid",
            all(
                s["category"] in ("technical", "tools", "soft")
                and s["jd_mentions"] >= 1
                and s["why"]
                for s in d["missing_skills"]
            ),
        )
        check(
            "categories",
            set(d["categories"]) == {"technical", "tools", "soft"}
            and all(isinstance(v, int) for v in d["categories"].values()),
            str(d["categories"]),
        )
        rec0 = d["recommendations"][0]
        check(
            "recommendation[0] copy-deck",
            rec0["message"]
            == "Add a bullet mentioning CI/CD — the posting emphasizes it 3 times."
            and rec0["skill"] == "CI/CD"
            and rec0["category"] == "tools"
            and rec0["jd_mentions"] == 3,
            str(rec0),
        )
        rec_categories = [rec["category"] for rec in d["recommendations"]]
        gap_categories = {skill["category"] for skill in d["missing_skills"]}
        check(
            "suggestions: one per category",
            len(rec_categories) == len(set(rec_categories)) <= 3,
            str(rec_categories),
        )
        check(
            "suggestions: cover every gap category",
            set(rec_categories) == gap_categories,
            f"{rec_categories} vs {sorted(gap_categories)}",
        )
        check(
            "suggestions: each names a real gap",
            all(
                rec["skill"] in {s["skill"] for s in d["missing_skills"]}
                for rec in d["recommendations"]
            ),
            str([rec["skill"] for rec in d["recommendations"]]),
        )
        plan = d["improvement_plan"]
        check(
            "improvement_plan 1-4 steps",
            isinstance(plan, list)
            and 1 <= len(plan) <= 4
            and all(isinstance(step, str) and len(step) >= 25 for step in plan),
            str(plan),
        )
        check(
            "improvement_plan names the top gap first",
            bool(plan) and plan[0].startswith("Work CI/CD"),
            str(plan[:1]),
        )
        assessment = d["overall_assessment"]
        check(
            "overall_assessment sentence",
            isinstance(assessment, str)
            and len(assessment) > 30
            and assessment.endswith("."),
            assessment,
        )
        check(
            "diff original",
            d["diff_example"]["original"] == EXPECTED_SENT,
            repr(d["diff_example"]["original"]),
        )
        check(
            "diff suggested",
            d["diff_example"]["suggested"] == EXPECTED_SUGG,
            repr(d["diff_example"]["suggested"]),
        )
        check(
            "job_title/company",
            d["job_title"] == "Senior Frontend Developer"
            and d["company"] == "Acme Technologies",
            f"{d['job_title']} / {d['company']}",
        )

    r = post(data={"resume_text": RESUME, "job_description": JD})
    check("paste: 200", r.status_code == 200, str(r.status_code))

    pdf = (PROJECT_ROOT / "MiniProject_MidSem_Report.pdf").read_bytes()
    r = post(
        files={"resume": ("resume.pdf", pdf, "application/pdf")},
        data={"job_description": JD},
    )
    check("pdf: 200 (real PDF extracts)", r.status_code == 200, f"{r.status_code} {r.text[:80]}")

    r = post(
        files={
            "resume": (
                "resume.docx",
                (tmp / "resume.docx").read_bytes(),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
        data={"job_description": JD},
    )
    check("docx: 200", r.status_code == 200, f"{r.status_code} {r.text[:80]}")

    # --- error contract ----------------------------------------------------
    r = post(
        files={"resume": ("resume.exe", (tmp / "fake.exe").read_bytes(), "application/octet-stream")},
        data={"job_description": JD},
    )
    check(
        "400 bad type",
        r.status_code == 400
        and r.json()["detail"] == "Unsupported file type — PDF, DOCX, or TXT only.",
        f"{r.status_code} {r.text[:90]}",
    )

    r = post(
        files={"resume": ("big.txt", (tmp / "big.txt").read_bytes(), "text/plain")},
        data={"job_description": JD},
    )
    check(
        "413 too large",
        r.status_code == 413 and r.json()["detail"] == "File too large — 5 MB max.",
        f"{r.status_code} {r.text[:90]}",
    )

    r = post(
        files={"resume": ("blank.txt", (tmp / "blank.txt").read_bytes(), "text/plain")},
        data={"job_description": JD},
    )
    check(
        "422 no text",
        r.status_code == 422 and "No extractable text" in r.json()["detail"],
        f"{r.status_code} {r.text[:90]}",
    )

    r = post(data={"job_description": JD})
    check(
        "400 no resume at all",
        r.status_code == 400 and "resume file or resume text" in r.json()["detail"],
        f"{r.status_code} {r.text[:90]}",
    )

    r = post(
        files={"resume": ("resume.txt", RESUME.encode(), "text/plain")},
        data={"job_description": "   "},
    )
    check(
        "422 blank JD",
        r.status_code == 422
        and r.json()["detail"] == "Job description is required.",
        f"{r.status_code} {r.text[:90]}",
    )

    r = post(files={"resume": ("resume.txt", RESUME.encode(), "text/plain")})
    check("422 missing JD field", r.status_code == 422, str(r.status_code))

    # --- weeks 8-9: semantic (embeddings) matching -------------------------
    SEM_JD = """Backend Developer

We need strong leadership and mentoring of junior engineers, plus ownership of
CI/CD pipelines. Python services. Kubernetes is a plus.

Company: Semantic Labs
"""
    SEM_RESUME = """Sam Roe - Engineer
- Led a cross-functional team of six engineers and coached two interns.
- Automated builds and releases with GitHub Actions.
- Built REST APIs in Python.
"""
    r = post(
        files={"resume": ("sem.txt", SEM_RESUME.encode(), "text/plain")},
        data={"job_description": SEM_JD},
    )
    check("semantic: 200", r.status_code == 200, f"{r.status_code} {r.text[:80]}")
    if r.status_code == 200:
        d = r.json()
        by = {s["skill"]: s for s in d["matched_skills"]}
        check(
            "semantic: Leadership by meaning",
            by.get("Leadership", {}).get("matched_by") == "semantic",
            str({k: v["matched_by"] for k, v in by.items()}),
        )
        check(
            "semantic: similarity recorded",
            any(s["matched_by"] == "semantic" for s in d["matched_skills"])
            and all(
                isinstance(s["similarity"], float)
                for s in d["matched_skills"]
                if s["matched_by"] == "semantic"
            ),
        )
        check(
            "semantic: keyword match still tagged keyword",
            by.get("Python", {}).get("matched_by") == "keyword",
            str(by.get("Python")),
        )
        check(
            "semantic: distractor stays missing",
            "Kubernetes" in {s["skill"] for s in d["missing_skills"]},
            str([s["skill"] for s in d["missing_skills"]]),
        )

    # --- week 12: tailored resume (LLM rewrite) -----------------------------
    # The provider is optional: with a key the model may propose rewrites,
    # without one the endpoint degrades to `fallback`. Both are valid — these
    # are the invariants that must hold in either mode.
    r = httpx.post(
        f"{BASE}/api/rewrite",
        json={"resume_text": RESUME, "job_description": JD},
        timeout=150,
    )
    check("rewrite: 200", r.status_code == 200, f"{r.status_code} {r.text[:90]}")
    if r.status_code == 200:
        d = r.json()
        check(
            "rewrite: contract keys",
            set(d)
            == {
                "mode", "reason", "model", "revised_resume", "rewrites",
                "additions", "stats",
            },
            str(set(d)),
        )
        check(
            "rewrite: mode valid",
            d["mode"] in ("llm", "fallback") and isinstance(d["model"], str),
            f"{d['mode']} / {d['model']}",
        )
        check(
            "rewrite: reason matches mode",
            isinstance(d["reason"], str)
            and (d["mode"] == "llm") == (d["reason"] == ""),
            f"{d['mode']} / {d['reason']}",
        )
        check(
            "rewrite: revised resume present",
            bool(d["revised_resume"].strip())
            and (
                d["mode"] != "fallback"
                or d["revised_resume"].strip() == RESUME.strip()
            ),
            f"mode={d['mode']} len={len(d['revised_resume'])}",
        )
        check(
            "rewrite: changed lines coherent",
            all(
                item["changed"] == (item["revised"] != item["original"])
                for item in d["rewrites"]
            ),
            str([(i["id"], i["changed"]) for i in d["rewrites"]]),
        )
        check(
            "rewrite: stats consistent",
            d["stats"]["changed"]
            == sum(1 for i in d["rewrites"] if i["changed"])
            and d["stats"]["candidates"] >= d["stats"]["changed"]
            and d["stats"]["rejected"] >= 0,
            str(d["stats"]),
        )
        check(
            "rewrite: drafts are templates",
            1 <= len(d["additions"]) <= 3
            and all(
                "[" in a["draft"]
                and "]" in a["draft"]
                and not any(char.isdigit() for char in a["draft"])
                and a["note"] == rewrite.ADDITION_NOTE
                for a in d["additions"]
            ),
            str([a["draft"] for a in d["additions"]]),
        )

    r = httpx.post(
        f"{BASE}/api/rewrite",
        json={"resume_text": "   ", "job_description": JD},
        timeout=30,
    )
    check(
        "rewrite: 400 empty resume",
        r.status_code == 400 and "resume file or resume text" in r.json()["detail"],
        f"{r.status_code} {r.text[:90]}",
    )

    # Guards are model-independent — these run without any provider.
    evidenced, blocked = {"Python", "React"}, {"CI/CD"}
    check(
        "guard: rejects blocked skill",
        rewrite._guard(
            "Built APIs in Python",
            "Built CI/CD pipelines in Python",
            evidenced,
            blocked,
        )
        is False,
    )
    check(
        "guard: rejects invented number",
        rewrite._guard(
            "Cut latency by 20 percent",
            "Cut latency by 40 percent",
            evidenced,
            blocked,
        )
        is False,
    )
    check(
        "guard: allows evidenced rewrite",
        rewrite._guard(
            "Built APIs in Python",
            "Built APIs in Python and React",
            evidenced,
            blocked,
        )
        is True,
    )
    check(
        "drafts: require placeholders, no facts",
        rewrite._valid_draft("Implemented CI/CD with [tool]") is True
        and rewrite._valid_draft("Implemented CI/CD with GitHub Actions in 2024")
        is False,
    )

    # --- week 12: downloadable resume (DOCX / PDF) --------------------------
    def export_body(file_format: str) -> dict:
        return {"resume_text": RESUME, "format": file_format}

    # Week 13: the download is rebuilt in the uploaded resume's own format —
    # /api/analyze measures the page and the client echoes the profile back.
    LAYOUT = {
        "source": "pdf",
        "page": {"width": 612.0, "height": 792.0},
        "margin": {"top": 48.3, "bottom": 48.0, "left": 60.0, "right": 60.4},
        "size": {
            "name": 20.0,
            "contact": 9.5,
            "heading": 11.0,
            "body": 10.0,
            "subtitle": 10.0,
            "bullet": 10.0,
        },
        "roles": layout.classify(RESUME),
    }
    check(
        "layout: roles cover every line",
        len(LAYOUT["roles"]) == len(RESUME.split("\n"))
        and LAYOUT["roles"][0] in ("name", "contact"),
        LAYOUT["roles"][:4],
    )
    SAMPLE = (
        "JANE DOE\n"
        "city | jane@example.com | +00 00000 00000\n"
        "CORE SKILLS\n"
        "Technical Skills: React\n"
        "\u2022 Built X"
    )
    check(
        "layout: name/contact/heading/label/bullet roles",
        layout.classify(SAMPLE)
        == ["name", "contact", "heading", "label", "bullet"]
        and layout.split_bullet("\u2022 Built X") == ("\u2022 ", "Built X"),
        layout.classify(SAMPLE),
    )

    r = httpx.post(
        f"{BASE}/api/rewrite/export", json=export_body("docx"), timeout=60
    )
    check("export docx: 200", r.status_code == 200, f"{r.status_code} {r.text[:90]}")
    check("export docx: zip magic", r.content[:2] == b"PK", repr(r.content[:8]))
    check(
        "export docx: attachment header",
        "attachment" in r.headers.get("content-disposition", "")
        and "tailored-resume.docx" in r.headers.get("content-disposition", ""),
        r.headers.get("content-disposition", ""),
    )

    r = httpx.post(
        f"{BASE}/api/rewrite/export", json=export_body("pdf"), timeout=60
    )
    check("export pdf: 200", r.status_code == 200, f"{r.status_code} {r.text[:90]}")
    check("export pdf: pdf magic", r.content[:4] == b"%PDF", repr(r.content[:8]))

    r = httpx.post(
        f"{BASE}/api/rewrite/export",
        json={**export_body("pdf"), "layout": LAYOUT},
        timeout=60,
    )
    check(
        "export pdf: honours the measured layout",
        r.status_code == 200 and r.content[:4] == b"%PDF",
        f"{r.status_code} {r.content[:8]}",
    )

    r = httpx.post(
        f"{BASE}/api/rewrite/export",
        json={"resume_text": RESUME, "format": "exe"},
        timeout=30,
    )
    check(
        "export: 400 bad format",
        r.status_code == 400 and "DOCX or PDF" in r.json()["detail"],
        f"{r.status_code} {r.text[:90]}",
    )

    # --- gap-report download (/report's DOWNLOAD REPORT button) -------------
    REPORT_BODY = {
        "match_score": 68,
        "matched_skills": [
            {
                "skill": "React",
                "category": "technical",
                "matched_by": "keyword",
                "similarity": None,
            },
            {
                "skill": "Leadership",
                "category": "soft",
                "matched_by": "semantic",
                "similarity": 0.586,
            },
        ],
        "missing_skills": [
            {
                "skill": "CI/CD",
                "category": "tools",
                "jd_mentions": 3,
                "why": "Commonly required in modern web development roles, "
                "especially for deployment and automation.",
            }
        ],
        "categories": {"technical": 80, "tools": 0, "soft": 100},
        "recommendations": [
            {
                "skill": "CI/CD",
                "category": "tools",
                "jd_mentions": 3,
                "message": "Add a bullet mentioning CI/CD — the posting "
                "emphasizes it 3 times.",
            }
        ],
        "job_title": "Senior Frontend Developer",
        "company": "Acme Technologies",
        "diff_example": {
            "original": "Experience with Docker.",
            "suggested": "Experience with CI/CD and Docker.",
        },
    }

    text = report.render(REPORT_BODY)
    check(
        "report: renders score + role",
        "MATCH SCORE: 68%" in text and "Senior Frontend Developer" in text,
        text.splitlines()[5] if len(text.splitlines()) > 5 else text[:60],
    )
    check(
        "report: lists missing skill + why",
        "CI/CD" in text and "mentioned 3 times" in text and "deployment" in text,
        text[-160:],
    )

    r = httpx.post(
        f"{BASE}/api/report/export",
        json={**REPORT_BODY, "format": "pdf"},
        timeout=60,
    )
    check("report pdf: 200", r.status_code == 200, f"{r.status_code} {r.text[:90]}")
    check("report pdf: magic", r.content[:4] == b"%PDF", repr(r.content[:8]))
    check(
        "report pdf: filename",
        "gap-report.pdf" in r.headers.get("content-disposition", ""),
        r.headers.get("content-disposition", ""),
    )

    r = httpx.post(
        f"{BASE}/api/report/export",
        json={**REPORT_BODY, "format": "docx"},
        timeout=60,
    )
    check(
        "report docx: 200 + zip magic",
        r.status_code == 200 and r.content[:2] == b"PK",
        f"{r.status_code} {repr(r.content[:8])}",
    )

    r = httpx.post(
        f"{BASE}/api/report/export",
        json={**REPORT_BODY, "format": "exe"},
        timeout=30,
    )
    check(
        "report: 400 bad format",
        r.status_code == 400 and "DOCX or PDF" in r.json()["detail"],
        f"{r.status_code} {r.text[:90]}",
    )

    # --- week 12 stretch: multi-job comparison -----------------------------
    THIRD_JD = """Data Analyst

We need SQL, Python and dashboarding experience. Strong communication and
stakeholder reporting matter.

Company: Northwind Data
"""
    r = httpx.post(
        f"{BASE}/api/compare",
        json={"resume_text": RESUME, "job_descriptions": [JD, SEM_JD, THIRD_JD]},
        timeout=240,
    )
    check("compare: 200", r.status_code == 200, f"{r.status_code} {r.text[:90]}")
    if r.status_code == 200:
        postings = r.json()["postings"]
        check("compare: three postings", len(postings) == 3, str(len(postings)))
        check(
            "compare: sorted by score",
            [p["match_score"] for p in postings]
            == sorted((p["match_score"] for p in postings), reverse=True),
            str([p["match_score"] for p in postings]),
        )
        check(
            "compare: ranks sequential",
            [p["rank"] for p in postings] == [1, 2, 3],
            str([p["rank"] for p in postings]),
        )
        check(
            "compare: reasons explain score",
            all(
                p["reason"] and f"{p['match_score']}%" in p["reason"]
                for p in postings
            ),
            str([p["reason"] for p in postings]),
        )
        check(
            "compare: categories present",
            all(
                set(p["categories"]) == {"technical", "tools", "soft"}
                for p in postings
            ),
            str([p["categories"] for p in postings]),
        )
        check(
            "compare: matched skills returned",
            all(isinstance(p["matched_skills"], list) for p in postings)
            and any(p["matched_skills"] for p in postings),
            str([len(p["matched_skills"]) for p in postings]),
        )
        check(
            "compare: matched skills categorised",
            all(
                set(skill) == {"skill", "category", "matched_by", "similarity"}
                and skill["category"] in ("technical", "tools", "soft")
                for p in postings
                for skill in p["matched_skills"]
            ),
            str([p["matched_skills"][:2] for p in postings]),
        )
        check(
            "compare: titles parsed",
            all(p["job_title"] for p in postings),
            str([p["job_title"] for p in postings]),
        )

    r = httpx.post(
        f"{BASE}/api/compare",
        json={"resume_text": RESUME, "job_descriptions": [JD, "   "]},
        timeout=60,
    )
    check(
        "compare: 422 one posting",
        r.status_code == 422 and "at least two" in r.json()["detail"],
        f"{r.status_code} {r.text[:90]}",
    )

    r = httpx.post(
        f"{BASE}/api/compare",
        json={"resume_text": RESUME, "job_descriptions": [JD, JD, JD, JD]},
        timeout=60,
    )
    check(
        "compare: 422 four postings",
        r.status_code == 422 and "up to three" in r.json()["detail"],
        f"{r.status_code} {r.text[:90]}",
    )

    r = httpx.post(
        f"{BASE}/api/compare",
        json={"resume_text": "  ", "job_descriptions": [JD, JD]},
        timeout=30,
    )
    check(
        "compare: 400 empty resume",
        r.status_code == 400 and "resume file or resume text" in r.json()["detail"],
        f"{r.status_code} {r.text[:90]}",
    )

    # --- report ------------------------------------------------------------
    fails = [name for name, ok, _ in results if not ok]
    for name, ok, info in results:
        print(("PASS " if ok else "FAIL ") + name + ("" if ok else f"  -> {info}"))
    print(f"\n{len(results) - len(fails)}/{len(results)} passed")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
