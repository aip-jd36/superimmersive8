# PRD: CertForm — SI8 Certified ($499)
## Human-Reviewed Commercial Audit for AI Video

**Version:** 1.0
**Status:** Design Complete — Ready to Build (March 2026)
**Internal Name:** CertForm
**Product Name:** SI8 Certified
**Price:** $499 per video
**Route:** `/certify`
**Business Context:** `BUSINESS_PLAN_v4.md` — Gear A CaaS, primary revenue driver
**Companion Document:** `PRD_RECORD_FORM.md` (the $29 product)
**Implementation Plan:** `implementation/CERT_FORM_IMPL.md`

---

## What CertForm Is

CertForm is the intake form for SI8's primary commercial product: a 90-minute human review of an AI-generated video that produces a Chain of Title PDF stamped **"SI8 VERIFIED · COMMERCIAL AUDIT PASSED."**

The output is accepted by brand legal teams, ad agencies, production houses, streaming platforms, and E&O underwriters as a structured compliance record for AI-generated commercial content.

**What the $499 buys:**
- A human reviewer watches the complete video and performs a visual risk scan (faces, logos, backgrounds, brand elements, audio sync)
- Tool receipts are opened, dates cross-referenced with production dates, and vendor commercial terms verified for the specific plan/period
- Human authorship declaration is reviewed against US Copyright Office standards
- Any uploaded licenses, releases, or fair use memos are reviewed and documented
- A 9-field Chain of Title PDF is generated with a Risk Rating (Low / Standard / Elevated / High)
- Internal reviewer notes are logged for audit trail
- Any risk flags are communicated to the submitter before or alongside the PDF

**The "CarFax for AI video" positioning:**
SI8 Certified is not a legal guarantee. It is a structured third-party audit record — factual, documented, and defensible. The distinction between "we verified this" and "this is legally safe" must be maintained in all product copy, PDF language, and reviewer communications.

---

## Product Decisions & Rationale

| Decision | Choice | Why |
|----------|--------|-----|
| Stamp language | `SI8 VERIFIED · COMMERCIAL AUDIT PASSED` | "Cleared" is a formal legal designation used by clearance attorneys. Using it creates liability. "Verified" + "Audit Passed" is factual — it describes what we did, not a legal outcome. |
| Human review required | Yes — 90 minutes | This is what justifies $499 and differentiates from RecordForm. Without video review, we are selling a checklist. |
| Video must be watched | Yes — reviewer mandate | Visual risk scan for faces, logos, backgrounds, brand elements is what agencies are paying for. Without this, the product is not credible at the enterprise level. |
| Risk Rating on output | Yes — 4 levels | Agencies want "should we run this?" not "9 fields are populated." Risk Rating with per-category notes is the actionable output. |
| Fair Use path | Yes — with conservative advisory | Fair Use is a real legal defense for some content. We document the argument and flag risk level. We do not make fair use determinations. We recommend legal opinion letters for commercial use. |
| Receipts | Required | Tool receipt verification is 30 minutes of the 90-minute review. Without it, we cannot verify commercial license status. |
| License uploads (S5, S6) | Required when licensed path selected | Text descriptions are not a legal defense. E&O insurers and distributors require actual documents. |
| Brand categories | Creator mode only | An agency clearing a known client campaign already knows the brand. Brand category questions serve Showcase/marketplace purposes, not compliance for bespoke commercial work. |
| Production evidence | Optional but encouraged | Screenshots and timeline exports add reviewer ability to spot risks. "Entirely optional" was softened to "highly recommended for E&O" per peer review feedback. |
| Reviewer checklist in admin | Yes — structured workflow | Ensures consistent review quality. Reviewer must complete each checklist item before approving. Builds internal audit trail. |
| Separate from RecordForm | Yes — different route, different form | Different products, different buyer intent, different reviewer workflow. Sharing a form with tier selection at step 1 creates confusion and positioning risk. |

---

## Form Sections — Complete Design

