# SI8 Assessment Service v1.0
**Status:** Engineering Implementation Specification
**Date:** July 12, 2026
**Project:** SI8 Assessment Service v1.0

---

## Purpose

Implement the first production version of the SI8 Assessment Service.

This service is responsible for:

- Managing SI8 assessments
- Generating public assessment records
- Integrating with the provenance provider (Numbers Protocol)
- Producing stable verification URLs
- Acting as the authoritative system of record

The implementation should support Assessment One while establishing a clean foundation for future growth.

---

## Engineering Principles

**Principle 1 — The Assessment is the primary object.**

Everything else is derived from it.

- The PDF is a representation.
- The Verification Page is a representation.
- The C2PA manifest is a representation.

**Principle 2 — The Assessment Registry is the authoritative source.**

If information differs between PDF, C2PA, and Verification Page — the Registry is authoritative.

**Principle 3 — Numbers provides provenance. SI8 provides commercial assessment.**

Responsibilities must remain separated.

- Never describe SI8 as cryptographically signing media.
- Never describe Numbers as making commercial assessments.

**Principle 4 — Embedded metadata is intentionally minimal.**

Only immutable identifiers belong in the manifest. Reasoning belongs in the report. Evidence belongs inside SI8.

**Principle 5 — Institutional validity and operational processing are different concepts.**

They must never share the same status field.

---

## Architecture

```
Assessment
    │
    ▼
Assessment Service
    │
 ┌──┼──────────┐
 ▼  ▼          ▼
Registry  PDF  Provenance
               │
               ▼
        Verification Page
```

### Components

**Assessment Registry**
Stores canonical assessment metadata.

**PDF Generator**
Produces the client assessment report. Already exists. No functional changes required.

**Provenance Provider**
Abstract interface responsible for provenance signing, C2PA metadata, and provider-specific implementation.

Current implementation: Numbers Protocol Capture.

Future implementations must not require changing assessment logic.

**Verification Page**
Public certificate view of the Registry. Read-only. No authentication.

---

## Non-goals

Do NOT build:

- Customer accounts
- Dashboard
- Search
- Admin UI
- API
- Report version browser
- QR codes
- Bulk operations
- Analytics
- Customer report downloads
- Report editing

---

## Data Model

### Assessment

```
id                    UUID, PK
submission_id         UUID, FK → submissions.id, NOT NULL  (1:1 in v1)
assessment_number     TEXT, UNIQUE, NOT NULL               format: ASSESS-NNN-YYYY-MM-DD
assessment_date       DATE, NOT NULL
methodology_version   TEXT, NOT NULL                       e.g. "SI8 Reviewer Manual v0.1"
reviewer_organization TEXT, NOT NULL                       "PMF Strategy Inc. d/b/a SuperImmersive 8"
outcome               TEXT, NOT NULL                       enum — see below
institutional_status  TEXT, NOT NULL, DEFAULT 'ACTIVE'     ACTIVE | SUPERSEDED | WITHDRAWN
status_reason         TEXT, NULLABLE
processing_status     TEXT, NOT NULL, DEFAULT 'DRAFT'      DRAFT | REPORT_GENERATED | SIGNING | SIGNED | DELIVERED | FAILED
failure_diagnostic    TEXT, NULLABLE                       populate on FAILED; never null when FAILED
verification_url      TEXT, NOT NULL                       https://app.superimmersive8.com/assessment/{assessment_number}
numbers_asset_id      TEXT, NULLABLE                       populated after SIGNED
signed_asset_path     TEXT, NULLABLE                       Supabase storage path; populated after asset downloaded
pdf_hash_sha256       TEXT, NULLABLE                       internal only; not embedded or displayed in v1
created_at            TIMESTAMPTZ DEFAULT now()
updated_at            TIMESTAMPTZ DEFAULT now()
```

**Outcome enum values:**
- `EVIDENCE_SUPPORTS`
- `EVIDENCE_SUPPORTS_WITH_CONDITIONS`
- `MATERIAL_RISKS_IDENTIFIED`
- `INSUFFICIENT_EVIDENCE`
- `UNABLE_TO_ASSESS`

**Intentionally excluded from the Assessment table:**

