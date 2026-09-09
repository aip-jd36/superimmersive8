# PRD — CAH-4F: Reviewer Resources + Living Knowledge Context Semantics

**Status:** IMPLEMENTED — product contract for the CAH-4F implementation milestone. Built as a reviewer-page **presentation** change only (no route/selector/eligibility/applicability/audit/schema/migration change). Open questions resolved in §13. As-built design: `08_Platform/implementation/REVIEWER_RESOURCES_ARCHITECTURE.md` §5, §7.
**Milestone series:** CAH-4x (CRC → Commercial Assurance handoff). CAH-4B/4C/4D/4E are shipped and integrated at `origin/main` = `9fa6d1c` (feat(reviewer-lk): Human Reviewer Living Knowledge V1). CAH-4F is the next milestone.
**Scope of this PRD:** the *what*. The *how* is in `08_Platform/implementation/REVIEWER_RESOURCES_ARCHITECTURE.md`. The durable authority decision is `08_Platform/app/lib/reviewer-lk/ADR-001-reviewer-resources-authority-boundary.md`.
**Frozen prior specs this PRD does not reopen:** `PRD_CRC_v1.0.md`, `PRD_ASSESSMENT_SERVICE_v1.0.md`, `PRD_REVIEWER_WORKBOOK_UI.md`, `PRD_LIVING_NOTEBOOK.md`, `PRD_LIVING_KNOWLEDGE_SOURCE_INPUTS_v0.1.md`.
**Explicit future boundary:** CAH-4G (Conversational Reviewer Living Knowledge) is *not* in scope — see §11.

---

## 1. Problem

A Human Reviewer conducting a Commercial Assurance Assessment now has three surfaces on the review page (`08_Platform/app/app/admin/submissions/[id]/review/page.tsx`), rendered as siblings:

| Surface | Component | Authority | Shipped |
|---|---|---|---|
| **Assessment Workbook** | `WorkbookClient.tsx` + `Section1Intake`…`Section7Brief` | reviewer's own evidence evaluation + judgment | pre-CAH-4x |
| **Linked CRC Context** | `ReviewerCrcContextPanel.tsx` (+ `ReviewerTranscriptDrawer.tsx`) | customer-provided, unverified project context from an educational CRC conversation | CAH-4B / CAH-4C |
| **Reviewer Living Knowledge** | `ReviewerLkPanel.tsx` + `ReviewerLkLookup.tsx` | governed SI8 institutional knowledge, for reviewer research | CAH-4E |

Two problems:

1. **No product frame ties the secondary surfaces together.** They were shipped one milestone at a time. There is no "Reviewer Resources" concept, no shared placement contract, and nothing that states — in the product, not just in code comments — that these surfaces sit *beside* the workbook without becoming part of it.

2. **The Living Knowledge lookup UI is functionally correct but presents governed knowledge poorly** (verified against `ReviewerLkLookup.tsx` at `9fa6d1c`):
   - the topic selector renders raw `GoalCategory` enum values (`commercial_use`, `copyright_ownership`, `copyrightability`, `likeness`, `third_party_source_rights`) as option text;
   - there is no explicit **Applicability** heading — the line reads "Applicability to this submission: established / not established";
   - the retrieval-context line says "Retrieval context (submission facts — not evidence): …" rather than naming *what this specific look-up used*;
   - a claim card leads with governance metadata (`claim_id`, `claim_character`, `jurisdiction`, `lifecycle`, `scope`, `CRC channel`) before the proposition;
   - `claim.crc_eligible` ("CRC channel: Yes/No/Pending") is always displayed, with no demonstrated reviewer need;
   - `claim.crc_publication_scope` — CRC-channel governance prose written *for the unsupervised CRC channel* ("CRC may state…", "CRC must not…") — is rendered verbatim to the reviewer under "Scope of the statement:", projecting CRC-audience language as if it were reviewer authority language.

CAH-4F fixes both without changing any retrieval, applicability, audit, or authority-boundary behavior.

## 2. Users

- **Primary:** SI8 Human Reviewer / admin (`users.is_admin = true`) conducting a Commercial Assurance Assessment on a `si8_certified` submission. Gate: `checkReviewerContextAccess()` (`08_Platform/app/lib/reviewer-context/auth.ts`).
- **Secondary (read-only beneficiary):** PM / architecture reviewers assessing whether reviewer-facing surfaces preserve the authority boundaries.
- **Not a user:** the CRC end customer (they never see this page); the reviewer's client.

