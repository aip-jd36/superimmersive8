# Formal Governance Review #18 — CAND-NY-SYNTHETIC-PERFORMER-DISCLOSURE-001

**Status: ADOPTED (2026-09-10, subsequent to this file's original creation).** PM/JD explicitly concurred with this review's recommendation ("YES — CONCUR. ADOPT WITH BOUNDED WORDING") in a separate, later, explicitly authorized governance-recording task, using §15's exact governed proposition verbatim (no paraphrase, simplification, or reconstruction). The claim is now recorded in `GOVERNED-CLAIMS.md` as `CLAIM-NY-SYNTHETIC-PERFORMER-DISCLOSURE-001-v1` (Wave 8), `Lifecycle: Adopted`, `Adoption Approver: JD (PM)`, `Adoption Decision Date: 2026-09-10`. `CRC Eligible` remains `Pending` — this Adoption is a Living Knowledge governance decision only, not a CRC Publication decision; no CRC Publication Review has been conducted. The verbatim review body below (§§1–21) is unmodified — only this status line was updated, per established precedent (see `FGR_008`'s own equivalent adoption-status update).

## 1. Basis

Follows the "NY GBL § 396-b Primary-Source Evidence Capture" milestone (commit `de4e93dded0c734f3e0654dd2f77c0b17a1ab38b`), which closed the Class A evidence-tier gap identified by the preceding bounded research pass. This review re-opens and re-verifies that primary evidence directly (not merely trusting the prior summary), re-checks single-authority/duplication, re-derives the candidate proposition, and evaluates it against the existing generic Living Knowledge architecture. This is a governance-candidate formation review only — it does not adopt, does not perform CRC Publication Review, and does not touch `crc_eligible`.

## 2. Primary evidence re-verification (direct, this review)

Re-read directly from the raw captured HTML (not from `MANIFEST.md`'s quotes alone):
- `evidence-captures/ny-general-business-law/ny-gbs-396-b_20260910T093133Z.html` — full § 396-b text (subdivisions 1–8) re-extracted and re-confirmed verbatim against `MANIFEST.md`.
- `evidence-captures/ny-general-business-law/ny-s8420a-bill-status_20260910T093133Z.html` — action-history table ("Dec 11, 2025 signed chap.617") and sponsor memo ("EFFECTIVE DATE: This act shall take effect 180 days after it becomes law.") re-confirmed verbatim.
- Searched the full raw statutory text for "provider," "vendor," "developer," "tool," "software company" — the only match is subdivision 6's "information content provider" (a Section 230 cross-reference), confirming again that no subdivision anywhere expressly exempts AI tool providers/vendors.

Both SHA-256 checksums reproduced and matched exactly against `MANIFEST.md`. No discrepancy found between this fresh re-verification and the prior evidence-capture milestone. Enactment (2025-12-11) + 180 days independently recomputed = 2026-06-09, confirmed operative as of 2026-09-10 (today).

## 3. Single-authority / duplication check

Searched `GOVERNED-CLAIMS.md`, `PLATFORM-RIGHTS-MATRIX.md`, `08_Platform/app/lib/candidates/`, `matrix-fixture.ts`, `topic-claims-fixture.ts`, and `governance-reviews/` for "396-b," "396b," "S.8420," "synthetic performer." Zero hits in any governance-authority file (hits exist only in unrelated business/marketing/research documents, none of which constitute governed LK authority). No candidate, FGR, CPR, or `crc_eligible` state exists for this proposition prior to this review.

## 4. Distinctness from CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1

| | CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1 | This candidate |
|---|---|---|
| Statutory authority | NY Civil Rights Law §§ 50–51 | NY General Business Law § 396-b |
| Subject | A real, identifiable, living person's name/portrait/picture/likeness/voice | A synthetic performer — "not recognizable as any identifiable natural performer" |
| Regulated conduct | Use of a real person's identity for advertising/trade without consent | Failure to disclose a synthetic performer's presence in a commercial advertisement |
| Duty-holder | Any person/firm/corporation using the likeness | A person engaged in business who, for commercial purpose, produces/creates the advertisement |
| Required action | Obtain prior written consent | Conspicuously disclose the synthetic performer's presence, where actual knowledge exists |
| Remedies | Civil action (injunction, damages, exemplary damages); § 50 misdemeanor | Civil penalty only ($1,000 / $5,000) |
| Dependencies | `recognizable_likeness_or_voice_present`, `advertising_or_trade_use_confirmed`, `written_consent_confirmed` | `advertiser_or_duty_holder_status_confirmed`, `synthetic_performer_present_confirmed`, `actual_knowledge_confirmed`, `expressive_work_exemption_applies` |

§ 396-b's own subdivision 5 expressly cross-references CVR §§ 50/50-f/51, stating this section "shall not limit, reduce, or enlarge" rights under those sections — the legislature itself confirms these are complementary, non-overlapping authorities, not competing or duplicative treatments of the same conduct (one governs a real person's identity; the other governs an AI-generated performer that is, by definition, not recognizable as any identifiable natural performer).

