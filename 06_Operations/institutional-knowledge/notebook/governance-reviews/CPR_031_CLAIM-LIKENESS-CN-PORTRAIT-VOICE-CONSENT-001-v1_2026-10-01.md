Title: CRC Publication Review #31 — China (PRC) Portrait & Voice Rights (Civil Code Arts. 1018-1020, 1023 para. 2)

Reviewed object:
- `CLAIM-LIKENESS-CN-PORTRAIT-VOICE-CONSENT-001-v1` (`GOVERNED-CLAIMS.md`; `Lifecycle: Adopted`, adoption commit `c77cf749`, following `FGR_025`)

Review date: 2026-10-01

Artifact type: CRC Publication Review / Decision Analysis (publication stage — asks whether this already-Adopted claim may additionally become `CRC Eligible: Yes`; distinct from Formal Governance Review #25, which reviewed this same object for Adoption only — see `FGR_025_CAND-LIKENESS-CN-PORTRAIT-VOICE-CONSENT-001_2026-10-01.md`). Third CRC Publication Review of the `likeness` GoalCategory topic bucket, after `CPR_008` (WITHHELD — NY Civil Rights Law §§ 50-51, real-person consent) and `CPR_025` (APPROVED WITH BOUNDED WORDING — NY GBL § 396-b, statutorily non-identifiable synthetic performer). First CPR for a non-US/non-Taiwan jurisdiction `likeness`-topic claim. Does not reopen `FGR_025` (including its same-day Narrow Governance Reconsideration, §7/8-REVISED) absent an actual contradiction — none was found.

PM decision: **WITHHOLD FROM CRC — CONCURRED (PM: JD, Decision Date: 2026-10-01).** CRC PM / Architecture explicitly reviewed and approved this review's own recommendation (WITHHOLD FROM CRC) in this same governance-recording task. `CRC Eligible`/`CRC Approver`/`CRC Decision Date` remain `PENDING` in `GOVERNED-CLAIMS.md` — per the established `CPR_008` precedent for a WITHHOLD disposition, those fields' meaning is specifically "who/when approved this claim FOR CRC," not "who/when decided the CRC disposition in general." The WITHHOLD decision and its date/approver are instead recorded inline in the claim's own `CRC Publication Scope` field, citing this review as basis — exactly mirroring `CPR_008`'s own recording convention for `CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1`.

Historical status: VERBATIM ARCHIVE — DO NOT EDIT HISTORICAL BODY once a PM decision is recorded. Future amendments (including any later reconsideration decision) should be appended outside the body below, or captured in a new review artifact.

--- BEGIN VERBATIM CRC PUBLICATION REVIEW ---

# China Portrait & Voice Rights — CRC Publication Review

## A. Repository gate

Worktree `C:\Users\User\Desktop\si8-lk-third-party-copyright-discovery`, branch `release-staging-main`. Local HEAD at review start `c77cf749` (the Adoption-recording commit for this claim), 5 ahead / 16 behind `origin/main` (pre-existing divergence, unrelated upstream work). Working tree confirmed clean before this review began. Confirmed the actual next valid CPR number by listing `governance-reviews/` directly (not trusting any index file): highest existing `CPR_*` file is `CPR_030_CLAIM-TRADEMARK-TW-ART68-INFRINGEMENT-001-v1_2026-09-23.md`, so `CPR_031` is correct. Confirmed no production representation exists for this claim: zero matches for `CLAIM-LIKENESS-CN` or `portrait_or_voice_content_present` anywhere in `08_Platform/`.

**Disposition: PASS.**

## B. Adopted claim verified directly (not accepted on say-so)

Re-read `GOVERNED-CLAIMS.md`'s full entry (lines 5248-5298 as of `c77cf749`) and `FGR_025` directly, including the same-day Narrow Governance Reconsideration (§7/8-REVISED) that is the controlling, final state. Confirmed, element by element, against the task's own checklist:

- **Durable claim ID**: `CLAIM-LIKENESS-CN-PORTRAIT-VOICE-CONSENT-001-v1`, minted from `CAND-LIKENESS-CN-PORTRAIT-VOICE-CONSENT-001`, consistent with corpus convention.
- **Proposition**: PRC Civil Code (2020, eff. 2021) Arts. 1018-1020 (portrait right, defined as "the recognizable external image of a specific natural person"; Art. 1019's consent-based prohibition; Art. 1020's five narrow exceptions) and Art. 1023 para. 2 (voice protection, by reference, under the same provisions), plus SPC 2026 Opinion Art. 4 (confirms these existing protections apply to AI face-swap/voice-mimicry fact patterns without creating a new right). China's name right (Arts. 1012-1017, Art. 1023 para. 1) is explicitly excluded as a materially different interference/misappropriation standard, not consent-based.
- **Jurisdiction**: China (PRC), applicability gate `jurisdiction equals China`, request-scope only (`AssessmentJurisdictionMention`), identical mechanism to the NY sibling and the Taiwan claims.
- **`provider_scope`**: null. **`tool_scope`**: null. Confirmed technology-neutral on the claim's own face.
- **Dependency**: exactly one, `portrait_or_voice_content_present` (D1, §7/8-REVISED final and controlling — correcting an intermediate D2 re-derivation at §7/§8). Confirmed `consent_from_depicted_person_confirmed` was independently withdrawn as an SI8-authored composite of multiple evaluative judgments restating Commercial Assurance Domain L's own task, not reintroduced anywhere in the Adopted entry. No recognizability dependency and no Art. 1020 statutory-exception dependency exist — both are folded into proposition wording and the Commercial Assurance Domain L boundary, as the claim's own governance text states.
- **Askability**: `portrait_or_voice_content_present` is evidence-only (a submitter's bare assertion "no real person appears" is explicitly weak evidence absent independent content review) — re-confirmed against `08_Platform/app/lib/crc-engine/dependency-askability.ts`'s own `DEPENDENCY_TREATMENTS` registry, which has no entry for this or any China-likeness key; nothing in this claim is askable in CRC.
- **Reachability**: explicit-goal-only, via the existing, unmodified exact-topic `lookupTopicClaims` path under the already-registered `likeness` `GoalCategory` (confirmed live, `types/interview-engine.ts` line 826's `GOAL_CATEGORIES` array). No `TopicRelationship`, no Track A trigger, no fabricated `UserGoal`.
- **Bounded Interpretation ceiling**: Case 3B (`relevant_applicability_unresolved`) — one non-empty dependency array still satisfies `hasGovernedProjectDependencies()`'s pure `.length > 0` check (re-traced directly against `08_Platform/app/lib/bounded-interpretation/build-bounded-interpretation.ts`, confirmed identical to the Taiwan Trademark D2→D0 analysis's own re-derivation method but reaching D1→Case-3B here, not D0→`directly_relevant`).
- **Evidence limitations**: disclosed plainly — no commercial-use gate exists in the captured statutory text (an affirmative absence, confirmed by direct text search for 商业/广告/贸易/营利/营业 returning zero matches in Arts. 1018-1023); recognizability and the five Art. 1020 exceptions are evidentiary/legal-characterization questions, not CRC-resolvable facts.
- **Prohibited conclusions**: full text re-read — forecloses asserting legal recognizability as fact, actual/sufficient consent, Art. 1020 exception applicability, AI-production status as relevant to which rule applies, China's territorial governance merely from the user naming China, infringement/non-infringement, commercial clearance, name-right applicability, Art. 994 deceased-person implication, and Arts. 1021-1022 licensing-dispute implication. Also explicit that this is not a substitute for Commercial Assurance Domain L evidence review.
- **Commercial Assurance boundary**: Domain L — Likeness & Performer Rights, named explicitly in the Prohibited Conclusions text.

**No contradiction found between the Adopted entry and FGR_025's own final (§7/8-REVISED-controlled) state.** None of the above is reopened by this review — re-confirmed independently, not reopened.

**Disposition: PASS.**

## C. Publication policy re-derived fresh

Read `CRC-PUBLICATION-POLICY.md` directly and in full (not from memory or summary). The seven Principles, applied to this claim:

- **P1 (Verified is necessary, not sufficient)**: Adoption and evidence quality are inputs to this decision, never substitutes for it. Applied throughout.
- **P2 (Preserve meaning, don't just minimize caveats)**: not the operative question here — see P3 below, which forecloses the question before wording-quality would matter.
- **P3 (Subject sensitivity outweighs confidence in the fact — "A gate, not a scope to narrow around")**: the central question for this claim. Full analysis at §E-§H below.
- **P4 (Scope narrowly rather than withhold entirely)**: inapplicable for the same reason P5's exception states — this is a coverage-breadth principle, not a tool against a subject-matter gate.
- **P5 (Narrow before withholding — "Exception: this hierarchy does not apply to Principle 3 concerns")**: explicitly does not govern here if P3 applies. Analyzed at §I.
- **P6 (Stability over novelty)**: not the operative concern — the underlying Civil Code provisions have been in force since 2021-01-01 and are not a recent ToS change; moot given the P3 outcome below.
- **P7 (CRC eligibility independent of Canonicalization Readiness)**: this claim references no canonical tool/provider identity (`provider_scope`/`tool_scope` both null), so this principle has no subject to attach to — consistent with the Taiwan claims' own finding (`CPR_029`, `CPR_030`).

Used `CPR_008` (WITHHELD NY consent claim) and `CPR_025` (APPROVED NY synthetic-performer claim) as **architectural precedent only** — the specific reasoning each applied to its own claim's subject matter, not as a rule that this claim inherits either outcome by analogy. `CPR_030` used as structural template for this artifact's format only.

**Disposition: PASS — policy independently re-derived, not assumed from precedent.**

## D. Educational utility

Genuinely positive, not manufactured as weak to justify withholding: a user who names China as the assessment jurisdiction and is unaware that (1) China protects portrait as a distinct named right from copyright in the underlying work; (2) voice is protected by extension under the same framework; (3) the protection is technology-neutral — AI face-swap/voice-cloning does not create a new right or a new exemption; (4) five narrow exceptions exist, not a general commercial/non-commercial carve-out; and (5) a copyright license to the underlying footage/recording does not itself authorize use of the depicted person's portrait or voice — would benefit from this awareness. This matches the same modest-but-genuinely-useful shape already approved for other permanently-hedged, dependency-bearing claims in this corpus (`CPR_008` §J's own reasoning, independently re-applied, not merely copied). **Educational usefulness is confirmed, but — per the task's own framing — this is a separate question from publication safety, resolved next.**

**Disposition: PASS (educational value), not dispositive on its own.**

## E. Project-specific boundedness — traced against current production code

Re-derived directly against `08_Platform/app/lib/bounded-interpretation/rules.ts` and `build-bounded-interpretation.ts`, not assumed from the claim's own governance text:

```
function hasGovernedProjectDependencies(match: BiResult): boolean {
  return match.unresolved_project_dependencies.length > 0
}
```

With exactly one dependency (`portrait_or_voice_content_present`), this is `true` — the claim reaches `relevant_applicability_unresolved` (Case 3B), rendered via `relevantApplicabilityUnresolvedWithContentSummary`/`buildRelevantApplicabilityUnresolvedContentBlocks` (`rules.ts` lines 365-405). The rendered shape, for this claim's `CATEGORY_LABELS.likeness` ("likeness, voice, or consent"), is: the governed `claimStatement` quoted **verbatim** (never paraphrased, never interpolated with user text) + `"This is relevant to likeness, voice, or consent, but based on what's been described here, there isn't enough project-specific information to determine how it applies to your specific project."` + the fixed bridge sentence to Commercial Assurance. There is no `humanContributionSentence`-equivalent echo mechanism for the `likeness` topic (that parameter is `null` for every call site outside the Copyright UAT H5 composition) — confirmed by direct read of `build-bounded-interpretation.ts`'s own call sites — so **no user statement of any kind is ever interpolated into the rendered output** for this claim.

Tested the exact adversarial statements named in the task against this real, fixed template:

| Adversarial statement | Effect on rendered output |
|---|---|
| "Everyone can tell it's her" | None — `claimStatement` is fixed; user text is never quoted or referenced |
| "I cloned the actor's voice" | None — same; and `portrait_or_voice_content_present` remains evidence-only, never set by a user assertion |
| "The client says they got permission" | None — `consent_from_depicted_person_confirmed` does not exist as a dependency (withdrawn at §7/8-REVISED); no mechanism anywhere converts a conversational consent claim into a resolved fact |
| "It's parody" | None — no Art. 1020-exception dependency exists; the fixed template cannot assert an exception applies |
| "It's commercially licensed" | None — the claim's own Prohibited Conclusions text explicitly forecloses treating license/copyright authorization as establishing portrait/voice-right clearance; no commercial-use gate or dependency exists in this claim at all |
| "The AI generated it, so it isn't really their likeness" | None — the proposition's own text and Prohibited Conclusions explicitly state AI-production status is irrelevant to which rule applies; no code path conditions BI output on an AI/non-AI distinction for this claim |

**None of these can become a legal finding, because the fixed Composition template has no mechanism to incorporate user free text for this claim's topic at all — the only text that ever appears is the pre-governed `claimStatement`, written and reviewed before this conversation ever happens.** This is necessary evidence for publication safety but — per the task's own framing — does not resolve Principle 3, which is a subject-matter gate independent of how well the architecture is bounded (§F below).

**Disposition: PASS on architectural boundedness — does not resolve Principle 3.**

## F. Principle 3 — the central question, applied independently and literally

`CRC-PUBLICATION-POLICY.md` Principle 3, read verbatim: *"A well-verified fact touching SI8's No List boundaries — likeness, voice cloning, deepfakes, political persuasion — gets more scrutiny, not less, regardless of verification strength. This is a gate, not a scope to narrow around."*

This review tests each of the three potentially-implicated named subjects against this claim's own actual legal predicate, not against the statute's own technology framing (which is explicitly neutral — that neutrality is a fact about the *law*, not a fact about whether the *subject matter* is publication-sensitive; these are different questions, and the task's framing is correct to insist they not be conflated).

**Likeness: YES.** Art. 1018 — the claim's own governed proposition — defines portrait right as attaching to "the recognizable external image of **a specific natural person**." This is not likeness-adjacent; it is a likeness right in the most literal sense available in this corpus — more directly a "likeness" claim, definitionally, than the NY sibling's "name, portrait, picture, likeness, or voice" statutory list, which at least names several distinct concepts. China's statute collapses to a single concept: recognizability of a specific real person's own image.

**Voice cloning: YES.** Art. 1023 para. 2 extends the full portrait-protection framework (Art. 1019's prohibition, Art. 1020's exceptions) to "a natural person's voice." The claim's own Source fact section quotes the Yin voice-cloning case's own recognizability test (timbre, tone, pronunciation style) and the SPC 2026 Opinion's Art. 4, which explicitly names using a person's "voice as training material" to "generate... a synthesized voice" as the governed fact pattern. This is squarely voice cloning as named in Principle 3 — arguably more squarely than the NY sibling, which addresses "voice" as one of five enumerated statutory terms without a dedicated voice-cloning case precedent in its own evidence base.

**Deepfake-adjacent: LIKELY YES.** The claim's own proposition states that SPC Opinion Art. 4 "confirms that these existing name-right, portrait-right, and voice-interest protections apply where generative AI is used, without the person's consent, to process a natural person's name or portrait, or to use their voice as training material, so as to generate an identifiable synthetic digital image or synthesized voice." The claim's own Source fact section additionally cites, as a corroborating (not load-bearing) fact pattern, the Beijing Internet Court AI-face-swap short-drama case — a face-swap dispute is, on its face, a deepfake fact pattern. The claim does not use the word "deepfake," but Principle 3's own text gates on *subject matter*, not on statutory vocabulary — exactly the discipline `CPR_025` itself established (*"GoalCategory is routing taxonomy; Principle 3 is keyed to substance"*) and the discipline the task explicitly instructs this review to apply (do not dilute the classification merely because the statute is technology-neutral).

**Political persuasion: not implicated.** No political content or persuasion fact pattern appears anywhere in this claim.

**This claim triggers two of the four Principle 3 subjects squarely (likeness, voice cloning) and a third with high confidence (deepfake-adjacent), and triggers them through the claim's own defining legal predicate, not incidentally.** No escape route named anywhere in Principle 3's own text, or in `CPR_025`'s own reasoning, applies: this claim's evidence is strong (irrelevant per P3's own "regardless of verification strength" clause); the BI ceiling is conservative (irrelevant — P3 is not an architecture-safety question, §E above already settles that separately); the dependency is evidence-only (irrelevant, same reason); Commercial Assurance exists downstream (irrelevant — CA's existence does not license CRC to carry sensitive subject matter unsupervised; see §J).

**Disposition: PRINCIPLE 3 APPLIES — gate triggered on likeness, voice cloning, and (with high confidence) deepfake-adjacent subject matter.**

## G. Comparison with `CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1` (CPR_008, WITHHELD)

`CPR_008` withheld the NY sibling **not** for evidence quality (Class A, unchanged), not for dependency handling (already correctly hedged), and not for runtime safety (independently proven) — **solely** because Principle 3's subject-matter gate applies "regardless of verification strength," and Principle 5's narrow-before-withhold default does not apply to Principle 3 concerns. Verification strength was never the operative variable in that decision.

Applying the same test to this claim, not by syllogism ("NY was withheld, therefore China must be withheld") but by independently re-checking whether the *same policy rationale* actually transfers: **it does, and more directly.** The NY statute names five enumerated terms ("name, portrait, picture, likeness, or voice") used "for advertising purposes or for the purposes of trade" — a real identifiable person's likeness, conditioned on a commercial-use gate. This claim's own statute (Art. 1018) defines its *entire subject matter* as "the recognizable external image of a specific natural person," with voice added by direct statutory cross-reference (Art. 1023 para. 2) and **no commercial-use gate at all** — the claim's own GOVERNANCE TREATMENT section states this is an "affirmative absence," confirmed by direct text search. A broader, ungated prohibition tied to the identical real-person-identifiability predicate is not a weaker Principle 3 case than NY's narrower, gated one — if anything it is a materially stronger one, because there is no commercial-use boundary narrowing the subject matter's reach the way NY's "advertising purposes or purposes of trade" condition does.

This claim's own pre-CPR governance text (the Adoption commit's `CRC Publication Scope: PENDING` narrative, FGR_025 §15) **independently anticipated exactly this conclusion**, stating the China claim sits on Principle 3 "arguably more centrally than its NY sibling." This review's own independent analysis (§F above) reaches that same conclusion by direct application of policy text, not by deferring to that anticipation.

**Disposition: THE SAME POLICY RATIONALE THAT WITHHELD THE NY CLAIM APPLIES HERE, WITH AT LEAST EQUAL FORCE.**

## H. Comparison with `CLAIM-NY-SYNTHETIC-PERFORMER-DISCLOSURE-001-v1` (CPR_025, APPROVED)

`CPR_025` approved publication of the NY § 396-b synthetic-performer claim specifically because its subject matter is a "statutorily-defined synthetic performer explicitly **not recognizable as any identifiable natural performer**" — a disclosure/labeling duty for wholly synthetic, admittedly non-real content, which `CPR_025` distinguished from the sibling likeness claim's "real, identifiable, living person's" subject matter. `CPR_025` was explicit that this distinction was claim-specific and did not hold Principle 3 inapplicable to synthetic performers generally, nor that any `likeness`-tagged claim is presumptively eligible.

**The distinguishing condition that enabled `CPR_025`'s APPROVE does not exist for this claim — it is definitionally the opposite.** This claim's entire legal predicate, independently re-verified at §B and §F above, is recognizability of a specific, real, identifiable natural person (Art. 1018's own defining text) and, for voice, identifiability "based on others' repeated or long-term listening" through timbre/tone/pronunciation style (the Yin case's own test, which the claim's own Source fact section quotes). There is no statutory non-identifiability condition anywhere in this claim's governed text, and none could be introduced without reopening Adoption and rewriting the proposition — which this review is instructed not to do (and has not done).

**Disposition: CPR_025's APPROVE RATIONALE DOES NOT TRANSFER — ITS DISTINGUISHING CONDITION IS THE EXACT INVERSE OF THIS CLAIM'S OWN SUBJECT MATTER.**

## I. Narrow-before-withhold (Principle 5)

Re-read directly: Principle 5's own text states its exception explicitly — *"this hierarchy does not apply to Principle 3 concerns. A sensitivity gate isn't resolved by finding a narrower phrasing; it's resolved by withholding or escalating to human review."* Since §F finds Principle 3 applies, Principle 5's narrow-before-withhold ladder (narrow → rewrite → withhold) does not govern this claim at all — stated plainly, not applied as a workaround.

No artificial narrowing was attempted or is being proposed: not portrait-only/voice-only, not non-AI-only, not informational-only, not face-swap-only, not voice-cloning-only. Any of these would require materially changing the governed proposition — a governance-reopening act, not a CPR-stage wording edit — and none is performed here.

**Disposition: PASS — Principle 5 confirmed inapplicable; no narrowing attempted.**

## J. Evidence strength vs. publication safety — kept explicitly separate

The evidence base for this claim is strong and authoritative: Class A primary sources (direct `curl` capture of the Supreme People's Court's own republication of the national Civil Code, byte-identical across two fetches ~29.5 minutes apart; the SPC 2026 Opinion's own full text plus companion press Q&A), independently corroborated by two cross-confirming National Court Case Database entries (the Yin voice-cloning case) and an official Beijing Internet Court announcement. This is at least as strong as, and arguably more deeply corroborated by case-level evidence than, the NY sibling's two-statute evidentiary base.

**This strength does not cure the Principle 3 restriction, and the withhold decision below must not be read as implying the proposition is weak, legally doubtful, or under-governed.** These are orthogonal axes, stated explicitly per Principle 3's own "regardless of verification strength" text and the task's own instruction: a well-evidenced claim can be withheld from the unsupervised CRC channel while remaining fully governed, Adopted, reviewer/Commercial-Assurance-scope knowledge — exactly the NY sibling's own current state.

**Disposition: EVIDENCE QUALITY CONFIRMED STRONG; EXPLICITLY NOT A FACTOR IN, AND DOES NOT OFFSET, THE §F FINDING.**

## K. Generic architecture

Confirmed no architecture change is required to implement either disposition. If this claim were ever APPROVED in a future reconsideration: production representation would use the existing, already-implemented `likeness` `GoalCategory`/exact-topic `lookupTopicClaims` mechanism, the same generic path the NY sibling and the synthetic-performer claim already share — no China-specific publication logic, no likeness-specific runtime suppression, no new Composition branch. Under today's WITHHOLD: the claim remains governed (Adopted, reviewer/Commercial-Assurance scope) and simply absent from Production Representation — no code of any kind is touched by this decision. Publication eligibility lives entirely in governed-knowledge metadata/lifecycle fields (`CRC Publication Scope`, `CRC Approver`, `CRC Decision Date`), never in ad hoc downstream filtering.

**Disposition: PASS — no architecture implication either way.**

## L. Discoverability

Confirmed unchanged: this claim remains explicit-goal-only reachable (§B above). No Track A reachability is added or proposed by this review. The claim's own governance record already found (at FGR stage) that the existing synthetic-content discovery trigger does not cover this claim's full technology-neutral proposition — that finding is preserved, not revisited, here.

**Disposition: PASS — explicit-goal-only status confirmed unchanged.**

## M. Commercial Assurance boundary (Domain L)

Re-checked directly against `08_Platform/app/app/admin/submissions/[id]/review/guidance.ts`'s own Domain L text (not accepted from the claim's own governance text alone):

> "DOMAIN L — LIKENESS & PERFORMER RIGHTS... the highest-liability domain... L01 — Watch specifically for faces, voices, and distinct physical personas. Do not rely on the submitter's declaration... L02 — Distinctness: A synthetic face that resembles no specific person is different from a synthetic face that resembles a specific identifiable person... L03 — If real person likeness is confirmed, a talent release or right of publicity license is required."

This is the correct boundary for what Commercial Assurance may separately examine that CRC never attempts: direct content review for recognizability (L01 — CRC has only self-report, and this claim's own dependency is evidence-only for exactly this reason); whether the specific voice/face is distinctly identifiable as a specific real person versus a generic synthetic figure (L02 — the Yin case's own recognizability test, which this claim's Source fact quotes); whether actual consent/release documentation exists, is authentic, and covers this use (L03 — the withdrawn `consent_from_depicted_person_confirmed` dependency's own evaluative judgments, now explicitly left to Commercial Assurance rather than represented as an LK dependency); whether an Art. 1020 exception applies to the specific project; and whether China jurisdiction genuinely attaches. Domain L remains the correct boundary regardless of this review's publication disposition — it is not used here as either an automatic reason to approve (CA exists, so CRC can say more) or to withhold (CA exists, so CRC should say less); it is simply confirmed as the unchanged downstream path for the project-specific facts this claim leaves open.

**Disposition: PASS — Domain L confirmed as the correct, unchanged Commercial Assurance boundary.**

## N. Publication disposition

**WITHHOLD FROM CRC.**

Not for evidence quality (§J — strong, Class A, multiply corroborated), not for dependency handling (§B, §E — a single, correctly evidence-only dependency, matching published-claim precedent), not for architectural boundedness (§E — the fixed Case 3B template cannot convert any tested adversarial user statement into a legal finding), and not for discoverability or Commercial Assurance concerns (§L, §M — both confirmed unchanged and correct). **Solely because Principle 3 is a categorical subject-matter gate, "regardless of verification strength," and this claim's own defining legal predicate — a statutory right turning on recognizability of a specific, real, identifiable natural person's portrait and, by direct statutory extension, voice — squarely implicates likeness and voice cloning, and plausibly deepfake-adjacent subject matter, as independently determined at §F.** The one precedent in this corpus that could have supplied an escape route (`CPR_025`'s non-identifiable-synthetic-performer distinction) is definitionally unavailable, because this claim's own subject matter is the exact inverse condition (§H). This claim's own governance record (FGR_025 §15, and the pre-CPR `CRC Publication Scope` text) already anticipated this outcome; this review independently reaches it by direct application of policy, not by deferring to that anticipation.

I am recording this as my reasoned recommendation for JD's ratification, following this repo's own established two-step governance pattern — not as a self-certified final human sign-off.

## O. Permitted scope / withholding rationale

No permitted scope — full withhold, not a narrowed partial publication (Principle 5's own exception forecloses that resolution path here, §I). Rationale: stated in §N. **Future reconsideration is not foreclosed** — Principle 3 is a heightened-scrutiny gate, not a permanent ban. What would legitimately trigger reconsideration: (1) a deliberate, PM-level Publication-Policy decision (not a per-claim CPR workaround) defining a bounded category of likeness-adjacent regulatory-awareness content CRC may carry; (2) an explicit, separate business decision by JD to accept this specific risk for this specific claim, made knowingly at the Principle-3 level. No runtime/dependency/questioning/Track-A change, and no amount of additional evidence corroboration, would ever be a legitimate trigger — Principle 3 isn't resolved by better engineering or stronger sourcing (§J).

## P. Required governance updates

The only required update to `GOVERNED-CLAIMS.md` is recording the withhold disposition, date, and approver inline in the claim's own `CRC Publication Scope` field (mirroring `CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1`'s own exact recording convention) and adding a "Full CRC Publication Review artifact" reference line. `CRC Approver`/`CRC Decision Date` remain `PENDING` per the established convention (§ above). No other field (`Lifecycle`, proposition, dependencies, applicability, evidence limitations, prohibited conclusions, Domain L reference, `CRC Candidate Statement`) is touched.

## Q. Change boundary

Expected changes from this governance-recording task: this CPR artifact (new file) + `GOVERNED-CLAIMS.md` publication-metadata fields only. No runtime, schema, fixture, `GoalCategory`, or any production code change of any kind. No Production Representation performed or authorized by this review. Not pushed, not deployed.

## R. Remaining risks

1. This WITHHOLD recommendation still needs JD's explicit ratification/recording (§P) — recorded as part of this same governance task, not a separate pending step.
2. The deepfake-adjacent classification at §F is "likely yes," not a certainty the way likeness/voice-cloning are — worth noting as a slightly softer leg of the three-subject finding, though the claim is already squarely gated on the other two independently, so this does not change the disposition.
3. If a future PM-level Publication-Policy decision explicitly defines a bounded likeness-adjacent regulatory-awareness category (§O item 1), this specific claim would be the natural first reconsideration candidate alongside its NY sibling — not pursued here.

## S. Recommended next milestone

None required to close this specific decision — it closes as WITHHOLD, pending JD's ratification (recorded in this same task). No Production Representation is recommended or authorized. This claim's CRC-publication branch should be considered closed unless Publication Policy itself changes (§O).

## T. APPROVE / WITHHOLD / HOLD

**WITHHOLD FROM CRC.**

--- END VERBATIM CRC PUBLICATION REVIEW ---
