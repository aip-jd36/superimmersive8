Title: Addendum — CPR_026 Proposed Remedy Superseded by Generic Applicability Architecture Analysis

Confirms: a narrow, specific finding from the two generic-applicability diagnostics conducted after `CPR_026_EUAI_ART50_4_AUDIOVISUAL_CRC_PUBLICATION_REVIEW_2026-09-13.md` was written, and PM's own subsequent architecture concurrence (`08_Platform/app/lib/retrieval-engine/ADR-001-generic-applicability-architecture.md`). Does not correct, revise, re-decide, or reopen any other part of `CPR_026`. Does not modify `CPR_026`'s own committed file beyond the single header pointer line this addendum's own governance action adds (see that file's own change log entry, and §5 below).

Addendum date: 2026-09-13.

Nature of this artifact: an architecture-driven remedy-supersession recording, not a substantive re-review of `CPR_026`'s own disposition. Per this folder's established "nothing inside that boundary is ever edited after the fact" discipline (`CPR_007`, `CPR_009`, `CPR_014`/`CPR_015` addendum precedent), `CPR_026`'s own verbatim body (everything between `--- BEGIN VERBATIM CRC PUBLICATION REVIEW ---` and `--- END VERBATIM CRC PUBLICATION REVIEW ---`) is left completely unedited.

--- BEGIN ADDENDUM ---

## 1. What is being confirmed

`CPR_026` recommended **WITHHOLD** for both `CLAIM-EUAI-ART50-4-AUDIOVISUAL-DEEPFAKE-DISCLOSURE-001-v1` and `REL-COMMERCIAL-USE-AI-CONTENT-TRANSPARENCY-v1`, on a narrow, non-Principle-3 ground: the claim's empty `applicability_requirements` array gives it unrestricted global retrieval reach once eligible. `CPR_026` §F/§W proposed a specific remedy — author `applicability_requirements: [{fact:'jurisdiction', operator:'equals', value:'European Union'}]` on the claim's production fixture entry. Two subsequent, read-only architecture diagnostics (conducted the same day, same worktree) examined that proposed remedy and found it **semantically unfaithful**, for a reason beyond what `CPR_026` itself identified. PM subsequently concurred with a generic architecture direction to replace it (`ADR-001-generic-applicability-architecture.md`). This addendum records that supersession.

## 2. What CPR_026's WITHHOLD finding remains — unchanged, still authoritative

`CPR_026`'s own central safety finding — that Article 50 must not become CRC-eligible while the claim's applicability gate is effectively empty, producing unrestricted global reach from a `commercial_use` goal — **remains fully correct and fully authoritative.** Nothing in this addendum weakens, narrows, or reopens that finding. `CPR_026`'s own Principle 3 analysis (§I of that review — Classification B, Principle 3 does not apply on subject-matter grounds, subject to explicit PM confirmation) is **also unaffected and unchanged** by this addendum; it remains a separate, still-open item requiring its own explicit PM confirmation, independent of everything below.

## 3. What is superseded — the proposed remedy only, not the finding