Customer name, campaign name, evidence, reviewer notes, gap log, confidence, findings, recommendations, internal reasoning.

*Confidence is intentionally excluded from the Registry: it is PDF-only (Zone C).*

**Indexes (each justified by a real query pattern):**

- `assessment_number` — public Verification Page lookup
- `submission_id` — join from submissions; admin lookup
- `(institutional_status, processing_status)` — operational queries (find all ACTIVE+FAILED, etc.)

**Constraints:**

- `submission_id` UNIQUE (enforces 1:1 in v1)
- `assessment_number` UNIQUE
- CHECK constraint on `institutional_status` values
- CHECK constraint on `processing_status` values
- CHECK constraint on `outcome` values

---

## Processing Lifecycle

```
DRAFT
  ↓
REPORT_GENERATED
  ↓
SIGNING
  ↓
SIGNED
  ↓
DELIVERED

Failures (from any step after DRAFT) transition to:
  FAILED
```

FAILED must preserve diagnostic information. Never silently delete failed assessments.

---

## Institutional Lifecycle

Separate from processing. Represents validity of the assessment, not engineering workflow.

```
ACTIVE
  ↓
SUPERSEDED
  ↓
WITHDRAWN
```

---

## ProvenanceProvider Contract

```typescript
interface AssessmentMetadata {
  assessmentNumber: string;
  assessmentDate: string;         // ISO 8601
  reviewerOrganization: string;
  methodologyVersion: string;
  outcomeCode: string;
  verificationUrl: string;
}

interface ProvenanceMetadata {
  digitalSourceType:
    | 'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia'
    | 'http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia'
}

interface SignedAssetResult {
  signedAssetUrl: string;
  provenanceAssetId: string;
}

interface ProvenanceProvider {
  sign(
    asset: Buffer,
    assessment: AssessmentMetadata,
    provenance: ProvenanceMetadata
  ): Promise<SignedAssetResult>
}
```

**Current implementation:** `NumbersProvenanceProvider`

**v1 default for `digitalSourceType`:** `compositeWithTrainedAlgorithmicMedia` — covers the typical agency composited video workflow. Make reviewer-settable in v2.

---

## Regulatory Boundary

`digitalSourceType` is provenance metadata. It is not part of SI8's assessment. It exists for ecosystem interoperability.

It must never be described as:

- Article 50 compliance
- Regulatory compliance
- Deployer disclosure
- Legal advice

It carries no compliance claim.

---

## Numbers Integration Workflow

```
Assessment Complete
    ↓
Generate PDF (existing flow)
    ↓
Compute PDF SHA-256 → store in assessments.pdf_hash_sha256
    ↓
Persist Assessment (processing_status = REPORT_GENERATED)
    ↓
Call ProvenanceProvider.sign(mp4Buffer, assessmentMetadata, provenanceMetadata)
    ↓  (processing_status = SIGNING)
Receive SignedAssetResult
    ↓
Download signed MP4 from signedAssetUrl
    ↓
Store in Supabase Storage (signed-assets bucket, private)
    ↓
Update Assessment: numbers_asset_id, signed_asset_path, processing_status = SIGNED
    ↓
Deliver to customer
    ↓
processing_status = DELIVERED
```

Do not create public assessment pages pointing to missing signed assets.

**If provenance signing fails:**

- Preserve assessment record
- Mark processing_status = FAILED
- Populate failure_diagnostic (error message, step name, timestamp)
- Log diagnostic information server-side
- Allow retry

Do not silently discard work.

**Retries must be safe.** If `numbers_asset_id` is already set, do not call Numbers again.

---

## C2PA Manifest — Approved Embedded Fields (v1)

Embed via Numbers Capture API as custom assertions under namespace `si8.commercial-assurance/v1`:

- `si8:assessment_number`
- `si8:assessment_date`
- `si8:reviewer_organization`
- `si8:methodology_version`
- `si8:outcome_code`
- `si8:verification_url`

Standard C2PA field (via Numbers, in the `c2pa.actions` assertion):

- `digitalSourceType` with the appropriate IPTC URI

**Do not embed:**

