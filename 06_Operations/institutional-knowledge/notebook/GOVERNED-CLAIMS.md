# Governed Claims

**Status: ACTIVE — Phase 1 skeleton, 2026-08-16.** Canonical home for atomic, non-tool-scoped governed knowledge, per SI8 Living Knowledge Expansion PRD v0.2 and the repo-grounded technical design (`08_Platform/implementation/LK_PHASE1_TECHNICAL_DESIGN.md`, `LK_PHASE1_TECHNICAL_DESIGN_v2.md`).

**This document does not replace or change the purpose of:**
- `PLATFORM-RIGHTS-MATRIX.md` — tool-scoped commercial-use claims stay there, unchanged.
- `SI8-POSITIONS.md` — settled institutional stances stay there, unchanged.
- `EDGE-CASES.md` / `PENDING-QUESTIONS.md` — unchanged.

**Its role is specifically:** governed knowledge that applies regardless of which AI tool was used — Wave 1 is U.S. Copyright & Human Authorship. A claim here has no Matrix row to attach to.

## How to read a claim

Mirrors the CRC Claims sub-table convention already used in `PLATFORM-RIGHTS-MATRIX.md`, extended with the fields non-tool-scoped knowledge needs (jurisdiction, applicability, lifecycle, version lineage). See `LK_PHASE1_TECHNICAL_DESIGN.md` §5 for the full field-by-field rationale.

**Governance discipline (non-negotiable, per PM approval 2026-08-16):**
- Existing repo research (`01_Business/research/`, `06_Operations/legal/rights-playbook/research/`) is **candidate source material only** — never automatically governed knowledge, regardless of how many documents repeat a claim or how many LLMs agreed on it.
- `Lifecycle: Adopted` requires independent primary-source re-verification, not reuse of an unverified repo citation.
- `Publication scope: CRC eligible` is a **separate decision** from Adoption — an Adopted claim may remain reviewer/internal-only indefinitely.
- No claim may reference an `Applicability requirements` fact type outside the Phase 1 implemented set (`jurisdiction`, `tool_plan_tier`) — see `08_Platform/app/lib/retrieval-engine/types.ts`'s `APPLICABILITY_FACTS` for the enforced list. Referencing a reserved/future fact type would author a claim that can never become applicable, silently.
- `CRC Approver` must always be a real, named human. No automated "legal reviewer" role exists or is permitted.

## Entry template

```markdown
### CLAIM-XXX-NNN — v1
Domain:
Topic:                          <!-- must match an existing GoalCategory value -->
Subtopic:
Claim character: established     <!-- established | conditional | unsettled -->
Jurisdiction:
Context:
Claim proposition: >

Source references:
  - primary:
Source authority/type:          <!-- Primary legal/official authority | Official platform authority | Strong secondary authority | Industry evidence | SI8 operational evidence | SI8 judgment -->
Source fact: >

SI8 interpretation: >

Applicability requirements:
  - fact: jurisdiction | tool_plan_tier
    operator: equals | not_equals
    value:
Prohibited conclusions: >

Lifecycle: Candidate            <!-- Candidate | Under Review | Adopted | Deprecated -->
Publication scope: Internal/research   <!-- Internal/research | Reviewer/Commercial Assurance | CRC eligible | Public SI8 position -->
CRC Publication Scope: >

CRC Candidate Statement: >

Effective date:
Last reviewed:
Version lineage: v1 (initial) — supersedes: none — superseded by: none
CRC Approver:
CRC Decision Date:
Related: [[POS-XXX]], [[EC-XXX]], [[PQ-XXX]]
```

## Claims

*(none yet — Phase 1 skeleton. First Wave 1 candidate claims are drafted separately and require explicit PM sign-off before adoption; see `08_Platform/implementation/LK_PHASE1_WAVE1_CANDIDATE_CLAIMS.md`.)*
