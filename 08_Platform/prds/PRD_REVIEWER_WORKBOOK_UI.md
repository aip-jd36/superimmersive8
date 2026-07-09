# PRD: Reviewer Workbook UI
## Internal Admin Tool — Guided Assessment Interface

**Version:** 1.2
**Status:** Design Complete — Ready to Build
**Routes:** `/admin/submissions/[id]` (delivery panel) · `/admin/submissions/[id]/review` (workbook)
**Audience:** SI8 internal reviewers only — never customer-facing
**Business context:** Extends the admin panel with two connected features: (1) a guided assessment workbook replacing the basic reviewer checklist, and (2) a Sign & Deliver panel for provenance signing via Numbers Protocol Capture API. Together these handle the full post-payment workflow through to signed video delivery.
**Companion documents:**
- `SI8-Reviewer-Workbook-Schema-v0.1.md` — source of truth for all workbook fields
- `SI8-Reviewer-Manual-v0.1.md` — guidance content embedded in the workbook UI
- `SI8-Assessment-Report-Template-v0.2.md` — the deliverable the workbook feeds
- `tools/report-pipeline/si8-report-template.typ` — Typst pipeline the UI generates output for
- `06_Operations/provenance/SI8-Provenance-Manifest-Specification-v0.1.md` — Zone A field definitions fed to the Capture API

---

## What This Is

The Reviewer Workbook UI is a structured, guided web form for SI8's internal reviewers to conduct a Campaign Assurance Assessment. It replaces the existing basic checklist in the admin panel and implements the full Reviewer Workbook Schema — 16 controls across 7 domains, an Evidence Gap Log, a Findings Log, an Overall Assessment, and a Report Brief that generates a pre-filled Typst source file.

The full feature has four jobs:
1. **Structure the assessment** — enforce the workbook sequence and prevent findings from being skipped
2. **Surface context** — make the submission data, evidence files, and reviewer guidance accessible without leaving the page
3. **Generate the report** — output a pre-filled `.typ` file ready for the Typst pipeline
4. **Sign the video** — after the report PDF is finalized, embed C2PA credentials into the source MP4 via Numbers Protocol Capture API and store the signed video for delivery

---

## What This Is Not

- A customer-facing page — submitters never see this
- A chat or AI-assisted tool — the reviewer makes all judgments; the UI records them
- A replacement for the Reviewer Manual — the Manual content is embedded as reference, not as instruction
- A report editor — the UI generates a Typst source file; editing and final PDF compilation happen in the Typst pipeline
- A fully automated delivery pipeline — signing triggers a human-confirmed action; email delivery remains manual per the Report Delivery SOP

---

## Who Uses It

**Year 1:** JD Chang — sole reviewer and admin. The UI must work well for a single reviewer who is also the business owner. No multi-user workflow needed in Year 1.

**Year 2+:** Additional reviewers may be onboarded. The UI should not require any architectural changes to support a second reviewer — the data model should be reviewer-attributed from day one.

---

## Product Decisions & Rationale

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Layout | Three-zone layout: left nav, center workbook, right context panel | Reviewer needs submission data, evidence files, and guidance accessible without switching tabs. Three zones make this possible without constant navigation. |
| Navigation | Free — reviewer can jump to any section; Section 6 gated until Sections 1–5 complete | Assessment evidence is not always reviewed linearly. Forcing linear progression creates friction when the reviewer needs to return to an earlier domain. Section 6 (Report Brief) must not be available until all required fields are populated — it synthesizes the work, not replaces it. |
| Auto-save | Yes — every 30 seconds and on field blur; "Last saved: X min ago" indicator | A 90-minute review session cannot afford to lose work to a browser close or navigation error. |
| Guidance embedding | Right context panel — toggled per domain | Always-visible guidance takes too much screen space. Tooltips are too small for the Manual's domain guidance text. A right panel that opens when the reviewer clicks "View Guidance" for a domain gives full access without displacing the form. |
| Video access | Button opens video in new tab | Don't embed — streaming adds complexity and the reviewer will naturally position the video in a separate window alongside the workbook. |
| Receipt preview | Inline lightbox — click thumbnail to expand | Reviewer needs to cross-reference receipt dates against production dates without leaving the page. Download requires an extra step and a separate application. |
| Judgment inputs | Four-option dropdown per control: Verified / Partially Verified / Not Provided / Not Applicable | Matches the Workbook Schema exactly. Dropdown enforces valid values. |
| Report generation | Downloads pre-filled `.typ` file | Year 1: Typst compiles locally. Server-side Typst is not needed. The UI extracts Section 6 fields and injects them into the report template, producing a ready-to-compile source file. |
| DB storage | New column `workbook_data JSONB` on `submissions` table; deprecate `reviewer_checklist` | `reviewer_checklist` was designed for the basic 6-step checklist. The full workbook is structurally different. A new column is cleaner than retrofitting. The old column is retained for backward compatibility on existing submissions. |
| Assessment ID | Auto-generated from assessment date and sequential number | Format: `ASSESS-[NNN]-YYYY-MM-DD`. Generated when the reviewer opens the workbook for the first time. Stored on the submission record. |
| MP4 acquisition | Admin-side upload on the submission detail page — added after creator provides the file | CertForm only collects a video URL. The raw MP4 is needed for C2PA signing. Admin requests it post-payment via email and uploads when received. Stored in Supabase Storage (`source-videos` bucket). |
| Numbers credential gating | `NUMBERS_API_KEY` env var presence controls UI state | When not configured: Sign & Deliver panel shows "Awaiting Numbers Protocol credentials" and disables the sign button. When configured: full signing flow available. This allows the UI to be built and deployed before credentials arrive, with a clean activation path. |
| Signing placement | Sign & Deliver panel lives on the submission detail page, not inside the workbook | The workbook is a focused assessment tool. Signing is a delivery action that happens after the workbook is complete and the PDF is ready. Mixing them would force the reviewer to stay in the workbook until delivery is done — wrong mental model. |

