"""Downloadable resume output — DOCX (python-docx) + PDF (reportlab).

Week 12, point 1 (context.md §9): the tailored resume has to leave the app, so
`POST /api/rewrite/export` streams the *revised* text back as a document.

Both formats are plain text layout, one paragraph per resume line — they
preserve content, bullets and spacing, not the original file's design. That is
deliberate: the rewrite works on extracted text, so promising to reproduce a
resume template would be a fabrication of a different kind.

PDF uses reportlab's built-in Helvetica, which encodes Windows-1252; characters
outside it (CJK, emoji) are replaced with `?` rather than failing the download.
"""

import io
from xml.sax.saxutils import escape

from docx import Document
from docx.shared import Pt
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

FORMATS = ("docx", "pdf")

MEDIA_TYPES = {
    "docx": (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ),
    "pdf": "application/pdf",
}

# Reportlab's standard fonts are Windows-1252; anything outside it renders as
# a control box, so replace it explicitly instead of letting build() raise.
_PDF_ENCODING = "cp1252"


def _pdf_safe(text: str) -> str:
    try:
        text.encode(_PDF_ENCODING)
    except UnicodeEncodeError:
        return text.encode(_PDF_ENCODING, "replace").decode(_PDF_ENCODING)
    return text


def _docx(text: str) -> bytes:
    document = Document()
    normal = document.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(10.5)
    for line in text.splitlines():
        paragraph = document.add_paragraph(line)
        paragraph.paragraph_format.space_after = Pt(2)
    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def _pdf(text: str, title: str = "Tailored resume") -> bytes:
    buffer = io.BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=LETTER,
        leftMargin=0.9 * inch,
        rightMargin=0.9 * inch,
        topMargin=0.8 * inch,
        bottomMargin=0.8 * inch,
        title=title,
        author="GapAnalyzer",
    )
    style = ParagraphStyle(
        "resume",
        fontName="Helvetica",
        fontSize=9.5,
        leading=13.5,
        spaceAfter=2,
    )
    flow = []
    for line in text.splitlines():
        if line.strip():
            flow.append(Paragraph(escape(_pdf_safe(line)), style))
        else:
            flow.append(Spacer(1, 7))
    document.build(flow)
    return buffer.getvalue()


def build(
    text: str, file_format: str, title: str = "Tailored resume"
) -> tuple[bytes, str, str]:
    """Return `(bytes, media_type, extension)` for one download format."""
    if file_format == "docx":
        return _docx(text), MEDIA_TYPES["docx"], "docx"
    if file_format == "pdf":
        return _pdf(text, title), MEDIA_TYPES["pdf"], "pdf"
    raise ValueError(f"unsupported format: {file_format}")
