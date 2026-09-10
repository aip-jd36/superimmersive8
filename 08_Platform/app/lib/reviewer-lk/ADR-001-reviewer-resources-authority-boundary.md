# ADR-001: Reviewer Living Knowledge is a research authority surface, not an assessment authority surface

**Status:** Accepted — describes an invariant already enforced in code (CAH-4B…4F.2); recorded here so it survives individual milestones. The CAH-4F.2 row (rail time-sharing) was additionally confirmed in a passing production visual UAT on 2026-09-10 — the reviewer saw no evidence-promotion affordance, no CRC-only publication prose, and the "not assessment evidence" framing intact while a real governed Living Knowledge result rendered inside the coordinated inspector (`REVIEWER_RESOURCES_ARCHITECTURE.md` §17a).
**Date:** 2026-09-10
**Context:** CAH-4F (Reviewer Resources + Living Knowledge Context Semantics) documentation-contract milestone. As-built basis `origin/main` = `9fa6d1c`.
**Applies to:** `lib/reviewer-lk/**`, `lib/reviewer-context/**`, `lib/crc-project-context/**`, the reviewer-side panels on `app/admin/submissions/[id]/review/page.tsx`, and any future CAH-4G work.

---

## Decision

**Reviewer Living Knowledge is governed *research*. The Assessment Workbook is *evidence evaluation + human judgment*. Linked CRC Context is *customer/project context* from an educational conversation. Rendering these surfaces beside each other on the review page does not merge their authority, and Reviewer Resources must never — silently or by any UI control — mutate Assessment Workbook state, create evidence / gaps / findings / control results / an outcome / a sign-off / a report / a publication decision, or state a conclusion stronger than a governed claim and its deterministic applicability status permit.**

The Human Reviewer remains solely responsible for evidence evaluation and the assessment conclusion. Consulting a resource is an input to that judgment, never a substitute for it, and never a shortcut into workbook state.

---

## Problem

The review page accumulated reviewer-facing surfaces one milestone at a time:

- CAH-4B — `ReviewerCrcContextPanel`: the customer's linked CRC project context.
- CAH-4C — `ReviewerTranscriptDrawer`: deliberate, audited full CRC transcript access.
- CAH-4E — `ReviewerLkPanel` / `ReviewerLkLookup`: governed Living Knowledge look-up with deterministic applicability.

All three now render as siblings of `WorkbookClient` on `page.tsx`. Without a stated, durable boundary, a future change could plausibly:

- add a "copy this claim into my findings" button;
- pre-populate a workbook field from a CRC assertion or an LK proposition;
- render "Applicability: Not established" as a red failure that a reviewer treats as a negative finding;
- surface CRC-channel governance prose (`crc_publication_scope`, "CRC may/must…") as if it were reviewer authority text;
- let an LK look-up write anything other than its access audit.

Each of these would collapse an authority boundary that the product depends on: **CRC is educational and not commercial-clearance; Reviewer LK is governed research and not the assessment judgment; the reviewer owns the conclusion.** (`PRD_CRC_v1.0.md`, `PRD_ASSESSMENT_SERVICE_v1.0.md`, SI8 Principle P3 "independent assessment is the product", P4 "human judgment for commercial clearance cannot be automated".)

## What is currently enforced (evidence)

At `origin/main` = `9fa6d1c`:

