# PRD: RecordForm — Creator Record ($29)
## Self-Attested AI Video Documentation

**Version:** 1.0
**Status:** Built & Live (March 2026)
**Internal Name:** RecordForm
**Product Name:** Creator Record
**Price:** $29 (early access; regular $49)
**Route:** `/record` (migrating from `/submit` when tier = creator_record)
**Business Context:** `BUSINESS_PLAN_v4.md` — Gear A CaaS, funnel mechanism
**Companion Document:** `PRD_CERT_FORM.md` (the $499 product)
**Implementation Plan:** `implementation/RECORD_FORM_IMPL.md`

---

## What RecordForm Is (And Is Not)

**What it is:**
A structured self-attestation form that generates an automated Chain of Title PDF stamped "SELF-ATTESTED — NOT FOR COMMERCIAL USE." Issued by SI8 with a permanent record ID (CR-2026-XXXXXXXX), timestamped, and stored in a third-party system. The distinction from a self-written Word document is that this record exists independently of the creator with a reference number that can be verified.

**What it is not:**
- Not a human-reviewed compliance document
- Not accepted by brand legal teams or E&O underwriters for commercial use
- Not a legal guarantee of any kind
- Not a commercial clearance

**Strategic role (v4 model):**
RecordForm is a funnel mechanism, not a primary revenue driver. A creator pays $29 for a permanent record of their AI production process. When they land a commercial opportunity — an ad agency job, a licensing deal, a streaming submission — they upgrade to CertForm ($499). The upgrade path requires no resubmission. RecordForm creates the habit of documentation and the customer relationship.

**Unit economics:**
- Revenue: $29
- Cost: ~$1.50 (Stripe fees)
- Gross margin: ~95%
- Goal: Not $29 revenue — it's $499 upgrade conversion

---

## Product Decisions & Rationale

| Decision | Choice | Why |
|----------|--------|-----|
| Auto-approve on payment | Yes | No human review needed; cost would destroy margin |
| PDF auto-generated on webhook | Yes | Instant delivery is part of the $29 value prop |
| Receipts required | No — optional | Receipts are for commercial license verification; not relevant here |
| Territory section | Skip | Territory is for licensing scope; RecordForm is not for licensing |
| Brand safety categories | Skip | Brand categories serve Showcase/licensing; not relevant for self-attested work |
| Stamp language (PDF) | "SELF-ATTESTED — NOT FOR COMMERCIAL USE" | Enforcement layer — agencies cannot use this document |
| Stamp label (website/marketing) | "Pre-Commercial Record" | Less alarming; still signals this is a starting point, not an endpoint |
| Showcase opt-in allowed | Yes | Serves as upgrade lead magnet; appear in catalog with self-attested badge |
| Indemnification checkbox | Required | Protects SI8 from inaccurate disclosures even for automated tier |
| Evidence Custodian checkbox | Required | Creator warrants they retain prompts; SI8 does not collect raw prompts |
| No human review disclosed | Explicit | "No human review" listed as a checklist item with ✗ so creators are clear |

---

## Form Sections

RecordForm has **9 active sections** (Territory is skipped; no Tier Selection since the form is tier-specific).

### Section 1 — Production Details
- Film Title *
- Runtime (mm / ss)
- Genre (Narrative / Documentary / Experimental / Commercial / Music Video / Other)
- Logline (max 500 characters)
- Primary Intended Use (dropdown: same options as CertForm)

*No commercial context layer (budget, channels) — not relevant for self-attested tier.*
*No brand safety categories — Showcase-specific; hidden for RecordForm.*

### Section 2 — Tool Disclosure
- Add tools via modal: tool name, version, plan type, production dates, mark as primary
- Receipt upload: **optional** (stated clearly in UI)
- Minimum one tool required; one must be marked primary

*Note: Free-plan tools are not blocked at form level for RecordForm. They are blocked for CertForm. RecordForm reflects whatever the creator actually used — the self-attested stamp communicates the risk.*

### Section 3 — Human Authorship Declaration
- Written statement, 150-word minimum
- Guidance bullets: what was AI-generated, how you iterated, editorial decisions, post-production
- Evidence Custodian Declaration checkbox (required):
  > "I confirm that I retain prompt logs, iteration records, and production notes internally. I will produce these records if legally challenged or requested by a distributor or E&O insurer. SI8 does not collect raw prompts."

### Section 4 — Likeness & Identity
Two paths (same as CertForm, but text description instead of file upload for Path B):

**Path A:** Four checkboxes — no real faces, no real voices, no lookalikes, no deepfakes.

**Path B (licensed):** "I have written consent or a signed license on file" — text description field (not file upload; file upload is a CertForm-only requirement).

### Section 5 — IP & Brand
Two paths (same pattern as Section 4):

