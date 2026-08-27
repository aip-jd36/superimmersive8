Title: Formal Governance Review #7 — Stock-Media Provider-Scope Correction (combined package, FGR-shaped + CPR-shaped joint review)

Reviewed objects:
- `CLAIM-STOCK-EDITORIAL-001-v1` → proposed `CLAIM-STOCK-EDITORIAL-001-v2` (provider_scope correction only)
- `CLAIM-STOCK-EDITORIAL-002-v1` → proposed `CLAIM-STOCK-EDITORIAL-002-v2` (provider_scope correction only)

Review date: 2026-08-27

Artifact type: **Governance Correction Review — a genuinely novel situation this repository's naming convention has not previously needed to name**, disclosed explicitly rather than silently forced into an ill-fitting existing category. Uses the `FGR_NNN` naming slot (continuing the existing Formal Governance Review sequence, now at #7 — an independent sequence from CPR's own, per this folder's own naming convention; not the same numbering as `CPR_007`, the Music Publication Review, despite the coincidental matching number) because the underlying question — "should this corrected metadata be Adopted?" — is structurally an FGR-shaped decision, not a fresh CPR-shaped one. **Combined with a CPR-shaped question in the same artifact** (does the already-existing `CRC Eligible: Yes` decision on each v1 carry forward to the corrected v2, or must it be explicitly re-affirmed?) because the two questions are inseparable here: approving the scope correction without also resolving CRC-carryforward would leave an incoherent governance state. This mirrors `CPR_006`'s own precedent for combining questions in one artifact "because... could only be meaningfully assessed together," extended for the first time to an FGR-CPR joint case rather than a CPR-only one — a deliberate, disclosed extension of existing precedent, not an invented parallel format. Two claim IDs are covered because their evidence-supported scopes differ (§F/§G below) and can only be correctly assessed side-by-side, exactly as `CPR_006`'s own bar requires.

**Mechanism used: supersession (v1 → v2), not in-place editing.** This is the first time this repository's `Version lineage`/`superseded_by` mechanism would be genuinely exercised (confirmed directly: `grep` across all of `GOVERNED-CLAIMS.md` found zero non-`none` `superseded by:` values anywhere — every existing claim's own field has stood at `none` since Wave 1). See §I below for the full reasoning.

PM decision: **PENDING.** No claim has been modified. This artifact recommends but does not perform the correction — per Hard Stop, `GOVERNED-CLAIMS.md` is untouched by this task.

Historical status: VERBATIM ARCHIVE — DO NOT EDIT HISTORICAL BODY. Future amendments should be appended outside the body below, or captured in a new review artifact — never inserted into the verbatim body.

Source: written directly to this file as the review was conducted this session (not reconstructed from a prior conversational report).

--- BEGIN VERBATIM GOVERNANCE CORRECTION REVIEW ---

# Stock-Media Provider-Scope Correction — Governance Review

## 0. Repository state verified before review

`main` = `origin/main` = `f368612e7e5e5d5ba7b6d5f7f984d3e719f0dc11` (fetched, confirmed). Unrelated pre-existing working-tree changes present and untouched throughout. Both affected claims' full `GOVERNED-CLAIMS.md` entries read directly and completely this review (not relied on from the prior diagnostic's own summary).

## 1. Claim-by-claim evidence audit (Step 2-4 combined)

### CLAIM-STOCK-EDITORIAL-001-v1
- Domain: Third-Party Source Assets / Stock Media Licensing
- Context: "any AI-generated commercial video workflow that incorporates third-party stock-media source assets"
- Topic: `third_party_source_rights`
- Proposition (unchanged, not proposed for edit): "A stock-media provider's standard license for content it designates 'Editorial'... authorizes use for descriptive, newsworthy, or public-interest purposes... does not include advertising, promotional, endorsement, or merchandising use. Some providers offer a separate, provider-specific process to authorize such use..."
- Current `provider_scope`: `null`
- Applicability requirements: `[]`
- Unresolved dependencies: `which_provider`, `editorial_designation_confirmed`, `separate_authorization_obtained`
- Lifecycle: Adopted (Adoption Approver: JD (PM), 2026-08-17)
- CRC status: `CRC Eligible: Yes` (CRC Approver: JD (PM), 2026-08-18, `CPR_001`, Recommendation A)
- Version lineage: v1 (initial) — supersedes: none — superseded by: none
- FGR artifact: `FGR_001_CAND-STOCK-EDITORIAL-001_2026-08-17.md`
- CPR artifact: `CPR_001_CLAIM-STOCK-EDITORIAL-001-v1_2026-08-18.md`