## 3. Product objective

Give the reviewer a **coherent, bounded "Reviewer Resources" area beside the workbook** that presents:

- **Living Knowledge** as *governed research* — proposition first, applicability second, context third, provenance progressively disclosed, in reviewer-readable language;
- **Linked CRC Context** as *customer/project context* — unchanged from CAH-4B/4C in behavior;

such that a reviewer can consult both while keeping full, sole responsibility for evidence evaluation and the assessment conclusion, and such that nothing in the UI can convert a resource into workbook state.

**Success = the reviewer reads governed knowledge faster and with less risk of mistaking it for an answer, and the authority firewall is provably unchanged.**

## 4. Authority boundaries (normative — do not weaken)

These are shipped invariants (CAH-4B…4E), restated here because CAH-4F must not regress them. Source of truth: `ADR-001-reviewer-resources-authority-boundary.md`.

1. **Assessment Workbook = evidence evaluation + human judgment.** Only the reviewer, acting through the workbook, produces evidence records, gaps, findings, control results, an outcome, a sign-off, or a report.
2. **Reviewer Living Knowledge = governed research.** It surfaces `Adopted`, reviewer-scoped governed `TopicClaim`s with deterministic applicability status. It is never an assessment judgment, never a control result, never a finding, never a legal conclusion.
3. **Linked CRC Context = customer/project context** from an educational CRC conversation. It is *context*, not assessment evidence. (CRC's own product boundary: `PRD_CRC_v1.0.md`, `CRC_CURRENT_STATE.md §1`.)
4. **Visibility beside each other must not collapse authority.** A resource being rendered on the same page as the workbook does not make it workbook state, evidence, or a conclusion.
5. **No silent promotion.** No control (button, drag, checkbox, keyboard action) may move Living Knowledge or CRC content into `workbook_data`, an `assessments` row, evidence, a gap, a finding, an outcome, a sign-off, a report, or a publication decision. If the product later wants a *deliberate, attributed* "cite this in my note" affordance, that is a separate, explicitly-scoped decision — not CAH-4F, and never silent.
6. **Fail-closed audit-before-content is preserved.** A reviewer LK look-up returns governed content only after its `lk_research` access event is durably written (`08_Platform/app/lib/reviewer-lk/repository.ts`, route step 4→5).
7. **The Living Knowledge → Retrieval → Bounded Interpretation → Projection/Composition invariant holds.** No CAH-4F presentation layer may state a stronger conclusion than the governed claim and its deterministic applicability status permit.

## 5. Current behavior (verified at `origin/main` = `9fa6d1c`)

### 5.1 Reviewer LK look-up (`GET /api/admin/submissions/[id]/reviewer-lk?topic=<GoalCategory>`)

Route: `08_Platform/app/app/api/admin/submissions/[id]/reviewer-lk/route.ts`. Ordered contract (comment in the route names it "CAH-4E §12"):

1. `checkReviewerContextAccess()` → 401/403 on failure.
2. Validate `topic` — must be a `GoalCategory` other than `'unknown'` (`REVIEWER_TOPICS`). Bad/missing → `400 { ok:false, code:'unknown_topic' }`, **no audit**.
3. Select into memory:
   - `getSubmissionFactsForReviewerLk(id)` reads **only** `submissions.tools_used` and `submissions.territory_preferences`. `null` → `404 { ok:false, code:'no_such_submission' }`, no audit. Throw → `500`, no audit.
   - `buildReviewerLkContext(facts)` → `resolveSubmissionToolIds` (canonical tool ids via the real `normalizeCandidate`), `resolveSubmissionJurisdiction` (from `territory_preferences`); `assetProviderIds` is always `[]` in V1.
   - `selectReviewerClaims({ topic, topicClaims: TOPIC_CLAIMS_FIXTURE, assetProviderIds, activeToolIds, applicabilityFacts })`.
   - `projectReviewerLkResult(...)` → `{ ok:true, topic, retrieval_context, claims, withheld }`.
4. `recordReviewerLkAccess({ actorUserId, submissionId })` — inserts one `crc_context_access_events` row, `access_kind:'lk_research'`, `association_id`/`crc_session_id` left NULL. **Throws on failure → `503`, zero governed content.**
5. Only then → the result.

`selectReviewerClaims` (`08_Platform/app/lib/reviewer-lk/select-reviewer-claims.ts`):
- candidate pre-filter: `topic` match + `providerScopeMatches` + `toolScopeMatches` (generic primitives reused from `lookup-topic-claims.ts`, fail-closed on unresolved provider/tool identity);
- per candidate: `evaluateReviewerEligibility` (`eligibility.ts`) — eligible iff `superseded_by === null` **and** `lifecycle === 'Adopted'` **and** `publication_scope ∈ REVIEWER_ELIGIBLE_PUBLICATION_SCOPES` (`'Reviewer/Commercial Assurance' | 'CRC eligible' | 'Public SI8 position'`). **`crc_eligible` is never read here.** Ineligible → `withheld[]` with a bounded reason (`not_adopted | superseded | publication_scope_not_reviewer_eligible | publication_scope_missing_or_unknown`);
- for eligible claims: `evaluateApplicabilityDetailed(claim.applicability_requirements, applicabilityFacts)` — the generic deterministic evaluator. Each requirement gets `status ∈ { met | unresolved | not_met }`. `applicability_established = outcomes.every(o => o.status === 'met')`. **An unresolved/not_met requirement never withholds the claim and is never re-interpreted as a negative finding.**

`ReviewerLkClaim` (`08_Platform/app/lib/reviewer-lk/types.ts`) carries the *full* governed record: `claim_id`, `topic`, `claim_character`, `jurisdiction`, `lifecycle`, `publication_scope`, `crc_eligible`, `statement` (`= crc_candidate_statement`), `crc_publication_scope`, `applicability_outcomes`, `applicability_established`, `unresolved_project_dependencies`, `provider_scope`, `tool_scope`, `last_verified`, `superseded_by (always null)`, `governed_claims_reference`.

### 5.2 Reviewer LK panel UI (`ReviewerLkPanel.tsx` server component + `ReviewerLkLookup.tsx` client)

- Collapsed `<details>`; server component; **nothing fetched on page load**. Header = `REVIEWER_LK_FRAMING` (`08_Platform/app/lib/reviewer-lk/project-reviewer-claims.ts`): heading *"Governed SI8 Living Knowledge — reviewer research"*, body, `applicability_note`.
- Client: a `<select>` of topics + a "Look up governed knowledge" button; one `GET` per click; renders claim cards + a collapsed "N governed claim(s) … withheld" list.
- **`ReviewerLkLookup.tsx` has no `<input>`/`<textarea>`, no fetch on mount, no copy/apply/accept control** — verified by `__tests__/reviewer-lk/authority-firewall.test.ts`.

### 5.3 Linked CRC Context (CAH-4B/4C — unchanged by CAH-4F)

- `ReviewerCrcContextPanel.tsx` (server component sibling) → `lib/reviewer-context/service.ts` → active `crc_assurance_associations` for the submission → `lib/crc-project-context/projection.ts` (`CrcProjectContext`: goals, assertions, correction history) + a neutral state-comparison (`unchanged | changed | comparison_unavailable`).
- `ReviewerTranscriptDrawer.tsx` — deliberate, audited (`access_kind:'transcript'`), never auto-loaded.

### 5.4 Audit table

`crc_context_access_events` (`08_Platform/app/supabase/migrations/20260909010000_reviewer_crc_context_access_events.sql` + `20260910000000_reviewer_lk_research_access_kind.sql`): `access_kind ∈ { 'transcript', 'lk_research' }`; `actor_user_id` + `submission_id` NOT NULL; `association_id`/`crc_session_id` nullable and only required for `'transcript'`; RLS enabled, no policies, service-role only; append-only (no FK, no `updated_at`).

**Production application of `20260910000000` and the CAH-4E production smoke are asserted by the PM checkpoint; the repository proves the migration source, the route/audit code, and the tests — not the production DB state.**

## 6. Desired user journey

1. Reviewer opens `/admin/submissions/[id]/review`. Workbook is the primary, expanded surface. A **Reviewer Resources** area is visibly distinct and secondary (right-side inspector is the preferred direction — see §8).
2. Reviewer expands **Living Knowledge**, picks a topic from a list of **plain-English labels**, clicks **Look up**.
3. Results show, per governed claim, in this order:
   - **the proposition** (the governed statement), prominent;
   - an **Applicability** section — an explicit heading, then `Established` / `Not established`, then the per-requirement rows, in neutral (non-pass/fail) styling;
   - **Context used for this look-up** — the exact submission-derived inputs the selector used (resolved tools, jurisdiction), labelled as context, not evidence;
   - **governance / provenance metadata** (`claim_id`, `lifecycle`, `publication_scope`, `last_verified`, ledger reference) behind a "Details" / progressive-disclosure control.
4. Reviewer reads, forms their own judgment, and — if they choose to reference it — types their reasoning **into the workbook themselves**. No UI shortcut does this for them.
5. Reviewer expands **Linked CRC Context** (if a CRC conversation is linked) to see customer-stated goals/assertions; opens the transcript deliberately if needed (audited).
6. At no point does consulting a resource change `workbook_data`, an assessment field, or produce a finding.

## 7. Functional requirements

| # | Requirement | Verifiable by |
|---|---|---|
| FR-1 | A single **Reviewer Resources** container groups Living Knowledge and Linked CRC Context, visually and semantically distinct from the workbook. | UI review; DOM structure test |
| FR-2 | The topic selector presents reviewer-readable labels; the value sent to the API remains the exact `GoalCategory` enum. | UI review; a label→enum map test; route contract unchanged |
| FR-3 | Each claim renders proposition → applicability → context → metadata, in that order. | snapshot/DOM order test |
| FR-4 | Applicability has an explicit "Applicability" heading; `Established` / `Not established`; per-requirement `status` shown verbatim; **no green/red pass/fail colour semantics**. | UI review; colour-token test |
| FR-5 | The context block is labelled "Context used for this look-up" (or equivalent specific wording) and lists the resolved tools + jurisdiction actually used. | UI review; wording test |
| FR-6 | `claim.crc_publication_scope` (CRC-channel governance prose) is **not** rendered as reviewer authority text. If any statement-scope note is shown to the reviewer, it must be reviewer-oriented wording, derived without projecting "CRC may/must" language. | wording test; a check that the raw `crc_publication_scope` string is absent from the reviewer DOM |
| FR-7 | `claim.crc_eligible` is **not displayed by default**. It remains in the API payload as governance metadata and may appear only behind progressive disclosure, and only if a reviewer need is later demonstrated and recorded. | UI review; default-render test |
| FR-8 | No control in the Reviewer Resources area writes to `workbook_data`, `assessments`, evidence, gaps, findings, outcome, sign-off, report, or publication. No "copy to evidence" / "apply" / "accept" / "use as finding". | `__tests__/reviewer-lk/authority-firewall.test.ts` extended; DOM-control test |
| FR-9 | Living Knowledge look-up remains explicit-action-only; nothing fetched on page load; one look-up = one `lk_research` audit event, written before content. | `__tests__/reviewer-lk/route-and-audit.test.ts` (unchanged behaviour) |
| FR-10 | Linked CRC Context behaviour is unchanged (CAH-4B/4C): deliberate transcript access, audited, `crc_project_state` unchanged after access. | `__tests__/reviewer-context/**` (unchanged) |
| FR-11 | The route contract (`GET …/reviewer-lk?topic=…`, response shape, status codes, audit) is unchanged. CAH-4F is presentation + optional label-mapping only. | route test diff = none |

## 8. UX requirements

The design direction below is split into **product requirement** (must hold), **current preferred UX** (the shape we intend), and **implementation detail subject to repo constraints** (decided in the design spec against actual components).

### 8.1 Product requirement (must hold)
- Reviewer Resources is **secondary** to the workbook and must never visually compete with it for primary attention.
- Reviewer-readable topic labels; explicit **Applicability** heading; neutral applicability styling (no pass/fail red/green); "Context used for this look-up" wording; proposition-first ordering; provenance progressively disclosed; no CRC-audience language projected as reviewer authority; `crc_eligible` not shown by default; no silent promotion controls.

### 8.2 Current preferred UX
- A **right-side research inspector / panel** beside the workbook (persistent, collapsible), containing Living Knowledge and Linked CRC Context as separate sections.
- Living Knowledge section: topic label picker → look-up → results list. Each result is a card: proposition (body text), then an "Applicability" subsection, then "Context used for this look-up", then a "Governance details" disclosure.
- Linked CRC Context section: the existing CAH-4B panel content, re-homed into the inspector without behavioural change.

### 8.3 Implementation detail (subject to repository constraints — decided in the design spec)
- Whether the inspector is a new layout wrapper around the existing `page.tsx` siblings, or a re-parenting of `ReviewerLkPanel` / `ReviewerCrcContextPanel`.
- Whether the topic label map lives client-side (in `ReviewerLkLookup.tsx`) or is added to `REVIEWER_LK_FRAMING` / a small shared constants module.
- Whether a reviewer-oriented statement-scope note (FR-6) is derived at projection time (`project-reviewer-claims.ts`) or simply omitted in V1.
- Responsive behaviour of a right-side inspector on narrow viewports.
- These are `_ARCHITECTURE.md` decisions, not PRD commitments.

### 8.4 Accessibility
- The inspector must be keyboard-navigable and screen-reader-labelled; applicability status must be conveyed by text, never by colour alone (this also satisfies "no red/green").
- Collapsible sections use native `<details>`/`disclosure` semantics or ARIA equivalents.

## 9. Semantic requirements

| # | Semantic rule |
|---|---|
| SR-1 | The proposition shown is the verbatim governed `crc_candidate_statement`. It is not paraphrased, summarised, combined, or ranked by the reviewer surface. |
| SR-2 | "Applicability: Not established" means *a required fact is unresolved or does not match the submission's context* — it is **not** a statement that the claim is false, inapplicable, or a negative finding. The UI wording must make this unambiguous. |
| SR-3 | The context block names the submission-derived inputs used (resolved canonical tool ids; jurisdiction from `territory_preferences`). It does not claim these are "the submission's facts" in a broader sense, and it never labels them evidence. |
| SR-4 | `publication_scope` (`'Reviewer/Commercial Assurance'` etc.) is *structured governance metadata*. It may be shown as a metadata tag. `crc_publication_scope` (free-text "CRC may/must…" prose) is *CRC-channel governance* and must not be shown as reviewer authority language. |
| SR-5 | `crc_eligible` is authoritative governance metadata about the *CRC channel*, not about reviewer use. It is decoupled from reviewer eligibility (which is `lifecycle` + `publication_scope` + supersession). It is not shown by default. |
| SR-6 | Withheld claims are shown by `claim_id` + bounded reason only — never their content. |
| SR-7 | Nothing the reviewer surface renders is, or is labelled, "evidence", "finding", "gap", "control result", "outcome", or "conclusion". |

## 10. Non-goals

- **Not** changing retrieval, applicability evaluation, eligibility semantics, the audit contract, `crc_context_access_events`, the route contract, workbook behaviour, sign-off, report generation, publication, or any CRC behaviour.
- **Not** adding a new DB table, column, event kind, or migration. (If the design spec finds one is genuinely required, it must be raised and approved separately, not assumed by this PRD.)
- **Not** adding a "cite / copy to workbook" affordance (silent or deliberate) — deferred, separate decision.
- **Not** conversational / free-form question input — that is CAH-4G (§11).
- **Not** changing which claims are reviewer-eligible or which topics exist.
- **Not** exposing Living Knowledge to the CRC end customer.
- **Not** a Matrix-claim reviewer surface (only `TopicClaim`s today — a separate future milestone).

## 11. Explicit future boundary — CAH-4G (Conversational Reviewer Living Knowledge)

CAH-4G is a **later, separate** milestone. This PRD records the *intent* only, so CAH-4F is designed not to preclude it and not to accidentally implement it.

**Intended concept:**

> Reviewer free-form question → governed retrieval → bounded interpretation → reviewer-oriented composition

**Explicitly NOT:**

> Reviewer question → unconstrained LLM answer

Constraints CAH-4G must honour (and CAH-4F must not violate early):
- substantive responses must remain traceable to governed Living Knowledge;
- the capability must not make the Commercial Assurance judgment on the reviewer's behalf;
- it must not fabricate legal conclusions;
- it must not silently convert research into evidence / findings;
- it must preserve evidence limitations and unresolved applicability requirements;
- it flows through the same `Living Knowledge → Retrieval → Bounded Interpretation → Projection/Composition` layering (no downstream layer strengthens a conclusion).

CAH-4F ships **no free-text input** in the Reviewer Resources area. Adding one is CAH-4G's decision.

## 12. Acceptance criteria

CAH-4F is done when:

1. The review page shows a distinct, secondary **Reviewer Resources** area containing Living Knowledge and Linked CRC Context (FR-1).
2. Topic selection uses reviewer-readable labels; the API still receives exact `GoalCategory` values; the route contract is byte-unchanged (FR-2, FR-11).
3. Each claim renders proposition → applicability (explicit heading, neutral styling, verbatim per-requirement status) → "Context used for this look-up" → progressively-disclosed governance metadata (FR-3, FR-4, FR-5).
4. Raw `crc_publication_scope` prose is absent from the reviewer DOM; `crc_eligible` is not shown by default (FR-6, FR-7, SR-4, SR-5).
5. No control promotes a resource into workbook / assessment / evidence / findings / conclusion state; `__tests__/reviewer-lk/authority-firewall.test.ts` is extended and green (FR-8).
6. `route-and-audit`, `reviewer-context/**`, `crc-regression`, `eligibility`, `select-reviewer-claims`, `projection` test suites are unchanged in intent and green; audit-before-content and explicit-action-only are preserved (FR-9, FR-10).
7. `tsc --noEmit` clean; `next build` exit 0; full Jest suite shows zero new failed suites / tests / failure classes vs the pre-CAH-4F `origin/main` baseline.
8. No migration added. No production behaviour changed beyond reviewer-page presentation.
9. A short UAT script exists: a reviewer performs one look-up, confirms the new presentation, confirms one `lk_research` event, confirms `workbook_data` / assessment unchanged.

## 13. Open questions — RESOLVED in the CAH-4F implementation milestone

| # | Question | Resolution (as-built) |
|---|---|---|
| OQ-1 | Right-side inspector vs. top-of-page stacked panels — compatible with `WorkbookClient.tsx` without a disruptive refactor? | **Fallback (§8.3).** Source inspection at `9fa6d1c`: `WorkbookClient.tsx` is a `flex flex-col h-screen` client shell with its own 280px right `<aside>` tab panel (`guidance`/`submission`/`evidence`). A persistent beside-workbook inspector would require threading a server-rendered node as a prop into that `'use client'` component (+ a 4th tab in a too-narrow column) or wrapping the self-scrolling `h-screen` shell in a new outer flex — both Workbook layout changes the milestone forbids. Shipped: a `ReviewerResources` **server component** grouping both panels (each collapsed `<details>`), rendered as a sibling above `<WorkbookClient>` — visually secondary, single component, trivially re-homable to an inspector later. |
| OQ-2 | Reviewer-oriented "scope of this statement" note, or omit `crc_publication_scope`? | **Omit entirely** — the smaller, safer V1. No scope note derived; `project-reviewer-claims.ts` unchanged (still a thin pass-through). |
| OQ-3 | Do reviewers need `crc_eligible` visible? | **Not surfaced at all** (not even behind disclosure). No reviewer-need observation is on record. It stays in the API payload as governance metadata; the reviewer DOM never renders it. |
| OQ-4 | "Linked CRC Context" *into* the container, or referenced only? | **Into** the `ReviewerResources` container, behaviour byte-unchanged from CAH-4B/4C (same `ReviewerCrcContextPanel` / `ReviewerTranscriptDrawer`, same service/audit path). Grouping is placement, not merged authority. |
| OQ-5 | Topic label wording — Reviewer Manual domain vocabulary, or plain language? | **Plain language** (`commercial_use → "Commercial use"`, etc.). The reviewer is picking a research topic, not classifying a control. `lib/reviewer-lk/topic-labels.ts`. |
| OQ-6 | Touch `guidance.ts`? | **No.** Strictly out of scope; untouched. |

---

**Companion docs:** `08_Platform/implementation/REVIEWER_RESOURCES_ARCHITECTURE.md` (design), `08_Platform/app/lib/reviewer-lk/ADR-001-reviewer-resources-authority-boundary.md` (decision), `08_Platform/implementation/COMMERCIAL_ASSURANCE_ARCHITECTURE_INDEX.md` (where to read what).
