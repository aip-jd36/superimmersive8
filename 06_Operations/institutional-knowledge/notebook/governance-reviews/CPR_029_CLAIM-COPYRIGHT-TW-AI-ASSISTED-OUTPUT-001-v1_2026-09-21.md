Title: CRC Publication Review #29 — CLAIM-COPYRIGHT-TW-AI-ASSISTED-OUTPUT-001-v1 (Taiwan AI-Assisted Output Copyrightability)

Reviewed object:
- `CLAIM-COPYRIGHT-TW-AI-ASSISTED-OUTPUT-001-v1` — `Lifecycle: Adopted` 2026-09-21 (Adoption Approver: JD (PM), following `FGR_023`). This is the first Taiwan-jurisdiction claim to reach CRC Publication Review in this corpus. This review treats the Adoption entry and `FGR_023` as governance evidence and prior findings, not as automatic publication authority — publication is an independent, second judgment per `CRC-PUBLICATION-POLICY.md` §Purpose and Principle 1, made specifically about this claim.

Review date: 2026-09-21

Artifact type: CRC Publication Review (CPR) — governs `CRC Eligible` only, per `CRC-PUBLICATION-POLICY.md` §Scope. Does not touch Adoption, Retrieval, Bounded Interpretation, Composition, or production representation.

--- BEGIN VERBATIM CRC PUBLICATION REVIEW ---

# Taiwan AI-Assisted Output Copyrightability — CRC Publication Review

## 1. Adoption-integrity check (Task A)

Read the actual `GOVERNED-CLAIMS.md` entry for `CLAIM-COPYRIGHT-TW-AI-ASSISTED-OUTPUT-001-v1` directly (lines 4725-4847) and `FGR_023` in full, side by side. Confirmed field-by-field correspondence, no divergence:

- Proposition text: identical between the Adopted entry's "Claim proposition" field and FGR_023 §18's proposed contract, verbatim.
- Conditionality preserved: "may be eligible" / "is not eligible" throughout, never "is protected" / "is not protected."
- Applicability: `[{fact: 'jurisdiction', operator: 'equals', value: 'Taiwan'}]`, identical in both.
- Dependency: `['human_contribution_description']`, identical in both, with the Adopted entry's own inline governance comment independently re-stating (a third time, per its own text) the same D1 derivation FGR_023 §5 performed.
- Evidence limitations / prohibited conclusions: the Adopted entry's list is a faithful, complete restatement of FGR_023 §6's tested prohibited-conclusion set, including the Art. 11/12 ownership exclusion and the third-party/training-data exclusion.
- `CRC Publication Scope: PENDING`, `CRC Approver: PENDING`, `CRC Decision Date: PENDING` — confirmed no CRC eligibility was decided at Adoption, consistent with Adoption's own explicit disclaimer text.

**No material divergence found. Adoption faithfully reflects FGR_023 — proceeding, not repairing.**

**Disposition: PASS.**

## 2. Evidence/provenance re-verification (Task A, evidence prong)

Independently recomputed SHA-256 for both captured files (third independent recomputation this week, after the evidence-capture-gate milestone and FGR_023 itself):
- `tipo-1140522c_20260921T031630Z.html` → `c69ece034aa6da5856598d3729c4c45fc7f2e8feebc8bfa6996fbb1f0d7317c6` — matches `MANIFEST.md` and `GOVERNED-CLAIMS.md`'s own recorded value.
- `moj-copyright-act-J0070017_20260921T031630Z.html` → `1b7e5f5891aa069035e27055b4fa16077235e431f3da59a6de4464edea50be85` — matches.

**Disposition: PASS.**

## 3. CRC Publication Policy — principle-by-principle application (Task B)

Applied `CRC-PUBLICATION-POLICY.md` honestly to this specific claim, not by inheritance from `CPR_027`/`CPR_028`'s own dispositions:

