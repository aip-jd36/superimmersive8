# Reviewer Resources — Architecture (as-built CAH-4B…4F)

**Status:** ACTIVE — the normative internal-design reference for the reviewer-side surfaces of the CRC → Commercial Assurance handoff.
**As-built basis:** `9fa6d1c` for the §1.1 data-flow internals; the **page shell** (§1 tree, §7 file table, §Responsive, §15 UAT) is as-built for **CAH-4F.1 — Reviewer Workspace Shell**, integrated to `origin/main` = `b0e067f` (feat `f76dc85`, docs `b0e067f`) on 2026-09-10 and deployed to the `si8-creator-portal` **Production** environment (`app.superimmersive8.com`). Status: **INTEGRATED / PRODUCTION DEPLOYED** — the dedicated §16 CAH-4F.1 UAT was not run separately, but the shell IA + closable inspector + LK / Linked-CRC tab separation + "no stacked layout" were exercised and confirmed operational in production during the 2026-09-10 CAH-4F.2 UAT (§17a). **CAH-4F.2 — Contextual Inspector Coordination** (§1 tree, §11a, §17, §17a) is **CLOSED / PRODUCTION-PROVEN** (2026-09-10): `origin/main` = `f29b0fb` (feat `4f1969d`, rebased onto `74a8f63` + fast-forwarded), Vercel `si8-creator-portal` Production build `success` on `app.superimmersive8.com`; the §17 visual UAT was performed by PM/user and passed — see §17a for the recorded result and evidence-class breakdown.
**Product spec:** `08_Platform/prds/PRD_CAH_4F_REVIEWER_RESOURCES.md` (the *what*). This doc is the *how*.
**Decision record:** `08_Platform/app/lib/reviewer-lk/ADR-001-reviewer-resources-authority-boundary.md`.
**Layer-normative docs it defers to:** `RETRIEVAL_ENGINE_ARCHITECTURE.md`, `PROJECTION_LAYER_ARCHITECTURE.md`, `LK_PHASE1_TECHNICAL_DESIGN.md` / `_v2.md`, `THIRD_PARTY_SOURCE_ASSETS_ROUTING_ARCHITECTURE.md`, `CRC_CURRENT_STATE.md`.

**Layout milestone history (do not rewrite):** CAH-4F shipped Reviewer Resources + LK Context Semantics as a **grouped top-of-page block** above `<WorkbookClient>` (two stacked collapsed `<details>`). That block was integrated and deployed, but production review found it did not deliver the intended "Workbook primary / Reviewer Resources secondary" hierarchy. **CAH-4F.1 supersedes that layout** with the approved three-region shell (`ASSESSMENT NAVIGATION | ASSESSMENT WORK SURFACE | REVIEWER RESOURCES`). Every CAH-4F semantic guarantee is **retained** and moved into the inspector — reviewer-readable labels, proposition-first order, explicit Applicability, neutral Established/Not established, "Context used for this look-up", provenance disclosure, no `crc_eligible` / no raw `crc_publication_scope` prose, the authority firewall, and the `lk_research` / `transcript` audit semantics.

This doc has two halves:
- **§1–§6 — as-built.** The reviewer-side subsystems (data flow at `9fa6d1c`; page shell at CAH-4F.1).
- **§7–§15 — CAH-4F.1 as-built design surface** (was "CAH-4F design surface"; reconciled to what shipped).

---

## 1. Component / data-flow map (as-built — CAH-4F.1)

Review page: `08_Platform/app/app/admin/submissions/[id]/review/page.tsx` (server component, `requireAdmin()` + one `checkReviewerContextAccess()`):

```
page.tsx  (server)
└── <ReviewerShell resourcesAvailable inspector={…}>       ← CAH-4F.1  ('use client' — generic page-frame owner)
    │     owns: h-screen frame · inspectorOpen · adjacent↔drawer responsive · reopen affordance · Esc-closes-drawer
    │     CAH-4F.2: derives workbookContextAsideHidden = resourcesAvailable && inspectorOpen && adjacent
    │     imports NOTHING from reviewer-lk / reviewer-context / assessments / crc-* / WorkbookClient / Section*
    │     (only new import: ./workspace-layout-context — a domain-neutral layout channel)
    │
    ├── <WorkspaceLayoutProvider value={{ workbookContextAsideHidden }}>   ← CAH-4F.2  (neutral, 1 boolean)
    │   └── children ─ <WorkbookClient submissionId … />   ← pre-CAH-4x  ('use client')
    │         ALWAYS mounted · never remounted on inspector open/close · not remounted by the provider
    │         CAH-4F.2: useWorkspaceLayout() → CSS-hides (never unmounts) its own 280px context aside
    │                   when Reviewer Resources holds the adjacent rail; rightTab stays Workbook-owned
    │         └── sticky header · left §-nav · <main> Section1…7 · own 280px guidance/submission/evidence aside
    │
    └── inspector ─ <ReviewerResources submissionId>       ← CAH-4F  (server — access gate + slot provider)
          └── <ReviewerResourcesInspector>                 ← CAH-4F.1  ('use client' — owns mode/tab state ONLY)
                ├── livingKnowledge ─ <ReviewerLkPanel submissionId>            ← CAH-4E  (server)
                │     └── ReviewerLkLookup                                      ← CAH-4E  ('use client')
                └── linkedCrcContext ─ <ReviewerCrcContextPanel submissionId>   ← CAH-4B  (server)
                      └── ReviewerTranscriptDrawer                             ← CAH-4C  ('use client')
```

