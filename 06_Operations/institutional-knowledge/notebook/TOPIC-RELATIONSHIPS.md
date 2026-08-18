# Topic Relationships

**Status: ACTIVE — Governed Topic Relationships implementation milestone, 2026-08-16.** Canonical home for governed, directional, one-hop routing links between two Living Knowledge topics, per the CRC + Living Knowledge "Copyright Ownership ↔ Copyrightability Knowledge Relationship" design milestone (approved) and this implementation milestone.

**This document does not replace or change the purpose of:**
- `GOVERNED-CLAIMS.md` — atomic, substantive governed propositions stay there, unchanged. A relationship record here never contains or re-authors substantive legal doctrine.
- `PLATFORM-RIGHTS-MATRIX.md` — tool-scoped commercial-use claims stay there, unchanged.
- `SI8-POSITIONS.md` / `EDGE-CASES.md` / `PENDING-QUESTIONS.md` — unchanged.

**Its role is specifically:** a governed answer to "may knowledge under one topic be relevant to interpreting a user's goal under a different topic, without that knowledge itself answering the goal?" A relationship is routing metadata, not a claim — it decides *whether Retrieval may look*, never *what CRC may say*. What CRC may say continues to come exclusively from `GOVERNED-CLAIMS.md`'s own `CRC Candidate Statement` fields.

## Core principle

A user's captured goal stays exactly what the user asked (e.g. "Do I own the copyright?" stays `copyright_ownership` — Extraction never manufactures a second `copyrightability` goal). A governed relationship may separately say:

```
copyright_ownership → copyrightability
```

meaning: knowledge under `copyrightability` may be relevant to interpreting a `copyright_ownership` goal, but does not itself answer the `copyright_ownership` question. The distinction between "relevant to" and "answers" is the entire reason this document exists — collapsing it anywhere (in a relationship's `rationale`, in a user-facing rendering, in a future engineer's shortcut) defeats the purpose of separating relationships from claims at all.

## Relationship vs. claim

| | Claim (`GOVERNED-CLAIMS.md`) | Relationship (this document) |
|---|---|---|
| What it is | A substantive proposition ("X is true under Y law") | Routing metadata ("topic B may be relevant to a goal in topic A") |
| User-facing content | Yes, via `CRC Candidate Statement`, once CRC-eligible | Never — `rationale` is internal governance prose only |
| Governed by | Lifecycle + separate CRC-Eligible gate | Same two-stage model, its own separate gate |