| Guarantee | Where |
|---|---|
| `lib/reviewer-lk/**` imports nothing from `@/lib/assessments`, the workbook write path, `@/lib/crc-sales`, or `@/lib/retrieval-engine/retrieve` | `__tests__/reviewer-lk/authority-firewall.test.ts` A, D |
| the assessment domain imports nothing from `lib/reviewer-lk`; `workbook-schema.ts` / `WorkbookClient.tsx` reference no reviewer-lk type | firewall B |
| the only `.insert` in `lib/reviewer-lk` targets `crc_context_access_events`; no write to `assessments` / `workbook_*` / `submissions` / `crc_sessions` / `crc_assurance_*` / `crc_sales_*`; no `.rpc` | firewall C |
| the `lk_research` audit row carries `access_kind` + `actor_user_id` + `submission_id` only — no query text, no claim text, no interpretation, no finding | firewall C + `20260910000000_reviewer_lk_research_access_kind.sql` CHECK |
| no `*ToEvidence` / `*ToFinding` / `create*Gap` / … converter anywhere in `lib/reviewer-lk` | firewall C |
| route is `GET` only, no request body, `topic` the only request-derived value | firewall D |
| `ReviewerLkPanel` is a server component; `ReviewerLkLookup` issues exactly one `GET`, has no `<input>`/`<textarea>`, no copy/apply control, and is a sibling — not a child — of `WorkbookClient` | firewall E |
| reviewer eligibility = `lifecycle` + `publication_scope` + supersession only; `crc_eligible` never consulted | `lib/reviewer-lk/eligibility.ts`, `__tests__/reviewer-lk/eligibility.test.ts` |
| unresolved applicability requirement → surfaced verbatim, never withheld, never a negative finding | `lib/reviewer-lk/select-reviewer-claims.ts`, `__tests__/reviewer-lk/select-reviewer-claims.test.ts` |
| governed statement is verbatim `crc_candidate_statement` — never paraphrased / combined / ranked | `select-reviewer-claims.ts` (passthrough), `__tests__/reviewer-lk/projection.test.ts` |
| audit-before-content: governed result returned only after the audit row is durably written; audit failure → 503, zero content | `route.ts` step 4→5, `__tests__/reviewer-lk/route-and-audit.test.ts` |
| CRC retrieval byte-unchanged by the reviewer path | `__tests__/reviewer-lk/crc-regression.test.ts` |
| CRC transcript access is deliberate + audited (`access_kind:'transcript'`), never auto-loaded | CAH-4C, `__tests__/reviewer-context/**` |
| **(CAH-4F)** the reviewer surface renders no `crc_publication_scope` prose and no `crc_eligible` — CRC-channel governance metadata is not projected as reviewer authority language | `__tests__/reviewer-lk/authority-firewall.test.ts` F, `reviewer-resources-presentation.test.ts` |
| **(CAH-4F)** the topic label map is display-only — the value sent to `GET …/reviewer-lk?topic=` is the unchanged `GoalCategory` enum | `reviewer-resources-presentation.test.ts` ("topic labels never change the value sent to the API") |
| **(CAH-4F)** `<ReviewerResources>` is a server component that only groups the two panels — no `fetch`, no client state, no `.insert`/`.update`/`.rpc`, no promotion control | `authority-firewall.test.ts` E ("<ReviewerResources> is a server component…"), `reviewer-resources-presentation.test.ts` |
| **(CAH-4F)** "Applicability: Not established" is rendered with neutral text weight and the explicit "not a negative finding" sentence — no green/red pass-fail colour tokens | `reviewer-resources-presentation.test.ts` FR-4 |
| **(CAH-4F.1)** the page-frame owner `ReviewerShell` is generic — it imports no reviewer-lk / reviewer-context / assessment service and no `WorkbookClient`; the workbook (`children`) and resources (`inspector`) reach it as opaque `React.ReactNode` slots; co-location in one shell is a layout choice, not an authority statement | `__tests__/reviewer-shell/reviewer-shell.test.ts` B |
| **(CAH-4F.1)** opening/closing the inspector, switching the Living Knowledge / Linked CRC Context tab, and resizing fire no network call, no audit event, and never remount `WorkbookClient` (unsaved workbook state survives) | `reviewer-shell.test.ts` C/D, `route-and-audit.test.ts` (unchanged) |
| **(CAH-4F.1)** `WorkbookClient` is unchanged except its outer `h-screen`→`h-full`; it references no shell/inspector/reviewer identifier | `reviewer-shell.test.ts` C, `reviewer-context/authority-firewall.test.ts` D |
| **(CAH-4F.2)** at adjacent widths only one contextual surface occupies the right rail at a time: `ReviewerShell` derives one **layout-only** boolean (`workbookContextAsideHidden = resourcesAvailable && inspectorOpen && adjacent`) and publishes it via the domain-neutral `workspace-layout-context` around the opaque Workbook child; `WorkbookClient` consumes only that boolean and **CSS-hides (never unmounts)** its own Guidance/Submission/Evidence aside. The channel carries layout state only — no LK data, CRC context, applicability, governed claims, Workbook data, evidence, audit info, assessment conclusions, or mutating callback. `rightTab` stays Workbook-owned; the autosave `useEffect` gains no layout dependency; opening/closing Reviewer Resources fires no PATCH and no audit event. **This is a UX / perceptual-clarity mechanism, not an authority boundary** — it does not strengthen, weaken, or restate any authority separation; those remain enforced independently through data ownership, service boundaries, audit paths, bounded interpretation and mutation boundaries. Contextual rail time-sharing improves workspace clarity; the existing authority boundaries are unaffected. | `__tests__/reviewer-shell/context-coordination.test.ts`, `reviewer-shell.test.ts` C |