| Principle | Finding |
|---|---|
| 1. Verified is necessary, not sufficient | This review is that independent second judgment, made specifically about this claim — not inferred from `Lifecycle: Adopted`. |
| 2. Preserve meaning, don't just minimize caveats | The proposition already uses conditional wording ("may be eligible") and discloses the Art. 11/12 exception as a load-bearing caveat, not a stripped one. |
| 3. Subject sensitivity outweighs confidence | SI8's No List (`CLAUDE.md`) enumerates: celebrity likeness, voice cloning, explicit IP imitation, political persuasion, deepfakes/deceptive content, adult content. Copyrightability of AI-assisted output is not named and does not fall within any of these categories on its own terms — same conclusion independently reached for `CLAIM-COPYRIGHT-US-THIRD-PARTY-OUTPUT-001-v1` at `CPR_028`, re-derived here rather than assumed to transfer. **Principle 3 does not gate this claim.** |
| 4. Scope narrowly rather than withhold entirely | Already narrowly scoped: one jurisdiction, one dependency, explicit-goal-only, Case 3B ceiling — no broader withholding is warranted or being considered. |
| 5. Narrow before withholding | N/A — no uncertainty triggering this hierarchy was found; Principle 3 (the sole exception to this hierarchy) does not apply (row above). |
| 6. Stability over novelty | TIPO's substantive position has been consistent since at least 2021 through the directly-verified 2025-05-22 letter (independently confirmed at the deep-dive stage); the statute is unamended; the 2026 draft Guidelines remain non-operative and are not relied upon. This is stable, settled guidance, not a freshly-changed term. |
| 7. CRC eligibility independent of Canonicalization Readiness | N/A — this claim has `provider_scope: null`/`tool_scope: null`; it references no canonical tool/provider identity at all, so the canonicalization-readiness prerequisite has no subject to attach to. |

**"Applying this to a specific row" 7-point checklist:** (1) can be said plainly without losing nuance — yes, the proposition itself already does this; (2) No-List-adjacent — no; (3) narrower-than-full-offering disclosure — N/A (not a tool-row claim; scope narrowness is already handled by the explicit prohibited-conclusions list); (4) would a user acting on this alone be reasonably informed — yes, the proposition's own express reservation of sufficiency/disputes to judicial determination, paired with the Domain I/Commercial Assurance bridge, keeps the user correctly informed of what remains unresolved; (5) is the underlying term new/unsettled — no, settled since 2021; (6) compound-row treatment — N/A, single claim; (7) non-null `tool_scope` — no, `tool_scope: null`, the Tool-Scoped Claims Matrix-coexistence check does not apply.

**Publication Test** (`CRC-PUBLICATION-POLICY.md` §Publication Test): the draft CRC Candidate Statement — *"Under Taiwan copyright law, AI-assisted output may be eligible for copyright protection where a human exercised genuine creative input, using AI merely as a tool; output generated entirely by AI with no human creative input is not eligible. Ownership of a protected work is a separate question governed by Taiwan Copyright Act Articles 11 and 12."* — is a faithful, hedged restatement of TIPO's own official position, independently verified against the raw captured text. A prospect's legal team quoting this back would be quoting an accurate paraphrase of a real government interpretation, not an SI8-invented legal opinion. **Passes the Publication Test.**

**Disposition: PASS — no principle blocks publication.**

## 4. Educational utility (Task C/D)

The proposition lets CRC explain, without ever needing to determine whether a *specific* user's contribution meets Taiwan's threshold: (a) the general legal framework (human creative contribution matters; AI-only generation does not qualify); (b) that ownership is a distinct question from copyrightability; (c) that concrete disputes are reserved to courts. This is genuinely useful commercial-readiness education — a user planning Taiwan distribution learns *what the relevant legal question is* without CRC pretending to answer it for their specific project.

**Disposition: PASS.**

## 5. Dependency publication safety — independently re-verified from current code, not cited from FGR_023 (Task D/E)

Re-read `build-bounded-interpretation.ts` directly, myself, at this review (not relying on FGR_023's or the Adoption entry's own quotations):

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

Confirmed directly: `hasGovernedProjectDependencies` is a pure, static array-length check — `unresolved_project_dependencies` is never mutated, cleared, or conditionally shortened anywhere in this file or in `assemble-result.ts` based on `ProjectFacts` state. Since `CLAIM-COPYRIGHT-TW-AI-ASSISTED-OUTPUT-001-v1` carries one dependency, `hasGovernedProjectDependencies` evaluates `true` unconditionally, forever, for this claim — `needsApplicabilityHedge` is therefore also always `true`, and the `directly_relevant` branch (reached only when every matched claim for a goal returns `needsApplicabilityHedge === false`) is **structurally unreachable** for this claim under current architecture. `shouldIncludeHumanContributionSentence` is a wholly separate boolean, consumed only to decide whether one additional fixed sentence is appended — it does not read or write `unresolved_project_dependencies`, does not touch `BoundedInterpretation.status`, and cannot cause a transition toward `directly_relevant`.

