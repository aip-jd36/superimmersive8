Title: Formal Governance Review #13 — Kling Commercial-Use Baseline + Member-Account Exception

Reviewed object:
- CAND-KLING-COMMERCIAL-USE-BASELINE-001
- CAND-KLING-COMMERCIAL-USE-MEMBER-001

Review date: 2026-09-02

Artifact type: Formal Governance Review (adoption stage) — first Formal Governance Review of the Kling proposition at the `GOVERNED-CLAIMS.md`/`TopicClaim` layer specifically. Kling has carried a `Yes`-decided legacy `PLATFORM-RIGHTS-MATRIX.md` row since 2026-08-24, under that document's own, separate authoring process — this review independently re-determines Adoption for the `TopicClaim` representation, per `CRC-PUBLICATION-POLICY.md`'s own explicit text: "Adoption is a Living Knowledge governance decision under ordinary FGR criteria, independent of Matrix coexistence." The Matrix's historical `CRC Eligible: Yes`/`CRC Approver: JD`/`CRC Decision Date: 2026-08-24` is treated throughout as historical governance evidence and reusable primary-source provenance — never as TopicClaim Adoption or Publication authority in its own right. Conducted as a dedicated human-reviewed governance review this session, then persisted directly to this file as authorized.

PM decision: **ADOPT BOTH (PM: JD, Adoption Decision Date: 2026-09-02).** Two atomic candidates, evaluated separately, both reaching ADOPT: (1) the unconditional written-permission-required default (K1 §4.6); (2) the Kling Member Account commercial-use exception (K2 §1.4-1.6, §3.1.2, §3.1.5, §4.3.3), carrying a genuine `applicability_requirements` gate on the existing, already-governed `tool_account_status` fact, and using `claim_character: conditional` — the first claim in this corpus to do so. Both `tool_scope: ['kling']`, `provider_scope: null`, `jurisdiction: Global` (transitional platform-contractual placeholder, 2026-08-30 convention). This is a Living Knowledge Adoption decision only — it is explicitly not CRC Publication approval (separate, later CPR required — see `CPR_013`), not Commercial Assurance, and not commercial or legal clearance.

Historical status: VERBATIM ARCHIVE — DO NOT EDIT HISTORICAL BODY once PM's decision is recorded. Future amendments should be appended outside the body below, or captured in a new review artifact — never inserted into the verbatim body.

Source: reconstructed verbatim from this session's own conversation transcript (the immediately preceding turn's own Formal Governance Review response), not from memory, not from the condensed summary that will appear in `GOVERNED-CLAIMS.md` — mirrors `CPR_002`'s/`CPR_006`'s own established reconstruction precedent for this repository.

--- BEGIN VERBATIM FORMAL GOVERNANCE REVIEW ---

# Kling Commercial-Use Baseline + Member-Account Exception — Formal Governance Review

## 0. Repository / governance state verified before review

LK dedicated worktree (`work/lk-eu-ai-act-art50-research`) confirmed at `HEAD == origin/main == 1ab0bcd` before this review began. Main worktree's pre-existing WIP and the concurrent Consultative Composition (`work/crc-cc3a-answer-plan`) worktree confirmed untouched throughout. Authoritative material read directly this review: `CRC-PUBLICATION-POLICY.md` (all seven Principles + the tool-scoped legacy-coexistence practice), `GOVERNED-CLAIMS.md`'s own governance-discipline header and entry template, `governance-reviews/README.md`'s naming/verbatim conventions, `LK_PHASE1_TECHNICAL_DESIGN.md` §6 (`claim_character` definitions), `PLATFORM-RIGHTS-MATRIX.md`'s Kling section, `matrix-fixture.ts`'s Kling row, `retrieval-engine/types.ts` (`APPLICABILITY_FACTS`), `retrieval-engine/lookup-topic-claims.ts` (`evaluateRequirementStatus`), `crc-engine/selector-askability.ts`, and — as governance precedent, not FGR-shape imitation — `FGR_010`, `FGR_011`, `FGR_012`, and `CPR_009` (the corpus's only prior real `tool_scope`-narrowed review) in full.

## 1. Proposition under review

**Candidate 1 (baseline):** Under Kling's current Terms of Service, using generated Output for commercial purposes without Kling's written permission is not permitted by default (K1 §4.6). Unconditional; not gated on account status.

**Candidate 2 (member exception):** If the account currently holds a Kling Member Account — defined by K2 §1.4-1.6 as being subscribed to Kling's Membership Service specifically, not merely "having paid Kling anything" (Credits/Separately Purchased Services are Paid Services under K2 §1.1 without conferring Member status, per K2 §4.3.3) — Kling's current Terms of Paid Service (K2 §3.1.2, §3.1.5) permit commercial use of generated Output without additional written permission, except for developing or offering products or services that compete with Kling AI.