---

## Screen Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER BAR                                                      │
│  Assessment ID: ASSESS-001-2026-07-09  ·  Cloud World  ·  ●●○○○○│
│  [Open Video ↗]  [View Submission]  Last saved: 2 min ago       │
└─────────────────────────────────────────────────────────────────┘

┌──────────┐ ┌─────────────────────────────┐ ┌──────────────────┐
│          │ │                             │ │                  │
│   LEFT   │ │      CENTER                 │ │   RIGHT          │
│   NAV    │ │      WORKBOOK FORM          │ │   CONTEXT PANEL  │
│          │ │                             │ │                  │
│ § 1      │ │  [Active section content]   │ │  Tabs:           │
│ § 2 ○    │ │                             │ │  Submission      │
│ § 3A ○   │ │                             │ │  Evidence Files  │
│ § 3R ○   │ │                             │ │  Guidance        │
│ § 3H ○   │ │                             │ │                  │
│ § 3I ○   │ │                             │ │  (content        │
│ § 3L ○   │ │                             │ │   updates per    │
│ § 3T ○   │ │                             │ │   active domain) │
│ § 3D ○   │ │                             │ │                  │
│ § 4      │ │                             │ │                  │
│ § 5      │ │                             │ │                  │
│ § 6      │ │                             │ │                  │
│ § 7 🔒   │ │                             │ │                  │
│          │ │                             │ │                  │
└──────────┘ └─────────────────────────────┘ └──────────────────┘
```

**Left nav:** Section list with status indicators. ● = complete, ○ = not started, ◐ = in progress. § 7 shows a lock icon until Sections 1–6 are complete.

**Center:** Active workbook section. Scrolls independently.

**Right context panel:** Three tabs:
- **Submission** — submission overview (auto-populated from CertForm data): title, duration, tools, territory, intended use, logline, authorship statement, all disclosure answers
- **Evidence Files** — thumbnails of all uploaded files (receipts, releases, licenses); click to expand in lightbox
- **Guidance** — content from Part 4 of the Reviewer Manual for the currently active domain; updates automatically as the reviewer navigates between domains

---

## Dashboard Placement

The feature spans two pages within the existing admin dashboard layout (the `app/admin/layout.tsx` nav and Admin badge carry through to both):

### Page 1: Submission Detail — `/admin/submissions/[id]`

This page already exists. It gains two new sections below the existing submission data:

**Section: Source Video**
- Shows the creator's submitted video URL (YouTube/Vimeo link)
- Upload field for the raw MP4 — "Upload Source Video (MP4/MOV)" → Supabase Storage `source-videos/[id]/original.[ext]`
- Once uploaded: shows filename, file size, upload date, and a "Replace" button

**Section: Sign & Deliver** *(see full spec below)*
- Appears after source video is uploaded + workbook is complete + report PDF is uploaded
- Contains the Numbers Protocol signing flow

**Entry point to workbook:**
- "Start Review" button → `/admin/submissions/[id]/review`
- After workbook is started, button changes to "Continue Review" with workbook progress (e.g., "4/6 sections complete")
- After workbook is complete, shows "Review Complete ✓" with a link back to edit

### Page 2: Workbook — `/admin/submissions/[id]/review`

Full-page three-zone layout described above. Uses the existing admin layout shell (nav, Admin badge) but the content area is overridden to the three-zone workbook layout — no standard page padding or max-width container.

Back link in header → `/admin/submissions/[id]`

---

## Section Specifications

### Section 1 — Intake & Scope

**Auto-populated fields** (pulled from submission, editable by reviewer):

| Field | Source |
|-------|--------|
| Assessment ID | Auto-generated on first open |
| Submission ID | From submission record |
| Reviewer name | From admin auth session |
| Assessment date | Today's date |
| Content title | From CertForm Section 2 |
| Format / specs | From CertForm: runtime, genre |
| Stated commercial use | From CertForm: intended use + distribution channels |
| Intended territory | From CertForm Section 9 |
| AI tools declared | From CertForm Section 2 tool list |

**Reviewer-entered fields:**

- Campaign description (free text, reviewer's own words — 1–3 sentences)
- Assessment start time (auto-set on page open, editable)

**Pre-assessment scope checklist** (5 checkboxes — must all be checked to proceed):

- [ ] No List reviewed — no items triggered
- [ ] Evidence Custodian Declaration signed
- [ ] Indemnification warranty confirmed
- [ ] Video accessible and plays correctly
- [ ] Submission is SI8 Certified tier

**Scope limitations** (free text, optional): "Any limitations on scope that will affect the assessment."

**Gate:** All 5 scope checkboxes must be checked before Section 2 becomes available.

---

### Section 2 — Visual Review

**Purpose:** Independent reviewer observation of the video content, recorded before consulting the submitter's declarations. These are raw observations — not judgments. The reviewer watches the video and records what they see. Nothing here references what the submitter claimed.

**Design rule:** No judgment fields in this section. No "does this match the submission?" No pass/fail. Only "what did I observe?"

**Gate:** Must be complete (all required fields filled) before Section 3 (Evidence Checklist) becomes available. Completing this section triggers a milestone snapshot.

**Video confirmation:**
- Video URL / file reviewed (auto-populated from submission, confirm before watching)
- Number of full watches completed: [number — minimum 1 required]

**Basic content observations:**

| Field | Type |
|-------|------|
| Runtime (seconds, observed) | Number |
| Aspect ratio | Dropdown: 16:9 / 9:16 / 1:1 / 4:3 / Other |
| Estimated scene count | Number |
| Color treatment | Dropdown: Full color / Black & white / Stylized / Mixed |
| Pacing | Dropdown: Single continuous shot / Slow cuts / Fast cuts / Mixed |

**Characters and people:**

| Field | Type |
|-------|------|
| Synthetic human figures present | Dropdown: Yes / No / Unclear |
| Real human likeness suspected | Dropdown: Yes / No / Unclear |
| If yes — describe | Textarea |
| Animals present | Yes / No |
| Children present | Yes / No |

**Audio observations:**

| Field | Type |
|-------|------|
| Video has audio | Yes / No |
| Music heard | Yes / No / Unclear |
| Speech or dialogue heard | Yes / No |
| Sound effects heard | Yes / No |
| Audio quality issues | None / Minor / Significant |

**Visual IP elements observed:**

| Field | Type |
|-------|------|
| Visible brand logos | Dropdown: None / Possibly / Clearly visible — describe |
| Visible product packaging or trademarks | Dropdown: None / Possibly / Clearly visible — describe |
| Visible text (on-screen words, signs, labels) | Yes / No; if Yes — describe |
| Recognizable landmark or architecture | Yes / No; if Yes — describe |
| Copyrighted artwork, imagery, or illustration | Dropdown: None / Possibly / Clearly visible — describe |

**Technical quality:**

| Field | Type |
|-------|------|
| AI generation artifacts (flickering, morphing, inconsistency) | None / Minor / Significant |
| Temporal consistency issues (physics, lighting, continuity) | None / Minor / Significant |
| Overall visual quality | Dropdown: High / Acceptable / Poor |

**Unexpected observations:**

| Field | Type |
|-------|------|
| Did the video contain anything not suggested by the submission? | Yes / No |
| If yes — describe | Textarea (required if Yes) |

**Freeform reviewer observations** (textarea, required — minimum 50 words):
*"Record anything notable about the video in your own words. This is your independent account of what you saw."*

---

### Section 3 — Evidence Checklist (7 Domains, 16 Controls)

**Purpose:** Reviewer judgments on the submitted evidence, cross-referenced against the Section 2 independent observations. The distinction is explicit: Section 2 is what the reviewer saw; Section 3 is how the submitted evidence holds up.

Each domain is a collapsible accordion panel. All domains are expanded by default on first open. Completing all 16 controls triggers a milestone snapshot.

**Per-control field set:**

| Field | Type | Notes |
|-------|------|-------|
| Evidence reviewed | Textarea | What was submitted — specific, not generic |
| Judgment | Dropdown | Verified / Partially Verified / Not Provided / Not Applicable |
| Notes | Textarea | Placeholder text is conditional: when Judgment = Verified or N/A → "Observations, questions, anything notable." When Judgment = Partially Verified or Not Provided → "Why was this judgment selected? What specific evidence limitation or gap led to this conclusion?" Same field, same schema — the prompt changes to capture reasoning when the judgment is uncertain. This preserves reviewer thinking for future Manual v0.2 development without adding a second field. |
| Domain-specific fields | Varies | See below |

**Domain-specific fields** (in addition to the standard set):

**Domain A (1 control — A01):**
- No additional fields

**Domain R (4 controls):**
- R01: No additional fields
- R02: Tools reviewed (list), License status (per tool), Receipts provided (Yes / No / Partial)
- R03: Custom model used (Yes / No); if Yes: training data source (text), licensing documented (Yes / No / Partial)
- R04: Tool ToS output rights summary (text), Work-for-hire agreement provided (Yes / No / Not provided)

**Domain H (2 controls):**
- H01: Nature of contribution (text), Level of contribution (dropdown: Substantial / Moderate / Minimal / Unknown)
- H02: Copyright claim made (Yes / No / Not stated); if Yes: basis (text), Assessment (dropdown: Sufficient / Insufficient / Cannot assess)

**Domain I (3 controls):**
- I01: Content viewed (Yes / No), Copyrighted elements identified (dropdown: None / Suspected / Confirmed), Submitter's disclosure summary (text)
- I02: Audio source declared (dropdown: AI-generated / Licensed / Mixed / Not stated), License documentation provided (Yes / No / Partial), Audio content reviewed directly (Yes / No)
- I03: Trademark elements identified (dropdown: None / Suspected / Confirmed), Submitter's disclosure summary (text)

**Domain L (3 controls):**
- L01: Content viewed for likeness (Yes / No), Real person likeness (dropdown: None identified / Suspected / Confirmed — describe)
- L02: AI-generated performers present (Yes / No); if Yes: distinctness assessment (dropdown: Clearly synthetic / Resembles [description] / Resembles a specific identifiable person)
- L03: Real person likeness confirmed (Yes / No); if Yes: documentation type (dropdown: Talent release / Right of publicity license / Other), documentation provided (Yes / No)

**Domain T (1 control — T01):**
- Workflow description provided (Yes / No / Partial), Prompt logs provided (Yes / No / Not applicable), Output file metadata provided (Yes / No / Not applicable), Workflow coherence (dropdown: Consistent / Inconsistent / Cannot assess)

**Domain D (2 controls):**
- D01: Date consistency (dropdown: Consistent / Inconsistent), Tool version consistency (dropdown: Consistent / Inconsistent), Receipt dates vs. generation dates (dropdown: Consistent / Inconsistent / Cannot verify)
- D02: Indicators of retroactive documentation (dropdown: None / Suspected / Confirmed), Basis for assessment (text)

**Evidence Checklist Summary** (auto-calculated, displayed at bottom of Section 3):
- Verified: N / Partially Verified: N / Not Provided: N / Not Applicable: N

**Required to complete Section 3:** All 16 controls must have a Judgment selected (any value). Notes are optional but strongly encouraged by inline helper text.

---

### Section 4 — Evidence Gap Log

Displayed only if any control in Section 3 has Judgment = "Not Provided" or "Partially Verified."

If all controls are Verified or Not Applicable, shows: *"No material evidence gaps to log. Proceed to Section 5."*

**Per-gap entry** (gaps are auto-seeded from Section 3 Not Provided / Partially Verified controls; reviewer edits them):

| Field | Type |
|-------|------|
| Gap ID | Auto: G01, G02... |
| Related control | Auto-populated from Section 2 |
| What is missing | Textarea |
| Addressable? | Dropdown: Yes / No / Unknown |
| Commercial impact | Dropdown: Low / Medium / High |
| Impact description | Textarea |

**Gap summary** (auto-calculated):
- Total gaps: N · High: N · Medium: N · Low: N · Addressable: N

---

### Section 5 — Findings Log

Free-form findings section. Minimum 1 finding required; aim for 3–8. Completing this section triggers a milestone snapshot.

**Add Finding** button creates a new entry:

| Field | Type |
|-------|------|
| Finding ID | Auto: F01, F02... |
| Domain | Dropdown: A / R / H / I / L / T / D |
| Finding | Textarea |
| Evidence basis | Textarea |
| Commercial impact | Dropdown: Low / Medium / High |
| Addressable? | Dropdown: Yes / No / Conditional |

**Required to complete Section 5:** At least 1 finding entered.

---

### Section 6 — Overall Assessment

Completing sign-off in this section triggers the final milestone snapshot.

**Commercial assessment** (included in the report):

| Field | Type | Notes |
|-------|------|-------|
| Assessment outcome | Radio (5 options) | Evidence Supports / Evidence Supports with Conditions / Material Risks / Insufficient Evidence / Unable to Reach Assessment |
| Outcome basis | Textarea | 2–4 sentences; reference Finding IDs |
| Conditions | Repeating text entries | Shown only if outcome = "with Conditions" |
| Commercial confidence | Radio: High / Moderate / Low | Goes in the report — SI8's confidence in the outcome for the buyer's purposes |
| Commercial confidence basis | Textarea | |

**Reviewer confidence** (internal only — not included in the Typst output):

| Field | Type | Notes |
|-------|------|-------|
| Evidence quality rating | Radio: High / Moderate / Low | Reviewer's confidence in the completeness and readability of the evidence itself |
| Evidence quality notes | Textarea | Specific concerns: poor-resolution receipts, missing metadata, unreadable timestamps, video quality limitations, inconsistent workflow descriptions. Used in Post-Assessment Reviews. |

*Design note: When the Case Library is built, this section will display "Similar Assessments" (same outcome, same domain gaps) to reinforce reviewer consistency. No architecture needed now — `workbook_data` is queryable. The UI should not create layout patterns that make adding a sidebar here difficult.*

| Field | Type | Notes |
|-------|------|-------|
| Reviewer sign-off | Checkbox | "I confirm this assessment is complete and reflects my independent judgment" |
| Assessment end time | Auto-set on sign-off, editable | |
| Total time | Auto-calculated from start/end | |

**Gate for Section 7:** All fields in Section 6 must be complete + sign-off checked.

---

### Section 7 — Report Brief + Report Generation

**Report Brief fields** (free text — transferred to the Typst template):

| Field | Notes |
|-------|-------|
| Executive summary | 2–4 sentences |
| Evidence reviewed | Bullet list (add/remove items) |
| Key findings | 3–6 bullets |
| Overall assessment statement | 1–2 sentences matching Section 5 outcome |
| Residual commercial risks | 2–4 bullets |
| Recommended next steps | 2–4 actionable items |

**Auto-populated from prior sections** (editable):
- Assessment outcome — pulled from Section 6
- Commercial confidence level — pulled from Section 6
- Evidence reviewed list — seeded from Section 3 (what was reviewed per domain)
- Key findings — seeded from Section 5 findings

**Generate Report Source** button:

On click:
1. Validates all required fields are complete
2. Opens a **Review Before Generating** modal:
   - Formatted display of all Section 7 inputs: executive summary, evidence reviewed bullets, key findings, overall statement, residual risks, next steps
   - Not a full PDF render — a clean readable preview of the content that will populate the Typst template
   - "Edit" button returns to the form; "Generate .typ" proceeds to download
3. On confirm: injects Section 7 content + workbook metadata into the Typst report template
4. Downloads `[ASSESS-ID].typ` — a pre-filled source file ready for `typst compile`
5. Displays a confirmation modal with the Assessment ID, compile command, and delivery checklist reminder

**Post-Assessment Notes** (free text, below Report Generation — internal only, not in the Typst output):
- What was unclear or ambiguous in the workbook?
- What took longer / shorter than expected?
- Evidence not covered by any workbook field?
- Recommended changes for Workbook v0.2?

---

## Header Bar

Always visible, sticky. Contains:

| Element | Content |
|---------|---------|
| Assessment ID | ASSESS-NNN-YYYY-MM-DD |
| Content title | Truncated, max 40 chars |
| Progress indicator | 6 dots: Section 1 · Section 2 · Section 3 · Sections 4-5 · Section 6 · Section 7 |
| Open Video button | Opens screening link in new tab |
| View Submission button | Opens full CertForm submission in a side drawer |
| Auto-save indicator | "Last saved: X min ago" / "Saving..." / "Save failed — click to retry" |

---

## Right Context Panel — Guidance Tab

Content is dynamic: when the reviewer is active in a domain section, the Guidance tab shows the relevant content from Part 4 of the Reviewer Manual (Domain Guidance).

| Active domain | Guidance content shown |
|---------------|----------------------|
| Section 2 | Visual Review guidance — what to look for, how to record observations independently of declarations |
| A | Identity & Accountability domain guidance |
| R | Commercial Rights & Licensing domain guidance |
| H | Human Creative Contribution domain guidance |
| I | Third-Party IP domain guidance |
| L | Likeness & Performer Rights domain guidance |
| T | Technical Provenance domain guidance |
| D | Documentation Integrity domain guidance |
| Section 6 | Assessment Outcome decision logic (Part 5 of Manual) |
| Section 7 | Report language guidance (Part 6 of Manual) |

Guidance content is stored as static MDX or plain text in the codebase — not fetched from the database. Updates to the Manual require a code update to the guidance content.

---

## DB Schema Changes

**New columns on `submissions` table:**

```sql
ALTER TABLE submissions
-- Workbook
ADD COLUMN workbook_data        JSONB,
ADD COLUMN assess_id            TEXT,
ADD COLUMN review_started_at    TIMESTAMPTZ,
ADD COLUMN review_completed_at  TIMESTAMPTZ,
ADD COLUMN review_total_minutes INTEGER,
-- Report
ADD COLUMN report_pdf_url       TEXT,
ADD COLUMN report_hash          TEXT,          -- hash of delivered PDF
ADD COLUMN report_hash_algorithm TEXT DEFAULT 'SHA256',
-- Source video
ADD COLUMN source_video_url     TEXT,          -- Supabase Storage path to raw MP4
ADD COLUMN source_video_filename TEXT,
-- Provenance / Numbers
ADD COLUMN provenance_status    TEXT DEFAULT 'not_started',
                                               -- not_started | signing | signed | delivered
