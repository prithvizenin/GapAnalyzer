# Design System — Resume-to-Job Description Gap Analyzer

> **Workflow: comp-first.** We generate AI image comps of every screen first (see `PROMPTS.md`), agree on the visual world from those images, then extract tokens and build components in code to match the comps. The comps are the source of truth for *look*; this document is the source of truth for *rules*.
>
> **Status:** ✅ all 8 comps generated and reviewed (v1 direction approved). Token values and copy below are extracted from them. **Product name: `GapAnalyzer`** (mobile comp's "ResumeLens" discarded; name unification overrides any comp label).

---

## 1. Visual Direction: "Marked-Up Dossier"

The product compares two documents and marks up the gaps — so the interface **is** a marked-up document. Warm paper, black ink, red correction pen, yellow highlighter, rubber stamps. It should feel like a career counselor went over your resume with a pen, not like a generic SaaS dashboard.

**Mood words:** paper, ink, margin notes, handwritten red annotations, distressed rubber stamps, highlighter, hairline rules, typewritten labels, ruled notebook paper with a red margin line.

**Anti-goals:** purple/blue SaaS gradients, glassmorphism, neon dark mode, emoji icons, generic card grids with rainbow chips.

---

## 2. Comps-First Workflow

1. Generate images from `PROMPTS.md` (ChatGPT/DALL·E) and drop them into `comps/` with the exact filenames listed.
2. Review comps side-by-side; regenerate variations with a `-v2`, `-v3` suffix until the direction clicks.
3. Extract the concrete values from the chosen comps into the tokens below (colors actually used, type sizes, spacing rhythm).
4. Build components in code to match the comps — component-first: every comp element must map to a reusable component, no one-off styling.
5. Final check: screenshot each built page next to its comp; fix drift in one batch.

**Comps reviewed — conflicts resolved in favor of the product screens (04/05/06):**

- **Name:** `GapAnalyzer` everywhere (01) — 06's "ResumeLens" ignored.
- **Score stamp:** always the distressed **red** circular stamp (evidence: 68% red in 04/06, 72% red in 07). Green is for status badges only; 01's green score circle is a v1 inconsistency.
- **Chip semantics:** yellow highlight = *matched*, red outline + strikethrough = *missing* (04/06 govern). 01's hero sheet labels yellow chips as "missing" — decorative AI slip; ignore in build.
- **Mono voice:** comps read typewriter — IBM Plex Mono with `0.08em` tracking delivers it; no Courier swap needed.

---

## 3. Tokens

### 3.1 Color

| Token | Hex | Role |
|---|---|---|
| `--paper` | `#F6F1E7` | App background (warm off-white) |
| `--paper-raised` | `#FFFDF7` | Cards, sheets, inputs |
| `--ink` | `#1C1A17` | Primary text, primary buttons |
| `--ink-soft` | `#4A463F` | Secondary text |
| `--graphite` | `#8A857B` | Placeholders, disabled, meta labels |
| `--rule` | `#E3DCCB` | Hairlines, borders, dividers |
| `--manila` | `#EADFC4` | Tinted panels, sidebar, dropzones |
| `--pen-red` | `#C43D2E` | Missing skills, corrections, errors — **only for gaps** |
| `--ink-blue` | `#2F5DA8` | Links, annotation numbers |
| `--highlight` | `#F6E27A` | Matched keywords (literal highlighter) |
| `--stamp-green` | `#2E6B4F` | Status badges only (APPROVED / IMPROVED / ON TRACK) — never the score stamp |
| `--focus` | `#C43D2E` | Focus rings (red pen) |

**Rules:** red means *gap/missing* and nothing else; yellow means *matched keyword*; green means *confirmed match*. Keep AA contrast (≥4.5:1 for body text) — `--pen-red` on `--paper` is for large/bold text, icons, and borders; pair it with a text label, never color alone.

**Dark mode (theme toggle, §4 #23):** the `dark` class on `<html>` **re-points the same token names** — components never branch on theme. Values live in `globals.css` (`html.dark` block, unlayered so it beats `@theme`'s `:root`); every dark value is checked ≥4.5:1 on dark `--paper`:

| Token | Dark value | Note |
|---|---|---|
| `--paper` | `#191612` | warm near-black desk — same warmth as the light paper |
| `--paper-raised` | `#221E18` | sheets stay lifted |
| `--ink` | `#F2EDE3` | inverted warm off-white |
| `--ink-soft` | `#C9C2B4` | secondary text |
| `--graphite` | `#948D82` | placeholders/meta, lightened for AA |
| `--rule` | `#3A3429` | hairlines still read |
| `--manila` | `#2C2619` | tinted panels / dropzone |
| `--pen-red` | `#E86B5E` | red pen lightened for AA — **still gaps only** |
| `--ink-blue` | `#82AEEF` | links, annotation numbers |
| `--stamp-green` | `#63B58A` | status badges only |
| `--highlight` | *(unchanged `#F6E27A`)* | the highlighter stays lit in both themes |
| `--shadow-paper` | black-based paper lift | shadows read on dark paper |
| `--on-highlight` | `#1C1A17` — **both themes, never flips** *(new token)* | text **on** the yellow: matched SkillChip, diff `mark`, FileChip label + size + `×`. Yellow always carries dark ink |

First visit follows `prefers-color-scheme`; an explicit toggle persists in `localStorage["theme"]`; an inline boot script in `layout.tsx` applies it pre-paint (no flash). `color-scheme` flips with the theme so scrollbars/native controls follow.

### 3.2 Typography

| Role | Font | Weights | Use |
|---|---|---|---|
| Display | **Instrument Serif** | 400 (± italic) | H1/h2, big score numbers, section titles |
| Body | **Inter** | 400 / 500 / 600 | UI text, labels, buttons, lists |
| Mono | **IBM Plex Mono** | 400 / 500 | Small-caps labels, keywords, data, stamps |
| Hand | **Caveat** | 500 / 600 | Red handwritten margin notes — sparingly, max 1–2 per screen |

All four are free on Google Fonts. Serif headings are high-contrast Didone-style as seen in comps — Instrument Serif matches; do not swap.

**Type scale (px / line-height):** 12/16 · 14/20 · 16/24 · 18/28 · 24/32 · 32/40 · 48/52 · 64/64.
**Signature detail:** mono uppercase labels with wide letter-spacing (`0.08em`) for eyebrows, step indicators, and table headers — the "typed form field" look.

### 3.3 Spacing, Radius, Elevation

- **Spacing scale (4-based):** 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96. Page gutters: 24 mobile / 48 desktop. Max content width: 1120px.
- **Radius:** `3px` sheets & buttons (paper is sharp) · `6px` inputs · `999px` keyword chips only.
- **Borders:** 1px `--rule` hairlines everywhere; 2px `--ink` for emphasis frames.
- **Elevation (paper lift):** `0 1px 2px rgba(28,26,23,.06), 0 8px 24px rgba(28,26,23,.08)`. Sheets may sit at a ±0.5° rotation for a "stacked papers" feel — never on forms or tables.
- **Texture:** subtle paper grain overlay at ≤4% opacity, on `--paper` only.

### 3.4 Iconography & Motifs

- Stroke icons, 1.5px, `currentColor`, 20px grid (Lucide-style) — no filled/emoji icons.
- Recurring motifs: rubber-stamp circles, red-pen underlines/scribbles (SVG), highlighter swipe behind text, paperclip on upload sheets, hairline margin rules.

### 3.5 Motion

**Thesis: the dossier marks itself up.** Motion gives feedback, carries you between states, or performs the one moment a screen has earned — nothing moves "because it can". Only `transform` / `opacity` / `clip-path` / `stroke-dashoffset` / background-size (the highlighter) — never layout properties (the progress bar's width is the one exception: it *is* a measurement).

**Budget:** feedback 120–180ms · entrances 320–480ms · one authored sequence per screen ≤ ~1s total. Arrivals `ease: "expo.out"` (GSAP's match for `cubic-bezier(0.16, 1, 0.3, 1)` — confident deceleration, no bounce), exits 150ms. Sibling stagger ≤60ms/item.

**Engine: GSAP** (`gsap` + `ScrollTrigger`, registered in `src/lib/motion.ts`) owns every authored animation — entrances, staggers, draws, swipes, stamps, sequences. CSS transitions remain **only for hover / press / focus micro-feedback**. Every tween is gated by `gsap.matchMedia("(prefers-reduced-motion: no-preference)")` — reduced motion gets the natural, fully visible state (the CSS guard in `globals.css` still covers CSS transitions).

**Scroll reveals (every screen):** content blocks reveal once when they enter (`ScrollTrigger`, `start: "top 88%"`, play once, never reversed). Above-the-fold blocks fire on load — that *is* the mount entrance.

**Focal sequence (results, screen 04):** score stamp settles → category bars ink-fill left→right (staggered) → sheets rise → chips swipe in (matched = highlighter sweep, missing = rise) → verdict stamp lands. The report marks itself up on load — the sequence timeline starts when its section enters view.

- **Landing:** hero copy rises once, report sheet lands (rise + straighten); StepsBand and FeatureRow reveal on scroll.
- **Highlighter swipe:** matched-chip yellow paints left→right via `backgroundSize` tween (text stays visible, like a real marker); same swipe on the diff's added phrase.
- **Red pen draw:** `strokeDashoffset` draw-in on checklist checks, the active-step underline, and annotation scribbles.
- **Stamps:** score keeps its settle; status stamps scale 1.25→1 land (animated via `scale` so each stamp's rotation survives).
- **Feedback:** buttons press 1px (stamp feel), dropzone lifts on drag, file chip pops in, CTA arrows slide on hover, errors rise into their slot — CSS transitions.
- **In-page state changes** (form → analyzing) use the same entrance, shorter.
- **Theme swap:** toggling #23 **opens the new palette from the switch** — a radial reveal, ink spreading across the paper. `ThemeToggle` writes `--theme-origin-x/y` (button centre) and `--theme-origin-r` (farthest viewport corner), then flips `dark` inside `document.startViewTransition`; CSS animates `::view-transition-new(root)`'s `clip-path` `circle(0)` → `circle(r)` at **420ms `cubic-bezier(0.16, 1, 0.3, 1)`** (the project's `expo.out`) while the old snapshot holds still (`::view-transition-old(root) { animation: none }`). One composited animation replaces hundreds of per-element colour tweens, so nothing wobbles through grey and long pages stay cheap. A second click is ignored while a reveal is in flight. **Fallback** (no View Transitions — Safari/Firefox today): the earlier per-element crossfade, shortened to **220ms ease-out** via a temporary `html.theme-anim` class (forced reflow before the flip, removed ~280ms after; `!important` only during the swap). Both paths are gated by `prefers-reduced-motion: no-preference` — reduced motion swaps instantly with neither. Never transitions `opacity`/`transform`/`background-size` — those belong to GSAP.

Rebuild note: GSAP `from`/`fromTo` tweens assume elements sit at their natural (visible) CSS state — never hide content with CSS; the animation lives entirely in the tween.

---

## 4. Components (comp-first inventory)

Each component must exist before a screen uses it. Comp = the look, this = the contract.

| # | Component | Spec extracted from comps |
|---|---|---|
| 1 | **Button** | primary (ink fill, paper text, mono uppercase, letterspaced) e.g. `ANALYZE THE GAP`, `DOWNLOAD REPORT ⬇`, `Get Started →` · secondary (hairline outline) · disabled = graphite fill + not-allowed cursor (upload CTA until file + JD present) · height 44–48px, radius 3px. Landing hero CTA gets the red scribble underline |
| 2 | **Input / Textarea** | paper-raised fill, 1px rule border, focus = 2px pen-red ring. JD textarea = ruled notebook lines + red vertical margin line (confirmed in 02), mono text inside. Rule lines are a **warm light hairline** (`--rule`-toned, pixel-sampled `#e1dcd0` in mockup 02) — never a grey line, or the field reads as a bordered table |
| 3 | **Dropzone** | manila fill, dashed border, paperclip icon centered (small, ~28–36px), copy "Drag and drop your resume here or click to upload" — mobile comp shortens to "Tap to upload a PDF, DOCX or TXT"; red **dashed** border on file-type error. Short in mockup 02/07: the picked `FileChip` and the red error line render **below** the zone, in the owning sheet, not inside it |
| 4 | **FileChip** | yellow highlight-tinted chip, sharp 3px radius (mockup 02/07): red mono file-type tag (`PDF` / `DOCX` / `TXT`) + `resume.pdf · 245 KB` on one line + `×` remove. All text sits on the yellow → `--on-highlight` / `--graphite`, never `ink` (§3.1) |
| 5 | **Sheet/Card** | paper-raised, hairline border, paper-lift shadow, paperclip on titled sheets (MATCHED/MISSING/SUGGESTION in 04/05), optional ±0.5° rotation. Unit of every screen |
| 6 | **StampScore** | distressed **red** circular stamp, **hand-drawn double ring** (outer path wobbles, as a real stamp does), no star accents (UI mockups 01/04/06): the score in the display serif + `MATCH` in mono beneath it. Color always red regardless of score (number carries meaning, not hue) |
| 7 | **StatusStamp** | rotated bordered stamps for status only: `GOOD MATCH` / `ON TRACK` / `NEEDS WORK` (red), `APPROVED` / `IMPROVED` (green). ±6° rotation, 2px border, mono caps. On 04 the MISSING-sheet stamp is **score-driven**: `APPROVED` (green) at match ≥ 70%, `NEEDS WORK` (red) below |
| 8 | **SkillChip** | mono uppercase **rounded pills** (mockups 01/02/04/06). matched = highlight-yellow fill + `--on-highlight` text (dark ink on yellow in *both* themes, §3.1); missing = transparent + 1px red border + red strikethrough. **Semantic match** (weeks 8–9): same yellow + a dotted `--on-highlight` underline (`semantic` prop), with the `≈ MATCHED BY MEANING` legend under the results chip row. **Categorized** (weeks 10–11): on `/results` both chip sets are grouped under their dictionary category — headings `TECHNICAL` / `TOOLS` / `SOFT SKILLS` (the §6 bar labels), 10px mono graphite, `h3`, fixed order technical → tools → soft; a category with no chips is omitted entirely |
| 9 | **CategoryBar** | label and % share **one baseline row** (mono label left, mono % right), with a thin 5–6px track below and an ink fill; values 0–100 (04: Technical 80 / Tools 60 / Soft skills 45) |
| 10 | **AnnotationItem** | blue circled hand-number + red-scribble-underlined term + 1–2 line why-description (05's MISSING SKILLS list) |
| 11 | **SuggestionCard** | sheet with paperclip, blue circled number, red vertical rule at left margin, body copy, red double-underline flourish. `meta` (weeks 10–11) = right-aligned mono graphite category label (`TECHNICAL` / `TOOLS` / `SOFT SKILLS`) naming the category the suggestion closes; `/report` stacks **up to three** cards, one per gap category (user addition — comp 05 shows one) |
| 12 | **DiffRow** | `ORIGINAL` vs `SUGGESTED` boxes side-by-side (stacked mobile); suggested gets yellow highlight on the added phrase + green `IMPROVED` stamp |
| 13 | **StepIndicator** | *superseded by #27.* Kept in the tree but no screen renders it — the step row now lives in the nav (`Nav step`) |
| 14 | **Nav** | serif `GapAnalyzer` wordmark left, **no ™**. Marketing `/`: mono `HOW IT WORKS` link (mid-sem — pricing/FAQ deferred) + dark `Get Started →`. App screens (`<Nav step={n} />`, mockups 01/03/04/07/08): the marketing links are replaced on the right by the mono step row `01 UPLOAD — 02 ANALYZE — 03 REPORT`, active step inked with a red underline, the rest graphite; below `sm` only the active step shows. Wordmark extracted as **`NavWordmark`** |
| 15 | **Hero** | mono eyebrow rule, display H1 (final period), Inter sub, CTA + handwritten line; floating report Sheet right (italic display title, small score stamp, missing chips, one red-ruled suggestion) |
| 16 | **FeatureRow** | 4 columns split by hairlines: **no icons** (mockup 05) — mono caps title over a short line, hairline top rule |
| 17 | **HandwrittenNote** | Caveat, pen-red, rotated −3°…−6°, ≤1–2 per screen (e.g. "Focus here →", "First run can take a minute.") |
| 18 | **AnnotationNumber** | blue circled numeral used by #10/#11 |
| 19 | **MetaBar** | footer mono row with hairline above: `RESUME ANALYSIS REPORT · CANDIDATE ID: #4827 · DATE: APR 25, 2025` (from 04). *Not rendered in the 2026 mockups — results closes with a plain mono provenance line instead* |
| 20 | **ProgressBar** | hairline/inked track, ink fill, mono percentage. `pen` rides a **tilted pencil** at the fill's edge (analyzing screen, `upload_screen.pdf` p1 — pixel-measured): graphite point hanging *below* the bar so it stays visible against the ink fill, red capsule barrel with round caps, ferrule band behind the point. Desktop only — p2's phone bar is a plain fill. Decorative (`aria-hidden`), and the whole track is indented to the label column on the analyzing row |
| 21 | **EmptyState** | blank sheet + faint pencil checklist + red pen + dashed upload glyph (from 08) + one primary action |
| 22 | **Toast** | bottom-left paper slip, hairline border, red left-rule on error |
| 23 | **ThemeToggle** | fixed paper slip, **bottom-right, every screen** (user addition, not in comps): `paper-raised` fill, 1px `rule` border, paper-lift shadow, 44×44 (touch target), lucide `Moon` (in light → switches to dark) / `Sun` (in dark → switches to light) at 1.5 stroke, `ink-soft` → `ink` on hover. Flips `<html class="dark">` (tokens §3.1) with the §3.5 radial reveal, **started at the button** so the new palette sweeps outward from the switch; the two icons are stacked and quarter-turn into each other (`Moon` −90°/out, `Sun` +90°/in, 200ms, same ease — the only `dark:` utilities besides the §3.1 token repaint), and the slip presses to 0.94 on click. Persists `localStorage["theme"]`, first visit follows system. `aria-label`/`title`: `Switch to dark mode` / `Switch to light mode` |

| 25 | **ApiKeyDialog** | week 13, `/report` → `TAILOR MY RESUME →` (no comp — user addition): modal paper sheet over an ink wash (`--ink` at 45%, plain fill — **no** glass/blur, §1), paperclip + mono eyebrow `GEMINI API KEY`, serif title, one explanatory paragraph, the free-key process as `AnnotationNumber` steps 1–4 with the `aistudio.google.com/apikey` link beneath, then a mono input (`AIza…` placeholder, `paper-raised` fill + hairline border, auto-focused), the note that the key stays in this tab, primary `TAILOR MY RESUME` (disabled while empty), and two text actions `CANCEL` / `CONTINUE WITHOUT A KEY`. Escape and backdrop close it; focus lands in the field. The key lives in `sessionStorage["gemini_api_key"]` and travels per request as `api_key` — never localStorage, never stored server-side |

| 24 | **RewriteRow** | week 12, tailored-resume review (mockup 03/08): one reviewed resume line as two paper boxes sharing one hairline on `md+`, the revised half separated by the `--stamp-green` rule and its changed phrases painted with the highlighter (`hl-sweep`, `--on-highlight` text). Below `md` the halves stack, the revised box carrying a green top edge. Unchanged lines ("passes through verbatim") use a **dashed** muted box. Labels `ORIGINAL` / `REVISED` are 9.5px mono graphite (revised label in green). Presentational: the owning page reveals the sheet |

| 26 | **TailoringPanel** | week 13, `/rewrite` while `POST /api/rewrite` runs (no comp — user addition): a paper sheet holding a **glide band** of ruled-page thumbnails — four pages, one line marked with the §3.1 green rule — the set rendered twice and translated by half the track width on a 22s linear loop, both edges softened by a mask so pages glide in and out instead of popping; below the band a mono eyebrow `TAILORING`, the serif line `YOUR RESUME IS BEING TAILORED`, the current step in mono graphite, the hairline `ProgressBar` easing toward — never to — 92% (the response is the real finish line), and one line naming the wait. Wrapped in `role="status" aria-live="polite"`; reduced motion freezes the band on a static frame |

**Responsive rules:** two-column layouts collapse to single column < 768px; mobile (06/07/08) = stacked sheets + sticky full-width bottom CTA (one submit on `/upload`; a DOCX/PDF pair on `/rewrite`); app screens show the compact nav step row (active step only) below `sm`; all touch targets ≥44px.

| 28 | **NotFoundSheet** | the custom 404's evidence sheet (`custom404page.pdf` p1/p2 — a **landing-style** page, so `Nav` without `step` sits above it and no `PageShell` frame is used). One `Sheet` at **−1.4°** (the landing hero sheet's tilt) carrying: a `NOT FOUND` `StatusStamp` breaking the top-right corner (rotated ~12°, half outside the sheet's edge); eyebrow `REQUESTED PAGE`; the mistyped path as a **red-outlined pill with red strikethrough** (the §4 #8 "missing" language applied to a route) followed by the mono label `NOT FOUND`; then a **ruled slip** — dashed `--ink/50` border, `.ruled-paper` lines at a 30px rhythm, red margin rule at left — with the display-serif `404` in `--pen-red` set large and centred over the rules; then eyebrow `TRY ONE OF THESE INSTEAD` and a stacked route list (`/upload`, `/results`, `/compare`) — each row a mono route label over a hairline with a red arrow that slides on hover. Below the sheet, one `HandwrittenNote` `Typo? Probably.` (§4 #17, the screen's single red margin note). **Nothing is stored / nothing is lost** is stated in the left column's body line, never implied. Below `md` the sheet stacks above the copy and the two CTAs go full-width (p2) |

| 27 | **PageShell** | the shared app-screen frame (mockups 01/03/04/07/08): `<Nav step>` above, then one `max-w-[1120px]` measure with `px-6 md:px-12`, `pt-8 md:pt-12`, `pb-16 md:pb-20` (screens with a sticky mobile CTA add bottom padding). Exports **`PageTitle`** — sentence-case display serif, `34px` → `46px` at `md`, tight leading — and **`Eyebrow`** — 10/11px mono uppercase graphite caption used above sheets and beside titles. No in-body wordmark and no centred step row on app screens |

| 29 | **ScanSheet** | the analyzing screen's resume sheet (`upload_screen.pdf` p1/p2) — the document being read, not a results sheet. One `Sheet` at **−1.2°** with: header row `RESUME.PDF` (the uploaded filename, uppercase) left / `PAGE 1 OF 2` right in mono graphite (the page column is **desktop only**); then a **red margin rule** down the left of the excerpt, the real resume lines set in Inter with every dictionary keyword the JD cares about painted by the highlighter (`hl-sweep` + `--on-highlight`, §4 #8's matched language); then grey placeholder rules standing in for the rest of the page (desktop only); a hairline, and a footer row `MATCHED SO FAR` (mono graphite) with the count set in display serif red — `<b>7</b> of 22`, the numerals in `--pen-red`. Purely presentational: the page owns the counts and the excerpt. Below `md` the sheet shows a single flowing paragraph (the same highlighted runs, no per-line rules, no page column) per p2 |

---

## 5. Screen Inventory (mid-sem scope) — all comps ✅ delivered

| Screen | Comp | Core components used |
|---|---|---|
| Landing | `comps/01-landing.png` | Nav, Hero, Button, HandwrittenNote, report Sheet, StampScore, StatusStamp, FeatureRow |
| Upload / paste | mockups 02/07 | Nav `step={1}`, PageShell, Sheet ×2, Dropzone, FileChip, Textarea (ruled), Button, HandwrittenNote, sticky mobile CTA |
| Analyzing | `upload_screen.pdf` (p1 desktop, p2 phone) — supersedes `comps/03-analyzing.png` | Nav `step={2}` (`02 ANALYZE` inked), PageShell, `Eyebrow` + `PageTitle` (`Reading your resume against the posting.`), pen-checklist Sheet (ChecklistRows: `EXTRACTING TEXT` → `FINDING SKILLS` → `SCORING MATCH`), `ProgressBar` with `pen` (desktop only), Button (`CANCEL`, secondary) + `HandwrittenNote` (`First run can take a minute.`), and **`ScanSheet`** (§4 #29) on the right with `MATCHED SO FAR` — sticky bottom bar on phone |
| Results overview | mockups 01/04 | Nav `step={3}` (mockup 01 inks `03 REPORT` with a red underline — pixel-verified), PageShell, StampScore, CategoryBar, Sheet ×3, SkillChip (grouped by category — weeks 10–11, user addition, not in mockup), StatusStamp, Button ×2 (`VIEW GAP REPORT` → `/report`; `COMPARE OTHER POSTINGS` → `/compare`) |
| Gap report detail | `comps/05-gap-report.png` | Nav `step={3}`, PageShell, AnnotationItem, SuggestionCard, DiffRow, StatusStamp, Button, ApiKeyDialog |
| Tailored resume `/rewrite` | mockups 03/08 | Nav `step={3}`, PageShell, Sheet (**side-by-side review**), RewriteRow, SuggestionCard/GapDrafts sheet, Button ×2 (DOCX / PDF; sticky pair on mobile) |
| Compare postings `/compare` | *(no mockup — week 12 stretch)* | Nav `step={3}`, PageShell, Sheet ×3 (posting fields) + one Sheet per ranked posting, Textarea (ruled) ×3, Button, AnnotationNumber (rank), StampScore (sm), StatusStamp (`BEST MATCH`), CategoryBar ×3, SkillChip (matched + missing) |
| Mobile results | `comps/06-mobile-results.png` | (same set, stacked; sticky bottom CTA; compact top bar) |
| OG share image | `comps/07-og-image.png` | static asset — use as-is / crop to 1200×630 |
| Empty state | `comps/08-empty-state.png` | EmptyState + Dropzone glyph — optional build |
| 404 / page not found | `custom404page.pdf` (p1 desktop, p2 phone) | **Landing nav** (no step row) + `NavWordmark`, `StatusStamp` (`NOT FOUND`), `Sheet` (`NotFoundSheet`, §4 #28 — tilted, corner stamp, ruled 404 slip, route list), `Button` ×2 (`BACK TO HOME →` primary, `ANALYZE MY RESUME` secondary; full-width pair on mobile), `HandwrittenNote` (`Typo? Probably.`). Rendered by `app/not-found.tsx` for **every unmatched URL** (root-level convention — no `notFound()` calls exist, so this is only the 404) |

> **ThemeToggle (§4 #23)** sits fixed bottom-right on *all* screens — user addition, not in a comp (same precedent as NavWordmark above).

---

## 6. Copy Deck (extracted verbatim from comps)

Build with this exact copy — no need to re-invent during implementation.

**Landing**
- Eyebrow: `RESUME → JOB DESCRIPTION GAP ANALYZER`
- H1: `Know exactly what your resume is missing.`
- Sub: "Upload your resume and a job description. Get a clear, AI-powered gap analysis with your match score, missing skills, and actionable next steps — so you can apply with confidence and get hired faster."
- CTA: `Analyze my resume →` · HandwrittenNote: "Better matches. More interviews. Your next chapter."
- FeatureRow: `AI-POWERED ANALYSIS` / "Get precise, contextual feedback in seconds." · `DETAILED GAP REPORT` / "See what's missing, why it matters, and how to fix it." · `ACTIONABLE NEXT STEPS` / "Get tailored tips to close the gap and stand out." · `APPLY WITH CONFIDENCE` / "Build a resume that gets you interviews."
- Hero sheet (decorative): `GAP ANALYSIS REPORT` · `72% MATCH` · JOB TITLE "Senior Frontend Developer" · COMPANY "Acme Technologies" · `KEY MISSING SKILLS` chips (React, TypeScript, Next.js, Unit Testing, System Design, AWS) · `TOP RECOMMENDATIONS` 1–4 · `OVERALL ASSESSMENT` blurb · stamps `GOOD MATCH`, `ON TRACK` · handwritten "Focus here →", "Great foundation!"

**Steps:** `01 UPLOAD — 02 ANALYZE — 03 REPORT`

**Upload:** sheet titles `YOUR RESUME` / `JOB DESCRIPTION` · dropzone: "Drag and drop your resume here or click to upload" · file chip: `resume.pdf · 245 KB` · CTA: `ANALYZE THE GAP` (stays disabled until a resume file + JD text are both present) · JD placeholder: "We are looking for a Frontend Developer with strong React skills, experience in building responsive web applications, and a solid understanding of modern JavaScript, HTML, and CSS." · validation errors (red dashed border + mono alert under the dropzone): `Unsupported file type — PDF, DOCX, or TXT only.` / `File too large — 5 MB max.` (client cap 5 MB — backend must match) · API errors (wired flow) appear in that same red alert slot, shown verbatim from the response `detail`: `No extractable text found in the resume — scanned/image PDFs are not supported yet.` · `Job description is required.` · `Analysis pipeline failed.` · connection failure: `Couldn't reach the analyzer — is the backend running?`

**Analyzing (upload_screen.pdf p1/p2 — supersedes comp 03):** eyebrow `ANALYZING · STEP 3 OF 3` · H1 `Reading your resume against the posting.` · rows `EXTRACTING TEXT` / `FINDING SKILLS` / `SCORING MATCH` · sub-lines `1,204 WORDS READ` · `22 SKILLS TRACKED` · `COMPARING 22 SKILLS · ABOUT 20 SECONDS LEFT` (the count and the wait are both measured on screen — `POST /api/preview`, contract in `context.md` §9; the screen never invents a figure) · `CANCEL` (secondary; aborts the request and returns to the form) · handwritten `First run can take a minute.` · sheet: filename (uppercase) / `PAGE 1 OF 2` · footer `MATCHED SO FAR` + `<b>7</b> of 22` (display serif red).

Phone (`p2`) drops the desktop eyebrow's step row to the nav (`02 ANALYZE` inked), keeps the sheet, and pairs the note with `CANCEL` in a sticky bottom bar. It also differs in three measured ways: the sheet has **no page column** and joins its excerpt into **one flowing paragraph**; the `SCORING MATCH` sub-line is just `ABOUT 20 SECONDS LEFT` (the `COMPARING N SKILLS ·` prefix is desktop-only); and the bar carries **no pencil**.

**Results (sample data):** stamp `68% MATCH` · bars: `TECHNICAL 80%` / `TOOLS 60%` / `SOFT SKILLS 45%` · sheet `MATCHED — KEYWORDS FOUND IN BOTH`: JAVASCRIPT, REACT, HTML, CSS, API INTEGRATION, PROBLEM SOLVING, TEAMWORK, COMMUNICATION, AGILE, GIT, WEBPACK · sheet `MISSING — KEYWORDS NOT FOUND IN RESUME`: NODE.JS, TYPESCRIPT, DOCKER, KUBERNETES, AWS, CI/CD, UNIT-TESTING, GRAPHQL, SYSTEM-DESIGN, LEADERSHIP, MENTORING · empty MATCHED sheet (no matches): `NO KEYWORDS MATCHED` (mono graphite, in place of the chips) · status stamp (score-driven): `APPROVED` (green) when match ≥ 70%, else `NEEDS WORK` (red) · MetaBar: `RESUME ANALYSIS REPORT · CANDIDATE ID: #4827 · DATE: APR 25, 2025` · semantic-match marker: dotted underline on the chip + legend `≈ MATCHED BY MEANING` (mono graphite, only when the API returns `matched_by: "semantic"`) · category group headings: `TECHNICAL` / `TOOLS` / `SOFT SKILLS` — reuse the bar labels above, no new copy · CTA (comp 04 has none — user addition, added when the user reported no visible way to download the updated resume): `VIEW GAP REPORT →` (primary, → `/report`; screen 05 then carries `TAILOR MY RESUME →` and its DOCX/PDF download) · `COMPARE OTHER POSTINGS` (secondary, → `/compare`, week 12 stretch)

**Results — improvement block (week 13, the hero sheet's block on real data):** `TOP RECOMMENDATIONS` — up to four numbered steps served by the API in `improvement_plan` (1 work the posting's top gaps by mention count into the resume · 2 raise the weakest category and name its strongest gap · 3 keep the strongest keyword overlaps near the top · 4 open the summary with the posting's own title). `OVERALL ASSESSMENT` — one sentence served in `overall_assessment`, banded on the score: ≥70 `Strong match — N of M tracked skills already appear…` · 45–69 `Partial match — N of M tracked skills appear, and {category} is the weakest area at P%.` · <45 `Weak match — only N of M tracked skills appear. Start with {skill}.` · all covered `Every skill the posting asks for already appears…` · no tracked skills `The posting names none of the skills this analyzer tracks…`. No stamp in this block — the MISSING sheet already carries `APPROVED` / `NEEDS WORK`.

**Gap report:** `MISSING SKILLS` numbered 1–5 with their whys — **on real data these are the posting's five strongest gaps by mention count** (the API returns `missing_skills` sorted strongest-first); the fixed sample list is CI/CD: "Commonly required in modern web development roles, especially for deployment and automation." · DOCKER: "Widely used for containerization and deployment in production environments." · KUBERNETES: "Important for scaling and managing containerized applications in cloud environments." · SYSTEM DESIGN: "Key for designing scalable and reliable systems, especially at senior levels." · LEADERSHIP: "Valued for team management, mentorship, and cross-functional collaboration." — a real payload is **never** filtered down to those five names (that left the sheet blank for any other posting); empty MISSING sheet (a posting naming none of the tracked skills): `NO MISSING SKILLS` (mono graphite, same treatment as `NO KEYWORDS MATCHED`) · SuggestionCard: "Add a bullet mentioning CI/CD — the posting emphasizes it 3 times." (repeat the pattern once per gap category — up to three cards, each labelled `TECHNICAL` / `TOOLS` / `SOFT SKILLS`) · `EXAMPLE DIFF`: ORIGINAL "Experience with Docker and Kubernetes for containerization and orchestration." → SUGGESTED "**Experience with CI/CD,** Docker and Kubernetes for containerization and orchestration." (highlighted prefix, `IMPROVED` stamp) · CTA: `TAILOR MY RESUME →` primary (week 12 — see its own block), then `DOWNLOAD REPORT ⬇` secondary — **wired** (it shipped inert): POSTs the analysis to `POST /api/report/export` and saves `gap-report.pdf`, label `DOWNLOADING…` while the document builds, failures `Download failed.` / the shared connection line

**Tailored resume (week 12 — new screen, no comp):** report CTA `TAILOR MY RESUME →` (primary; comp 05's only CTA was `DOWNLOAD REPORT`, which becomes secondary) · H1 `TAILORED RESUME` · review sheet title `SIDE-BY-SIDE REVIEW` and its column labels `ORIGINAL` / `REVISED` (week 12 bullet 3 — the whole original document beside the revised one, one row per resume line, green left rule on rewritten lines) · block labels `CHANGED LINES` / `GAP DRAFTS` / `DOWNLOAD` · progress line `N OF M LINES REWRITTEN` · no-change state `NO LINES NEEDED CHANGING` · fallback notice `AI unavailable — the resume is unchanged; gap drafts are templates.` · fallback **reason line** (added when the user reported an unexplained fallback): `Reason: {…}`, mono graphite under the red notice, one plain sentence naming the server-side cause — `No API key is configured on the server.` / `The configured model is no longer available.` / `The provider is rate-limiting this key — retry in a minute.` / `The provider is briefly overloaded — retry in a minute.` / `The provider could not be reached.` / `The provider returned an error.` / `The provider returned an unexpected reply.` / `No resume lines could be rewritten from the extracted text.` · draft note (served by the API, not hardcoded) `Only include this if it's true — fill in the placeholders.` · buttons `DOWNLOAD DOCX` / `DOWNLOAD PDF` · loading = **TailoringPanel** (§4 #26) — eyebrow `TAILORING`, heading `YOUR RESUME IS BEING TAILORED`, step lines `Reading your resume` / `Rewriting each line against the posting` / `Checking nothing was invented` (4.2s cycle), footnote `The model rewrites one line at a time — this can take a minute.` · no-session notice `Upload a resume and a job posting first.` + button `UPLOAD A RESUME` · errors `Rewrite failed.` / `Download failed.` (a network failure reuses the upload connection line) · export format error `Unsupported format — DOCX or PDF only.` · export failure `Export failed.`

**Compare postings (week 12 stretch — new screen, no comp):** results CTA `COMPARE OTHER POSTINGS` (secondary button on screen 04; user addition) · H1 `COMPARE POSTINGS` · resume line `USING THIS RESUME` · field labels `POSTING 01` / `POSTING 02` / `POSTING 03` · CTA `COMPARE POSTINGS` (disabled until two fields have text) · results heading `RANKED POSTINGS` · best badge `BEST MATCH` (green StatusStamp, rank 1 only) · matched row `MATCHED` (top five chips per card, `+N MORE` overflow; semantic hits keep their dotted underline plus one `≈ MATCHED BY MEANING` legend under `RANKED POSTINGS`, week 12 bullet 4 — the "why" beside the score) · gap label `TOP GAPS` · overflow `+N MORE` · reset `COMPARE AGAIN` · loading `COMPARING…` · fallback card title `UNTITLED POSTING` · no-session notice `Upload a resume and run an analysis first.` + button `UPLOAD A RESUME` · errors `Add at least two job postings to compare.` / `Compare up to three job postings.` / `Comparison failed.` (network failure reuses the upload connection line) · the reason line is served by the API, pattern `Highest match at N%; K missing skills, starting with X.` (others `N% match; …`; zero gaps `…; no skill gaps found in the posting.`)

**Gemini key dialog (week 13 — new component, no comp):** eyebrow `GEMINI API KEY` · title `TAILORING NEEDS A KEY` · body "Rewriting your resume runs on Google Gemini, and GapAnalyzer does not ship a shared key. Add your own free key — it is used for this tailoring run and kept in this tab only." · steps heading `GET ONE FREE` with `1` "Open Google AI Studio's API keys page." · `2` "Sign in with a Google account — no card required." · `3` "Click Create API key, then copy it." · `4` "Paste it below and start the tailor." · link `aistudio.google.com/apikey ↗` · field label `YOUR KEY` (placeholder `AIza…`) · note `Kept in this tab only — never stored on the server.` · primary `TAILOR MY RESUME →` (disabled while the field is empty) · `CANCEL` · `CONTINUE WITHOUT A KEY` (proceeds with no key — the server's env key or the labelled fallback answers). Rejected-key reason line on `/rewrite`: `The key was rejected — check it and try again.`

**Theme toggle (§4 #23):** `Switch to dark mode` (in light) / `Switch to light mode` (in dark) — used for both `aria-label` and `title`; icon-only, no visible text.

**Mobile:** wordmark `GapAnalyzer` (rename from comp's ResumeLens), compact step row, sticky full-width `DOWNLOAD REPORT`

**404 (custom 404 page — `custom404page.pdf`, new screen, no comp entry):** eyebrow `ERROR 404 · PAGE NOT FOUND` · H1 `This page isn't in the file.` · body "The address may be mistyped, or the page has moved. Nothing is lost: your resume and job posting were never stored." · primary `BACK TO HOME →` (→ `/`) · secondary `ANALYZE MY RESUME` (→ `/upload`) · handwritten `Typo? Probably.` · sheet: stamp `NOT FOUND` · eyebrow `REQUESTED PAGE` · route pill = the requested path, struck through in red, followed by `NOT FOUND` · watermark `404` · eyebrow `TRY ONE OF THESE INSTEAD` · route rows `/upload` →, `/results` →, `/compare` → · mobile nav shows `ERROR 404` in place of the step row. The requested path is the **only** dynamic string (read client-side from the address; it is escaped by React, never trusted).

**OG image:** headline `Your resume, marked up.` + red underline + `RESUME → JOB GAP ANALYZER`

---

## 7. Do / Don't

- **Do** make every screen feel like one sheet of paper being marked up.
- **Do** keep red scarce — if everything is red, nothing is a gap.
- **Do** reuse components; if a comp shows a new element, add it to §4 before coding it.
- **Don't** introduce new colors, gradients, or a second display font without updating this file first.
- **Don't** copy AI-rendered garbled text from comps verbatim — comps set mood/layout, copy comes from `context.md`.
- **Don't** put `text-ink` on `--highlight` — use `--on-highlight` (yellow carries dark ink in both themes), and never hardcode a light-only color in a component: add an `html.dark` token override instead.