## 2. Evidence chain — historical provenance vs. primary evidence, kept distinct

**Primary evidence (category 1):** K1 — Kling AI Terms of Service (`kling.ai/docs/user-policy`), and K2 — Kling AI Terms of Paid Service (`kling.ai/docs/payment-policy`), both Release/Effective 2026-04-21, human-captured via browser Print-to-PDF, directly read in full and cross-checked twice with zero discrepancy. §4.6 (K1), §1.4-1.6/§3.1.2/§3.1.5/§4.3.3 (K2) quoted, not paraphrased, in the Matrix's own row comments and reconfirmed directly against that quoted text by this review.

**Historical governance decision (category 2), not substituted for category 1:** the Matrix's own `Status: Verified`, `CRC-Eligible: Yes` ×2, `CRC Approver: JD`, `CRC Decision Date: 2026-08-24` — the Matrix's own lighter, two-column authoring process, not the FGR/CPR discipline this document requires. No FGR or CPR artifact for Kling existed anywhere in this repository before this review.

**Legacy runtime representation (category 3):** `matrix-fixture.ts`'s two `MatrixClaim` entries and the `retrieve.ts` Matrix lookup path — confirmed reachable today, correctly fail-closed on the account-status gate (see §7 below), unaffected by this review.

## 3. Evidence freshness

Direct re-fetch of both `kling.ai/docs/user-policy` and `kling.ai/docs/payment-policy` returned HTTP 446 (a pre-existing, previously disclosed access limitation, not new to this review). A bounded, non-primary corroborating check found only convergent secondary summaries restating the same written-permission/tiered-commercial-use substance, with one source independently confirming Kling's content policy was updated 2026-04-21 — matching K1/K2's own Release/Effective Date exactly, with no indication of a later change. Evidence is 9 days old at review time, already double-cross-checked at capture, and now corroborated (not merely unchallenged) by an independent live check. Comparable in strength to `CPR_010`'s Classification A freshness finding, well under the staleness threshold that drove the Synthesia AUP's own DEFER (2+ years) in `CPR_009`. **Adequate for this Adoption review; DEFER not warranted on freshness grounds.**

## 4. Proposition decomposition

The Matrix's existing two-claim decomposition was independently re-tested against the primary text, not simply inherited: K1 §4.6 states an unconditional universal default; K2 §3.1.2/§1.4-1.6 states a membership-conditioned exception whose own truth depends on a fact (current Member Account status). These are two materially different propositions — one holds regardless of a fact, the other's truth is conditioned on that fact — and merging them into one claim was the exact defect a prior architecture pass ("Model B decomposition," per `matrix-fixture.ts`'s own comment) was created to correct. **The evidence supports exactly two propositions**, matching the existing Matrix decomposition; this was confirmed, not assumed.

## 5. Provider / topic / tool scope

`provider_scope: null` on both — no third-party asset provider involved. `topic: 'commercial_use'` on both — direct fit, not a re-purposed adjacent category. `tool_scope: ['kling']` on both — `'kling'` is an existing `CANONICAL_TOOL_ID` (registry.ts), requiring zero registry work.

## 6. Applicability requirements

**Candidate 1:** `applicability_requirements: []` — the K1 §4.6 default applies regardless of account status.

**Candidate 2:** `applicability_requirements: [{ fact: 'tool_account_status', tool: 'kling', operator: 'equals', value: 'Member Account' }]`. Confirmed by direct code inspection: `tool_account_status` is a fully implemented, first-class member of `APPLICABILITY_FACTS` (`retrieval-engine/types.ts`, added specifically for Kling, 2026-08-24), evaluated by `evaluateRequirementStatus` (`lookup-topic-claims.ts`) with the identical `unresolved` / `not_met` / `met` three-state logic already governing `tool_plan_tier` and `jurisdiction`. This requirement is genuinely representable under existing, unmodified architecture — no new fact type, no new evaluator branch, no schema change.

## 7. Askability — corrected finding, superseding stale Matrix prose

`tool_account_status` is **already registered `askable_in_crc`** (`selector-askability.ts`, "Activate tool_account_status Selector milestone," 2026-08-24, PM/Architecture ACCEPT/GO following a bounded live-model UAT) — a single fixed, generic, non-LLM-generated question template (`"Do you know what kind of {tool} account or membership you currently have?"`), with Kling recorded explicitly as "the first governed consumer, never special-cased." `PLATFORM-RIGHTS-MATRIX.md`'s own prose at its Kling section ("This fact is not registered askable... Selector activation is a separate, not-yet-authorized governance decision") is **stale relative to actual code state** and must not be relied upon going forward — flagged here as disclosed documentation debt, corrected in no file by this review (out of this review's own scope; see §12). Askability itself is not re-decided by this review — it is already governed, and this review preserves it exactly as-is. Fail-closed remains correct whenever the fact is unresolved: the selector's role is only to let CRC proactively ask, never to guess or infer.

