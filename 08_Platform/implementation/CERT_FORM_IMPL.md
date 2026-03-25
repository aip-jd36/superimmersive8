# Implementation Plan: CertForm ($499 SI8 Certified)

**PRD:** `08_Platform/prds/PRD_CERT_FORM.md`
**Status:** Not yet built. Design complete. Ready for implementation.
**Route:** `/certify`
**Build order:** Database migration → Form → Payment → Reviewer workflow → PDF updates → Emails

---

## Overview

CertForm is a new, separate product from RecordForm. It shares the same Next.js app and Supabase database but is a distinct route with different sections, validation, file uploads, a human reviewer workflow, and a Risk Rating output.

**Do not modify RecordForm** (`/record`) when building CertForm. These are intentionally separate products. Shared utilities (Stripe checkout, Supabase helpers, email sender) can be shared — form logic, PDF generation, and admin workflow are separate.

---

## Phase 1: Database Migration

Create migration file: `supabase/migrations/20260401000000_add_certform_fields.sql`

### New columns on `submissions` table

```sql
-- Commercial context (Section 2 — Production Details)
ALTER TABLE submissions ADD COLUMN campaign_context JSONB;
-- Shape: { is_live_campaign: boolean, budget_range: string, distribution_channels: string[] }

-- Third-party assets (Section 3 — Tool Disclosure)
ALTER TABLE submissions ADD COLUMN third_party_assets JSONB;
-- Shape: { has_third_party: boolean, items: [{ type: string, description: string, license_status: string }] }

-- Post-generation editing (Section 4 — Human Authorship)
ALTER TABLE submissions ADD COLUMN post_gen_editing JSONB;
-- Shape: { has_post_gen_editing: boolean, tools_used: string[], description: string }

-- Scene attribution (Section 4 — Human Authorship)
ALTER TABLE submissions ADD COLUMN scene_attribution JSONB;
-- Shape: { provided: boolean, scenes: [{ scene: string, tool: string, prompt_summary: string }] }

-- AI percentage estimate (Section 4 — Human Authorship)
ALTER TABLE submissions ADD COLUMN ai_percentage INTEGER;
-- 0-100, creator's estimate

-- License file paths (Sections 5, 6 — Likeness, IP)
ALTER TABLE submissions ADD COLUMN likeness_release_path TEXT;
ALTER TABLE submissions ADD COLUMN ip_license_path TEXT;

-- Fair use (Section 6 — IP, Path C)
ALTER TABLE submissions ADD COLUMN fair_use_argument TEXT;
ALTER TABLE submissions ADD COLUMN fair_use_doc_path TEXT;

-- Production evidence (Section 8 — optional)
ALTER TABLE submissions ADD COLUMN production_evidence_paths JSONB;
-- Shape: string[] (array of Supabase storage paths)

-- Client name (Section 9 — Commercial Context, agency mode only)
ALTER TABLE submissions ADD COLUMN client_name TEXT;

-- Legal checkboxes
ALTER TABLE submissions ADD COLUMN content_integrity_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE submissions ADD COLUMN scope_acknowledged BOOLEAN DEFAULT FALSE;

-- Reviewer workflow (admin-side)
ALTER TABLE submissions ADD COLUMN reviewer_checklist JSONB;
-- Shape: { pre_screen: boolean, video_watched: boolean, tool_receipts_verified: boolean, authorship_reviewed: boolean, rights_docs_reviewed: boolean, risk_assessed: boolean, reviewer_notes: string }

-- Risk rating output
ALTER TABLE submissions ADD COLUMN risk_rating TEXT CHECK (risk_rating IN ('low', 'standard', 'elevated', 'high'));
ALTER TABLE submissions ADD COLUMN risk_notes TEXT;
-- Per-category breakdown stored in reviewer_checklist JSONB
```

### Updated `rights_packages` table

```sql
-- Add risk rating to issued packages
ALTER TABLE rights_packages ADD COLUMN risk_rating TEXT;
ALTER TABLE rights_packages ADD COLUMN risk_notes TEXT;
```

### Apply migration

