# Image Generation Prompts — UI Comps

Generate these with **ChatGPT / DALL·E**. For each entry: copy the prompt, generate at the listed size, and save into **`comps/`** using the **exact filename**.

Tips:
- Comps are for *direction* (layout, color, mood) — AI-rendered text will garble slightly; that's fine. Keep the quoted headlines so the vibe lands.
- Variations: save as `01-landing-v2.png`, `-v3`, etc., until you like one.
- If the tool only offers square, generate at 1024×1024 and note it — we'll adapt the layout in code.

---

## 01 — Landing page
**File:** `comps/01-landing.png` · **Size:** 1792×1024 (landscape)

```
High-fidelity UI design comp of a web app landing page, desktop screenshot, editorial paper-and-dossier aesthetic. Warm off-white paper background with subtle paper grain, ink-black serif display headline reading "Know exactly what your resume is missing.", small typewriter-style uppercase eyebrow label above it reading "RESUME → JOB DESCRIPTION GAP ANALYZER", clean sans-serif subhead, one dark ink-black primary button with red pen underline accent reading "Analyze my resume". On the right side, a floating white report sheet held by a paperclip showing a circular rubber-stamp match score reading "72%", a few keyword chips with yellow highlighter swipe behind them, and red pen correction marks in the margin. Hairline rules, generous whitespace, small-caps labels, one red and one green rubber stamp detail. Flat UI mockup, crisp vector look, no photorealism, muted warm palette of cream black red and mustard yellow.
```

---

## 02 — Upload / paste screen
**File:** `comps/02-upload.png` · **Size:** 1792×1024 (landscape)

```
High-fidelity UI design comp of a web app tool screen, desktop screenshot, editorial paper-and-dossier aesthetic. Warm off-white paper background. Top: typewriter-style step indicator reading "01 UPLOAD — 02 ANALYZE — 03 REPORT" with the first step underlined in red pen. Main area split into two white paper sheets side by side: left sheet is a dashed-border dropzone labeled "YOUR RESUME" with a paperclip icon and a PDF file chip, manila-tinted fill; right sheet is a textarea with faint ruled notebook lines labeled "JOB DESCRIPTION" containing a few lines of placeholder job text. Below center, one dark ink-black button reading "ANALYZE THE GAP" in uppercase mono letters. Hairline borders, subtle paper grain, flat UI mockup, crisp vector look, palette of cream black red and mustard yellow only.
```

---

## 03 — Analyzing / loading state
**File:** `comps/03-analyzing.png` · **Size:** 1792×1024 (landscape)

```
High-fidelity UI design comp of a web app loading state, desktop screenshot, editorial paper-and-dossier aesthetic. Centered white sheet on warm off-white paper background. On the sheet, a checklist being drawn: three rows reading "EXTRACTING TEXT", "FINDING SKILLS", "SCORING MATCH" in uppercase typewriter font, first two rows marked with hand-drawn red pen checkmarks, third row with a hairline progress bar half filled in black ink. A red pen illustration lies diagonally across the corner of the sheet. Step indicator at top with second step active. Minimal, calm, no spinners, no gradients. Flat UI mockup, crisp vector look, palette of cream black and red only.
```

---

## 04 — Results overview
**File:** `comps/04-results-overview.png` · **Size:** 1792×1024 (landscape)

```
High-fidelity UI design comp of a results dashboard, desktop screenshot, editorial paper-and-dossier aesthetic. Warm off-white paper background with faint paper grain. Large circular rubber-stamp graphic on the left reading "68% MATCH" in distressed red stamp lettering. Right side: three horizontal category bars labeled "TECHNICAL", "TOOLS", "SOFT SKILLS" with black ink fills at different lengths on hairline tracks and mono percentage labels. Below: two white paper sheets — one titled "MATCHED" with keyword chips carrying yellow highlighter swipes, another titled "MISSING" with keyword chips struck through in red pen. Small uppercase mono labels throughout, hairline rules, one green APPROVED stamp accent. Flat UI mockup, crisp vector look, palette of cream black red mustard yellow and a touch of forest green.
```

---

## 05 — Gap report detail
**File:** `comps/05-gap-report.png` · **Size:** 1792×1024 (landscape)

```
High-fidelity UI design comp of a detailed report page, desktop screenshot, editorial paper-and-dossier aesthetic. Warm off-white paper background. Left column titled "MISSING SKILLS" in serif, each item styled like a red pen margin correction with blue numbered annotation circles and red underline scribbles. Right column: a suggestion card looking like a margin note, blue annotation number, text reading "Add a bullet mentioning CI/CD — the posting emphasizes it 3 times", red pen accent line. Below, a side-by-side diff row: left box labeled "ORIGINAL" with plain text bullet, right box labeled "SUGGESTED" with the rewritten bullet carrying a yellow highlighter swipe and a small green stamp. One dark button reading "DOWNLOAD REPORT". Flat UI mockup, crisp vector look, palette of cream black red blue mustard yellow and forest green.
```

---

## 06 — Mobile results
**File:** `comps/06-mobile-results.png` · **Size:** 1024×1792 (portrait)

```
High-fidelity UI design comp of a mobile app results screen, portrait smartphone screenshot, editorial paper-and-dossier aesthetic. Warm off-white paper background. Top bar with small serif logo and step indicator. Center: large circular rubber stamp reading "68% MATCH" in red distressed lettering. Stacked below: category bars for TECHNICAL, TOOLS, SOFT SKILLS with black ink fills; a white sheet titled "MISSING SKILLS" with red struck-through keyword chips; a margin-note suggestion card with blue annotation number. Bottom sticky dark button reading "DOWNLOAD REPORT". Generous spacing, large touch targets, hairline rules, paper grain. Flat UI mockup, crisp vector look, palette of cream black red mustard yellow.
```

---

## Optional (non-blocking)

### 07 — Social share / OG image
**File:** `comps/07-og-image.png` · **Size:** 1792×1024 (crop to 1200×630 later)

```
Wide social share card design, editorial paper-and-dossier aesthetic. Warm off-white paper background with grain. Large serif headline reading "Your resume, marked up." with a red pen underline, small mono subtext reading "RESUME → JOB GAP ANALYZER", and on the right a small report sheet with a "72% MATCH" rubber stamp and yellow highlighted keywords. Flat vector style, palette of cream black red and mustard yellow, lots of whitespace.
```

### 08 — Empty state
**File:** `comps/08-empty-state.png` · **Size:** 1024×1024

```
Empty state illustration for a web app, editorial paper aesthetic. A blank white sheet of paper with faint pencil-drawn empty checklist rows and a red pen resting on it, warm off-white background with paper grain, one small dashed drop area. Minimal, calm, flat vector illustration, palette of cream black and red only.
```

---

## Folder convention

```
comps/            ← put generated images here (exact filenames above)
  01-landing.png
  02-upload.png
  03-analyzing.png
  04-results-overview.png
  05-gap-report.png
  06-mobile-results.png
  07-og-image.png        (optional)
  08-empty-state.png     (optional)
```

Once the comps are in, we extract final token values into `DESIGN_SYSTEM.md` and start building component-first.
