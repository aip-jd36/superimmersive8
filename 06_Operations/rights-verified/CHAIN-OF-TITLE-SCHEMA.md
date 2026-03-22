# Chain of Title Schema

**Version:** v0.2 (March 2026)
**Audience:** SI8 internal reviewer; referenced in buyer agreements
**Purpose:** Structured output template for every catalog entry. This is the product SI8 sells to buyers.
**Changes in v0.2:** Added Training Data Disclosure column to Field 1; added Prompt & Iteration Records note to Field 2; added Regulatory Notes to Field 7 (UK/EU). All changes reflect distributor/E&O insurer requirements per March 2026 practitioner guidance.

---

## What the Chain of Title Is

The Chain of Title is the documented chain of defensibility for a single work in SI8's catalog.

**It is not a legal certification.** It is a structured record of what was reviewed, what was found, and what was authorized.

**The file is the carrier. The Chain of Title is the product.**

When a buyer licenses content from SI8, they receive:
1. The content file(s)
2. The Chain of Title documentation

The Chain of Title allows buyers to use AI content commercially with confidence — knowing provenance is documented, tools are licensed, authorship claim is supported, and risk assessed by human reviewer.

---

## Catalog ID Format

`SI8-[YEAR]-[4-digit sequence]`

Examples: `SI8-2026-0001`, `SI8-2026-0002`

Sequence assigned at Chain of Title completion (not at submission). Assigned in completion order, not submission date order.

---

## Storage Path

`05_Catalog/represented/[filmmaker-name]/[title]/chain-of-title.md`

Example: `05_Catalog/represented/chen-wei/luminance-short/chain-of-title.md`

---

## Chain of Title Template (9 Fields)

Copy this template for each new catalog entry. Fill all fields. Mark "N/A" only where genuinely not applicable. Never leave blank.

---

```markdown
# Chain of Title
## [Title]

**Catalog ID:** SI8-[YEAR]-[####]
**Filmmaker:** [Name]
**Review Date:** [YYYY-MM-DD]
**Reviewer:** [Name]
**Chain of Title Version:** 1.0
```

---

### Field 1: Tool Provenance Log

**What it captures:** Every AI tool used, version, plan type, production period, receipt status.

**Format:** Structured table

| Tool | Version/Model | Plan Type | Commercial License | Production Period | Receipt on File | Training Data Disclosure |
|------|--------------|-----------|-------------------|-------------------|-----------------|--------------------------|
| [Tool name] | [Version] | Free/Paid/Enterprise | Confirmed/Unconfirmed | [Month/Year – Month/Year] | Yes/No | Confirmed / Unconfirmed / N/A |

**Training Data Disclosure values:**
- **Confirmed** — Vendor has provided written disclosure of training data sources (e.g., Adobe: trained on Adobe Stock + licensed content only)
- **Unconfirmed** — Vendor has not provided written training data disclosure; training data provenance unknown
- **N/A** — Tool does not generate content from training data (e.g., post-processing tools)

**Reviewer note:** Every tool must show "Confirmed" commercial license and "Yes" receipt to pass. If any shows otherwise, submission did not pass. Training Data Disclosure does not affect pass/fail but is noted in the Chain of Title because distributors and E&O underwriters now specifically request this information (per entertainment attorney practice guidance, March 2026). "Unconfirmed" tools carry higher distributor scrutiny.

---

### Field 2: Model Disclosure

**What it captures:** Which AI model(s) generated content; version at production time. Distinct from tool — tool (Runway) may use multiple models (Gen-3 Alpha).

**Format:** Plain text list

```
[Tool name]: [Model name and version, as specified at production time]
[Tool name]: [Model name and version]
```

**Example:**
```
Runway: Gen-3 Alpha (used November 2025)
Adobe Firefly: Firefly Video Model (used November 2025)
ElevenLabs: Multilingual v2 (used November 2025)
```

**Note:** Model version matters because terms, training data, litigation exposure differ between versions. Document what was used at production time, not current offering.

**Prompt retention note:** SI8 does not collect raw prompts (trade secrets). However, the Chain of Title should note whether the filmmaker has confirmed they retain prompt logs and iteration records internally. This satisfies the "paper trail" requirement that distributors and E&O underwriters now request (per entertainment attorney practice guidance, March 2026) without requiring disclosure of proprietary creative process.

Add to Field 2 when applicable:
```
Prompt & Iteration Records: Retained by filmmaker (confirmed) / Not confirmed
```

---

### Field 3: Rights Verified Sign-off

