# Rights Package Schema

**Version:** v0.1 (February 2026)
**Audience:** SI8 internal reviewer (completing after clean pass); referenced in buyer agreements
**Purpose:** The structured output template for every catalog entry. One schema per work. This is the product SI8 sells to buyers.

---

## What the Rights Package Is

The Rights Package is the documented chain of defensibility for a single work in SI8's catalog. It is not a legal certification. It is a structured record of what was reviewed, what was found, and what was authorized — completed by SI8's Safe Lane reviewer after a successful review.

**The file is the carrier. The Rights Package is the product.**

When a buyer licenses content from SI8, they receive:
1. The content file(s)
2. The Rights Package for that work (or relevant portions)

The Rights Package is what allows buyers to use AI-generated content commercially with confidence — knowing the provenance is documented, the tools are licensed, the authorship claim is supported, and the risk has been assessed by a human reviewer.

---

## Catalog ID Format

`SI8-[YEAR]-[4-digit sequence]`

Examples: `SI8-2026-0001`, `SI8-2026-0002`

Sequence is assigned at the time of Rights Package completion — not at submission. Numbers are assigned in order of completion, not submission date.

---

## Storage Path

`05_Catalog/represented/[filmmaker-name]/[title]/rights-package.md`

Example: `05_Catalog/represented/chen-wei/luminance-short/rights-package.md`

---

## Rights Package Template

Copy this template for each new catalog entry. Fill all fields. Mark "N/A" only where genuinely not applicable. Never leave a field blank.

---

```
# Rights Package
## [Title]

**Catalog ID:** SI8-[YEAR]-[####]
**Filmmaker:** [Name]
**Review Date:** [Date]
**Reviewer:** [Name / initials]
**Rights Package Version:** 1.0
```

---

### Field 1: Tool Provenance Log

*What it captures:* Every AI tool used in production, its version, the plan type, the production period, and whether a commercial license receipt is on file.

*Format:* Structured rows, one per tool.

| Tool | Version / Model | Plan Type | Commercial License | Production Period | Receipt on File |
|------|----------------|-----------|-------------------|-------------------|----------------|
| [Tool name] | [Version or model name] | [Free / Paid / Enterprise] | [Confirmed / Unconfirmed] | [Month/Year – Month/Year] | [Yes / No] |

*Reviewer note:* Every tool must show "Confirmed" commercial license and "Yes" receipt on file to pass. If any tool shows otherwise, the submission did not pass and this Rights Package should not exist.

---

### Field 2: Model Disclosure

*What it captures:* Which AI model(s) generated the content; version at time of production. Distinct from tool — a tool (e.g., Runway) may use multiple underlying models (e.g., Gen-3 Alpha).

*Format:* Plain text.

```
[Tool name]: [Model name and version, as specified at time of production]
[Tool name]: [Model name and version]
```

*Example:*
```
Runway: Gen-3 Alpha (used November 2025)
Adobe Firefly: Firefly Video Model (used November 2025)
ElevenLabs: Multilingual v2 (used November 2025)
```

*Note:* Model version matters because terms, training data, and litigation exposure can differ between model versions. Document what was used at production time, not what the tool currently offers.

---

### Field 3: Safe Lane Sign-off

*What it captures:* Reviewer name, review date, risk tier assigned, any conditions or flags noted during review.

*Format:* Text block.

```
Reviewer: [Name]
Review Date: [YYYY-MM-DD]
Risk Tier: [Certified / Standard / Caution-Flagged]
Review Status: [Clean Pass / Conditional Pass]
Conditions: [List any conditions; "None" if clean pass]
Flags: [List any flags noted; "None" if none]
```

*Risk tier definitions (from REVIEW-PROCESS.md):*
- **Certified:** Adobe Firefly as primary generation tool; no Caution-tier tools; all categories clean.
- **Standard:** Runway / Pika / Sora (paid plans) as primary; no Prohibited tools; all categories pass.
- **Caution-Flagged:** Approved tools used but Caution-tier tool (e.g., Kling) is primary or significant. Licensable with buyer disclosure.

---

### Field 4: Commercial Use Authorization

*What it captures:* Confirmation that each tool's Terms of Service permit commercial licensing of outputs; receipts filed.

*Format:* Checklist + document reference.

| Tool | ToS Commercial Use | Reference | Receipt Filed |
|------|-------------------|-----------|---------------|
| [Tool] | [Permitted / Permitted with restrictions / Review required] | [Rights Playbook section or direct ToS citation] | [Yes — filename] |

*If any tool shows "Permitted with restrictions" — describe the restriction in the Flags field of Field 3.*

---

### Field 5: Modification Rights Status

*What it captures:* Whether the filmmaker has authorized AI-regenerated brand-integrated versions for Tier 2 placement, and the scope of that authorization.

*Format:* Status + scope description.