CertForm has **11 sections**. Agency mode skips Section 9 (Territory) and the Showcase opt-in in Section 10. All sections are gated — cannot skip forward.

---

### Section 1 — Submission Context

**Purpose:** Establish who is submitting and why. Agency context changes what we show in later sections.

Fields:
- **Submission mode** (required, radio):
  - Individual Creator — I'm submitting my own work
  - Agency / Production House — Submitting on behalf of a client
- **Client / Brand name** (text, optional — appears in Chain of Title header, agency mode only)

*Design note: CertForm has no tier selection. The user arriving at `/certify` has already chosen the $499 product. Tier selection inside the form was a source of confusion in the original shared form design.*

---

### Section 2 — Production Details & Commercial Context

**Purpose:** Document the work and establish commercial stakes. Commercial context (campaign, budget, channels) signals to the reviewer how thoroughly to review and is documented in the Chain of Title.

**Production fields:**
- Film Title *
- Runtime (mm / ss)
- Genre (Narrative / Documentary / Experimental / Commercial / Music Video / Other)
- Logline (max 500 characters)
- Primary Intended Use (dropdown):
  - Brand Commercial / Advertisement
  - Agency Deliverable / Client Work
  - Streaming Platform Submission
  - Licensing Marketplace (Showcase)
  - Film Festival
  - Social Media / YouTube
  - Portfolio / Personal Project
  - Other

**Commercial context fields (new — both modes):**
- Is this tied to a live campaign or client deliverable? (Y / N)
  - If yes: Approximate budget range — Under $10K / $10K–$50K / $50K+ / Prefer not to say
- Distribution channels (multi-select): TV Broadcast / YouTube Ads / TikTok / Meta Ads / Streaming Platform / Website & Online / OOH / In-Store / Other

**Brand safety fields (creator mode only — hidden for agency):**
- Suitable for brand categories (multi-select):
  Consumer Goods, Technology & Software, Automotive, Financial Services, Healthcare & Wellness, Food & Beverage, Fashion & Luxury, Entertainment & Media, Sports & Fitness, Travel & Tourism, Education, Real Estate
- Do NOT use with (multi-select):
  Alcohol & Tobacco, Gambling, Adult Content, Political Advertising, Pharmaceutical (Rx), Firearms & Weapons

*Rationale for hiding brand categories for agency: An agency clearing a Nike spot knows the client. Asking "what categories is this suitable for?" makes no sense in that context and signals we don't understand B2B workflows. These questions exist for the Showcase marketplace (individual creator) use case.*

---

### Section 3 — Tool Disclosure & Third-Party Assets

**Purpose:** Document every AI tool used in production, verify commercial license status, and capture any external assets that could introduce hidden IP risk.

**AI Tools (existing structure, enhanced):**
- Add tools via modal (tool name, version, plan type, production start/end dates, mark as primary)
- **Receipt upload: required** — proof of paid commercial plan for each tool
- At least one tool required; one must be marked primary
- Helper text: "Receipt must show plan type, account name, and date range overlapping your production period. Screenshots of billing pages are accepted."

**Third-party assets (new):**
> "Did you incorporate any externally sourced assets into this work?"

- Stock footage or stock assets (Y/N — if yes, upload license or describe source)
- External 3D models, templates, or base assets (Y/N — text description)
- AI-generated assets from a freelance vendor or third party (Y/N — describe tool and plan type used if known)

*Rationale: A creator may generate 90% of the film in Runway but include a licensed stock clip and forget to flag it. Or hire a freelancer to generate shots without knowing what tool or plan they used. This is a hidden IP risk vector that emerges in post and bypasses all earlier checkboxes.*

---

### Section 4 — Human Authorship & Scene Attribution

**Purpose:** Establish that a human being made meaningful creative decisions. This is the evidence our reviewer uses to assess Copyright Office standards for human authorship. Scene attribution adds auditability.

**Attribution (new — lightweight):**
- Approximate % of this film that is AI-generated (select one):
  - Under 25% / 25–50% / 50–75% / Over 75%
