# CR-DESIGN-2A — Presentation identity and versioning contract

**Status: PROPOSED — NOT APPROVED.** Nothing here is activated; no template, generator or approval changes until a separate, founder-approved release.

## 1. Today's three identities

| Identity | What it covers | Where | Printed in the PDF? |
|---|---|---|---|
| **Template fingerprint** | SHA-256 of the canonical JSON of the PDF template set (wording, labels, slots, the readiness summary and render sets). Data only. **It covers no layout, style or font.** | `customer-pdf/templates.ts` (`templateFingerprint`); approvals in `governed/sources.ts` | Yes: "Document layout version" / "Document layout fingerprint" (v5 labels) |
| **Generator version** | The code that rendered an artifact; decides resumption (`ownsGeneratorVersion`) and the takeover guard (`rerenderOnlySameGenerator`) | `lib/creator-record-artifacts/renderers.ts` (`creator-record-v2-pdf-v3`) | No (artifact row only) |
| **Issued PDF fingerprint** | SHA-256 of the stored bytes of one issued artifact; bytes are not reproducible (creation time, file id) | artifact row | No |

The design's appendix calls the template fingerprint a "Layout fingerprint", and the approved label is "Document layout fingerprint". Today that is a misnomer: two visually different renderers produce the same printed value.

## 2. Proposal: bind a presentation contract into the template fingerprint

Smallest safe extension: **one new field in new template sets only.**

```
presentation: {
  contract: "si8/creator-record-pdf-presentation",
  version: 1,
  fingerprint: "<sha256 of the canonical presentation configuration>"
}
```

The **presentation configuration** is a data-only object registered in code (beside the renderer) and canonicalised like the template set:

| Covered | Content |
|---|---|
| Contract identity | `contract`, `version` |
| Page geometry | page size (A4), margins, column width, register page grounds |
| Recurring chrome | which approved strings occupy the running header, footer and first-page disclosure; minimum size and colour token for each; "on every page" flags |
| Design tokens | colour, type scale, spacing and radius values used by the renderer |
| Font identities | for each family and weight: family name, file name, SHA-256 of the font file, licence; the ordered fallback stack (Noto Sans CJK TC, pinned `dce08bd4…`) |
| Component and placement configuration | the C1–C8 rules of `03-CONSIDERATION-PRESENTATION-CONTRACT.md` as parameters (keep-together thresholds, caveat-placement mode, register page breaks, internal links on/off) |
| Rendering implementation identity | `renderer: { id: "si8/creator-record-v2-pdf-presentation", implementation: "institutional-trust", version: 1 }`. The renderer refuses a template whose presentation contract or implementation it does not implement (fail closed) |

The template fingerprint then covers the wording **and** the referenced presentation fingerprint. The renderer recomputes the configuration fingerprint at render time and refuses on mismatch (a new refusal code, e.g. `presentation_mismatch`, in the same fail-closed path as `fingerprint_mismatch`).

**What this does not establish.** A configuration fingerprint shows which approved configuration and which declared implementation were selected. It does **not** prove the rendered page layout: layout is computed by `@react-pdf` code (and its pinned dependency versions), which no data fingerprint covers. Code identity remains the generator version plus the deployed commit. The output of one render remains the issued-PDF fingerprint. No document or UI may claim that the "Document layout fingerprint" certifies the visual layout of the PDF.

**Alternatives considered:**
- (a) **Generator version only, no binding.** Simplest, but the printed "Document layout" values stay identical across visual designs. Not recommended.
- (b) **Inline the whole configuration in the template JSON.** Same binding, but mixes non-wording data into the wording-locked set and makes wording review noisier. Not recommended.

Legacy sets (v1–v5) have no `presentation` field and keep rendering with today's layout code. That keeps rollback and audit possible; issued PDFs are never re-rendered anyway.

## 3. Proposed versions

| Item | Today | Proposed | Note |
|---|---|---|---|
| Schema 7 PDF template set | v4 `d4ecf3f3…` approved | **v6**, pending → approved at cutover; v4 → superseded | Exactly one approved set per schema (`approvedPdfTemplates`) |
| Schema 8 PDF template set | v5 `a27e23cd…` approved | **v7**, pending → approved at cutover; v5 → superseded | Same |
| Readiness render sets | v1 (schema 7), v2 (schema 8) | new versions **only if** render wording changes; otherwise carried unchanged inside v6/v7 | Their fingerprints are part of the set |
| Presentation contract | none | `si8/creator-record-pdf-presentation` v1 | Registered in code; referenced by v6/v7 |
| Generator | `creator-record-v2-pdf-v3` | **`creator-record-v2-pdf-v4`** | The existing regex `^creator-record-v2-pdf-v[1-9][0-9]*$` and the database trigger already accept it: **no migration** |

## 4. Checked effects on existing contracts

| Contract | Effect | Evidence |
|---|---|---|
| Issued artifacts | None. Stored bytes are never re-rendered. CR-2026-719228D9 (`-pdf-v1`), CR-2026-8D1022F5 (`-pdf-v2`) and CR-2026-7E82CA09 (`-pdf-v3`) stay as issued | `lib/creator-record/README.md` "Current state" |
| Takeover / missing-artifact retry | A pending v3 row whose object is missing is **refused**, not re-rendered by v4 → manual reconciliation. Cutover needs the same drain gate as Build B: paid-not-completed = 0, no pending v2 rows | `renderers.ts` (`rerenderOnlySameGenerator`), guard `b6889585` |
| Checkout and issuance renderability | Checkout and issuance render-check against the **currently approved** set for the record's schema; a paid order is not bound to a template version. An order paid before cutover and issued after it is rendered with v6/v7. **Requirement:** every closed label map in v6/v7 (field, qualifier, classification, limitation, failure, response, method, content, dependency, fact, conclusion and topic labels) must be a superset of v4/v5, or a paid order could fail with `templates_unavailable` | `customer-flow/purchase.ts:35-36, 168-216, 225-239` |
| Prepared-record eligibility | None. Template approval is separate from the Source Text Approval; a template change never changes a prepared record, its digest or its eligibility (`eligibility.ts` reads no template) | `customer-pdf/templates.ts` header; `customer-record/eligibility.ts` |
| Consent and AI-permission identifiers | None. Identifiers are `<wording>__privacy-2026-11-09__terms-2026-11-14` and are not template-bound; the authority row needs no change | `lib/creator-record-flow/authorization-versions.ts`; migration `20261113000000` |
| Terms of Service `terms-2026-11-14` | Not changed, but **constrains the design**: §4 "your response is printed beside it" → the reading's `your_response` row must stay beside its reading (the mockups have no slot for it); §4 "Readings are not used to select or change the guidance" and §5 "Other tools and services can be listed in your record but receive no guidance; that is not a finding about them" → the uncovered-tools statement must stay | `lib/legal/policies.ts` |
| Privacy Notice `privacy-2026-11-09` | Not changed. It describes the record's contents (declarations, guidance, readings), which do not change | same |
| Rollback | Build B stays a valid rollback: it renders with v4/v5 and refuses to resume v4-generator pending rows. Build A stays the floor | `renderers.ts` |

## 5. Approvals required at release (not now)

- Founder: approve the v6/v7 sets with their fingerprints (as F1/F2 did for v4/v5) and the presentation contract, superseding F3.
- LK governance (PM role): classify any new non-proposition Customer Explanatory Text (as R1–W1 were).
- PM/Architecture: build and UAT acceptance; cutover authorisation (drain gate, guarded cutover).
- Unchanged and unaffected: Terms, Privacy Notice, consent, AI permission. No operator database change is expected.
