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
CRC Eligible: Pending
CRC Approver: PENDING
CRC Decision Date: PENDING
Last reviewed: 2026-08-16
Superseded by: none
Related: [[CLAIM-COPY-001-v1]], [[CLAIM-COPY-002-v1]], [[CLAIM-COPY-003-v1]], [[CLAIM-COPY-004-v1]]

**Governance note:** this relationship is adopted for reviewer/institutional use only. It is **not** approved for CRC runtime expansion. Because `CRC Eligible: Pending`, this record does not change live CRC output — `lookupRelatedTopicClaims()` excludes any relationship that is not both `Adopted` and `CRC Eligible: Yes` before any target claim is even considered (see `08_Platform/app/lib/retrieval-engine/lookup-topic-relationships.ts`). The four current copyright claims (CLAIM-COPY-001 through -004) also all remain `CRC Eligible: Pending` independently — even if this relationship were separately made CRC-eligible, the double gate would still block related-topic content from reaching CRC until the target claims' own CRC eligibility is separately, explicitly decided.

**Individual governance review (2026-08-17): PASS / GO AS-IS.** Relationship design, directionality, one-hop enforcement, double-gate behavior, and jurisdiction-applicability pass-through were each independently verified against real code (source/target categories stay distinct; no reverse traversal onto a `copyrightability` goal; no cross-contamination of unrelated goals; the relationship contributes no content whatsoever when either gate alone is unmet). **CRC Eligible deliberately KEPT Pending** -- not a design or safety finding. Reason: activating this relationship while CLAIM-COPY-001-v1/002-v1/003-v1 remain CRC-Eligible Pending would have no live effect (the double gate already prevents it), and reconstructed test-only scenarios confirmed that activating the relationship *together* with those three claims compounds the same product-completeness limitation documented on those claims' own Phase 1 notes and in `PRD_LIVING_KNOWLEDGE_SOURCE_INPUTS_v0.1.md` §27 (deferred "Project-Fact-Aware Bounded Composition") -- the combined related-topic output is long and repetitive, and still does not vary based on what the user actually described. Publication timing: deferred until that capability (or an equivalent PM decision) is ready, not tied to any further relationship-specific work.

## Runtime fixture

Canonical source above is hand-synced (same discipline as `GOVERNED-CLAIMS.md` ↔ `topic-claims-fixture.ts` — no live markdown parser exists anywhere in this repository) into `08_Platform/app/lib/retrieval-engine/topic-relationships-fixture.ts`. A consistency test (`__tests__/retrieval-engine/topic-relationships-fixture-consistency.test.ts`) catches drift on `relationship_id` / `source_topic` / `target_topic` / `relationship_type` / `lifecycle` / `publication_scope` / `crc_eligible` / `superseded_by` between this document and the runtime fixture.