A relationship's `rationale` field must never contain or re-author substantive legal doctrine — that already lives in the target topic's own claims (e.g. CLAIM-COPY-002-v1, CLAIM-COPY-003-v1) and, for the framing distinction itself, in CLAIM-COPY-004-v1. `rationale` is reviewed at adoption time exactly like claim text is, and is never read by any module under `lib/bounded-interpretation/` or `lib/projection-layer/` — enforced structurally (see `08_Platform/app/lib/retrieval-engine/types.ts`'s own `TopicRelationship.rationale` doc comment), not merely by convention.

## Directionality

Relationships are directional. `copyright_ownership → copyrightability` does **not** imply the reverse (`copyrightability → copyright_ownership`). No automatic inverse relationships are ever created — a reverse edge, if ever wanted, requires its own separate governed record with its own rationale and its own approval.

## One-hop only

If `A → B` and `B → C` both exist as governed relationships, a goal in `A` may retrieve knowledge under `B`. It must **never** recursively retrieve `C`. There is no graph traversal, no recursion, and no plan to build either in Phase 1 — this is enforced structurally in `lib/retrieval-engine/lookup-topic-relationships.ts` (the lookup function only ever reads relationships whose `source_topic` equals the goal's own category, directly; it never re-queries against a resolved `target_topic`'s own outgoing relationships).

## Governance

Same two-stage governance philosophy `GOVERNED-CLAIMS.md` already uses for claims — a relationship can be valid institutional knowledge for reviewers without being approved for automated CRC use:

- **`Lifecycle`** (`Candidate` / `Under Review` / `Adopted` / `Deprecated`) + **`Adoption Approver`** + **`Adoption Decision Date`** govern whether this relationship is institutionally correct at all.
- **`CRC Eligible`** (`Yes` / `No` / `Pending`) + **`CRC Approver`** + **`CRC Decision Date`** are a **separate** decision governing whether the relationship may expand CRC's own unsupervised runtime retrieval. A relationship may be `Adopted` while `CRC Eligible: Pending` indefinitely — the expected, intentional state, not a gap.
- **`CRC Approver`**/**`Adoption Approver`** must always be a real, named human. No automated "legal reviewer" role exists or is permitted.

**Double gate (load-bearing):** related-topic content reaches CRC only when **both** the relationship itself is `Adopted` + `CRC Eligible: Yes`, **and** the target claim itself is `Adopted` + `CRC Eligible: Yes`. Neither gate alone is sufficient — a Reviewer/Commercial Assurance-only relationship must never backdoor a CRC-eligible claim into CRC output, and a CRC-eligible relationship must never backdoor a Reviewer-only claim into CRC output. Enforced in `lookupRelatedTopicClaims` and covered by an explicit double-gate test matrix.

**No relationship becomes `Adopted` or `CRC Eligible` automatically.** The four future Living Knowledge intake sources (CRC Demand, Source Monitoring, Commercial Assurance Reviewer, Strategic Research) may propose candidate relationships, but proposing is not deciding — human governance approval is required every time, exactly as for a claim. Two claims co-occurring in conversations, or an LLM suggesting a connection, is never sufficient grounds on its own.

## Entry template

```markdown
### REL-{DOMAIN}-{SOURCE}-{TARGET}-vN
Source topic:                   <!-- must match an existing GoalCategory value -->
Target topic:                   <!-- must match an existing GoalCategory value -->
Relationship type: relevant_consideration   <!-- Phase 1: the only implemented type -->
Rationale: >
  <!-- structural governance metadata ONLY -- never substantive legal doctrine, never rendered to a CRC user -->

Lifecycle: Candidate            <!-- Candidate | Under Review | Adopted | Deprecated -->
Adoption Approver:              <!-- required once Lifecycle: Adopted; must be a real, named human -->
Adoption Decision Date:         <!-- required once Lifecycle: Adopted -->
Publication scope: Internal/research   <!-- Internal/research | Reviewer/Commercial Assurance | CRC eligible | Public SI8 position -->
CRC Eligible: Pending           <!-- Yes | No | Pending -->
CRC Approver:
CRC Decision Date:
Last reviewed:
Superseded by: none
Related: [[CLAIM-XXX-NNN-v1]]
```

## Relationships

### REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1
Source topic: copyright_ownership
Target topic: copyrightability
Relationship type: relevant_consideration
Rationale: >
  Claims under the target topic may provide relevant governed information
  for interpreting a goal under the source topic, but do not themselves
  determine the source-topic answer.

Lifecycle: Adopted
Adoption Approver: JD (PM)
Adoption Decision Date: 2026-08-16
Publication scope: Reviewer/Commercial Assurance
CRC Eligible: Yes
CRC Approver: JD (PM)
CRC Decision Date: 2026-08-19
Last reviewed: 2026-08-16
Superseded by: none
Related: [[CLAIM-COPY-001-v1]], [[CLAIM-COPY-002-v1]], [[CLAIM-COPY-003-v1]], [[CLAIM-COPY-004-v1]]

**Governance note:** this relationship was adopted 2026-08-16 for reviewer/institutional use, and its CRC runtime expansion was approved 2026-08-19 as part of the atomic copyright publication package below. `lookupRelatedTopicClaims()` requires both `Adopted` and `CRC Eligible: Yes` on the relationship itself, AND `Adopted` and `CRC Eligible: Yes` on the target claim, before any related-topic content reaches CRC output (see `08_Platform/app/lib/retrieval-engine/lookup-topic-relationships.ts`) -- this double gate is architecturally unchanged by this publication decision. CLAIM-COPY-001-v1/002-v1/003-v1 are now ALSO `CRC Eligible: Yes` (same 2026-08-19 decision), so this relationship now has a live effect for a `copyright_ownership` goal for the first time.

**Individual governance review (2026-08-17): PASS / GO AS-IS.** Relationship design, directionality, one-hop enforcement, double-gate behavior, and jurisdiction-applicability pass-through were each independently verified against real code (source/target categories stay distinct; no reverse traversal onto a `copyrightability` goal; no cross-contamination of unrelated goals; the relationship contributes no content whatsoever when either gate alone is unmet). **CRC Eligible deliberately KEPT Pending [at that time]** -- not a design or safety finding. Reason: activating this relationship while CLAIM-COPY-001-v1/002-v1/003-v1 remained CRC-Eligible Pending would have had no live effect (the double gate already prevented it), and reconstructed test-only scenarios confirmed that activating the relationship *together* with those three claims compounds the same product-completeness limitation documented on those claims' own Phase 1 notes and in `PRD_LIVING_KNOWLEDGE_SOURCE_INPUTS_v0.1.md` §27 (deferred "Project-Fact-Aware Bounded Composition") -- the combined related-topic output is long and repetitive, and still does not vary based on what the user actually described. Publication timing was deferred until that capability (or an equivalent PM decision) was ready.

**Atomic copyright publication package (2026-08-19):** a bounded Copyright CRC Publication-Readiness Review (2026-08-19) independently re-verified this relationship's routing architecture via real-pipeline synthetic-eligibility testing (not from the 2026-08-17 review's own reconstructed test-only scenarios alone) and confirmed: the relationship is *necessary* for copyrightability knowledge to reach a `copyright_ownership` goal at all (no other retrieval path exists for this goal category); double-gate behavior holds exactly as designed; no overbreadth or leakage into unrelated topics occurs; the Project-Fact-Aware Bounded Composition gap remains real (confirmed empirically across four human-contribution scenarios rendering byte-identical output) but is non-blocking for safety, since Case 3B's unconditional hedge plus this relationship's own `RELATED_TOPIC_BOUNDARY_CLAUSE` together structurally prevent any overclaiming statement in every tested scenario. PM approved CRC publication of this relationship together with CLAIM-COPY-001-v1, CLAIM-COPY-002-v1, and CLAIM-COPY-003-v1 as a single atomic decision -- not sequentially -- because this relationship has no live effect without at least one eligible target claim, and no subset of the three claims fully answers the review's own motivating acceptance-test question. A known, non-blocking prose-quality follow-up was also recorded, not fixed here: when related-topic content is present, the fixed `RELATED_TOPIC_BOUNDARY_CLAUSE` and Case 3B's own closing sentence can render as two similar-sounding boundary statements back to back -- redundant, not unsafe, and explicitly left unedited by this publication decision. Full review archived at `governance-reviews/CPR_006_COPYRIGHT_PUBLICATION_PACKAGE_2026-08-19.md`.

Full CRC Publication Review artifact: `governance-reviews/CPR_006_COPYRIGHT_PUBLICATION_PACKAGE_2026-08-19.md`

## Runtime fixture

Canonical source above is hand-synced (same discipline as `GOVERNED-CLAIMS.md` ↔ `topic-claims-fixture.ts` — no live markdown parser exists anywhere in this repository) into `08_Platform/app/lib/retrieval-engine/topic-relationships-fixture.ts`. A consistency test (`__tests__/retrieval-engine/topic-relationships-fixture-consistency.test.ts`) catches drift on `relationship_id` / `source_topic` / `target_topic` / `relationship_type` / `lifecycle` / `publication_scope` / `crc_eligible` / `superseded_by` between this document and the runtime fixture.
