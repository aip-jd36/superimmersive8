# Reviewer Resources — Architecture (as-built CAH-4B…4E + CAH-4F design surface)

**Status:** ACTIVE — the normative internal-design reference for the reviewer-side surfaces of the CRC → Commercial Assurance handoff.
**As-built basis:** `origin/main` = `9fa6d1c` (feat(reviewer-lk): Human Reviewer Living Knowledge V1). All file paths, types, and behaviours in §1–§5 were read from that commit.
**Product spec:** `08_Platform/prds/PRD_CAH_4F_REVIEWER_RESOURCES.md` (the *what*). This doc is the *how*.
**Decision record:** `08_Platform/app/lib/reviewer-lk/ADR-001-reviewer-resources-authority-boundary.md`.
**Layer-normative docs it defers to:** `RETRIEVAL_ENGINE_ARCHITECTURE.md`, `PROJECTION_LAYER_ARCHITECTURE.md`, `LK_PHASE1_TECHNICAL_DESIGN.md` / `_v2.md`, `THIRD_PARTY_SOURCE_ASSETS_ROUTING_ARCHITECTURE.md`, `CRC_CURRENT_STATE.md`.

This doc has two halves:
- **§1–§6 — as-built.** The reviewer-side subsystems shipped by CAH-4B/4C/4D/4E, which previously had no architecture doc.
- **§7–§14 — CAH-4F design surface.** Proposed implementation approach for Reviewer Resources + LK Context Semantics, subject to the constraints below.

---

## 1. Component / data-flow map (as-built at `9fa6d1c`)

Review page: `08_Platform/app/app/admin/submissions/[id]/review/page.tsx` (server component, `requireAdmin()`), renders three siblings:

```
page.tsx
├── <ReviewerCrcContextPanel submissionId>        ← CAH-4B  (server component)
│     └── ReviewerTranscriptDrawer                ← CAH-4C  ('use client')
├── <ReviewerLkPanel submissionId>                ← CAH-4E  (server component)
│     └── ReviewerLkLookup                        ← CAH-4E  ('use client')
└── <WorkbookClient submissionId … />             ← pre-CAH-4x  ('use client')
        └── Section1Intake … Section7Brief
```

### 1.1 Reviewer Living Knowledge (CAH-4E)

```
ReviewerLkLookup ('use client')
  │  user picks topic, clicks "Look up governed knowledge"
  ▼
GET /api/admin/submissions/[id]/reviewer-lk?topic=<GoalCategory>
  │  route: app/api/admin/submissions/[id]/reviewer-lk/route.ts
  │  1. checkReviewerContextAccess()                            → lib/reviewer-context/auth.ts  (users.is_admin)
  │  2. validate topic ∈ REVIEWER_TOPICS (GoalCategory \ 'unknown')
  │  3. getSubmissionFactsForReviewerLk(id)                     → lib/reviewer-lk/repository.ts
  │       reads ONLY submissions.tools_used, submissions.territory_preferences
  │     buildReviewerLkContext(facts)                           → lib/reviewer-lk/submission-facts.ts
  │       resolveSubmissionToolIds  → normalizeCandidate (real, unmodified extraction primitive)
  │       resolveSubmissionJurisdiction → AssessmentJurisdictionFacts from territory_preferences
  │       assetProviderIds = []  (V1: submissions has no structured asset-provider field)
  │     selectReviewerClaims({ topic, TOPIC_CLAIMS_FIXTURE, assetProviderIds, activeToolIds, applicabilityFacts })
  │       → lib/reviewer-lk/select-reviewer-claims.ts
  │           candidate pre-filter:  c.topic === topic
  │                                  && providerScopeMatches(c, assetProviderIds)    ┐ generic primitives,
  │                                  && toolScopeMatches(c, activeToolIds)           ┘ reused from lookup-topic-claims.ts
  │           per candidate: evaluateReviewerEligibility(c)     → lib/reviewer-lk/eligibility.ts
  │               eligible iff  superseded_by === null
  │                          && lifecycle === 'Adopted'
  │                          && publication_scope ∈ REVIEWER_ELIGIBLE_PUBLICATION_SCOPES
  │                          ( 'Reviewer/Commercial Assurance' | 'CRC eligible' | 'Public SI8 position' )
  │               crc_eligible is NOT consulted
  │               ineligible → withheld[] { claim_id, reason }
  │           eligible → evaluateApplicabilityDetailed(c.applicability_requirements, applicabilityFacts)
  │               → generic deterministic evaluator (lookup-topic-claims.ts)
  │               per requirement: status ∈ { met | unresolved | not_met }
  │               applicability_established = outcomes.every(status === 'met')
  │               claim is NEVER withheld for an unresolved/not_met requirement
  │     projectReviewerLkResult({ topic, retrievalContext, selection })
  │       → lib/reviewer-lk/project-reviewer-claims.ts  (thin: attaches nothing new; adds REVIEWER_LK_FRAMING at render)
  │  4. recordReviewerLkAccess({ actorUserId, submissionId })   → lib/reviewer-lk/repository.ts
  │       INSERT crc_context_access_events (access_kind:'lk_research', actor, submission; association/session NULL)
  │       THROWS on failure  →  route returns 503, zero governed content
  │  5. only now → NextResponse.json(result)
  ▼
{ ok:true, topic, retrieval_context, claims: ReviewerLkClaim[], withheld: ReviewerLkWithheld[] }
```