**What it captures:** Reviewer, date, risk tier, conditions/flags.

**Format:** Text block

```
Reviewer: [Name]
Review Date: [YYYY-MM-DD]
Risk Tier: [Certified / Standard / Caution-Flagged]
Review Status: [Clean Pass / Conditional Pass]
Conditions: [List any conditions; "None" if clean]
Flags: [List any flags; "None" if none]

Licensed Likenesses: [None / See below]
Licensed IP: [None / See below]
Underlying Rights: [Original work / Adapted with permission — see below]
Third-Party Assets: [None / See below]
```

**If Licensed Likenesses present:**
| Person Name | Likeness Type | Consent Documentation | Scope | Date |
|-------------|---------------|----------------------|-------|------|
| [Name] | Face/Voice/Both | [Signed release/License/Estate permission] | [Commercial, AI derivatives, third-party licensing] | [YYYY-MM-DD] |

**If Licensed IP present:**
| IP Name | IP Type | Rights Holder | Permission Documentation | Scope |
|---------|---------|---------------|-------------------------|-------|
| [Name] | [Character/Brand/Trademark] | [Rights holder] | [License agreement/Permission letter] | [Commercial, AI derivatives, territory] |

**If Adapted from existing work:**
- Original source: [Book/Screenplay/Article/etc.]
- Rights holder: [Name]
- Permission documentation: [filename.pdf]

**If Third-Party Assets used:**
| Asset Type | Source | License | Coverage |
|------------|--------|---------|----------|
| [Font/SFX/Stock footage/Overlay] | [Source/platform] | [License type] | [Commercial use confirmed] |

**Risk tier definitions:**
- **Certified:** Adobe Firefly primary; no Caution-tier tools; all categories clean
- **Standard:** Runway/Pika/Sora (paid) primary; no Prohibited tools; all categories pass
- **Caution-Flagged:** Approved tools but Caution-tier (Kling) primary/significant. Licensable with buyer disclosure.

---

### Field 4: Commercial Use Authorization

**What it captures:** Confirmation each tool's ToS permits commercial licensing; receipts filed.

**Format:** Checklist + reference

| Tool | ToS Commercial Use | Reference | Receipt Filed |
|------|-------------------|-----------|---------------|
| [Tool] | Permitted / Permitted with restrictions / Review required | [Rights Playbook section or ToS citation] | Yes — [filename] |

**If any tool shows "Permitted with restrictions" — describe restriction in Flags (Field 3).**

---

### Field 5: Modification Rights Status

**What it captures:** Whether filmmaker authorized AI-regenerated brand-integrated versions (Tier 2), and scope.

**Format:** Status + scope

```
Status: [Authorized — Full Work / Authorized — Scene-Specific / Not Authorized]
Scope: [Description or "N/A — Tier 1 only"]
Scene List (if scene-specific): [Authorized scenes with timestamps]
Shopping Agreement Modification Clause: [Confirmed / Pending — must confirm before Tier 2 deals]
```

---

### Field 6: Category Conflict Log

**What it captures:** Brand categories ineligible for placement deals, and why. Includes existing brand placements.

**Format:** List or "None"

```
Existing Brand Placements (if any):
- [Brand/Product]: [Scene/timestamp] — affects Tier 2 eligibility for competing brands

Ineligible categories:
- [Category]: [Reason — reference specific element/scene]
- [Category]: [Reason]

Suitable for: [List, or "All mainstream commercial categories"]
```

**Common triggers:** Mature themes, alcohol depicted, political references, content unsuitable for children's brands, competitor category conflicts, existing brand placements.

---

### Field 7: Territory Log

