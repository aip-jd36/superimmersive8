# Commercial Assurance — Architecture Index

**Status:** ACTIVE — a pointer document. It tells a future agent *where to read*, not *what the design is*. It duplicates nothing; every row links to an authoritative doc.
**Scope:** CRC, Living Knowledge, the CRC → Commercial Assurance handoff (CAH-4x), the Reviewer surfaces, and the Assessment Workbook / assessment authority boundary.
**Created:** 2026-09-10, during the CAH-4F documentation-contract milestone.
**As-built basis for the "shipped" column:** `origin/main` = `9fa6d1c`.

> If you are about to do reviewer-surface or CRC-handoff engineering, read the **authority boundary** (ADR-001) and the **layering invariant** (`CRC_CURRENT_STATE.md §2`) first.

---

## 1. The three authority surfaces (do not collapse)

| Surface | Authority | Product spec | Internal design | Shipped |
|---|---|---|---|---|
| **Assessment Workbook** | reviewer's evidence evaluation + human judgment (produces evidence, gaps, findings, outcome, sign-off, report) | `08_Platform/prds/PRD_ASSESSMENT_SERVICE_v1.0.md`, `08_Platform/prds/PRD_REVIEWER_WORKBOOK_UI.md` | `06_Operations/reviewer-workbook/SI8-Reviewer-Workbook-Schema-v0.1.md`, `SI8-Reviewer-Manual-v0.2.md` | pre-CAH-4x |
| **Reviewer Living Knowledge** | governed research — `Adopted`, reviewer-scoped `TopicClaim`s + deterministic applicability; never a judgment, control result, finding, or legal conclusion | `08_Platform/prds/PRD_CAH_4F_REVIEWER_RESOURCES.md` | `08_Platform/implementation/REVIEWER_RESOURCES_ARCHITECTURE.md` | CAH-4E (`9fa6d1c`) |
| **Linked CRC Context** | customer/project context from an *educational* CRC conversation — context, not assessment evidence | `08_Platform/prds/PRD_CRC_v1.0.md` §§2,12,14 | `08_Platform/implementation/REVIEWER_RESOURCES_ARCHITECTURE.md` §1.2, §5.3 | CAH-4B / CAH-4C |

**The decision that binds them:** `08_Platform/app/lib/reviewer-lk/ADR-001-reviewer-resources-authority-boundary.md`.

## 2. Where to read about each topic