- Key scene attribution (up to 5 entries, optional but encouraged):
  - Scene or segment label + tool used
  - Helper: *"e.g., 'Opening sequence — Runway Gen-3' or 'Exterior background plates — Sora'"*

**Authorship statement (existing, 150-word minimum):**
Written statement covering:
- Which specific scenes or sequences were AI-generated
- What prompts, styles, or references were used (exact prompts not required)
- How you iterated — what you rejected and why
- What editorial choices shaped the final output
- How you structured the narrative or visual arc
- Post-production work (color grade, edit, sound design)

**Post-generation editing disclosure (new):**
> "What editing or post-production tools were applied after AI generation?"

- Editing software used (free text: Premiere, Final Cut, DaVinci Resolve, CapCut, etc.)
- Compositing or visual effects added post-generation (Y/N — describe if yes)
- Any third-party overlays, titles, lower-thirds, or motion graphics added (Y/N — describe if yes)

*Rationale: This is where risk often enters late in the pipeline. A creator generates clean AI footage, then drops in a copyrighted logo as a title card in post, and clicks through all IP checkboxes thinking only about the generated content. Post-gen editing disclosure catches this.*

*Evidence Custodian Declaration is in Section 11 with all other legal checkboxes.*

---

### Section 5 — Likeness & Identity

**Purpose:** Document the human likeness and identity status of the work. Pass/fail threshold — any real person face, voice, or identity without documented consent is a hard rejection.

**Path A — No real person likenesses (confirm all four):**
- No real person faces or identifiable likenesses without written consent
- No real person voices without written consent
- No lookalikes or impersonation of real people
- No synthetic versions of real people (deepfakes)

**Path B — Licensed / Consented content:**
- Checkbox: "This work contains real person faces, voices, or likenesses — I have written consent or a signed license on file"
- **File upload required** (PDF, JPG, PNG — signed release or license agreement)
- Optional notes: describe the scope of consent and parties involved

*Design note: Path B was a text-description field in RecordForm. CertForm requires an actual document upload. Text descriptions are not a legal defense. E&O insurers and distributors require signed releases.*

*Note on video scan: The reviewer will also visually scan the video for unidentified likenesses. The submitter's self-disclosure in this section is the starting point, not the only check.*

---

### Section 6 — IP & Brand

**Purpose:** Document the intellectual property and brand status of the work. Copyrighted characters, protected trade dress, and trademarked identifiers without authorization are hard rejection causes.

**Path A — No unlicensed IP (confirm all three):**
- No copyrighted characters (Marvel, Disney, anime characters, video game IP, etc.)
- No recognizable brand imitation (logos, trade dress, packaging)
- No trademarked intellectual property without authorization

**Path B — Licensed IP:**
- Checkbox: "This work contains licensed brand or IP elements — I have written authorization on file"
- **File upload required** (signed license or authorization letter)
- Optional notes field

**Path C — Fair Use:**
- Checkbox: "This work contains elements I believe are protected by fair use (commentary, parody, transformative use)"
- **Text field required:** Describe the nature and basis of the fair use argument
- **File upload (optional):** Upload supporting documentation — opinion letter from legal counsel, clearance memo, or research notes
- Advisory notice (conservative, per product decision):
  > *"SI8 does not make fair use determinations. Our reviewer will document your argument and flag the risk level in your Chain of Title. Fair Use is not a stable safe harbor for AI-generated commercial content — courts are actively litigating this area. We strongly recommend obtaining a legal opinion letter before any commercial deployment of content that relies on a fair use argument."*

*Rationale for keeping Fair Use advisory strict: If a submitter clicks "Fair Use" and types "it's a parody" and we pass it through without recommending counsel, we absorb their risk. The conservative language educates the client on industry standards and maintains our position as documenters, not legal advisors.*

---

### Section 7 — Audio & Music

**Purpose:** Verify all audio elements have documented commercial rights. Audio rights are one of the most common rejection causes.