**Ownership contract:**
- `ReviewerShell` owns the page frame + inspector open/close + the adjacent-column ⇄ overlay-drawer decision. It receives the workbook as `children` and the resources content as one opaque `inspector: React.ReactNode`. It never inspects or couples to either slot — UI adjacency does not merge the three authority surfaces (ADR-001). **CAH-4F.2:** it also derives one layout-only boolean, `workbookContextAsideHidden` (`resourcesAvailable && inspectorOpen && adjacent`), and publishes it through `WorkspaceLayoutProvider` (from the domain-neutral `workspace-layout-context` module) wrapped once, unconditionally, around `{children}`. The shell still knows nothing about `rightTab`, guidance/submission/evidence, LK topics or CRC associations.
- `workspace-layout-context.tsx` (CAH-4F.2) — a domain-neutral client module: `createContext<{ workbookContextAsideHidden: boolean }>` (default `false`), `WorkspaceLayoutProvider`, `useWorkspaceLayout()`. Imports only React. No fetch, no persistence, no audit, no `@/lib/*`. **The channel carries layout state only** — never Reviewer LK data, CRC context, applicability, governed claims, Workbook data, evidence, audit information, assessment conclusions, or any mutating callback. Contextual rail time-sharing improves workspace clarity; existing authority boundaries remain enforced independently through data, service, audit, interpretation and mutation boundaries.
- `WorkbookClient` is unchanged except: (CAH-4F.1) its outer container `h-screen` → `h-full`; (CAH-4F.2) it calls `useWorkspaceLayout()` and adds one conditional class to its **existing** right `<aside>` — `${workbookContextAsideHidden ? 'hidden' : 'flex'}` — so the aside is CSS-hidden (Tailwind `display:none`), **never unmounted**, while Reviewer Resources holds the adjacent rail. All 9 `useState` (incl. `rightTab`), the auto-save `useEffect` (deps still `[workbook, save]` — no layout dependency), `computeGates` gating, `sectionNav`, `activeDomain`, the sticky header, and the three nested scroll regions are otherwise byte-identical. `rightTab` remains entirely Workbook-owned and layout-independent; on close the aside returns with the same tab selected. The `/api/admin/submissions/[id]/workbook` PATCH path is unchanged; opening/closing Reviewer Resources fires no PATCH.
- `ReviewerResources` (server) runs the single access check and server-renders `<ReviewerLkPanel>` + `<ReviewerCrcContextPanel>` as two `ReactNode` slots for the client `ReviewerResourcesInspector` (RSC-slot interleaving). Each resource view keeps its own `checkReviewerContextAccess()`, its own data path, and its own audit (`lk_research` / `transcript`), independent of the other.
- `ReviewerResourcesInspector` (client) owns only `mode ∈ {living_knowledge, linked_crc}`. Both tab panels stay mounted; switching is a visibility toggle — a completed look-up survives a tab switch, and a tab switch fires **no** network call and **no** audit event.
- The **Linked CRC Context** tab is always present; a submission with no linked CRC renders a neutral empty state ("No CRC conversation is linked to this submission."), never `null`, never framed as an assessment deficiency.

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

**What CAH-4F / CAH-4F.1 changed (as-built — `ReviewerLkLookup.tsx` on branch `work/cah-4f-reviewer-resources`):**

Per-claim rendered order is now **proposition → Applicability → Context → limitations → provenance**:

1. **the governed proposition** (`claim.statement`, verbatim) — leads the card, `font-display` at `text-[15px]`, visually primary
2. **Applicability** — explicit `<h4>Applicability</h4>` heading; a neutral dot + `Established` / `Not established` (ink-blue `#233f66` dot when Established, grey `#c9c6bc` when not — never green/red); "Not established" carries *"A required fact is unresolved or does not match this submission's context — this is not a negative finding."*; the *full* per-requirement breakdown moved to a "Why this applies" disclosure
3. **Context used for this look-up** — a 2-col `<dl>`: `Resolved tools` / `Jurisdiction` from `retrieval_context`, explicitly labelled *"Submission-derived inputs to retrieval — not assessment evidence."*
4. **Why this applies** — `<details>` disclosure: every `applicability_outcome` (`fact operator "value" — {status}`, `{status}` verbatim)
5. **Evidence limitations / unresolved requirements** — `<details>` disclosure with a **count badge** = `applicability_outcomes` where `status !== 'met'` + `unresolved_project_dependencies`; "No unresolved requirements…" when the count is 0
6. **Provenance and governance details** — `<details>` disclosure: `claim_id`, `claim_character`, `jurisdiction`, `lifecycle`, `scope: {publication_scope}`, `verified {last_verified}`, provider/tool scope, `governed_claims_reference`

Removed from the reviewer view entirely: raw `crc_publication_scope` prose and `crc_eligible` / "CRC channel" (SR-4 / SR-5).

**Topic control (CAH-4F.1):** a `role="radiogroup"` of `<button role="radio">` **chips** (not `<select>`) — each carries the canonical enum in `data-topic={t}`, displays `reviewerTopicLabel(t)` only, and is keyboard-navigable (roving `tabIndex`, arrow keys move + focus). `onChange` receives the enum `t`; the fetch still sends `topic=${encodeURIComponent(topic)}`. No API-contract change.

**Results header:** `{N} result(s)` + a `Clear results` action, then `Reference only — not assessment evidence. {REVIEWER_LK_FRAMING.applicability_note}`.

**Framing:** `REVIEWER_LK_FRAMING.body` renders as a standing info banner at the top of the Living Knowledge tab (was the `<summary>` of the removed outer `<details>`). The inspector chrome subtitle carries "Reference materials to support your review — not assessment evidence."

## 6. Audit contract (as-built — unchanged by CAH-4F / CAH-4F.1)

- One deliberate reviewer look-up ⇒ exactly one `crc_context_access_events` row, `access_kind:'lk_research'`, written by `recordReviewerLkAccess` **before** any governed content is serialised (route step 4 → 5).
- Audit-write failure ⇒ `503`, zero content. Selection/read error ⇒ `500`/`404`/`400`, **no audit row**.
- Row carries `actor_user_id` + `submission_id` only. `association_id` / `crc_session_id` NULL (LK research is not tied to a CRC association — the `_transcript_is_scoped` CHECK is guarded on `access_kind='transcript'`).
- Append-only: no FK, no `updated_at`, no policy — RLS on, service-role only.
- **CAH-4G.5 (HRR):** the free-form HRR research path **reuses this exact contract UNCHANGED** — same `access_kind='lk_research'`, same `{actor, submission}` row, same audit-before-content + fail-closed discipline, via the PURE `lib/hrr/project-hrr-audit-record.ts` + the impure `lib/hrr-audit/run-audited-hrr-research.ts`. No third `access_kind`, **no migration**. Authority-only ("should I approve this?") + unsupported → **no row** (no governed knowledge accessed). Multi-topic / mixed free-form → **one row per reviewer action**. Raw question never persisted. See `HRR_GRI_TECHNICAL_DESIGN.md §K`.

## 7. CAH-4F.1 implementation surface (as-built)

**Constraint (held):** no change to the reviewer-lk route contract, the selector, eligibility, applicability, the audit, `crc_context_access_events`, the migration set, sign-off, report, publication, or CRC. The **only** structural change to `WorkbookClient.tsx` is its outer `h-screen` → `h-full`. Verified: `git diff --stat` touches only the files below; full Jest failure set **byte-identical** to parent `ed3333e` (20 pre-existing unrelated suite failures — `bounded-interpretation` / `crc-engine` / `crc-sales` / `retrieval-engine` / `assessments/mock-provider`, none reviewer-side, none in a touched file); `tsc --noEmit` clean; `next build` exit 0; `+35` new passing reviewer/shell tests, zero new failures.

