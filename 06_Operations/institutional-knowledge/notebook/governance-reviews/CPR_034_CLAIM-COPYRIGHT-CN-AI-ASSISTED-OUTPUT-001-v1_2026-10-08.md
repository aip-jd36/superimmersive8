Title: CRC Publication Review #34 — CLAIM-COPYRIGHT-CN-AI-ASSISTED-OUTPUT-001-v1 (China AI-Assisted/Generated Content Copyrightability)

Reviewed object:
- `CLAIM-COPYRIGHT-CN-AI-ASSISTED-OUTPUT-001-v1` — `Lifecycle: Adopted` 2026-10-08 (Adoption Approver: JD (PM), following `FGR_028`). This review treats the Adoption entry and `FGR_028` as governance evidence and prior findings, not as automatic publication authority — publication is an independent, second judgment per `CRC-PUBLICATION-POLICY.md` §Purpose and Principle 1, made specifically about this claim. FGR_028's own §18/§19 `CRC ELIGIBLE` recommendation and the Adoption entry's own disclaimer are both treated as advisory inputs to this review, not as its conclusion.

Review date: 2026-10-08

Artifact type: CRC Publication Review (CPR) — governs `CRC Eligible` only, per `CRC-PUBLICATION-POLICY.md` §Scope. Does not touch Adoption, Retrieval, Bounded Interpretation, Composition, or Production Representation.

--- BEGIN VERBATIM CRC PUBLICATION REVIEW ---

# China AI-Assisted/Generated Content Copyrightability — CRC Publication Review

## 1. Adoption-integrity check

Read the actual `GOVERNED-CLAIMS.md` entry for `CLAIM-COPYRIGHT-CN-AI-ASSISTED-OUTPUT-001-v1` directly (lines 5837-5991) and `FGR_028` in full, side by side. Confirmed field-by-field correspondence, no divergence:

- Proposition text: the Adopted entry's "Claim proposition" field matches FGR_028's own proposed text in substance; the national-uncertainty sentence ("There is no uniform national rule on AI-content copyrightability in China at this time") is present as the proposition's own final sentence, not relegated to evidence notes, a footnote, or the "Prohibited conclusions" field.
- Applicability: `[{fact: 'jurisdiction', operator: 'equals', value: 'China'}]`, request-scope only, identical to FGR_028.
- Dependency: `['human_contribution_description']` (D1), identical to FGR_028, with the Adopted entry's own inline governance comment independently re-stating the D1 derivation.
- Evidence limitations / prohibited conclusions: the Adopted entry's 11-item prohibited-conclusions list is a faithful, complete restatement of the candidates the user's own prompt explicitly named as un-governable (§E/§G of the Adoption and CPR milestone briefs), plus the claim-specific additions (SPC Implementation Plan did not resolve the question; Wuhan cases are not binding nationwide).
- `CRC Publication Scope: PENDING`, `CRC Approver: PENDING`, `CRC Decision Date: PENDING` — confirmed no CRC eligibility was decided at Adoption, consistent with Adoption's own explicit disclaimer text and with the Known-architecture-debt entry stating this is "NOT adopted or decided by this [Adoption] milestone."

**No material divergence found. Adoption faithfully reflects FGR_028 — proceeding, not repairing.**

**Disposition: PASS.**

## 2. Evidence/provenance re-verification

Confirmed directly against `evidence-captures/china-copyrightability/MANIFEST.md` and `MANIFEST-ADDENDUM-2026-10-08.md`: the claim's "Source references" field cites exactly the files recorded in both manifests (Implementation Plan §(九); SPC press Q&A 2026-09-07; SPC IP Tribunal explainer 2026-09-09; SPC AI-disputes Opinion full text; two Wuhan case reports), each with the SHA-256/provenance discipline this corpus's Evidence Capture SOP requires. No source is re-classified or upgraded by this review: the two Wuhan reports remain Class D-adjacent (named-outlet case reports, not judgment text); the Implementation Plan remains official policy/methodology, not a judicial interpretation; only the two independent SPC explanatory statements and the Opinion's own full text are Class A.

