# CR-V2-MVP-RELEASE-AUTHORIZATION-1: approval record

**Record reference:** `JD-CR-V2-MVP-RELEASE-AUTHORIZATION-1-20261114`. This reference was proposed by engineering and confirmed by JD in the session on 2026-11-14.

**Authority:** JD, for PMF Strategy Inc. d/b/a SuperImmersive 8. JD acted as founder and, separately, as Living Knowledge governance authority ("JD (PM)", per repository precedent).

**Nature of these decisions:** they are founder and internal governance decisions. They are not counsel opinions or legal compliance findings, and outside counsel review was waived by the founder for this MVP.

**Baseline:** `work/cr-pdf-impl-1` @ `b6889585`. This record is to be committed with the release changes, not before.

## 1. Founder decisions (confirmed 2026-11-14)

| # | Decision | Artifact |
|---|---|---|
| F1 | Schema 7 PDF template set v4 approved | PDF `d4ecf3f39487ed43ce6c5e621d988d6525b638c952a8c5ead01e0cc9b8504f7e`; render `eae3ef1684b51a4f2403796a56acf6f3306478cfa64c63fc9e8b7590c2d5535d`; summary `2843199d69017bb61531cde7c91a3207f8270c1e218862c0c23e2b76f0b9c288`; methods: summary v2, render v2 |
| F2 | Schema 8 PDF template set v5 approved | PDF `a27e23cdbc1b12c16330b9518bba210b218bb0e8807e53ac164d6673ec873408`; render `23c13cc7b4fd7a0a0b78e5302bb1e08a0bcd84053925b177cebaf2f041d649fa`; summary as F1 |
| F3 | Three-level PDF presentation approved | As built in F1/F2 |
| F4 | Removal of both review-screen panels approved | `cddb70fc` (comparison panel), `7892a643` (guidance beside documents) |
| F5 | Two-stage guarded cutover approved, conditional on the Production checks | APPROVAL-AND-RELEASE-1 §5–§6; `operator-preflight.sql` |
| F6 | Artlist-specific guidance excluded from MVP | No ledger or claim change |
| F7 | Historical issued records preserved | v1/v3 stay registered, `superseded`, unchanged; issued PDFs immutable |
| F8 | Terms §4/§5 revision approved (exact text in §3) | `apply-terms.py`; Terms paragraphs sha256 after the change: `d54e55bb785b4cecdb6dd2b87febb619d48c747bddc272aceaf169b4ad11a8fb` |
| F9 | `responses_intro` ("…or a comparison") Source Text change deferred past launch | Customer wording identity stays `be6e06e8…`; no Source Text rotation |
| F10 | Outside counsel review waived for this MVP | Departs from the CR-PDF-GATE-1 rule ("founder plus counsel") for this release only |
| F11 | Accepted release risks: (a) documents stored under the earlier consent stay usable; (b) creators who accepted the earlier Terms (A2) can buy without re-accepting | Founder risk acceptance, not a legal finding |

## 2. Living Knowledge governance determination (JD, PM role, 2026-11-14)

**Decision:** R1, R2, N4, G4, U1 and W1 are approved as **non-proposition Customer Explanatory Text**, with conditions. They are presentation wording inside the F1/F2 template sets.
- They create no Living Knowledge entry, claim, ledger row or governed proposition.
- They are never retrieved, selected or cited by Retrieval or Bounded Interpretation.

Basis: the CR-V2-MVP-GOVERNANCE-AND-COUNSEL-SIGNOFF-1 assessment §1.

| Item | Text (v4 = v5 unless noted) | Conditions |
|---|---|---|
| R1 | "The terms of an AI tool may contain conditions or restrictions on commercial use of its output." | (a) identical for every provider; (b) never a ledger entry or cited as a claim; (c) shown as topic-level framing |
| R2 | "Music, stock footage and other third-party material may be subject to licence conditions and other rights or permissions that this record does not establish." | (a) never shown in place of, or as satisfying, a dependency or evidence note; (b) "licence" spelling |
| N4 | "No open item was identified for this consideration from what you told SI8. This does not mean nothing is open." | (a) only for considerations with no open item and never beside "it depends on…" (test-enforced); (b) text as frozen |
| G4 | One: "This record contains no SI8 guidance for this tool or service you named:" Other: "This record contains no SI8 guidance for these tools and services you named:" | Record-scoped wording, as required |
| U1 | One: "No guidance specific to a tool or service could be selected for this answer, because you did not identify the tool or service:" Other: "…for these answers, because you did not identify the tools or services:" | None beyond the frozen text |
| W1 | Schema 7: "This Creator Record sets out what you told SI8 about your AI video. None of the general educational guidance that SI8 has published was selected from what you told SI8." Schema 8 adds "and what any documents you added appear to show" | Printed only when no consideration applies |

