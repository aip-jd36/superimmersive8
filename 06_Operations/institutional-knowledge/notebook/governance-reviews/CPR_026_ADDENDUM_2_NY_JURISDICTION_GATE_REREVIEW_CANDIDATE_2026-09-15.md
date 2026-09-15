Title: Addendum 2 — CPR_026 Re-Review Candidate: NY Precedent Jurisdiction Gate

Confirms: the bounded fixture governance authoring performed under the
"Article 50 — Bounded Fixture Governance Authoring + CPR_026 Re-Review
Candidate" milestone (2026-09-15), following PM Architecture's concurrence
recorded in the "CPR_026 Remedy Reconsideration — NY Precedent Concurrence"
governance decision (2026-09-15, same day). Does not modify
`CPR_026_EUAI_ART50_4_AUDIOVISUAL_CRC_PUBLICATION_REVIEW_2026-09-13.md`'s own
verbatim body, nor `CPR_026_ADDENDUM_REMEDY_SUPERSESSION_2026-09-13.md`'s own
verbatim body. Does not modify `crc_eligible` for either the
`CLAIM-EUAI-ART50-4-AUDIOVISUAL-DEEPFAKE-DISCLOSURE-001-v1` TopicClaim or the
`REL-COMMERCIAL-USE-AI-CONTENT-TRANSPARENCY-v1` TopicRelationship. Does not
activate Article 50.

Addendum date: 2026-09-15.

Nature of this artifact: a **re-review candidate**, prepared for a future,
separately-authorized PM decision. It is NOT itself a CRC Publication Review
decision and does NOT record APPROVE, WITHHOLD, or any `crc_eligible` value
change. Per this folder's established discipline, `CPR_026`'s own verbatim
body remains completely unedited; this addendum only records new governance
history alongside it, per that review's own header ("Future amendments
should be appended outside the body below, or captured in a new review
artifact").

--- BEGIN ADDENDUM 2 ---

## 1. Original CPR_026 WITHHOLD

`CPR_026` (2026-09-13) recommended **WITHHOLD** for both
`CLAIM-EUAI-ART50-4-AUDIOVISUAL-DEEPFAKE-DISCLOSURE-001-v1` and
`REL-COMMERCIAL-USE-AI-CONTENT-TRANSPARENCY-v1`, on a narrow, non-Principle-3
ground (§D/§F of that review): the claim's empty `applicability_requirements`
array gave it unrestricted global retrieval reach once eligible — surfacing
for every `commercial_use` conversation worldwide, regardless of stated
jurisdiction. **This finding remains fully authoritative — nothing below
reopens or weakens it.**

## 2. Original jurisdiction remedy

`CPR_026` §F/§W proposed: author `applicability_requirements:
[{fact:'jurisdiction', operator:'equals', value:'European Union'}]` on the
claim's production fixture entry.

## 3. Supersession — jurisdiction cannot represent Article 2 evidence

`CPR_026_ADDENDUM_REMEDY_SUPERSESSION_2026-09-13.md` found this proposed
remedy **semantically unfaithful**: `jurisdiction`/`AssessmentJurisdictionMention`
represents "the jurisdiction the user asked CRC to consider" — not
organization/actor establishment (Article 2(1)(b)), not distribution/output-use
territory (Article 2(1)(c)). Using it to represent the statute's own
substantive territorial test would conflate two independently-sufficient
statutory conditions into one structurally different concept. **This finding
also remains fully authoritative and unchanged.**

## 4. NY precedent discovery