| Topic | Authoritative doc(s) | Key files |
|---|---|---|
| **CRC — product boundary & current engineering status** | `08_Platform/implementation/CRC_CURRENT_STATE.md` (rolling status), `08_Platform/prds/PRD_CRC_v1.0.md` (frozen spec), `08_Platform/implementation/CRC_IMPLEMENTATION_RISKS.md` | `lib/crc-engine/**`, `lib/interview-engine/**` |
| **Living Knowledge — governance model** | `06_Operations/institutional-knowledge/notebook/GOVERNED-CLAIMS.md` (canonical claims), `PLATFORM-RIGHTS-MATRIX.md` (tool-scoped claims), `CRC-PUBLICATION-POLICY.md`, `PRD_LIVING_NOTEBOOK.md`, `PRD_LIVING_KNOWLEDGE_SOURCE_INPUTS_v0.1.md` | `lib/retrieval-engine/topic-claims-fixture.ts`, `matrix-fixture.ts` |
| **Living Knowledge → Retrieval → Bounded Interpretation → Projection (the layering invariant)** | `08_Platform/implementation/RETRIEVAL_ENGINE_ARCHITECTURE.md`, `PROJECTION_LAYER_ARCHITECTURE.md`, `LK_PHASE1_TECHNICAL_DESIGN.md` / `_v2.md`, `CRC_CURRENT_STATE.md §2` | `lib/retrieval-engine/**`, `lib/bounded-interpretation/**`, `lib/projection-layer/**` |
| **Applicability evaluation (deterministic)** | `RETRIEVAL_ENGINE_ARCHITECTURE.md`, `THIRD_PARTY_SOURCE_ASSETS_ROUTING_ARCHITECTURE.md`, `THIRD_PARTY_SOURCE_RIGHTS_PATH_A_PROVIDER_NARROWING.md` | `lib/retrieval-engine/lookup-topic-claims.ts` (`evaluateApplicabilityDetailed`, `providerScopeMatches`, `toolScopeMatches`) |
| **CRC-active identity / canonicalization reachability** | `CRC_CURRENT_STATE.md §9`, LK-93/LK-94 notes therein | `lib/crc-engine/canonicalization-readiness.ts`, `lib/crc-engine/crc-active-reachability-backstop.ts`, `lib/interview-engine/extraction.ts` (`KNOWN_TOOLS`) |
| **CRC → Commercial Assurance linkage (customer explicitly links a CRC conversation to their submission)** | `REVIEWER_RESOURCES_ARCHITECTURE.md §1.2`; the milestone codes are CAH-3B/3D/3E/3F | `lib/crc-assurance-handoff/**` (`capabilities/email-correlation.ts`, `state-binding.ts`, `service.ts`, `repository.ts`), `crc_assurance_associations` + `crc_assurance_association_events` (migration `20260904000000`), `app/api/dashboard/submissions/[id]/crc-association/route.ts` |
| **Reviewer CRC Context (admin sees linked context separately from the workbook)** | `REVIEWER_RESOURCES_ARCHITECTURE.md §1.2, §5.3` (CAH-4B) | `lib/reviewer-context/**`, `lib/crc-project-context/**`, `app/api/admin/submissions/[id]/reviewer-crc-context/route.ts`, `ReviewerCrcContextPanel.tsx` |
| **Reviewer CRC transcript access (deliberate, scoped, audited)** | `REVIEWER_RESOURCES_ARCHITECTURE.md §1.2, §6` (CAH-4C) | `app/api/admin/submissions/[id]/reviewer-crc-context/[association_id]/transcript/route.ts`, `ReviewerTranscriptDrawer.tsx`, migration `20260909010000_reviewer_crc_context_access_events.sql` |
| **Reviewer Living Knowledge (CAH-4E) + Reviewer Resources (CAH-4F)** | `PRD_CAH_4F_REVIEWER_RESOURCES.md`, `REVIEWER_RESOURCES_ARCHITECTURE.md`, `ADR-001-reviewer-resources-authority-boundary.md` | `lib/reviewer-lk/**`, `app/api/admin/submissions/[id]/reviewer-lk/route.ts`, `ReviewerLkPanel.tsx` / `ReviewerLkLookup.tsx`, migration `20260910000000_reviewer_lk_research_access_kind.sql` |
| **Reviewer-side access audit** | `REVIEWER_RESOURCES_ARCHITECTURE.md §6` | `crc_context_access_events` (`access_kind ∈ {transcript, lk_research}`), `lib/reviewer-lk/repository.ts`, `lib/reviewer-context/repository.ts` |
| **Assessment Registry / lifecycle / provenance / publication** | `PRD_ASSESSMENT_SERVICE_v1.0.md`, `ADR-001..004` in `lib/assessments/` | `lib/assessments/**`, `assessments` + `assessment_publications` tables |
| **Workbook / assessment authority boundary vs. Reviewer Resources** | `ADR-001-reviewer-resources-authority-boundary.md`, `PRD_CAH_4F_REVIEWER_RESOURCES.md §4` | `app/admin/submissions/[id]/review/page.tsx`, `WorkbookClient.tsx`, `Section1Intake.tsx`…`Section7Brief.tsx`, `workbook-schema.ts` |
| **Customer / operational journey (end-to-end)** | `06_Operations/customer-experience/SI8-Customer-Journey-v1.0.md`, `SI8-Operational-Journey-v1.0.md` | — |

## 3. Milestone map (CAH-4x)

| Milestone | What it shipped | Status |
|---|---|---|
| CAH-4A | reviewer-context + LK consumer contract — architecture design | design only |
| CAH-4B | reviewer CRC context read path + authority firewall | shipped, in `9fa6d1c` |
| CAH-4C | reviewer CRC transcript access + fail-closed audit (`access_kind:'transcript'`) | shipped, in `9fa6d1c` |
| CAH-4D | reviewer Living Knowledge architecture inventory | design only |
| CAH-4E | Human Reviewer Living Knowledge V1 (reviewer-eligible `publication_scope` gate, `access_kind:'lk_research'`, look-up route + panel) | shipped + integrated (`9fa6d1c`); production application of `20260910000000` and the CAH-4E production smoke are asserted by the PM checkpoint |
| **CAH-4F** | **Reviewer Resources UX + LK Context Semantics** | **PRD + design + ADR authored (this milestone); not built** |
| CAH-4G | Conversational Reviewer Living Knowledge (`question → governed retrieval → BI → reviewer-oriented composition`) | future intent only — see `PRD_CAH_4F_REVIEWER_RESOURCES.md §11` |

## 4. Invariants a reviewer-surface change must not break

(Full list: `ADR-001` "What is currently enforced" + `CRC_CURRENT_STATE.md`.)

1. No downstream layer creates a stronger conclusion than Bounded Interpretation permits.
2. Reviewer LK eligibility = `lifecycle` + `publication_scope` + supersession; `crc_eligible` is decoupled.
3. Unresolved applicability ≠ negative finding ≠ withheld.
4. Explicit vs discovered relevance; Track A / B / C provenance; `provider_scope`; `applicability_requirements`; Lifecycle; CRC eligibility; supersession; evidence boundaries; fail-closed behaviour; correction semantics; structured-output reliability; bounded questioning; no fabricated legal conclusions.
5. Reviewer LK access is explicit-action only and audited **before** governed content is returned.
6. Reviewer Resources never mutate workbook / assessment state; visibility beside the workbook ≠ merged authority.
7. CRC context is context, not assessment evidence. Reviewer LK is governed research, not assessment judgment. The Human Reviewer owns evidence evaluation and the conclusion.

---

**Maintenance:** add a row when a new reviewer-surface subsystem or CAH milestone ships. Keep it a pointer — never copy design content here.
