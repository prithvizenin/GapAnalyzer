"""Downloadable resume output — DOCX (python-docx) + PDF (reportlab).

Week 12, point 1 (context.md §9): the tailored resume has to leave the app, so
`POST /api/rewrite/export` streams the *revised* text back as a document.

The document is rebuilt in the uploaded resume's own format. `layout.profile()`
measured the source page at upload time — page size, margins, type sizes for
each line role, leading, the rules under section headings, bullet indent — and
`layout.roles` says what each line *is* (name, contact, heading, label, title,
subtitle, bullet, body). The renderers below apply that and nothing else: the
template decides the look, the reviewed text decides the words, so the download
matches the resume the candidate already sends to employers instead of being a
plain-text dump in Helvetica.

No profile (pasted resume, plain TXT, the gap report) → `layout.TEMPLATE`, the
reference resume's measurements.

PDF uses reportlab's base-14 fonts, which encode Windows-1252; characters
outside it (CJK, emoji) are replaced with `?` rather than failing the download.
"""

import io
from xml.sax.saxutils import escape

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, RGBColor
from reportlab.lib.colors import Color
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    PageTemplate,
    Paragraph,
    Spacer,
)

import layout as layout_engine

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

# Word has no Helvetica on most installs; Arial is the metric-compatible stand-in.
_DOCX_FONTS = {
    "Helvetica": "Arial",
    "Times": "Times New Roman",
    "Courier": "Courier New",
}


def _pdf_safe(text: str) -> str:
    try:
        text.encode(_PDF_ENCODING)
    except UnicodeEncodeError:
        return text.encode(_PDF_ENCODING, "replace").decode(_PDF_ENCODING)
    return text


def _ready(text: str) -> str:
    """Escape for a reportlab paragraph, losing only what cp1252 cannot hold."""
    return escape(_pdf_safe(text))


# ------------------------------------------------------------------ PDF (reportlab)

def _pdf_styles(lay: dict) -> dict[str, ParagraphStyle]:
    size, lead = lay["size"], lay["leading"]
    ink = Color(*lay["color"]["text"])
    muted = Color(*lay["color"]["muted"])
    font = lay["font"]

    body = ParagraphStyle(
        "body",
        fontName=font["family"],
        fontSize=size["body"],
        leading=lead["body"],
        textColor=ink,
        spaceBefore=0,
        spaceAfter=0,
    )
    return {
        "name": ParagraphStyle(
            "name",
            parent=body,
            fontName=font["bold"],
            fontSize=size["name"],
            leading=round(size["name"] * 1.15, 1),
            alignment=TA_CENTER,
        ),
        "contact": ParagraphStyle(
            "contact",
            parent=body,
            fontSize=size["contact"],
            leading=round(size["contact"] * 1.4, 1),
            alignment=TA_CENTER,
        ),
        "heading": ParagraphStyle(
            "heading",
            parent=body,
            fontName=font["bold"],
            fontSize=size["heading"],
            leading=lead["heading_rule"],
            spaceBefore=lead["heading_before"],
            spaceAfter=0,
            keepWithNext=1,
        ),
        "title": ParagraphStyle("title", parent=body, fontName=font["bold"]),
        "subtitle": ParagraphStyle(
            "subtitle",
            parent=body,
            fontName=font["italic"],
            fontSize=size["subtitle"],
            textColor=muted,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            parent=body,
            leftIndent=lay["bullet"]["indent"],
            bulletIndent=0,
            bulletFontName=font["family"],
            bulletFontSize=size["body"],
        ),
        "body": body,
    }


def _pdf(text: str, lay: dict, title: str) -> bytes:
    buffer = io.BytesIO()
    document = BaseDocTemplate(
        buffer,
        pagesize=(lay["page"]["width"], lay["page"]["height"]),
        leftMargin=lay["margin"]["left"],
        rightMargin=lay["margin"]["right"],
        topMargin=lay["margin"]["top"],
        bottomMargin=lay["margin"]["bottom"],
        title=_pdf_safe(title),
        author="GapAnalyzer",
    )
    # `SimpleDocTemplate` insets its frame by 6pt on every side, which would
    # shift the whole resume off the measured margins; the frame starts exactly
    # at the margins instead.
    frame = Frame(
        lay["margin"]["left"],
        lay["margin"]["bottom"],
        lay["page"]["width"] - lay["margin"]["left"] - lay["margin"]["right"],
        lay["page"]["height"] - lay["margin"]["top"] - lay["margin"]["bottom"],
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
        id="body",
    )
    document.addPageTemplates([PageTemplate(id="resume", frames=[frame])])
    styles = _pdf_styles(lay)
    lead = lay["leading"]
    ink = Color(*lay["color"]["text"])
    flow: list = []

    for line, role in zip(text.split("\n"), lay["roles"]):
        stripped = line.strip()
        if role == "blank" or not stripped:
            flow.append(Spacer(1, lead["body"] * 0.45))
            continue

        marker, body = layout_engine.split_bullet(stripped)
        if role == "heading":
            flow.append(Paragraph(_ready(body), styles["heading"]))
            if lead["rule"]:
                flow.append(
                    HRFlowable(
                        width="100%",
                        thickness=lead["rule"],
                        color=ink,
                        spaceBefore=0,
                        spaceAfter=lead["rule_after"],
                    )
                )
            else:
                flow.append(Spacer(1, lead["rule_after"]))
        elif role == "bullet":
            flow.append(
                Paragraph(
                    _ready(body),
                    styles["bullet"],
                    bulletText=lay["bullet"]["char"],
                )
            )
        elif role == "label":
            parts = layout_engine.split_label(body)
            if parts:
                flow.append(
                    Paragraph(
                        f"<b>{_ready(parts[0])}:</b> {_ready(parts[1])}",
                        styles["body"],
                    )
                )
            else:
                flow.append(Paragraph(_ready(body), styles["body"]))
        elif role in styles:
            flow.append(Paragraph(_ready(body), styles[role]))
        else:
            flow.append(Paragraph(_ready(body), styles["body"]))

    document.build(flow)
    return buffer.getvalue()