ADD COLUMN numbers_asset_id     TEXT,          -- Numbers Protocol CID
ADD COLUMN numbers_verify_url   TEXT,          -- verify.numbersprotocol.io URL
ADD COLUMN numbers_signed_at    TIMESTAMPTZ,
ADD COLUMN signed_video_url     TEXT,          -- Supabase Storage path to signed MP4
ADD COLUMN delivered_at         TIMESTAMPTZ;
```

**`workbook_data` JSONB structure:**

```json
{
  "workbook_version": "0.2",
  "section_1": { "overview": {}, "scope_checks": {}, "limitations": "" },
  "section_2": {
    "video_url_confirmed": "",
    "watches_completed": 1,
    "runtime_observed": 0,
    "aspect_ratio": "",
    "scene_count": 0,
    "color_treatment": "",
    "pacing": "",
    "synthetic_humans": "",
    "real_likeness_suspected": "",
    "real_likeness_description": "",
    "animals_present": false,
    "children_present": false,
    "has_audio": false,
    "music_heard": "",
    "speech_heard": false,
    "sound_effects": false,
    "audio_quality_issues": "",
    "logos_observed": "",
    "logos_description": "",
    "trademarks_observed": "",
    "trademarks_description": "",
    "text_visible": false,
    "text_description": "",
    "landmarks_observed": false,
    "landmarks_description": "",
    "copyrighted_artwork": "",
    "copyrighted_artwork_description": "",
    "ai_artifacts": "",
    "temporal_consistency": "",
    "visual_quality": "",
    "unexpected_content": false,
    "unexpected_description": "",
    "freeform_observations": ""
  },
  "section_3": {
    "A01": { "evidence": "", "judgment": "", "notes": "" },
    "R01": { "evidence": "", "judgment": "", "notes": "" },
    "R02": { "evidence": "", "judgment": "", "notes": "", "tools_reviewed": [], "license_status": "", "receipts": "" },
    "R03": { "judgment": "", "custom_model": false },
    "R04": { "evidence": "", "judgment": "", "notes": "", "tos_summary": "" },
    "H01": { "evidence": "", "judgment": "", "notes": "", "contribution_level": "" },
    "H02": { "judgment": "", "copyright_claim": "", "assessment": "" },
    "I01": { "evidence": "", "judgment": "", "notes": "", "content_viewed": false, "elements_identified": "" },
    "I02": { "judgment": "", "audio_source": "", "license_provided": "" },
    "I03": { "judgment": "", "trademark_elements": "" },
    "L01": { "judgment": "", "content_viewed": false, "likeness_found": "" },
    "L02": { "judgment": "", "performers_present": false, "distinctness": "" },
    "L03": { "judgment": "", "documentation_type": "", "documentation_provided": "" },
    "T01": { "evidence": "", "judgment": "", "notes": "", "workflow_coherence": "" },
    "D01": { "judgment": "", "date_consistency": "", "version_consistency": "" },
    "D02": { "judgment": "", "retroactive_indicators": "" }
  },
  "section_4": { "gaps": [] },
  "section_5": { "findings": [] },
  "section_6": {
    "outcome": "",
    "basis": "",
    "conditions": [],
    "commercial_confidence": "",
    "commercial_confidence_basis": "",
    "reviewer_confidence": "",
    "reviewer_confidence_notes": "",
    "signed_off": false
  },
  "section_7": { "executive_summary": "", "evidence_reviewed": [], "key_findings": [], "overall_statement": "", "residual_risks": [], "next_steps": [] },
  "post_assessment_notes": { "unclear": "", "timing": "", "uncaptured_evidence": "", "recommendations": "" }
}
```

**Migration file:** `20260710000000_add_workbook_data.sql`

**Existing `reviewer_checklist` column:** Retained as-is. New workbook uses `workbook_data`. Old submissions with `reviewer_checklist` data continue to display the old checklist view.

**New table: `workbook_snapshots`**

Autosaves overwrite `workbook_data` in place. Milestone snapshots are written here — immutable records at four defined points in the assessment lifecycle.

```sql
CREATE TABLE workbook_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   UUID NOT NULL REFERENCES submissions(id),
  assess_id       TEXT NOT NULL,
  milestone       TEXT NOT NULL,
                  -- intake_complete | evidence_complete | findings_complete | signed_off
  snapshot_data   JSONB NOT NULL,   -- full copy of workbook_data at this moment
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON workbook_snapshots (submission_id, milestone);
```

Milestone triggers:
- `intake_complete` — Section 1 scope checks all passed (on gate open to Section 2)
- `evidence_complete` — Section 3 all 16 controls judged (on gate open to Section 4)
- `findings_complete` — Section 5 first finding saved + Section 4 gaps confirmed (on gate open to Section 6)
- `signed_off` — Section 6 reviewer sign-off checked (on gate open to Section 7)

---

## Integration with Report Pipeline

### Year 1: Local Typst Compile

1. Reviewer completes Section 6 and clicks "Generate Report Source"
2. UI builds a `.typ` file by injecting Section 6 fields into the report template
3. Assessment ID, assessment date, outcome, confidence, reviewer org auto-populated
4. Domains are pre-populated from Section 4 findings + Section 2 evidence summaries
5. File downloaded as `[ASSESS-ID].typ`
6. Reviewer runs: `cd tools/report-pipeline && typst compile [ASSESS-ID].typ [ASSESS-ID].pdf`
7. PDF delivered per Report Delivery SOP

### Year 2: Server-side compile (future)

Install Typst on the server and compile via API call triggered by the Generate button. PDF stored in Supabase Storage and linked from the submission record. Not in scope for v1.

---

## Sign & Deliver — Numbers Protocol Integration

This section lives on `/admin/submissions/[id]`, not inside the workbook. It is the delivery action that follows a completed assessment.

### Prerequisites (all must be true before signing is available)

| Prerequisite | How checked |
|-------------|-------------|
| Workbook complete | `workbook_data.section_5.signed_off = true` |
| Report PDF finalized | `report_pdf_url` not null on submissions record |
| Source MP4 uploaded | `source_video_url` not null on submissions record |

Until all three are met, the Sign & Deliver section shows a checklist of what is still outstanding.

### Credential Gating

The panel's active state depends on whether `NUMBERS_API_KEY` is set in the Vercel environment:

| State | Badge | Sign button |
|-------|-------|-------------|
| Credentials not configured | `⚠ Awaiting Numbers Protocol credentials` (amber) | Disabled |
| Credentials configured | `● Ready to sign` (green) | Active |
| Signing in progress | `◌ Signing...` (gray, animated) | Disabled — spinner shown |
| Signed | `✓ Signed` (green) + Numbers URL | N/A — shows download + verify links |

**Note on "Verification Pending":** ERC-7053 on-chain propagation is backgrounded. The UI moves to "Signed" when the Capture API returns the signed file URL — it does not wait for on-chain confirmation. The asset CID is stored; propagation is asynchronous. Revisit if Numbers API explicitly surfaces a "pending" status in the response payload.

This allows the full UI to be built, deployed, and used for pre-delivery steps before credentials arrive. When Sofia sends the sandbox API key, setting the env var activates the sign button with no code change needed.

### Zone A Payload Preview

Before signing, a "Preview Zone A Manifest" expandable section shows the exact JSON that will be sent to the Capture API as C2PA custom assertions:

```json
{
  "si8:assessment_id": "ASSESS-001-2026-07-09",
  "si8:assessment_date": "2026-07-09",
  "si8:reviewer_org": "PMF Strategy Inc. d/b/a SuperImmersive 8",
  "si8:methodology_version": "SI8 Reviewer Manual v0.1",
  "si8:verification_url": "https://verify.superimmersive8.com/ASSESS-001-2026-07-09",
  "si8:outcome_id": "EVIDENCE_SUPPORTS",
  "si8:confidence_level": "HIGH",
  "si8:commercial_authorization": "AUTHORIZED",
  "si8:report_hash": "sha256:[hex]",
  "si8:report_version": "v0.2",
  "si8:ai_generated_content": true,
  "si8:commercial_licenses_confirmed": true,
  "si8:likeness_assessment": "NO_SYNTHETIC_PERFORMERS"
}
```

All fields are auto-populated from `workbook_data` and the uploaded report PDF hash. The reviewer can inspect and confirm before committing.

Report hash is computed server-side at sign time by downloading the PDF from `report_pdf_url` and running SHA-256. This happens in the `/api/admin/submissions/[id]/sign` route — not in the browser.

### Sign & Deliver UI Flow

```
[Prerequisites met ✓]