**Evidence-supported scope — per-provider (Step 4):**

| Provider | Status | Basis |
|---|---|---|
| Getty | **SUPPORTED** | Tier 1, directly fetched, 3 independent fetches, EULA + Rights and Clearance |
| iStock | **SUPPORTED** | Tier 1, directly fetched, "the single most consistently-verified provider across this research program" |
| Adobe Stock | **SUPPORTED, weaker tier — disclosed** | Tier 2/secondary, corroborated (not independently primary-re-verified) via two `WebSearch` passes; 5 direct-fetch attempts failed. Explicitly named as one of the claim's own "four independently-researched providers," at a disclosed weaker tier — not excluded |
| Shutterstock | **SUPPORTED, split tier — disclosed** | Tier 1 for the definitional distinction; Official Secondary (not Verified Primary) for exact restriction wording — the primary License Agreement itself was never successfully fetched (0/7 attempts), but the functional definition was directly fetched from Shutterstock's own contributor-help domain |

**Determination (Step 3): C — limited to the specifically researched stock providers, not (A) universal across all third-party source providers and not (B) universal across "all stock-media providers" as an open class.** The claim's own `Source authority/type` line is explicit: "synthesized across **four** independently-researched providers" — a closed, named, evidence-bounded set, not an open-ended "any stock provider" framing. No fifth provider (researched or unresearched) is anywhere implied as in-scope.

### CLAIM-STOCK-EDITORIAL-002-v1
- Domain: Third-Party Source Assets / Stock Media Licensing
- Context: "Commercial Assurance evidence review of any AI-generated commercial video workflow that incorporates third-party stock-media source assets designated 'Editorial'"
- Topic: `third_party_source_rights`
- Proposition (unchanged, not proposed for edit): "Stock-media content that a provider designates 'Editorial' is typically supplied without the model or property releases that would otherwise support broader commercial use... **This has been independently confirmed for Getty, iStock, and Shutterstock; it has not been independently confirmed for every stock-media provider, including Adobe Stock.**"
- Current `provider_scope`: `null`
- Applicability requirements: `[]`
- Unresolved dependencies: `which_provider`, `editorial_designation_confirmed`, `release_status_confirmed`
- Lifecycle: Adopted (Adoption Approver: JD (PM), 2026-08-17)
- CRC status: `CRC Eligible: Yes` (CRC Approver: JD (PM), 2026-08-18, `CPR_002`, Recommendation B — bounded CRC-copy adjustment)
- Version lineage: v1 (initial) — supersedes: none — superseded by: none
- FGR artifact: `FGR_002_CAND-STOCK-EDITORIAL-002_2026-08-17.md`
- CPR artifact: `CPR_002_CLAIM-STOCK-EDITORIAL-002-v1_2026-08-18.md`

**Evidence-supported scope — per-provider:**

| Provider | Status | Basis |
|---|---|---|
| Getty | **SUPPORTED** | Tier 1, directly fetched, two independent official pages |
| iStock | **SUPPORTED** | Tier 1, directly fetched — "the structurally cleanest evidence of the four providers for treating release status and license scope as two independent provisions" |
| Shutterstock | **SUPPORTED** | Tier 1 for this specific proposition — **explicitly noted as STRONGER for this claim than for -001** ("A stronger evidence tier for THIS specific proposition than Shutterstock received for CLAIM-STOCK-EDITORIAL-001-v1... this proposition doesn't depend on the exact-restriction-wording... that kept -001's Shutterstock evidence at QUALIFIED") |
| Adobe Stock | **NOT SUPPORTED — explicitly, repeatedly disclaimed** | "explicitly NOT a confirmed supporting leg of this synthesis"; "Adobe Stock explicitly excluded from the synthesis, disclosed above, not incorporated"; the claim's own `Source authority/type` line: "synthesized across **three** independently-verified providers -- Getty, iStock, Shutterstock... Adobe Stock explicitly excluded" |