**Disposition: PASS.**

## 3. CRC Publication Policy — principle-by-principle application

Applied `CRC-PUBLICATION-POLICY.md` honestly to this specific claim, not by inheritance from `CPR_029`'s Taiwan disposition or `CPR_031`'s China Likeness disposition:

| Principle | Finding |
|---|---|
| 1. Verified is necessary, not sufficient | This review is that independent second judgment, made specifically about this claim — not inferred from `Lifecycle: Adopted`, and not inferred from FGR_028's own advisory `CRC ELIGIBLE` recommendation. |
| 2. Preserve meaning, don't just minimize caveats | The draft CRC Candidate Statement already states the national-uncertainty sentence as its own closing sentence, structurally mirroring the full proposition — the one simplification found (omitting the two SPC statements' exact dates, 2026-09-07/2026-09-09, in favor of "separate 2026 official explanatory publications") does not change what makes the statement true: "twice, independently, officially stated" survives; only the calendar precision is dropped. No load-bearing caveat is stripped. |
| 3. Subject sensitivity outweighs confidence | SI8's No List (`CLAUDE.md`) enumerates: celebrity likeness, voice cloning, explicit IP imitation, political persuasion, deepfakes/deceptive content, adult content. This claim's subject — whether AI-assisted *output* qualifies for copyright protection under Chinese law — does not touch any of these categories; it concerns legal protection of a work, not any living person's identity, voice, or image. This is independently re-derived on this claim's own subject matter, not inherited from Taiwan/US copyrightability (`CPR_028`/`CPR_029`, same conclusion, same independent reasoning) and not inherited from the unrelated China Likeness domain (`CPR_031`, WITHHELD — a structurally different subject: real identifiable-person portrait/voice appropriation, which *is* No-List-adjacent). **Principle 3 does not gate this claim.** |
| 4. Scope narrowly rather than withhold entirely | Already narrowly scoped: one jurisdiction, one dependency, explicit-goal-only, Case 3B ceiling, and an additional structural narrowing unique to this claim — the national-uncertainty sentence itself narrows what CRC may imply about the Wuhan outcomes' generality. No broader withholding is warranted. |
| 5. Narrow before withholding | N/A — Principle 3 (the sole exception) does not apply (row above); no other uncertainty triggers this hierarchy. |
| 6. Stability over novelty | This principle concerns the freshness of a *platform ToS change*, by its own text — not directly analogous to "is the underlying national legal question settled." Applying it on its own terms: what this claim actually publishes is not a prediction of what Chinese law will become, but a *stable, twice-independently-confirmed fact about the law's current unsettled status* (SPC statements dated 2026-09-07 and 2026-09-09, both current and unretracted as of this review, 2026-10-08). The instability belongs to the underlying Chinese legal question; SI8's own characterization of that instability is itself settled, confirmed evidence, not a fresh or volatile claim. This principle is satisfied, not implicated as a reason to delay. |
| 7. CRC eligibility independent of Canonicalization Readiness | N/A — `provider_scope: null`/`tool_scope: null`; this claim references no canonical tool/provider identity, so this principle has no subject to attach to (identical finding to `CPR_029` §3 row 7 for the Taiwan sibling). |

**"Applying this to a specific row" 7-point checklist:** (1) can be said plainly without losing nuance — yes, the proposition's own three-part structure (factors directive / Wuhan fact-specific outcomes / SPC non-decision) already does this; (2) No-List-adjacent — no; (3) narrower-than-full-offering disclosure — N/A, not a tool-row claim; (4) would a user acting on this alone be reasonably informed — yes, the closing sentence prevents the single most likely misreading (treating Wuhan as a national rule); (5) is the underlying term new/unsettled — the underlying *Chinese national rule* is unsettled, which is exactly the fact being published, not concealed; (6) compound-row treatment — N/A, single claim; (7) non-null `tool_scope` — no, N/A.

