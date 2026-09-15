Title: Addendum 3 — CPR_026 Final Disposition: Principle 3 PM Concurrence + Final Re-Review

Confirms: the "Article 50 — Principle 3 PM Concurrence Recording + Final
CPR_026 Re-Review" milestone (2026-09-15), building on the "Article 50 —
Bounded Fixture Governance Authoring + CPR_026 Re-Review Candidate"
milestone (same day, local commit `908f1d33100407fdcac24a361168a7455d88de0d`)
and the "Article 50 — Principle 3 PM Decision Dossier" diagnostic (same day)
that preceded it. Does not modify `CPR_026`'s own verbatim body, nor
`CPR_026_ADDENDUM_REMEDY_SUPERSESSION_2026-09-13.md`'s or
`CPR_026_ADDENDUM_2_NY_JURISDICTION_GATE_REREVIEW_CANDIDATE_2026-09-15.md`'s
own bodies.

Addendum date: 2026-09-15.

Nature of this artifact: **this addendum records CPR_026's final
disposition** — the first of the four CPR_026 artifacts to record an
eligibility outcome rather than a superseded remedy or a re-review
candidate. `CPR_026`'s own verbatim body remains untouched per this folder's
established discipline; this addendum is the governance record of record for
why `crc_eligible` moved to `Yes`.

--- BEGIN ADDENDUM 3 ---

## 1. PM Principle 3 decision

**PM CONCURS** that the governed Article 50(4) audiovisual deep-fake
disclosure proposition falls outside `CRC-PUBLICATION-POLICY.md`'s Principle
3 sensitivity gate.

Recorded verbatim, as supplied:

> The proposition is disclosure / anti-deception guidance. It does not:
> characterize a specific project's content as a deep fake; characterize a
> specific real person's synthetic depiction; teach creation or improvement
> of deceptive synthetic media; teach concealment of synthetic provenance;
> teach defeat of detection; teach avoidance or circumvention of disclosure;
> establish a project-specific exemption; facilitate deceptive synthetic
> media capability. The fact that the underlying statutory definition can
> reach real-person-resembling content is not, by itself, sufficient to
> place this specific governed proposition inside Principle 3. The governing
> distinction is what publication of the proposition itself produces or
> facilitates.

**This concurrence is proposition-specific.** It is NOT a blanket approval
for: deepfake-related Living Knowledge generally; likeness-related Living
Knowledge generally; other, not-yet-drafted Article 50 propositions;
exemption guidance; project-specific deepfake characterization; or evasion/
circumvention guidance. Future propositions in any of these categories must
undergo their own independent Publication Policy review — this decision
creates no presumption for them.

## 2. Decision sequence preserved (not rewritten to appear earlier)

1. `CPR_026` (2026-09-13): WITHHOLD, narrow non-Principle-3 reach ground
   (§D/§F) — the claim's empty `applicability_requirements` gave it
   unrestricted global reach. Principle 3 independently found not to apply
   (§I, Classification B) but explicitly reserved for separate PM
   confirmation, with a named fallback (straight WITHHOLD if PM disagreed).
2. `CPR_026_ADDENDUM_REMEDY_SUPERSESSION_2026-09-13.md`: the original
   `jurisdiction == "European Union"` remedy superseded — semantically
   unfaithful as Article 2 applicability evidence. Generic-applicability
   architecture direction (`ADR-001`) concurred as the eventual replacement
   path; no claim-specific fix authored.
3. `CPR_026_ADDENDUM_2_NY_JURISDICTION_GATE_REREVIEW_CANDIDATE_2026-09-15.md`:
   the NY Performer Law precedent (`CLAIM-NY-SYNTHETIC-PERFORMER-DISCLOSURE-001-v1`,
   `CPR_025`) found and concurred as transferable — the identical
   `jurisdiction equals <value>` mechanism is safe when used purely as an
   assessment-scope eligibility/relevance gate, never as Article 2
   applicability evidence, with the substantive test held separately,
   permanently unresolved. A bounded fixture candidate was authored and
   locally committed (`908f1d3`), not yet integrated. Principle 3 was
   explicitly NOT resolved by that milestone.
4. "Article 50 — Principle 3 PM Decision Dossier" (2026-09-15, same day): a
   dedicated, read-only evidence dossier — Principle 3's authoritative
   definition, CPR_026's own reasoning, a capability/misuse analysis, the
   closest precedents (`CPR_008` WITHHELD, `CPR_025` APPROVED), both PM
   decision paths stated neutrally, and one precise yes/no question —
   assembled without deciding the question itself.
5. **This milestone**: PM decision received (§1 above); final CPR_026
   re-review performed against the exact staged wording (§3 below);
   `crc_eligible` recorded `Yes` on both the claim and the relationship,
   together.

## 3. Final re-review — all seven Publication Policy principles

Re-evaluated independently against the exact wording now staged in
`topic-claims-fixture.ts` (not assumed unchanged from CPR_026's own review of
an earlier, empty-`applicability_requirements` draft):

1. **Verified is necessary, not sufficient.** Satisfied — this is a second,
   independent judgment made specifically about this claim (`FGR_019`'s
   Adoption-stage judgment, `CPR_026`'s own Publication-stage judgment, and
   this addendum's final judgment are three distinct acts, not one inherited
   from the last).
2. **Preserve meaning, don't just minimize caveats.** Satisfied. The
   candidate statement is `FGR_019` §2's corrected wording, restored to true
   verbatim by this same milestone (see §4 below — a wording-fidelity defect
   found and fixed during this re-review, not present in the final staged
   text). Every caveat in the publication scope is load-bearing: each maps
   to a specific unresolved dependency or reach limitation, not
   caveat-for-its-own-sake.