- **Audio source** (select one):
  - AI-generated audio (original, commercial license from tool vendor)
  - Licensed audio (sync license or library — documentation required)
  - Silent / no audio

- If licensed: **file upload required** — sync license, library license, or permission letter (PDF, JPG, PNG)

---

### Section 8 — Production Evidence *(Optional)*

**Purpose:** Allow the reviewer to examine production materials that may reveal risks not visible in the self-disclosures. Optional, but strongly recommended for complex productions or those requiring E&O documentation.

**Section header:**
> *"Our reviewer can examine your production materials — generation screenshots, UI captures, timeline exports, or iteration samples — to identify anything that should be documented or flagged in your Chain of Title. This is optional, but highly recommended for commercial projects requiring E&O insurance documentation."*

**File uploads (up to 10 files, PDF/JPG/PNG/MP4 — max 50MB total):**
- Generation screenshots (Runway, Sora, Kling, Pika UI captures)
- Timeline exports or project files
- Before/after iteration samples
- Any other supporting materials

**Free text:** "Anything specific you'd like the reviewer to examine or flag?"

**Skip option:** "Continue without production evidence →"

*Design note: Original draft said "entirely optional — your submission is complete without it." Updated to "highly recommended for E&O" per peer review. We don't make it required because trade secret concerns (some creators won't share prompts or UI) would block legitimate submissions. The framing creates enough positive pressure.*

---

### Section 9 — Territory *(Creator mode only — Agency skips this)*

**Purpose:** Document the geographic scope of any licensing rights. Governs licensing deals through Showcase.

- Territory (select): Global (Worldwide) / North America / Europe / Asia / Other (specify)
- Existing licensing restrictions (optional text): "Do you have any existing licensing agreements that restrict territory or exclusivity?"

---

### Section 10 — Video & Showcase

**Purpose:** Collect the screening link (required for reviewer video scan) and catalog listing preferences.

- **Video screening link** (required): YouTube or Vimeo, unlisted OK, must not be private
  - Helper: "Your reviewer will watch this video as part of the audit."
- Thumbnail URL (optional — defaults to platform thumbnail)
- Showcase description (optional — defaults to logline)
- *(Creator mode only)* Showcase opt-in: "List in Showcase after approval (Rights Verified badge, earn 80% of licensing fees)"
- *(Agency mode)* Note: "Showcase listing is not available for agency submissions. Your Chain of Title is delivered directly to you."

---

### Section 11 — Review & Submit

**Purpose:** Summary, final disclosures, and payment. All legally binding checkboxes consolidated here for psychological weight and clean flow.

**Summary panel:**
- Title, runtime, genre
- Submission mode (creator/agency) + client name if provided
- Tools listed (names only)
- Territory (if applicable)
- Distribution channels
- Intended use

**Legal checkboxes (all required):**

1. **Evidence Custodian Declaration:**
   > "I confirm that I retain my prompt logs, iteration records, and production notes internally. I will produce these records if legally challenged or requested by a distributor or E&O insurer. SI8 does not collect raw prompts."

2. **Content Integrity Declaration:**
   > "This is the final version of the work submitted for certification. I understand that material modifications to the content after certification require re-review and re-issuance of the Chain of Title."

3. **Scope of Review Acknowledgment:**
   > "I understand that SI8 provides a structured documentation and review record based on my disclosures and a best-effort visual risk assessment. SI8 does not provide legal advice or a legal guarantee. I retain full responsibility for the accuracy of all disclosures and the underlying rights in this work."

4. **Indemnification Warranty:**
   > "I warrant the accuracy of all information provided in this submission. I agree to indemnify and hold harmless SuperImmersive 8 (PMF Strategy Inc. d/b/a SuperImmersive 8) from any third-party claims arising from inaccurate or incomplete disclosures."

**Proceed to payment → $499 via Stripe**

---

## Reviewer Workflow (Admin Side)

When a CertForm submission reaches the admin panel with status `pending` and payment `paid`, the reviewer must complete a structured checklist before the approve/reject action is available. This is built into the existing admin panel — no separate reviewer account needed (JD is reviewer and admin in Year 1).