**Publication Test** (`CRC-PUBLICATION-POLICY.md` §Publication Test): the draft CRC Candidate Statement — *"...Particular Chinese courts (reported Wuhan decisions) have found copyright protection on this basis in specific, fact-specific cases. However, the Supreme People's Court has twice stated, in separate 2026 official explanatory publications, that views on the copyrightability of AI-generated content remain divided and that its own AI-disputes Opinion does not establish a rule on this question — there is no uniform national rule on AI-content copyrightability in China at this time."* — is a faithful, hedged compression of the captured primary/official evidence. A prospect's legal team quoting this back would be quoting an accurate summary of a genuinely unsettled area of Chinese law, correctly flagged as unsettled, not an SI8-invented legal conclusion. **Passes the Publication Test.**

**Disposition: PASS — no principle blocks publication.**

## 4. Educational utility

The proposition lets CRC explain, without ever needing to determine whether a *specific* user's contribution meets any Chinese threshold: (a) the kind of factors Chinese courts have been directed to examine (instructions, selection, modification); (b) that particular courts have, on particular facts, found protection; (c) that this is explicitly not a settled national rule, so the user cannot rely on the Wuhan outcomes as precedent. This is genuinely useful commercial-readiness education for a user planning China distribution/litigation exposure — it tells them the shape of the open legal question without pretending to resolve it.

**Disposition: PASS.**

## 5. Dependency publication safety — independently re-verified from current code

Re-read `build-bounded-interpretation.ts` directly, myself, at this review (not citing FGR_028's or the Adoption entry's own quotations):

```
function hasGovernedProjectDependencies(match: BiResult): boolean {
  return match.unresolved_project_dependencies.length > 0
}
function needsApplicabilityHedge(match: BiResult): boolean {
  return hasGovernedProjectDependencies(match) || hasUnresolvedApplicability(match)
}
function shouldIncludeHumanContributionSentence(category, matches, humanContributionDescription): boolean {
  const concernsHumanContributionGoal = category === 'copyright_ownership' || category === 'copyrightability'
  const matchedClaimCarriesDependency = matches.some((m) => m.unresolved_project_dependencies.includes(HUMAN_CONTRIBUTION_DEPENDENCY))
  const contributionConfirmed = humanContributionDescription.state === 'confirmed'
  return concernsHumanContributionGoal && matchedClaimCarriesDependency && contributionConfirmed
}
```

Byte-identical to the code `CPR_029` §5 traced for the Taiwan sibling three weeks earlier — confirmed unchanged by direct re-read, not assumed stable. Since this claim carries one dependency, `hasGovernedProjectDependencies` evaluates `true` unconditionally and permanently; `needsApplicabilityHedge` is therefore always `true`; `directly_relevant` is **structurally unreachable**. `shouldIncludeHumanContributionSentence` is a separate boolean gating only one additional fixed echo sentence — it never reads or mutates `unresolved_project_dependencies`, and it cannot cause a transition toward `directly_relevant`. Also confirmed directly against `dependency-askability.ts`: `DEPENDENCY_TREATMENTS` has exactly one entry, `human_contribution_description: { treatment: 'askable_in_crc' }`, handled entirely by the separate, unchanged `human-contribution-clarification.ts` module (confirmed by that file's own header comment, which explicitly excludes this dependency from the newer generic `generic_acquisition` readiness path).

**The dependency's function is exactly and only bounded contextualization — never resolution of the copyrightability standard, and never a route to classifying contribution as "substantial," "creative enough," or legally sufficient.**

**Disposition: PASS — dependency publication-safe, independently re-confirmed from source.**

## 6. Askability

`human_contribution_description` is the sole pre-existing, already-approved `askable_in_crc` registry entry (confirmed §5). No new entry, no new question, no change proposed by this CPR. None of "is your contribution sufficiently creative," "are you the author," "do you own the copyright," or "would a Chinese court recognize protection" is, or could become, askable under this claim.

**Disposition: PASS.**

## 7. Bounded Interpretation ceiling re-verification (safety-critical gate)

Directly re-derived from §5's code trace: this claim will render, whenever its explicit `copyrightability` goal is matched and the `jurisdiction equals China` gate is satisfied, via `relevant_applicability_unresolved` (Case 3B) — the governed proposition quoted verbatim, the fixed Case-3B hedge, the Commercial Assurance bridge sentence, and (only if `human_contribution_description` happens to already be confirmed) the additional fixed echo sentence. **It cannot reach `directly_relevant` under current architecture, confirmed by code.** Tested every candidate stronger conclusion against the actual fixed-template code (`rules.ts`'s Case-3B/H5 templates, unchanged, not touched by this review): output is/is not protected; contribution is legally sufficient; user is the author; user/employer/client owns economic rights; infringement occurred/did not occur; third-party rights cleared; China jurisdiction legally attaches; commercial use cleared — none is reachable from the fixed template text or from this claim's own proposition text.