A subsequent diagnostic ("NY Performer Law vs Article 50 — Jurisdictional
Relevance Precedent Diagnostic," 2026-09-15) found that
`CLAIM-NY-SYNTHETIC-PERFORMER-DISCLOSURE-001-v1` (`CPR_025`, approved
2026-09-10) already uses the structurally identical mechanism —
`applicability_requirements: [{fact:'jurisdiction', operator:'equals',
value:'New York'}]` — not as evidence that NY GBL § 396-b legally applies,
but purely as an eligibility/relevance gate. `CPR_025` §H states this
explicitly, and its own canary (§V, tests 3 & 6) empirically proved Bounded
Interpretation never exceeds `relevant_applicability_unresolved` for this
claim, because `union_establishment_or_output_use`-shaped
`unresolved_project_dependencies` (NY carries four such dependencies)
structurally force the hedge regardless of the jurisdiction gate's own
status.

## 5. PM concurrence — jurisdiction as assessment-scope eligibility, not applicability evidence

A follow-on governance decision ("CPR_026 Remedy Reconsideration — NY
Precedent Concurrence," 2026-09-15) found that `CPR_026`'s own supersession
(§3 above) rejected using `jurisdiction` **as a proxy for the Article 2
substantive test** — it never addressed, and does not foreclose, using the
identical field **purely as an assessment-scope eligibility gate**, with the
substantive test held entirely separately. PM Architecture concurred:
`AssessmentJurisdictionMention == European Union` may gate WHICH governed
knowledge is eligible/relevant to discuss; it must never be read as
establishing that Article 2(1)(b)/(c) territorial applicability is
satisfied.

## 6. Article 2 remains unresolved, separately

Unchanged by this addendum or the fixture edit it accompanies:
`union_establishment_or_output_use` remains, permanently, the sole
representation of Article 2(1)(b)/(c)'s own substantive establishment/
output-use test — an `unresolved_project_dependency`, Type D, no structured
fact type exists for it, never resolved by CRC self-report (per the
"Generic Applicability — Evidence Authority Boundary" diagnostic, 2026-09-15,
which independently found neither `OrganizationLocationMention` nor
`DistributionTerritoryMention` can safely settle this test in either
direction — MET or NOT_MET — from conversational self-report).

## 7. Exact fixture change

On `CLAIM-EUAI-ART50-4-AUDIOVISUAL-DEEPFAKE-DISCLOSURE-001-v1`
(`08_Platform/app/lib/retrieval-engine/topic-claims-fixture.ts`), performed by
the "Bounded Fixture Governance Authoring" milestone (2026-09-15):

- `applicability_requirements: []` → `applicability_requirements:
  [{fact:'jurisdiction', operator:'equals', value:'European Union'}]`.
- `crc_publication_scope: null` and `crc_candidate_statement: null` →
  authored (see §8 below). `crc_eligible` **unchanged, still `'Pending'`**.
  No other field touched. `applicability_any_of` not added. No new
  `ApplicabilityFact`. No evaluator change. `DistributionTerritoryMention`/
  `OrganizationLocationMention` not consumed. `union_establishment_or_output_use`
  and the other three `unresolved_project_dependencies` unchanged.
  `geographic_relevance_scope` remains absent.

## 8. Bounded wording

`crc_candidate_statement` is `FGR_019` §2's clause-by-clause corrected
wording, verbatim, unchanged in substance. `crc_publication_scope` follows
`CPR_026` §J's own draft, strengthened with the explicit "even merely
mentioning" disclaimer `CPR_025` already uses for NY (the terminology-clarity
finding from the concurrence decision, §5 above) — CRC must not state or
imply Article 50 applies, or that the user is the statutory deployer, or that
Article 2(1)(b)/(c) is satisfied, "for any reason, including the user merely
selecting, stating, or mentioning the European Union." See the fixture
entry's own field values for the full text.

## 9. Empirical retrieval canaries

Proven through the real, unmodified `retrieve()` pipeline, against isolated
synthetic clones (`crc_eligible` overridden to `'Yes'` on `structuredClone`d
copies only — production fixtures never mutated, confirmed by a dedicated
canary test) in
`__tests__/retrieval-engine/euai-art50-4-topicrelationship.test.ts`'s new
"jurisdiction-gate canary" describe block:

- Assessment jurisdiction = European Union → claim retrieved.
- Assessment jurisdiction = New York → excluded.
- Assessment jurisdiction = California → excluded.
- Assessment jurisdiction absent/unresolved → excluded (fail-closed, never
  guessed).
- Generic `commercial_use` conversation with no EU jurisdiction stated →
  excluded (CPR_026's own global-reach problem, resolved for this bounded
  scope).

## 10. Empirical BI ceiling

The same canary proves, through the real `buildBoundedInterpretations`
pipeline: with the jurisdiction gate MET (EU), the resulting
`BoundedInterpretation.status` is `relevant_applicability_unresolved` —
**never** `directly_relevant` — because
`union_establishment_or_output_use`'s continued presence in
`unresolved_project_dependencies` structurally forces the hedge
(`needsApplicabilityHedge` in `build-bounded-interpretation.ts`),
independently of the jurisdiction gate's own status. This mirrors, and is
empirically validated the same way as, `CPR_025` §V's own canary for NY.

## 11. Global-reach problem — resolved, for this bounded scope

`CPR_026`'s own central finding (unrestricted worldwide reach from an empty
`applicability_requirements` array) is resolved: the claim is now retrievable
only when the user has stated the European Union as the assessment
jurisdiction. Known, disclosed, accepted trade-off (unchanged from prior
diagnostics): this gate is under-inclusive, not over-inclusive — a project
with genuine EU relevance via establishment or output-use but no stated EU
assessment jurisdiction will not surface this claim. `JURISDICTION_VALUE_ALIASES`
has zero EU-related entries today, so a literal "European Union" statement is
required; a user saying "France" or "Germany" will not currently match. This
mirrors the same accepted trade-off already governing NY's own alias gap and
is not treated as a publication blocker (per `ADR-001` §Y: a narrower-firing
gate is a strict safety improvement over none at all).