### 1.2 Linked CRC Context (CAH-4B/4C)

```
ReviewerCrcContextPanel (server component)
  → lib/reviewer-context/service.ts
      → active crc_assurance_associations for submission            (lib/crc-assurance-handoff/*)
      → per association:  lib/crc-project-context/projection.ts
          CrcProjectContext { goals: CrcProjectGoal[], assertions: CrcProjectAssertion[], correction_history: CrcCorrectionHistoryItem[] }
      → neutral state comparison: 'unchanged' | 'changed' | 'comparison_unavailable'   (state-binding.ts)
  ReviewerTranscriptDrawer ('use client')
    → GET …/reviewer-crc-context/[association_id]/transcript
       audited (access_kind:'transcript', association+session scoped) BEFORE any transcript content is returned
```

## 2. System boundaries

| Boundary | Rule | Enforced by |
|---|---|---|
| `lib/reviewer-lk/**` ⟂ assessment write path | imports nothing from `@/lib/assessments`, the workbook write path, `@/lib/crc-sales`, or `@/lib/retrieval-engine/retrieve` | `__tests__/reviewer-lk/authority-firewall.test.ts` A/D (import scans) |
| assessment domain ⟂ `lib/reviewer-lk` | `lib/assessments/**` and the submissions API surface (minus the reviewer routes) never import `lib/reviewer-lk`; `workbook-schema.ts` / `WorkbookClient.tsx` reference no reviewer-lk type | firewall B |
| `lib/reviewer-lk` writes | the only `.insert` targets `crc_context_access_events`; no write to `assessments` / `workbook_*` / `submissions` / `crc_sessions` / `crc_assurance_*` / `crc_sales_*`; no `.rpc` | firewall C |
| audit row shape | `access_kind:'lk_research'` + `actor_user_id` + `submission_id` only; no query text, no claim text, no interpretation, no finding | firewall C + migration CHECK |
| no claim → assessment-state converter | no helper named `*ToEvidence`/`*ToFinding`/`create*Gap`/… anywhere in `lib/reviewer-lk` | firewall C |
| route method | `GET` only; no body; `topic` is the only request-derived value | firewall D |
| panel is server-rendered | `ReviewerLkPanel.tsx` is not `'use client'`; `ReviewerLkLookup.tsx` issues exactly one `fetch`, method `GET`, no `<input>`/`<textarea>`, no copy/apply control; rendered as a sibling, not inside `WorkbookClient` or the CRC block | firewall E |
| CRC retrieval unchanged by reviewer-lk | `retrieve.ts` / `lookupTopicClaims` / `enumerateEligibleClaims` byte-unchanged; adding `publication_scope` to `TopicClaim` changed no CRC output | `__tests__/reviewer-lk/crc-regression.test.ts` |

## 3. Authoritative data sources

