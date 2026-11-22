"""Resume template — measure the uploaded file so exports keep its format.

context.md §9: the tailored resume has to leave the app as a document. A plain
text dump in Helvetica is not that document — a resume is a designed page, and
the candidate sends the download to employers. So the profile is measured once,
at upload time, and travels with the analysis:

    PDF/DOCX upload → profile() → {page, margin, font, size, leading, bullet,
                                   roles} → stored by the client → sent back on
    POST /api/rewrite/export → export.py renders the reviewed text in it.

`TEMPLATE` is the measured profile of the reference resume (US Letter 612×792,
60pt side margins, Helvetica 20/11/10/9.5, 13pt leading, 0.8pt rules under
section headings, 14pt bullet indent). Pasted text and plain-TXT uploads have
no design to measure, so they get this template — as does a PDF whose geometry
cannot be read, because a good-looking fallback beats a 500.

`roles` is the one piece the renderer cannot derive at export time: it labels
every line (`name`, `contact`, `heading`, `label`, `title`, `subtitle`,
`bullet`, `body`, `blank`). The rewrite preserves the line count (rewrite.py
`_apply`), so index *i* of the revised text is the same slot as index *i* of the
profiled text and the labels stay valid.
"""

import io
import math
import re
import statistics

# ---------------------------------------------------------------- the template

TEMPLATE: dict = {
    "source": "template",
    "page": {"width": 612.0, "height": 792.0},
    "margin": {"top": 48.0, "bottom": 48.0, "left": 60.0, "right": 60.0},
    "font": {
        "family": "Helvetica",
        "bold": "Helvetica-Bold",
        "italic": "Helvetica-Oblique",
    },
    "size": {
        "name": 20.0,
        "contact": 9.5,
        "heading": 11.0,
        "body": 10.0,
        "subtitle": 10.0,
        "bullet": 10.0,
    },
    # `heading_rule` is the distance from a section heading's top to its rule
    # (13.5 = the 13pt leading + half a point), `rule_after` the gap from the
    # rule to the first line under it. Together: 13.5 + 0.8 + 5.3 = 19.6pt,
    # which is exactly the heading-to-body distance measured in the source.
    "leading": {
        "body": 13.0,
        "heading_before": 9.2,
        "heading_rule": 13.5,
        "rule_after": 5.3,
        "rule": 0.8,
    },
    "color": {"text": [0.0, 0.0, 0.0], "muted": [0.2, 0.2, 0.2]},
    "bullet": {"char": "\u2022", "indent": 14.0},
}

# Plausible type sizes — a profile is measured from a real page and can be
# wrong (rotated text, an oversized logotype); clamping keeps one bad page from
# rendering an unreadable 60pt body.
_LIMITS = {
    "name": (12.0, 40.0),
    "contact": (6.0, 14.0),
    "heading": (8.0, 22.0),
    "body": (7.0, 14.0),
    "subtitle": (6.0, 14.0),
    "bullet": (7.0, 14.0),
}

# ------------------------------------------------------------------ line roles

_ROLES = (
    "name",
    "contact",
    "heading",
    "label",
    "title",
    "subtitle",
    "bullet",
    "body",
    "blank",
)

# Bullet markers seen in resumes. The Symbol-font glyph pdfplumber decodes as
# `(cid:127)` is normalised to `•` by extraction.py; `split_bullet` also accepts
# the raw form, because a caller may hand this module un-normalised text.
_BULLET_PREFIXES = ("\u2022 ", "\u00b7 ", "\u25aa ", "\u00b0 ", "- ", "\u2013 ", "* ", "> ")

_CONTACT = re.compile(r"@|https?://|www\.|linkedin\.|github\.", re.IGNORECASE)
_PHONE = re.compile(r"\+?\d[\d\s().\-]{7,}\d")
_LABEL = re.compile(r"^([A-Z][A-Za-z0-9 &/.,'+-]{1,38}):\s+(\S.*)$")
# "Company Name, City | Month YYYY – Present", "University | Graduation Year"
_SUBTITLE = re.compile(
    r"\||\b(?:19|20)\d{2}\b|\bPresent\b|\bGraduation\b|"
    r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b",
    re.IGNORECASE,
)
_TITLE_WORDS = {"&", "and", "of", "for", "the", "in", "at", "to"}