3. **Subject sensitivity outweighs confidence in the fact.** Resolved — see
   §1. PM concurrence recorded, with the explicit proposition-specific
   scope named in that same section.
4. **Scope narrowly rather than withhold entirely.** Satisfied — the claim
   is scoped to the European Union assessment jurisdiction only, a bounded
   scope honestly disclosed in the publication wording, not an overreach.
5. **When uncertain, narrow before withholding.** Satisfied — no remaining
   ordinary (non-Principle-3) doubt exists; Principle 3's own doubt was
   resolved by concurrence (§1), not by narrowing (correctly — Principle 5's
   own exception forbids narrowing as a Principle 3 resolution mechanism,
   and none was attempted here).
6. **Stability over novelty.** Not applicable — this principle's own text
   frames it around a *platform's own ToS change*; Article 50 is enacted
   statutory law (Regulation (EU) 2024/1689), independently re-confirmed
   unamended by the Digital Omnibus (`FGR_019` §3), not a recently-changed
   platform term. No freshness concern identified, matching this corpus's
   own precedent for statutory (as opposed to platform-ToS) claims.
7. **CRC eligibility and Canonicalization Readiness are independent
   judgments.** Not applicable — this claim carries `provider_scope: null`,
   `tool_scope: null` (statutory, deployer-scoped, not attached to any
   canonical tool/provider identity); no canonicalization question exists
   for it to be independent of.

**All seven principles clear. No blocker remains under ordinary Publication
Policy review.**

## 4. Wording-fidelity correction found during this re-review

Phase 4's own governed-proposition-integrity check (re-confirming, not
assuming, that the staged wording faithfully mirrors `FGR_019` §2) found
that the `crc_candidate_statement` text staged by the prior "Bounded Fixture
Governance Authoring" milestone had lightly restructured the opening clause
("The EU AI Act (Regulation (EU) 2024/1689)... requires a deployer... to
disclose" rather than "Under Article 50(4)... of Regulation (EU)
2024/1689... a deployer... must disclose") — substance-preserving, no
strengthening, but not actually byte-identical to `FGR_019` §2 despite that
milestone's own comment claiming "verbatim." **Corrected in this same
milestone** — the production field now reads `FGR_019` §2's true corrected
text, matching `GOVERNED-CLAIMS.md`'s own "Claim proposition" field exactly.
This is disclosed, not silently fixed, per this diagnostic chain's own
established practice of flagging findings rather than glossing over them.

## 5. Jurisdiction gate — final confirmation

`applicability_requirements: [{fact:'jurisdiction', operator:'equals',
value:'European Union'}]`, unchanged from the prior milestone's own staging.
Re-confirmed via the existing jurisdiction-gate canary
(`euai-art50-4-topicrelationship.test.ts`): EU → retrieved; New York,
California, absent jurisdiction, and a generic non-EU `commercial_use`
conversation → excluded. Meaning re-confirmed: assessment-scope eligibility/
relevance only, never Article 2 territorial-applicability evidence.

## 6. Article 2 / Bounded Interpretation — final confirmation

`union_establishment_or_output_use` unchanged, present, permanently
unresolved. Re-confirmed via the same canary, through the real
`retrieve()`/`buildBoundedInterpretations()` pipeline: with the jurisdiction
gate MET, the resulting status is `relevant_applicability_unresolved` —
never `directly_relevant` — because the dependency's continued presence
structurally forces the hedge (`needsApplicabilityHedge`) independently of
the gate's own status. This is now the claim's real, live behavior, not a
synthetic-only canary result — `crc_eligible: 'Yes'` means this is exactly
what a real CRC user or Reviewer would now see.

## 7. Stock Governance / askability — final confirmation

`deployer_status_confirmed`, `content_constitutes_deep_fake`,
`artistic_creative_satirical_fictional_analogous_work`, and
`union_establishment_or_output_use` remain, unchanged, unresolved and
non-askable — `dependency-askability.ts`'s registry has zero entries for any
of the four, confirmed directly, unaffected by this milestone. No
self-attestation question exists or becomes eligible for deployer/legal
role, project-specific deep-fake characterization, Article 2 establishment/
output-use, or exemption applicability.

## 8. Architecture non-regression — final confirmation

No change to: `ApplicabilityFact` enum, the generic applicability evaluator,
`applicability_any_of` semantics, Retrieval architecture, Track A, Track B,
Track C, `UserGoal`, provenance stamping, Bounded Interpretation
implementation, Composition implementation, `DistributionTerritoryMention`,
`OrganizationLocationMention`, extraction, correction semantics, or
`provider_scope` semantics. This remains governed-data publication (fixture
field values, governance-record text) plus focused tests — never
architecture work.

## 9. Eligibility decision — both objects, together

Per `CPR_026` §N's own "approved together, never staggered" sequencing
(neither object's eligibility alone ever produces retrievable content or
independent risk — matrix rows 1–2 of that review's own double-publication
table): both
`CLAIM-EUAI-ART50-4-AUDIOVISUAL-DEEPFAKE-DISCLOSURE-001-v1` and
`REL-COMMERCIAL-USE-AI-CONTENT-TRANSPARENCY-v1` move `crc_eligible: Pending
→ Yes`, together, in this milestone. `Lifecycle: Adopted` unchanged on both.

## 10. What this addendum does not do

Does not modify `CPR_026`'s, the first addendum's, or the second addendum's
own verbatim/historical bodies. Does not activate any new architecture
capability. Does not approve any future Article 50 proposition beyond the
one governed statement already staged. Does not extend Principle 3
non-applicability to any other deepfake- or likeness-topic claim. Does not
authorize a push, merge, or deploy — that remains a separate, later,
explicitly-authorized integration decision.

--- END ADDENDUM 3 ---
