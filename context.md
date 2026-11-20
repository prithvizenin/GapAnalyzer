# Context — Resume-to-Job Description Gap Analyzer

> Source documents: `project_overview.pdf`, `semester_plan.pdf`
> Current focus: **Mid-Sem Build (Weeks 1–7)** — this file captures everything needed to work up to the mid-sem milestone.
> Status: **Gemini API-key dialog ✅** — `/report`'s `TAILOR MY RESUME →` now opens a modal (DESIGN_SYSTEM §4 #25) that explains the rewrite runs on Gemini, links the free-key process, and collects the viewer's own key; it is kept in `sessionStorage` and forwarded per request as `api_key` on `POST /api/rewrite` (never stored server-side, never logged), and a supplied key wins over `backend/.env`. A rejected supplied key reports the named reason `invalid_key`. `npm run build` + backend key-precedence probe green; docs/contract updated. → **Week 12 COMPLETE ✅ — point 1 tailored resume (guarded LLM rewrite, `/rewrite` side-by-side review, DOCX/PDF export) and point 2 stretch multi-job comparison (`/compare`, `POST /api/compare`); 70/70 smoke, `npm run build` green, both E2E-verified; the rewrite LLM is now **Google Gemini** (`gemini-3.5-flash` — 2.5 Flash was retired for new API keys, see the model-ladder block in §9; key in `backend/.env`); `/report`'s `DOWNLOAD REPORT` now exports a real `gap-report.pdf` (`POST /api/report/export` + `report.py`); `tech_stack.txt` restored and the smoke docstring corrected.** **Week 13 feature — resume improvement plan ✅:** `/results` now renders the landing hero sheet's `TOP RECOMMENDATIONS` + `OVERALL ASSESSMENT` from real data (`improvement_plan` / `overall_assessment` on the analyze contract — deterministic, no LLM); **70/70 smoke, `npm run build` green**. **Rewrite "AI unavailable" fixed ✅:** `gemini-2.5-flash` now 404s for new API keys, so the default is `gemini-3.5-flash` plus a bounded candidate ladder (404/503 only) — verified `mode: llm` with 4 rewritten lines on `samples/frontend_*`. **A second "AI unavailable" report landed on the fallback path itself:** transient Google 5xx used to walk into slow ladder models, the line filter dropped real bullets, and every cause was mislabelled as "AI unavailable" — transient retries, a `reason` field + banner line, and `MIN_LINE_WORDS` 4 now fix that (70/70 smoke, build green). — Landing + Upload + Results + Gap report + Backend built, flow WIRED ✅ — comps approved, tokens/copy extracted; Next.js 16 + Tailwind v4 in `frontend/` (landing 01, upload + analyzing 02/03, results 04, gap report 05 — all drift-checked) and FastAPI in `backend/` (`POST /api/analyze`: extraction → skill dictionary → TF-IDF, 21/21 smoke). **Upload → API → sessionStorage → `/results` wired and E2E-verified** (real 31% analysis rendered, not the mock). `npm run build` green. **Product name: GapAnalyzer.** **Results stamp is score-driven: ≥70% green `APPROVED` / <70% red `NEEDS WORK` (new copy in DESIGN_SYSTEM §4+§6).** **Motion runs on GSAP + ScrollTrigger (§3.5): entrances, focal sequences, and scroll reveals on every screen — `gsap@3.15` added as a dependency (user-requested).** ~~**Dark mode + toggle crossfade verified E2E on every screen (§9 — `tmp_preview/theme_check.mjs` 64/64 checks, 10 shots + montage).**~~ **Dark mode still verified E2E; the swap is now a §3.5 radial reveal from the toggle (View Transitions) with a 220ms crossfade fallback — `theme_check.mjs` reworked, 72/72.** **END-SEM STARTED — Weeks 8–9 semantic matching ✅:** new `backend/embeddings.py` (sentence-transformers `all-mpnet-base-v2`, calibrated 0.50 threshold, alias-phrase queries, precision-first, graceful keyword-only fallback) promotes paraphrased skills into `matched_skills` with `matched_by: "semantic"` + `similarity` (semantic credit 0.75 in coverage); `/results` marks them with a dotted underline + `≈ MATCHED BY MEANING` legend. `python smoke_test.py` 26/26 + `npm run build` green. **Weeks 10–11 point 1 — skill categorization ✅:** `/results` groups MATCHED and MISSING chips under `TECHNICAL` / `TOOLS` / `SOFT SKILLS` (dictionary categories, empty groups omitted); `npm run build` green. Next: sample resumes/JDs → screens 06–08 + nav → deploy (§10). **Weeks 10–11 point 2 — categorized suggestions ✅:** `recommendations` is now one suggestion per gap category (technical / tools / soft), each carrying the copy-deck `message` plus `skill`/`category`/`jd_mentions`; `/report` stacks up to three labelled SuggestionCards. `python smoke_test.py` 29/29 + `npm run build` green. **`Tech_Stack_and_Architecture.pdf` added (18pp viva reference: stack versions, architecture, scoring math, 17-item Q&A — source `tmp_preview/tech_stack_doc.html`, regenerate via Chrome `--print-to-pdf --no-pdf-header-footer`).**

---

## 0. Agent Onboarding (cold-start instructions)

Fresh session? Do this in order:

**1. Read, in order:**
1. `context.md` — this file: product truth, progress, next step
2. `DESIGN_SYSTEM.md` — tokens, 22-component inventory, rules, and **§6 Copy Deck — use its strings verbatim, never invent copy**
3. `comps/*.png` — visual source of truth per screen (filename → screen map in §9)
4. `frontend/src` + `backend/` — code truth; always reuse existing components before writing new ones
5. `project_overview.pdf` / `semester_plan.pdf` — original briefs, already distilled above; only re-open on conflict
6. `MiniProject_MidSem_Report.pdf` — **the mid-sem acceptance target** (text extracted at `tmp_preview/midsem_report.txt`). It asserts a *completed* milestone: extraction pipeline (PDF/DOCX → text), skill dictionary + regex extraction, TF-IDF/keyword-overlap scoring, results UI (match % + missing keywords), end-to-end wiring, **live deployment**, 10–15 sample resumes/JDs, written report (✅ this file). Make the build match it — see §10.

**2. Environment:**
- Windows + Git Bash shell (POSIX syntax, forward slashes; `taskkill` needs `//` flags)
- Node 26 / npm 12; Python 3.14 (Windows console is cp1252 — set `PYTHONIOENCODING=utf-8` when printing unicode)
- Chrome: `C:/Program Files/Google/Chrome/Application/chrome.exe` (headless screenshots; see window-clamp note in §9 Stack Decision)
- Dependencies: `frontend/package.json` (next 16, react 19, tailwind 4, lucide-react, **gsap 3.15** — owns all authored animation, §3.5) + `backend/requirements.txt`
- **Known pip gotcha:** installing pdfplumber upgraded Pillow to 12.3 → global `moviepy` now reports a `pillow<12` conflict. Nothing in this project imports moviepy; ignore it.
- **No git repository** — all project state lives only on this machine; don't expect history or branches

**3. Run:**
```bash
cd frontend
npm install        # only if node_modules/ missing
npm run dev        # dev server → http://localhost:3000
npm run build      # MUST be green before claiming any UI task done (typecheck + lint + static gen)
npm run start      # prod serve (previously: npm run start -- -p 3100)
```
- **Backend** (`backend/`, Python 3.14, no venv — packages installed to the global site):
```bash
cd backend
python -m pip install -r requirements.txt   # once: fastapi, uvicorn, pdfplumber, python-docx, scikit-learn, sentence-transformers (torch already required by it — CPU wheel is fine), reportlab (week 12 DOCX/PDF export)
python main.py        # API → http://localhost:8000 (GET /health to verify); CORS via ALLOWED_ORIGINS env
#   rewrite LLM = Google Gemini (gemini-3.5-flash) via its OpenAI-compatible
#   endpoint. KEY GOES IN `backend/.env` → GEMINI_API_KEY=... (a placeholder
#   ships there; blank or placeholder = labelled fallback mode, never an error).
#   rewrite.py reads that file once at import; a shell var of the same name wins.
#   A viewer can also supply their own key: `/report` → TAILOR MY RESUME opens
#   the key dialog, stores it in sessionStorage and /rewrite forwards it as
#   `api_key` (wins over .env; never stored or logged).
#   Overrides: LLM_MODEL, LLM_BASE_URL, LLM_TIMEOUT (see rewrite.py docstring).
#   ⚠️ weeks 8–9: the first /api/analyze loads + downloads `all-mpnet-base-v2` (~420 MB, cached in the HF cache) and takes a few seconds; if that fails the API degrades to keyword-only (logged once) instead of erroring
#   dev origins: ALLOWED_ORIGINS="http://localhost:3000,3100,3101,3102,3103" python main.py
#   ⚠️ kill ALL listeners first (netstat -ano | grep :8000): a stale 127.0.0.1:8000
#   process shadows a new 0.0.0.0 one — loopback hits the old socket (old CORS wins)
python smoke_test.py  # 57 contract checks — API must be running (this is the backend's "test suite")
```
- Preview servers are **session-bound** — assume nothing is running; start it yourself. Port 3000 is often already occupied on this machine — serve with `npm run start -- -p 3100`. ⚠️ **Port 3100 can also be stale-occupied** by a previous session's server serving an old build (`EADDRINUSE` on start) — screenshots then hit the old code and facts will look "wrong". Check the start log / use `-p 3101` when anything looks stale. ⚠️ **Rebuilding while your own `next start` is running** leaves that server on a stale chunk manifest → CSS 404s (symptoms in facts: `text-transform` gone — `01 Upload` instead of `01 UPLOAD` — and page height exploding, e.g. 1300px → 11707px). **Restart the server after every `npm run build`** (find PID via `netstat -ano | grep :PORT`, `taskkill //PID n //F`).
- **Visual drift-check helper:** `node tmp_preview/shot.mjs <url> <out.jpg> <w> <h> [fill|analyze|badfile|real|rewrite|compare] [delayMs]` — headless Chrome driven over CDP via Node's built-in WebSocket (no deps); `fill` injects resume.pdf (245 KB dummy) + JD text, `analyze` submits (real fixture when present — captures mid-progress analyzing), `badfile` injects resume.exe (error state), **`real` = E2E journey** (real fixture PDF + `SHOT_JD` file → submit → waits for the `/results` handoff → shoots the real results), **`rewrite` = week-12 journey** (same upload → `/results`, then `/report` → clicks `TAILOR MY RESUME` → waits for the review or its error state, allowing LLM latency), **`compare` = week-12 stretch journey** (upload → `/results` → `COMPARE OTHER POSTINGS` → fills postings 02/03 → waits for the ranked cards); width < 700 auto-switches to 2× mobile metrics. **Every mode prints a `facts:` JSON line (path/h1/stamp/body text) — trust it over eyeballing shots.** E2E: `SHOT_JD=tmp_preview/fixtures/jd.txt node tmp_preview/shot.mjs http://localhost:3100/upload out.jpg 1440 1200 real`. Fixture: `tmp_preview/fixtures/` (`resume.html` → Chrome `--print-to-pdf` → `resume.pdf`; `jd.txt`); `SHOT_FILE` overrides the fixture path. Weeks 8–9 adds `semantic_resume.html/.pdf` + `semantic_jd.txt` (paraphrase fixture: CI/CD + Leadership promoted by meaning). ⚠️ Always pass **`--no-pdf-header-footer`** when generating fixtures — Chrome bakes the source filename + `1/1` into the PDF footer, and the skill matcher picks it up (a `pastry_resume.**html**` footer false-matched the `HTML` alias; zero-match tests must be truly zero). Replaces raw `--screenshot` for anything interactive or mobile. ⚠️ Full-page capture now **bumps the emulated viewport height** instead of `captureBeyondViewport`+clip — that path intermittently **drops freshly-animated elements** from the image while `evaluate` still reports them visible (seen on the hero GOOD MATCH stamp: 0 red px vs 412 after the fix). When a screenshot and reality disagree, confirm computed styles / plain capture with `tmp_preview/probe.mjs <url> <expr> [delayMs] [screenshotOut]` (env `PROBE_EMULATE=1` / `PROBE_CLIP=1` to reproduce shot.mjs conditions; `PROBE_W=390 PROBE_H=844` to probe a non-1440 viewport). Facts and capture now run **after a full scroll-through** of the page so ScrollTrigger reveals fire (§3.5) — without it, below-fold content captures hidden and `innerText` omits `visibility:hidden` elements.
- **Frontend has no test suite.** Verification = `npm run build` green + screenshot vs comp (drift-check loop in §9). **Backend verification** = `python backend/smoke_test.py` (57 contract checks) with the API running.
- **Theme/dark-mode check:** `node tmp_preview/theme_check.mjs` (frontend must be serving on :3100) — **72 assertions**: boot script pre-hydration, the **reveal path** (patches `document.startViewTransition` to prove exactly one call, zero legacy-crossfade frames, and samples the pseudo-element's `clip-path` for 8–27 distinct frames), a **forced fallback** run (API deleted for one click → 220ms crossfade still interpolates), persistence, system-follow both ways, reduced-motion instant **with no view transition**, mobile rect; writes `theme-01…10.jpg`. Eyeball all 10 in one read via the Pillow-built labeled `tmp_preview/theme-montage.jpg`. ⚠️ **Headless Chrome defaults to `prefers-color-scheme: DARK`** — a fresh visit boots dark (correct per §3.1); test assertions must probe `matchMedia`, never assume light. ⚠️ **`read_files` image attachments can misbind after the first image turn** (asked for theme-04, got theme-06's pixels; single-file reads too) — cross-check any attached image against facts/Pillow brightness before trusting it; a single fresh montage file read reliably.

