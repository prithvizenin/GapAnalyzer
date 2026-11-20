"""Resume text extraction — PDF / DOCX / TXT → clean text (context.md §9).

Error contract (FastAPI HTTPException → {"detail": "..."}):
- 400 unsupported file type (or neither resume file nor resume_text given)
- 413 file too large (5 MB cap — matches the client check in upload/page.tsx)
- 422 no extractable text (empty file, scanned/image PDF, whitespace only)
"""

import io
import os

from fastapi import HTTPException, UploadFile
from docx import Document
import pdfplumber

import layout as layout_engine

MAX_BYTES = 5 * 1024 * 1024  # 5 MB — keep in sync with upload/page.tsx
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}

_TYPE_ERROR = "Unsupported file type — PDF, DOCX, or TXT only."
_SIZE_ERROR = "File too large — 5 MB max."
_NO_TEXT_ERROR = (
    "No extractable text found in the resume — "
    "scanned/image PDFs are not supported yet."
)


# pdfplumber decodes the Symbol-font bullet as "(cid:127)" and the Windows-1252
# dashes of a resume template as U+FFFD. Both are part of the page's look, and
# the exporter re-emits them, so put the real characters back.
_GLYPHS = {"(cid:127)": "\u2022", "\ufeff": "", "\ufffd": "\u2013"}


def _normalise_glyphs(text: str) -> str:
    for bad, good in _GLYPHS.items():
        text = text.replace(bad, good)
    return text


def _from_pdf(data: bytes) -> str:
    try:
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            text = "\n".join(page.extract_text() or "" for page in pdf.pages)
    except Exception:
        # corrupt or unreadable PDF → surfaces as the 422 no-text error
        return ""
    return _normalise_glyphs(text)


def _from_docx(data: bytes) -> str:
    try:
        document = Document(io.BytesIO(data))
    except Exception:
        return ""
    parts = [paragraph.text for paragraph in document.paragraphs]
    for table in document.tables:  # resumes often keep content in tables
        for row in table.rows:
            for cell in row.cells:
                parts.append(cell.text)
    return "\n".join(parts)


def _from_txt(data: bytes) -> str:
    try:
        return data.decode("utf-8-sig")
    except UnicodeDecodeError:
        return data.decode("latin-1")


async def extract_resume(
    resume: UploadFile | None, resume_text: str | None
) -> tuple[str, dict]:
    """Resolve the resume body — file wins over pasted text.

    Returns `(text, layout)`: the plain text the analyzer scores, and the page
    profile (layout.py) the exporters rebuild the document in. Pasted text has
    no page geometry to measure, so it gets `layout.TEMPLATE` — the reference
    resume's design.
    """
    data = b""
    extension = ""
    if resume is not None and resume.filename:
        extension = os.path.splitext(resume.filename)[1].lower()
        if extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=_TYPE_ERROR)

        data = await resume.read()
        if len(data) > MAX_BYTES:
            raise HTTPException(status_code=413, detail=_SIZE_ERROR)

        if extension == ".pdf":
            text = _from_pdf(data)
        elif extension == ".docx":
            text = _from_docx(data)
        else:
            text = _from_txt(data)
    elif resume_text and resume_text.strip():
        text = resume_text
    else:
        raise HTTPException(
            status_code=400, detail="Provide a resume file or resume text."
        )

    if not text.strip():
        raise HTTPException(status_code=422, detail=_NO_TEXT_ERROR)
    return text, layout_engine.profile(data or None, extension, text)