ZONE A PAYLOAD PREVIEW
  si8:assessment_id     ASSESS-001-2026-07-09
  si8:outcome_id        EVIDENCE_SUPPORTS
  si8:confidence_level  HIGH
  si8:report_hash       [computed on sign]
  ... (expandable full JSON)

[ Sign with Numbers Protocol ]   ← primary action button

──────────────────────────────────────────────
After signing:

✓ Video signed — July 9, 2026 14:32 Taipei

  Signed video:       [ Download signed MP4 ]
  Numbers verify URL: https://verify.numbersprotocol.io/[CID]
  On-chain asset ID:  [CID / ERC-7053 hash]
  
  [ Copy verify URL ]  [ Mark as Delivered ]
```

### API Route: `/api/admin/submissions/[id]/sign`

**Method:** POST (admin auth required)

**Steps executed server-side:**

1. Load submission record — verify all prerequisites are met
2. Download report PDF from `report_pdf_url` → compute SHA-256 → `report_hash`
3. Build Zone A JSON payload from `workbook_data` + `assess_id` + `report_hash`
4. Download source MP4 from `source_video_url` in Supabase Storage
5. POST to Capture API:

```
POST https://api.numbersprotocol.io/api/v3/assets/
Authorization: token [NUMBERS_API_KEY]
Content-Type: multipart/form-data

  file:        [MP4 binary]
  caption:     [assess_id]
  tag:         si8-certified
  headline:    SI8 Campaign Assurance Assessment — [assess_id]
  custom_c2pa: [Zone A JSON as string]