### Reviewer Checklist (must complete in order)

**1. Pre-screen (5 min)**
- [ ] Video link is accessible and not private
- [ ] At least one tool is declared with a receipt attached
- [ ] Submission mode and intended use make sense together (no obvious red flags before investing time)

**2. Video Watch (15 min)**
- [ ] Watched complete video (or reviewed all key frames for short clips under 30 seconds)
- [ ] No obviously recognizable real person faces detected
- [ ] No brand logos or trade dress detected
- [ ] No copyrighted characters or franchise IP detected
- [ ] No audio sync issues suggesting unlicensed music
- [ ] Background environments scanned (can reveal branded locations, artwork, etc.)

**3. Tool Receipt Verification (30 min)**
- [ ] Each receipt opened and reviewed
- [ ] Receipt account name and production dates cross-referenced
- [ ] Tool's commercial terms for that plan/period verified (check vendor ToS)
- [ ] Any free-plan receipts flagged → rejection reason documented

**4. Authorship Review (15 min)**
- [ ] Authorship statement meets 150-word minimum
- [ ] Statement demonstrates meaningful human creative decisions (not just "I typed prompts")
- [ ] Scene attribution (if provided) is plausible given tools declared
- [ ] Post-gen editing disclosure reviewed — any additions that could introduce IP risk?
- [ ] Production evidence (if uploaded) reviewed for any flags

**5. Rights Documentation Review (15 min)**
- [ ] Likeness path reviewed: Path A confirmations, or Path B release uploaded and reviewed
- [ ] IP path reviewed: Path A confirmations, or Path B license, or Path C fair use argument reviewed
- [ ] Audio documentation reviewed (if licensed: sync license checked)
- [ ] Third-party assets reviewed for any unlicensed material risk

**6. Risk Assessment & Output (15 min)**
- [ ] Risk Rating assigned (Low / Standard / Elevated / High) — see Risk Rating rubric below
- [ ] Per-category risk notes written (tool risk, likeness risk, IP risk, audio risk)
- [ ] Any flags to communicate to submitter documented
- [ ] Chain of Title PDF generated
- [ ] Catalog ID assigned (if approved + opted in)

**Total: ~90 minutes**

---

## Risk Rating Rubric

The Risk Rating appears on the Chain of Title PDF and in the admin panel. It is the reviewer's factual assessment — not a legal determination.

| Rating | Meaning | Typical Scenarios |
|--------|---------|------------------|
| **Low** | Clean audit. All receipts verified, no IP/likeness flags, straightforward production | Runway Pro commercial, no real faces, original AI audio, clear authorship |
| **Standard** | Solid audit with minor notes. Nothing blocking commercial use but buyer should be aware of specific items | Kling (noted training data uncertainty), stylistic similarity to a known aesthetic, stock music with basic sync license |
| **Elevated** | Reviewable concerns documented. Buyer's legal team should review the flags before deployment | Fair use argument without opinion letter, background containing possible branded environment, complex multi-vendor production |
| **High** | Significant unresolved questions. SI8 cannot clear this submission — reasons documented. Buyer should obtain legal clearance before commercial use | Free-plan tool detected in receipts, real person face identified in video not covered by Path B, unlicensed audio identified |

*Note: "High" does not automatically mean rejection. It means the Chain of Title documents the specific risk and the reviewer recommends the buyer obtain legal clearance. The submitter may choose to resubmit with corrections.*

---

## Chain of Title PDF Output

**File:** `lib/pdf/ChainOfTitlePDF.tsx` (to be updated for CertForm v2)
**Stamp:** `SI8 VERIFIED · COMMERCIAL AUDIT PASSED`
**Catalog ID format:** `SI8-YYYY-####`

**New fields added to existing 9-field structure:**
- Risk Rating (overall + per-category breakdown)
- Commercial context (intended use, distribution channels, budget range if provided)
- Scene attribution (if provided by submitter)
- Third-party assets declaration
- Post-generation editing disclosure
- Fair use argument summary (if Path C selected)
- Reviewer notes (internal-facing version — redacted summary for client-facing PDF)