**4. Frontend map** (root `frontend/`, alias `@/*` → `src/*`):
```
src/app/layout.tsx        # 4 Google fonts + metadata — fonts locked to DESIGN_SYSTEM §3.2
src/app/globals.css       # Tailwind v4 @theme = DESIGN_SYSTEM tokens (colors/fonts/shadow) + paper grain
src/app/page.tsx          # landing = Nav + Hero + StepsBand + FeatureRow
src/app/upload/page.tsx   # screen 02 (client): Dropzone + ruled JD Textarea + validating CTA → analyzing (03) → POST /api/analyze → sessionStorage["analysis"] → /results (WIRED)
src/app/results/page.tsx  # screen 04 (client): StampScore + CategoryBar ×3 + MATCHED/MISSING sheets + MetaBar; reads sessionStorage "analysis", else mock
src/app/report/page.tsx   # screen 05 (client): MISSING SKILLS list + SuggestionCard + EXAMPLE DIFF + Tailor CTA; same sessionStorage handoff
src/app/rewrite/page.tsx  # week 12 (client): side-by-side tailored-resume review + gap drafts + DOCX/PDF download; reads sessionStorage `resume_text` + `job_description`
src/app/compare/page.tsx  # week 12 stretch (client): 3 posting fields → POST /api/compare → ranked cards with score, reason, category bars, top gaps
src/lib/cn.ts             # dependency-free classname joiner
src/lib/analysis.ts       # §9 contract types (AnalysisResult) + MOCK_ANALYSIS — the mock /api/analyze response
src/components/ui/        # Button · Sheet · SkillChip · StampScore · StatusStamp · HandwrittenNote · StepIndicator · Dropzone · FileChip · Textarea · ProgressBar · CategoryBar · MetaBar · AnnotationNumber · AnnotationItem · SuggestionCard · DiffRow · RewriteRow
src/components/Nav.tsx    # sticky header
src/components/landing/   # Hero (incl. inline ReportSheet), Sections (StepsBand, FeatureRow)
src/components/upload/    # AnalyzingPanel (screen 03 checklist + pen motif)
```

**5. Ground rules:** component-first (inventory = DESIGN_SYSTEM §4 — no one-off styling) · copy verbatim (§6) · no new colors/fonts/components without updating `DESIGN_SYSTEM.md` first · red = gaps only, yellow = matched only · product name **GapAnalyzer** everywhere.

**6. Update protocol (mandatory, every task):** when you complete any work, **update this file in place, preserving its existing section structure and format (§0–§10)** — do not rewrite it from scratch, do not restructure, do not create a parallel progress file. As part of finishing the task (before reporting done):
- refresh the `> Status:` header line to reflect the new state
- update the **§9 Build Progress** table (screen status) and **component tally** (x/22)
- record any new decision, gotcha, or convention in its existing section (environment/setup issues → §0, API changes → §9 contract, new design rules → `DESIGN_SYSTEM.md` + §9 summary)
- set the new **next task** (concrete: which screen/file/comp)
- tick or adjust **§10 DoD** items if touched
- if a task changed design rules or copy, edit `DESIGN_SYSTEM.md` too; if it changed the API shape, edit the §9 contract — this file stays the single index of truth, never a stale snapshot
History is advanced, not deleted: strike through or amend, keep the audit trail (see how steps 1–5 above use ~~strikethrough~~ + ✅).

**Status at a glance:** Landing `/` ✅ · Upload `/upload` ✅ **wired** (real POST → `/results`; also stores `resume_text` + JD for week 12) · Results `/results` ✅ (E2E real data, chips grouped by category, `COMPARE OTHER POSTINGS` CTA) · Gap report `/report` ✅ (+ `TAILOR MY RESUME →`) · **Tailored resume `/rewrite` ✅ week 12 point 1** (side-by-side review + DOCX/PDF) · **Compare postings `/compare` ✅ week 12 stretch** (3 postings ranked with reasons) · Backend `POST /api/analyze` + `/api/rewrite` + `/api/rewrite/export` + `/api/compare` ✅ (73/73 smoke) · Mobile / OG / Empty not started · **Dark mode ✅ verified all screens** · 22/24 components shipped · **next task = week 13 (real-resume testing + edge cases)**; sample resumes/JDs, screens 06–08 and deploy still open (details in §9).

---

## 1. What We're Building

A **web-based tool that compares a resume against a specific job posting** and tells the user exactly what is missing. Instead of guessing whether a resume fits a job, the user pastes both documents and receives a clear report: a match score, a list of missing skills/keywords, and suggestions on how to close the gap.

**One-line summary:** "A tool that reads a resume and a job posting side by side, tells the user exactly what skills or keywords they're missing — using both simple keyword matching and smarter, meaning-based AI matching — and then generates an updated resume for them, so they can tailor and download a stronger version before applying."

### The Problem It Solves

- Many companies use automated ATS (Applicant Tracking Systems) to filter resumes before a human ever sees them.
- These systems often reject qualified candidates simply because wording differs (resume says "led a team" while the posting asks for "management experience").
- Job seekers rarely get feedback on why they were rejected, so they can't improve. This tool exposes that gap directly and explains it in plain language.

### Target Users

- Students and job seekers applying to internships or full-time roles
- Career centers/counselors who want data-backed resume feedback
- Anyone applying to multiple similar job postings who wants to tailor their resume quickly

---

## 2. End-to-End Flow

1. **Input:** User uploads or pastes their resume (PDF/DOCX/plain text) and pastes the target job description.
2. **Text Extraction:** The system extracts clean, structured text from both documents, handling different formats and layouts.
3. **Skill/Keyword Extraction:** Each document is scanned to identify skills, tools, certifications, and key requirements.
4. **Matching:** Resume skills are compared against job-posting requirements using a matching algorithm (Section 4).
5. **Scoring:** A match percentage is calculated based on overlap.
6. **Gap Report:** The user receives: overall match score, matched skills, missing skills, and specific suggestions for what to add or rephrase.
7. **Updated Resume Generation (End-Sem feature):** The tool uses the gap report to automatically produce a revised resume with missing skills/keywords naturally incorporated, which the user can review and download.

---

## 3. Key Features

- Resume and job description upload/paste interface
- Match percentage score with a visual breakdown
- List of matched vs. missing skills, categorized (technical, soft skills, tools/certifications)
- Specific, actionable suggestions (e.g., "Add a bullet point mentioning X")
- Support for multiple file formats (PDF, DOCX, plain text)
- Automated updated resume generator (End-Sem): revised, downloadable resume incorporating missing skills/keywords in natural language
- (Stretch) Multi-job comparison — compare one resume against several postings at once

---

## 4. The Matching Algorithm (Technical Core)

Two approaches, representing the project's growth in sophistication:

### A. Keyword-Based Matching (Foundational Version — **Mid-Sem**)

- Uses TF-IDF (Term Frequency–Inverse Document Frequency) or direct keyword overlap to compare the two texts.
- Catches exact/near-exact matches (e.g., "Python" appearing in both documents) but misses paraphrased skills.

### B. Embeddings-Based Semantic Matching (Advanced Version — **End-Sem**)

- Uses sentence embeddings (via models such as sentence-transformers) to convert phrases into numeric vectors capturing meaning, not just exact words.
- Recognizes that "led a cross-functional team" and "management experience" are conceptually similar even with no shared words.
- This is what separates the tool from a simple keyword scanner and gives it genuine NLU capability.

---

## 5. Suggested Tech Stack

| Layer | Technology Options | Purpose |
|---|---|---|
| Frontend | React / Next.js | Upload interface, results dashboard, charts |
| Backend | Python (Flask/FastAPI) or Node.js | Handle requests, run NLP pipeline |
| Text Extraction | pdfplumber, python-docx | Convert PDF/DOCX resumes into clean text |
| Keyword Matching | scikit-learn (TF-IDF) | Baseline matching algorithm |
| Semantic Matching | sentence-transformers | Embeddings-based similarity for paraphrased skills |
| Resume Rewriting | LLM API (e.g., Claude/OpenAI API) | Generate updated resume bullets based on identified gaps |
| Document Output | python-docx, reportlab | Produce the updated resume as downloadable PDF/DOCX |
| Database | PostgreSQL / SQLite | Store user sessions, past analyses (optional) |
| Deployment | Vercel / Render / Railway | Host the live, demoable version |

---

## 6. Semester Plan

The project splits into two halves:

- **Mid-semester milestone:** a working, deployed tool using keyword-based matching.
- **End-semester milestone:** upgrade the core algorithm to semantic (embeddings-based) matching, plus personalization and testing depth — showing clear technical growth over the semester.

### MID-SEM (Weeks 1–7): Core Parsing + Basic Gap Detection ← **CURRENT SCOPE**

#### Week 1–2: Planning & Setup
- Define scope: which file types to support (PDF/DOCX resumes, plain text job postings)
- Set up stack (e.g., Python/Flask or Node backend for NLP processing, React frontend)
- Collect sample resumes and job postings for testing (10–15 of each, anonymized)

#### Week 3–4: Text Extraction Pipeline
- Parse resumes (PDF/DOCX → clean text) and job descriptions (paste or scrape)
- Build keyword/skill extraction using a basic approach first (predefined skill dictionary + regex/NLP tagging)

#### Week 5–6: First Matching Algorithm
- Implement TF-IDF or keyword-overlap scoring to compare resume vs. job posting
- Output a basic match percentage plus a list of missing keywords

#### Week 7: Polish + Mid-Sem Demo Prep
- Clean UI: upload resume, paste job posting, view results
- Deploy a working version
- Write mid-sem report: problem statement, approach, current limitations, next steps

**Mid-Sem Deliverable:** Working end-to-end tool with keyword-based gap detection, live and demoable.

### END-SEM (Weeks 8–14): Semantic Depth + Smarter Suggestions (Future — out of current scope)

- **Week 8–9:** Upgrade to embeddings-based matching (sentence-transformers) — technical centerpiece of end-sem build
- **Week 10–11:** Skill categorization + suggestions (technical, soft skills, tools/certifications; e.g., "Add a bullet mentioning X, since the posting emphasizes it 3 times")
- **Week 12:** Automated updated resume generator — LLM API rephrases/adds bullets without fabricating experience; side-by-side review; download as PDF/DOCX. Stretch: multi-job comparison (paste 3 postings, see which matches best and why)
- **Week 13:** Testing & refinement — 5+ real resumes/postings from classmates; edge cases (poor formatting, non-English, scanned PDFs)
- **Week 14:** Final report + demo — keyword-only vs. embeddings comparison; live demo with a real job posting

**End-Sem Deliverable:** Upgraded tool with semantic matching, personalized suggestions, auto-generated updated resume (downloadable), and real-user testing evidence.

---

## 7. Why This Project Scores Well

- **Real-world relevance:** solves a problem nearly every student/job seeker has experienced.
- **Genuine technical depth:** goes beyond CRUD — real NLP techniques (TF-IDF, embeddings), not just API calls.
- **Demonstrable growth:** the keyword-matching → embeddings upgrade gives a clear "before vs. after" technical story.
- **End-to-end usefulness:** the auto-generated updated resume means the tool doesn't just diagnose — it hands the user a concrete solution.
- **Live, engaging demo:** demoable in real time with a real resume and job posting — visual and understandable to any audience.
- **Extensible:** naturally supports stretch features (AI rewriting, multi-job comparison).