def split_bullet(line: str) -> tuple[str, str]:
    """`"• Built X"` → `("• ", "Built X")`; no marker → `("", line)`."""
    for prefix in _BULLET_PREFIXES:
        if line.startswith(prefix):
            return prefix, line[len(prefix) :]
    if line.startswith("(cid:127)"):
        return "\u2022 ", line[len("(cid:127)") :].lstrip()
    return "", line


def split_label(line: str) -> tuple[str, str] | None:
    """`"Technical Skills: Skill 1"` → `("Technical Skills", "Skill 1")`.

    Only used for the bold inline label the reference resume gives its skill
    rows: a short Title-Case prefix inside the first four words.
    """
    match = _LABEL.match(line)
    if not match:
        return None
    prefix, rest = match.group(1), match.group(2)
    if len(prefix.split()) > 4 or not rest.strip():
        return None
    return prefix, rest


def _is_heading(body: str) -> bool:
    return (
        body.isupper()
        and len(body) <= 48
        and len(body.split()) <= 5
        and any(ch.isalpha() for ch in body)
    )


def _is_contact(body: str) -> bool:
    return bool(_CONTACT.search(body) or _PHONE.search(body))


def _is_title(body: str) -> bool:
    """A short role/company line, e.g. `Job Title` (bold in the source)."""
    words = body.split()
    if not words or len(words) > 5:
        return False
    if any(ch in body for ch in "|,:;()[]!?") or body.endswith("."):
        return False
    if any(ch.isdigit() for ch in body):
        return False
    capitalised = sum(
        1
        for word in words
        if word[0].isupper() or word.lower() in _TITLE_WORDS
    )
    return capitalised == len(words)


def _role_for(
    body: str,
    marker: str,
    *,
    is_first: bool,
    is_second: bool,
    seen_heading: bool,
) -> tuple[str, bool]:
    """Role of one line. `seen_heading` travels because the header block
    (name + contact) only counts before the first section heading."""
    if is_first and not _is_contact(body) and len(body) <= 80:
        return "name", seen_heading
    if is_second and not seen_heading and _is_contact(body):
        return "contact", seen_heading
    if marker:
        return "bullet", seen_heading
    if _is_heading(body):
        return "heading", True
    if split_label(body):
        return "label", seen_heading
    if _SUBTITLE.search(body) and len(body) <= 140:
        return "subtitle", seen_heading
    if _is_title(body):
        return "title", seen_heading
    return "body", seen_heading


def classify(text: str) -> list[str]:
    """One role per line of `text` — the renderer's only source of structure."""
    lines = text.split("\n")
    content = [i for i, line in enumerate(lines) if line.strip()]
    first = content[0] if content else -1
    second = content[1] if len(content) > 1 else -1
    roles: list[str] = []
    seen_heading = False

    for index, raw in enumerate(lines):
        marker, body = split_bullet(raw.strip())
        body = body.strip()
        if not body:
            roles.append("blank")
            continue
        role, seen_heading = _role_for(
            body,
            marker,
            is_first=index == first,
            is_second=index == second,
            seen_heading=seen_heading,
        )
        roles.append(role)

    return roles


# -------------------------------------------------------- fonts and constants

_FAMILIES = {
    "Helvetica": ("Helvetica", "Helvetica-Bold", "Helvetica-Oblique"),
    "Times": ("Times-Roman", "Times-Bold", "Times-Italic"),
    "Courier": ("Courier", "Courier-Bold", "Courier-Oblique"),
}


def _family_of(font_name: str) -> str:
    base = (font_name or "").split("+")[-1]
    base = re.split(r"[-,]", base)[0]
    lowered = base.lower()
    if "times" in lowered:
        return "Times"
    if "serif" in lowered and "sans" not in lowered:
        return "Times"
    if "courier" in lowered or "mono" in lowered:
        return "Courier"
    return "Helvetica"


def _clamp(role: str, value: float) -> float:
    low, high = _LIMITS.get(role, (6.0, 40.0))
    return round(min(max(value, low), high), 1)