**Disposition: PASS — BI ceiling verified safe by direct code trace.**

## 8. Applicability safety

`AssessmentJurisdictionMention`'s type definition (`types/interview-engine.ts`) is a flat record with no field, hierarchy, or mechanism capable of asserting legal attachment, domicile, distribution, or governing-law status — the same structural guarantee `CPR_029` §8 confirmed for the Taiwan sibling, unchanged by this review since the type is generic and claim-independent. Nothing about selecting China as assessment jurisdiction, mentioning an AI tool, or confirming `human_contribution_description` has any code path into a legal-applicability determination.

**Disposition: PASS — applicability structurally confined to request-scope.**

## 9. Ownership/authorship boundary

The Adopted proposition's own prohibited-conclusions list explicitly forecloses concluding that the user is the author or that any party owns resulting economic rights in a specific case. No code path (BI, Composition, or the echo sentence) could convert the general factors-directive into an affirmative project-specific authorship or ownership finding.

**Disposition: PASS.**

## 10. National-rule / lower-court boundary (claim-specific gate, no Taiwan analogue)

This is the central question for this claim, with no direct precedent in the Taiwan/US siblings (both of which rest on settled national positions). Traced explicitly: the proposition's three components (factors directive; Wuhan fact-specific outcomes; SPC non-decision) are joined as one connected statement, with the SPC non-decision as the grammatically final, un-droppable clause. Since Composition (per §5/§7) only ever renders the claim's `candidate_statement` verbatim plus fixed, claim-independent boilerplate, there is no code path that could render the first two components while truncating the third — a faithful rendering cannot drop the final sentence without also failing to render the claim at all (the statement is rendered as one string, not clause-by-clause). This is a property of how `candidate_statement` is stored and rendered (one field, rendered whole), not a new safety mechanism invented for this review.

**Disposition: PASS — national uncertainty cannot be selectively dropped by current rendering mechanics.**

## 11. Explicit-vs-discovered

Confirmed no `TopicRelationship` targets `copyrightability`'s China entry specifically, and no Track A trigger exists anywhere referencing this claim or a China-specific fact. This claim is explicit-goal-only, reached via the existing, unmodified exact-topic path — identical in shape to `CLAIM-COPY-001/002/003-v1` and `CLAIM-COPYRIGHT-TW-AI-ASSISTED-OUTPUT-001-v1`. Nothing about China jurisdiction, an AI tool mention, or the dependency fabricates a `UserGoal`.

**Disposition: EXPLICIT ONLY CONFIRMED.**

## 12. Provider/tool neutrality

`provider_scope: null`, `tool_scope: null`, confirmed directly in the Adopted entry. The proposition concerns Chinese copyright/judicial policy generally and names no AI tool or provider. No provider-specific behavior is introduced.