**Why the split scores well:** mid-sem shows working software with a legitimate (if simple) NLP technique; end-sem shows a genuine upgrade to the core algorithm rather than just added UI polish, plus a standout closing-the-loop feature.

---

## 8. Known Challenges

- Resumes come in many formats/layouts — text extraction must handle inconsistent structure
- Some resumes may be scanned images rather than text (OCR as a stretch case)
- Embeddings models require careful tuning of similarity thresholds to avoid false-positive matches (end-sem)
- Avoiding bias: suggestions should focus on skill/keyword gaps, not penalize non-traditional resume formats

---

## 9. Design System (Comp-First)

Design decisions locked in this session — full spec lives in `DESIGN_SYSTEM.md`, image prompts in `PROMPTS.md`.

### Direction: "Marked-Up Dossier"

The product marks up a resume, so the UI *is* a marked-up document: warm off-white paper (`#F6F1E7`), ink black (`#1C1A17`), red correction pen (`#C43D2E`) **only for gaps/missing skills**, yellow highlighter (`#F6E27A`) **only for matched keywords**, stamp green (`#2E6B4F`) for confirmed matches, plus hairline rules, rubber stamps, paperclips, and margin-note motifs.

- **Type:** Instrument Serif (display) + Inter (body) + IBM Plex Mono (labels/data) — all Google Fonts
- **Shape language:** sharp paper (3px radius), hairline `--rule` borders, paper-lift shadows, ±0.5° sheet rotation, subtle paper grain
- **Motion:** functional only (highlighter swipe, red-pen draw-in, score-stamp settle), 150–250ms, respects `prefers-reduced-motion`
- **Bans:** SaaS gradients, glassmorphism, neon dark mode, emoji icons, rainbow chips, red used for anything other than gaps

### Workflow: Comp-First (chosen approach)

1. ~~User generates UI comps from `PROMPTS.md` (ChatGPT/DALL·E) and drops them into `comps/` with exact filenames~~ ✅ done — all 8 delivered
2. ~~Review/iterate until direction clicks~~ ✅ v1 approved (name unified to **GapAnalyzer**; score stamp always red; yellow = matched / red strikethrough = missing per product screens 04/06)
3. ~~Extract final token values from chosen comps into `DESIGN_SYSTEM.md`~~ ✅ tokens + full copy deck extracted (§3–§6 of DESIGN_SYSTEM.md)
4. Build **component-first**: every screen element maps to one of the 22 fixed components — no one-off styling — ✅ ~~Landing done (6 components shipped); 5 screens remain~~ **5 of 8 screens built (01–05), 20/22 components**; 3 screens remain (06/07/08)
5. Screenshot built pages next to comps; fix drift in one batch — ✅ ~~landing~~ **screens 01–05 verified at 1440px + 390px** (no overflow, matches comp)

### Screen Inventory → Comp Files (all delivered ✅)

| Screen | Comp file |
|---|---|
| Landing | `comps/01-landing.png` ✅ |
| Upload / paste | `comps/02-upload.png` ✅ |
| Analyzing | `comps/03-analyzing.png` ✅ |
| Results overview | `comps/04-results-overview.png` ✅ |
| Gap report detail | `comps/05-gap-report.png` ✅ |
| Mobile results | `comps/06-mobile-results.png` ✅ |
| OG share image | `comps/07-og-image.png` ✅ |
| Empty state | `comps/08-empty-state.png` ✅ |

### Build Progress (component-first)

| Screen | Status | Comp |
|---|---|---|
| Landing `/` | ✅ built + verified (drift check passed, mobile overflow fixed via `min-w-0` on hero grid children) | `01-landing.png` |
| Upload `/upload` | ✅ built + drift-checked (desktop filled + error states, 390px mobile; no Nav per comp + §5 inventory) | `02-upload.png` |
| Analyzing | ✅ built as in-page state of `/upload` + drift-checked (pacing animation only now — the real POST hands off to `/results`, E2E-verified) | `03-analyzing.png` |
| Results overview | ✅ built + drift-checked (1440 desktop + 390px mobile; mocked §9 response, sessionStorage handoff ready) — week 10–11 chip grouping is build-verified, not yet drift-checked; week 13 adds the improvement block (`TOP RECOMMENDATIONS` + `OVERALL ASSESSMENT`, build-verified) | `04-results-overview.png` |
| Gap report detail | ✅ built + drift-checked (1440 desktop + 390px mobile; mock data, same sessionStorage handoff) — weeks 10–11 stacked suggestion cards (up to three, category-labelled) are build- and API-verified but **not yet drift-checked**; week 12 adds the `TAILOR MY RESUME →` entry point (user addition) | `05-gap-report.png` |
| Tailored resume `/rewrite` | ✅ built (week 12, no comp — user addition); build + E2E verified, not drift-checked against a comp (none exists). Week-12 bullet 3: the whole document reviewed side by side (`SIDE-BY-SIDE REVIEW`, ORIGINAL / REVISED per line) then downloadable as DOCX/PDF | — |
| Compare postings `/compare` | ✅ built (week 12 stretch, no comp — user addition); build + E2E verified. Week-12 bullet 4: each ranked card also lists its `MATCHED` skills (top five, `+N MORE`), so the reason beside the score is visible | — |
| Mobile results | not started (responsive rules in DESIGN_SYSTEM §4) | `06-mobile-results.png` |
| OG share image | not started (use `07-og-image.png` as-is) | `07-og-image.png` |
| Empty state | not started | `08-empty-state.png` |