| File | Change | Kind |
|---|---|---|
| **new** `app/admin/submissions/[id]/review/ReviewerShell.tsx` | `'use client'` generic page-frame owner: `flex h-screen` row of `[workspace {children}][inspector <aside>]`; `inspectorOpen` + `adjacent` state from `matchMedia((min-width: ${ADJACENT_MIN_PX}px))`; adjacent = in-flow `w-[340px] 2xl:w-[380px] border-l` column; drawer = `fixed right-0` overlay with `translate-x` + backdrop; Esc closes drawer; slim edge-tab reopen affordance; `data-reviewer-shell-mode` marker. Imports only React + 2 lucide icons. | new — layout owner |
| **new** `app/admin/submissions/[id]/review/ReviewerResourcesInspector.tsx` | `'use client'` tab host: `mode ∈ {living_knowledge, linked_crc}`; `role="tablist"` + two `role="tab"` buttons; both `role="tabpanel"` slots always mounted (visibility class toggle). Renders `{livingKnowledge}` / `{linkedCrcContext}` ReactNode props. No fetch, no write, no workbook import. | new — tab UI state |
| `app/admin/submissions/[id]/review/ReviewerResources.tsx` | server component → now the access gate + slot provider: `checkReviewerContextAccess()`, then `<ReviewerResourcesInspector livingKnowledge={<ReviewerLkPanel/>} linkedCrcContext={<ReviewerCrcContextPanel/>} />`. No cue text of its own. | edit — restructured |
| `app/admin/submissions/[id]/review/ReviewerLkPanel.tsx` | server; outer `<details>` removed (the tab is the disclosure); renders the `REVIEWER_LK_FRAMING.body` info banner + `<ReviewerLkLookup>` | edit |
| `app/admin/submissions/[id]/review/ReviewerLkLookup.tsx` | `<select>` → keyboard-accessible `role="radiogroup"` chips; "Why this applies" + "Evidence limitations / unresolved requirements" (count badge) split from Applicability; provenance disclosure renamed; `Clear results` action; `{N} result(s)` header | edit — presentation |
| `app/admin/submissions/[id]/review/ReviewerCrcContextPanel.tsx` | server; outer `<details>` removed; `if (!context.linked) return null` → **neutral empty state**; `getReviewerCrcContext` / `AssociationBlock` / `ReviewerTranscriptDrawer` / audit byte-unchanged | edit |
| `app/admin/submissions/[id]/review/page.tsx` | one `checkReviewerContextAccess()`; `<><ReviewerResources/><WorkbookClient/></>` → `<ReviewerShell resourcesAvailable inspector={resourcesAvailable ? <ReviewerResources/> : null}><WorkbookClient/></ReviewerShell>` | edit — render tree |
| `app/admin/submissions/[id]/review/WorkbookClient.tsx` | **one line**: outer `flex flex-col h-screen` → `flex flex-col h-full` (+ a comment). Nothing else. | edit — 1 line |
| `__tests__/reviewer-lk/authority-firewall.test.ts` | E/F blocks updated for the shell + inspector; `ReviewerShell.tsx` + `ReviewerResourcesInspector.tsx` added to the import-cleanliness scans; chip assertions replace `<option>` assertions | test — extended |
| `__tests__/reviewer-context/authority-firewall.test.ts` | E "sibling" test → "reaches the page as the `<ReviewerShell>` inspector slot"; shell + inspector added to `REVIEWER_CONTEXT_ALL` | test — extended |
| `__tests__/reviewer-lk/reviewer-resources-presentation.test.ts` | reworked for CAH-4F.1: chip control, 5-section order (proposition→applicability→context→limitations→provenance), inspector slot structure, "not assessment evidence" framing across shell/LK | test — reworked |
| **new** `__tests__/reviewer-shell/reviewer-shell.test.ts` | 20 assertions: shell = 3 peer regions (not a stack, not nested); `{children}` mounted once/unconditionally; shell imports no reviewer/assessment service; opaque `React.ReactNode` slots; WorkbookClient reverse boundary; `h-screen`→`h-full` is the only WB change; workbook state identifiers intact; no fetch on open/tab-switch; canonical topic id; CRC always-a-tab + neutral empty state; `ADJACENT_MIN_PX` in [1280,1536] via `matchMedia`; adjacent = in-flow column, drawer = `position:fixed`; reopen affordance; `data-reviewer-shell-mode` marker | test — new |

**NOT touched (confirmed):** `route.ts`, `select-reviewer-claims.ts`, `eligibility.ts`, `submission-facts.ts`, `repository.ts`, `types.ts`, `project-reviewer-claims.ts`, `topic-labels.ts`, `lib/retrieval-engine/**`, `lib/reviewer-context/**` behaviour, `ReviewerTranscriptDrawer.tsx`, any migration, `Section*.tsx` / `workbook-schema.ts` / `guidance.ts`, WorkbookClient's nav / header / aside / scroll / state / autosave.

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

## 11. Responsive (CAH-4F.1) — the adjacent ⇄ drawer breakpoint

`ADJACENT_MIN_PX = 1440` (`ReviewerShell.tsx`), chosen from **measured region widths**, not Tailwind's default `2xl` (1536). Fixed chrome inside `WorkbookClient`: left `<nav>` 200px + own `<aside>` 280px = 480px. Center `<main>` readable content = `min(main_width − 64px, 672px)` (`max-w-2xl` + `px-8`). Adjacent inspector `<aside>` = 340px (`< 2xl`) / 380px (`≥ 2xl`).

| Viewport | Mode | Inspector | Workspace cell | `<main>` readable center | Verdict |
|---|---|---|---|---|---|
| **1280** | **drawer** (default closed) | overlay 420px, workbook DOM unshifted | 1280 (full) | `min(736, 672)` = **672** | Adjacent here would give a 460px center — cramped for the evidence tables. Drawer keeps the workbook comfortable; reviewer opens Resources deliberately. |
| **1440** | **adjacent, open** | 340px in-flow | 1100 | `min(556, 672)` = **556** | Four regions. 556px center is below the 672 ideal but the single-column Section forms/cards/tables remain fully usable. Satisfies the PM preference "side-by-side at 1440 if practically usable." |
| **1536** | adjacent, open | 380px (`2xl`) | 1156 | `min(612, 672)` = **612** | Comfortable. |
| **1920** | adjacent, open | 380px | 1540 | `min(996, 672)` = **672** (capped) | Inspector a genuine column; center at full ideal width with generous margins. |

- **Adjacent (≥ 1440):** in-flow `<aside>` beside the workbook; the workbook flexes narrower; no `position: fixed`. **(CAH-4F.2, see §11a)** the workbook's own context aside and the Reviewer Resources inspector time-share the rail — only one is visible at a time.
- **Drawer (< 1440):** right-anchored `position: fixed` overlay with a `translate-x` transition + a light click-to-close backdrop; the workbook DOM is **not** reflowed; default **closed**; `Esc` closes. **(CAH-4F.2)** unchanged — `workbookContextAsideHidden` is gated on `adjacent`, so in drawer mode the workbook context aside always stays visible under the floating overlay.
- **Never** the top-of-page stacked fallback at any desktop width.
- When closed (any width): a slim persistent right-edge "Reviewer Resources" button reopens it.

## 11a. Contextual rail time-sharing (CAH-4F.2)