This ADR names the principle those tests defend, so a reviewer of a *future* change can check the change against the principle, not just against whatever the tests happened to cover.

## Consequences

**Positive:**
- CAH-4F, CAH-4F.1, CAH-4F.2, CAH-4G, and any later reviewer-surface work have a single stated boundary to design against.
- The "beside each other ≠ merged authority" rule is explicit, so the CAH-4F.1 right-side inspector layout is safe: `ReviewerShell` co-locates the workbook and the resources content as opaque slots without ever coupling to either — co-location is a layout choice, not an authority statement.
- CAH-4F.2 extends the same rule to *rail occupancy*: which contextual surface is on screen is a layout choice; it never speaks to authority. The layout channel is a deliberately minimal boolean so it cannot become a coupling vector.
- `crc_eligible` and `crc_publication_scope` are classified: governance metadata about the *CRC channel*, not reviewer authority language — the reviewer view renders neither.

**Costs / limits:**
- In CAH-4F there is **no** transfer or citation affordance between Reviewer Resources and the workbook. A reviewer who wants to reference a governed claim in their workbook note types it themselves. This is a **scope decision for CAH-4F, not a permanent architectural prohibition** — see the non-decision below.
- The reviewer surface is intentionally "read and think", not "read and act". That is the CAH-4F posture.

**What this ADR permanently forbids** (independent of any future milestone): **silent or automatic** movement of Reviewer LK or CRC content into `workbook_data`, an `assessments` row, evidence, a gap, a finding, a control result, an outcome, a sign-off, a report, or a publication decision — and any presentation that states a conclusion stronger than the governed claim + its deterministic applicability status permit.

## Non-decisions (left open)

- **A future deliberate, reviewer-initiated, provenance-preserving citation / reference affordance** — e.g. an explicit "reference this governed claim in my note" action that carries the `claim_id` + `last_verified` + `governed_claims_reference` and is attributed to the reviewer's own action. This is **explicitly not prohibited** by this ADR. It is out of scope for CAH-4F; it would be specified in its own milestone and recorded in a new or amended ADR. The permanent constraint above still applies: such an affordance must be reviewer-initiated and provenance-preserving, never silent or automatic, and it must not convert research into an assessment conclusion.
- CAH-4G's composition step — a *new, separate* bounded composition, not an extension of the CAH-4F passthrough projection; its own design and its own `access_kind`.
- Matrix-claim reviewer access (the reviewer path is `TopicClaim`-only today) — separate future milestone.

## Related

- `08_Platform/prds/PRD_CAH_4F_REVIEWER_RESOURCES.md` §4 (authority boundaries), §11 (CAH-4G boundary)
- `08_Platform/implementation/REVIEWER_RESOURCES_ARCHITECTURE.md` §2, §13
- `08_Platform/implementation/CRC_CURRENT_STATE.md` §1 (CRC product boundary), §2 (layering invariant)
- `08_Platform/prds/PRD_CRC_v1.0.md`, `08_Platform/prds/PRD_ASSESSMENT_SERVICE_v1.0.md`
- sibling ADRs: `08_Platform/app/lib/assessments/ADR-001..004`