`CPR_026`'s proposed remedy — `jurisdiction == "European Union"` — is superseded. Confirmed by direct, fresh code inspection (`lib/retrieval-engine/lookup-topic-claims.ts`, `types/interview-engine.ts`): the `jurisdiction` `ApplicabilityFact` is evaluated against `AssessmentJurisdictionFacts`, populated from `AssessmentJurisdictionMention` (or a legacy `ProjectFacts.jurisdiction` fallback) — **the jurisdiction the user explicitly asked CRC to consider**, not any factual geography. It represents neither organization/actor establishment (Article 2(1)(b)) nor output-use territory (Article 2(1)(c)). Using it as `CPR_026` proposed would not merely conflate the statute's own two independently-sufficient pathways (the concern PM's own initial rejection named) — it would additionally gate on a structurally different concept than either pathway. **PM's rejection of the proposed remedy is confirmed correct, and more fully grounded than originally stated.**

## 4. What replaces it — architecture direction, not a claim-specific fix

PM concurred with a generic architecture direction, recorded in `08_Platform/app/lib/retrieval-engine/ADR-001-generic-applicability-architecture.md`:

- Living Knowledge governance distinguishes three separate kinds of geography evidence, never conflated: **assessment jurisdiction** (a request, existing `jurisdiction` fact, unchanged), **organization/actor location** (a new observational fact class, type name not yet frozen — see ADR-001 §J for the recommended candidate, `OrganizationLocationMention`), and **distribution/output-use territory** (the existing `DistributionTerritoryMention`, approved as a future applicability-capable source, its evidentiary sufficiency for Article 2(1)(c) specifically left an open, separate, future governed decision).
- A bounded, three-valued, shallow-disjunction (`any_of` of AND-groups) applicability-expression model is approved in shape only — no arbitrary recursive nesting, no `NOT` operator, no rules engine.

**No replacement Article 50 applicability configuration is approved by this addendum.** No `applicability_requirements`/`any_of` value — for the EU claim or any other — is authored, proposed-as-final, or written to any production fixture by this addendum or by `ADR-001` itself.

## 5. Relationship to CPR_026 — a minimal header pointer, verbatim body unchanged

Per `CPR_026`'s own header text ("Future amendments should be appended outside the body below, or captured in a new review artifact"), one line is added to `CPR_026`'s own header, immediately before its `--- BEGIN VERBATIM CRC PUBLICATION REVIEW ---` marker, pointing to this addendum. **Nothing inside the verbatim marker is touched.** The exact change: one new line inserted after the existing "Historical status:" line, reading:

> Addendum (2026-09-13): `CPR_026_ADDENDUM_REMEDY_SUPERSESSION_2026-09-13.md` records that this review's own §F/§W proposed remedy (`jurisdiction == "European Union"`) has been superseded by subsequent generic-applicability architecture analysis and PM concurrence (`ADR-001-generic-applicability-architecture.md`). This review's own WITHHOLD disposition and safety finding (§F/§U) remain fully authoritative and unchanged; see the addendum for the full supersession record.

## 6. Governance effect

This addendum confirms that:

- `CPR_026`'s **WITHHOLD disposition remains authoritative** for both the claim and the relationship.
- `CPR_026`'s **identified applicability-reach problem remains valid** — unchanged, unresolved.
- `CPR_026`'s **proposed remedy is superseded** — `jurisdiction == "European Union"` is confirmed not a faithful representation of either Article 2(1)(b) or 2(1)(c), and must not be implemented.
- **Article 2 applicability has NOT been resolved** by this addendum, `ADR-001`, or the diagnostics behind it.
- **Organization location does not prove legal establishment.** Recording an organization's self-reported location is, and must remain, an observational fact only.
- **Intended/stated distribution does not prove actual output use.** This remains an open, disclosed, unresolved evidentiary gap (`ADR-001` §D), not settled by approving the generic mechanism that could one day carry it.
- **No determination is made that the user is a deployer, that Article 50 applies to any project, that the claim is CRC-publishable, or that any project is commercially cleared.**
- `CLAIM-EUAI-ART50-4-AUDIOVISUAL-DEEPFAKE-DISCLOSURE-001-v1` and `REL-COMMERCIAL-USE-AI-CONTENT-TRANSPARENCY-v1` **remain `crc_eligible: Pending`.** Article 50 onboarding **remains PAUSED.**
- A future, separately-governed dormant-claim migration to a faithful applicability representation, followed by end-to-end validation and a fresh CRC Publication Review, is still required before any `crc_eligible` decision — per `ADR-001` §A.6's revised (non-atomic) sequencing.

## 7. What this addendum does not do

Does not modify `CPR_026`'s own verbatim body. Does not modify `FGR_019`, `FGR_020`, the production `TopicClaim` or `TopicRelationship` fixtures, `GOVERNED-CLAIMS.md`, `TOPIC-RELATIONSHIPS.md`, `GOAL_CATEGORIES`, `KNOWLEDGE_ONLY_TOPICS`, `geographic_relevance_scope` production values, Retrieval, Bounded Interpretation, Composition, extraction, or HRR. Does not change `crc_eligible` for either object. Does not activate Article 50. Does not authorize implementation of any part of `ADR-001`. Does not push, merge, or deploy anything.

--- END ADDENDUM ---