```bash
# Local dev
npx supabase db push

# Production — run via Supabase dashboard SQL editor or CLI:
npx supabase db push --linked
```

---

## Phase 2: CertForm (`/certify`)

### File: `app/app/certify/page.tsx`

Build as a new page. Do not copy `submit/page.tsx` — CertForm has different sections, different validation, and different submission logic.

**Key differences from RecordForm:**
- `tier` hardcoded to `'si8_certified'`
- Receipts required (not optional) — `requireReceipt={true}` on AddToolModal
- File uploads in Sections 5, 6, 7
- Fair Use Path C in Section 6
- Commercial context fields in Section 2
- Third-party assets in Section 3
- Post-generation editing in Section 4
- Scene attribution in Section 4
- Production evidence upload in Section 8
- Section 9 (Commercial Context) visible only when `submission_mode='agency'`
- Brand safety categories in Section 10 — hidden when `submission_mode='agency'`
- Content Integrity Declaration checkbox in Section 11
- Scope of Review Acknowledgment checkbox in Section 11

### Section-by-section build notes

**Section 1 — Production Details**
- Same fields as RecordForm plus:
  - Budget range dropdown (optional): `<$10K / $10K–$50K / $50K–$200K / $200K+`
  - Is this for a live/active campaign? (Y/N radio)
  - Distribution channels (multi-select checkboxes): TV Broadcast / Streaming Platform / Online/Social / Cinema / OOH / Internal/Unreleased
- Save `campaign_context` JSONB to DB

**Section 2 — Tool Disclosure**
- Same AddToolModal component but with `requireReceipt={true}`
- Minimum one receipt required before proceeding
- Tool version required (not optional)
- Show tooltip: "Receipts are required for SI8 Certified. Free-plan tool receipts will be flagged."

**Section 3 — Third-Party Assets**
- New section not in RecordForm
- Toggle: "Does this film include any third-party assets?" (Y/N)
- If yes, repeating item group:
  - Asset type (dropdown): Stock Footage / 3D Model / Freelance-Generated Element / Music/SFX / Other
  - Description (text field)
  - License status (dropdown): Licensed / Purchased Outright / Public Domain / Unclear
- Save to `third_party_assets` JSONB

**Section 4 — Human Authorship Declaration**
- Same written statement (150-word minimum)
- Add: AI percentage estimate slider or input (0-100%)
- Add: Post-generation editing toggle + fields if yes:
  - Software used (multi-select or free text): After Effects / DaVinci Resolve / Premiere / Other
  - Description of what was added/changed
- Add: Scene attribution (optional but strongly recommended):
  - Repeating row: Scene/Segment → AI Tool Used → Prompt Summary
  - Show prompt: "Scene attribution helps the reviewer assess risk by section. Highly recommended for films over 3 minutes."
- Evidence Custodian Declaration checkbox (required) — same as RecordForm

**Section 5 — Likeness & Identity**
- Path A: Four checkboxes (same as RecordForm)
- Path B: File upload required (not text description):
  - Upload release/consent document
  - Accepted formats: PDF, DOC, DOCX, JPG, PNG (max 10MB)
  - Stored in Supabase `submissions` bucket under `submissions/{id}/likeness_release`
  - Save path to `likeness_release_path`

**Section 6 — IP & Brand**
- Path A: Three checkboxes (same as RecordForm)
- Path B: File upload required (not text description):
  - Upload license/authorization document
  - Save path to `ip_license_path`
- Path C (new): Fair Use
  - Checkbox: "I believe this use qualifies as fair use"
  - Required text field: "Describe your fair use argument (transformative nature, commentary, parody, etc.)"
  - Optional file upload: "Upload supporting documentation or legal opinion (optional but recommended)"
  - Advisory notice (styled as yellow callout): "Fair use is not a guarantee of clearance. SI8 will document your argument, but we recommend obtaining a legal opinion letter from a media attorney before commercial deployment."

**Section 7 — Audio & Music**
- Same as RecordForm — file upload required when `audio_source='licensed'`