Recorded follow-ups, not release conditions:
- the approved v1/v3 `guidance.empty` ambiguity (never printed by v4/v5);
- an automated check that no explanatory string names a tool or provider.

## 3. Terms revision (F8)

| Field | Value |
|---|---|
| Version | `terms-<guard build deploy date>` |
| Effective date | The day the guard+pause build deploys |
| Approval reference | `JD-CR-V2-MVP-RELEASE-AUTHORIZATION-1-20261114 terms` |
| Ships in | The guard+pause build, not the template release build |

**§4, last two sentences.** Current: "SI8 draws no conclusion from comparing your documents with your answers. Readings do not change your answers or the guidance." Replaced by: "Readings are not used to select or change the guidance, and they do not change your answers. SI8 does not decide whether a reading matches what you told SI8."

**§5:**
- "Guidance is available for Runway, Pika and Higgsfield only." becomes "Guidance is currently available for Runway and Higgsfield only, and the tools covered may change."
- "Other tools can be listed…" becomes "Other tools and services can be listed in your record but receive no guidance; that is not a finding about them."

The Privacy Notice and the consent and permission wording are unchanged.

**Resulting identifiers:**
- Storage consent: `cr-v2-storage-consent-1__privacy-2026-11-09__terms-<date>`.
- AI permission: `cr-v2-ai-permission-1__privacy-2026-11-09__terms-<date>`. The operator establishes this in the authority row (section W of `operator-preflight.sql`) right after the guard build deploys.

## 4. Registration inputs for `apply-cutover.py` (template release build only)

```
--authority "JD, for PMF Strategy Inc. d/b/a SuperImmersive 8"
--decision-date 2026-11-14
--review-ref-v4 "JD-CR-V2-MVP-RELEASE-AUTHORIZATION-1-20261114 v4"
--review-ref-v5 "JD-CR-V2-MVP-RELEASE-AUTHORIZATION-1-20261114 v5"
```

## 5. Release execution (CR-V2-MVP-RELEASE-EXECUTION-1), recorded 2026-11-14

**Build A** (`60b1d84d`, deployed 2026-11-14): the guard, the Terms revision (`terms-2026-11-14`, effective 2026-11-14) and the submissions pause. It also carried the inert, unregistered v4/v5 template work from the rehearsed lineage; that scope deviation was accepted by JD. Build A is the rollback floor: never roll back to a pre-guard build (`334d8d9f`, `678add4d` or earlier).

**Operator evidence before Build B** (Production, 2026-11-14):
- Section W executed by the operator. Q9: exactly one authority row, `cr-v2-ai-permission-1__privacy-2026-11-09__terms-2026-11-14`, established by JD at 2026-11-14 15:21:07 UTC.
- The live submission page showed "Creator Record is not taking new submissions right now."
- Final preflight at 15:24 UTC: Q3, Q4, Q5 = 0 rows; Q6 artifact triggers (`_guard`, `_consent_guard`, `_product_guard`) enabled; no payment of any product paid but not completed.
- Existing issuance was not directly exercised: no paid records were pending.

**Accepted release exceptions** (JD, 2026-11-14, on engineering evidence):
- Q8 (1 row) and Q10 (3 rows) are three unpaid, unbound prepared records created 2026-11-06 by one admin account under a synthetic registry and ledger: `c84a50f6-0483-4072-8186-444101d54456`, `fd972639-e06c-436c-8232-c23aa83cc7d5`, `3351a856-83f2-4c6b-a9fe-326c3992c77a`. They are preserved unchanged.
- They cannot be bought or issued: checkout and issuance refuse a record with synthetic authority (`eligibility.ts`, `synthetic_record`), stale references (`version_not_current`), and, for v5, a comparison method other than v2 (`document-model.ts`, `readiness_layout_refused`). Evidence: `commercial-eligibility.test.ts` §4, `reading-release-fix-1.test.ts`, `schema8-payment-issuance.test.ts` §2–4.

**Build B**: this record, the v4/v5 registration with the §4 values, generator `creator-record-v2-pdf-v3`, submissions reopened, issuance enabled, the release test updates.
