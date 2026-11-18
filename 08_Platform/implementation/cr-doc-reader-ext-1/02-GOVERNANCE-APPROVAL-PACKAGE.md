# CR-DOC-READER-EXT-2 — Governance approval package (Path 1)

**Status: PREPARED FOR REVIEW — NOTHING HERE IS APPROVED OR ACTIVE.** Each item below needs an explicit decision. Approving an item
does not activate it: activation is a separate, later step (new ledger version, Source Text approval, template registration and
selection, and the live-profile and evaluation steps).

The exact text of every item is in code, so the review can be against the precise strings that would ship:

| Item | Source of truth |
|---|---|
| Ledger entries, explanations, evidence notes, dependency labels | `08_Platform/app/lib/creator-record/governed/candidates/cr-doc-reader-ext-1.ts` |
| Dependency relevance mapping | `08_Platform/app/lib/creator-record/integrated-assessment/dependency-relevance.ts` |
| v2 PDF wording | `08_Platform/app/lib/creator-record/integrated-assessment/v2-wording-candidate.ts` |
| Template set v8 | `08_Platform/app/test-support/doc-reader-ext-2-template.ts` (proposed sets live in test-support) |

## D1. Founder decision: limited post-MVP Living Knowledge expansion (to record)

MVP scope §10.1 (founder, 2026-11-11) deferred "broader Living Knowledge expansion" until after the MVP. Proposed decision, **for
the founder to confirm in writing**: lift that deferral for **exactly** the four claims in D2, for Creator Record only, through
question-scoped entries (music from M1, stock from M3). Consequence to acknowledge: publication changes Creator Record guidance for
every creator who names Artlist or Epidemic Sound for music, or Getty, iStock, Shutterstock, Adobe Stock or Pond5 for stock,
whether or not they add a document. No other claim, provider or topic is included. Likeness and copyright publication are unchanged.

## D2. Four Creator Record ledger entries

All are existing, Adopted, non-superseded, CRC-published governed claims; jurisdiction Global; no applicability requirement beyond
provider scope. Common settings: `applicability_policy: requirements_met` (open dependencies cap the conclusion at "relevant,
applicability unresolved"; `met_only` would never show them); caveats `CR-CAV-PROVIDER-OWN-TERMS`, `CR-CAV-TERMS-CHANGE`; refresh
three months after the decision date (Runway precedent).

| Claim (exact governed id) | Last verified | Selection | Evidence notes for |
|---|---|---|---|
| `CLAIM-MUSIC-ARTLIST-SOCIAL-VS-PRO-001-v1` | 2026-09-10 | M1 only | `artlist_license_type_confirmed` |
| `CLAIM-MUSIC-EPIDEMIC-TIER-ADVERTISING-001-v1` | 2026-09-10 | M1 only | `epidemic_license_tier_confirmed` |
| `CLAIM-STOCK-EDITORIAL-001-v2` | 2026-08-27 | M3 only | `editorial_designation_confirmed`, `separate_authorization_obtained` |
| `CLAIM-POND5-EDITORIAL-COMMERCIAL-USE-CONSENT-001-v1` | 2026-08-30 | M3 only | `editorial_designation_confirmed`, `separate_authorization_obtained` |

Note: the authorization text named the Pond5 claim without `-CONSENT-`; the governed id above is the correct one.

Each explanation is a new draft (never copied from CRC text) and stays within the claim's CRC publication scope: it never says which
licence or tier the account holds, whether an asset is Editorial, whether consent exists, or that a project is cleared. Each
evidence note says only that a document **may** show something relevant, that SI8 did not check it, and that it does not confirm
the point.

## D3. Source Text dependency labels (new Source Text approval)

Without an approved label the record build fails closed. Proposed:

| Dependency | Label |
|---|---|
| `artlist_license_type_confirmed` | Which Artlist licence applies |
| `epidemic_license_tier_confirmed` | Which Epidemic Sound licence tier applies |
| `editorial_designation_confirmed` | Whether the asset is marked Editorial |
| `separate_authorization_obtained` | Whether separate written authorisation was obtained |

`which_music_provider` and `which_provider` already have approved labels.

## D4. Dependency-to-observation relevance mapping (governance data)

| Dependency | Declared category → reading profile → fields that may show something relevant |
|---|---|
| `artlist_license_type_confirmed`, `epidemic_license_tier_confirmed` | `licence` → licence → `licence_or_plan_type`; `billing_receipt` → receipt → `product_or_plan_name`, `plan_candidate` |
| `editorial_designation_confirmed` | `licence` → licence → `content_designation` |
| `separate_authorization_obtained` | `permission`, `licence` → licence → `permission_statement` |

Provider-identity dependencies are not mapped. The mapping can only produce "may be relevant (automated reading, not checked)"; it
never marks a dependency satisfied or a document sufficient. Association is the creator's declared category only and fails closed
(both M1 and M3 answered; a permission while M4 is answered; a document linked to an AI tool; a category changed after reading).

## D5. PDF wording and template set v8

- **Set:** schema 8, version 8, fingerprint `351843de17538f0316c8f2c6c1e3467df96bea7cfbb77e1f02cbb1c919c7ca73`, built from the approved
  v7 (`5d7ccfc8…61ab`) by additions plus one revised line. Approval lifecycle `pending` (refused for issuance today).
- **Additions:** labels for the licence profile's fields and classifications; the `integrated_assessment_v2` block (printed in the
  documents section, after what each document appears to show, with the reading and the link to the point on separate rows, the
  association disclaimer and "This point remains open").
- **Revised line** (`not_done` 5): v7 "SI8 did not compare your documents, or their readings, with what you told SI8 or with the
  guidance." → v8 "SI8 did not compare your documents, or their readings, with what you told SI8. Where this record links a document
  to an open point in the guidance, the link does not settle that point." Reason: with v2 the v7 clause "or with the guidance" would
  be untrue.
- **Layout guard:** CR-PDF-DECISION-1's refusal of the v1 block in the reading layout is unchanged. The v2 block is accepted only by a
  set that declares it and carries the reading layout; it is refused otherwise. CR-PDF-DECISION-1's own rationale was not recorded;
  the founder's current recollection (2026-11-18, not independently verified) is that it was an MVP release precaution.
- All strings pass the existing customer wording lock (a safety net only). Counsel review is still required.

## Decisions requested

| # | Decision | Owner |
|---|---|---|
| D1 | Lift the §10.1 deferral for exactly the four claims (Creator Record only) | Founder |
| D2 | Approve the four ledger entries as drafted (or with edits) | Founder (Living Knowledge governance authority) |
| D3 | Approve the four dependency labels (new Source Text approval) | Founder |
| D4 | Approve the relevance mapping | Founder (governance) |
| D5 | Approve the v8 wording and the template set; confirm the v2 placement relaxes CR-PDF-DECISION-1 for v8 only | Founder; counsel review |
| — | Separately, later: paid licence-profile evaluation, a live licence model caller, registration and activation | Founder |