Confidence, report hash (v1 deferral), findings, customer information, tool names, evidence, intermediate reasoning, likeness conclusions.

Report hash is stored in `assessments.pdf_hash_sha256` internally only.

---

## Verification Page

**Route:** `app/assessment/[assessment_number]/page.tsx`
**URL:** `/assessment/{assessment_number}`
**Access:** Public, no authentication

### Displayed fields

- Assessment Number (monospace)
- Institutional Status (prominent banner if SUPERSEDED or WITHDRAWN)
- Outcome (human-readable label)
- Assessment Date
- Methodology Version
- Reviewer Organization
- Assessment Scope (the 7 domains reviewed — no scores, no gap indicators, no findings)
- Numbers Verification Link (when `numbers_asset_id` is populated)

### Assessment Scope domains

1. Identity & Accountability
2. Commercial Rights
3. Human Creative Contribution
4. Third-Party IP
5. Likeness
6. Technical Provenance
7. Documentation Integrity

### Footer (verbatim — do not edit)

> This assessment represents SI8's independent commercial assurance opinion based on the evidence submitted at the assessment date. It is not legal advice.

### Error states

| State | Display |
|-------|---------|
| Unknown assessment number | 404 — clean message, no stack trace |
| SUPERSEDED | Prominent banner; link to replacement assessment when status_reason identifies it |
| WITHDRAWN | Prominent banner; historical metadata remains visible |
| Numbers unavailable | "Provenance verification is temporarily unavailable." Assessment info still shows. |

### Visual style

- Typography-first, institutional, restrained
- Existing design system: Space Grotesk + Inter, `#FAFAF7` background, `#1a1918` text, `#C8900A` amber
- Monospace for Assessment Number and identifier-type values
- No marketing language, hero sections, animations, gradients, or dashboards
- No new third-party UI or animation dependencies

### Security

Public page must never expose: customer identity, campaign identity, uploaded files, evidence, reviewer notes, internal comments, confidence, findings, recommendations, or internal reasoning.

---

## Deliverables

1. Database migration for `assessments` table
2. TypeScript domain types and enums
3. Assessment repository/service layer
4. `ProvenanceProvider` contract and types
5. `NumbersProvenanceProvider` adapter (with explicit TODOs for every unconfirmed API detail)
6. `MockProvenanceProvider` for tests
7. Signed-file storage flow (Supabase private bucket)
8. Public Verification Page
9. Institutional-status rendering (ACTIVE/SUPERSEDED/WITHDRAWN states)
10. Error states (unknown assessment, Numbers unavailable)
11. Unit and integration tests for critical boundaries
12. Environment variable documentation
13. Implementation note: assumptions, unresolved external dependencies, deviations from PRD

Do not claim implementation is production-ready until the Numbers API contract is validated and relevant tests pass.

---

## Accepted Design Decisions (resolved before implementation)

| Decision | Resolution |
|----------|-----------|
| `assessment_number` format | `ASSESS-NNN-YYYY-MM-DD` — zero-padded sequential NNN |
| `assessments` ↔ `submissions` | 1:1 FK in v1; `submissions.id` NOT NULL |
| `digitalSourceType` source | v1 default: `compositeWithTrainedAlgorithmicMedia`; reviewer-settable in v2 |
| Confidence | PDF-only (Zone C). Not in Registry, manifest, or Verification Page. |
| Report hash | Stored internally as `pdf_hash_sha256`. Not embedded in manifest or displayed. Defer to v2. |
| Signed MP4 storage | Download from Numbers; store in private Supabase Storage `signed-assets` bucket. |
| Executive Summary on Zone B | Excluded. Verification Page is a certificate, not a report summary. |
| Scope display on Zone B | Domain names only. No gap indicators, no coverage scores. |

---

## Final Note

This PRD is normative.

Follow its architectural boundaries. If an alternative implementation is superior in some detail, document the tradeoff in the implementation note — but do not redesign the underlying architecture without written justification. Engineering improvements are encouraged; architectural substitutions require evidence. This distinction is intentional and reflects SI8's broader governance model.

---

*SI8 Assessment Service PRD v1.0 · PMF Strategy Inc. d/b/a SuperImmersive 8 · July 12, 2026*