Production visual UAT of CAH-4F.1 (~1440px) confirmed the shell architecture but found the four simultaneous regions in §11's table made the assessment work surface unnecessarily cramped (556px center at 1440). CAH-4F.2 makes the contextual right rail hold **one surface at a time at adjacent widths**.

`ReviewerShell` derives `workbookContextAsideHidden = resourcesAvailable && inspectorOpen && adjacent` and publishes it (layout-only) via `workspace-layout-context`. `WorkbookClient` CSS-hides its own 280px Guidance/Submission/Evidence aside while that is true — the aside stays mounted, `rightTab` and scroll survive, and it returns unchanged on close.

| Viewport | Mode | Reviewer Resources **CLOSED** | Reviewer Resources **OPEN** | Center when OPEN |
|---|---|---|---|---|
| **1280** | drawer | `NAV 200 │ WORKBOOK │ CONTEXT-ASIDE 280` — center **672** | fixed overlay drawer floats over the right side; workbook DOM not reflowed; context aside stays (occluded by the overlay) | n/a (drawer steals no width) |
| **1440** | adjacent | `NAV 200 │ WORKBOOK │ CONTEXT-ASIDE 280` — center **672** | context aside **hidden**; `NAV 200 │ WORKBOOK │ REVIEWER-RESOURCES 340` — center **672** | **672 (ideal restored)** |
| **1536** | adjacent | center **672** | context aside hidden; inspector 380 — center **672** | **672** |
| **1920** | adjacent | `NAV 200 │ WORKBOOK │ CONTEXT-ASIDE 280` — center capped **672** | context aside hidden; inspector 380 — center capped **672** | **672** |

- **Uniform mutual exclusion at every adjacent width, including 1920px.** No ">= ~1800px show-both" exception — consistency is the approved product decision for this milestone.
- **On close:** `workbookContextAsideHidden` → false → the context aside un-hides showing the **same `rightTab`** (guidance/submission/evidence); nothing to restore, it was never unmounted.
- The reviewer trades simultaneity for a wider work surface: Evidence / Submission context is one click away (close Reviewer Resources) rather than always on screen. This is the product's stated "one contextual surface at a time" preference.

**Deferred, not addressed by CAH-4F.2:** the CAH-4F.1 breakpoint-crossing behaviour — the two separate `<aside>` JSX branches (`adjacent` vs `!adjacent`) mean the Reviewer Resources inspector subtree remounts when the viewport crosses 1440px, losing an in-progress LK look-up / tab selection. `WorkbookClient` is unaffected. Tracked separately; a future change could unify the two branches into one element with conditional classes.

**Also still deferred (unchanged from §11):** the broader Workbook visual-system redesign (fold the context aside into the center, move the dark header into the left rail) — a Workbook UX redesign, explicitly out of scope here ("do not remove/redesign the existing Workbook context aside"). CAH-4F.2 is the smaller coordination fix; the shell + this layout channel are built so that later change stays additive.

## 12. Regression risks

| Risk | Mitigation |
|---|---|
| The shell frame breaks `WorkbookClient`'s nested scroll / sticky header | the shell gives the workspace cell a definite height (`h-full` in a `h-screen` flex row); `WorkbookClient`'s inner `flex flex-1 min-h-0` + 3 `overflow-y-auto` are byte-unchanged; `reviewer-shell.test.ts` asserts `h-screen`→`h-full` is the ONLY WB change + all state identifiers intact |
| Inspector open/close remounts `WorkbookClient` and wipes unsaved edits | `{children}` is rendered once, unconditionally, in a fixed position; only the inspector `<aside>` toggles (visibility class / transform), never the workspace; test asserts `{children}` appears exactly once and in no `&&`/ternary mount |
| A future dev couples the shell to a reviewer service | firewall scans on `ReviewerShell.tsx` + `ReviewerResourcesInspector.tsx` (no `@/lib/reviewer-lk` / `@/lib/reviewer-context` / `@/lib/assessments` / `WorkbookClient` import); slots typed `React.ReactNode` |
| Chips lose keyboard access vs the old `<select>` | `role="radiogroup"` + roving `tabIndex` + arrow-key move-and-focus; `data-topic` carries the canonical enum; `reviewer-shell.test.ts` + presentation test assert the radiogroup + `onChange(t)` |
| Topic label map drifts from `GOAL_CATEGORIES` | test asserts map keys = `GOAL_CATEGORIES \ 'unknown'` |
| Hiding `crc_eligible` / removing `crc_publication_scope` prose breaks a consumer | client-render only; API payload unchanged; structured `publication_scope` tag + `governed_claims_reference` remain |
| Colour-only applicability status | neutral dot + text (`#233f66` / `#c9c6bc`), never green/red; presentation test bans the hex + tailwind colour tokens |
| Four-region density at 1440 | §11 — documented as a separate Workbook-UX concern, not solved here |

## 13. Rollout / UAT expectations

- CAH-4F.1 is a **reviewer-page shell + presentation change**. No migration. No production data change. No API/schema change.
- Rollout = normal branch → non-force fast-forward integration → Vercel auto-deploy (same as CAH-4E-INT / CAH-4F). **Not pushed by this milestone** — PM reviews the implementation evidence + viewport screenshots first.
- UAT = §16 script, one authenticated reviewer session on the internal synthetic `CA-RLK-2a PROD SMOKE` (`ASSESS-007-2026-09-07`) fixture. No customer-facing surface changes.
- No migration gate (fresh inspection confirms `supabase/migrations/` unchanged).
- **Prior CAH-4F layout** (`d19b678`, grouped top-of-page block) is on `origin/main` and deployed; CAH-4F.1 supersedes that layout when it integrates. CAH-4F's semantic work is retained, not reverted.

## 14. Explicit prohibited couplings