## 12. Principle 3 — still requires explicit PM decision

`CPR_026` §I found Principle 3 does not apply to this claim (Classification
B — a disclosure-mandate proposition, not an act that itself produces or
facilitates deception) but flagged this as the single most novel and
consequential judgment in that review, requiring its own **explicit PM
confirmation**, with a named fallback: if PM disagrees, the correct
disposition is a straight WITHHOLD under Principle 3 (Principle 5's
narrow-before-withhold discipline does not apply to Principle 3 concerns).
**This remains open. Nothing in this milestone or this addendum resolves it,
implicitly or otherwise.**

## 13. Article 50 remains Pending and PAUSED

`CLAIM-EUAI-ART50-4-AUDIOVISUAL-DEEPFAKE-DISCLOSURE-001-v1`:
`crc_eligible: Pending` (unchanged). `REL-COMMERCIAL-USE-AI-CONTENT-TRANSPARENCY-v1`:
`crc_eligible: Pending` (unchanged). Article 50 onboarding remains PAUSED.
The double gate (`lifecycle === 'Adopted' && crc_eligible === 'Yes'`) means
neither the new fixture data nor the new wording can reach a real CRC user
until a separate, explicit, future PM decision changes `crc_eligible` — this
addendum does not make or imply that decision.

## 14. What this milestone authorizes for the future — and what it does not

This addendum, and the fixture/test changes it accompanies, prepare the
evidence a future CPR_026 re-review would need: the exact fixture edit (§7),
the bounded wording (§8), the empirical retrieval canaries (§9), and the
empirical BI ceiling proof (§10). They do **not** authorize: a `crc_eligible`
change for either object; Article 50 activation; a Principle 3 decision (§12,
still open); or a push/merge/deploy of any kind. A future, separately
authorized CPR_026 re-review (or a formal addendum recording its own
disposition) would need to: (1) re-confirm this fixture edit and wording
against the real production state at that time; (2) obtain the still-missing
explicit Principle 3 PM confirmation (§12); (3) record whatever `crc_eligible`
disposition follows from both.

--- END ADDENDUM 2 ---