**Disposition: PASS.**

## 13. Evidence/refresh sufficiency

The `evidence-captures/china-copyrightability/` package (6 files across two capture passes + `MANIFEST.md` + `MANIFEST-ADDENDUM-2026-10-08.md`) satisfies the existing Evidence Capture SOP's refresh-readiness baseline. The "not found in the evidence searches" formulation for the Wuhan judgment texts/docket numbers is preserved exactly in both the Adopted entry and this review (§2 above) — not upgraded to an assertion that no such judgment exists.

**Disposition: PASS.**

## 14. Fail-closed behavior

Traced the three possible states: (a) China jurisdiction unresolved/unconfirmed → excluded via the existing, unmodified applicability evaluator (never reaches a matched result); (b) China jurisdiction confirmed, `human_contribution_description` unconfirmed → Case 3B, plain form; (c) China jurisdiction confirmed, `human_contribution_description` confirmed → Case 3B plus the echo sentence. No fourth state exists in which this claim's rendering silently strengthens toward `directly_relevant` or toward any prohibited conclusion.

**Disposition: PASS.**

## 15. Production representability (non-blocking to this CPR, recorded for the next milestone)

Every field this claim requires already exists on the current, unmodified `TopicClaim` type and is already populated with this exact shape for the Taiwan/US siblings. A future Production Representation milestone would require a pure data addition. **However**, `jurisdiction == China` is a genuine first-of-kind canonical value for `JURISDICTION_VALUE_ALIASES` — confirmed by direct grep, zero existing China/PRC entries. This is explicitly **not** a CPR blocker (CRC eligibility and production/runtime reachability are independent judgments per Policy Principle 7) but is recorded here as the exact gate the next milestone — `PRODUCTION-READINESS-CHINA-AI-ASSISTED-COPYRIGHTABILITY-1` — must independently clear: it must prove the live extraction → canonicalization → applicability path for a real user-stated China/Chinese-jurisdiction mention, not merely a deterministic test that constructs the canonical `'China'` value directly. This is the identical failure mode `CRC-JURISDICTION-CANONICALIZATION-REPAIR-1` (2026-10-07) found and fixed for the EU claims — named explicitly here so it is not silently repeated.

**Disposition: PASS for CRC-eligibility purposes; first-of-kind jurisdiction canonicalization flagged as the next milestone's own required gate, not this one's.**

## 16. Comparison with China Likeness withholding (why a different result is warranted)

`CLAIM-LIKENESS-CN-PORTRAIT-VOICE-CONSENT-001-v1` was WITHHELD at `CPR_031` because its subject — a real, identifiable natural person's portrait/voice appropriation without consent — is itself a No-List-adjacent category (likeness, voice cloning) under Policy Principle 3, a hard gate that narrow-before-withhold does not cure. This claim's subject is structurally different: whether AI-assisted *output* qualifies for copyright *protection*, a question about a work's legal status, not about any living person's identity or consent. No identifiable person, voice, or image is implicated anywhere in this claim's proposition, evidence, or prohibited-conclusions list. The two claims reach different Principle 3 outcomes because they concern different subjects, not because of any inconsistency in how Principle 3 was applied — confirmed by independently re-deriving Principle 3 on this claim's own terms (§3 row 3) rather than reasoning from either sibling's outcome.

## 17. Consultative Composition interaction

No domain-specific Composition code exists or is proposed for this claim — it renders through the identical, generic, already-safety-proven Case-3B pathway the Taiwan/US siblings use (§5/§7). No materially-unsafe semantic strengthening is possible under current architecture. Non-blocking observation (Composition debt, not a CPR blocker): once Production-Represented, this claim's statement will be long and three-part; whether Consultative Composition's general presentation quality (a separate, active workstream) renders it in a maximally readable way is a prose-quality question for that later workstream, not a safety question for this review.