**Determination: C — limited to Getty, iStock, and Shutterstock specifically.** Unlike -001, this claim's own text does not merely disclose a weaker Adobe-Stock evidence tier — it affirmatively states Adobe Stock is unconfirmed and excluded. **This is the single clearest piece of evidence in this entire review**: `CLAIM-STOCK-EDITORIAL-002-v1`'s own `CRC Candidate Statement` (already CRC-published, already user-facing-ready) reads *"Content that **Getty, iStock, or Shutterstock** mark 'Editorial'..."* — naming exactly three providers, by name, in text that has been live-eligible for CRC since 2026-08-18. The machine-readable `provider_scope: null` was never actually consistent with this claim's own already-published prose.

**Critical finding, per Step 4's own explicit instruction ("If one claim has a smaller evidence-supported scope, use the smaller scope"): the two claims do NOT share an evidence-supported scope.** The prior diagnostic's proposed uniform correction — `['getty', 'istock', 'shutterstock', 'adobe-stock']` for both — is **confirmed wrong for `-002-v1`**, which must NOT include Adobe Stock.

## 2. Corrected scope, per claim (Step 4/§G)

- `CLAIM-STOCK-EDITORIAL-001-v2` (proposed): `provider_scope: ['getty', 'istock', 'shutterstock', 'adobe-stock']`
- `CLAIM-STOCK-EDITORIAL-002-v2` (proposed): `provider_scope: ['getty', 'istock', 'shutterstock']` — **Adobe Stock excluded**, matching the claim's own already-published text exactly.

## 3. provider_scope semantics — re-confirmed, not assumed (Step 5)

Re-read `TopicClaim.provider_scope`'s own doc comment directly (`retrieval-engine/types.ts`) this review: *"Answers exactly one question: for which recognized asset provider(s), if any, is this claim a valid topic candidate at all."* The proposed correction uses this exactly as documented — a list of real, named, individually-evidenced provider identities, not a synthetic "stock-media" pseudo-identifier and not an attempt to encode a media-type/domain boundary through this field. **Explicitly confirmed: the corrected lists must never be read as "all stock-media providers" as an open class.** A future fifth stock provider (e.g. Pond5, Storyblocks) does **not** automatically inherit either claim merely by being a stock-image provider — it would need its own governance review determining whether these two claims' own evidence basis genuinely extends to it, following the identical discipline just applied to Getty/iStock/Shutterstock/Adobe Stock here. This preserves fail-closed behavior for every provider not explicitly, individually evidenced — the correction narrows an over-broad `null` to a evidence-bounded set; it does not swap one over-broad category (all providers) for a different, still-open one (all stock providers).

## 4. Correction mechanism — supersession, not in-place edit (Step 6)

