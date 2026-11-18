# CR-DOC-READER-EXT-1 — Path 1 local implementation record

**Status: IMPLEMENTED LOCALLY, INACTIVE.** Branch `work/cr-doc-reader-ext-1`, not pushed or deployed. No claim is activated, no
paid evaluation was run and no Production record was issued. Founder authorization: "CR-DOC-READER-EXT-1 — Bounded Local
Implementation" (2026-11-18): Path 1 (document-informed assessment after governed composition) for four candidate claims.

## Decision history (not rewritten)

- **Original D10** (PRD v0.3 §0.1, PM decision, 2026-10-25): "Receipt matching remains gated, with a display-only fallback."
  **Unchanged and in force.** Nothing here compares a reading with a declaration or makes a positive or negative receipt-matching
  claim; comparison method v2 still withholds every comparison.
- **CR-PDF-DECISION-1** (founder direction, 2026-11-13): readings shown only in the documents section, never inside guidance.
  Its rationale was not recorded at the time. **Current founder recollection (2026-11-18), not independently verified:** it was an
  MVP release precaution. The founder authorized reconsidering it for this bounded milestone. It still governs every approved
  template set; no set has been changed.
- **MVP scope §3** (PM, 2026-11-01) names document observations as an intended input; §9 (founder, 2026-11-10) deferred feeding
  them into applicability. Path 1 stays after composition and does not feed applicability.

## What was built (all inactive)

| Part | Commit | What |
|---|---|---|
| A | `c63cfe96` | Optional `selection_questions` on Creator Record ledger entries; refusal `selection_question_not_authorized`; enforced in integration (before BI), composition and the record builder. Draft candidates (`governed/candidates/cr-doc-reader-ext-1.ts`) |
| B | `f25660f9` | Receipt engine generalised at the type level; `licence-extraction-v1` / `licence-prompt-v1`; licence profile v1 (pinned); category → profile selection (defined, not wired) |
| C | `72a5d0a8` | Integrated assessment method v2: governed dependency rows may relate documents (approved evidence note + governed relevance table), fail closed, never satisfied |
| D | this commit | Draft v2 wording candidate (lock-checked) and this record |

The four candidates: `CLAIM-MUSIC-ARTLIST-SOCIAL-VS-PRO-001-v1`, `CLAIM-MUSIC-EPIDEMIC-TIER-ADVERTISING-001-v1` (M1 only);
`CLAIM-STOCK-EDITORIAL-001-v2`, `CLAIM-POND5-EDITORIAL-COMMERCIAL-USE-CONSENT-001-v1` (M3 only). The authorization named the
Pond5 claim without `-CONSENT-`; the governed id includes it.

## Boundaries kept

Retrieval, Bounded Interpretation, governed propositions, the live ledger, approved template sets, issued PDFs, the questionnaire,
the attachment schema, the customer examination path (still the receipt profile), issuance support, consent and withdrawal: all
unchanged. The approved PDF template contract labels exactly the v1 integrated-assessment codes and the closed limitation
vocabulary; v2 has its own vocabulary and the licence profile uses only existing limitation codes, so no approved set is affected.

## Not done in this milestone (stopped rather than widened)

- **Integrated PDF template set.** Printing method v2 needs a new template-contract version, renderer changes and a relaxation of
  the CR-PDF-DECISION-1 layout guard for the new set only. Only a draft wording candidate exists.
- **Wiring the category into examination.** The examination request carries only the document id and the document row stores no
  category: wiring needs an endpoint contract change (or storing the category).
- **Releases** (privacy review), live licence-profile evaluation (paid, approval needed), Production activation.

## Approvals needed before any activation

1. The four ledger entries (explanations, `requirements_met`, `selection_questions`, caveats, refresh) and a new ledger version.
2. Four dependency labels, through a new Source Text approval.
3. The governed relevance table and the evidence notes.
4. The v2 PDF wording, a new template set version, and relaxing the layout guard for that set only.
5. Counsel review of all customer text.
6. Evaluation spend for the licence profile, then its registration (live registry, issuance support) and the examination-request
   contract change.