# ------------------------------------------------------------- profile: PDF

def _pdf_rows(page) -> list[list[dict]]:
    """Characters grouped into visual rows, top to bottom."""
    rows: dict[float, list[dict]] = {}
    for char in page.chars:
        rows.setdefault(round(char["top"], 1), []).append(char)
    return [sorted(rows[top], key=lambda c: c["x0"]) for top in sorted(rows)]


def _profile_pdf(data: bytes) -> dict:
    import pdfplumber

    with pdfplumber.open(io.BytesIO(data)) as pdf:
        page = pdf.pages[0]
        if not page.chars:
            return {}
        width, height = float(page.width), float(page.height)
        left = min(char["x0"] for char in page.chars)
        right = width - max(char["x1"] for char in page.chars)
        top = min(char["top"] for char in page.chars)

        sizes: dict[str, list[float]] = {role: [] for role in _ROLES}
        body_tops: list[float] = []
        bullet_indents: list[float] = []
        fonts: dict[str, int] = {}

        seen_heading = False
        for index, row in enumerate(_pdf_rows(page)):
            row_text = "".join(char["text"] for char in row).strip()
            if not row_text:
                continue
            marker, body = split_bullet(row_text)
            # Row position, not a one-line re-classification: the first row is
            # the name, the second the contact line — otherwise every row would
            # be measured as if it were the top of the page.
            role, seen_heading = _role_for(
                body.strip(),
                marker,
                is_first=index == 0,
                is_second=index == 1,
                seen_heading=seen_heading,
            )
            size = max(char["size"] for char in row)
            if role in sizes:
                sizes[role].append(size)
            if role == "body":
                body_tops.append(min(char["top"] for char in row))
            if role == "bullet":
                xs = sorted({round(char["x0"], 1) for char in row})
                gaps = [(b - a, b) for a, b in zip(xs, xs[1:])]
                if gaps:
                    bullet_indents.append(max(gaps)[1] - left)
            for char in row:
                name = char["fontname"].split("+")[-1]
                fonts[name] = fonts.get(name, 0) + 1

        measured = {
            role: statistics.median(values)
            for role, values in sizes.items()
            if values and role not in ("blank",)
        }

        lead = TEMPLATE["leading"]["body"]
        if len(body_tops) > 1:
            steps = [b - a for a, b in zip(body_tops, body_tops[1:]) if 0 < b - a < 40]
            if steps:
                lead = statistics.median(steps)

        rules = [
            line
            for line in page.lines
            if (line["x1"] - line["x0"]) > 0.5 * (width - left - right)
        ]
        thickness = statistics.median(line.get("linewidth", 0.8) for line in rules) if rules else 0.0

        family = _family_of(
            max(fonts, key=fonts.get) if fonts else TEMPLATE["font"]["family"]
        )
        normal, bold, italic = _FAMILIES[family]
        # Body text is the small stuff by volume; if the most common face came
        # back as the bold cut, name the normal one anyway.
        if "bold" in normal.lower():
            normal = _FAMILIES[family][0]

        profile = {
            "source": "pdf",
            "page": {"width": round(width, 1), "height": round(height, 1)},
            "margin": {
                "top": round(max(top - 5.0, 0.0), 1),
                "bottom": TEMPLATE["margin"]["bottom"],
                "left": round(left, 1),
                "right": round(right, 1),
            },
            "font": {"family": normal, "bold": bold, "italic": italic},
            "size": {
                role: _clamp(role, measured.get(role, TEMPLATE["size"][role]))
                for role in TEMPLATE["size"]
            },
            "leading": {
                **TEMPLATE["leading"],
                "body": round(min(max(lead, 8.0), 24.0), 1),
                "rule": round(min(max(thickness, 0.0), 2.5), 2),
            },
        }
        if bullet_indents:
            profile["bullet"] = {
                **TEMPLATE["bullet"],
                "indent": round(min(max(statistics.median(bullet_indents), 4.0), 36.0), 1),
            }
        return profile


# ------------------------------------------------------------ profile: DOCX