| Data | Source of truth | Runtime representation |
|---|---|---|
| Governed propositions (`TopicClaim`) | `06_Operations/institutional-knowledge/notebook/GOVERNED-CLAIMS.md` | `08_Platform/app/lib/retrieval-engine/topic-claims-fixture.ts` (`TOPIC_CLAIMS_FIXTURE`), hand-synced; consistency guarded by `__tests__/retrieval-engine/topic-claims-fixture-consistency.test.ts` |
| Tool-scoped governed claims (Matrix) | `06_Operations/institutional-knowledge/notebook/PLATFORM-RIGHTS-MATRIX.md` | `matrix-fixture.ts` (`MATRIX_FIXTURE`). **Not** used by the reviewer LK selector today (TopicClaim-only). |
| `publication_scope` enum | `PRD_LIVING_NOTEBOOK.md`; the `GOVERNED-CLAIMS.md` `Publication scope:` line per claim | `PUBLICATION_SCOPES` / `PublicationScope` in `lib/retrieval-engine/types.ts`; `TopicClaim.publication_scope?: PublicationScope` (optional, hand-synced, CAH-4E) |
| Reviewer-eligible subset | CAH-4E decision (ADR-001) | `REVIEWER_ELIGIBLE_PUBLICATION_SCOPES` in `lib/retrieval-engine/types.ts` |
| `GoalCategory` topics | `types/interview-engine.ts` `GOAL_CATEGORIES` | `['commercial_use','copyright_ownership','copyrightability','likeness','third_party_source_rights','unknown']` — reviewer selector uses all but `'unknown'` |
| Submission facts for narrowing | `submissions` table | `submissions.tools_used` (JSON), `submissions.territory_preferences` (text) — read via `getSubmissionFactsForReviewerLk` |
| Access audit | `crc_context_access_events` | migrations `20260909010000_reviewer_crc_context_access_events.sql` (CAH-4C) + `20260910000000_reviewer_lk_research_access_kind.sql` (CAH-4E) |
| CRC project context | `crc_sessions.structured_understanding` (via active `crc_assurance_associations`) | `CrcProjectContext` (`lib/crc-project-context/types.ts`) |

## 4. Retrieval / applicability contract (reviewer LK, as-built)

- **Consumer parameterisation:** the reviewer LK selector is a *parallel* module (`lib/reviewer-lk/select-reviewer-claims.ts`), **not** a branch inside `retrieve.ts`. It reuses the *pure* generic primitives (`providerScopeMatches`, `toolScopeMatches`, `evaluateApplicabilityDetailed`, `normalizeCandidate`) and applies its own eligibility gate. `retrieve.ts` and every CRC lookup are byte-unchanged.
- **Eligibility gate:** `lifecycle === 'Adopted'` ∧ `superseded_by === null` ∧ `publication_scope ∈ REVIEWER_ELIGIBLE_PUBLICATION_SCOPES`. `crc_eligible` decoupled (an `Adopted` + `Reviewer/Commercial Assurance` claim is reviewer-visible whether `crc_eligible` is `Yes`, `No`, or `Pending`).
- **Applicability:** deterministic. `evaluateApplicabilityDetailed` returns `{ requirement, status }` per requirement; `status` is `met | unresolved | not_met`; no LLM, no guessing. `applicability_established` = all `met`. **Unresolved ≠ negative finding; unresolved ≠ withheld.**
- **Scope narrowing:** provider/tool-scoped claims fail closed if the submission-derived identity set does not resolve the scope. V1 `assetProviderIds` is always `[]`, so provider-scoped claims never surface via the reviewer path yet (documented limitation, not a bug).
- **Track A / B / C:** untouched. The reviewer selector consumes an explicit reviewer-chosen topic; there is no discovered relevance, no `TopicRelationship` traversal, no fabricated `UserGoal`.

## 5. UI projection contract (as-built — `ReviewerLkLookup.tsx` at `9fa6d1c`)

The client renders `ReviewerLkClaim[]` and `ReviewerLkWithheld[]`. Current per-claim rendered order:

1. metadata row: `claim_id` · `claim_character` · `jurisdiction` · `lifecycle` · `scope: {publication_scope}` · `CRC channel: {crc_eligible}` · `verified {last_verified}`
2. `statement` (or an italic placeholder if null)
3. `Scope of the statement: {crc_publication_scope}` (raw CRC-channel prose)
4. `Applicability to this submission: {established | not established}` + per-requirement rows (`fact operator "value" — status`)
5. `Governed project dependencies (informational): …`
6. `provider scope: … · tool scope: …`
7. `Full governed record: {governed_claims_reference}`

Plus a header line: `Retrieval context (submission facts — not evidence): tools … · jurisdiction …`, and a collapsed `N governed claim(s) on this topic withheld from reviewer research` list.

**What is already compliant:** proposition is verbatim; applicability status is verbatim; withheld shows id+reason only; applicability styling is dark-vs-grey text weight, not red/green; nothing labelled evidence/finding.
**What CAH-4F changes:** ordering (2 before 4), an explicit "Applicability" heading, reviewer-readable topic labels, "Context used for this look-up" wording, remove raw `crc_publication_scope` (item 3) from reviewer view, hide `crc_eligible` by default, move items 1/5/6/7 behind progressive disclosure.