```

*(Exact field names and endpoint to be confirmed on Capture API technical call. The above reflects best current understanding from Numbers Protocol docs and Sofia Yan correspondence.)*

6. Parse response — extract:
   - `asset_cid` — the Numbers asset CID (used as on-chain identifier)
   - `signed_file_url` — URL of the C2PA-signed video
   - `verification_url` — Numbers verify page URL

7. Upload signed video to Supabase Storage: `signed-videos/[id]/[assess_id]-signed.[ext]`
8. Update submissions record:

```sql
UPDATE submissions SET
  provenance_status    = 'signed',
  numbers_asset_id     = '[CID]',
  numbers_verify_url   = 'https://verify.numbersprotocol.io/[CID]',
  numbers_signed_at    = NOW(),
  signed_video_url     = '[supabase storage URL]',
  report_hash          = '[sha256 hex]'
WHERE id = '[submission_id]';
```

**Error handling:**
- Capture API error → return error message to UI, do not update DB; reviewer can retry
- File download failure → surface specific step that failed
- Prerequisite not met → 400 with clear message identifying what is missing

### Delivered State

After the reviewer clicks "Mark as Delivered":

```sql
UPDATE submissions SET
  provenance_status = 'delivered',
  delivered_at      = NOW()
WHERE id = '[submission_id]';
```

The submission card in the admin list updates to show a "Delivered" badge. The submission detail page shows the full delivery record: signed video URL, Numbers verify URL, delivery date.

---

## What Changes vs. Current Admin Panel

| Area | Current | This PRD |
|------|---------|----------|
| Routes | `/admin` list + `/admin/submissions/[id]` detail | Same, plus new `/admin/submissions/[id]/review` workbook |
| Review interface | Basic 6-step checklist with approve/reject | Full 6-section workbook — 16 controls, Gap Log, Findings Log, Overall Assessment, Report Brief |
| Guidance | None | Domain guidance from Reviewer Manual embedded in right context panel |
| Submission data access | Admin views submission in list | Full submission data in right context panel on workbook page |
| Evidence files | Not previewed | Receipt and document thumbnails with lightbox |
| Auto-save | No | Yes — every 30 seconds |
| Assessment ID | Not generated | Auto-generated on first open of workbook |
| Report generation | Manual (copy from workbook to Typst) | Pre-filled `.typ` file downloaded from UI |
| Source video | Not collected | Admin-side upload on submission detail page; stored in Supabase Storage |
| Report PDF upload | Not collected | Admin uploads compiled PDF to submission detail page; triggers report_hash computation |
| Numbers signing | Not present | Sign & Deliver panel on submission detail page; calls Capture API; credential-gated |
| DB storage | `reviewer_checklist JSONB` (6 fields) | 14 new columns: workbook, report, source video, provenance |

---

## Implementation Sequence

Build in this order. Each phase is independently shippable and testable.

| Phase | Scope | Where | Effort |
|-------|-------|-------|--------|
| **1** | DB migration — all 16 new columns + `workbook_snapshots` table; Supabase Storage buckets `source-videos` + `signed-videos` | DB | 0.5 day |
| **2** | Submission detail page — Source Video upload section; report PDF upload field; workbook entry point button with progress | `/admin/submissions/[id]` | 1 day |
| **3** | Sign & Deliver panel — prerequisite checklist, Zone A payload preview, credential-gated sign button, signing states (Ready / Signing... / Signed), post-sign state with download + verify links, Mark as Delivered | `/admin/submissions/[id]` | 1.5 days |
| **4** | `/api/admin/submissions/[id]/sign` route — report hash (SHA-256 + algorithm stored), Zone A JSON build, Capture API call, DB update. Wire with mock response first, real credentials when available. | API | 1 day |
| **5** | Workbook route, three-zone layout shell, header bar, left nav with 7 section status indicators, auto-save scaffold, milestone snapshot writer | `/admin/submissions/[id]/review` | 1 day |
| **6** | Section 1 — Intake & Scope; Section 2 — Visual Review with all observation fields and milestone trigger | Workbook | 1.5 days |
| **7** | Section 3 — all 16 controls with dropdowns, domain-specific fields, Evidence Checklist Summary, milestone trigger | Workbook | 2 days |
| **8** | Sections 4 + 5 — Evidence Gap Log + Findings Log (auto-seeded from Section 3); milestone trigger after Section 5 | Workbook | 1 day |
| **9** | Section 6 — Overall Assessment: commercial confidence + reviewer confidence block + sign-off gate + milestone snapshot | Workbook | 0.5 day |
| **10** | Section 7 — Report Brief, Review Before Generating modal, `.typ` download, Post-Assessment Notes | Workbook | 1.5 days |
| **11** | Right context panel — Submission tab + Evidence Files tab with lightbox | Workbook | 1 day |
| **12** | Right context panel — Guidance tab with domain-aware content including Section 2 guidance | Workbook | 1 day |
| **Total** | | | **~12.5 days** |

**Delivery-critical path for Assessment One:** Phases 1–4 + 5–10. The workbook context panel (Phases 11–12) is valuable but can follow after Assessment One if time is tight. The Sign & Deliver panel (Phases 3–4) must be complete before delivery since Numbers signing is part of the Assessment One deliverable.

**Credentials dependency:** Phase 4 can be built and tested with a mock Capture API response. When Sofia sends sandbox credentials, set `NUMBERS_API_KEY` in Vercel env → real signing activates. No code change required.

---

## Open Questions

| # | Question | Decision needed by |
|---|----------|--------------------|
| ~~OQ1~~ | ~~Should the workbook data be versioned?~~ | **Closed.** Autosave overwrites `workbook_data`; milestone snapshots written to `workbook_snapshots` table at four defined events. |
| OQ2 | Should the Guidance tab content be hardcoded in the component or stored in MDX files? MDX is more maintainable as the Manual evolves. | Before Phase 12 |
| OQ3 | When Typst is eventually run server-side, should the PDF be automatically emailed to the submitter or remain a manual delivery step? | Year 2 planning |
| OQ4 | Should there be a "Request Additional Evidence" button that emails the submitter from inside the workbook? Currently this is a manual email step. | Before v1 launch |
| OQ5 | Exact Capture API field names and endpoint — `custom_c2pa` field name, multipart structure, and response schema need confirmation on the Numbers technical call. The API route (Phase 4) can be built against the mock; final field names dropped in when confirmed. | Before Phase 4 goes live |
| OQ6 | Does the Capture API accept the Zone A assertions as a JSON object or a serialized JSON string in the multipart body? Affects how the API route constructs the request. | Numbers technical call |
| OQ7 | How should the source video be transferred from the creator to SI8? Currently assumed to be via email / file transfer with admin uploading. Should the submission confirmation email include a secure upload link? | Before first commercial CertForm submission |
| OQ8 | The Visual Review section requires 50-word minimum freeform observations. Is 50 words the right floor, or should it be lower (30 words) to avoid artificial padding for short videos? | Before Phase 6 — can adjust based on Assessment One experience |

---

*SI8 Reviewer Workbook UI PRD · PMF Strategy Inc. d/b/a SuperImmersive 8 · July 2026*