def _profile_docx(data: bytes) -> dict:
    from docx import Document
    from docx.shared import Pt

    document = Document(io.BytesIO(data))
    section = document.sections[0]
    normal = document.styles["Normal"].font

    def points(value, fallback: float) -> float:
        try:
            return round(value.pt, 1)
        except AttributeError:
            return fallback

    return {
        "source": "docx",
        "page": {
            "width": points(section.page_width, TEMPLATE["page"]["width"]),
            "height": points(section.page_height, TEMPLATE["page"]["height"]),
        },
        "margin": {
            "top": points(section.top_margin, TEMPLATE["margin"]["top"]),
            "bottom": points(section.bottom_margin, TEMPLATE["margin"]["bottom"]),
            "left": points(section.left_margin, TEMPLATE["margin"]["left"]),
            "right": points(section.right_margin, TEMPLATE["margin"]["right"]),
        },
        "size": {
            **TEMPLATE["size"],
            "body": _clamp("body", points(normal.size, TEMPLATE["size"]["body"])),
        },
    }


# ------------------------------------------------------------------- assembly

def profile(data: bytes | None, extension: str, text: str) -> dict:
    """Measure the uploaded resume; never raise — fall back to `TEMPLATE`."""
    ext = (extension or "").lower()
    measured: dict = {}
    if data:
        try:
            if ext == ".pdf":
                measured = _profile_pdf(data)
            elif ext == ".docx":
                measured = _profile_docx(data)
        except Exception:  # unreadable geometry → the template still renders
            measured = {}
    return resolved(measured, text)


# ------------------------------------------------------------------ sanitising
#
# `resolved()` is the trust boundary for `POST /api/rewrite/export` and
# `POST /api/report/export`: the client echoes back the profile it stored, so
# the JSON is attacker-controlled. The renderers assume real numbers and known
# font names, so a crafted payload (a string width, a 1e9-pt page, a 9-float
# colour) would otherwise crash the route — or make reportlab allocate an absurd
# document. Everything numeric is therefore clamped to a sane range and every
# non-finite/invalid value falls back to the template default.

_NUMBER = (int, float)

_PAGE_LIMITS = (100.0, 3000.0)         # points; US Letter is 612 × 792
_LEADING_LIMITS = {
    "body": (6.0, 30.0),
    "heading_before": (0.0, 60.0),
    "heading_rule": (6.0, 40.0),
    "rule_after": (0.0, 60.0),
    "rule": (0.0, 6.0),
}
_BULLET_CHAR = 3                        # widest glyph run we will render


def _finite(value) -> bool:
    """True for a real, finite number — never a bool, string or NaN/inf."""
    return (
        isinstance(value, _NUMBER)
        and not isinstance(value, bool)
        and math.isfinite(value)
    )


def _number(value, fallback: float, low: float, high: float) -> float:
    """Clamp `value` into `[low, high]`, or return the template default."""
    if not _finite(value):
        return float(fallback)
    return round(min(max(float(value), low), high), 1)


def _size(role: str, value) -> float:
    low, high = _LIMITS.get(role, (6.0, 40.0))
    return _number(value, TEMPLATE["size"].get(role, 10.0), low, high)


def _rgb(value, fallback: list[float]) -> list[float]:
    """A 3-channel colour, each channel in 0–1 (reportlab.Color needs three)."""
    if not isinstance(value, (list, tuple)) or len(value) != 3:
        return list(fallback)
    return [
        round(min(max(float(c), 0.0), 1.0), 3) if _finite(c) else d
        for c, d in zip(value, fallback)
    ]


def _font(value, family: str) -> dict:
    """Keep only real base-14 cuts within the chosen family.

    reportlab raises `ValueError` on an unknown `fontName`, and the PDF path is
    where an unhandled one would 500 the route; any unrecognised cut is replaced
    by the family's own.
    """
    if not isinstance(value, dict):
        value = {}
    normal, bold, italic = _FAMILIES[family]
    aliases = {
        normal: normal,
        bold: bold,
        italic: italic,
        "Helvetica": normal,
        "Helvetica-Bold": bold,
        "Helvetica-Oblique": italic,
        "Times-Roman": normal,
        "Times-Bold": bold,
        "Times-Italic": italic,
        "Courier": normal,
        "Courier-Bold": bold,
        "Courier-Oblique": italic,
    }
    return {
        "family": normal,
        "bold": aliases.get(str(value.get("bold")), bold),
        "italic": aliases.get(str(value.get("italic")), italic),
    }