**Classification: A — DISTINCT / COMPLEMENTARY.**

## 5. Exact FGR question under review

"Should SI8 adopt a governed Living Knowledge proposition stating that NY General Business Law § 396-b imposes a conspicuous-disclosure duty on certain commercial advertisement producers/creators who have actual knowledge that an advertisement contains a statutory synthetic performer, subject to the statute's defined exemptions and penalties, while leaving project-specific legal applicability unresolved?"

Not: "Does NY law require AI disclosure?" Not: "Is this user's project compliant?"

## 6. Actor-boundary review (hard gate)

The prior evidence-capture milestone flagged that "AI tool providers are explicitly exempt" overstated the evidence. This review confirms via direct re-verification (§2) that no subdivision expressly exempts AI tool providers — the express exemption (subdivision 8) applies only to media/platforms that merely publish or disseminate an advertisement. AI tool providers are simply outside the class subdivision 3 describes ("a person ... who ... produces or creates an advertisement"), which is a scope observation, not a stated carve-out. The candidate proposition below (§9) preserves this distinction explicitly and does not use the word "producer" in a way that could be read to sweep in a broader class than the statute's own language. Whether a specific CRC user (e.g., an agency, brand, or individual creator) falls within the duty-holder class is preserved as an unresolved project-specific legal question, never asserted.

## 7. Jurisdiction boundary

The captured statutory text provides no bright-line territorial trigger (unlike, e.g., a "within this state" clause elsewhere in the same section's subdivision 2). The candidate therefore states `Jurisdiction: New York` (the statute's own enacting jurisdiction) while separately and explicitly preserving "whether § 396-b applies to this particular project/advertisement" as an unresolved legal question. No `distribution_state` or other invented applicability fact is introduced.

## 8. Applicability requirements — re-evaluated fresh, correction from prior research pass