**Determination: B — supersede v1 with a corrected v2.** Reasoning:
- `provider_scope` is documented as "Governed runtime metadata... REQUIRED... An author must make an explicit, reviewed choice" — core governed content, not incidental metadata a lighter correction mechanism would suffice for.
- This is **not** the same shape as `CPR_002`'s own prior in-place bounded correction (that corrected only the *derived* `crc_publication_scope`/`crc_candidate_statement` text to restore a caveat already present in the unchanged Claim proposition — a presentation-layer fix). This correction changes `provider_scope`, a field that governs **which conversations the claim can appear in at all** — a materially different, more consequential kind of change.
- This repository's own established governance culture (confirmed via `governance-reviews/README.md`'s own "Nothing inside that boundary is ever edited after the fact... A superseded or corrected analysis gets a new review artifact, never a rewritten old one" discipline, applied consistently to every FGR/CPR/DAR artifact to date) treats historical decision records as immutable, correcting via supersession rather than retroactive edit. Applying the identical discipline to the underlying claim entries themselves (not just their review artifacts) is the natural, consistent extension — not a new philosophy.
- **`v1`'s own historical record must remain untouched**: it accurately reflects what was actually reviewed and CRC-approved on 2026-08-17/18, under the evidence and reasoning available at that time. The defect being corrected here is real, but it does not retroactively invalidate that `v1` was a good-faith, evidence-consistent decision at adoption/publication time for the questions then asked (safety of the text, routing correctness under the-then-only-existing four-stock-provider universe) — it simply was never tested against a second media-type domain, because none existed yet.
- Confirmed via direct `grep`: supersession has **never actually been exercised** in this repository before — this would be its first real use, exactly the same "mechanism existed in the schema before its first real exercise" pattern already established for `DAR_001` (first Dependency Askability Review) and `CPR_006` (first combined CRC Publication Review).

## 5. FGR/CPR requirement (Step 7)

**Both a bounded FGR-equivalent review (this artifact) AND an explicit CRC-eligibility re-affirmation are required — the latter is NOT automatically inherited from v1.** Per `CRC-PUBLICATION-POLICY.md` Principle 1 ("never inferred from Status, never defaulted to Yes... and never extended to a sub-claim just because a neighboring claim... was approved") and this repository's own consistent discipline that CRC eligibility is always a separate, explicit, individually-recorded decision — **the intuition that narrowing can only ever be safe, and therefore needs no fresh sign-off, is correctly flagged by this task as unsafe to assume, and is not adopted here.** This review's own recommendation (§7 below) is that CRC-eligibility carry forward, but as an explicit recommendation requiring its own human decision, not as something silently inherited.

## 6. CPR impact — does v1's CRC publication remain valid (Step 7 continued)

**Recommendation: YES, CRC-eligibility should carry forward to v2 for both claims, but this requires explicit re-affirmation, not silent inheritance.** Reasoning: narrowing `provider_scope` strictly reduces the set of conversations in which the claim can appear — every prior CPR finding (`CPR_001`'s/`CPR_002`'s own routing-safety, Case 3B-firing, and composition-quality analysis) remains true for every conversation where the corrected, narrower `provider_scope` still matches, because nothing about the claim's *own* text, dependencies, or applicability changed. The only behavioral difference is that the claim now correctly stops appearing in conversations it was never evidenced for (Artlist, Envato, Epidemic Sound, and — new information this review surfaces — **any conversation naming a stock provider outside the evidenced four/three**, e.g. Pond5, Unsplash, Storyblocks, which were equally out-of-scope before this correction and remain so after). No new overclaiming risk is introduced. **A minimal CPR-equivalent re-affirmation (not a full new CPR from scratch — the prior CPR's own analysis of text safety and routing behavior remains valid and is not being redone) is still the correct governance step**, recording explicitly that the corrected `provider_scope` was reviewed and CRC-eligibility re-confirmed, rather than treating v2 as automatically inheriting v1's `CRC Eligible: Yes` by default.

## 7. Proposition wording assessment (Step 10)

**Neither claim requires a wording change.**
- `-001`: proposition already uses hedged, indefinite phrasing ("A stock-media provider's standard license...") — never claims universality beyond "a" provider; `provider_scope` narrowing to the 4 evidenced providers introduces no new mismatch with this wording.
- `-002`: proposition **already explicitly names exactly the 3 providers** the corrected `provider_scope` would encode ("confirmed for Getty, iStock, and Shutterstock... not... for Adobe Stock"). The correction makes the machine-readable field **catch up to** wording that was already precise — this is the cleanest possible case, requiring zero editorial judgment calls.

**Classification: A — provider_scope alone is sufficient to bound both claims; no wording change required for either.**

## 8. CRC Candidate Statement assessment (Step 11)

