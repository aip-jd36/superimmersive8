Title: CRC Publication Review #32 — California Business & Professions Code § 17610 (Synthetic Performer Advertisement Disclosure, SB 1050)

Reviewed object:
- `CLAIM-SYNTHETIC-PERFORMER-CA-BPC-17610-001-v1` (`GOVERNED-CLAIMS.md`; `Lifecycle: Adopted`, adoption commit `8e72e20c`, following `FGR_026`)

Review date: 2026-10-01

Artifact type: CRC Publication Review / Decision Analysis (publication stage — asks whether this already-Adopted claim may additionally become `CRC Eligible: Yes`; distinct from Formal Governance Review #26, which reviewed this same object for Adoption only — see `FGR_026_CAND-SYNTHETIC-PERFORMER-CA-BPC-17610-001_2026-10-01.md`, and distinct from the same-day Applicability Challenge, which re-tested only FGR_026's applicability design and made no repository change). Fourth CRC Publication Review of the `likeness` GoalCategory topic bucket, after `CPR_008` (WITHHELD — NY Civil Rights Law §§ 50-51, real-person consent), `CPR_025` (APPROVED WITH BOUNDED WORDING — NY GBL § 396-b, statutorily non-identifiable synthetic performer), and `CPR_031` (WITHHELD — China Civil Code Arts. 1018-1020/1023, real-identifiable-person portrait/voice). Second CPR in the synthetic-performer-disclosure sub-family after `CPR_025`. Does not reopen `FGR_026` (including its same-day, report-only Applicability Challenge) absent an actual contradiction — none was found. Does not reopen PM Adoption.

Reviewing-agent recommendation: **APPROVE WITH BOUNDED WORDING** (§ S/§ T below).

PM decision: **APPROVE WITH BOUNDED WORDING — CONCURRED (PM: JD, Decision Date: 2026-10-01).** CRC PM / Architecture explicitly authorized this CRC Publication Review milestone and its own governance-recording step in the same task. `CRC Eligible` is recorded as `Yes` in `GOVERNED-CLAIMS.md` (`CRC Approver: JD (PM)`, `CRC Decision Date: 2026-10-01`), using § S/§ T's exact proposed wording — not the shorter pre-CPR draft the `CRC Candidate Statement` field previously held. **Explicit Principle 3 finding, independently re-derived for California's own text (not inherited from the NY sibling's CPR_025 finding by analogy):** California BPC § 17610(a)(6) defines "synthetic performer" as a figure/voice "NOT recognizable as any identifiable natural person" — the same structural non-identifiability predicate CPR_025 found dispositive for the NY sibling, independently confirmed present in California's own statutory text at § F/§ J below. This finding is claim-specific — it does not hold that Principle 3 is inapplicable to synthetic performers generally, that statutory disclosure laws are categorically outside Principle 3, or that any claim tagged `likeness` is now presumptively CRC-eligible; `CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1` and `CLAIM-LIKENESS-CN-PORTRAIT-VOICE-CONSENT-001-v1` are each unaffected and remain `CRC Publication Scope: WITHHELD FROM CRC`, unchanged. **A second, independent decision axis — the future effective date (January 1, 2027) — is resolved separately at § Q/§ R/§ S below: approved, using wording that leads with the effective date so the fixed, never-date-interpolated Composition template remains accurate both before and after that date, with no new runtime machinery.** Production Representation (runtime fixture addition) remains a separate, unauthorized-by-this-task, later milestone (§ W/§ X below) — and, per § AA, that future milestone should itself weigh the pre-effective-date period, not merely treat CRC-eligibility as a green light to represent it immediately.

Historical status: VERBATIM ARCHIVE — DO NOT EDIT HISTORICAL BODY once a PM decision is recorded. Future amendments (including any later reconsideration decision) should be appended outside the body below, or captured in a new review artifact.

--- BEGIN VERBATIM CRC PUBLICATION REVIEW ---

# California BPC § 17610 — CRC Publication Review Final Report

## A. Governed claim integrity — re-read directly, not accepted on say-so

Re-read `GOVERNED-CLAIMS.md`'s full entry for `CLAIM-SYNTHETIC-PERFORMER-CA-BPC-17610-001-v1` (lines 5331-5554 as of commit `8e72e20c`) and `FGR_026` in full, directly. Confirmed, element by element:

- **Durable claim ID**: `CLAIM-SYNTHETIC-PERFORMER-CA-BPC-17610-001-v1`, minted from `CAND-SYNTHETIC-PERFORMER-CA-BPC-17610-001`, unique repo-wide, consistent with corpus convention.
- **Lifecycle**: `Adopted`, `Adoption Approver: JD (PM)`, `Adoption Decision Date: 2026-10-01`.
- **Proposition**: FGR_026 §3's full draft carried into Adoption verbatim, unparaphrased — confirmed by direct text comparison.
- **Topic/GoalCategory**: `likeness`, reused verbatim, no new category.
- **provider_scope / tool_scope**: both `null` — general California consumer-protection/advertising statute, technology-neutral on its own terms (§ 17610(a)(4)).
- **Applicability**: `jurisdiction equals California`, request-scope only (`AssessmentJurisdictionMention`), identical mechanism to every sibling jurisdiction-gated claim, with a sharpened California-specific disclaimer (FGR_026 §7, independently re-confirmed by the same-day Applicability Challenge, verdict CONFIRM).
- **Dependencies**: D2 — `['synthetic_performer_content_present', 'advertisement_purpose_confirmed']`, independently re-derived from zero (FGR_026 §8/§9), smaller than the NY sibling's own four-dependency array, for stated reasons not inherited by analogy.
- **Askability**: both dependencies evidence-only by `DEPENDENCY_TREATMENTS` registry absence (FGR_026 §10) — no self-attestation conversion anywhere.
- **Reachability**: explicit-goal-only (FGR_026 §11), matching every sibling `likeness`-topic claim.
- **Bounded Interpretation ceiling**: Case 3B (`relevant_applicability_unresolved`) — `directly_relevant` unreachable under D2 (FGR_026 §12).
- **Evidence limitations**: disclosed plainly (FGR_026 §14) — Chapter 5's own further remedy/procedure provisions not independently re-fetched beyond § 17200's definitional text; "consumers in this state" territorial reach to an out-of-state advertiser genuinely unresolved in the statute's own text; no case law exists (statute not yet effective).
- **Prohibited conclusions**: full FGR_026 §13 list carried forward into the Adopted entry verbatim, including the California-specific jurisdiction/distribution-territory distinction and the explicit non-transfer of NY's actual-knowledge condition.
- **Commercial Assurance boundary**: Domain L — Likeness & Performer Rights, named explicitly; no new domain, no Reviewer Manual change made or proposed.
- **Effective date**: January 1, 2027, independently computed (not a directly quoted statutory sentence) via Cal. Const. Art. IV § 8(c)(1)'s default-timing rule applied to the confirmed September 16, 2026 enactment date and the confirmed absence of an urgency clause — recorded as NOT YET EFFECTIVE as of Adoption.
- **CRC publication fields (pre-this-review)**: `CRC Publication Scope: PENDING`, `CRC Approver: PENDING`, `CRC Decision Date: PENDING` — exactly the expected pre-CPR state.

**No internal contradiction found between the Adopted entry and FGR_026's own final, controlling text** (FGR_026 carries no `§N-REVISED` layer — the Applicability Challenge returned CONFIRM with zero FGR revision, confirmed directly via `git log`/`git show` before this review began: only commits `65f3c308` evidence, `2e72ff56` FGR, `8e72e20c` Adoption exist for this candidate). None of the above is reopened by this review.

**Disposition: PASS.**

## B. Current Publication Policy, re-derived fresh

Read `CRC-PUBLICATION-POLICY.md` directly and in full (not from memory or CPR_025/CPR_031's own summaries). The seven Principles, applied independently to this claim:

- **P1 (Verified is necessary, not sufficient)**: Adoption and evidence quality are inputs to this decision, never substitutes for it. Applied throughout.
- **P2 (Preserve meaning, don't just minimize caveats)**: directly operative for the effective-date question (§ Q/§ R below) — the future effective date is load-bearing and must not be reduced to a parenthetical aside that a hasty reading could miss.
- **P3 (Subject sensitivity outweighs confidence in the fact — "a gate, not a scope to narrow around")**: the central question. Full analysis at § F-§ J below.
- **P4 (Scope narrowly rather than withhold entirely)**: not the operative tool here — no coverage-breadth gap exists that scope-narrowing would address; the proposition already states its own exemptions and boundaries in full.
- **P5 (Narrow before withholding — exception for Principle 3)**: analyzed at § H; inapplicable here because § F/§ J find Principle 3's gate does not attach to this claim's own subject matter (Classification B, same disposition type as CPR_025, independently re-derived).
- **P6 (Stability over novelty)**: California's statute was enacted September 16, 2026 — recently enacted, and not yet effective. This is a genuinely different flavor of "newness" than P6's own framing (a platform ToS change whose real-world practice SI8 hasn't yet observed) — P6 concerns observing how a *change in practice* plays out, not whether a *law has commenced*. The future-effective-date question is treated as its own, separate axis (§ Q-§ S), not folded into P6; P6 itself does not independently block publication, since there is no "practice" to observe yet for a not-yet-operative statute and the proposition states only the statute's own enacted text, not an inference about how it will be applied.
- **P7 (CRC eligibility independent of Canonicalization Readiness)**: this claim references no canonical tool/provider identity (`provider_scope`/`tool_scope` both null) — no subject for this principle to attach to, consistent with every other non-tool-scoped claim in this corpus.

Used `CPR_025` (APPROVED NY synthetic-performer) and `CPR_031` (WITHHELD China portrait/voice) as **architectural precedent only** — the specific reasoning each applied to its own claim's subject matter, not as a rule this claim inherits either outcome from by analogy.

**Disposition: PASS — policy independently re-derived, not assumed from precedent.**

## C. Educational utility

Genuinely positive, not manufactured: a user naming California as the assessment jurisdiction who is unaware that (1) California has enacted a synthetic-performer advertising disclosure statute; (2) its duty is strict/unconditional (no actual-knowledge gate, unlike New York's); (3) it covers audio-only synthetic performers, unlike New York's audio-exempt structure; (4) it carries its own expressive-work and broader accessibility/translation exemptions; (5) it rides on the pre-existing §§ 17500/17200 UCL enforcement framework rather than a stand-alone penalty; and (6) the duty does not take effect until January 1, 2027 — would benefit from this awareness before representing a California-bound AI-generated advertisement as ready for commercial use. This is the same modest-but-genuinely-useful shape already approved for the NY sibling (`CPR_025` § Q).

**Disposition: PASS (educational value), not dispositive on its own.**

## D. Project-specific boundedness — traced against current production code

Re-derived directly against `08_Platform/app/lib/bounded-interpretation/build-bounded-interpretation.ts` and `rules.ts`, not assumed from the claim's own governance text:

```
function hasGovernedProjectDependencies(match: BiResult): boolean {
  return match.unresolved_project_dependencies.length > 0
}
```

With two dependencies (`synthetic_performer_content_present`, `advertisement_purpose_confirmed`), this is `true` — the claim reaches `relevant_applicability_unresolved` (Case 3B) once the California jurisdiction gate is satisfied, rendered via the same fixed, domain-blind templates every other claim in this corpus uses: the governed `claimStatement` quoted verbatim + the fixed `relevant_applicability_unresolved` hedge sentence + the fixed bridge sentence to Commercial Assurance. No `humanContributionSentence`-equivalent echo mechanism exists for the `likeness` topic — confirmed by direct read of `build-bounded-interpretation.ts`'s own call sites — so no user free text is ever interpolated into the rendered output for this claim.

Tested the adversarial statements named in the task directly against this fixed template:

| Adversarial statement | Effect on rendered output |
|---|---|
| "It's obviously an AI person" | None — does not map to any `ProjectFacts`/applicability field; does not resolve the non-identifiability regime-selector question (FGR_026 §8.B), which was never represented as a dependency at all |
| "The AI narrator is the main voice in the ad" | None — does not resolve "prominently used" (rejected as a dependency, FGR_026 §8.C); no field exists to receive this statement even as evidence |
| "We're only showing it to California customers" | None — a `DistributionTerritoryMention`, categorically distinct from the `AssessmentJurisdictionMention` the `jurisdiction` applicability fact actually reads (§ K/§ L below); cannot satisfy or fail the applicability gate by itself, and is not wired to any code path that would let it do so |
| "The disclosure is definitely compliant" | None — "clear and conspicuous" was rejected as a dependency (FGR_026 §8.G); the claim renders the same fixed hedge regardless |
| "The platform approved it" | None — not a statutory element in § 17610(e)'s own two-part test; no code path reads any concept of platform approval |
| "The law doesn't apply yet, right?" | The fixed `claimStatement` (§ S below, bounded wording) states the effective date explicitly as part of the governed text itself — this is the one adversarial statement this review deliberately ensures the *proposition's own fixed text* answers correctly, rather than relying on BI/Composition machinery that has no date-awareness at all (§ Q) |

**None of these can become a legal finding or a presently-operative-law assertion, because the fixed Composition template has no mechanism to incorporate user free text for this claim's topic, and (confirmed at § Q) no mechanism to vary its output by the current date either — the only text that ever appears is the pre-governed `claimStatement`, written and reviewed before this conversation (or this calendar date) is ever reached.**

**Disposition: PASS on architectural boundedness — does not resolve Principle 3 or the effective-date question, each resolved independently below.**

## E. (reserved — folded into D/F per this corpus's own CPR_031 structural precedent; no separate section needed)

## F. Principle 3 — the central question, applied independently and literally

`CRC-PUBLICATION-POLICY.md` Principle 3, read verbatim: *"A well-verified fact touching SI8's No List boundaries — likeness, voice cloning, deepfakes, political persuasion — gets more scrutiny, not less, regardless of verification strength. This is a gate, not a scope to narrow around."*

Tested against this claim's own actual legal predicate — California's own statutory text — not against the NY sibling's own CPR_025 finding by analogy:

**Likeness: NO, on subject-matter grounds.** § 17610(a)(6)'s own defining text requires the performer be "NOT recognizable as any identifiable natural person." This is the exact inverse of the predicate that triggered Principle 3 for the NY real-person claim (`CPR_008`) and the China portrait/voice claim (`CPR_031`), both of which govern a **real, identifiable** person's own image/voice. California's statute, independently read, excludes identifiable-person subject matter from its own governed scope entirely (FGR_026 §2, §8.B) — a figure that IS recognizable as a real person falls outside § 17610 altogether and would instead implicate a wholly separate, unadopted California real-person likeness/right-of-publicity body of law. This claim's governed subject is therefore not a real person's likeness at all; it is a disclosure duty about admittedly synthetic, non-real content.

**Voice cloning: NO, on subject-matter grounds, for the identical reason.** § 17610(a)(6) covers "a digital figure, voice, or representation" — but the SAME non-identifiability predicate applies to the voice component as to the visual component: a voice that IS recognizable as cloned from a specific real person falls outside this statute's "synthetic performer" definition entirely (the regime-selector reasoning of FGR_026 §8.B applies identically to voice). This claim does not govern, and is not about, cloning an identifiable real person's actual voice — that fact pattern (the one China's `CLAIM-LIKENESS-CN-PORTRAIT-VOICE-CONSENT-001-v1` governs, and the one that made `CPR_031`'s voice-cloning finding "YES") is definitionally excluded from this California statute's own governed subject.

**Deepfakes: NO, on subject-matter grounds — same reasoning `CPR_025` applied to the NY sibling, independently re-confirmed for California's text.** SI8's No List "deepfakes" item — "no deepfakes or deceptive content" — targets impersonation/deception of something purporting to be real. § 17610's disclosure duty exists to *prevent* exactly that deception, by mandating that audiences be told a performer is synthetic. If anything, California's version is a *stronger* anti-deception mechanism than New York's: it imposes the duty unconditionally (no actual-knowledge gate, FGR_026 §8.F) and covers audio-only synthetic performers New York exempts (FGR_026 §19 item 1) — broader disclosure coverage, not broader deception risk. The proposition being adopted is educational content *about a disclosure mandate against deception*, not content that itself impersonates or deceives.

**Political persuasion: not implicated.** No political content or persuasion fact pattern appears anywhere in this claim's governed text.

**This claim does not trigger any of the four named Principle 3 subjects on its own actual defining legal predicate — the non-identifiability condition is structural and definitional, not an incidental fact that happened to be true of this particular statute.**

**Disposition: PRINCIPLE 3 DOES NOT APPLY — Classification B (same classification label `CPR_025` used for the NY sibling), independently re-derived from California's own statutory text, not inherited from NY's outcome by analogy.**

## G. Comparison with `CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1` (CPR_008, WITHHELD)

`CPR_008` withheld the NY real-person likeness claim solely because Principle 3's subject-matter gate applies "regardless of verification strength" to a claim whose own defining predicate is a **real, identifiable** person's name/portrait/picture/likeness/voice used without consent. That predicate is the opposite of this California claim's own defining predicate (§ F above: a performer statutorily required to be NOT identifiable). The policy rationale that withheld the NY likeness claim does not transfer here, because the underlying subject matter is materially and definitionally different, not merely because an outcome needs to differ.

**Disposition: CPR_008's WITHHOLD RATIONALE DOES NOT TRANSFER — ITS DISTINGUISHING CONDITION (REAL-PERSON IDENTIFIABILITY) IS ABSENT FROM THIS CLAIM'S SUBJECT MATTER.**

## H. Comparison with `CLAIM-LIKENESS-CN-PORTRAIT-VOICE-CONSENT-001-v1` (CPR_031, WITHHELD)

`CPR_031` withheld the China portrait/voice claim because its own entire legal predicate is recognizability of a specific, real, identifiable natural person (Art. 1018's own defining text) and, for voice, identifiability through timbre/tone/pronunciation style (the Yin case's own test) — a claim `CPR_031` found implicated likeness, voice cloning, and (with high confidence) deepfake-adjacent subject matter, "with at least equal force" to the NY likeness claim. California's statute is the structural inverse of China's: its own definitional subject is explicitly NOT an identifiable natural person (§ F above). The distinguishing condition that produced `CPR_031`'s WITHHOLD (real-person recognizability as the claim's own defining legal predicate) is absent here by the same statutory design that makes `CPR_025`'s APPROVE rationale available.

**Disposition: CPR_031's WITHHOLD RATIONALE DOES NOT TRANSFER — ITS DISTINGUISHING CONDITION IS THE EXACT INVERSE OF THIS CLAIM'S OWN SUBJECT MATTER.**

## I. Comparison with `CLAIM-NY-SYNTHETIC-PERFORMER-DISCLOSURE-001-v1` (CPR_025, APPROVED) — the mechanism, not the outcome, is what transfers

`CPR_025` approved the NY synthetic-performer claim specifically because its subject matter is "a statutorily-defined synthetic performer explicitly not recognizable as any identifiable natural performer." The MECHANISM responsible for that different publication outcome (relative to CPR_008/CPR_031) is not "this is a synthetic-performer-disclosure statute" as a category label — it is the specific structural fact that the statute's OWN TEXT defines its governed subject to categorically exclude identifiable real persons. That exact structural fact independently exists in California's own text at § 17610(a)(6) (§ F, § A above) — re-derived directly from California's statute, not borrowed from NY's. California additionally contains no feature that reintroduces an identifiability concern: audio-only coverage (§ F, voice-cloning analysis above), the "prominently" functional-role test (a dependency-model question, already resolved at Adoption, not a Principle 3 question — it characterizes WHERE/HOW a synthetic performer is used, never WHO it is), the absence of an actual-knowledge gate (a duty-scope question, if anything strengthening the anti-deception reading, § F deepfakes above), the broader accessibility/translation exemption, and the platform/court-order structure are all independently tested at § K below and found not to alter this conclusion.

**Disposition: CPR_025's APPROVE MECHANISM TRANSFERS, INDEPENDENTLY RE-VERIFIED AGAINST CALIFORNIA'S OWN TEXT — NOT APPLIED BY OUTCOME-ANALOGY ALONE.**

## J. Identifiable vs. non-identifiable subject — explicit answer

California's governed proposition is about **(B) a non-identifiable synthetic representation**, not (A) an identifiable person's likeness/voice, not (C) both, and not (D) something else. This is not an inference — it is the statute's own express definitional text (§ 17610(a)(6)), independently re-read at § A/§ F above, and it is the same structural category CPR_025 found for the NY sibling, independently re-confirmed here for California's own wording rather than assumed by symmetry.

**Disposition: CONFIRMED — (B), non-identifiable synthetic representation.**

## K. California-specific differences — tested individually for Principle 3 relevance

- **Audio-only coverage** (no exemption, unlike NY): affects statutory *breadth*, not subject identifiability — analyzed at § F (voice cloning) above; does not introduce a Principle 3 concern.
- **"Prominently" functional-role test** (§ 17610(a)(5)): a content-characterization question about WHERE/HOW a synthetic performer is used within an advertisement's structure, already independently rejected as a dependency at FGR_026 §8.C for reasons unrelated to identifiability (a multi-factor qualitative judgment this architecture cannot represent at finer grain) — does not reopen or bear on the identifiability question at all.
- **Absence of an actual-knowledge condition**: a duty-scope/strict-liability question, not an identifiability question; if anything strengthens the anti-deception reading (§ F, deepfakes).
- **Accessibility/translation exemption, broader than NY's**: narrows statutory reach, does not touch identifiability.
- **Platform/court-order structure**: a procedural duty-holder question for a different subclass (the distributing medium, not the performer's own identifiability) — already excluded from the primary dependency model at FGR_026 §8.H; no Principle 3 relevance.
- **Enforcement via §§ 17500/17200 rather than a stand-alone penalty**: an enforcement-mechanics question, not a subject-matter question.

**None of California's distinguishing features introduces a sensitive project-specific determination CRC would need to make, and none reopens the identifiability analysis at § F/§ J.**

**Disposition: PASS — no California-specific feature changes the Principle 3 conclusion.**

## L. Narrow-before-withhold (Principle 5)

Not reached — § F finds Principle 3 does not apply to this claim's subject matter at all, so Principle 5's exception (narrow-before-withhold does not apply to Principle 3 concerns) is moot; no narrowing was needed or attempted for Principle-3 reasons. (Narrowing WAS independently performed at the Adoption/FGR stage for unrelated reasons — the dependency model itself, FGR_026 §8 — but that is a governance-stage decision already made, not reopened here, and not a Principle-5 CPR-stage narrowing.)

**Disposition: PASS — Principle 5's Principle-3 exception not triggered; no CPR-stage narrowing required.**

## M. Evidence strength vs. publication safety — kept explicitly separate

The evidence base is strong and authoritative: two independently fetched Class A primary sources confirming enactment date and chapter number (byte-identical agreement), the full chaptered statutory text, the California Constitution's own effective-date default rule, and the cross-referenced enforcement statutes (§§ 17500/17200). This strength is a necessary but independently separate fact from the Principle 3 conclusion (§ F) — a claim could be this well-evidenced and still be withheld (as China's was, `CPR_031`) or this well-evidenced and approved (as NY's was, `CPR_025`, and as this claim now is) — evidence quality does not drive the Principle 3 outcome in either direction.

**Disposition: EVIDENCE QUALITY CONFIRMED STRONG; EXPLICITLY NOT THE BASIS FOR THE § F FINDING.**

## N. Dependencies and askability — reconfirmed exactly as adopted

`['synthetic_performer_content_present', 'advertisement_purpose_confirmed']` (D2, FGR_026 §9) — reconfirmed unchanged from the Adopted entry; no NY dependency imported, no rejected candidate (recognizability, "prominently used," duty-holder conduct, geographic nexus, actual knowledge, "clear and conspicuous disclosure already supplied," the two named exemptions, the court-order/platform-duty condition) restored. Both remain evidence-only by `DEPENDENCY_TREATMENTS` registry absence — no qualitative legal question (identifiability, prominence, disclosure sufficiency, exemption applicability, jurisdictional attachment) is converted to self-attestation.

**Disposition: PASS — unchanged from Adoption, independently re-verified.**

## O. Bounded Interpretation ceiling / prohibited-conclusion verification

Confirmed at § D above: Case 3B (`relevant_applicability_unresolved`) is the ceiling; `directly_relevant` is unreachable under the D2 dependency model. Publication does not authorize, and cannot produce, a stronger project-specific conclusion than Adoption/FGR_026 permits — the fixed template mechanism is identical in kind to the NY sibling's own proven-safe mechanism (`CPR_025` § V's canary findings), re-traced here directly against current source rather than re-run as a new canary (not required: no new runtime behavior is introduced by this claim that the NY sibling's own canary run did not already exercise for the identical Case-3B/no-interpolation architecture).

**Disposition: PASS.**

## P. Commercial Assurance boundary

Re-confirmed: Domain L — Likeness & Performer Rights remains the correct, unchanged downstream boundary for everything this claim leaves open (direct content review for recognizability and prominence; disclosure-sufficiency review; exemption applicability; jurisdictional nexus). Domain L's existing text names only the NY statute explicitly; this review does not propose, and is not authorized to make, a Reviewer Manual update adding a parallel California note — recorded as a plausible future Commercial Assurance documentation task, not performed here. Domain L's existence is not used here as a reason to either approve or withhold CRC publication — it is simply the correct unchanged boundary regardless of this review's disposition, exactly as `CPR_025`/`CPR_031` each independently confirmed for their own claims.

**Disposition: PASS — Domain L confirmed correct and unchanged; not used as a publication-policy shortcut.**

## Q. Effective-date evidence and current temporal/lifecycle runtime behavior

Re-checked the Adopted entry's effective-date basis directly: January 1, 2027, independently computed (not a directly quoted statutory sentence) from two Class A primary sources (chaptered bill text confirming enactment/filing September 16, 2026; the bill-history page independently confirming the same date and chapter number) combined through California Constitution Art. IV § 8(c)(1)'s own default-timing rule (effective "January 1 next following a 90-day period from the date of enactment," absent an urgency clause under § 8(d) — confirmed absent by direct text search of the full captured bill). This basis is sound and unchanged by this review.

**Runtime inspection, performed directly against current source, not assumed:** no `effective_date`, `not_yet_effective`, temporal-applicability, or future-law-handling field or mechanism exists anywhere in `TopicClaim` (`08_Platform/app/lib/retrieval-engine/types.ts`), `topic-claims-fixture.ts`, `lookup-topic-claims.ts`, or the Bounded Interpretation pipeline (confirmed by direct search; zero matches for any such concept). The `CRC Candidate Statement` / `claimStatement` that ultimately reaches a CRC conversation is a **fixed, pre-written string**, rendered verbatim by Composition with no date-based branching, no "is today before or after X" check, and no dynamic text generation of any kind — the identical, already-proven architecture `CPR_025` § V's canary traced for the NY sibling and `CPR_031` § E traced for the China sibling. This claim has no `TOPIC_CLAIMS_FIXTURE` entry today (Adoption explicitly did not add one), so there is no existing runtime representation of this specific claim to inspect — the question this section resolves is whether a *future* Production Representation could safely carry a fixed string that remains accurate regardless of when a user actually asks.

**Disposition: PASS on evidence; PASS on runtime-mechanism inspection — no temporal gating mechanism exists, and none is needed, provided the fixed string itself is drafted date-safely (§ R).**

## R. Is pre-effective-date CRC publication safe?

**Tested directly: the dangerous output "California requires you to..." stated in unqualified present tense, before January 1, 2027, would misstate current law as presently operative — this must not occur.** Because the rendering mechanism is a fixed string with no date-awareness (§ Q), the *same* string is rendered whether a user asks today (2026-10-01), on 2026-12-31, or in 2028 — there is no mechanism that could make a date-unqualified "requires" statement become true only after the effective date arrives. This means the safety of pre-effective-date publication depends entirely on how the fixed string is worded, not on any runtime gate.

A sentence structured as **"Effective January 1, 2027, California Business and Professions Code § 17610 requires..."** is accurate on every date it could ever be read: before January 1, 2027, it correctly states that the requirement is not yet operative but is fixed to commence on a specific, named date (readable as "this takes effect on, not before, that date"); from January 1, 2027 onward, it remains equally accurate as an ongoing statement of when the requirement took effect and continues to apply. This is a **durably accurate, permanently fixed sentence** — not a temporary pre-effective-date placeholder requiring future rewriting, and not a sentence that becomes false or misleading once the date passes. This differs from, and is safer than, a sentence that leads with "requires" and appends "(effective January 1, 2027)" as a trailing parenthetical (the current short `GOVERNED-CLAIMS.md` pre-CPR draft's own structure) — a hasty reading of that construction could carry away only the unqualified "requires" clause, which is exactly the Publication Test's own concern (§ S's proposed wording corrects this).

**This resolves to the task's own Option 4: an existing governance mechanism — the fixed, never-date-interpolated Composition architecture — already handles this correctly, PROVIDED the wording itself is drafted with the effective date leading the sentence rather than trailing it.** No new runtime machinery, no Lifecycle/effective-date schema field, and no California-specific temporal logic is proposed, needed, or authorized — this is a wording-discipline correction made at CPR stage, the same kind of substitution `CPR_025` itself made when it replaced the NY sibling's shorter pre-CPR draft with its own fuller § S/§ T wording.

**Disposition: PRE-EFFECTIVE-DATE CRC PUBLICATION IS SAFE, using the § S wording below — not safe using the current short pre-CPR draft's trailing-parenthetical construction, which this review's approval does NOT ratify as-is.**

## S. Proposed CRC Candidate Statement (supersedes the shorter pre-CPR draft; not written into governed authority until recorded below)

> Effective January 1, 2027, California Business and Professions Code § 17610 (added by SB 1050) will require any person who creates and causes to be published, in an advertising medium, an advertisement that prominently includes a synthetic performer to include a clear and conspicuous disclosure that the advertisement includes a synthetic performer. "Synthetic performer" means a digital figure, voice, or representation created using generative AI that creates the impression of a human performance, where the performer is NOT recognizable as any identifiable natural person — this does not determine whether any specific depicted figure meets or fails that definition. The duty does not apply to advertisements for expressive works (where the synthetic performer's use is consistent with its use in the work) or to advertisements using generative AI solely for language translation or other accessibility features. Unlike New York's comparable disclosure statute, California's duty is not conditioned on the creator's actual knowledge, applies to audio-only as well as audiovisual content, and states no stand-alone penalty amount of its own — enforcement rides on California's existing Unfair Competition Law framework (Bus. & Prof. Code §§ 17500/17200). This statute does not restrict or prohibit the creation, distribution, or exhibition of synthetic content generally.

## T. Proposed CRC Publication Scope (proposal only — recorded below)

> CRC may state that, effective January 1, 2027, California BPC § 17610 will require a person who creates and causes to be published a qualifying advertisement prominently featuring a synthetic (non-identifiable) performer to include a clear and conspicuous disclosure, subject to the statute's expressive-work and accessibility/translation exemptions, and that California's duty — unlike New York's — carries no actual-knowledge condition, covers audio-only content, and rides on the existing §§ 17500/17200 Unfair Competition Law enforcement framework rather than a stand-alone penalty. This is California statutory law, not SI8's own policy, and is not yet in effect as of any date before January 1, 2027. CRC must not state or imply: that a specific project's depicted figure is or is not recognizable as an identifiable real person; that a specific project's use is or is not statutorily "prominent"; that specific content does or does not meet the "Advertisement" definition, or that the user/their principal is or is not within the duty-holder class; that a specific disclosure, if any, is or is not "clear and conspicuous"; that any exemption does or does not apply to a specific project; that a specific court order or service of process satisfies § 17610(e)(1); that California jurisdiction, or the "consumers in this state" nexus the statute itself requires, attaches to a specific project merely because the user named California as the assessment jurisdiction or as a distribution territory; that actual knowledge is required (it is not); that this statute is already in effect before January 1, 2027; that AI tool providers are exempt; that a violation or compliance determination has been reached; or that the project is commercially cleared or ready for commercial use in California or any other jurisdiction. Does not establish that a real, identifiable person's likeness is governed by this statute (excluded from the governed subject itself). A human-reviewed Commercial Assurance Assessment remains the higher-assurance path for resolving any of these project-specific facts.

## U. Applicability / request-scope result

Reconfirmed, not reopened: `jurisdiction equals California` is a request-scope gate only (`AssessmentJurisdictionMention`) — it never establishes that California law legally applies to a project, and never establishes the "consumers in this state" nexus § 17610(a)(2)(A) itself requires. The same-day Applicability Challenge already independently re-tested and confirmed this design (verdict CONFIRM, no repository change). Not reopened here absent new evidence — none exists.

**Disposition: PASS — unchanged, independently re-confirmed as still correct.**

## V. Distribution-territory architecture debt — impact on publication safety

The known, disclosed, generic gap (`DistributionTerritoryMention`/`geographic_relevance_scope` cannot gate `applicability_requirements`) produces only **fail-closed under-triggering** — a user stating an advertisement reaches California consumers without also naming California as assessment jurisdiction will not trigger this claim at all, meaning CRC says nothing rather than saying something incorrect. This has no publication-safety downside (it cannot cause CRC to over-state applicability); it is a completeness/usefulness limitation, already recorded as architecture debt, not repaired or expanded here, and does not block or alter this CPR's disposition.

**Disposition: PASS — the gap is fail-safe with respect to publication safety; not a reason to withhold.**

## W. Fail-closed behavior

Applicability (unresolved absent explicit California confirmation), both dependencies (permanently unresolved, Case 3B), and the effective-date wording (§ S, accurate both before and after the date rather than silently assuming current operation) all fail closed — no code path, and no proposed wording, optimistically infers a fact or a present-tense legal obligation from silence or ambiguity.

**Disposition: PASS.**

## X. Formal Publication Test

*"Would I be comfortable having a prospect's legal team quote this exact sentence back to SI8?"* — applied to § S/§ T's proposed wording: yes. The statement is accurate on any date it could be read, states the statute's own text without characterizing any project, explicitly discloses the as-yet-ineffective status, explicitly discloses the California/New York divergences rather than silently importing NY's framing, and forecloses every tested overstatement. Applied to the current short pre-CPR draft's own trailing-parenthetical construction: **no** — a legal team quoting only the "requires...disclosure" clause without the parenthetical could reasonably read SI8 as asserting a presently operative legal duty. This is why § S/§ T, not the pre-CPR draft, is the wording this review approves.

**Disposition: PASS for § S/§ T wording; FAIL for the unmodified pre-CPR draft wording — the draft is superseded by this review, exactly as `CPR_025` superseded the NY sibling's own shorter draft.**

## Y. Final CRC publication disposition

**APPROVE WITH BOUNDED WORDING** — using § S/§ T above verbatim, not the shorter pre-CPR draft. Every ordinary Publication Policy signal (evidence quality, dependency handling, applicability safety, educational value, fail-closed behavior) passes cleanly. The two substantive questions — Principle 3 (§ F-§ K, independently resolved as not applicable to this claim's specific, definitionally non-identifiable subject matter) and the future effective date (§ Q-§ R, independently resolved as safely representable now using date-leading wording, no new architecture) — are each resolved on their own terms, not by analogy to either sibling claim's own outcome.

## Z. Governance fields changed

`GOVERNED-CLAIMS.md`: `CRC Publication Scope` (PENDING → the approved disposition text, § S/§ T wording), `CRC Approver` (PENDING → `JD (PM)`), `CRC Decision Date` (PENDING → `2026-10-01`), `CRC Candidate Statement` (shorter draft → § S wording), plus a new "Full CRC Publication Review artifact" reference line. No other field (`Lifecycle`, proposition, dependencies, applicability, evidence limitations, prohibited conclusions, Domain L reference, effective-date text) is touched.

## AA. Architecture/runtime changes — NONE

No Retrieval, Bounded Interpretation, Composition, extraction, questioning, correction/supersession, applicability runtime, geographic-relevance runtime, provider-scope machinery, GoalCategory taxonomy, or production fixture was modified. No `TOPIC_CLAIMS_FIXTURE` entry was added — this claim remains structurally unreachable by real CRC Retrieval until a separate, deliberately unperformed engineering task adds one. **This observation does not gate this CPR's recommendation** (exactly the same posture `CPR_025` § W/§ X took for the NY sibling at its own CPR stage) **but a future Production Representation milestone for this specific claim should explicitly weigh the pre-January-1-2027 period** — not as a publication-eligibility question (already resolved here) but as a production-timing judgment call for whoever authorizes that later milestone, since representing a not-yet-effective duty to real users, even with date-safe wording, is a product decision this CPR does not make.

## AB. Change boundary

Expected changes from this governance-recording task: this CPR artifact (new file) + `GOVERNED-CLAIMS.md` publication-metadata fields only. No runtime, schema, fixture, `GoalCategory`, or production code change of any kind. No Production Representation performed or authorized by this review. Not pushed, not deployed.

## AC. Remaining risks

1. The effective-date wording discipline established here (§ R, date-leading construction) is a reusable pattern worth naming explicitly if SI8 ever adopts another not-yet-effective statute before this one takes effect — not generalized into a policy amendment by this review.
2. Once January 1, 2027 passes, the § S/§ T wording remains accurate as written and requires no mandatory re-review — but a future, separate task could reasonably simplify "Effective January 1, 2027, ... will require" to present tense once the date has passed, as a purely stylistic (not substantive) refresh; not scheduled or required by this review.
3. The California/New York coexistence (§ AD below) depends on both claims continuing to diverge in their own governed text — if either claim is ever revised, this review's comparative reasoning (§ G-§ I) should be re-checked, not assumed to still hold.

## AD. California/New York coexistence

Confirmed unchanged: `CLAIM-NY-SYNTHETIC-PERFORMER-DISCLOSURE-001-v1` was not read-modified by this review beyond being cited as comparison context; its own file content is unchanged. This claim's own `Related:` field already names the specific divergences (actual-knowledge condition, penalty structure, duty-holder breadth, audio-only coverage, accessibility-exemption breadth) — no synthesized national rule is created, and this review introduces none.

## AE. Recommended next milestone

If ratified (recorded in this same task, § Z): no further action required to close this CPR. Production Representation (runtime fixture addition) remains a distinct, later, unauthorized-by-this-review engineering/product task — see § AA for the one additional consideration (pre-effective-date timing) that task's own authorizer should weigh.

## AF. APPROVE / WITHHOLD / HOLD

**APPROVE WITH BOUNDED WORDING** (use § S/§ T verbatim, not the shorter `GOVERNED-CLAIMS.md` pre-CPR draft).

--- END VERBATIM CRC PUBLICATION REVIEW ---
