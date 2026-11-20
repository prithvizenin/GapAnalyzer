"""GapAnalyzer API — FastAPI (context.md §9 stack decision).

Run:   cd backend && python main.py        (or: python -m uvicorn main:app --port 8000)
Port:  8000 · CORS: frontend origins (override with ALLOWED_ORIGINS env var)

POST /api/analyze — multipart/form-data:
    resume        file (PDF / DOCX / TXT) — sent on upload
    resume_text   plain-text resume       — sent on paste (one of the two)
    job_description (required)
Errors: 400 bad type · 413 too large · 422 no extractable text / no JD · 500 pipeline
"""

import logging
import os

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

import export as export_engine
import extraction
import matching
import report as report_engine
import rewrite as rewrite_engine
from schemas import (
    AnalysisResponse,
    CompareRequest,
    CompareResponse,
    ExportRequest,
    ReportExportRequest,
    RewriteRequest,
    RewriteResponse,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("gapanalyzer")

_DEFAULT_ORIGINS = (
    "http://localhost:3000,http://localhost:3100,"
    "http://127.0.0.1:3000,http://127.0.0.1:3100"
)

app = FastAPI(title="GapAnalyzer API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv("ALLOWED_ORIGINS", _DEFAULT_ORIGINS).split(",")
        if origin.strip()
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze(
    resume: UploadFile | None = File(None),
    resume_text: str | None = Form(None),
    job_description: str = Form(...),
) -> AnalysisResponse:
    if not job_description.strip():
        raise HTTPException(status_code=422, detail="Job description is required.")

    resume_body = await extraction.extract_resume_text(resume, resume_text)

    try:
        payload = matching.analyze(resume_body, job_description)
        # Week 12: the extracted text goes back so /rewrite can reuse it.
        return AnalysisResponse(**payload, resume_text=resume_body)
    except Exception:
        logger.exception("analysis pipeline failed")
        raise HTTPException(status_code=500, detail="Analysis pipeline failed.")


@app.post("/api/rewrite", response_model=RewriteResponse)
def rewrite_resume(request: RewriteRequest) -> RewriteResponse:
    """Week 12 — tailored resume: guarded LLM rewrite + placeholder gap drafts.

    Never fabricates experience (see rewrite.py); degrades to `mode: fallback`
    when the LLM is unavailable, so this route only 500s on a real bug.
    """
    if not request.job_description.strip():
        raise HTTPException(status_code=422, detail="Job description is required.")
    if not request.resume_text.strip():
        raise HTTPException(
            status_code=400, detail="Provide a resume file or resume text."
        )

    try:
        return rewrite_engine.tailor(request.resume_text, request.job_description)
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
            request.resume_text, request.format
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