*The client-facing PDF shows the Risk Rating and a brief summary of any flags. The full reviewer notes are retained in the database for SI8's internal audit trail only.*

---

## Database Changes Required

New columns needed in `submissions` table (migration required):

| Column | Type | Description |
|--------|------|-------------|
| `campaign_context` | JSONB | `{live_campaign, budget_range, distribution_channels}` |
| `third_party_assets` | JSONB | Stock footage, external models, freelance-generated assets |
| `post_gen_editing` | JSONB | Editing tools, compositing, overlays added in post |
| `scene_attribution` | JSONB array | Up to 5 `{scene_label, tool}` entries |
| `ai_percentage` | text | Under 25% / 25-50% / 50-75% / Over 75% |
| `fair_use_doc_path` | text | Supabase storage path for fair use document upload |
| `likeness_release_path` | text | Supabase storage path for Path B likeness release |
| `ip_license_path` | text | Supabase storage path for Path B IP license |
| `production_evidence_paths` | JSONB array | Storage paths for Section 8 uploads |
| `production_evidence_notes` | text | Free text from Section 8 |
| `content_integrity_accepted` | boolean | Content Integrity Declaration checkbox |
| `scope_acknowledged` | boolean | Scope of Review Acknowledgment checkbox |
| `reviewer_checklist` | JSONB | Completed checklist items + timestamps |
| `risk_rating` | text | Low / Standard / Elevated / High |
| `risk_notes` | JSONB | Per-category risk notes from reviewer |
| `client_name` | text | Agency mode: client/brand name |

---

## What Changes vs. Current Form

| Area | Current | CertForm v2 |
|------|---------|-------------|
| Route | `/submit` (shared) | `/certify` |
| Tier selection | Section 1 of shared form | None — this form IS the certified tier |
| Stamp | CLEARED FOR COMMERCIAL USE | SI8 VERIFIED · COMMERCIAL AUDIT PASSED |
| License paths (S5, S6) | Text description | File upload required |
| Fair Use | No path | Path C with advisory |
| Commercial context | Not collected | Section 2: live campaign, budget, channels |
| Post-gen editing | Not asked | Section 4 addition |
| Third-party assets | Not asked | Section 3 addition |
| Production evidence | Not collected | Section 8 (optional, recommended for E&O) |
| Risk Rating | Not in output | Required — 4-level scale with per-category notes |
| Reviewer workflow | Approve/reject only | Structured 6-step checklist before approve/reject |
| Legal checkboxes | 2 (evidence custodian, indemnification) | 4 (+ content integrity, scope acknowledgment) |
| Brand categories (agency) | Shown to all | Hidden for agency mode |

---

## Peer Review Notes (March 2026)

This PRD incorporates feedback from two rounds of peer review with ChatGPT (Claude Opus framing) and Gemini. Key decisions informed by that feedback:

**Adopted:**
- Video review is mandatory, not implied — this is the core of the $499 value
- "CLEARED" stamp replaced — formal legal designation we cannot sustain
- License text boxes → file uploads for Sections 5 & 6
- Risk Rating added to output — agencies want "should we run this?" not field counts
- Fair Use path added with conservative advisory
- Commercial context layer (budget, channels) added
- Brand categories hidden for agency mode
- Post-gen editing and third-party assets disclosures added
- All legal checkboxes consolidated in Section 11
- Reviewer checklist structured in admin panel
- Production evidence framed as "recommended for E&O" not "entirely optional"

**Deferred to Year 2:**
- Vendor warranties (freelance vendors providing data-source warranties)
- "Known Risk Disclosure" (self-identification of stylistic risks) — creates adversarial witness problem

**Rejected:**
- "Known Risk Disclosure" — if submitter discloses a risk and we clear it, we own it; if they disclose and we reject, we've done the other side's legal work