## 18. CRC / Commercial Assurance boundary

CRC may explain what the Implementation Plan directs courts to consider, that particular Wuhan courts reached particular fact-specific outcomes, and that the SPC has not settled the national question. CRC may not determine whether a specific user's project satisfies any Chinese human-creative-contribution standard, nor whether Chinese jurisdiction legally attaches to a specific project. A human-reviewed Commercial Assurance Assessment remains the higher-assurance path for those project-specific facts — stated explicitly in the claim's own "Prohibited conclusions" field and preserved by this review.

## 19. Minimum semantic requirements for future Production Representation

If a future Production Representation milestone represents this claim, the fixture's `crc_candidate_statement` must preserve, verbatim or by faithful equivalent: (a) the case-specific nature of the Wuhan outcomes ("in specific, fact-specific cases"); (b) the relevance of human instructions/selection/modification per the Implementation Plan; (c) the SPC's own twice-stated non-decision as the statement's own closing, inseparable clause; (d) that this is not a uniform national rule. The project-specific conclusion ceiling and Commercial Assurance boundary are already handled generically by the fixed Case-3B template (§5/§7/§18) and do not need restating in this claim's own statement text, matching the Taiwan sibling's own pattern exactly.

## 20. Architecture-drift assessment

Tested against every listed pattern: no China-specific orchestration; no jurisdiction→fabricated UserGoal; no China-specific `copyrightability` category/topic (reuse confirmed); no China-specific dependency code (reuses the identical existing mechanism, category-gated not claim-gated); no domain-specific Retrieval/BI/Composition; no human-creativity sufficiency classifier; no evidence-only self-attestation; no Track A without separate governance; no runtime legal research performed by this CPR (§O of the milestone brief); no China-specific refresh machinery; no jurisdiction alias/canonicalization change (explicitly deferred to the next milestone, §15). None found.

**Disposition: PASS.**

## 21. Adversarial review

| Attack | Finding |
|---|---|
| Adoption silently diverges from FGR_028 | Not found — field-by-field correspondence confirmed directly (§1) |
| National uncertainty relegated to a footnote | Not found — it is the proposition's own final sentence, and rendering mechanics cannot drop it selectively (§10) |
| Principle 3 applies (inherited from China Likeness) | Not found — independently re-derived on this claim's own subject matter; the two claims' subjects are structurally different (§3 row 3, §16) |
| `human_contribution_description` treated as sufficiency-resolving | Not found — re-verified directly from current source, byte-identical to the Taiwan trace (§5) |
| `directly_relevant` reachable | Not found — structurally unreachable given the non-empty dependency array (§7) |
| Jurisdiction gate implies legal attachment | Not found — the type itself has no field capable of expressing that stronger claim (§8) |
| Wuhan cases promoted to binding/national precedent | Not found — prohibited-conclusions list explicitly forecloses this; proposition frames them as fact-specific (§10) |
| Evidence tier silently upgraded | Not found — Class D-adjacent sources remain so; "not found in the evidence searches" phrasing preserved (§2/§13) |
| Production representation requires new architecture | Not found — pure data addition once first-of-kind jurisdiction canonicalization is separately validated (§15) |

**No unresolved substantive defect found.**

## 22. Final disposition

**APPROVE FOR CRC PUBLICATION.** Every review point (1-20) passes on this review's own independent re-derivation, including a from-scratch re-trace of the safety-critical BI-ceiling code (§5/§7), the jurisdiction-gate type definition (§8), and an explicit, non-mechanical Principle 3 analysis distinguishing this claim from the unrelated, WITHHELD China Likeness domain (§3 row 3, §16). This disposition governs `CRC Eligible` only — it does not itself constitute Production Representation, which remains a separate, later, explicitly-authorized milestone that must first clear the first-of-kind China jurisdiction-canonicalization gate named in §15.

--- END VERBATIM CRC PUBLICATION REVIEW ---