- `-001`'s statement ("A stock-media provider's standard license for content marked 'Editorial' generally covers...") is unaffected in substance by narrower routing — it remains exactly as safe as `CPR_001` already found it, now simply shown to fewer, more correctly-scoped audiences.
- `-002`'s statement ("Content that **Getty, iStock, or Shutterstock** mark 'Editorial'...") **already names the exact three corrected providers verbatim** — narrowing `provider_scope` to match makes this statement's own implicit scope claim and its actual routing scope **consistent for the first time**, rather than (as today) technically reachable in contexts its own text doesn't even claim to cover. **No broadening occurs; the correction only ever narrows.** Neither statement asserts unsupported universality — both were already appropriately hedged or provider-named in their own text.

## 8b. Retrieval consequence — read-only verification, no code touched (Step 8/9)

Traced against the actual, unmodified `providerScopeMatches` implementation (`lookup-topic-claims.ts`): `claim.provider_scope.some(p => assetProviders.includes(p))`. With the corrected arrays:
- `providerScopeMatches({provider_scope: ['getty','istock','shutterstock','adobe-stock']}, ['artlist'])` → `false` (correctly excluded)
- `providerScopeMatches({provider_scope: ['getty','istock','shutterstock']}, ['artlist'])` → `false` (correctly excluded)
- `providerScopeMatches({provider_scope: [...]}, ['getty'])` → `true` for `-001` and `true` for `-002` (correctly included, both claims list Getty)
- `providerScopeMatches({provider_scope: ['getty','istock','shutterstock']}, ['adobe-stock'])` → `false` for `-002` specifically (correctly excludes Adobe Stock from `-002` while `-001` would still correctly include it) — **this asymmetric behavior between the two claims for an Adobe Stock mention is itself new, correct behavior the current `null`/`null` state cannot express today.**

Identical logic applies unchanged in `lookup-discovered-topic-claims.ts` (confirmed — same `providerScopeMatches` import, same call pattern, verified in the prior diagnostic and re-confirmed by re-reading the function this review). **Both explicit-goal and discovered-relevance paths behave identically under the correction — no code touched, no divergence between the two paths.**

## 9. Fail-closed check (Step 9)

Post-correction: Getty in scope for both (evidenced for both) ✓. iStock in scope for both (evidenced for both) ✓. Shutterstock in scope for both (evidenced for both) ✓. Adobe Stock in scope for `-001` only (asymmetric, evidence-driven, correct) ✓. Artlist excluded from both ✓. Envato excluded from both ✓. Epidemic Sound excluded from both ✓. Any future unrecognized provider excluded from both by construction (`providerScopeMatches` returns `false` for any identifier not literally present in the array) ✓. **Consistent with Living Knowledge fail-closed principles throughout — narrowing is the fail-closed direction; nothing about this correction weakens any existing gate.**

## 10. Music portability consequence (Step 12)

**YES.** After this correction, Artlist (or Envato, or Epidemic Sound) can be registered as a recognized provider without either `CLAIM-STOCK-EDITORIAL-001-v2` or `-002-v2` becoming a Retrieval candidate for a Music-provider-only mention — confirmed directly in §8b above, both explicit-goal and discovered-relevance paths. **This governance correction, once approved and recorded, fully resolves the confirmed §M domain-bleed defect on its own — no generic architecture change is required to unblock the Artlist canary.**

## 11. Option 5 (new domain/source-category dimension) — not required now (Step 13)

Confirmed: with per-provider evidence audited and a precise, provider-identity-only correction available and sufficient (§10), a generic source-category/media-type dimension is **not required** to resolve the currently-confirmed defect or to unblock the Artlist/A-3 canary. This finding is **not contradicted** by anything in this review. Option 5 remains a legitimate, separate, non-blocking future architecture consideration for a genuinely different future scenario (a claim that is truly cross-domain by evidence, which neither `-001` nor `-002` turned out to be) — not designed or implemented here.

--- END VERBATIM GOVERNANCE CORRECTION REVIEW ---