**The dependency's function is exactly and only bounded contextualization (echoing the user's own self-reported description, immediately capped by the fixed "CRC can't determine... legal threshold" sentence) — never resolution of the copyrightability standard.** No code path anywhere lets its presence, confirmation, or content authorize CRC to conclude sufficient/insufficient creativity, existence/non-existence of copyright, or anything about ownership.

**Disposition: PASS — dependency publication-safe, independently re-confirmed from source, not from citation.**

## 6. Askability (Task F)

Re-confirmed directly against `dependency-askability.ts`: `human_contribution_description` is the sole pre-existing, already-approved `askable_in_crc` registry entry, handled by the dedicated `human-contribution-clarification.ts` module. No new entry, no new question, no change proposed or required by this CPR. None of "is your contribution sufficiently creative," "are you the author," "do you own the copyright," or "would a Taiwan court recognize protection" is, or could become, askable under this claim.

**Disposition: PASS.**

## 7. Bounded Interpretation ceiling re-verification (Task E/G — the safety-critical gate)

Directly re-derived from §5's code trace: this claim will render, whenever its explicit `copyrightability` goal is matched and the `jurisdiction equals Taiwan` gate is satisfied, via `relevant_applicability_unresolved` (Case 3B) — the governed proposition quoted verbatim, the fixed Case-3B hedge, the Commercial Assurance bridge sentence, and (only if `human_contribution_description` happens to already be confirmed) the additional fixed H5 echo sentence. **It cannot reach `directly_relevant` under current architecture, confirmed by code, not assumed.** Per this milestone's own explicit instruction, since the architecture does *not* permit the conclusion to strengthen, CRC eligibility is not required to fail on this ground.