- `ReviewerShell` ↔ any reviewer / assessment service — **none**; imports only React + lucide icons; slots opaque `React.ReactNode`.
- Reviewer Resources ↔ `workbook_data` — **none**. No read that influences a workbook default; no write.
- Reviewer Resources ↔ `assessments` / sign-off / report / publication — **none**.
- Reviewer LK ↔ `retrieve.ts` / CRC consumer path — **none** (parallel selector only).
- Reviewer LK ↔ CRC transcript / CRC goals / discovered relevance — **none** as automatic input (that boundary is CAH-4D's; CAH-4F.1 does not open it).
- Topic label/chip ↔ the API contract — **none**; `data-topic` is the canonical enum, values sent to the route unchanged.
- Inspector tab switch ↔ any network call / audit — **none**.
- CAH-4F.1 ↔ any free-text question input — **none** (that is CAH-4G).

## 15. CAH-4G — HRR converged interface (as-built, CAH-4G.6 → CAH-4G.10 Slice A)

> **CAH-4G.10 Slice A (2026-09-11) — reviewed LOCALLY, NOT on `main`, NOT in production (CAH-4G.10P).** In production today `ReviewerLkLookup` is still the single-turn CAH-4G.6/.7 surface ("Governed research response" heading, "Clear" button, a new question replaces the prior answer, composer keeps its text). **In the reviewed local code** (`bea6f2d`, local branch only), `ReviewerLkLookup` is an **append-only visible research thread** (`app/admin/submissions/[id]/review/hrr-thread.ts` — a local pure reducer; `useReducer` replaces the single-answer `state` slot). Successive topic picks and questions stack; asking a second question no longer clears the first. A topic pick shows `Research: <label>` (never a fabricated sentence); a free-form question shows the verbatim text; the answer turn is the unchanged `<HrrResearchAnswerView>`. **VISIBLE, not CONTEXTUAL** — no `prior_context`, no prior turn to the classifier / retrieval / applicability / BI / composition / audit; the `POST .../reviewer-lk/research` body is byte-unchanged (`{mode, topic}` / `{mode, question}`); topic = 0 model calls, free-form ≤1. "Clear conversation" replaces "Clear current response" — client-only, no server call. Thread survives a tab switch + inspector close/reopen (component stays mounted), clears on page refresh; no storage APIs. Full as-built + verification: `HRR_CONVERSATIONAL_ARCHITECTURE.md §BB`.


The Living Knowledge tab is now the converged **Governed Research Interface**. Topic shortcuts and a free-form "Ask HRR" question are **two entry modes into one capability**, not two tools.

**Runtime.** Both modes `POST /api/admin/submissions/[id]/reviewer-lk/research`:
- body `{ mode: 'topic_pick', topic: <GoalCategory\'unknown'> }` or `{ mode: 'question', question: <1..HRR_QUESTION_MAX_LENGTH chars> }`. A `messages[]` / `history` / `conversation` / `session_id` shape → `400`. No client-supplied actor identity, claim ids, applicability, BI status, authority state, or topic classification.
- `topic_pick` → `topicSelectionGateResult(topic)` (**0 model calls** — the classifier adapter is never constructed for this mode). `question` → `createAnthropicResearchIntentInterpreter()(question)` (1 classify-only call; fails closed to `unsupportedResearchIntent()`, never throws) → `hrrAuthorityGate(classified, { sourceTextRef: null })`.
- then `runAuditedHrrResearch({ gate, reviewerContext, topicClaims: TOPIC_CLAIMS_FIXTURE, attributedQuestion, actorUserId: access.userId, submissionId })` — the CAH-4G.5 audit-before-content boundary: the `lk_research` row (where governed research occurred) persists **before** any governed content; `HrrAuditNotRecordedError` → `503 { error: "Living Knowledge research unavailable — access could not be recorded." }`, zero content.
- returns one **`HrrResearchAnswer`** (Slice 4 contract).

**Presentation.** ONE component `HrrResearchAnswerView` renders `HrrResearchAnswer` for both modes — no `TopicResearchResultView` / `QuestionResearchResultView`, no `topic === '<enum>'` branch. Render order = the Slice-4 consultative hierarchy: an assessment-authority boundary callout (only when a decision was asked — visually distinct, `role="note"`); then per topic: **orientation (prominent)** → the verbatim Bounded-Interpretation reading → *Governed claims — applicability & provenance ▸* (disclosure; the statement text is not repeated) → *For this submission* (applicability rollup) → **What remains unresolved** (before provenance) → *Does not apply* (neutral; statement shown, since it is not in the reading) → research/authority boundary → *Provenance & governance details ▸* (disclosure). Empty sections omitted. Neutral styling only — no pass/fail colour, no ✓/✗, no `crc_eligible`, no raw `crc_publication_scope`. No "copy to evidence" / apply / accept control.

**Interaction (`ReviewerLkLookup.tsx`, rewritten).** Topic chips (radiogroup, `data-topic` = canonical enum, label-only display) run the research **on click**. A labelled `<textarea id="hrr-question">` "Ask HRR" + an "Ask" button (Cmd/Ctrl+Enter). ONE current research response — a new topic/question replaces it (honest for the stateless V1). A monotonic request counter drops a slow earlier response so it cannot overwrite a newer one. No conversation memory: each request is interpreted from its own text; a previous answer is never sent into the next request. **The raw question lives only in component state + the server-round-tripped `question_text` echo — never `localStorage` / `sessionStorage` / URL / analytics / deliberate logs. Page reload → empty surface.** No chatbot theatre (no avatar, no "AI is typing", no bubbles, no model branding).

**Legacy — RETIRED (CAH-4G.7).** `GET /api/admin/submissions/[id]/reviewer-lk?topic=` (CAH-4E) + `route-and-audit.test.ts` + `projectReviewerLkResult` + `ReviewerLkLookupResult` were deleted (zero runtime consumers after CAH-4G.6). Its fail-closed `lk_research` audit-before-content guarantee is now proved for the sole production path by `hrr-research-route.test.ts`. `project-reviewer-claims.ts` remains as a leaf module carrying only `REVIEWER_LK_FRAMING` (rendered by `ReviewerLkPanel`).

**CAH-4G.7 presentation hardening (renderer only — no BI / composition / contract change).** A server-rendered-markup review of the 7 §18 cases (real components + real pipeline data; no authenticated browser session was available in the build environment) found the `relevant_applicability_unresolved` answer buried its point behind the BI-joined governed reading and re-stated `jurisdiction`/refs 5–6×. Fixed in `HrrResearchAnswerView.tsx`: **"What remains unresolved" now leads** (right after orientation); the two per-topic provenance disclosures collapse to **one**; per-claim `applicability_outcomes` / `unresolved_project_dependencies` re-lists dropped from provenance; the "Not yet established" group dropped from the applicability rollup (which becomes "Applicability settled for this submission"). `bi_summary_blocks` stays a verbatim BI passthrough — its multi-claim density is a Slice-4/BI composition property (a documented backlog item, not fixed here).

**Unchanged by CAH-4G.6:** the `ReviewerShell` (CAH-4F.1) frame + open/close + responsive breakpoint; `ReviewerResourcesInspector` tabs; the Linked CRC Context tab (separate resource, never HRR grounding); the `crc_context_access_events` schema (no migration); `WorkbookClient`; all assessment/workbook/evidence/finding/outcome/sign-off state; CRC.

## 18. HRR UAT script (manual — no browser harness in this repo; run in a credentialed preview/production environment before deploy)

**Status (CAH-4G.10I, 2026-09-11):** CAH-4G.10P proved the prior production UAT hit a **DEPLOYMENT GAP** (Slice A reviewed locally, never on `main`). **Resolved:** the reviewed lineage was rebased onto `origin/main` (`d06c668`, zero-overlap CRC drift) and fast-forward-pushed — `origin/main` == `4b9ee5a`. Vercel auto-deploy observed; exact production SHA and the authenticated UI fingerprint could not be certified from this environment (no Vercel credentials, no browser session). **This §18 script must now be re-run — with the conversational-thread addendum below — as the actual authenticated visual UAT gate** before CAH-4G is marked `CLOSED`. Addendum: confirm heading "Research conversation"; action "Clear conversation"; successive turns stay visible; composer clears on submit; Clear conversation empties the thread only; tab-switch / inspector close-reopen preserve the thread; page refresh clears it. Full script: `HRR_CONVERSATIONAL_ARCHITECTURE.md §EE`. **Status (CAH-4G.9, 2026-09-10):** PM production UAT PASSED the single-turn HRR experience but found the **single-turn model too visible** — reviewers expect a **conversational research thread**. Not an unsafe defect / not a rollback. Architecture designed in **`HRR_CONVERSATIONAL_ARCHITECTURE.md`** + **`lib/reviewer-lk/ADR-003-hrr-conversation-context.md`**: append-only client-only thread; bounded enum-only follow-up referent (never transcript-to-LLM); one-model-call ceiling; no persistence / audit / schema / CRC change. **Status (CAH-4G.8):** CAH-4G is **merged to `main` (`0413291`, fast-forward, no force) and production-deployed to `app.superimmersive8.com`** under a PM-authorized controlled production integration for internal synthetic UAT (route topology confirms the deploy: `POST .../reviewer-lk/research` → `401 {"error":"Unauthorized"}`, legacy `GET .../reviewer-lk` → `404`). **This script has still NOT been run in an authenticated browser** — the Claude Chrome extension was not connected to the CAH-4G.8 session and no admin/reviewer credential, `ANTHROPIC_API_KEY`, or audit-DB access was available there. Slice 7's server-rendered-markup review of the 7 answer cases remains the best composition evidence (structure/text/density verified; Tailwind styling not visually confirmed). **This script is now the post-deploy production-UAT gate — run it against `app.superimmersive8.com` before CAH-4G is marked `CLOSED / PRODUCTION-PROVEN` or used for any customer purpose.** Note: `likeness` is no longer an empty-coverage topic (NY §396-b claim on `main` since `9219496`); for a non-New-York fixture it renders applicability-unmet, not "outside current coverage".

**Environment:** a deploy/preview of the CAH-4G branch. Sign in as an admin (`users.is_admin = true`). Open `/admin/submissions/{id}/review` for an internal synthetic Commercial Assurance fixture (e.g. `ASSESS-007-2026-09-07`). `ANTHROPIC_API_KEY` must be set for the Ask-HRR steps (topic steps do not need it).

| # | Action | Expected observation |
|---|---|---|
| 1 | Open the review page; open **Reviewer Resources**; **Living Knowledge** tab. | The tab shows the lead sentence, a **Topic shortcuts** row of 5 chips, an **Ask HRR** `<textarea>` + **Ask** button, the "not legal advice / not a commercial-clearance determination" line. No answer yet. No network call fired by opening the tab (check devtools). |
| 2 | Click the **Copyright ownership** chip. | Brief "Performing governed research…". Then a **Governed research response**: an *orientation* line ("Governed Living Knowledge speaks to Copyright ownership…"), the governed reading, *For this submission* / *What remains unresolved* only if non-empty, a *research boundary* line, and the reviewer-responsibility footer. Exactly **one** `POST …/reviewer-lk/research` (body `{mode:'topic_pick',topic:'copyright_ownership'}`); exactly **one** `lk_research` row in `crc_context_access_events` (actor = your id, `association_id`/`crc_session_id` NULL). **No `hrr_intent` telemetry / no Anthropic call.** |
| 3 | Expand *Provenance & governance details* (ONE disclosure per topic — CAH-4G.7). | Per governed claim: `claim_id` · whether its applicability is established · one `GOVERNED-CLAIMS.md#…` reference. Then any reviewer-ineligible claim ids + plain reason. Each reference appears once. No `crc_eligible`, no CRC-channel "may/must" prose. |
| 4 | In **Ask HRR** type *"what does governed knowledge say about copyrightability?"* → **Ask**. | One `POST` (`{mode:'question',question:…}`), **one** Anthropic classify call, **one** `lk_research` row. The response shows *"You asked: …"* verbatim, `intent_origin` "interpreted from your question", and (for the fixture) a `relevant_applicability_unresolved` topic where, **directly after the orientation (CAH-4G.7 order)**, **What remains unresolved** lists `jurisdiction` + `human_contribution_description` with a note assigning each to the Human Reviewer — *then* the governed proposition in full. **No** wording says the requirement is met/satisfied/established/cleared/compliant/sufficient. `jurisdiction` is stated once (not re-listed per claim). |
| 5 | Ask *"should I approve this submission?"* | A distinct **assessment-authority boundary** callout: "HRR does not make assessment decisions; that is the Human Reviewer's role…". **No** governed proposition. **No** yes/no. A *Try a governed research topic* chip row. **No `lk_research` row** written (no governed research occurred). Not shown as an application error. |
| 6 | Ask *"should I approve this, and what does governed knowledge say about copyright ownership?"* | ONE response surface: the authority-boundary callout **and**, structurally separate below it, the ordinary governed `copyright_ownership` research (an `informational` answer, not `determination_declined`). No sentence blends them ("although I can't approve it, this looks fine…" must not appear). **One** `lk_research` row. |
| 7 | Ask *"can you determine whether copyright ownership is satisfied?"* | Orientation: "This asks HRR to make a determination… HRR does not issue determinations…". `boundary_note` about approval/clearance/outcome being the reviewer's. **No** governed proposition, **no** applicability rollup, **no** yes/no. It does **not** read as a warning/failure. |
| 8 | Click the **Likeness** chip (0 governed reviewer coverage). | "Governed Living Knowledge does not currently cover Likeness. HRR has no governed proposition to surface on this topic; this is not a finding either way." No answer drawn from general knowledge, no web content, no Linked-CRC substitution. |
| 9 | (If practical) Point the app at a broken audit path (or temporarily break `recordReviewerLkAccess`), then click a topic chip. | `503`, the fixed message "Living Knowledge research unavailable — access could not be recorded." **No** governed proposition / applicability / provenance anywhere in the response. |
| 10 | Ask a question, then immediately ask a second different question before the first returns. | Only the **second** answer renders (the first is dropped). No merge, no "previous answer" context. |
| 11 | Reload the page. | The Living Knowledge tab is empty again — no "You asked:" history, no prior answer. Check `localStorage` / `sessionStorage`: no HRR question or answer stored. |
| 12 | Switch to **Linked CRC Context** and back. | The HRR response is retained (tab switch is visibility-only). No `lk_research` or `transcript` row from the switch. Linked CRC still reads as *context, not assessment evidence and not HRR grounding*. |
| 13 | Narrow the viewport below `ADJACENT_MIN_PX` (1440). | Reviewer Resources becomes the overlay drawer per CAH-4F.1; the `<textarea>` + chips + long governed propositions wrap without horizontal scroll; the workbook is not forced unusably narrow. Esc closes the drawer. |
| 14 | Throughout: check the workbook. | `workbook_data`, `assessments` row, sign-off status — **unchanged**. No evidence / finding / gap / control / outcome created by any HRR action. |

## 16. CAH-4F.1 UAT script (manual — no browser harness in this repo)

**Environment:** a deploy of the CAH-4F.1 branch. Sign in as an admin (`users.is_admin = true`). Open `/admin/submissions/{id}/review` for the internal synthetic **`CA-RLK-2a PROD SMOKE`** (`ASSESS-007-2026-09-07`). Two look-ups against the live `TOPIC_CLAIMS_FIXTURE`:
- **Established** — topic **Copyright ownership** → `CLAIM-COPY-004-v1` (no applicability requirements).
- **Not established** — topic **Copyrightability** → `CLAIM-COPY-001-v1` (one `unresolved` requirement).

*(Confirm these are the production-reachable governed records; report any difference rather than substituting.)*

| # | Step | Expected |
|---|---|---|
| 1 | Open the review page on a ≥1440px screen. | Three regions: left §-nav, center Workbook (primary, expanded, its own dark header + guidance/submission/evidence aside intact), and a **secondary right-side "Reviewer Resources" inspector** (in-flow column, ~340–380px). No top-of-page stacked block. |
| 2 | Read the inspector header. | Title **"Reviewer Resources"**, subtitle *"Reference materials to support your review — not assessment evidence."*, and a **✕ close** control. |
| 3 | Note the two tabs. | **"Living Knowledge"** (active) and **"Linked CRC Context"**. |
| 4 | Confirm nothing loaded. | The Living Knowledge tab shows the governed-research info banner + "1. Select a topic" chips + "Look up governed knowledge" — **no results yet, no network call fired on page load**. |
| 5 | Read the topic chips. | **Commercial use / Copyright ownership / Copyrightability / Likeness / Third-party source rights** — plain English, keyboard-navigable (Tab to focus, arrow keys move). |
| 6 | Pick **Copyright ownership**, click **Look up governed knowledge**. | One result. Card leads with the **governed proposition** (serif, prominent). |
| 7 | Card order. | proposition → **Applicability** → **Context used for this look-up** → **Why this applies** (disclosure) → **Evidence limitations / unresolved requirements** (disclosure, count badge **0**) → **Provenance and governance details** (disclosure). |
| 8 | Applicability section. | Heading "Applicability"; a neutral **dot** + **"Established for this submission."** — **no green tick, no red, no colour-only status**. |
| 9 | Context section. | `Resolved tools` + `Jurisdiction` actually used + *"Submission-derived inputs to retrieval — not assessment evidence."* |
| 10 | Expand **Provenance and governance details**. | `claim_id` · character · jurisdiction · lifecycle · `scope: <publication_scope>` · verified · provider/tool scope · `governed_claims_reference`. **No `crc_eligible` / "CRC channel". No raw `crc_publication_scope` prose anywhere.** |
| 11 | Switch to the **Linked CRC Context** tab. | The Living Knowledge result is retained (not re-fetched). CRC tab shows **"No CRC conversation is linked to this submission."** + the neutral "not an assessment deficiency" line. **No `lk_research` or `transcript` event fired by the tab switch.** |
| 12 | Switch back to **Living Knowledge**, change topic to **Copyrightability**, **Look up** again. | A card with **"Not established for this submission."** + *"A required fact is unresolved or does not match this submission's context — this is not a negative finding."*; the **Evidence limitations** disclosure shows a non-zero count and lists the `unresolved` requirement(s) with verbatim `{status}`. |
| 13 | Close the inspector (**✕**), then reopen it (right-edge **"Reviewer Resources"** button). | Workbook returns to full width on close; on reopen the last look-up is **still shown** (state survived). |
| 14 | Look for any promotion control anywhere in the inspector. | **None.** No "Add to evidence" / "Apply" / "Accept" / "Approve" / "Cite in note" / checkbox / drag handle. Only disclosures, chips, the look-up button, `Clear results`, tab buttons, and ✕. |
| 15 | Type an unsaved note in the Workbook's "Evidence notes", then open/close the inspector. | The unsaved text is **still there**; no extra `PATCH /workbook` fired by the inspector toggle. |
| 16 | In Supabase, count `crc_context_access_events` for this `submission_id`. | Exactly **2** `access_kind='lk_research'` rows (steps 6 and 12), `actor_user_id` = your admin id, `association_id`/`crc_session_id` NULL. **Zero** rows from page load, tab switches, or open/close. |
| 17 | Re-read the submission's `workbook_data` + its `assessments` row. | **Byte-unchanged.** No evidence, gap, finding, control result, outcome, sign-off, report, or publication row created or altered. |
| 18 | Resize the browser to ~1280px. | The inspector becomes a **right-anchored overlay drawer** (default closed); the Workbook is full-width and comfortable underneath; the reopen button summons the drawer; ✕ / backdrop / `Esc` dismiss it; the Workbook DOM does not shift. |

**Pass = every row matches.** Rows 10, 11, 14, 15, 16, 17 are release blockers.

## 17. CAH-4F.2 UAT script (manual — no browser harness in this repo)

**Environment:** a deploy of the CAH-4F.2 branch. Sign in as an admin (`users.is_admin = true`). Open `/admin/submissions/{id}/review` for the internal synthetic **`CA-RLK-2a PROD SMOKE`** (`ASSESS-007-2026-09-07`). Browser at **~1440px** unless a row says otherwise. **Do not** run an LK look-up until row 6.

| # | Action | Expected |
|---|---|---|
| 1 | Load the page at ~1440px. Reviewer Resources opens by default (CAH-4F.1). | Layout is `NAV │ WORKBOOK │ REVIEWER RESOURCES` — the Guidance/Submission/Evidence aside is **not** visible. Work surface is comfortably wide (~672px content). |
| 2 | Close Reviewer Resources (**✕**). | Layout becomes `NAV │ WORKBOOK │ GUIDANCE/SUBMISSION/EVIDENCE`. The Workbook keeps roughly the same content width (the context aside took the space the inspector had). |
| 3 | In the context aside, click the **Submission** tab, then the **Evidence** tab. | Tab switches normally; content updates. |
| 4 | With **Evidence** selected, reopen Reviewer Resources (right-edge button). | The Guidance/Submission/Evidence aside **disappears**; `NAV │ WORKBOOK │ REVIEWER RESOURCES`; the Workbook reclaims the width. |
| 5 | Close Reviewer Resources again. | The context aside **returns, still on the Evidence tab** (not reset to Guidance). |
| 6 | Type an unsaved note in a Workbook field (e.g. a Section 2 textarea). Do **not** wait for autosave. Open Reviewer Resources, then close it. | The unsaved text is **still there**. The save indicator does **not** flash "Saving…" as a result of the open/close. |
| 7 | Navigate to Section 3, focus a domain (sets `rightTab='guidance'`, `activeDomain`). Open + close Reviewer Resources. | Section 3 + the focused domain are unchanged; the context aside returns on **Guidance** showing that domain's guidance. |
| 8 | Open Reviewer Resources, run an LK look-up (topic → "Look up governed knowledge"). Close, reopen. | LK result still shown (CAH-4F.1 behaviour, unchanged). |
| 9 | Resize to **1536px**, then **1920px**. Toggle Reviewer Resources at each. | Same mutual exclusion at both — open ⇒ context aside hidden, closed ⇒ context aside shown. **No "both visible" mode at any width.** |
| 10 | Resize to **~1280px**. | Drawer mode (CAH-4F.1): Reviewer Resources is a right-anchored overlay; the Guidance/Submission/Evidence aside **stays visible** underneath; opening the drawer does not hide it; ✕ / backdrop / `Esc` dismiss the drawer. |
| 11 | In Supabase, count `crc_context_access_events` for this `submission_id`. | Exactly the look-ups you performed in row 8 — **zero** additional rows from any aside toggle / open / close / resize. |
| 12 | Re-read the submission's `workbook_data` + its `assessments` row. | **Byte-unchanged** except the note you deliberately typed in row 6 (if autosave ran). No evidence/gap/finding/outcome/sign-off/report row created or altered by any coordination action. |

**Pass = every row matches.** Rows 5, 6, 11, 12 are release blockers.

## 17a. CAH-4F.2 Production UAT — PASS (2026-09-10)

**Decision:** PM/user — **CAH-4F.2 PRODUCTION UAT PASS** → milestone recorded **CLOSED / PRODUCTION-PROVEN**.

**Environment:** Production — `https://app.superimmersive8.com`
**Fixture:** `CA-RLK-2a PROD SMOKE — internal synthetic, delete after` · assessment `ASSESS-007-2026-09-07`
**Viewport:** ~1440px (ordinary desktop). Authenticated admin reviewer session.

Two evidence classes, recorded separately and not conflated:

### Engineering / repository proof (this milestone's diff + tests)

- **Layout-only coordination.** The shell → Workbook channel is one boolean, `workbookContextAsideHidden` (`workspace-layout-context.tsx`, React-only, no `@/lib` import, no fetch/persistence/audit). `context-coordination.test.ts` A asserts the contract is a single boolean field and nothing else.
- **Workbook context aside kept mounted** — CSS `hidden`, never unmounted (`context-coordination.test.ts` C: `${workbookContextAsideHidden ? 'hidden' : 'flex'}`, no `{… && <aside}` mount gate).
- **`rightTab` remains Workbook-owned** and layout-independent (`context-coordination.test.ts` C).
- **No API / route / schema / migration / retrieval / applicability / audit / CRC-linkage change** — the CAH-4F.2 feat commit (`4f1969d`) touches only `workspace-layout-context.tsx` (new), `ReviewerShell.tsx` (+import, +derived boolean, +provider wrap), `WorkbookClient.tsx` (+hook, +one class), and two `__tests__/reviewer-shell/*` files. `page.tsx` and every Reviewer Resources component byte-unchanged (`context-coordination.test.ts` D/E).
- **Validation:** 15 reviewer suites / 320 tests pass; `tsc --noEmit` clean; `next build` exit 0; full Jest failing set byte-identical to a fresh `74a8f63` baseline (20 suites / 77 tests), zero new failures — established twice (pre-change local `e63ceda`; fresh from the rebased tree `74a8f63`).

### Production visual proof (PM/user observed)

1. **Reviewer Resources CLOSED** → `NAV | WORKBOOK | WORKBOOK CONTEXT`. Assessment navigation visible; Workbook visible and primary; Workbook context aside visible with Guidance / Submission / Evidence.
2. **Reviewer Resources OPEN** → `NAV | WORKBOOK | REVIEWER RESOURCES`. The Workbook context aside disappeared visually; the Workbook reclaimed the contextual-rail width; Reviewer Resources stayed visually separate from the Workbook; Living Knowledge + Linked CRC Context tabs visible; **no** top-of-page stacked Reviewer Resources layout. The earlier CAH-4F.1 four-region density was no longer present.
3. **Reviewer Resources CLOSED again** → Workbook context aside returned; Guidance / Submission / Evidence returned; the previously-selected **Guidance** tab remained selected; the assessment remained on the same section; no visible Workbook reset. *(Visual / session-state confirmation only — this is not an independent database-invariance proof; §17 rows 11–12 were not separately re-queried this session.)*
4. **Explicit `Copyright ownership` Living Knowledge look-up** (one deliberate action) → **1 governed result**, rendered inside the coordinated inspector while the Workbook stayed visible and primary. Proposition visually primary; explicit heading **"Applicability"** → "Established for this submission." + "No additional applicability requirements."; **"Context used for this look-up"** → Jurisdiction: "Global" + "Submission-derived inputs to retrieval — not assessment evidence."; separate **"Evidence limitations / unresolved requirements"** and **"Provenance and governance details"**.
5. `crc_eligible` / "CRC channel: Yes" **not shown**; raw CRC publication prose ("CRC may state…") **not shown**.
6. **No** evidence-promotion / finding / conclusion affordance anywhere in the inspector; reviewer framing "Reference materials to support your review — not assessment evidence." intact; LK framing remained explicit that it is governed SI8 institutional knowledge / reviewer research / not an assessment conclusion / completes no Commercial Assurance control / no substitute for reviewer judgment.
7. Workbook remained visually primary throughout.

**Result: PASS.**

### Audit-path note

The `lk_research` audit contract (audit-before-content, `access_kind`-only row, no query/claim/interpretation text) was **production-proven by CAH-4E**. **CAH-4F.2 does not change that path** — no `lib/reviewer-lk` / route / audit file is in the CAH-4F.2 diff, `reviewer-shell.test.ts` D + `context-coordination.test.ts` D assert no fetch fires on inspector open / tab-switch / resize, and `route-and-audit.test.ts` is unchanged and passing. This UAT session produced **no new `crc_context_access_events` query** and none is claimed here.

### Non-blocking presentation-polish observation

`non-blocking presentation polish` — the "Context used for this look-up" section renders **`Resolved tools —`** even when no resolved tools are available. It could later be omitted when empty. Not a CAH-4F.2 issue, not an open architectural risk, not scheduled.

---

**See also:** `PRD_CAH_4F_REVIEWER_RESOURCES.md`, `08_Platform/app/lib/reviewer-lk/ADR-001-reviewer-resources-authority-boundary.md`, `08_Platform/implementation/COMMERCIAL_ASSURANCE_ARCHITECTURE_INDEX.md`.