**What it captures:** Geographic licensing restrictions from existing agreements, tool clauses (Kling's Taiwan data), or filmmaker preference.

**Format:** List or "Global"

```
Territory: [Global — no restrictions / Restricted — see below]

Restrictions:
- [Territory]: [Reason]

Existing agreements affecting territory: [List or "None"]

Regulatory notes (if UK/EU buyer):
- UK: Parliament (March 2026) recommending mandatory AI content labeling and provenance standards — this Chain of Title document satisfies the intent of proposed transparency requirements
- EU: EU AI Act Article 50 (effective August 2026) requires AI-generated video/audio to be clearly identifiable as artificial; machine-readable watermarks or metadata recommended
```

**Regulatory note (March 2026):** For UK and EU-bound licensing, this Chain of Title document is the early-market version of the provenance and transparency standards that regulators are moving to mandate. Include the regulatory note field for any submission with UK/EU territory licensing.

---

### Field 8: Regeneration Rights Status

**What it captures:** Which specific scenes can be AI-regenerated for brand integration (Tier 2). Operational detail layer below Field 5.

**Format:** Status + scene list

```
Status: [Fully authorized / Scene-specific / Not authorized]

Authorized for regeneration:
- [Scene description and timestamp]: [Notes on modifiable elements]
- [Scene description and timestamp]: [Notes]

Not authorized for regeneration:
- [Scene description and timestamp]: [Reason if known]
```

**Note:** If Field 5 = "Not Authorized," this field = "N/A."

---

### Field 9: Version History

**What it captures:** Production version, review date, subsequent modifications and re-reviews.

**Format:** Chronological log

```
[YYYY-MM-DD] — Production version reviewed. Chain of Title v1.0 issued. Catalog ID: [SI8-YEAR-####]
[YYYY-MM-DD] — [Modification description, if applicable] — Re-reviewed. Chain of Title updated to v[X.X].
```

**Note:** If Tier 2 placement regeneration commissioned, regenerated version gets own Chain of Title (new Catalog ID, different "filmmaker" = SI8 + original filmmaker). Original work's version history notes regeneration event.

---

## Completed Example

```markdown
# Chain of Title
## Luminance

**Catalog ID:** SI8-2026-0001
**Filmmaker:** Chen Wei
**Review Date:** 2026-03-15
**Reviewer:** JD
**Chain of Title Version:** 1.0

### Field 1: Tool Provenance Log
| Tool | Version | Plan Type | Commercial License | Production Period | Receipt on File |
|------|---------|-----------|-------------------|-------------------|-----------------|
| Runway | Gen-3 Alpha | Paid — Standard | Confirmed | Oct–Nov 2025 | Yes — runway-receipt-2025-10.pdf |
| ElevenLabs | Multilingual v2 | Paid — Creator | Confirmed | Nov 2025 | Yes — elevenlabs-receipt-2025-11.pdf |

### Field 2: Model Disclosure
Runway: Gen-3 Alpha (used October–November 2025)
ElevenLabs: Multilingual v2 (used November 2025)

### Field 3: Rights Verified Sign-off
Reviewer: JD
Review Date: 2026-03-15
Risk Tier: Standard
Review Status: Clean Pass
Conditions: None
Flags: None

### Field 4: Commercial Use Authorization
| Tool | ToS Commercial Use | Reference | Receipt Filed |
|------|-------------------|-----------|---------------|
| Runway | Permitted | Rights Playbook v0.1 Section 4.2 | Yes — runway-receipt-2025-10.pdf |
| ElevenLabs | Permitted | Rights Playbook v0.1 Section 4.5 | Yes — elevenlabs-receipt-2025-11.pdf |

### Field 5: Modification Rights Status
Status: Authorized — Full Work
Scope: All scenes authorized for brand integration regeneration
Scene List: N/A (full work)
Shopping Agreement Modification Clause: Confirmed — signed 2026-02-10

### Field 6: Category Conflict Log
Ineligible categories: None
Suitable for: All mainstream commercial categories

### Field 7: Territory Log
Territory: Global — no restrictions
Restrictions: None
Existing agreements affecting territory: None

### Field 8: Regeneration Rights Status
Status: Fully authorized
Authorized for regeneration: All scenes (full work)
Not authorized for regeneration: N/A

### Field 9: Version History
2026-03-15 — Production version reviewed. Chain of Title v1.0 issued. Catalog ID: SI8-2026-0001
```

---

## Year 3 Platform Note

Each field = database column in Year 3 platform. Schema designed now to minimize migration cost later.

| Field | Database Column | Type |
|-------|-----------------|------|
| 1. Tool Provenance | `tool_provenance` | JSON array |
| 2. Model Disclosure | `model_disclosure` | JSON object |
| 3. Rights Verified Sign-off | `review_tier`, `review_date`, `reviewer_id`, `review_flags` | Multiple columns |
| 4. Commercial Use Authorization | `commercial_auth_status` | JSON array |
| 5. Modification Rights | `modification_rights_status`, `modification_scope` | Enum + text |
| 6. Category Conflict | `category_conflicts` | Array |
| 7. Territory | `territory_restrictions` | Array |
| 8. Regeneration Rights | `regeneration_status`, `regeneration_scenes` | Enum + JSON |
| 9. Version History | `version_history` | JSON log |

---

*Version: v0.2 — March 2026*
*This schema will evolve. Version to v0.3 after first 3 real catalog entries.*