**Path A:** Three checkboxes — no copyrighted characters, no brand imitation, no trademarked IP.

**Path B (licensed):** "I have written authorization on file" — text description field.

*No Fair Use path. Fair Use is a CertForm concept requiring legal documentation. Adding it to RecordForm would create false confidence.*

### Section 6 — Audio & Music
- Audio source: AI-generated (commercial license) / Licensed (sync or library) / Silent
- If licensed: file upload required (audio is high-risk; upload required regardless of tier)

### Section 7 — Video & Showcase
- Video screening link (YouTube/Vimeo, required)
- Thumbnail URL (optional)
- Showcase description (optional, falls back to logline)
- Showcase opt-in checkbox: "List in Showcase after approval (self-attested badge)"

### Section 8 — Review & Submit
Summary panel + legal checkboxes:
1. **Evidence Custodian Declaration** (if not completed in Section 3, also shown here)
2. **Indemnification Warranty** (required):
   > "I warrant the accuracy of all information provided. I agree to indemnify SuperImmersive 8 (PMF Strategy Inc. d/b/a SuperImmersive 8) from any third-party claims arising from inaccurate or incomplete disclosures."

Proceed to payment → $29 via Stripe.

---

## Automated Post-Payment Flow

On successful Stripe webhook:
1. Submission status → `approved`
2. `generateCreatorRecordPDF()` called automatically
3. PDF uploaded to Supabase `documents` bucket
4. `rights_packages` record upserted (with self-attested placeholder values for all NOT NULL fields)
5. `sendCreatorRecordApprovedEmail()` sent:
   - Creator email: amber design, self-attested language, upgrade CTA
   - Admin email: awareness notification, no action required

If PDF generation fails, admin can retry via:
`POST /api/admin/submissions/[id]/generate-creator-record?force=true`

---

## PDF Output

**File:** `lib/pdf/CreatorRecordPDF.tsx`
**Design:** Amber/gold color scheme (2 pages)
**Stamp (Page 1):** `SELF-ATTESTED — NOT FOR COMMERCIAL USE`
**Record ID format:** `CR-YYYY-{submissionId-prefix}`

Page 1 contains:
- Header (SI8 logo, Record ID)
- Stamp box
- Film information (title, creator, record ID, issued date, territory if present)
- Tool disclosure table
- Human authorship statement

Page 2 contains:
- Likeness & Identity attestation (checkboxes or licensed content note)
- IP & Brand attestation
- Evidence Custodian declaration
- Indemnification warranty
- Upgrade notice ("Want to use this film commercially? Upgrade to SI8 Certified...")
- Footer with legal disclaimer

---

## Database Fields Used

All stored in `submissions` table. RecordForm-specific behavior:
- `tier`: `'creator_record'`
- `submission_mode`: `'creator'` (RecordForm is always creator mode; no agency path)
- `status`: auto-set to `'approved'` on payment
- `payment_status`: `'paid'` on webhook
- `territory_preferences`: null (territory section skipped)
- `modification_authorized`: `false` (hardcoded)
- `tools_used`: JSONB array (receipts may be null)

---

## Upgrade Path

When a creator wants to upgrade RecordForm → CertForm:
- They log into the dashboard, find the submission, and click "Upgrade to SI8 Certified"
- No re-entry of form data required — the existing record is the starting point
- They pay the $499 fee and enter the human review queue
- The Chain of Title PDF (CertForm output) replaces the Creator Record PDF

*Upgrade flow is not yet built as of March 2026 — tracked as future work.*

---

## Known Gaps / Future Work

These items were flagged in peer review (ChatGPT + Gemini, March 2026) as improvements for a future RecordForm iteration. They are explicitly excluded from the current build to preserve simplicity and low-friction conversion.

| Gap | Rationale for Deferring |
|-----|------------------------|
| File upload for likeness/IP licensed paths | RecordForm is self-attested; text description is appropriate for this tier |
| Scene-level attribution | Adds friction; not needed for non-commercial tier |
| Third-party assets disclosure | Low risk for non-commercial use; add in Year 2 |
| Post-generation editing disclosure | Same as above |
| Production evidence uploads | Irrelevant without human review |
| Risk Rating output | Requires human reviewer; not applicable |

---

## What RecordForm Is NOT Responsible For

- RecordForm does **not** verify that tool receipts are real
- RecordForm does **not** scan the video for likeness or IP issues
- RecordForm does **not** provide a legal determination of any kind
- RecordForm does **not** watch the video

The `SELF-ATTESTED` stamp communicates exactly this. The Scope of Review Acknowledgment checkbox (in Section 8) makes it explicit. The upgrade notice at the bottom of the PDF reminds the creator what they'd need for commercial use.