The preceding evidence-capture milestone's own (non-binding, research-stage) note suggested `applicability_requirements: []`. **This review does not inherit that and finds it incorrect on inspection of the sibling claim's actual committed state.** `CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1` (re-read directly from `GOVERNED-CLAIMS.md`, lines 2394–2397) in fact carries:
```
Applicability requirements:
  - fact: jurisdiction
    operator: equals
    value: New York
```
`jurisdiction` is a first-class, already-implemented `ApplicabilityFact` (`lib/retrieval-engine/lookup-topic-claims.ts`), evaluated fail-closed (`met`/`not_met`/`unresolved`, never guessed from silence), and `jurisdiction-clarification.ts` already knows to ask about jurisdiction exactly when an active confirmed goal maps to a claim carrying this requirement. Since § 396-b is unambiguously New-York-specific statutory authority (same as the sibling claim's CVR §§ 50–51), using the same existing mechanism is not inventing new applicability semantics — it is applying the established, precedent-consistent gate correctly. Leaving the array empty would make this claim's NY-specific guidance surface to a user regardless of stated jurisdiction, which is both inconsistent with the sibling claim and less safe.

**Decision: B — jurisdiction applicability requirement, mirroring the sibling claim exactly.**
```
Applicability requirements:
  - fact: jurisdiction
    operator: equals
    value: New York
```

## 9. Dependency-by-dependency classification

| Dependency | Classification | Rationale |
|---|---|---|
| `advertiser_or_duty_holder_status_confirmed` | C — legal-characterization fact, evidence-only | Whether a project's advertisement producer/creator falls within § 396-b's specific duty-holder class is a legal conclusion, not a simple project fact. |
| `synthetic_performer_present_confirmed` | A — evidence-only dependency | Whether the depicted figure meets the full statutory definition (digitally created, generative-AI/algorithm-made, intended to create the impression of a performance, not recognizable as any identifiable natural performer) is a compound fact with an observable component (an AI-generated human-like figure appears) and a legal-definitional component (satisfies the statute's precise test) — modeled as evidence-only, mirroring `recognizable_likeness_or_voice_present`'s treatment on the sibling claim. |
| `actual_knowledge_confirmed` | C — legal-characterization fact, evidence-only | A state-of-mind element the statute conditions the entire duty on; per established precedent (`written_consent_confirmed`), CRC must never treat a conversational assertion as establishing this fact. |
| `expressive_work_exemption_applies` | C — legal-characterization fact, evidence-only | A two-part conditional legal test (advertisement is for an expressive work AND the synthetic performer's use is consistent with its use in that work) — too interpretive for self-attestation, mirroring `advertising_or_trade_use_confirmed`'s established treatment. |

None of the sibling claim's own three dependency names map onto these four — they concern a different statute's elements — so no reuse/collapsing is appropriate (not E). None should be dropped (not D); each maps to a distinct load-bearing statutory element.

## 10. Question-askability boundary (classification only — no questioning change authorized or made)

- OBSERVABLE (potentially safely askable under existing bounded-questioning policy, not decided here): "Does the advertisement contain an AI-generated, human-like performer?" / "Are you the one producing or creating this advertisement for a commercial purpose?"
- LEGAL CHARACTERIZATION (must not be posed as self-certification): "Does that figure satisfy the statutory definition of synthetic performer (not recognizable as any identifiable natural performer)?" / "Did you have actual knowledge the ad contains a synthetic performer?" / "Does the expressive-work exemption apply to this advertisement?" / "Are you within the statutory duty-holder class?"

## 11. GoalCategory / topic-routing decision

`GOAL_CATEGORIES` is a closed set: `commercial_use`, `copyright_ownership`, `copyrightability`, `likeness`, `third_party_source_rights`, `unknown` (`types/interview-engine.ts`). Retrieval topic-matching is exact (`topic === category`, `lookup-topic-claims.ts`) — a claim is only reachable when a UserGoal's classified category exactly equals its `topic`. None of `commercial_use`, `copyright_ownership`, `copyrightability`, or `third_party_source_rights` fit. `likeness` is imperfect — the sibling NY claim's `likeness` topic concerns a real, identifiable person, while this proposition concerns a performer defined by *not* being identifiable — but it remains the closest existing routing bucket in the same "person-in-video" domain family, and is far more likely to be the model's own classification of a user's actual question ("do I need to disclose my AI spokesperson?") than `unknown`, which would make the claim permanently unreachable regardless of user intent. `unknown` is safer in the abstract but defeats the purpose of governing this knowledge for CRC at all.

**Decision: A — `likeness` is an acceptable existing routing category, with the same taxonomy-pressure observation already on record from the prior research pass (non-blocking).** Not D — the existing taxonomy can route this proposition, just imperfectly by name.

## 12. Claim character

**Decision: `established`.** The statute's text and current operative status are settled statutory fact (same treatment as the sibling claim, which is `established` despite equally significant unresolved project-specific dependencies) — project applicability being conditional/unresolved is captured by `applicability_requirements` and `unresolved_project_dependencies`, not by `claim_character`.

## 13. Temporal status

Signed 2025-12-11 (Chapter 617 of the Laws of 2025); effective 2026-06-09 (180 days after signing, independently computed and confirmed against the primary sponsor memo); confirmed operative as of 2026-09-10. No fresh evidence contradicts operativeness. `not_before` remains deliberately unimplemented (per the separately-deferred Temporal Governance diagnostic) — not reopened by this review.

## 14. Source fact / governed proposition / prohibited project conclusion

| SOURCE FACT (statute's own text) | GOVERNED PROPOSITION (what SI8 proposes to adopt) | PROJECT CONCLUSION CRC MUST NOT MAKE |
|---|---|---|
| § 396-b(3): duty-holder is "any person engaged in the business of dealing in any property or service who for any commercial purpose produces or creates an advertisement" | SI8 states this duty-holder class exists and its statutory language | That this CRC user is (or is not) within that class |
| § 396-b(3): duty triggers "where such person has actual knowledge" | SI8 states actual knowledge is a statutory condition | That actual knowledge does or does not exist for this project |
| § 396-b(1)(c): synthetic performer definition | SI8 states the statutory definition verbatim | That a specific depicted figure does or does not meet that definition |
| § 396-b(4): expressive-work exemption, conditional | SI8 states the exemption and its condition | That the exemption does or does not apply to this project |
| § 396-b(8): express platform/medium exemption | SI8 states this exemption verbatim | That the exemption extends beyond publishing/disseminating conduct |
| § 396-b: silent on AI tool providers | SI8 states AI tool providers are not named among duty-holders and are not the subject of any express exemption | That AI tool providers are (or are not) legally exempt |
| § 396-b: no express territorial trigger | SI8 states `Jurisdiction: New York` (enacting jurisdiction) | That § 396-b does or does not apply outside New York, or that it does apply to this project |
| § 396-b(3): $1,000/$5,000 civil penalties | SI8 states the penalty structure | That any penalty has attached or will attach to this project |

## 15. Candidate governed proposition (exact)

> Under New York General Business Law § 396-b, a person engaged in the business of dealing in property or a service who, for any commercial purpose, produces or creates an advertisement respecting that property or service must conspicuously disclose within the advertisement that a synthetic performer is in the advertisement, where that person has actual knowledge of the synthetic performer's presence. "Synthetic performer" means a digitally created asset, made using generative artificial intelligence or a software algorithm, intended to create the impression that the asset is engaging in an audiovisual and/or visual performance of a human performer who is not recognizable as any identifiable natural performer. This duty does not apply to: (a) advertisements or promotional materials for expressive works (including motion pictures, television programs, streaming content, documentaries, video games, and similar audiovisual works), provided the synthetic performer's use in the advertisement or promotional material is consistent with its use in the expressive work; (b) audio-only advertisements; or (c) advertisements where the use of artificial intelligence is solely for language translation of a human performer. A violation carries a civil penalty of $1,000 for a first violation and $5,000 for any subsequent violation. Media and platforms that merely publish or disseminate a non-compliant advertisement (including, without limitation, newspapers, magazines, television networks and stations, streaming services, cable television systems, billboards, and transit advertisements) are expressly exempted from this section. AI tool providers are not named among the statute's described duty-holders and are not the subject of any express exemption; their position outside the duty-holder class is a matter of statutory scope, not a stated carve-out. This section expressly preserves (neither limits nor enlarges) rights under NY Civil Rights Law §§ 50, 50-f, and 51, and expressly preserves (neither limits nor enlarges) federal 47 U.S.C. § 230 protections. Whether a specific project's advertisement producer/creator falls within the statutory duty-holder class, whether specific advertisement content meets the statutory synthetic-performer definition, whether actual knowledge exists, and whether any exemption applies are unresolved, project-specific legal questions this proposition does not answer.

**SI8 interpretation:**
> A commercial AI-video advertisement that includes a synthetic (non-identifiable, AI-generated) performer should not be represented to a client, buyer, or platform as ready for commercial use in New York without first confirming (a) whether the advertisement's producer/creator falls within the statutory duty-holder class, (b) whether the depicted figure meets the statutory synthetic-performer definition, (c) whether actual knowledge existed, and (d) whether the conspicuous-disclosure duty was met or an exemption applies — these are documentary/legal facts CRC cannot establish from conversation alone.

## 16. Prohibited conclusions

Does not establish, and CRC/SI8 must never state or imply:
- That this project violates § 396-b.
- That this project complies with § 396-b.
- That § 396-b applies outside New York.
- That every AI-generated person in a video is a "synthetic performer" as statutorily defined.
- That a real, identifiable person's digital replica/likeness is governed by this proposition (it is not — see § 4 distinctness analysis; that subject is governed by `CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1`).
- That the CRC user is necessarily the statutory duty-holder.
- That actual knowledge exists.
- That any exemption (expressive-work, audio-only, translation-only, or platform/medium) does or does not apply to a specific project.
- That New York jurisdiction attaches to a specific project.
- That AI tool providers are expressly exempt.
- That the platform/medium exemption extends beyond its statutory wording (mere publication/dissemination).
- That compliance with the disclosure duty establishes commercial clearance generally.
- That compliance establishes copyright clearance.
- That compliance establishes AI-tool-provider or platform permission/licensing compliance.
- That absence of a known violation means legal permission.

## 17. CRC vs. Commercial Assurance boundary

CRC may safely communicate (if this proposition is later approved for CRC publication, a separate and not-yet-performed decision): the existence of the statutory disclosure duty; the statutory synthetic-performer definition; the actual-knowledge trigger; the stated exemptions (expressive-work, audio-only, translation-only, platform/medium) and their conditions; the penalty range; that project-specific applicability is unresolved and requires evidence review.

Commercial Assurance would need to independently verify: legal duty-holder status of the specific project's producer/creator; whether the specific advertisement content meets the statutory synthetic-performer definition; actual knowledge; exemption applicability; jurisdictional attachment to the specific project/distribution; any other project-specific legal predicate. CRC must not make any of these determinations.

**Forward-looking observation (not resolved here, not a CPR act):** the sibling claim's CRC Publication Review (`CPR_008`) withheld CRC eligibility specifically because CRC Publication Policy Principle 3's subject-matter gate applies to the `likeness` topic "regardless of verification strength." If this candidate is later routed under the same `likeness` topic, a future CPR for this claim may need to independently evaluate whether that same gate applies — this review does not decide that question and does not perform CPR.

## 18. Architecture fit

Fits the existing generic Living Knowledge → Retrieval → Bounded Interpretation → Projection architecture without modification. Confirmed no new requirement for: schema semantics (existing `TopicClaim` fields — `jurisdiction`, `applicability_requirements`, `unresolved_project_dependencies`, `provider_scope: null`, `claim_character`, `Lifecycle`, `Prohibited conclusions` — cover this proposition completely, matching the sibling claim's own representation shape); applicability semantics (reuses the existing `jurisdiction` `ApplicabilityFact` and its fail-closed three-state evaluation); dependency semantics (reuses the existing evidence-only-dependency pattern, no new mechanism); Retrieval, Track A/B/C, Bounded Interpretation, or Composition behavior; questioning (no change proposed or made); jurisdiction-specific orchestration (none needed — `jurisdiction-clarification.ts` already handles claims carrying a jurisdiction requirement generically).

## 19. FGR publication/governability test

- Materially useful to CRC users: yes — advertisers using AI-generated ad performers have a real, near-term-relevant statutory obligation.
- Supported by Class A primary evidence: yes, confirmed by this review's own direct re-verification.
- Narrow enough to avoid legal advice: yes, per §14–17's explicit fact/proposition/prohibited-conclusion separation.
- Bounded enough to prevent project-level conclusions: yes, per §16's prohibited-conclusions list.
- Distinct from existing NY knowledge: yes, per §4 (A — DISTINCT/COMPLEMENTARY).
- Safely representable in current architecture: yes, per §18.
- Sufficiently stable/current to govern: yes — statute has been operative for three months (since 2026-06-09) with no amendment or repeal evidence found.

FGR adoption, if it occurs, does not itself grant CRC eligibility — a separate CRC Publication Review remains required, exactly as for every prior wave.

## 20. Disposition

**ADOPT WITH BOUNDED WORDING** — the governed proposition in §15 (already bounded per §6–9, §16) is recommended for adoption as drafted. No further wording narrowing beyond what §15 already reflects is identified as necessary by this review.

## 21. Not decided by this review

- CRC Publication Review / `crc_eligible` (remains `Pending`, requires a separate, later, explicitly authorized CPR).
- Any runtime representation (`TopicClaim` fixture, candidate `.ts` file) — not created; only created after human adoption, per established precedent (e.g. Synthesia's `CAND-SYNTHESIA-STOCK-PAID-PROMOTION-001.ts`, committed the day after its own human ADOPT decision).
- The Principle 3 CRC-publication question flagged in §17.
- `not_before` / temporal gating (remains deliberately deferred).
- GoalCategory taxonomy expansion (remains out of scope; §11's taxonomy-pressure observation is non-blocking and recorded, not acted on).

--- END VERBATIM GOVERNANCE REVIEW ---