## 6. Audit contract (as-built — unchanged by CAH-4F)

- One deliberate reviewer look-up ⇒ exactly one `crc_context_access_events` row, `access_kind:'lk_research'`, written by `recordReviewerLkAccess` **before** any governed content is serialised (route step 4 → 5).
- Audit-write failure ⇒ `503`, zero content. Selection/read error ⇒ `500`/`404`/`400`, **no audit row**.
- Row carries `actor_user_id` + `submission_id` only. `association_id` / `crc_session_id` NULL (LK research is not tied to a CRC association — the `_transcript_is_scoped` CHECK is guarded on `access_kind='transcript'`).
- Append-only: no FK, no `updated_at`, no policy — RLS on, service-role only.

## 7. CAH-4F proposed implementation surface

**Constraint:** no change to the route contract, the selector, eligibility, applicability, the audit, `crc_context_access_events`, the migration set, workbook behaviour, sign-off, report, publication, or CRC.

CAH-4F is expected to touch **at most**:

| File | Change | Notes |
|---|---|---|
| `app/admin/submissions/[id]/review/ReviewerLkLookup.tsx` | re-order claim card; add "Applicability" heading; reviewer-readable topic labels; "Context used for this look-up" wording; drop raw `crc_publication_scope` from render; hide `crc_eligible` by default; progressive-disclosure for governance metadata | the bulk of the work; presentation only |
| `app/admin/submissions/[id]/review/ReviewerLkPanel.tsx` | possibly re-home under a Reviewer Resources container | server component stays server component |
| `app/admin/submissions/[id]/review/ReviewerCrcContextPanel.tsx` | possibly re-home under the same container (behaviour unchanged) | OQ-4 |
| `app/admin/submissions/[id]/review/page.tsx` | wrap the two secondary panels in a `<ReviewerResources>` layout element (sibling of `<WorkbookClient>`, never a child) | one small JSX change |
| **new** `app/admin/submissions/[id]/review/ReviewerResources.tsx` (or similar) | the container / right-side inspector layout | server component; no data fetching of its own |
| `lib/reviewer-lk/project-reviewer-claims.ts` | *optionally* — if a reviewer-oriented statement-scope note (FR-6) is derived at projection time rather than omitted | OQ-2; prefer omission for V1 |
| **new** a small topic-label constants module *or* an inline map in `ReviewerLkLookup.tsx` | `GoalCategory → reviewer label` | OQ-5; must not change the value sent to the API |
| `__tests__/reviewer-lk/authority-firewall.test.ts` | extend E (control scan) to the new container; assert raw `crc_publication_scope` and default `crc_eligible` are absent from the reviewer DOM | |
| **new** `__tests__/reviewer-lk/reviewer-resources-presentation.test.ts` (or extend `projection.test.ts`) | card order, applicability heading, label map, wording, no-promotion-control | |

**Explicitly NOT touched:** `route.ts`, `select-reviewer-claims.ts`, `eligibility.ts`, `submission-facts.ts`, `repository.ts`, `types.ts` (the API contract), `lib/retrieval-engine/**`, `lib/reviewer-context/**` behaviour, any migration, `WorkbookClient.tsx` / `Section*.tsx` / `workbook-schema.ts` / `guidance.ts`.

## 8. Data / API changes

**None expected.** The `ReviewerLkClaim` payload already carries every field CAH-4F needs (`statement`, `applicability_outcomes`, `applicability_established`, `retrieval_context`, `publication_scope`, `crc_eligible`, `last_verified`, `governed_claims_reference`). CAH-4F chooses *which* to show and *how*, client-side. If a reviewer-oriented scope note (FR-6) is derived server-side, that is an additive optional field on `ReviewerLkClaim` and must be raised for approval — it is not assumed here.

## 9. Fail-closed behaviour (preserved + extended)

| Condition | Behaviour (must remain) |
|---|---|
| not admin | 401/403, no audit, no content |
| unknown / missing topic | 400, no audit |
| submission missing | 404, no audit |
| selection throws | 500, no audit |
| audit write fails | 503, zero governed content |
| a claim's `publication_scope` missing/unknown | reviewer-ineligible → `withheld` (never rendered as content) |
| provider/tool scope unresolved | claim not surfaced (fail closed) |
| **CAH-4F addition:** a topic has no reviewer label mapped | fall back to a readable transformation of the enum, never crash; the API value is unchanged |
| **CAH-4F addition:** `crc_publication_scope` present | not rendered in the reviewer view at all |