**Components shipped (22/24):** Button, Sheet, SkillChip, StampScore, StatusStamp, HandwrittenNote, StepIndicator, Dropzone, FileChip, Textarea, ProgressBar, CategoryBar, MetaBar, AnnotationNumber, AnnotationItem, SuggestionCard, DiffRow, RewriteRow (ui) + Nav, Hero (incl. ReportSheet), FeatureRow (landing sections) + **ThemeToggle** (inventory #23, fixed bottom-right on every screen — existed in code but unrecorded; E2E-verified this task, see Dark mode block below). StepsBand remains the landing-only stand-in for StepIndicator. Screen 03 ships as `components/upload/AnalyzingPanel.tsx` (non-inventory element, like ReportSheet). Button gained a `disabled` prop (graphite fill) earlier. `Paperclip` is exported from `Sheet.tsx` (motif of #5, not a new inventory item) for inline title use; `stamp-settle` keyframes added to `globals.css` per §3.5.
**Still to build (2):** EmptyState, Toast. (ThemeToggle moved out of "to build" — it was already coded per DESIGN_SYSTEM §4 #23 but never recorded here; this task verified it end-to-end.)

**Upload-screen decisions (this task):**
- No Nav on `/upload` — comp 02 and §5's component list both omit it (browser back returns to landing).
- CTA submits into an **in-page analyzing state** (screen 03 — plan confirmed). Progress was simulated (2.8s; rows check at 25/50/100%) ~~and holds complete at 100%; replace the timer with `POST /api/analyze` → navigate `/results` once both exist~~ ✅ **wired — see Wiring decisions below** (the timer lives in `upload/page.tsx` `useEffect` and is now pacing-only).
- Client validation mirrors the contract: `.pdf/.docx/.txt` only + **5 MB cap** → red dashed dropzone border + mono alert (copy in DESIGN_SYSTEM §6). Add the matching 413 check to the backend. ✅ done — `backend/extraction.py`, smoke-tested.
- Ruled JD textarea = `.ruled-paper` utility in `globals.css`: rule color is `color-mix(rule 50% / graphite)` (plain `--rule` was too faint vs comp), and `padding-top: 16px` is locked to the rules' 16px background offset — change both together or text drifts off the lines.
- Comps render AI text ~25% larger than any real build; kept in-system instead (steps 18px, sheet titles 24px, checklist labels 18px) and kept `max-w-[1120px]` even though comp 02's content spans ~92% of its frame.
- Dropzone dashed border = `ink/60` (comp shows dark charcoal; `--rule` on manila would be invisible).

**Results-screen decisions (this task):**
- `/results` renders the §9 response shape from `src/lib/analysis.ts` (types + `MOCK_ANALYSIS`); on mount it checks `sessionStorage["analysis"]` and uses that when present — that's the handoff key for the future upload → POST → navigate wiring.
- Direct visits without stored data show the sample report (comp 04 data); swap to EmptyState (comp 08) when that screen lands.
- Comp 04 has no CTA, so there's deliberately no link to `/report` yet — add one when screen 05 exists (and record it in DESIGN_SYSTEM §4/§6).
- Paperclip sits inline, left of the sheet titles per comp 04 (Sheet's `clip` prop still floats it top-right for the hero sheet).
- Category bar track = `bg-paper-raised` + hairline (the in-system "white track"), ink fill; ~~no fill animation (not in §3.5)~~ **ink-fill animation added with the motion system** (`.bar-fill` scaleX, staggered — §3.5 now authorizes it). Stamp uses `size="lg"` + the §3.5 settle; comp's ~25%-larger stamp/type kept in-system (same precedent as earlier screens).

**Gap-report decisions (this task):**
- `/report` uses the same handoff as `/results` (sessionStorage "analysis" → else `MOCK_ANALYSIS`); screen 05's list is fixed to the copy deck's five via `REPORT_SKILLS` in the page, matched against `missing_skills` — chip hyphens read as words in headings (SYSTEM-DESIGN → SYSTEM DESIGN).
- The five `why` strings were transcribed from comp 05 into DESIGN_SYSTEM §6 (comp text was legible, not garbled — the copy deck is the authority).
- DiffRow finds the added phrase via longest-common-prefix + tail-index heuristic (single insertion) — the §9 "heuristic mid-sem" note; becomes the LLM diff end-sem. Highlight trims the trailing space so the swipe ends on the comma.
- CTA block = hairline rule + full-width button inside `max-w-[360px]` (comp shows rule ≈ button width, left-aligned in the column); lucide `Download` icon at 1.5 stroke.
- ~~Still no navigation between `/results` and `/report` — both comps are nav-less; adding either link needs a new DESIGN_SYSTEM §6 copy line first~~ → **fixed later — see the results → gap-report navigation task.**

**Wiring decisions (this task):**
- `upload/page.tsx` submit: `FormData(resume, job_description)` → `POST ${API_URL}/api/analyze` where `API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"` (**set `NEXT_PUBLIC_API_URL` at deploy**) → `sessionStorage["analysis"]` → `router.push("/results")`.
- The 2.8s checklist is now **visual pacing only** (`MIN_ANALYZE_MS`): the handoff fires when the API has answered *and* the checklist has run (answer + 350ms beat, floor 2.8s), so screen 03 always reads even on a fast response.
- Errors: response `detail` (copy-deck strings) lands in the existing red alert slot under the dropzone; network `TypeError` → `Couldn't reach the analyzer — is the backend running?`; non-JSON/missing `match_score` → `Analysis pipeline failed.`; phase returns to `form` keeping file + JD for retry. New error copy was added to DESIGN_SYSTEM §6 **before** use.
- **E2E verification (text facts, not eyeballing):** `SHOT_JD=tmp_preview/fixtures/jd.txt node tmp_preview/shot.mjs http://localhost:3100/upload out.jpg 1440 1200 real` → facts: `path=/results`, `h1=Gap analysis results`, stamp `31 percent match`, categories 67/50/0, matched CSS/DOCKER/HTML/JAVASCRIPT/KUBERNETES/REACT, missing starts CI/CD (mock was 68% and NODE.JS-first) — real pipeline output. `analyze` mode auto-uses the fixture so the mid-flight check still works.
- Fixture: `tmp_preview/fixtures/resume.html` printed via Chrome `--print-to-pdf` → `resume.pdf` (461 extractable chars), `jd.txt` = the smoke-test JD. `shot.mjs` now logs a `facts:` line in every mode and no longer masks failures (`process.exit(process.exitCode ?? 0)`).
- Contract note: the UI never sends `resume_text` (no paste-resume field yet) — the field stays for a future paste mode.

**Score-driven status stamp (this task):** the MISSING-sheet `StatusStamp` on `/results` now reads `data.match_score` — **≥ 70% → green `APPROVED`, < 70% → red `NEEDS WORK`** (`APPROVED_AT = 70` in `results/page.tsx`; was hardcoded "Approved"). Per the copy-first protocol, `NEEDS WORK` was added to `DESIGN_SYSTEM.md` §4 #7 and §6 (and the stamp rule documented there) *before* use. Landing-hero stamps (`Good Match`/`On Track`) and DiffRow's `Improved` stay static — decorative, not verdicts.

**Empty MATCHED state (this task):** `/results` renders `NO KEYWORDS MATCHED` (mono graphite, copy added to DESIGN_SYSTEM §6 first) in place of the chip row when `matched_skills` is empty — previously the sheet showed a bare sub-label with nothing under it. MISSING sheet untouched (its empty case — a JD with no dictionary skills — is rare; flag separately if wanted). **E2E-verified with real data:** `SHOT_FILE=tmp_preview/fixtures/pastry_resume.pdf SHOT_JD=tmp_preview/fixtures/jd.txt node tmp_preview/shot.mjs http://localhost:3000/upload tmp_preview/empty-matched.jpg 1440 1400 real` → facts: `0 percent match`, `MATCHED KEYWORDS FOUND IN BOTH NO KEYWORDS MATCHED`, all 12 JD skills MISSING, stamp `NEEDS WORK`. New fixture `tmp_preview/fixtures/pastry_resume.html/pdf` (chef resume — **zero dictionary hits**, verified via `count_mentions`) exercises the no-match path.

**Motion system, CSS-keyframe era (this task — superseded by the GSAP block below):** `DESIGN_SYSTEM.md` §3.5 rewritten first (thesis "the dossier marks itself up"; budget: feedback 120–180ms, entrances 320–480ms, ≤~1s per screen's authored sequence, `cubic-bezier(0.16,1,0.3,1)`, stagger ≤60ms/item, once-per-mount, **no scroll reveals**). New primitives in `globals.css`: `.rise-in` / `.sheet-in` / `.highlight-swipe` (matched chips + diff `mark` paint L→R via background-size — text stays visible) / `.chip-in` / `.chip-pop` / `.bar-fill` (scaleX, transform-origin left) / `.stamp-in` (animates the individual `scale` property so stamps keep their inline rotation) / `.pen-line` (pathLength=1 draw) / `.stagger-1…12` (60ms steps); reduced-motion guard now also zeroes delays so staggered content never waits. Wired: **results = focal sequence** (stamp settle → bars ink-fill 150+90i → sheets rise → chips swipe 440+40i (cap 7) → verdict stamp 720 → MetaBar), **landing** = hero copy rise + sheet lands + hero chips/stamps sequenced + CTA scribble draws, **report** = sheets/cards rise + annotation items stagger + scribbles draw, **upload** = form sheets + CTA rise (analyzing panel same, shorter), feedback = Button press (translate/scale + `group`), Nav/hero arrow `group-hover` slide, Dropzone drag lift, FileChip pop, error `rise-in`. New props: `SkillChip.delay`, `CategoryBar.delay`, `SuggestionCard.className`, `AnnotationItem.className`. Verified: `npm run build` ✅ · 6 screenshots desktop+mobile all correct · pixel-count proof the GOOD MATCH stamp renders (412 red px) · `impeccable detect --json <17 changed files>` → `[]`.

**Report logo (this task):** `/report` now shows the serif **`GapAnalyzer™` wordmark top-left above the StepIndicator, linking to `/`** (user request; comp 05 has no logo — flagged as a user addition in the DESIGN_SYSTEM §5 screen table). Component-first: the wordmark was **extracted from `Nav` as `NavWordmark`** (same markup, now with `hover:opacity-70` + `transition-opacity` feedback; documented in §4 #14) and Nav reuses it — no new numbered inventory item, no copy change (wordmark is already §6 copy). The report wrapper wears `rise-in` (page entrance). Verified: `npm run build` ✅ · facts open with `GapAnalyzer ™ 01 UPLOAD…` · probe: `{href: "/", label: "GapAnalyzer™"}` · `impeccable detect` on Nav + report → `[]`. ~~Not added to `/results` (still nav-less per comp 04) — its own task if wanted.~~ **Added to `/results` too (follow-up task):** same `NavWordmark` + `rise-in` block above the StepIndicator, §5 Results row updated the same way; verified (build ✅, server restarted per the stale-manifest gotcha, facts open `Gap analysis results GapAnalyzer ™ 01 UPLOAD…`, screenshot correct, detect → `[]`). **Both app screens (04/05) now carry the wordmark → `/`.**

**Motion engine: GSAP (this task):** user asked for GSAP — overriding the no-new-deps convention — and chose **scroll reveals everywhere** (§3.5 rewritten: engine note + reveal rule `start: "top 88%"`, play once). `gsap@3.15` installed (ScrollTrigger included). Architecture: `src/lib/motion.ts` exports `gsap`/`ScrollTrigger`/`EASE` (`expo.out`)/`T` (durations) and **`useMotion(root, build, deps)`** = `gsap.matchMedia("(prefers-reduced-motion: no-preference)")` + `gsap.context(build, root)` with `ctx.revert()` on unmount/deps-change, run in an isomorphic **layout** effect (applies `from` start-states pre-paint — no flash). CSS animation layer **deleted** from `globals.css` (all keyframes, `.rise-in`…`.stagger-12`, `.pen-draw`, `.stamp-settle`, `.highlight-swipe`) — left behind: `.hl-sweep` (gradient styling, 100% default — GSAP tweens `backgroundSize` 0→100) + hover/press transitions + the reduced-motion guard. Components are presentational with hooks: `data-chip`/`data-bar`/`data-stamp`/`data-scribble`/`data-step-underline` + `js-*` marker classes from pages. Self-animating leaves: FileChip pop, Dropzone error rise, Checkbox pen-draw, StepIndicator reveal + underline (re-runs on `active`), AnnotationItem own ScrollTrigger + scribble draw, DiffRow boxes→swipe→IMPROVED, AnalyzingPanel mount. Page sequences: Hero one authored timeline; StepsBand/FeatureRow scroll reveals; results = block A (stamp→bars) + block B (sheets→chips→verdict) ScrollTrigger timelines, deps `[data]`, **empty-chip-set guarded** (no-match payload); report/upload = per-element `.js-sheet`/`.js-reveal` triggers (upload deps `[phase]`). `Hero`/`Sections` gained `"use client"` (were server imports of the landing page). Removed props: `SkillChip.delay`, `CategoryBar.delay`, `AnnotationItem.className`. **shot.mjs scrolls the page through before facts/capture.** ⚠️ Backend restarted with `ALLOWED_ORIGINS` incl. 3102 — two processes had been on 8000 (`0.0.0.0` + stale `127.0.0.1`; loopback hits the stale one → old CORS 400) — kill **all** listeners before restart (see §0). Verified: build ✅ · 5 desktop screenshots + mobile facts complete · real E2E (pastry → `NO KEYWORDS MATCHED` + `NEEDS WORK`, CORS ✓) · `impeccable detect` on 16 changed files → `[]`. ⚠️ Consequence: the direct-visit / mock payload (68%) now stamps `NEEDS WORK` (comp 04 showed a static `APPROVED`) — deliberate, since the stamp is data-driven now; 31% E2E run also stamps `NEEDS WORK`. Verified with `npm run build` + live facts check (68% mock → `NEEDS WORK`, `tmp_preview/stamp-check.jpg`).

**Dark mode + theme-swap animation (this task — verified, not rebuilt):** the full spec was already in code + DESIGN_SYSTEM (§3.1 dark token table, §3.5 theme swap, §4 #23) but `context.md` had no record of it; this task exercised it end-to-end on all screens and confirmed: **(a)** inline boot script in `layout.tsx` applies stored/system theme pre-hydration (fresh visit follows `prefers-color-scheme`; reload reapplies `localStorage["theme"]` — checked on the committed new document via `Page.frameNavigated`, not the old one's `body`); **(b)** `ThemeToggle` renders in the root layout → present on `/`, `/upload`, `/results`, `/report` (+ any route), 44×44, fully on-screen at 390px; **(c)** the §3.5 crossfade runs as specced — `theme-anim` on → forced reflow → `dark` flip → class off at 320ms, with an in-page rAF sampler catching real interpolated frames (e.g. body `rgb(25,22,18) → 48,45,40 → 111,107,100 → 164,160,152 → 246,241,231` across 260ms) and `transition-duration: 0.26s` only while the class is on; **(d)** the whole palette repaints (computed-style census: `--paper-raised` `#221E18` with zero light instances in dark, `#FFFDF7` with zero dark instances in light — no `dark:` branches in components); **(e)** theme carries across route changes; **(f)** `aria-label` + `localStorage` flip; **(g)** `prefers-reduced-motion` swaps instantly (duration 1e-05, 0 interpolated samples — the §3.5 media gate works); **(h)** system-follow live both directions while no stored pref. Tool: `tmp_preview/theme_check.mjs` (64/64) + 10 screenshots → `theme-montage.jpg`. **No code changes were needed** — build stayed green (`npm run build` ✅, no source touched).

**Theme toggle position (this task):** user asked for the toggle in the **top-right corner** (reported not visible at bottom-right) → moved it (`fixed top-5 right-5` in `ThemeToggle.tsx`) + pulled the landing Nav CTA inboard below ~1168px (`max-[1167px]:mr-12` — measured 40px overlap at 390 otherwise; at ≥1168px untouched, 1440 clearance 136px), DESIGN_SYSTEM §4 #23 + §5 updated first, then verified: `npm run build` ✅ · `theme_check.mjs` **ALL CHECKS PASSED** (64/64; mobile rect `{x:326,y:20,w:44,h:44}` on-screen) · rect-overlap probes on all 4 routes at 390px + landing 1440 → zero collisions · shots `tmp_preview/toggle-landing-1440.jpg` / `toggle-landing-390.jpg` correct. **Then reverted per user — the toggle stays at its original bottom-right (§4 #23 as originally written):** code back to `fixed right-5 bottom-5`, Nav CTA back to the container edge (clearance hack removed), DESIGN_SYSTEM §4/§5 restored; build re-verified ✅ + `theme_check.mjs` 64/64 + landing rect probe (toggle `[1360,1041→1404,1085]` bottom-right @1440, CTA back at right=1224). Net source change vs before this task: **none**. Kept: `PROBE_W`/`PROBE_H` viewport env in `tmp_preview/probe.mjs` (rect probes at e.g. `PROBE_W=390 PROBE_H=844`).

**Semantic matching — Weeks 8–9 (this task):** `backend/embeddings.py` adds a sentence-embeddings layer; `matching.analyze` now promotes dictionary *misses* to matches when the resume evidences them in different words. Every choice below was calibrated by probe (12 skills × 12 resume bullets, 8 known paraphrases), not guessed:
- **Model** `all-mpnet-base-v2` (sentence-transformers 6.3.0, CPU, lazy module-level singleton, `EMBEDDING_MODEL` override). Chosen after four models failed the same test: `multi-qa-MiniLM`, `bge-small` and `e5-small` all ranked a *false* "Worked in an Agile team with strong communication" above the true "Led a cross-functional team" paraphrase for Leadership; mpnet with alias queries separated them 0.586 vs 0.444.
- **Query** = the dictionary's **alias phrases** ("led a team", "continuous delivery", "unit tests"), max over phrases × resume sentences. **Rejected:** the bare skill label or a question wrapping it (pulls generic team/communication sentences — the false positive above), the JD requirement line (leaks neighbouring skills: TypeScript inherited "unit testing"), the `why` copy (marketing prose, spiked false positives), and per-sentence score normalization (needs several skills to calibrate, so single-skill postings degrade to zero matches). Resume **header and contact lines are excluded** from evidence — the name/role line was the top "match" for half the skills.
- **Threshold** `SEMANTIC_THRESHOLD` = **0.50** — calibration: Leadership 0.586 (true) vs 0.444 (false), CI/CD 0.665/0.537 vs 0.442 (Docker-only bullet), Unit-Testing 0.531 vs 0.126, Kubernetes 0.487 on a containers-only bullet (correctly not promoted). Precision-first: a false "you have this" costs the user more than a missed paraphrase. Revisit with real resumes in week 13.
- **Score** semantic matches count toward coverage at **0.75** credit (`_SEMANTIC_CREDIT`); the TF-IDF similarity term is unchanged, so the mid-sem 0.6/0.4 structure survives and scores stay comparable.
- **Contract additions** (`schemas.py` + `lib/analysis.ts`): `matched_skills[].matched_by: "keyword" | "semantic"` and `similarity: float | null`.
- **UI** `/results` gives semantic chips a dotted `--on-highlight` underline + the `≈ MATCHED BY MEANING` legend (DESIGN_SYSTEM §4 #8, §6); `sr-only` "matched by meaning" for screen readers.
- **Fallback** any model load/encode failure logs once and returns no evidence — keyword-only behaviour, no 500, contract shape unchanged.
- **Verified** `python smoke_test.py` **26/26** (5 new checks: paraphrase promoted, similarity recorded, keyword tag intact, distractor stays missing) · `npm run build` green · E2E `shot.mjs real` with `tmp_preview/fixtures/semantic_resume.pdf` + `semantic_jd.txt` → facts: `/results`, `31% MATCH`, categories 100/50/50, `CI/CD — MATCHED BY MEANING`, `LEADERSHIP — MATCHED BY MEANING`, `PYTHON` keyword, missing KUBERNETES/MENTORING (shot: `tmp_preview/semantic-results.jpg`). The mid-sem fixture promotes **nothing** — CI/CD ×3 stays missing and the copy-deck diff is unchanged.

**Skill categorization — weeks 10–11, point 1 (this task):** the semester plan's first weeks 10–11 item is "skill categorization (technical, soft skills, tools/certifications)". The backend already carries `category` on every matched/missing skill and `/results` already drew the three category bars — the missing piece was per-skill visibility: both sheets rendered one flat alphabetical chip blob. Now:
- `/results` groups chips under their category in fixed order `technical → tools → soft`, labelled with the **existing** §6 bar labels (`TECHNICAL` / `TOOLS` / `SOFT SKILLS`) — no new copy strings, no new component (DESIGN_SYSTEM §4 #8 extended, §5 Results row noted).
- Group heading is an `h3` at 10px mono graphite (`tracking-[0.14em]`) so it reads as a sub-label under the sheet's mono `KEYWORDS…` line; the chips keep their §4 #8 spec (matched = yellow swipe, missing = red strike, semantic = dotted underline) — categorization changes grouping, not chip styling.
- **Empty groups are omitted** (a posting asking for no soft skills shows no `SOFT SKILLS` heading), and the no-match payload still renders `NO KEYWORDS MATCHED` in place of the whole group stack.
- Inside a group the order stays alphabetical because the API sorts by skill name — `groupByCategory` is a pure page helper, so the §9 contract (`matched_by` / `similarity` / `category`) is unchanged and the backend is untouched (smoke stays 26/26).
- Motion unaffected: the results timeline targets `[data-chip="matched"]` / `[data-chip="missing"]` / `.js-sheet`, all of which survive grouping; the stagger now simply follows grouped DOM order.
- Deliberately **not** done: a fourth "certifications" category (the plan's wording reads "tools/certifications"). Comps 04/06 lock three bars, `Category` is a 3-value contract literal, and the dictionary has no cert entries — it would ripple through the contract, the bars, and the copy deck for no demo value. Its own task if wanted.
- Verified: `npm run build` green; no backend change.

**Categorized suggestions — weeks 10–11, point 2 (this task):** the semester plan's second weeks 10–11 item is "suggestions (technical, soft skills, tools/certifications; e.g. 'Add a bullet mentioning X, since the posting emphasizes it 3 times')" — that example is the copy-deck recommendation line that already existed, so the work was making the *set* respond to the posting and resume instead of being a generic top-three:
- **Selection is category-aware** (`matching._recommendations`): one suggestion per skill category that has a gap — the posting's worst gap in technical, in tools, in soft. Previously it was simply the top three missing skills by mention count, which on a tool-heavy posting produced three tools notes; point 1's categorization now actually shapes the advice. `missing_skills` already arrives sorted by mentions, so the first skill seen per category is its strongest gap; the picked set is re-sorted by mention count (then name) so the most-emphasised gap reads first and the §9 example stays recommendation #1.
- **Contract change (additive fields, identical copy):** `recommendations` went from `list[str]` to a list of `{skill, category, jd_mentions, message}`. `message` is the §6 copy-deck line byte-for-byte (the smoke test pins it); the extra fields let `/report` label a card without parsing its own prose. Touched: `schemas.Recommendation`, `matching._recommendation`, `lib/analysis.ts` (`Recommendation` type + a three-entry mock: CI/CD tools, TypeScript technical, Leadership soft).
- **UI:** `/report` maps the returned list into stacked `SuggestionCard`s (`n={i+1}`), each with `meta` = the shared `CATEGORY_LABELS` value (`TECHNICAL` / `TOOLS` / `SOFT SKILLS`) right-aligned in the header. `SuggestionCard` gained the optional `meta` prop (§4 #11); comp 05 shows a single card, so up-to-three is recorded as a user addition in §5. Each card still reveals individually via `.js-reveal`. `CATEGORY_LABELS` moved into `lib/analysis.ts` so the bars, the chip groups and the cards share one definition (the results page imports it now instead of declaring its own).
- Left for week 12 on purpose: rephrasing/rewriting the resume (LLM) and any suggestion text that invents experience — every message here is still derived from a mention count.
- Verified: `python smoke_test.py` **29/29** (4 recommendation checks: copy-deck message + structured fields, one per category, covers every gap category, names a real gap) · `npm run build` green · sample pair `samples/frontend_*` → 43% with suggestions Kubernetes (tools, ×3) + GraphQL (technical, ×1).

**Theme toggle — radial reveal (this task):** the toggle was the weak link in the theme swap: the page crossfaded every element through grey for 260ms while the button's own icon popped instantly. Redesigned per DESIGN_SYSTEM §3.5 + §4 #23 (docs edited first):
- **Reveal:** `ThemeToggle` writes `--theme-origin-x/y` (button centre) and `--theme-origin-r` (farthest viewport corner), then flips `dark` inside `document.startViewTransition`; `globals.css` reveals `::view-transition-new(root)` with `clip-path: circle(0 → r)` at **420ms `cubic-bezier(0.16,1,0.3,1)`** (the project's `expo.out`) while `::view-transition-old(root)` holds still. One composited animation replaces hundreds of per-element colour transitions: no grey wobble, cheaper on long pages, and the direction says where the change came from (ink spreading from the switch).
- **Icons:** both lucide icons are absolutely stacked in the 44×44 slip — `Moon` rotates −90° / scales to 0.5 / fades out while `Sun` arrives from +90°, 200ms on the same ease; the slip presses to `0.94` on click. These remain the only `dark:` utilities in the system and they animate motion only, never colour (§3.1 note added in `globals.css`).
- **Fallback:** browsers without View Transitions keep the per-element crossfade, shortened 260ms → **220ms** (`SWAP_MS` 280). Reduced motion swaps instantly through neither path.
- **Guard:** `busyRef` ignores a second click while `transition.finished` is pending — a mid-flight snapshot would capture a half-revealed page.
- **Verification:** `theme_check.mjs` reworked for both paths (see §0). **72/72 passed** on `/`, `/upload`, `/results`, `/report` at 1440px plus mobile 390px, 10 refreshed shots. Evidence lines: `vt=1` + 8–27 clip-path frames on every reveal, `anim_frames=0`; forced fallback `vt=0`, `dur=0.22`, 5 interpolated frames; reduced motion `vt=0`, `dur=0.00001`, 0 interpolated frames.
- **Honest limit:** DOM assertions prove mechanism, timing and palette landing; "smooth" is a temporal judgement no still screenshot settles, so no screenshot claim is made here.

**Week 12 bullet 4 — multi-job comparison, the "why" (this task) — COMPLETE ✅:** the plan's fourth week-12 bullet is the stretch add-on "paste 3 job postings, see which one the resume matches best, and why". The flow already existed (`/compare`, `POST /api/compare`, ranked cards, deterministic `reason`) — what was thin was the *why*: a card showed the score, the three category bars and the top five **gaps**, but never what the resume actually **matches** in that posting, which is the evidence behind the number. `ComparePosting` now carries `matched_skills` (the same `MatchedSkill` shape as `/api/analyze`: `skill` / `category` / `matched_by` / `similarity`), and every ranked card renders a `MATCHED` chip row above `TOP GAPS` — top five, `+N MORE` overflow, semantic hits keeping their dotted underline plus one `≈ MATCHED BY MEANING` legend under `RANKED POSTINGS` (§4 #8 language, no new components). Purely additive contract change: `matching.compare` already ran the full analysis per posting, so it forwards `analysis["matched_skills"]`; scoring, ranking and `/api/analyze` are untouched. Docs first: DESIGN_SYSTEM §5 (compare row → `SkillChip (matched + missing)`) + §6 (`MATCHED`, legend note). Verified: `python smoke_test.py` **59/59** (2 new checks: matched skills returned + categorised) · live `/api/compare` on `samples/frontend_*` + 2 further postings → **#1 66% matched 5 / gaps 0 · #2 43% matched 13 / gaps 6 · #3 12% matched 1 / gaps 4** · `npx eslint` on both changed frontend files **clean** · `npx tsc --noEmit` ✅ · `npm run build` ✅ (`/compare` in the route list). Honest limit: the card layout was not screenshot-checked (build/typecheck only), and the repo's other pre-existing lint errors are untouched.

**Week 12 bullet 3 — side-by-side review (this task) — COMPLETE ✅:** the plan's third week-12 bullet is "User can review the suggested changes side-by-side with the original, then download the updated resume as a PDF or DOCX file". Downloads (`/api/rewrite/export` → DOCX/PDF) and per-line `RewriteRow` pairs already existed, but the **original document was never on screen** — you could see the original of a line that changed, never the unchanged text around it, and in `fallback` mode (the usual state with a flaky `openrouter/free`) there was nothing to compare at all. `/rewrite` now renders the whole document as a row-per-line comparison inside a `SIDE-BY-SIDE REVIEW` sheet: left `ORIGINAL`, right `REVISED`. Rows align by line index because `rewrite._apply` preserves the line count (only approved indexes are replaced); changed rows come from the `L{n}` rewrite ids — **no API change, no new component** (the 2px green left rule + `ink` body is §4 #24's language; unchanged rows stay `graphite` and collapse to a single column below `md`, where they would only repeat themselves). `CHANGED LINES` keeps each changed line's model note, `GAP DRAFTS` and `DOWNLOAD` are untouched, and the original text comes from the existing sessionStorage `resume_text` handoff. Docs first: DESIGN_SYSTEM §5 row + §6 (`SIDE-BY-SIDE REVIEW`, column labels `ORIGINAL` / `REVISED`). Verified: `npm run build` ✅ (typecheck + static gen, `/rewrite` in the route list) · `npx tsc --noEmit` ✅ · backend untouched (57/57 smoke stands). Honest limits: `npx eslint` on the page still reports one **pre-existing** `react-hooks/set-state-in-effect` error on the empty-session branch (`setPhase("empty")` inside the effect, line 70 — part of the repo's 7-error lint baseline; `next build` does not run ESLint), and the new layout was **not screenshot-checked** (build/typecheck only).

**Week 12 point 1 — tailored resume (this task) — COMPLETE ✅:** the semester plan's week-12 item is "LLM API rephrases/adds bullets without fabricating experience; side-by-side review; download as PDF/DOCX". The guarded engine (`backend/rewrite.py` + `POST /api/rewrite`, written earlier) was unreachable, untested and undocumented — finished here:
- **Handoff (additive contract):** `AnalysisResponse.resume_text` now echoes the extracted text so the client can call `/api/rewrite` without re-uploading; `/upload` stores `analysis` + `resume_text` + `job_description` in sessionStorage. Nothing is persisted server-side.
- **New screen `/rewrite` (no comp — user addition):** reads the handoff, POSTs both strings, and reviews the result — `REVISED RESUME` sheet (full text + `N OF M LINES REWRITTEN`), `CHANGED LINES` as new **`RewriteRow`** pairs (ORIGINAL / REVISED with a green status rule), `GAP DRAFTS` as the existing `SuggestionCard` (one per gap category, placeholders intact). Fallback mode is labelled (`AI unavailable — the resume is unchanged; gap drafts are templates.`), never hidden.
- **DOCX/PDF download (the week-12 requirement):** new `backend/export.py` + `POST /api/rewrite/export` renders the text **on screen** via python-docx / reportlab (`reportlab` added to `requirements.txt`; it is already in the documented stack). One paragraph per resume line; the PDF uses Helvetica and replaces characters outside Windows-1252 with `?` rather than failing. Bad format → `400 Unsupported format — DOCX or PDF only.`
- **Reachability:** `/report` gained a primary `TAILOR MY RESUME →` CTA above its (still inert) `DOWNLOAD REPORT`, which becomes secondary — flagged as a user addition in DESIGN_SYSTEM §5/§6. `/rewrite` keeps StepIndicator active 2 (no fourth step; comps lock three).
- **Guards stay deterministic:** smoke now pins `_guard` (blocked skill rejected, invented number rejected, evidenced rewrite allowed) and `_valid_draft` (placeholders required, digits rejected), plus the fallback invariant `revised_resume == original`.
- **Design-system protocol:** DESIGN_SYSTEM §4 #24 (`RewriteRow`), §5 (screen row), §6 (copy block) were written before the screen. Component tally 22/24; `EmptyState` + `Toast` remain.
- **Verified:** `python smoke_test.py` **47/47** (18 new: rewrite contract/fallback/guards/drafts, DOCX/PDF magic + headers) · `npm run build` green (`/rewrite` in the route list) · E2E `SHOT_JD=tmp_preview/fixtures/jd.txt node tmp_preview/shot.mjs … rewrite` → upload → `/results` (31%) → `/report` → CTA → `/rewrite`; facts `path=/rewrite`, `h1=Tailored resume`, revised sheet, `CHANGED LINES`, 3 `GAP DRAFTS` with placeholders, both download buttons (shot `tmp_preview/rewrite-desktop.jpg`). The fixture's model reply proposed no safe rewrite, so the E2E exercised the `NO LINES NEEDED CHANGING` state; `RewriteRow` is built/type-checked but has not yet been seen with real changed lines. A separate sample-pair call came back `mode=fallback` — `openrouter/free` is flaky; the endpoint degrades by design and the UI labels it.

**Week 12 point 2 — multi-job comparison (this task) — COMPLETE ✅:** the plan's stretch add-on is "paste 3 job postings, see which one the resume matches best, and why". Built as a stateless endpoint plus a new screen:
- **`POST /api/compare`** (`matching.compare`, `CompareRequest/ComparePosting/CompareResponse`): 2–3 non-empty postings, each scored by the same `analyze` pipeline (dictionary + TF-IDF + embeddings) so scores stay comparable with screen 04; ranked by score → fewest gaps → title. Every posting carries `rank`, `job_title`, `company`, `match_score`, `categories`, full `missing_skills` and a deterministic `reason` (`Highest match at N%; K missing skills, starting with X.`).
- **`/compare` screen (no comp — user addition):** reads the sessionStorage `resume_text` handoff (and prefills posting 01 with the analysed JD), offers three ruled fields, and renders the ranking as paper cards — rank number, title/company, red score stamp, green `BEST MATCH`, the reason line, three category bars and the top five gaps. Entry point is a secondary `COMPARE OTHER POSTINGS` CTA on `/results`; no session → the same empty state as `/rewrite`.
- **Validation/copy:** `400` empty resume; `422` `Add at least two job postings to compare.` / `Compare up to three job postings.`; `500` `Comparison failed.` — all added to DESIGN_SYSTEM §5/§6 before use.
- **Verified:** `python smoke_test.py` **57/57** (10 new) · `npm run build` green (`/compare` in the route list) · E2E `SHOT_JD=tmp_preview/fixtures/jd.txt node tmp_preview/shot.mjs … compare` → upload → `/results` → `COMPARE OTHER POSTINGS` → three postings → ranked cards 50% Frontend Developer / 31% Senior Frontend Developer / 16% Data Analyst, `BEST MATCH` on rank 1 (facts + `tmp_preview/compare-desktop.jpg`).

**Rewrite provider switched to Gemini (this task):** the week-12 LLM called `openrouter/free`, which was flaky at demo time (a sample call came back `mode=fallback`). It now defaults to **Google Gemini** —
- **Transport unchanged:** Gemini is addressed through its OpenAI-compatible layer, so `_call_llm`'s `/chat/completions` request, `response_format: json_object`, the one retry without it, and the `choices[0].message.content` parse all stay as they were. Only the host, model and key name moved.
- **Config:** `LLM_BASE_URL` default `https://generativelanguage.googleapis.com/v1beta/openai`, `LLM_MODEL` default **`gemini-3.5-flash`** (`gemini-2.5-flash` was retired for new API keys — it answers 404 while `GET /models` still lists it, which is why the setting looked valid; the ladder below exists because of that). Key resolution **follows the host**: on the Gemini base URL only `GEMINI_API_KEY` / `GOOGLE_API_KEY` / `LLM_API_KEY` count; the OpenRouter/OpenAI key names are read only when `LLM_BASE_URL` points elsewhere. That matters on this machine — the shell already exports an `OPENROUTER_API_KEY`, and a flat fallback chain would have sent it to Google and 400'd every rewrite.
- **Where the key goes:** **`backend/.env`**, line `GEMINI_API_KEY=` (a placeholder ships in that file; get a free key at `https://aistudio.google.com/apikey`). `rewrite.py` parses it with a ~20-line stdlib loader — no dotenv dependency — and shell variables always win over the file. `backend/.gitignore` excludes `.env`.
- **Placeholder safety:** a blank value *or* one starting with `your-` counts as "not configured", so an unedited checkout never spends a request on a bogus credential; it returns the normal `fallback` payload and `/rewrite` shows the labelled banner. Log line now names the fix (`set GEMINI_API_KEY in backend/.env`).
- **Unchanged:** guards (`_guard`, `_valid_draft`), fallback semantics, response contract (still `mode: "llm" | "fallback"`), `model` label format (`host:model`), exports, frontend. No copy-deck string changed, so `DESIGN_SYSTEM.md` is untouched.
- **Verified:** `import rewrite` → base/model as above; `.env` load proven (`GEMINI_API_KEY` 0 → 24 chars = the placeholder); placeholder with every key var cleared → `_api_key() == ""` (fallback path); `GEMINI_API_KEY=AIzaTEST` wins over the file; `LLM_MODEL`/`LLM_BASE_URL` overrides apply; `import main` clean. Endpoint probe: `POST /v1beta/openai/chat/completions` unauthenticated answers **400 `Missing or invalid Authorization header`** (path is correct — `GET /openai/models` 404s, but nothing calls it). Honest limit: no live model call was made — that needs the real key.

**Results → gap-report navigation (this task — user-reported gap):** the user reported they could not find any way to download the updated resume after analysing. The feature existed; the **link did not**. `/results` rendered only `COMPARE OTHER POSTINGS`, and nothing anywhere linked to `/report`, so the whole chain `/report` → `TAILOR MY RESUME →` → `/rewrite` → `DOWNLOAD DOCX / DOWNLOAD PDF` was reachable only by typing the URL — exactly the navigation decision that had been parked as "needs a DESIGN_SYSTEM §6 copy line".
- **Copy first:** `VIEW GAP REPORT →` added to DESIGN_SYSTEM §6 (Results) and the §5 Results row's component list (Button ×2) before coding — no new component.
- **`/results`** now ends with a two-button CTA row: primary `VIEW GAP REPORT →` → `/report`, secondary `COMPARE OTHER POSTINGS` → `/compare` (unchanged). Stacked full-width below `sm`, side by side above; both ride the existing `js-compare` scroll reveal.
- **Unchanged:** `/report`'s primary `TAILOR MY RESUME →` and `/rewrite`'s DOCX/PDF buttons. The download is now two clicks from the results screen (report → tailor) instead of zero-click-unreachable.
- **Known leftover, not this task:** `DOWNLOAD REPORT` on `/report` is still an inert button (no report-export endpoint exists) — it reads as a download that does nothing and should either be wired or removed.
- **Verified:** `npm run build` ✅.

**Broken parts cleaned up (this task):** three things were genuinely broken, all in the "promised but not delivered" category.
- **`DOWNLOAD REPORT` on `/report` did nothing.** It was an inert `<button>` with no handler and no route behind it — the user's first complaint ("no download option") was really two bugs, and this was the second. New `POST /api/report/export` (`schemas.ReportExportRequest`, analysis payload minus `resume_text`, plus `format`, default `pdf`) renders through the new **`backend/report.py`**: role, company, score, category breakdown, matched/missing grouped by category (with `why` + mention counts), recommendations, example diff. `export.build()` gained an optional `title` so the PDF metadata no longer claims to be a tailored resume. The button now POSTs the analysis already on screen (stateless — nothing stored), saves `gap-report.pdf`, reads `DOWNLOADING…` in flight, and surfaces `Download failed.` / the connection line. Docs first: DESIGN_SYSTEM §6 records the wiring and the new label.
- **`tech_stack.txt` restored.** `context.md`'s file inventory pointed at it; the file did not exist. Regenerated from `package.json` + `requirements.txt`, including the Gemini rewriting row, the report export, and all five API routes.
- **`smoke_test.py` docstring corrected.** It claimed 57 checks while 59 were running; now **66** with seven new report-export checks (render content, PDF magic + `gap-report.pdf` filename, DOCX zip magic, 400 on a bad format).
- **Verified:** `python smoke_test.py` **66/66** (uvicorn started on port 8001 for the run, health-checked, stopped after) · `npm run build` ✅ (TypeScript clean, 10 routes) · `py_compile` on `report.py`, `export.py`, `schemas.py`, `main.py`.
- **Behaviour note:** `/report` falls back to `MOCK_ANALYSIS` when there is no session, so a direct visit can download the *sample* report — consistent with the screen showing sample data, but worth knowing before a demo.

**Component sandbox — `DoodleCrewFooter` demo (this task):** a third-party React footer (hand-drawn "sketchbook" wordmark with an animated crew; React + inline SVG only, zero dependencies) now lives at `frontend/src/components/ui/doodle-crew-footer.tsx` and previews at **`/demo/doodle-crew-footer`** (`src/app/demo/doodle-crew-footer/page.tsx`). It is a **sandbox, not a product screen**: it is absent from the §5 screen inventory, ships the component's own default copy/palette instead of the §6 copy deck, and no route links to it. It does not read the design-system tokens — pass `palette={{ background: "var(--paper)", ink: "var(--ink)", accent: "var(--ink-blue)" }}` to sit it on the theme if it is ever promoted into a real page (its `preset="auto"` looks for shadcn's `--color-background` / `--color-foreground`, which this project does not define). Two React-compiler lint rules (`eslint-config-next` v16) rejected the component exactly as shipped and were fixed in place: `paintDoodles` now precedes the layout effect that calls it (`react-hooks/immutability` — use-before-declaration), and the no-`IntersectionObserver` fallback plays on the next frame instead of calling `setState` synchronously in the effect body (`react-hooks/set-state-in-effect`). Beyond those two moves the component is verbatim; `npm run build` green and `npx eslint` clean on both new files.

**Resume improvement plan on `/results` (this task — user request):** the landing hero's report sheet advertises `TOP RECOMMENDATIONS` + `OVERALL ASSESSMENT`, but no real screen showed either — `/results` landed the user on a diagnosis with no next steps (the only advice anywhere was the three per-category cards on `/report`). That block is now real:
- **Contract (additive):** `AnalysisResponse.improvement_plan: list[str]` (≤4 ordered steps) + `overall_assessment: str`. Both deterministic in `matching.py` (`_improvement_plan`, `_overall_assessment`, shared `_weakest_category`) — no LLM and no invented facts: step 1 names the top three gaps by mention count and their summed mentions, step 2 the weakest *required* category and its strongest gap, step 3 the two strongest keyword overlaps (ranked by how often the posting asks for them), step 4 the posting's own title.
- **Why not the existing `recommendations`:** those are one per gap category in copy-deck template form and already render on `/report`; the hero block is a different artifact — a short sequenced plan plus a verdict sentence — so it got its own fields instead of overloading the cards.
- **UI:** one `Sheet` composed from existing primitives (inline paperclip + mono eyebrow labels exactly like the hero sheet, serif step numbers, hairline separators), revealed by a new `.js-plan` ScrollTrigger inside the existing results timeline group. **No new inventory item** — same precedent as the landing `ReportSheet` and `AnalyzingPanel`; recorded in DESIGN_SYSTEM §5 (Results row) and §6 (copy block + templates).
- **Deliberate difference from the sample:** the assessment row carries no stamp. `/results` already shows the score-driven `APPROVED` / `NEEDS WORK` stamp on the MISSING sheet, and a second verdict on the same screen is noise. The mock payload's plan/assessment were hand-written to match its own numbers (68%, soft 45%) so a direct visit still reads coherently.
- **Verified:** `python smoke_test.py` **69/69** (3 new: plan is 1–4 non-trivial steps, plan opens with `Work CI/CD`, assessment is a punctuated sentence) · `npm run build` green · live `/api/analyze` on `samples/frontend_*` returns a plan whose first step names that posting's top gaps.

**Rewrite said "AI unavailable" — retired model, fixed with a candidate ladder (this task, user-reported):** `/rewrite` showed `AI unavailable — the resume is unchanged; gap drafts are templates.` and both downloads returned the original text. Root cause was **not** the key or the guards: `POST /chat/completions` with `gemini-2.5-flash` answers **404** — *"This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.8-flash"* — yet `GET /models` still lists it, so the config looked healthy. `_call_llm` returned `None` and the documented fallback path ran exactly as designed (unchanged resume + placeholder drafts).
- **Default model:** `LLM_MODEL` is now `gemini-3.5-flash` — probed live on this key: 200 in ~18 s for a trivial prompt; `gemini-3.8-flash`, `gemini-flash-latest`, `gemini-3.7-flash` and `gemini-3.6-flash` all exceeded a 60 s read timeout at probe time (`gemini-3.8-flash` also answered 503 "high demand" on an earlier probe), so it is a working default, not the newest name.
- **Candidate ladder:** `_model_candidates()` = configured model first, then `gemini-3.8-flash` → `gemini-flash-latest` (Google host only; other OpenAI-compatible providers get exactly `LLM_MODEL`). It advances **only** on model-resolution statuses — 404 (retired) and 503 (demand spike) — so a timeout or auth error still ends in one bounded `fallback` rather than stacking 60 s waits per model.
- **Two small correctness fixes found while there:** `404` was removed from the `response_format` retry set (on this provider it means "no such model", so re-sending without the parameter could never help), and the response `model` label now names the model that actually answered instead of always echoing `LLM_MODEL`.
- **Verified:** `tailor()` on `samples/frontend_*` → `mode: llm`, `model: generativelanguage.googleapis.com:gemini-3.5-flash`, `stats {candidates: 13, changed: 4, rejected: 0}`, `revised_resume != original` — e.g. *"Automated builds and releases with GitHub Actions…"* → *"Automated CI/CD pipelines with GitHub Actions…"* and *"Wrote unit tests with Jest…"* → *"Built unit testing suites with Jest…"*, i.e. the gap vocabulary appears where the resume already had the evidence. `python smoke_test.py` **69/69** with the live model (the rewrite checks still pass in either mode — they assert invariants, not `mode == "llm"`). `tech_stack.txt`, §0 and the §9 contract now name the new default.
- **Honest limits:** latency is real — one rewrite round-trip is ~57 s on this key (24 candidate lines), well inside the UI's patience but visible; if every candidate 404s/503s the labelled fallback still appears (unchanged resume is the guaranteed-worst-case, by design), and a retired-name regression would only show in the log line (`rewrite model … unavailable`). No screenshot check was needed — no frontend file changed.

**Second report — still "AI unavailable" (this task):** after the model fix, `/rewrite` still fell back. Probes ruled out the obvious suspects: the running `:8000` server answers `mode: llm` in 34–47 s for the sample pair **and** for a 21-line stress resume; the frontend is on `:3000`, has **no** `.env*` override, and its built bundle calls `http://localhost:8000` — so the browser does reach the working API. What remained was the fallback path itself being too blunt, so each cause was made visible and transient ones recoverable:
- **Transient provider errors now retry the same model once.** A 429/500/502/503/504 used to walk straight into the ladder — and the second/third candidates (`gemini-3.8-flash`, `gemini-flash-latest`) were hanging past 60 s in probes — so a 2-second Google demand spike became a minute of waiting and then "AI unavailable". The retry sleeps 1.5 s and reuses the model that normally answers in ~20 s.
- **The response now says why:** `RewriteResponse.reason` (`""` on success) plus the `/rewrite` banner's `Reason: …` line (DESIGN_SYSTEM §6, copy added before use). Causes: `no_key` · `model_unavailable` · `rate_limited` · `overloaded` · `unreachable` · `provider_error` · `non_json` · `unexpected_body` · `no_candidate_lines`. Without it, every failure looked identical from the UI.
- **Line filter relaxed (the silently-empty case):** `MIN_LINE_WORDS` 6 → **4**. Real bullets ("Maintained CI pipelines with Jenkins", "Mentored two junior developers weekly") were being excluded, and a resume whose lines are all short or dated yields **zero** candidates — no model call at all, then `mode: fallback`, which the UI reported as "AI unavailable". A zero-candidate run is now `reason: no_candidate_lines` with a warning log carrying the extracted character count.
- **Limits raised for real inputs:** `LLM_TIMEOUT` 60 → **120 s** (observed 47 s and 57 s round-trips would intermittently exceed 60), `max_tokens` 1800 → **3000**, and a `finish_reason == "length"` reply is retried once at double the cap instead of being treated as non-JSON failure.
- **Verified:** `_candidate_lines` on a short-bullet resume → 5 candidates (was 2); `tailor()` live → `mode: llm`, `reason: ""`, changed lines > 0; `python smoke_test.py` **70/70** (new check: `reason` is empty exactly when `mode == "llm"`); `npm run build` green. Honest limit: the 120 s timeout means a genuinely dead provider can leave the page waiting up to two minutes before the (now explained) fallback.

**Gemini API-key dialog (this task — user request):** the rewrite needed a key nobody could supply in production, and the click that starts it was a bare link with no explanation. Clicking `/report`'s `TAILOR MY RESUME →` now opens a modal first:
- **New component (§4 #25, docs written first):** `frontend/src/components/ui/ApiKeyDialog.tsx` — paper sheet over an ink wash, paperclip + mono `GEMINI API KEY`, title `TAILORING NEEDS A KEY`, the reason (Gemini, no shared key), the free-key process as four `AnnotationNumber` steps with the `aistudio.google.com/apikey` link, a mono key field (`AIza…`), the "kept in this tab only" note, primary `TAILOR MY RESUME →` (disabled while empty), plus `CANCEL` / `CONTINUE WITHOUT A KEY`. Escape and backdrop close it; the field auto-focuses.
- **Key handling:** `sessionStorage["gemini_api_key"]` via `readApiKey`/`saveApiKey` in `lib/api.ts` (never localStorage, cleared with the tab), re-prefilled on the next click. `/rewrite` reads it inside its existing effect and adds `api_key` to the POST body **only when present**, so "continue without a key" keeps the old env-key/fallback behaviour.
- **Backend (additive contract):** `RewriteRequest.api_key` (default `""`) → `main.rewrite_resume` → `rewrite.tailor(..., api_key=...)` → `_resolve_key(supplied)` where a supplied key (placeholder rejected like `.env`) wins over `_api_key()`'s environment chain. Never stored, echoed or logged. A rejected supplied key maps 400/401/403 to the new fallback reason **`invalid_key`** (server-key failures keep `provider_error`); `/rewrite`'s reason map and `lib/rewrite.ts` list it.
- **Verified:** frontend `npm run build` ✅ (typecheck + static gen) · backend `py_compile` ✅ + probe: supplied `AIzaTEST` is sent as `Bearer AIzaTEST` while the env placeholder is ignored, `GEMINI_API_KEY` still wins when nothing is supplied, `_resolve_key` returns `""` with neither · `schemas.RewriteRequest` accepts `api_key` · `import main` clean. Honest limits: no live Gemini call was made with a pasted key (needs a real key), and the dialog was not screenshot-checked (build/typecheck only).

### Stack Decision (locked)

- **Frontend:** Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind v4 + lucide-react, in `frontend/`. Fonts via `next/font/google`. Tokens live in `frontend/src/app/globals.css` (`@theme` block mirrors DESIGN_SYSTEM §3).
- **Backend:** Python FastAPI in `backend/` ✅ — `POST /api/analyze` on port 8000 (CORS default = localhost:3000/3100, override with `ALLOWED_ORIGINS` env); extraction pdfplumber/python-docx/txt, matching scikit-learn TF-IDF + dictionary coverage. **Backend decisions (this task):** flat modules — `main.py` (app + CORS + error mapping) · `extraction.py` (5 MB cap; 400/413/422) · `skills.py` (dictionary loader + whole-word alias regex: word-edge guards so `js`≠`json`, `java`≠`javascript`, separators space/hyphen/underscore interchangeable) · `embeddings.py` (weeks 8–9: bi-encoder evidence, lazy singleton, keyword-only fallback) · `matching.py` (scoring + response) · `schemas.py` (Pydantic = contract lock) · `data/skill_dictionary.json` (~130 entries `name/category/aliases/why`, names match copy-deck chips e.g. `Unit-Testing`, `System-Design`). Scoring: `match_score = round(100 × (0.6 × mention-weighted skill coverage + 0.4 × TF-IDF cosine))`, cosine alone if the JD has no dictionary hits; category scores = matched/required (100 when a category isn't requested). Copy-deck strings served verbatim (CI/CD `why`, recommendation pattern, both validation errors). `diff_example` heuristic: insert the top missing skill before the earliest JD-required mention in the resume sentence sharing the most words with that skill's posting context — reproduces the §9 example exactly; empty strings when no sensible anchor exists. `job_title` = first short line, `company` = `Company:`/`About us:` labelled line (best-effort; screens don't render them yet). `backend/smoke_test.py` = re-runnable verification (57 checks).
- **Verification loop:** `npm run build` must pass; visual check = headless Chrome screenshot → downscale via PIL → read + compare to comp → fix drift in one batch. Use `tmp_preview/shot.mjs` (CDP helper, see §0) instead of raw `--screenshot` for interactive or <700px states. (Chrome `--window-size` below ~500px gets clamped on Windows — for exact mobile checks use CDP `Emulation.setDeviceMetricsOverride` *after* navigation.)
- **Manual test recipe (the demo pair — use this when showing the app / testing a change end-to-end):** start the API (`cd backend && python main.py`, port 8000) and the frontend (`cd frontend && npm run build && npm run start -- -p 3100`), then:
  1. `/upload` → drop **`samples/frontend_resume.txt`** (TXT is accepted; PDF/DOCX too) and paste **`samples/frontend_jd.txt`** into the JD box. The pair is the tested one — a `.txt` upload is the path least likely to expose an extractor bug.
  2. Expected on `/results` (last verified): **43%**, categories **67/50/100**, `CI/CD` and `LEADERSHIP` matched **by meaning** (dotted underline), `KUBERNETES`/`AWS`/`MENTORING`/`GRAPHQL` missing, stamps + bars + chips animating. `/report` → the copy-deck recommendation for Kubernetes and a diff that inserts **Kubernetes** before Docker in the deploy bullet.
  3. `/report` → `TAILOR MY RESUME →` → `/rewrite`: review sheet + gap drafts (placeholder `[add metric]` style — nothing invented) and **DOCX / PDF** downloads. The LLM is **Gemini** (`gemini-3.5-flash`, key in `backend/.env`): without a key, on a non-JSON reply or a provider failure the labelled `fallback` mode shows instead of erroring, so a `fallback` banner is a documented state, not a bug.
  4. `/results` → `COMPARE OTHER POSTINGS` → `/compare`: posting 01 is prefilled with the analysed JD; add two more (e.g. a React-only frontend role and a data-analyst role) and submit → ranked cards best-first with score stamp, `BEST MATCH` on #1, the `reason` line, three category bars and the top gaps. Only the analysed resume from step 1 is needed — the screen reads the `resume_text` handoff.
  5. Empty-state checks: open `/rewrite` or `/compare` directly in a fresh tab (no analysis) → each shows the “analyse a resume first” empty state with an upload CTA, never a crash.

- **Testing gotchas:** the first `/api/analyze` of a session loads `all-mpnet-base-v2` (~420 MB cached) and can exceed a 30s client timeout — rerun once warm; kill stale listeners on 8000/3100 first (a stale loopback socket shadows the new server and its old CORS); the resume's `SKILLS` block is one-per-line on purpose (a comma list wins the diff's anchor scoring and hijacks the suggestion).

### API Contract (locked — the backend implements it; frontend wiring is next)

**`POST /api/analyze`** — FastAPI in `backend/` ✅ (port **8000**, CORS via `ALLOWED_ORIGINS` env; implemented + smoke-tested, contract unchanged). Frontend still mocks this shape until the wiring lands.

Request — `multipart/form-data`:

| field | type | notes |
|---|---|---|
| `resume` | file | PDF / DOCX / TXT — sent when user uploads |
| `resume_text` | string | plain-text resume — sent when user pastes (one of the two required) |
| `job_description` | string | required |

Response `200` — `application/json`:

```json
{
  "match_score": 68,
  "matched_skills": [
    {
      "skill": "JavaScript",
      "category": "technical",
      "matched_by": "keyword",
      "similarity": null
    },
    {
      "skill": "Leadership",
      "category": "soft",
      "matched_by": "semantic",
      "similarity": 0.44
    }
  ],
  "missing_skills": [
    {
      "skill": "CI/CD",
      "category": "tools",
      "jd_mentions": 3,
      "why": "Commonly required in modern web development roles, especially for deployment and automation."
    }
  ],
  "categories": { "technical": 80, "tools": 60, "soft": 45 },
  "recommendations": [
    {
      "skill": "CI/CD",
      "category": "tools",
      "jd_mentions": 3,
      "message": "Add a bullet mentioning CI/CD — the posting emphasizes it 3 times."
    }
  ],
  "improvement_plan": [
    "Work CI/CD, TypeScript and AWS into your resume — the posting asks for them 8 times.",
    "Raise soft skills coverage (45%) — describe real work with Leadership in a project or bullet.",
    "Keep React and JavaScript near the top of the resume — your strongest overlaps with this posting.",
    "Open your summary with the posting's own title, Senior Frontend Developer — it is the first line a screener reads."
  ],
  "overall_assessment": "Partial match — 11 of the posting's 22 tracked skills appear, and soft skills is the weakest area at 45%.",
  "job_title": "Senior Frontend Developer",
  "company": "Acme Technologies",
  "diff_example": {
    "original": "Experience with Docker and Kubernetes for containerization and orchestration.",
    "suggested": "Experience with CI/CD, Docker and Kubernetes for containerization and orchestration."
  }
}
```

- `category` ∈ `technical | tools | soft` (drives CategoryBar + chip grouping in screen 04)
- `recommendations` (weeks 10–11) = at most one entry per gap category, strongest gap first; `message` is the §6 copy-deck line verbatim, while `skill` / `category` / `jd_mentions` let `/report` label the card without parsing copy
- `improvement_plan` (week 13) = 1–4 ordered plain-language steps for `/results`, derived deterministically from the same numbers: work the posting's top gaps (by mention count) into the resume → raise the weakest category → keep the strongest keyword overlaps near the top → open the summary with the posting's own title. No skill is ever asserted as present
- `overall_assessment` (week 13) = one sentence banded on the score (≥70 strong · 45–69 partial · <45 weak), plus explicit all-covered and no-tracked-skills cases; templates are the DESIGN_SYSTEM §6 patterns
- `matched_by` ∈ `keyword | semantic` (weeks 8–9) — `semantic` = the embeddings layer found evidence the resume words it differently; `similarity` is the cosine (0–1) for those, `null` for keyword hits
- Errors: `400` unsupported file type · `413` file too large · `422` no extractable text · `500` pipeline failure — FastAPI default body `{ "detail": "..." }`
- **Mid-sem scope of this contract:** `match_score`, `matched_skills`, `missing_skills` (skill/category), `categories`, `job_title`, `company` — from dictionary + TF-IDF. `jd_mentions`/`why`/`recommendations` are cheap to derive mid-sem (mention counts); `diff_example` may be heuristic mid-sem and becomes the LLM feature end-sem (field stays, implementation upgrades)
- **Screen → fields:** 04 results → score/categories/matched/missing + `improvement_plan`/`overall_assessment` (the improvement block) · 05 gap report → missing.why/recommendations/diff_example · upload → request side · /compare → `/api/compare` ranking (`rank`/`reason` drive the cards)
- `resume_text` (week 12) — the extracted resume body is echoed in the analyze response so `/rewrite` can reuse it; it is not analysis data, it is the handoff for the generator
- `resume_layout` (week 13) — the uploaded page's measured format, from `backend/layout.py`: `page` (pts), `margin` (top/bottom/left/right), `font` (family + bold/italic cuts), `size` (name/contact/heading/body/subtitle/bullet), `leading` (body, `heading_before`, `heading_rule`, `rule_after`, `rule` thickness), `color` (text/muted), `bullet` (char/indent) and `roles` — one role per resume line (`name` · `contact` · `heading` · `label` · `title` · `subtitle` · `bullet` · `body` · `blank`). Measured with pdfplumber for a PDF (`page.lines` give the header rules), section geometry for a DOCX; pasted text and TXT get `layout.TEMPLATE` — the reference resume's design. The client stores it beside `resume_text` and posts it back on export
- **`POST /api/rewrite`** (week 12, JSON `{resume_text, job_description, api_key?}`) → `RewriteResponse`: `mode` (`llm` | `fallback`), `reason` (`""` on success; otherwise `no_key` · `model_unavailable` · `rate_limited` · `overloaded` · `unreachable` · `provider_error` · `non_json` · `unexpected_body` · `no_candidate_lines` — the screen prints it under the fallback notice), `model`, `revised_resume`,  — provider: **Google Gemini** (`gemini-3.5-flash`, with a `gemini-3.8-flash` → `gemini-flash-latest` ladder for retired/overloaded names) through its OpenAI-compatible endpoint (`LLM_BASE_URL` default `https://generativelanguage.googleapis.com/v1beta/openai`); the key is `GEMINI_API_KEY` in `backend/.env`, read at import by `rewrite.py` (shell env wins; missing/placeholder key → `fallback`). Details below: `rewrites[]` (`id`, `original`, `revised`, `changed`, `note`), `additions[]` (`skill`, `category`, `draft` with `[...]` placeholders, `note`), `stats` (`candidates`, `changed`, `rejected`). Guarded: no new numbers, no unevidenced/unblocked skills (above all a *missing* skill), ≤180% line growth; rejected lines keep their original text. No key / network failure / off-spec JSON → `mode: "fallback"` with the resume unchanged and template drafts (never an error)
- **`POST /api/rewrite/export`** (week 12, JSON `{resume_text, format: "docx" | "pdf"}`, plus optional `layout` = the profile `/api/analyze` measured) → file with `Content-Disposition: attachment; filename="tailored-resume.<ext>"`; `400` for empty text or an unsupported format. Renders the client's *current* text — nothing is stored. With `layout` the document is rebuilt in the uploaded resume's own format (`export.py`): page size, margins, per-role type sizes and leading, the rules under section headings, bullet indent and the bold inline labels all come from the profile, and `roles` says what each line is. Missing/partial `layout` → `layout.TEMPLATE` (reference design), which is also what the gap report uses
- **`POST /api/report/export`** (follow-up, JSON = the analysis minus `resume_text`, plus `format: "docx" | "pdf"`, default `pdf`) → the gap report as a document, `filename="gap-report.<ext>"`; `400` unsupported format · `500` render failure. `report.py` turns the payload into text (role, score, category breakdown, matched/missing grouped by category with `why` + mention counts, recommendations, example diff) and `export.build(..., title=...)` renders it; the client spreads the analysis it is looking at, so the file always matches the screen
- **`POST /api/compare`** (week 12 stretch, JSON `{resume_text, job_descriptions: string[2..3]}`) → `{postings: [{rank, job_title, company, match_score, categories, missing_skills, reason}]}` sorted best-first; `400` empty resume · `422` fewer than two / more than three postings · `500` pipeline failure. `reason` is the "and why" line, derived deterministically from the score and top gap
- **Planned frontend routes:** `/` ✅ · `/upload` ✅ (screen 03 analyzing = in-page state of `/upload` — confirmed) · `/results` ✅ (mock fallback) · `/report` ✅ (mock fallback) · `/rewrite` ✅ (week 12, reads the sessionStorage handoff; empty state when there is none) · `/compare` ✅ (week 12 stretch; same handoff, prefills posting 01 with the analysed JD)

### Current Project Files

```
context.md            ← this file (single source of project context)
DESIGN_SYSTEM.md      ← design tokens, 22 components, rules, copy deck (extracted from comps)
PROMPTS.md            ← DALL·E prompts (already used — kept for future variants)
comps/                ← 8 generated comps (source of truth for look)
frontend/             ← Next.js 16 app (landing + upload/analyzing + results + gap-report screens); run: cd frontend && npm run build && npm run start -- -p 3100
backend/              ← FastAPI API (POST /api/analyze: extraction → skill dictionary → TF-IDF); run: cd backend && python main.py (port 8000) · verify: python smoke_test.py
tmp_preview/          ← scratch: shot.mjs CDP screenshot helper (+ E2E `real` mode), probe.mjs computed-style probe, fixtures/ (resume.pdf, jd.txt), drift-check shots
samples/              ← sample resume + job-description text pairs for hands-on testing — 1 pair of the §10 10–15 target: `frontend_resume.txt` + `frontend_jd.txt` (verified against the API: 43%, categories 67/50/100, CI/CD + Leadership promoted by meaning, diff inserts Kubernetes before Docker in the deploy bullet; the resume's SKILLS section is one-per-line on purpose — a comma list wins the diff's anchor scoring and hijacks the suggestion; full click-through script in §9 → Verification loop → *Manual test recipe*)
tech_stack.txt        ← plain-text inventory of the full stack (frontend/backend/tooling) — regenerate when the stack changes
Tech_Stack_and_Architecture.pdf  ← tech stack + architecture reference (18pp; source: tmp_preview/tech_stack_doc.html — edit that + re-print to regenerate)
MiniProject_MidSem_Report.pdf
project_overview.pdf
semester_plan.pdf
```

**Next step:** ~~wire the flow~~ ✅ **done (E2E-verified)** — **collect the 10–15 sample resumes + JDs** (§10, anonymized) so scoring gets exercised on real data; then mobile results (06), OG image (07), empty state (08) → ~~decide `/results` ↔ `/report` navigation~~ ✅ (primary `VIEW GAP REPORT →` CTA on `/results`) → assemble + drift-check all screens → **deploy (Week 7; frontend `NEXT_PUBLIC_API_URL` + backend `ALLOWED_ORIGINS` to the deployed origins)**. **End-sem (active):** ~~weeks 10–11 point 1 (skill categorization)~~ ✅, ~~point 2 (categorized suggestions)~~ ✅, ~~week 12 point 1 (LLM resume rewrite + review + DOCX/PDF)~~ ✅ and ~~week 12 stretch (multi-job comparison)~~ ✅ done; **next = week 13** (5+ real resumes/postings, edge cases — the 10–15 sample set is still the blocker; re-tune `SEMANTIC_THRESHOLD` 0.50 on it). The week-13 improvement block shipped ✅ (`improvement_plan` / `overall_assessment` on `/api/analyze` → `/results`).

---

## 10. Definition of Done for Mid-Sem

**Acceptance target = the 4 deliverables asserted in `MiniProject_MidSem_Report.pdf`:** ① end-to-end tool (upload → parse → match → results UI) · ② keyword-based gap detection (TF-IDF / overlap) · ③ live deployment · ④ written report (✅ done). Report gap-analysis (claim → actual): extraction ✅ · skill dictionary+regex ✅ · scoring ✅ · results UI ✅ · wiring ✅ (upload → POST `/api/analyze` → sessionStorage → `/results`, E2E-verified with real data) · deployment ❌ · sample data ❌ · backend stack ✅ · upload UI ✅ · report ✅. Note: the report calls skill categorization and actionable suggestions *end-sem limitations* — comp 04's category bars are cheap (dictionary carries category) so build them; comp 05 suggestion cards are beyond the report's minimum but still planned (see §9).

- [x] Frontend stack set up (Next.js 16 + Tailwind v4 in `frontend/`; landing live)
- [ ] 10–15 sample resumes + job postings collected (Weeks 1–2) — 1 tested pair lives in `samples/` (frontend); the bulk anonymized set is still open
- [x] PDF/DOCX → clean text extraction pipeline working (Weeks 3–4) — `backend/extraction.py`, smoke-tested with a real PDF + generated DOCX + TXT
- [x] Skill/keyword extraction via predefined dictionary + regex (Weeks 3–4) — `backend/skills.py` + `data/skill_dictionary.json` (~130 entries)
- [x] TF-IDF / keyword-overlap scoring producing match % + missing-keyword list (Weeks 5–6) — `backend/matching.py` (0.6 coverage + 0.4 TF-IDF cosine); `python backend/smoke_test.py` = 29/29
- [x] Clean UI: upload resume, paste job posting, view results (Week 7) — all three screens built; wired end-to-end (real analysis renders on `/results`)
- [ ] Deployed working version (Week 7)
- [x] Mid-sem report written: problem statement, approach, current limitations, next steps (Week 7) — exists as `MiniProject_MidSem_Report.pdf` (this is the §10 acceptance target; claims now tracked in the gap-analysis above)
