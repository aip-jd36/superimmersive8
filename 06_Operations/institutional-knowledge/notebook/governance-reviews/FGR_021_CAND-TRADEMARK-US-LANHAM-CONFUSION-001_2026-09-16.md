Title: Formal Governance Review #21 — U.S. Trademark, Lanham Act §1125(a)(1) Confusion/Affiliation Rule

Reviewed object:
- `CAND-TRADEMARK-US-LANHAM-CONFUSION-001` (drafted in `US-TRADEMARK-LANHAM-1125A-FGR-PACKAGE.md`, this same milestone)

Review date: 2026-09-16

Artifact type: Formal Governance Review (adoption stage) — the first Trademark-domain FGR in this corpus. Reviews the candidate on its own evidence, per this milestone's own explicit instruction not to treat the three preceding architecture/research diagnostics as pre-approval of the actual claim wording.

--- BEGIN VERBATIM FORMAL GOVERNANCE REVIEW ---

# U.S. Trademark — Lanham Act §1125(a)(1) Confusion/Affiliation Rule — Formal Governance Review

## 1. Authoritative source fidelity

Re-read the candidate package's §2 fidelity test directly against this review's own fresh reading of the captured evidence (`evidence-captures/us-trademark/uscode-2023-title15-sec1125_20260916T083022Z_51c96e65.pdf`), not accepted on the package's own say-so. Confirmed: the proposition in §1 tracks §1125(a)(1)(A) clause-by-clause — actor, trigger, and the confusion/affiliation/connection/association/origin/sponsorship/approval test are each preserved without narrowing or broadening. The package's own disclosed scope decision (omitting §1125(a)(1)(B), the commercial-advertising-misrepresentation branch) is independently re-confirmed as sound: (B) concerns misrepresenting the user's *own* goods' characteristics, a materially different fact pattern from the target problem class (a depicted *third party's* brand). No instance of the proposition stated more strongly than the source was found — matches the package's own finding.

**Disposition: PASS.**

## 2. GoalCategory semantic

Independently tested against all three example intents named in this milestone's own Phase 3, not merely accepted from the package. Each genuinely reduces to the same educational need; none is answerable by any existing `GoalCategory` without distortion (`commercial_use` is about tool/platform-term permission for the content itself, a different question). The proposed value `trademark` follows the corpus's own established single-word, subject-matter-labeling convention (`likeness`, not `likeness_question`) — consistent, not novel. The governed semantic text explicitly frames "considerations," never a promise to resolve permission/infringement/ownership — this review specifically checked for, and did not find, any wording in the semantic that could be read as CRC committing to answer the stronger question.

**Disposition: PASS.**

## 3. KnowledgeTopic semantic

Independently re-derived, not copied: `KnowledgeTopic = GoalCategory | KNOWLEDGE_ONLY_TOPICS` (confirmed directly against `08_Platform/app/lib/retrieval-engine/types.ts`'s own union definition). A new `GOAL_CATEGORIES` entry is automatically a valid `TopicClaim.topic` value without any `KNOWLEDGE_ONLY_TOPICS` addition. This review specifically tested whether Article 50's own `KNOWLEDGE_ONLY_TOPICS`-only shape should instead be mechanically copied here, per this milestone's own explicit warning against mechanical copying — found: no, because Article 50's own shape exists specifically because EU AI Act disclosure is never a *direct* user ask (always reached one hop from `commercial_use`), whereas Trademark's own scenario-testing (§2 above) shows it genuinely is a direct ask. The two domains are structurally different for an evidenced reason, not by assumption.

**Disposition: PASS.**

## 4. Jurisdiction semantics

Re-read `AssessmentJurisdictionMention`'s own doc comment directly (`types/interview-engine.ts`) — confirmed it represents only "the jurisdiction the user asked CRC to consider," never a territorial/commerce-clause applicability finding. The package's §6 text states this distinction explicitly and correctly. Independently confirmed the package's own reasoning for why the Article-50/NY-style reach-gate concern doesn't apply here: this claim is reached via an explicit goal (§11), never a relationship, so it never has unrestricted-global-reach exposure to solve.

**Disposition: PASS.**

## 5. Applicability

`applicability_requirements: [{fact:'jurisdiction', operator:'equals', value:'United States'}]` — structurally identical, byte-for-byte in shape, to `CLAIM-COPY-001-v1`'s own already-adopted, already-published gate. No new `ApplicabilityFact`, no new evaluator branch, no `applicability_any_of` complexity required or proposed.

**Disposition: PASS.**

## 6. Single dependency semantic

Re-derived from the statute directly, not accepted from the package: §1125(a)(1)(A)'s own text states the confusion test as ONE disjunctive clause ("confusion... as to the affiliation, connection, or association... or as to the origin, sponsorship, or approval") — collapsing it into one dependency string (`confusion_as_to_affiliation_or_sponsorship`) mirrors the statute's own structure, not an arbitrary simplification. Independently re-confirmed against the BI/dependency diagnostic's own traced finding (`needsApplicabilityHedge`, `rules.ts`'s fixed templates) that this dependency's function is aggregate-signal honesty and disclosure specificity, not a Composition-safety requirement — the package's §7 states this accurately, and this review did not find any place in the package that mischaracterizes the dependency as required "to stop Composition hallucinating an infringement conclusion" (the exact mischaracterization this milestone's own IMPORTANT ARCHITECTURE FINDING warned against).

**Disposition: PASS.**

## 7. Dependency askability status

Confirmed directly: `lib/crc-engine/dependency-askability.ts`'s registry has no entry for `confusion_as_to_affiliation_or_sponsorship` (it cannot, since this is a new, not-yet-authored string) — and this package proposes none. Fail-closed by default, matching every sibling legal-characterization dependency in this corpus (Article 3(60), Article 3(4) deployer status, NY synthetic-performer definition).

**Disposition: PASS.**

## 8. Evidence limitations

§8's general-rule-vs-prohibited-conclusions split independently re-tested against the candidate statement (§5) word-by-word — no clause in §5 crosses into any of §8's named prohibited conclusions. The package's own characterization of `crc_publication_scope` (audit-only, never runtime-rendered) was independently re-verified against `project-knowledge-items.ts`'s own header comment directly, not accepted from the package or the prior diagnostic alone — confirmed accurate.

**Disposition: PASS.**

## 9. Prohibited project-specific conclusions

Re-tested §12's list against §5's candidate statement and against the applicable BI templates (`directlyRelevantSummary`/`relevantApplicabilityUnresolvedWithContentSummary`) — no combination of governed text and fixed template wrapper can produce any of: infringement, confusion-established, affiliation-established, sponsorship-established, approval-established, authorization-established-or-denied, ownership, validity, or a legal-permission conclusion. Confirmed structurally, not by trusting wording alone.

**Disposition: PASS.**

## 10. Commercial Assurance handoff

Re-read `guidance.ts`'s own Domain I03 text directly (not accepted from the package) — confirmed it is strictly observational ("Note these even if you cannot confirm they are deliberate"), and confirmed no repository artifact anywhere states Domain I03 or Commercial Assurance generally adjudicates legal infringement. The package's three-tier boundary (§9) is accurate and does not overstate Commercial Assurance's own role.

**Disposition: PASS.**

## 11. Explicit-vs-discovered distinction

Confirmed: no `TopicRelationship`, no discovered-relevance trigger, no `ContentPresenceCategory` extension appears anywhere in the package. Explicit-goal-only, as required.

**Disposition: PASS.**

## 12. No fabricated UserGoal

The new `GoalCategory` value reaches the existing, unmodified `lookupTopicClaims` exact-topic path exactly as `likeness`/`copyright_ownership` already do — no synthetic goal-construction logic is proposed.

**Disposition: PASS.**

## 13. No Trademark-specific orchestration

Confirmed: no Retrieval, Bounded Interpretation, Composition, or questioning code is authored, modified, or proposed by this package. Every mechanism reused is the existing, generic, already-proven one.

**Disposition: PASS.**

## 14. No discovered relevance

Confirmed absent (§10 above).

**Disposition: PASS.**

## 15. No brand/logo ContentPresenceCategory

Confirmed absent — not created, not referenced as a dependency or applicability mechanism.

**Disposition: PASS.**

## 16. No authorization/permission dependency

Confirmed absent, with an explicit, reasoned exclusion recorded in §7 of the package (not merely omitted silently) — independently re-confirmed correct: authorization functions as a defense to §1125(a)(1), not an element of it, and is therefore genuinely out of scope for this proposition, not merely deferred for convenience.

**Disposition: PASS.**

## 17. No ownership/validity dependency

Confirmed absent, same reasoning — both are elements of the registration-specific §1114 cause of action, not §1125(a).

**Disposition: PASS.**

## 18. Fail-closed behavior

Confirmed throughout: unresolved jurisdiction → excluded (existing mechanism, unmodified); unresolved/unaddressed confusion dependency → hedged, never guessed toward either "established" or "not established"; no self-attestation path exists for any prohibited conclusion.

**Disposition: PASS.**

## 19. Adversarial review

| Attack | Finding |
|---|---|
| Source fidelity | Confirmed clean — no strengthening found (§1) |
| Proposition overreach | Not found — §5's wording states the legal standard only, never a project application |
| Registration-requirement conflation | Not found — §1127's "use in commerce" definition independently confirms no registration requirement anywhere in §1125(a)(1); the package correctly never implies one |
| §1114/§1125(a) conflation (ownership/validity smuggled in via the "registered mark" concept) | Not found — the package explicitly, correctly excludes ownership/validity as out-of-scope for this specific cause of action |
| Applicability overreach | Not found — §6 explicitly, correctly disclaims territorial-applicability proof |
| Forced taxonomy | Not found — GoalCategory/KnowledgeTopic identity independently re-derived, not forced to match Article 50's own shape |
| Arbitrary dependency fragmentation | Not found — one combined dependency, matching the statute's own single disjunctive clause |
| Legal-advice implication | Not found anywhere in §5 or §8 |
| CRC compliance/clearance implication | Not found — §8/§12 explicitly foreclose it |
| Self-attestation risk on the confusion dependency | Not found — no askability entry, fail-closed by construction |
| Commercial Assurance overstatement | Not found — §9 explicitly declines to claim Domain I03 adjudicates legal infringement, and this review independently re-verified that against `guidance.ts` directly |
| Misstating the dependency's purpose as a Composition-safety requirement | Specifically checked, per this milestone's own IMPORTANT ARCHITECTURE FINDING — not found; §7 states the correct, corrected rationale |

**No unresolved substantive defect found.**

## 20. Final disposition

**ADOPT.** Every review point (1–18) passes independently, not merely by inheriting the preceding diagnostics' own conclusions — each was re-tested directly against the primary-source evidence, the actual runtime source files, or the statute's own text. Unlike `FGR_019`'s own DEFER disposition (blocked on an unresolved topic-taxonomy question at that time), this candidate's GoalCategory/KnowledgeTopic identity question is resolved within this same review (§2/§3) — no external blocker remains for Adoption specifically. `Lifecycle: Adopted` is recommended. **`CRC Eligible` is explicitly NOT decided by this review** — that remains a separate, future, Publication-stage (CPR) decision, per this milestone's own explicit instruction and the established corpus sequence (FGR/Adoption → production representation → CPR/Publication).

--- END VERBATIM FORMAL GOVERNANCE REVIEW ---