Tested every listed candidate stronger conclusion against the actual fixed-template code (`rules.ts`'s Case-3B/H5 templates, unchanged, not touched by this review): output is/is not protected; contribution is legally sufficient; user is the author; user/employer/client/commissioning-party owns economic rights in a specific case; infringement occurred/did not occur; third-party rights cleared; commercial use cleared — none is reachable from the fixed template text.

**Disposition: PASS — BI ceiling verified safe by direct code trace.**

## 8. Applicability safety (Task F/H)

Re-read `AssessmentJurisdictionMention`'s type definition directly (`types/interview-engine.ts`): a flat record (`mention_id`, `value`, `confidence`, `source_turn`, `source_statement`, `superseded_by`) with **no field, hierarchy, or mechanism anywhere capable of asserting legal attachment, domicile, distribution, or governing-law status** — it can only ever represent "the user stated/mentioned this jurisdiction value." This is a structural, not merely documentary, guarantee that Adoption's own "request-scope only, never legal-attachment" framing is accurate — the type itself cannot express the stronger claim even if something tried. Nothing in Traditional Chinese language selection, an AI-tool mention, or the `human_contribution_description` dependency has any code path into jurisdiction determination.

**Disposition: PASS — applicability structurally confined to request-scope.**

## 9. Ownership boundary (Task G/J)

The Adopted proposition's own text states the Art. 11/12 exception as a limitation ("does not automatically follow from the copyrightability determination alone"), and the prohibited-conclusions list explicitly forecloses concluding that the user, an employer, a client, or a commissioning party owns economic rights in any specific case. Confirmed no code path (BI, Composition, or the H5 sentence) could convert this disclosed limitation into an affirmative ownership finding.

**Disposition: PASS.**

## 10. Third-party-rights boundary (Task H)

TIPO letter para 3 (training-data/substantial-similarity infringement) remains excluded from this claim's proposition and evidence set, recorded only as a future-candidate note in both `FGR_023` and the Adopted entry's own "Related" field. No infringement or third-party-clearance conclusion is reachable from this claim.

**Disposition: PASS.**

## 11. Explicit-vs-discovered (Task I/K)

Confirmed no `TopicRelationship` targets `copyrightability`'s Taiwan entry specifically, and no Track A trigger exists anywhere referencing this claim or a Taiwan-specific fact. This claim is explicit-goal-only, reached via the existing, unmodified exact-topic path — identical in shape to `CLAIM-COPY-001/002/003-v1`. Nothing about Taiwan jurisdiction, an AI tool mention, the dependency, or language selection fabricates a `UserGoal`.

**Disposition: EXPLICIT ONLY CONFIRMED.**

## 12. Provider/tool neutrality (Task J/L)

`provider_scope: null`, `tool_scope: null`, confirmed directly in the Adopted entry. The proposition concerns Taiwan copyright law generally and names no AI tool or provider. No provider-specific behavior for Kling, Seedance, OpenAI, Adobe, Midjourney, or any other tool is introduced.

**Disposition: PASS.**

## 13. Evidence/refresh sufficiency (Task K/M)

The `evidence-captures/taiwan-copyrightability/` package (2 Class A HTML captures + `MANIFEST.md`) satisfies the existing Evidence Capture SOP's refresh-readiness baseline exactly as already proven for every other domain in this corpus — checksum-comparison on a future re-fetch is the complete, existing mechanism; no new field, schedule, or stale-state concept is introduced. The 2026 draft Generative AI Copyright Guidelines are not cited anywhere in the Adopted proposition, evidence limitations, or CRC Candidate Statement — confirmed by direct re-read of all three.

**Disposition: PASS.**

## 14. Fail-closed behavior (Task N)

Traced the three possible states: (a) Taiwan jurisdiction unresolved/unconfirmed → excluded via the existing, unmodified applicability evaluator (never reaches a matched result at all); (b) Taiwan jurisdiction confirmed, `human_contribution_description` unconfirmed → Case 3B, plain form; (c) Taiwan jurisdiction confirmed, `human_contribution_description` confirmed → Case 3B plus the H5 echo sentence. No fourth state exists in which this claim's rendering silently strengthens toward `directly_relevant` or toward any prohibited conclusion. No new fallback logic was introduced or is required.

**Disposition: PASS.**

## 15. Production representability (Task M, second instance in the milestone's own numbering)

Every field this claim requires (`topic`, `jurisdiction`, `claim_character`, `lifecycle`, `crc_eligible`, `crc_publication_scope`, `crc_candidate_statement`, `applicability_requirements`, `unresolved_project_dependencies`, `provider_scope`, `tool_scope`) already exists on the current, unmodified `TopicClaim` type and is already populated with these exact shapes for `CLAIM-COPY-001/002/003-v1` (same category, same dependency, different jurisdiction value). **A future Production Representation milestone would require a pure data addition — one new fixture object — with zero new type, zero new mechanism, zero Taiwan-specific runtime code.** No blocker identified.

**Disposition: PASS — no architecture gap for production representability.**

## 16. Architecture-drift assessment

Tested against every listed pattern: no Taiwan-specific orchestration; no language→jurisdiction inference (§8's structural finding); no jurisdiction→fabricated UserGoal; no Taiwan-specific `copyrightability` category/topic (reuse confirmed at Adoption/FGR_023, re-confirmed here); no Taiwan-specific dependency code (reuses the identical existing mechanism, category-gated not claim-gated); no domain-specific Retrieval/BI/Composition; no human-creativity sufficiency classifier; no evidence-only self-attestation; no Track A without separate governance; no runtime legal research; no Taiwan-specific refresh machinery. None found.

**Disposition: PASS.**

## 17. Adversarial review

| Attack | Finding |
|---|---|
| Adoption silently diverges from FGR_023 | Not found — field-by-field correspondence confirmed directly (§1) |
| Evidence checksum drift since Adoption | Not found — independently recomputed a third time, exact match (§2) |
| Principle 3 (No List) applies | Not found — copyrightability is not an enumerated No-List subject; independently re-derived, not assumed to transfer from CPR_028 (§3) |
| `human_contribution_description` treated as sufficiency-resolving | Not found — re-verified directly from current source, not cited (§5) |
| `directly_relevant` reachable | Not found — structurally unreachable given the non-empty dependency array (§7) |
| Jurisdiction gate could imply legal attachment | Not found — the type itself has no field capable of expressing that stronger claim (§8) |
| Ownership conclusion smuggled in | Not found — Art. 11/12 remains a disclosed limitation (§9) |
| Third-party/training-data material incorporated | Not found — para 3 excluded, future-candidate note only (§10) |
| Draft 2026 Guidelines relied upon | Not found — confirmed absent from proposition/evidence/statement text (§13) |
| Production representation requires new architecture | Not found — pure data addition, zero new mechanism (§15) |

**No unresolved substantive defect found.**

## 18. Final disposition

**APPROVE FOR CRC PUBLICATION.** Every review point (1-16) passes on this review's own independent re-derivation, including a from-scratch re-trace of the safety-critical BI-ceiling code (§5/§7) and the jurisdiction-gate type definition (§8) rather than accepting FGR_023's or the Adoption entry's own quotations. This disposition governs `CRC Eligible` only — it does not itself constitute production representation, which remains a separate, later, explicitly-authorized milestone.

--- END VERBATIM CRC PUBLICATION REVIEW ---