**Section 8 — Production Evidence** *(Optional)*
- Toggle: "Would you like to submit production evidence?"
- Show prompt: "Production evidence helps us assess your workflow rigorously and may reduce reviewer questions. Highly recommended if you plan to submit to E&O insurers."
- If yes, multi-file upload:
  - Generation screenshots / session exports
  - Iteration samples or timeline exports
  - Any other production documentation
- Accepted: PDF, PNG, JPG, MP4 (short clips), ZIP (max 50MB total)
- Save array of paths to `production_evidence_paths` JSONB

**Section 9 — Commercial Context** *(Agency mode only)*
- Hidden when `submission_mode='creator'`
- Client name (required when visible)
- Intended campaign brief (text area, optional)
- Submission mode toggle at top of form determines visibility

**Section 10 — Video & Showcase**
- Same as RecordForm
- Brand safety categories (visible only when `submission_mode='creator'` and creator chose catalog opt-in):
  - Safe for family audiences
  - Contains mature themes
  - Violence/conflict themes
  - Political/advocacy content
  - Pharmaceutical/health claims
- Hidden entirely when `submission_mode='agency'`

**Section 11 — Review & Submit**
- Summary panel (same as RecordForm)
- Three required checkboxes:
  1. Evidence Custodian Declaration (if not completed in Section 4)
  2. Indemnification Warranty (same text as RecordForm)
  3. Content Integrity Declaration (new):
     > "I confirm that the version submitted for review is the final intended version. I understand that material modifications to the film after review will require a new submission and review fee."
  4. Scope of Review Acknowledgment (new):
     > "I understand that SI8 provides structured documentation and a structured audit process. SI8 is not a law firm and this review does not constitute legal advice or a guarantee against third-party claims."
- Proceed to payment → $499 via Stripe

### Validation rules

- All required fields validated on section advance (same pattern as current submit form)
- Section 5 Path B: file upload required if "I have licensed content" is checked
- Section 6 Path B: file upload required if "I have written authorization on file" is checked
- Section 6 Path C: text field required if fair use path selected
- Section 3: at least one item required if "has third-party assets" is checked
- Section 11: all four checkboxes required before payment button is enabled

---

## Phase 3: Payment

`app/app/api/checkout/create-session/route.ts` — already handles `tier='si8_certified'` routing to `STRIPE_PRICE_SI8_CERTIFIED_ID`. No changes needed to the checkout route.

`app/app/api/webhooks/stripe/route.ts` — already sets `status='pending'` for si8_certified tier on payment. No changes needed to the webhook.

---

## Phase 4: File Upload Infrastructure

All file uploads go through `app/app/api/upload/route.ts` (already exists). Verify it supports:
- Multi-file upload (for production evidence)
- File size limits (10MB per file for documents; 50MB total for production evidence)
- Correct Supabase bucket path: `submissions/{submissionId}/{fileType}/{filename}`

If multi-file is not supported, update `upload/route.ts` to accept an array and return an array of paths.

**Storage paths by section:**
```
submissions/{id}/likeness_release/
submissions/{id}/ip_license/
submissions/{id}/fair_use_doc/
submissions/{id}/production_evidence/
submissions/{id}/audio_license/   (existing)
```

---

## Phase 5: Admin Panel — Reviewer Workflow

This is the core of what makes CertForm worth $499. The reviewer workflow must be completed before approve/reject actions are available.

### File: `app/app/admin/submissions/[id]/page.tsx`

Add a "Reviewer Checklist" section below the submission details, visible only for `tier='si8_certified'` submissions with `status='pending'`.

**Checklist structure (6 steps):**