def resolved(layout: dict | None, text: str) -> dict:
    """Merge a (possibly partial, client-supplied) profile over `TEMPLATE`.

    Every nested block is filled key by key, so an export request carrying an
    older or truncated profile still renders. Because this runs on client input,
    every numeric leaf is clamped and every enum is checked (see the sanitising
    block above) — a hand-edited or hostile payload must neither crash the
    renderer nor shift the styles. `roles` is recomputed whenever it does not
    line up with the text for the same reason.
    """
    layout = layout if isinstance(layout, dict) else {}
    merged = {**TEMPLATE, **{k: v for k, v in layout.items() if v is not None}}

    page = layout.get("page") if isinstance(layout.get("page"), dict) else {}
    merged["page"] = {
        "width": _number(page.get("width"), TEMPLATE["page"]["width"], *_PAGE_LIMITS),
        "height": _number(page.get("height"), TEMPLATE["page"]["height"], *_PAGE_LIMITS),
    }
    # A margin wider than half the page would make a negative frame and crash
    # reportlab, so clamp each side against the smaller page dimension.
    margin_cap = min(merged["page"]["width"], merged["page"]["height"]) / 2
    margin = layout.get("margin") if isinstance(layout.get("margin"), dict) else {}
    merged["margin"] = {
        side: _number(margin.get(side), TEMPLATE["margin"][side], 0.0, margin_cap)
        for side in ("top", "bottom", "left", "right")
    }
    # Even clamped, a tiny page with template-era margins leaves reportlab a
    # frame with no room for content (LayoutError → 500). If the usable area is
    # not positive, the measured page is not usable at all: use the template.
    frame_w = merged["page"]["width"] - merged["margin"]["left"] - merged["margin"]["right"]
    frame_h = merged["page"]["height"] - merged["margin"]["top"] - merged["margin"]["bottom"]
    if frame_w < 36 or frame_h < 36 or not (_finite(frame_w) and _finite(frame_h)):
        merged["page"] = dict(TEMPLATE["page"])
        merged["margin"] = dict(TEMPLATE["margin"])

    font = layout.get("font")
    family = _family_of(
        str(font.get("family", "")) if isinstance(font, dict) else ""
    )
    merged["font"] = _font(font, family)

    size = layout.get("size") if isinstance(layout.get("size"), dict) else {}
    merged["size"] = {role: _size(role, size.get(role)) for role in TEMPLATE["size"]}

    leading = layout.get("leading") if isinstance(layout.get("leading"), dict) else {}
    merged["leading"] = {
        key: _number(leading.get(key), TEMPLATE["leading"][key], *_LEADING_LIMITS[key])
        for key in TEMPLATE["leading"]
    }

    color = layout.get("color") if isinstance(layout.get("color"), dict) else {}
    merged["color"] = {
        "text": _rgb(color.get("text"), TEMPLATE["color"]["text"]),
        "muted": _rgb(color.get("muted"), TEMPLATE["color"]["muted"]),
    }

    bullet = layout.get("bullet") if isinstance(layout.get("bullet"), dict) else {}
    char = str(bullet.get("char", TEMPLATE["bullet"]["char"]))
    merged["bullet"] = {
        # Keep the template glyph when the client sends gibberish rather than
        # rendering a multi-line bullet marker.
        "char": char if char.strip() and len(char) <= _BULLET_CHAR else TEMPLATE["bullet"]["char"],
        "indent": _number(bullet.get("indent"), TEMPLATE["bullet"]["indent"], 0.0, 72.0),
    }

    lines = text.split("\n")
    roles = layout.get("roles")
    if (
        not isinstance(roles, list)
        or len(roles) != len(lines)
        or any(role not in _ROLES for role in roles)
    ):
        roles = classify(text)
    merged["roles"] = roles
    return merged