```
Status: [Authorized — Full Work / Authorized — Scene-Specific / Not Authorized]
Scope: [Description of what is authorized, or "N/A — Tier 1 only"]
Scene List (if scene-specific): [List of authorized scenes with timestamps]
Shopping Agreement Modification Clause: [Confirmed / Pending — must be confirmed before Tier 2 deals can close]
```

---

### Field 6: Category Conflict Log

*What it captures:* Brand categories that are ineligible for placement deals with this work, and why.

*Format:* List. "None — suitable for all mainstream commercial categories" if no restrictions.

```
Ineligible categories:
- [Category]: [Reason — reference specific element or scene]
- [Category]: [Reason]

Suitable for (confirmed categories): [List, or "All mainstream commercial categories"]
```

*Common restriction triggers:* mature themes, alcohol consumption depicted, political references, content unsuitable for children's brands, direct competitor category conflicts (where known).

---

### Field 7: Territory Log

*What it captures:* Geographic licensing restrictions. Restrictions may come from existing distribution agreements, tool training data clauses (e.g., Kling's Taiwan data clause), or filmmaker preference.

*Format:* List, or "Global — no restrictions" if none.

```
Territory: [Global — no restrictions / Restricted — see below]
Restrictions:
- [Territory]: [Reason for restriction]

Existing agreements affecting territory: [List or "None"]
```

---

### Field 8: Regeneration Rights Status

*What it captures:* Whether specific scenes can be AI-regenerated for brand integration (Tier 2), and which scenes. This is the operational detail layer below Field 5.

*Format:* Status + scene list.

```
Status: [Fully authorized / Scene-specific / Not authorized]
Authorized for regeneration:
- [Scene description and timestamp range]: [Notes on what elements can be modified]
- [Scene description and timestamp range]: [Notes]

Not authorized for regeneration:
- [Scene description and timestamp range]: [Reason if known]
```

*Note: This field is completed in conjunction with Field 5. If Field 5 = "Not Authorized," this field = "N/A."*

---

### Field 9: Version History

*What it captures:* Production version of the work, review date, and any subsequent modifications and re-review dates.

*Format:* Log — add entries chronologically.

```
[YYYY-MM-DD] — Production version reviewed. Rights Package v1.0 issued. Catalog ID: [SI8-YEAR-####]
[YYYY-MM-DD] — [Description of any modification, if applicable] — Re-reviewed. Rights Package updated to v[X.X].
```

*Note: If a Tier 2 placement regeneration is commissioned, the regenerated version gets its own Rights Package entry (new Catalog ID, different "filmmaker" = SI8 + original filmmaker, new review date). The original work's version history notes the regeneration event.*

---

## Completed Rights Package Example Structure

```
# Rights Package
## Luminance

**Catalog ID:** SI8-2026-0001
**Filmmaker:** Chen Wei
**Review Date:** 2026-03-15
**Reviewer:** JD
**Rights Package Version:** 1.0

### Field 1: Tool Provenance Log
| Tool | Version / Model | Plan Type | Commercial License | Production Period | Receipt on File |
|---|---|---|---|---|---|
| Runway | Gen-3 Alpha | Paid — Standard | Confirmed | Oct–Nov 2025 | Yes — runway-receipt-2025-10.pdf |
| ElevenLabs | Multilingual v2 | Paid — Creator | Confirmed | Nov 2025 | Yes — elevenlabs-receipt-2025-11.pdf |

### Field 2: Model Disclosure
Runway: Gen-3 Alpha (used October–November 2025)
ElevenLabs: Multilingual v2 (used November 2025)

### Field 3: Safe Lane Sign-off
Reviewer: JD
Review Date: 2026-03-15
Risk Tier: Standard
Review Status: Clean Pass
Conditions: None
Flags: None

[...remaining fields...]

### Field 9: Version History
2026-03-15 — Production version reviewed. Rights Package v1.0 issued. Catalog ID: SI8-2026-0001
```

---

## Year 3 Platform Note

Each field in this schema corresponds to a database column in the Year 3 platform. The schema is designed now to minimize migration cost later.

| Field | Database Column | Type |
|-------|----------------|------|
| 1. Tool Provenance Log | `tool_provenance` | JSON array |
| 2. Model Disclosure | `model_disclosure` | JSON object |
| 3. Safe Lane Sign-off | `review_tier`, `review_date`, `reviewer_id`, `review_flags` | Multiple columns |
| 4. Commercial Use Authorization | `commercial_auth_status` | JSON array |
| 5. Modification Rights | `modification_rights_status`, `modification_scope` | Enum + text |
| 6. Category Conflict | `category_conflicts` | Array |
| 7. Territory | `territory_restrictions` | Array |
| 8. Regeneration Rights | `regeneration_status`, `regeneration_scenes` | Enum + JSON |
| 9. Version History | `version_history` | JSON log |
