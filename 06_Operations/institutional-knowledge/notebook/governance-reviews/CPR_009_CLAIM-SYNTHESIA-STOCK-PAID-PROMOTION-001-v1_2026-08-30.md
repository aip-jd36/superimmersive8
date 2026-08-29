Title: CRC Publication Review #9 — Synthesia Stock Avatar Paid-Promotion Restriction

Reviewed object:
- CLAIM-SYNTHESIA-STOCK-PAID-PROMOTION-001-v1

Review date: 2026-08-30

Artifact type: CRC Publication Review / Decision Analysis (publication stage — asks whether an already-Adopted claim may additionally become `CRC Eligible: Yes`; distinct from Formal Governance Review #9, which reviewed this same object for Adoption only — see `FGR_009_SYNTHESIA_SCENARIO_A_PACKAGE_2026-08-29.md`). First CRC Publication Review of the AI Video Generation Platform Rights domain, and the first CPR of a real `tool_scope`-narrowed `TopicClaim`.

PM decision: **PENDING.** No claim field has been changed by this review. This review's own recommendation is **DEFER** — not an approval awaiting a Yes/No, and not a substantive WITHHOLD either; every publication-safety and publication-quality signal this review could test came back clean, but one real, disclosed, unresolved question (evidence freshness — §5 below) was found to require explicit human PM judgment at the *publication* stage specifically, not silently inherited from the *Adoption*-stage judgment already recorded in `FGR_009`. See §17/§18 below for exactly what a PM APPROVE decision would additionally require populating in `GOVERNED-CLAIMS.md`, none of which this review performs.

Historical status: VERBATIM ARCHIVE — DO NOT EDIT HISTORICAL BODY once PM's decision is recorded. Future amendments should be appended outside the body below, or captured in a new review artifact — never inserted into the verbatim body.

Source: written directly to this file as the review was conducted this session (not reconstructed from a prior conversational report).

--- BEGIN VERBATIM CRC PUBLICATION REVIEW ---

# Synthesia Stock Avatar Paid-Promotion Restriction — CRC Publication Review

## 0. Repository / governance state verified before review

`HEAD` = `main` = `origin/main` = `96b4887eefdfe26102266bb74c598a00d67f3edf` (fetched and confirmed). Unrelated pre-existing working-tree changes present and untouched throughout (`.gitignore`, `03_Sales/crm/anchor-film.md`, and a fixed cluster of untracked files from other workstreams). Confirmed directly: claim `Lifecycle: Adopted`, `CRC Approver: PENDING`, `CRC Decision Date: PENDING`, `CRC Publication Scope:` empty, `CRC Candidate Statement:` populated (added in a separate, prior, explicitly-authorized governance-recording task — repository presence of that wording does not itself constitute human approval of it). Candidate provenance (`08_Platform/app/lib/candidates/CAND-SYNTHESIA-STOCK-PAID-PROMOTION-001.ts @ 681a97c4b34d8cc09f3f3bc150eb13bb1744a71f`) freshly re-verified byte-identical (blob `bdfefce3e2af63743147d472a3c825aeb0db9b2e`, both from the working tree and from the named commit object). No `TOPIC_CLAIMS_FIXTURE` entry exists (confirmed via direct grep, zero matches); the claim remains correctly, explicitly registered in `CLAIMS_WITHOUT_FIXTURE_REPRESENTATION` (`topic-claims-fixture-consistency.test.ts`, line 119). Authoritative material read directly this review: the Adopted claim in `GOVERNED-CLAIMS.md`, `FGR_009_SYNTHESIA_SCENARIO_A_PACKAGE_2026-08-29.md` (verbatim body + both post-verbatim addenda), the immutable Candidate artifact, `CRC-PUBLICATION-POLICY.md` (all six Principles + the tool-scoped legacy-coexistence practice), `synthetic-eligibility-canary.ts`, `topic-claim-readiness.ts`, and — as CPR precedent, not FGR precedent — `CPR_003`, `CPR_007`, and `CPR_008` in full.

## 1. Governed proposition, restated (not reinterpreted)

Synthesia's Acceptable Use Policy prohibits incorporating a Stock Avatar in content for "promoted," "boosted," or "paid" advertising on any social media platform or similar media, and separately prohibits paid TV advertising and broadcasting on TV without permission, absent Synthesia's own written express consent. Use of a Stock Avatar in content that does not constitute paid promotion is not restricted by this specific clause. `Claim character: established`. `Jurisdiction`: not a legal jurisdiction — a platform contractual restriction, represented as `'Global'` under the governance-discipline document's own transitional compatibility rule (2026-08-30), which this review confirms is correctly, explicitly disclosed in the claim's own `Jurisdiction:` markdown line and does not assert worldwide legal validity.

## 2. Evidence-tier re-verification

Not independently re-fetched by this review (out of scope — this review evaluates the existing evidentiary record for publication-readiness, it does not re-run FGR_009's own evidence-tier verification work). `FGR_009` §2 already independently re-checked (via direct `grep` against the raw archived HTML, not the AI-fetch summary) that the load-bearing phrases are present verbatim in both the Acceptable Use Policy (Class A / primary legal-official authority) and the Video Licensing Help Center article (Tier 2 / official platform authority, corroborating). This review accepts that already-independently-verified evidence tier as sound — re-deriving it a second time from raw HTML would duplicate work already done to the same rigor this corpus's other CPRs apply, not add new information.

## 3. Freshness finding — carried forward from FGR_009, not independently upgraded

**Confirmed, not re-derived:** the Acceptable Use Policy is dated "Last Updated: February 23, 2024" — as of this review's own date (2026-08-30), over two and a half years stale. `FGR_009` §3 disclosed this explicitly: Synthesia's own site includes a "Terms & Policy Archives" page (evidence the provider does maintain dated version history), meaning a newer AUP version may exist that supersedes the one captured, and this **was not checked** by FGR_009 (explicitly out of that review's own scoped inspection). This review does **not** independently fetch or upgrade that evidence — doing so would exceed this task's own authorized bounds and would risk exactly the "treat stale evidence as current provider policy" failure this task explicitly warns against.

**What the existing governance record actually decided about this limitation:** `FGR_009`'s own PM decision, recorded in that file's wrapper metadata, was **"A: ADOPT... with the §3 freshness caveat recorded in the claim's own governance metadata (not blocking, but disclosed)."** This is a real, explicit, human decision — but it is scoped to **Adoption** (Lifecycle: Adopted, a reviewer/internal-knowledge decision) — `GOVERNED-CLAIMS.md`'s own governance discipline states plainly that "`Publication scope: CRC eligible` is a separate decision from Adoption." Per `CRC-PUBLICATION-POLICY.md` Principle 1 ("never inferred from Status... never defaulted to Yes because verification was thorough") and the `CPR_007`/`CPR_008` precedent of independently re-applying every Principle rather than inheriting a prior stage's lean, this review does **not** treat the Adoption-stage "not blocking" characterization as dispositive for the separate, higher-stakes Publication decision (CRC-facing, unsupervised, no human reviewing the specific moment it is said — the exact distinction `CRC-PUBLICATION-POLICY.md`'s own Purpose statement draws).

**Classification: C — requires human PM judgment at CPR**, not A (the record does not establish this is *already* settled for publication specifically) and not B (nothing found makes a source refresh strictly *required* before publication could ever be considered — the proposition is a plain restatement of an enumerated contractual list, not a fast-moving or ambiguous term, and no repository evidence suggests the underlying rule has actually changed). This is a **narrow, single-issue, disclosed question**, not a broad evidentiary defect — recorded explicitly per this task's own instruction, not silently absorbed into a recommendation either way.

## 4. Proposed CRC Candidate Statement — fidelity assessment

Reviewed exactly:

> "Synthesia's Acceptable Use Policy restricts using a Stock Avatar in paid advertising or promotion — including paid social media ads, paid TV ads, and broadcast — unless Synthesia has given written express consent; use that isn't paid promotion, such as organic posts or internal/training videos, isn't restricted by this specific clause."

Checked against every item this review was asked to check for:
- **Unsupported strengthening:** none found. The statement does not assert consent was or was not obtained, does not assert a specific project uses a Stock Avatar, and does not extend the restriction beyond "paid advertising or promotion."
- **Unsupported narrowing:** none found. All three enumerated placement categories (social, TV, broadcast) from the governed proposition are preserved; the written-consent exception is preserved.
- **Accidental legal framing:** none found — the sentence names "Synthesia's Acceptable Use Policy" as the source explicitly, in both clauses, never implying a legal or jurisdictional conclusion.
- **Overstatement of currentness:** a real, disclosed gap (this is the §3 freshness finding, not a defect in the sentence's own wording) — the sentence itself makes no explicit "as of [date]" qualifier the way the Music A2/A3 precedent's "stated policy is that..." hedge does. **Finding: this is a legitimate improvement a PM could require at approval** (see §17's proposed scope text, which supplies this qualifier at the Publication Scope layer instead — consistent with Getty precedent, where the Candidate Statement itself stays plain and the currentness/evidence caveat lives in the longer Publication Scope paragraph, never duplicated into the short user-facing sentence).
- **Provider-policy vs. law confusion:** none found — "Synthesia's Acceptable Use Policy" is stated as the source of the restriction throughout, never "the law" or "regulation."
- **Project-specific inference:** none found — no reference to "your project," "this video," or any first/second-person project-state language.
- **Dependency leakage:** none found — neither `synthesia_stock_avatar_used_confirmed` nor `synthesia_written_consent_obtained` is asked, implied, or referenced.
- **Evidence-freshness implications:** see above — a real, disclosed, addressable-at-Publication-Scope-layer point, not a defect requiring rewrite of the Candidate Statement itself.
- **Converse/carve-out fidelity:** preserved faithfully — the non-paid-use carve-out ("use that isn't paid promotion... isn't restricted by this specific clause") mirrors the governed proposition's own second sentence and the Prohibited Conclusions block's own "does not establish that non-paid use is free of every other restriction" framing precisely (scoped to "this specific clause," matching the governed text word-for-word in meaning).

**Finding: the proposed statement is faithful to the Adopted proposition.** This review does not approve it merely because a prior task recommended it — every check above was independently re-performed against the governed record, not accepted on the prior task's own say-so.

## 5. Evidence limitations (disclosed, carried into any future publication scope)

Single-provider, two-source-corroborated (Class A primary + Tier 2 secondary) evidence; the freshness gap in §3; the SI8-interpretation paragraph's own cross-tool comparison (Runway/Kling/Pika/Veo/Midjourney/ElevenLabs) is SI8's own synthesis, not itself Synthesia-sourced, and is correctly excluded from the Candidate Statement (which states only Synthesia's own restriction).

## 6. Prohibited conclusions — unchanged, re-confirmed applicable

Re-read directly from the governed record: does not establish Custom Avatar is unrestricted (separate, un-adopted proposition); does not establish whether a specific project used a Stock or Custom Avatar; does not establish whether Synthesia granted written consent for any specific case; does not establish anything about jurisdiction-specific likeness/publicity/disclosure law; does not establish non-paid use is free of every other restriction. All five are structurally unreachable by the proposed Candidate Statement (§4) and by the mechanical architecture (§7-§16 below).

## 7. Dependency 1 — `synthesia_stock_avatar_used_confirmed`

Confirmed directly from `dependency-askability.ts`: absent from `DEPENDENCY_TREATMENTS` (only `human_contribution_description` is a live entry). `getAskabilityEntry()` returns `undefined`; `isDependencyAskableInCrc()` returns `false`. Confirmed via grep: this string appears nowhere in production code except the Candidate artifact and the governed markdown record. **Evidence-only, non-askable, by construction — unchanged, and this review proposes no change.**

## 8. Dependency 2 — `synthesia_written_consent_obtained`

Identical finding and evidence to §7.

## 9. Permanence of the Case 3B boundary

Confirmed via direct code inspection (`build-bounded-interpretation.ts`) and empirically (§14 below, Case E): `hasGovernedProjectDependencies()` reads only the static `unresolved_project_dependencies.length > 0` check; nothing in this codebase ever removes a string from that list at runtime, for any claim, in any domain (matches `DAR_001`'s own prior, independent finding for the Stock domain, and this session's own LK-33 diagnostic). **Publication does not create, and cannot create, any path around this boundary** — this claim, once CRC-eligible, would render via Case 3B (`relevant_applicability_unresolved`) every single time it matches, with no mechanism by which either dependency could ever be marked "resolved."

## 10. Tool scope

`tool_scope: ['synthesia']`. Confirmed: `'synthesia'` is a registered `CANONICAL_TOOL_ID` (`registry.ts`, added LK-24, 2026-08-29, generic registry extension, no new category). `provider_scope: null` — independent field, unaffected, confirmed no accidental coupling. `toolScopeMatches()` (`lookup-topic-claims.ts`) confirmed to narrow an already topic-matched claim only — it does not itself create topic relevance (verified directly in code and empirically, §14 Case D below: tool presence alone, with no `commercial_use` goal, produces zero retrieved claims and zero knowledge/goal items). Where both `provider_scope` and `tool_scope` are non-null on a future claim, `types.ts`'s own doc comment confirms both gates apply (AND), not either — not exercised by this claim (`provider_scope: null`), correctly noted as inapplicable here rather than assumed. No extraction alias added or required by this review.

## 11. Explicit-goal vs. discovered relevance

Confirmed via direct inspection of `discovered-relevance.ts`: the sole existing Track A trigger targets `third_party_source_rights` only, with `commercial_use` as an allowed *parent* goal, never a discoverable *target*. No trigger discovers `commercial_use` from a tool mention, Synthesia or otherwise. **This claim is reachable only under an explicit, confirmed `commercial_use` UserGoal today.** This review does not propose, and Hard Boundaries forbid, creating a `Synthesia → commercial_use` discovery rule or any other Track A change. Confirmed acceptable under `CRC-PUBLICATION-POLICY.md`, which nowhere requires discovered-relevance reachability as a publication precondition (Principle 4's own "scope narrowly rather than withhold" language addresses coverage completeness of a claim's own content, not reachability infrastructure).

## 12. Conversational reachability

Confirmed via direct grep: zero occurrences of `"synthesia"` in `extraction.ts` — no `KNOWN_TOOLS` alias exists. No ordinary user utterance produces a confirmed, canonical `synthesia` `ToolMention` today. Per `CPR_007` §3's own explicit, PM-reviewed finding — "The architecture itself correctly separates governance-layer eligibility from runtime reachability... This is a positive finding, not an architecture warning" — publication eligibility and conversational extraction coverage are established, precedented, independent concerns. **Recorded here as a real, disclosed limitation, not fixed by this review, and not treated as a publication blocker** — matches the existing state of five other canonical tool identities (`pika`, `midjourney`, `google-veo`, `adobe-firefly`, `openai-sora`) that carry zero extraction alias coverage today.

## 13. Matrix coexistence inspection (LK-22 / CRC-PUBLICATION-POLICY.md tool-scoped coexistence practice)

Performed fresh, not reused from a prior report. Searched both `PLATFORM-RIGHTS-MATRIX.md` and its runtime fixture (`matrix-fixture.ts`) for any case-insensitive occurrence of "synthesia": **zero matches in either file.** No `MatrixRow.identifier` exists for Synthesia; no `MatrixClaim.claim_id` exists that could materially overlap.

**Recorded exactly, per this task's own instruction: NO MATRIX COVERAGE FOUND.** This is not translated into "no conflict exists" or "compatibility proven" — it is a factual absence-of-coverage finding. Per the coexistence practice's own four numbered steps (`CRC-PUBLICATION-POLICY.md`), step 1 (inspect existing coverage) has been performed and is recorded; steps 2-4 (determine material overlap, run a combined canary if a relevant row is identified, WITHHOLD if compatibility cannot be established) are **structurally vacuous** given zero coverage — there is no Matrix proposition to compare against, so no overlap determination, combined canary, or WITHHOLD-for-incompatibility trigger applies. This vacuous-but-performed distinction is recorded explicitly, not silently assumed.

## 14. Synthetic representation and synthetic eligibility canary

An ephemeral, never-persisted `TopicClaim` object was constructed for this review only, mechanically transcribing the real Adopted markdown fields plus the immutable Candidate's own already-governed fields (`topic`, `claim_character`, `jurisdiction`, `applicability_requirements`, `unresolved_project_dependencies`, `provider_scope`, `tool_scope`, `last_verified`) and the proposed Candidate Statement from §4. `lifecycle: 'Adopted'` reflects the real governed state. **`crc_eligible: 'Yes'` is a SYNTHETIC ASSUMPTION FOR CPR TESTING — NOT GOVERNANCE STATE**, set only inside this throwaway test object (deleted immediately after use, per this session's own established ephemeral-probe discipline) so the existing, unmodified `runSyntheticEligibilityCanary()` harness could exercise the publication runtime path — the harness itself requires this override to run at all (its own `crc_eligible: 'Yes'` forcing is unconditional and documented as such in its own header). This object was never written to any repository file and does not exist after this review.

Five scenarios exercised, using the existing generic canary harness only — no Synthesia-specific test harness created:

- **Case A (explicit `commercial_use` goal + matching `synthesia` tool):** retrieved exactly `['CLAIM-SYNTHESIA-STOCK-PAID-PROMOTION-001-v1']`. Bounded Interpretation status: `relevant_applicability_unresolved` (Case 3B) — never `directly_relevant`. Full rendered summary quoted the proposed Candidate Statement verbatim, followed by the fixed category boundary clause and the unconditional Commercial Assurance bridge sentence.
- **Case B (explicit `commercial_use` goal + no `synthesia` tool):** zero claims retrieved. Diagnostic: `{identifier: 'commercial_use', reason: 'no_topic_claim'}` — the tool pre-filter correctly excludes the claim from candidacy before any eligibility/applicability evaluation occurs.
- **Case C (explicit `commercial_use` goal + a different canonical tool, `runway-gen3`):** zero claims retrieved, identical `no_topic_claim` diagnostic for `commercial_use` (plus an unrelated `no_matrix_row` diagnostic for `runway-gen3` itself, expected and harmless — Runway has no Matrix-tool-relevant claim for this scenario). Tool mismatch fails closed correctly, confirming `tool_scope` narrowing is exact-match, not fuzzy.
- **Case D (`synthesia` tool present, no `commercial_use` goal at all):** zero claims retrieved, zero Bounded Interpretations, zero `knowledge_items`, zero `goal_interpretations`. Projection's own `understood_summary` line ("You mentioned using synthesia.") is populated regardless — confirmed this is ordinary, pre-existing Projection-layer behavior (acknowledging a structured fact independent of topic-relevance outcome), not fabricated topic relevance; the load-bearing fields (`knowledge_items`, `goal_interpretations`) are correctly empty. **Tool presence alone does not create topic relevance — confirmed directly, not merely architecturally reasoned.**
- **Case E (dependency-bearing normal path, same scenario as Case A, inspected for dependency/BI behavior specifically):** `unresolved_project_dependencies_by_claim` for the claim returns exactly `['synthesia_stock_avatar_used_confirmed', 'synthesia_written_consent_obtained']`, unchanged from the governed record — confirming the dependency list passes through Retrieval unmodified. Every Bounded Interpretation across all five scenarios evaluated `status !== 'directly_relevant'` — the dependency-bearing gate held in every retrieved case.

## 15. Representation readiness

`checkTopicClaimRepresentationReadiness()` run against the same ephemeral synthetic object: `{ready: true, issues: []}` — consistent with every prior LK-13 run against this claim (LK-25, LK-26, LK-27, LK-29, LK-31, LK-32). Mechanical readiness confirmed necessary-but-not-sufficient per this task's own framing — the substantive findings above (§3-§13) are what this review's recommendation actually rests on, not readiness alone.

## 16. Bounded Interpretation — strongest permitted conclusion

Confirmed empirically (§14 Case A) and by direct code inspection (`build-bounded-interpretation.ts`): the strongest status this claim can ever reach, in its current governed form, is `relevant_applicability_unresolved`. CRC does not, and structurally cannot, conclude: that a project used a Stock Avatar; that written consent exists; that written consent does not exist; that the provider restriction definitely applies to a specific project; that a project is commercially cleared; that a project infringes any law; or that a project is legally unsafe. None of these appeared in any rendered output across all five canary scenarios. No `WITHHOLD` trigger under §15 of this task's own instructions was found.

## 17. Consultative Composition

Inspected via the same canary's `ProjectionOutput` (§14 Case A, full JSON captured during this review's own live testing): the rendered `goal_interpretations[0].summary` communicates, generically and in this order — (1) the quoted governed provider knowledge (the Candidate Statement verbatim); (2) the fixed category-relevance boundary clause ("This is relevant to whether this can be used commercially, but..."); (3) the fixed unresolved-applicability hedge ("...there isn't enough project-specific information to determine how it applies to your specific project"); (4) the unconditional Commercial Assurance bridge sentence. `closing_cta` is the same fixed, unconditional Commercial Assurance CTA every other claim in this corpus produces. **Zero Synthesia-specific text appears anywhere in Composition's own output** — confirmed both by this live run and by the prior, independent code-level finding (LK-32 §V: zero occurrences of "synthesia" or "tool_scope" anywhere under `lib/projection-layer/` or `lib/bounded-interpretation/rules.ts`). Generic Composition does not strengthen Bounded Interpretation's own conclusion in any observed case — no WITHHOLD trigger under §16 of this task's own instructions was found.

## 18. Layer-strengthening check

Confirmed across §14-17: Retrieval passes the dependency list through unmodified; Bounded Interpretation gates on it unconditionally (Case 3B, never bypassed); Composition renders the same fixed, domain-blind hedge/bridge template every other dependency-bearing claim in this corpus uses. No layer independently or cumulatively strengthens the claim's own conclusion beyond what the governed proposition itself states.

## 19. Proposed CRC Publication Scope (recommendation only — not entered into `GOVERNED-CLAIMS.md` by this review)

If a PM APPROVE decision is made, this review recommends the following scope text (mirroring the Getty/CPR_003 precedent shape — a boundary paragraph naming what CRC may state and what it must not conclude, addressing the §3 freshness point explicitly rather than silently):

> APPROVED FOR CRC PUBLICATION (pending PM decision — see CRC Approver/CRC Decision Date below). CRC may state that Synthesia's Acceptable Use Policy, as captured (Last Updated February 23, 2024 — not independently re-verified as current at the time of this review), restricts using a Stock Avatar in paid advertising or promotion — including paid social ads, paid TV ads, and broadcast — absent Synthesia's own written express consent, and that non-paid use is not restricted by this specific clause. CRC must not state whether a specific project used a Stock or Custom Avatar, whether Synthesia has granted written consent for any specific case, or whether the user's own use is therefore permitted or restricted.

## 20. CLI recommendation

**DEFER.** Not WITHHOLD — no safety, evidence-tier, dependency-governance, tool-scope, Matrix-coexistence, or architecture-layer defect was found anywhere in this review; every check this review performed came back clean, several confirmed empirically rather than only architecturally. Not APPROVE — one real, disclosed, narrow, unresolved question (§3: is a >2.5-year-stale primary source acceptable evidence currency for a live, user-facing, unsupervised CRC publication — as distinct from the already-decided, lower-stakes Adoption/reviewer-only question) requires an explicit human PM judgment at the *publication* stage specifically, which this review does not have standing to make on its own authority, and which no existing repository text resolves for the publication stage without independently upgrading stale evidence — an action this task explicitly forbids. If the PM's judgment is that FGR_009's own "not blocking" characterization extends to Publication as well (a real, defensible, PM-authorized possibility, given the proposition is a plain, stable, enumerated restriction rather than a fast-moving or ambiguous term), this review's own findings in §4-§18 already fully support an immediate APPROVE with the §19 scope text — no further mechanical work would be required.

## 21. What this review does NOT establish

Not a Commercial Assurance Assessment. Not legal advice. Not project clearance or certification. Not proof any particular project satisfies or violates the provider restriction. Not CRC eligibility (unchanged: `Pending`). Not conversational reachability (unchanged: no extraction alias exists). Not a Matrix conflict-resolution — no Matrix content exists to conflict with.

--- END VERBATIM CRC PUBLICATION REVIEW ---