```
Step 1: Pre-screen (~5 min)
[ ] Confirm submission is complete (all required fields present)
[ ] Flag any obviously invalid tool receipts
[ ] Note: ___________

Step 2: Video Watch (~15 min)
[ ] Watched complete video
[ ] Visually scanned for: real faces, real voices, logos, brand elements, recognizable settings
[ ] Note any visual flags: ___________

Step 3: Tool Receipt Verification (~30 min)
[ ] All receipts reviewed and match declared tools/versions/dates
[ ] Free-plan tools flagged (if any): ___________
[ ] Unverifiable receipts flagged: ___________
[ ] Note: ___________

Step 4: Authorship Review (~15 min)
[ ] Written authorship statement reviewed (minimum 150 words met)
[ ] AI percentage estimate reviewed
[ ] Post-generation editing disclosure reviewed
[ ] Scene attribution reviewed (if provided)
[ ] Note: ___________

Step 5: Rights Documentation Review (~15 min)
[ ] Likeness path reviewed (Path A checkboxes OR release document)
[ ] IP path reviewed (Path A checkboxes OR license document OR fair use argument)
[ ] Audio license reviewed (if applicable)
[ ] Third-party assets disclosure reviewed (if applicable)
[ ] Note: ___________

Step 6: Risk Assessment & Output (~15 min)
[ ] Overall risk rating assigned: [ Low ] [ Standard ] [ Elevated ] [ High ]
[ ] Per-category notes entered (see risk fields below)
[ ] Reviewer notes completed
[ ] Ready to approve or reject
```

**Reviewer Notes fields (below checklist):**
- Tool Risk: text area
- Likeness Risk: text area
- IP Risk: text area
- Audio Risk: text area
- Overall Risk Notes: text area (appears in Chain of Title PDF)

**Approve/Reject buttons:** Disabled until all 6 checklist steps are checked. Once all steps checked and risk rating selected, buttons become active.

**Save checklist progress:** Auto-save checklist state to `reviewer_checklist` JSONB column on each checkbox change. Reviewer can leave and return.

### New API routes needed

```
PATCH /api/admin/submissions/[id]/checklist
  Body: { reviewer_checklist: {...} }
  Updates reviewer_checklist column

PATCH /api/admin/submissions/[id]/risk-rating
  Body: { risk_rating: string, risk_notes: string }
  Updates risk_rating and risk_notes columns
```

Or: fold both into a single `PATCH /api/admin/submissions/[id]/review-state` endpoint that accepts both.

### Approve flow change

`app/app/api/admin/submissions/[id]/approve/route.ts` — currently approves and calls `generateChainOfTitlePDF()`. Update to:
1. Verify `reviewer_checklist` is complete before approving (all 6 steps checked)
2. Verify `risk_rating` is set
3. Pass `risk_rating` and `risk_notes` to `generateChainOfTitlePDF()`

---

## Phase 6: Chain of Title PDF Updates

### Stamp change

`app/lib/pdf/ChainOfTitlePDF.tsx` — Update stamp from:
> `CLEARED FOR COMMERCIAL USE`

to:
> `SI8 VERIFIED · COMMERCIAL AUDIT PASSED`

This is a design/legal decision finalized during CertForm design (see PRD). The new language is factually accurate (describes the audit) without implying a legal clearance guarantee.

### Risk Rating addition

Add Risk Rating section to Page 2 of the Chain of Title PDF:

```
RISK ASSESSMENT
Overall Rating: [Low / Standard / Elevated / High]
Tool Risk: [notes]
Likeness Risk: [notes]
IP Risk: [notes]
Audio Risk: [notes]
Reviewer Notes: [notes]
```

- Low: green accent
- Standard: blue accent (neutral)
- Elevated: amber/orange accent
- High: red accent

### Function signature update

`app/lib/pdf/generateChainOfTitle.tsx` — Update `generateChainOfTitlePDF()` to accept:

```typescript
interface GenerateOptions {
  submission: Submission
  riskRating: 'low' | 'standard' | 'elevated' | 'high'
  riskNotes: string
  reviewerChecklist?: ReviewerChecklist
}
```

Pass these through to `ChainOfTitlePDF` component.

### Approve route update

`app/app/api/admin/submissions/[id]/approve/route.ts` — Pull `risk_rating` and `risk_notes` from submission record and pass to `generateChainOfTitlePDF()`.

---

## Phase 7: Emails

`app/lib/emails.ts` — `sendSubmissionApprovedEmail()` already exists for SI8 Certified. Update to include:
- Risk Rating in email body: "Your Risk Rating: Standard"
- Link to download Chain of Title PDF (same as current)
- No changes to creator template structure otherwise

No new email types needed for CertForm.

---

## Phase 8: CertForm-specific Marketing Site Links