## 10. Test strategy

1. **Unchanged suites (must stay green, intent unchanged):** `route-and-audit`, `select-reviewer-claims`, `eligibility`, `crc-regression`, `reviewer-context/**`, `retrieval-engine/topic-claims-fixture-consistency`.
2. **Extended:** `authority-firewall` — the E-block control scan covers the new container; add assertions that the raw `crc_publication_scope` string and (by default) `crc_eligible` are not in the rendered reviewer output.
3. **New:** a presentation test — card order (proposition before applicability), explicit "Applicability" heading, topic label → enum map correctness, "Context used for this look-up" wording, no `<input>`/`<textarea>`/copy-apply control in the Reviewer Resources subtree.
4. **Full regression:** `tsc --noEmit` clean; `next build` exit 0; full Jest vs the pre-CAH-4F `origin/main` baseline — **zero new failed suites / tests / failure classes**.
5. **UAT:** one reviewer performs one look-up on an internal `si8_certified` fixture, confirms the new presentation, confirms exactly one `lk_research` event, confirms `workbook_data` / assessment fields unchanged.

## 11. Regression risks

| Risk | Mitigation |
|---|---|
| Right-side inspector layout forces a `WorkbookClient` refactor | OQ-1 — if incompatible, ship stacked panels grouped under a Reviewer Resources heading; the inspector is preferred, not required (PRD §8.2 vs §8.3) |
| Topic label map drifts from `GOAL_CATEGORIES` | a test asserting the map's keys are exactly `GOAL_CATEGORIES \ 'unknown'` |
| A future dev adds a "cite in note" button and wires it to the workbook | firewall E scan + ADR-001; any such affordance is a separate approved decision |
| Hiding `crc_eligible` breaks a governance consumer | it is client-render only; the API payload is unchanged; no server consumer reads the rendered DOM |
| Removing raw `crc_publication_scope` loses reviewer signal | it is CRC-channel prose, not reviewer authority (SR-4); the structured `publication_scope` tag and the `governed_claims_reference` link remain |
| Accessibility regression from colour-only status | mandated text-based status (PRD §8.4) — also removes the red/green concern |

## 12. Rollout / UAT expectations

- CAH-4F is a **reviewer-page presentation change only**. No migration. No production data change.
- Rollout = normal branch → PR → review → non-force fast-forward integration → Vercel auto-deploy (same as CAH-4E-INT).
- UAT is a single reviewer session on an internal fixture (§10.5). No customer-facing surface changes.
- No CAH-4E-PROD-style migration gate (there is no migration).

## 13. Explicit prohibited couplings

- Reviewer Resources ↔ `workbook_data` — **none**. No read that influences a workbook default; no write.
- Reviewer Resources ↔ `assessments` / sign-off / report / publication — **none**.
- Reviewer LK ↔ `retrieve.ts` / CRC consumer path — **none** (parallel selector only).
- Reviewer LK ↔ CRC transcript / CRC goals / discovered relevance — **none** as automatic input (that boundary is CAH-4D's; CAH-4F does not open it).
- Topic label map ↔ the API contract — **none**; labels are display-only, values sent to the route are unchanged `GoalCategory` strings.
- CAH-4F ↔ any free-text question input — **none** (that is CAH-4G).

## 14. CAH-4G forward note (not implemented here)

CAH-4G would add a reviewer free-form question box that flows `question → governed retrieval → bounded interpretation → reviewer-oriented composition`. For CAH-4F this means:
- the Reviewer Resources container should be structured so a question section can be *added* later without re-architecting (e.g. sections within the inspector), but **no question input ships in CAH-4F**;
- the projection module (`project-reviewer-claims.ts`) stays a thin pass-through — CAH-4G's "reviewer-oriented composition" is a new, separate composition step, not an extension of CAH-4F presentation;
- the audit `access_kind` vocabulary may need a third value for CAH-4G (e.g. `lk_question`) — that is a CAH-4G migration decision, explicitly out of CAH-4F scope.

---

**See also:** `PRD_CAH_4F_REVIEWER_RESOURCES.md`, `08_Platform/app/lib/reviewer-lk/ADR-001-reviewer-resources-authority-boundary.md`, `08_Platform/implementation/COMMERCIAL_ASSURANCE_ARCHITECTURE_INDEX.md`.
