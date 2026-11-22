"""GapAnalyzer API — FastAPI (context.md §9 stack decision).

Run:   cd backend && python main.py        (or: python -m uvicorn main:app --port 8000)
Port:  8000 · CORS: frontend origins (override with ALLOWED_ORIGINS env var)

POST /api/analyze — multipart/form-data:
    resume        file (PDF / DOCX / TXT) — sent on upload
    resume_text   plain-text resume       — sent on paste (one of the two)
    job_description (required)
Errors: 400 bad type · 413 too large · 422 no extractable text / no JD · 500 pipeline

POST /api/preview — same inputs and errors, extraction only (no scoring):
    answers in extraction time so the analyzing screen can show the real word
    count, page count, tracked/matched skill counts and a resume excerpt while
    /api/analyze is still running. Never returns a match score.
"""

import asyncio
import logging
import os
import re

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

import export as export_engine
import extraction
import matching
import preview as preview_engine
import report as report_engine
import rewrite as rewrite_engine
from schemas import (
    AnalysisResponse,
    CompareRequest,
    CompareResponse,
    ExportRequest,
    PreviewResponse,
    ReportExportRequest,
    RewriteRequest,
    RewriteResponse,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("gapanalyzer")

# Deploy note: the frontend is served by Vercel, whose production + preview
# origins are `<project>-<hash>.vercel.app`, so `https://*.vercel.app` is a
# default. That is safe here — the API is stateless and credential-free (no
# cookies, no auth, no stored data), so CORS is a convenience, not a boundary.
_DEFAULT_ORIGINS = (
    "http://localhost:3000,http://localhost:3100,"
    "http://127.0.0.1:3000,http://127.0.0.1:3100,"
    "https://*.vercel.app"
)


def _cors_origins(raw: str) -> tuple[list[str], str | None]:
    """Split ALLOWED_ORIGINS into exact origins + one wildcard regex.

    Entries are comma-separated. `*` is allowed inside the host (`https://
    *.vercel.app`) and expands to a single-label host match, so a URL with no
    matching origin still gets no CORS headers — a typo cannot silently widen
    the rule to every site (unlike FastAPI's `["*"]`, which also strips the
    `Vary: Origin` header).
    """
    exact: list[str] = []
    patterns: list[str] = []
    for entry in (part.strip().rstrip("/") for part in raw.split(",")):
        if not entry:
            continue
        if "*" in entry:
            patterns.append(re.escape(entry).replace(r"\*", "[A-Za-z0-9.-]+"))
        else:
            exact.append(entry)
    regex = "^(" + "|".join(patterns) + ")$" if patterns else None
    return exact, regex


_ALLOWED_ORIGINS, _ALLOWED_ORIGIN_REGEX = _cors_origins(
    os.getenv("ALLOWED_ORIGINS", _DEFAULT_ORIGINS)
)
logger.info(
    "CORS: exact=%s wildcard=%s", _ALLOWED_ORIGINS, _ALLOWED_ORIGIN_REGEX or "none"
)

app = FastAPI(title="GapAnalyzer API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_origin_regex=_ALLOWED_ORIGIN_REGEX,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/preview", response_model=PreviewResponse)
async def preview_documents(
    resume: UploadFile | None = File(None),
    resume_text: str | None = Form(None),
    job_description: str = Form(...),
) -> PreviewResponse:
    """The analyzing screen's first beat — extraction only, no scoring.

    Same inputs and the same 400/413/422/500 errors as `/api/analyze` (it calls
    the same extractor), so the client can show real counts and a real excerpt
    immediately and only then wait for the analysis. It never scores:
    `/results` stays the single source of the match percentage.
    """
    if not job_description.strip():
        raise HTTPException(status_code=422, detail="Job description is required.")

    try:
        resume_body, _layout, pages = await extraction.extract_document(
            resume, resume_text
        )
        payload = preview_engine.build(
            resume_body,
            job_description,
            resume.filename if resume is not None else "",
            pages,
        )
        return PreviewResponse(**payload)
    except HTTPException:
        raise
    except Exception:
        logger.exception("preview failed")
        raise HTTPException(status_code=500, detail="Analysis pipeline failed.")


@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze(
    resume: UploadFile | None = File(None),
    resume_text: str | None = Form(None),
    job_description: str = Form(...),
) -> AnalysisResponse:
    if not job_description.strip():
        raise HTTPException(status_code=422, detail="Job description is required.")

    resume_body, resume_layout = await extraction.extract_resume(resume, resume_text)

    try:
        # Matching is CPU-bound (TF-IDF + the embedding pass). Running it on
        # the event loop would block every other request — including the
        # analyzing screen's /api/preview, which must answer while this is
        # still running. A worker thread keeps the loop free.
        payload = await asyncio.to_thread(matching.analyze, resume_body, job_description)
        # Week 12: the extracted text goes back so /rewrite can reuse it.
        # Week 13: so does the page's measured format, so the export download
        # can be rebuilt in the resume's own design instead of plain text.
        return AnalysisResponse(
            **payload, resume_text=resume_body, resume_layout=resume_layout
        )
    except Exception:
        logger.exception("analysis pipeline failed")
        raise HTTPException(status_code=500, detail="Analysis pipeline failed.")


@app.post("/api/rewrite", response_model=RewriteResponse)
def rewrite_resume(request: RewriteRequest) -> RewriteResponse:
    """Week 12 — tailored resume: guarded LLM rewrite + placeholder gap drafts.

    Never fabricates experience (see rewrite.py); degrades to `mode: fallback`
    when the LLM is unavailable, so this route only 500s on a real bug.
    `api_key` is the viewer's own key from the tailor dialog and wins over the
    server's GEMINI_API_KEY — deployed installs ship no shared credential.
    """
    if not request.job_description.strip():
        raise HTTPException(status_code=422, detail="Job description is required.")
    if not request.resume_text.strip():
        raise HTTPException(
            status_code=400, detail="Provide a resume file or resume text."
        )

    try:
        return rewrite_engine.tailor(
            request.resume_text, request.job_description, api_key=request.api_key
        )
    except Exception:
        logger.exception("rewrite pipeline failed")
        raise HTTPException(status_code=500, detail="Rewrite pipeline failed.")


@app.post("/api/compare", response_model=CompareResponse)
def compare_postings(request: CompareRequest) -> CompareResponse:
    """Week 12 stretch — one resume ranked against two or three postings.

    Stateless like every other route: the client sends the resume text it
    already holds, and each posting is scored by the same pipeline as
    /api/analyze so the numbers stay comparable.
    """
    if not request.resume_text.strip():
        raise HTTPException(
            status_code=400, detail="Provide a resume file or resume text."
        )

    postings = [text.strip() for text in request.job_descriptions if text.strip()]
    if len(postings) < 2:
        raise HTTPException(
            status_code=422, detail="Add at least two job postings to compare."
        )
    if len(postings) > 3:
        raise HTTPException(
            status_code=422, detail="Compare up to three job postings."
        )

    try:
        return matching.compare(request.resume_text, postings)
    except Exception:
        logger.exception("comparison pipeline failed")
        raise HTTPException(status_code=500, detail="Comparison failed.")


@app.post("/api/rewrite/export")
def export_resume(request: ExportRequest) -> Response:
    """Week 12, point 1 — stream the reviewed resume as DOCX or PDF.

    The body is the text the client is looking at, never a server-side record:
    nothing is stored, so the download always matches the screen.
    """
    if not request.resume_text.strip():
        raise HTTPException(
            status_code=400, detail="Provide a resume file or resume text."
        )
    if request.format not in export_engine.FORMATS:
        raise HTTPException(
            status_code=400, detail="Unsupported format — DOCX or PDF only."
        )

    try:
        data, media_type, extension = export_engine.build(
            request.resume_text, request.format, layout=request.layout
        )
    except Exception:
        logger.exception("resume export failed")
        raise HTTPException(status_code=500, detail="Export failed.")

    return Response(
        content=data,
        media_type=media_type,
        headers={
            "Content-Disposition": (
                f'attachment; filename="tailored-resume.{extension}"'
            )
        },
    )


@app.post("/api/report/export")
def export_report(request: ReportExportRequest) -> Response:
    """Download the gap report (/report's secondary CTA).

    Stateless like every other route: the client posts the analysis it is
    already looking at, `report.py` turns it into text, and `export.py` renders
    that as DOCX or PDF — so the document cannot drift from the screen.
    """
    if request.format not in export_engine.FORMATS:
        raise HTTPException(
            status_code=400, detail="Unsupported format — DOCX or PDF only."
        )

    try:
        text = report_engine.render(request.model_dump())
        data, media_type, extension = export_engine.build(
            text, request.format, title="Gap analysis report"
        )
    except Exception:
        logger.exception("report export failed")
        raise HTTPException(status_code=500, detail="Export failed.")

    return Response(
        content=data,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="gap-report.{extension}"'
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