Update `07_Website/newsite/index.html` and `pricing/index.html`:
- "Get SI8 Certified" / "Submit for Review" CTAs should point to `/certify` (not `/submit`)
- Creator Portal redirect in `vercel.json` should include `/certify` if using marketing site domain

---

## Build Order Summary

```
1. DB migration (Phase 1)           — No UI, low risk. Do first.
2. File upload infrastructure (Phase 4) — Verify existing upload route supports new paths
3. CertForm page /certify (Phase 2) — Big build. Work section by section.
4. Admin reviewer checklist (Phase 5) — Builds on existing admin submission detail page
5. Chain of Title PDF updates (Phase 6) — Stamp change + Risk Rating section
6. Approve route update (Phase 5/6) — Tie checklist + risk rating into approve action
7. Email update (Phase 7)           — Minor update to existing function
8. Marketing site links (Phase 8)   — Swap /submit → /certify in CTAs
```

---

## Environment Variables (CertForm additions)

No new env vars needed. CertForm shares the same Supabase, Stripe, and Resend config as RecordForm. Confirm these exist:

```
STRIPE_PRICE_SI8_CERTIFIED_ID=    # $499 product (already used in checkout route)
```

---

## Test Plan

**Before marking CertForm complete:**

1. **Full flow (creator mode):**
   - Submit all 11 sections with all required fields
   - Upload receipt for at least one tool
   - Upload likeness release (Path B)
   - Complete Stripe $499 test payment
   - Verify `status='pending'` in DB (not auto-approved)
   - Verify submission received email sent

2. **File uploads:**
   - Upload likeness release → verify stored at `submissions/{id}/likeness_release/`
   - Upload IP license → verify stored at `submissions/{id}/ip_license/`
   - Upload fair use doc → verify stored at `submissions/{id}/fair_use_doc/`
   - Upload production evidence (multiple files) → verify all paths in `production_evidence_paths`

3. **Fair use path:**
   - Select Path C in Section 6
   - Verify text field required, doc upload optional
   - Verify advisory notice visible
   - Verify `fair_use_argument` saved in DB

4. **Agency mode:**
   - Toggle to "Agency/Production House" submission mode
   - Verify Section 9 (client name) visible
   - Verify brand safety categories hidden
   - Verify catalog opt-in hidden

5. **Admin reviewer workflow:**
   - Open submission in admin panel
   - Verify approve/reject buttons are disabled
   - Check all 6 checklist steps
   - Select risk rating
   - Verify approve/reject buttons become active
   - Leave page and return — verify checklist state saved
   - Approve submission
   - Verify Chain of Title PDF generated with new stamp and Risk Rating section
   - Verify creator approval email received with risk rating

6. **PDF stamp:**
   - Download approved Chain of Title PDF
   - Verify stamp reads "SI8 VERIFIED · COMMERCIAL AUDIT PASSED" (not "CLEARED FOR COMMERCIAL USE")
   - Verify Risk Rating section present on Page 2

7. **Third-party assets:**
   - Declare "has third-party assets = yes"
   - Add two items with type/description/license status
   - Verify `third_party_assets` JSONB saved in DB

8. **Post-generation editing:**
   - Declare "has post-gen editing = yes"
   - Enter software used and description
   - Verify `post_gen_editing` JSONB saved in DB

---

## Known Risks / Things to Watch

- **Reviewer checklist auto-save:** Use a debounced save (500ms) rather than saving on every keystroke. The checklist JSONB can grow large with notes.
- **File upload limits:** Supabase Storage default max is 50MB per file. Production evidence ZIP might hit this. Confirm limit or set explicit policy.
- **PDF size with Risk Rating:** Adding a full Risk Rating section to the PDF may push Page 2 to overflow. Test with long reviewer notes before shipping.
- **Approve button gating:** The UX must be clear that the 6 checklist steps are blocking the approve action — not just a recommendation. Use a disabled state with tooltip: "Complete all reviewer checklist steps to unlock approval."
- **Fair use advisory:** The advisory notice is required to be visible and prominent. Do not hide it in a tooltip or collapsible. It's a legal exposure point for SI8 if a creator later claims they weren't warned.