# --------------------------------------------------------------- DOCX (python-docx)

def _bottom_rule(paragraph, thickness: float) -> None:
    """Hairline under a section heading — the reference resume's 0.8pt rule."""
    properties = paragraph._p.get_or_add_pPr()
    borders = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), str(max(2, int(round(thickness * 8)))))  # eighths of a pt
    bottom.set(qn("w:space"), "2")
    bottom.set(qn("w:color"), "000000")
    borders.append(bottom)
    properties.append(borders)


def _set_font(run, name: str, size: float, *, bold=False, italic=False, color=None):
    run.font.name = name
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    if color is not None:
        run.font.color.rgb = RGBColor(*color)
    # Word needs the run-level east-asian mapping too, or the theme font wins.
    rpr = run._element.get_or_add_rPr()
    fonts = rpr.find(qn("w:rFonts"))
    if fonts is None:
        fonts = OxmlElement("w:rFonts")
        rpr.append(fonts)
    fonts.set(qn("w:ascii"), name)
    fonts.set(qn("w:hAnsi"), name)


def _docx(text: str, lay: dict) -> bytes:
    document = Document()
    word_family = _DOCX_FONTS.get(lay["font"]["family"], "Arial")
    size, lead = lay["size"], lay["leading"]
    ink = [int(round(channel * 255)) for channel in lay["color"]["text"]]
    muted = [int(round(channel * 255)) for channel in lay["color"]["muted"]]

    section = document.sections[0]
    section.page_width = Pt(lay["page"]["width"])
    section.page_height = Pt(lay["page"]["height"])
    section.left_margin = Pt(lay["margin"]["left"])
    section.right_margin = Pt(lay["margin"]["right"])
    section.top_margin = Pt(lay["margin"]["top"])
    section.bottom_margin = Pt(lay["margin"]["bottom"])

    normal = document.styles["Normal"]
    normal.font.name = word_family
    normal.font.size = Pt(size["body"])
    normal.paragraph_format.space_before = Pt(0)
    normal.paragraph_format.space_after = Pt(0)

    for line, role in zip(text.split("\n"), lay["roles"]):
        stripped = line.strip()
        paragraph = document.add_paragraph()
        fmt = paragraph.paragraph_format
        fmt.space_before = Pt(0)
        fmt.space_after = Pt(0)
        fmt.line_spacing_rule = WD_LINE_SPACING.EXACTLY
        fmt.line_spacing = Pt(lead["body"])

        if role == "blank" or not stripped:
            continue

        marker, body = layout_engine.split_bullet(stripped)

        if role == "heading":
            fmt.space_before = Pt(lead["heading_before"])
            fmt.line_spacing = Pt(lead["heading_rule"])
            _set_font(
                paragraph.add_run(body),
                word_family,
                size["heading"],
                bold=True,
                color=ink,
            )
            if lead["rule"]:
                _bottom_rule(paragraph, lead["rule"])
        elif role == "bullet":
            fmt.left_indent = Pt(lay["bullet"]["indent"])
            fmt.first_line_indent = Pt(-lay["bullet"]["indent"])
            fmt.tab_stops.add_tab_stop(Pt(lay["bullet"]["indent"]))
            _set_font(
                paragraph.add_run(f"{lay['bullet']['char']}\t{body}"),
                word_family,
                size["body"],
                color=ink,
            )
        elif role == "label":
            parts = layout_engine.split_label(body)
            if parts:
                _set_font(
                    paragraph.add_run(f"{parts[0]}:"),
                    word_family,
                    size["body"],
                    bold=True,
                    color=ink,
                )
                _set_font(
                    paragraph.add_run(f" {parts[1]}"),
                    word_family,
                    size["body"],
                    color=ink,
                )
            else:
                _set_font(paragraph.add_run(body), word_family, size["body"], color=ink)
        elif role == "name":
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            fmt.line_spacing = Pt(round(size["name"] * 1.15, 1))
            _set_font(
                paragraph.add_run(body),
                word_family,
                size["name"],
                bold=True,
                color=ink,
            )
        elif role == "contact":
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            fmt.line_spacing = Pt(round(size["contact"] * 1.4, 1))
            _set_font(
                paragraph.add_run(body), word_family, size["contact"], color=ink
            )
        elif role == "title":
            _set_font(paragraph.add_run(body), word_family, size["body"], bold=True, color=ink)
        elif role == "subtitle":
            _set_font(
                paragraph.add_run(body),
                word_family,
                size["subtitle"],
                italic=True,
                color=muted,
            )
        else:
            _set_font(paragraph.add_run(body), word_family, size["body"], color=ink)

    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


# ------------------------------------------------------------------------ build

def build(
    text: str,
    file_format: str,
    title: str = "Tailored resume",
    layout: dict | None = None,
) -> tuple[bytes, str, str]:
    """Return `(bytes, media_type, extension)` for one download format."""
    lay = layout_engine.resolved(layout, text)
    if file_format == "docx":
        return _docx(text, lay), MEDIA_TYPES["docx"], "docx"
    if file_format == "pdf":
        return _pdf(text, lay, title), MEDIA_TYPES["pdf"], "pdf"
    raise ValueError(f"unsupported format: {file_format}")