## 8. Unresolved project dependencies

Both candidates: `unresolved_project_dependencies: []`. The one genuine open question in the source material — whether Member Account status must hold at generation time, at commercial-use time, or continuously (K1/K2 do not state this) — is a gap in the source documents themselves, not a project-specific fact CRC could model, and is therefore recorded as a Prohibited Conclusion (§10), not an unresolved dependency.

## 9. `claim_character`

Tested against `LK_PHASE1_TECHNICAL_DESIGN.md` §6's operative definitions: `established` = a proposition that is an unconditional stated rule (independent of whether it also carries a `jurisdiction`- or `tool_scope`-style applicability gate — e.g. `CLAIM-COPY-001-v1` is `established` despite its own `jurisdiction` requirement); `conditional` = a proposition whose own truth is conditioned on a fact, with that condition captured in `applicability_requirements`. Candidate 1 is a flat, unconditional rule — `established`. Candidate 2's truth is conditioned on current Member Account status — `conditional` is the textbook fit, and would be the corpus's first real use of this character. Direct code inspection (`grep claim_character` across `lib/`) confirms this field is read by **zero production Retrieval/Bounded Interpretation/Composition code** — its only non-authoring reference is a reporting script filtering for `'unsettled'`, which does not apply here. Using `conditional` therefore introduces no architecture risk and requires no governance decision beyond ordinary FGR judgment; it is already fully specified by the frozen technical design. **Authorized under ordinary FGR authority — no separate policy decision required, no STOP triggered.**

## 10. Prohibited conclusions

**Candidate 1:** does not establish branding requirements, training-data provisions, downstream IP clearance, ownership analysis, membership status, or any broader commercial-readiness conclusion.

**Candidate 2:** does not establish branding requirements, training-data provisions, downstream IP clearance, ownership analysis, membership status at any time other than currently, whether the account's use falls within the "competing products or services" carve-out, or any broader commercial-readiness conclusion. Does not establish whether Member Account status must persist beyond the moment it is confirmed (temporal semantics not established by K1/K2).

## 11. Jurisdiction

Platform/product contractual representation, not a legal-jurisdiction-scoped rule. The existing bounded transitional compatibility convention (`jurisdiction: 'Global'`, PM/Architecture decision 2026-08-30) applies to both candidates, identically to its existing use for the Stock, Music, Synthesia, Storyblocks, Pond5, and Adobe Stock claims. Not reinterpreted here; does not assert worldwide legal validation of either proposition.

## 12. Architecture discovery

None required for Adoption. This review confirmed, rather than assumed, that `tool_account_status` (§6-§7) and `claim_character: conditional` (§9) are both already fully supported by existing, unmodified architecture. One disclosed, non-blocking documentation-debt item was found and is explicitly NOT corrected by this review, per its own scope discipline: `PLATFORM-RIGHTS-MATRIX.md`'s Kling section prose describing `tool_account_status` as "not yet authorized" for askability is stale relative to the actual 2026-08-24 code state (§7) — flagged for a future, separately-authorized documentation cleanup pass, not fixed here.

## 13. Representation readiness

Both candidates' fields (topic, claim_character, jurisdiction, applicability_requirements, unresolved_project_dependencies, provider_scope, tool_scope) are structurally complete and valid against the existing `TopicClaim` schema — confirmed by direct field-by-field inspection against `retrieval-engine/types.ts`, not asserted. No `TOPIC_CLAIMS_FIXTURE` entry is added by this Adoption — governance and runtime activation remain separate, independently-timed acts, per the Synthesia/Storyblocks/Pond5/Adobe Stock precedent.

## 14. Decision

**ADOPT BOTH.**

- `CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1`: `Lifecycle: Adopted`, `Claim character: established`, `Adoption Approver: JD (PM)`, `Adoption Decision Date: 2026-09-02`, `Publication scope: Reviewer/Commercial Assurance`. `CRC Approver`/`CRC Decision Date` remain `PENDING` — CRC Publication Review is a separate, later stage (see `CPR_013`).
- `CLAIM-KLING-COMMERCIAL-USE-MEMBER-001-v1`: `Lifecycle: Adopted`, `Claim character: conditional`, `Adoption Approver: JD (PM)`, `Adoption Decision Date: 2026-09-02`, `Publication scope: Reviewer/Commercial Assurance`. `CRC Approver`/`CRC Decision Date` remain `PENDING`.

Neither ADOPT decision implies CRC eligibility — that determination belongs entirely to `CPR_013`, not this review. The historical Matrix `CRC Eligible: Yes` decision for the corresponding legacy rows is unaffected, unmodified, and not retired by this review — Matrix retirement, if ever warranted, is a separate, later publication/integration decision (see `CPR_013` §I for the dedicated coexistence inspection).

--- END VERBATIM FORMAL GOVERNANCE REVIEW ---
