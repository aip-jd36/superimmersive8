Title: Formal Governance Review #14 — Kling Matrix Retirement Authorization (Matrix Retirement Review, first of its kind)

Reviewed objects:
- `PLATFORM-RIGHTS-MATRIX.md` / `matrix-fixture.ts` row `kling-commercial-use-baseline` (`MatrixClaim` `kling-commercial-use-baseline`)
- `PLATFORM-RIGHTS-MATRIX.md` / `matrix-fixture.ts` row `kling-commercial-use-member` (`MatrixClaim` `kling-commercial-use-member`)
- Successor TopicClaims: `CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1`, `CLAIM-KLING-COMMERCIAL-USE-MEMBER-001-v1`

Review date: 2026-09-02

Artifact type: **Matrix Retirement Review (MRR) — a genuinely novel decision type this repository's naming convention has not previously needed to name**, disclosed explicitly rather than silently forced into an ill-fitting existing category or invented as an unreviewed new convention. No `MRR_NNN` naming slot, README index section, or prior instance exists anywhere in this repository (confirmed by direct search of `governance-reviews/` and its own `README.md` before this artifact was written). Filed under the `FGR_NNN` naming slot (continuing the existing Formal Governance Review sequence, now at #14 — independent of CPR's own sequence, per this folder's own established naming convention), following the exact precedent `FGR_007` ("Governance Correction Review") set for exactly this situation: a decision about the representation-authority status of already-published governed content that does not cleanly fit the FGR/CPR/DAR three-stage ontology as originally scoped, filed under the closest structurally-analogous existing sequence rather than a silently invented new one. Unlike `FGR_007`, this review's subject is a Matrix claim's *authorization to cease being the active CRC-serving representation* (a decision with no Adoption-layer or CRC-eligibility-layer analogue for the Matrix side, since `MatrixClaim` carries no `Lifecycle`/`superseded_by` field at all), not a TopicClaim-to-TopicClaim `v1 -> v2` correction — so this artifact does not use `FGR_007`'s supersession mechanism and does not touch `Version lineage`/`superseded_by` on any object. **Recommendation to a future reader:** if Matrix Retirement Reviews recur, a formal `MRR_NNN` naming convention and README index section should be introduced the same deliberate way `DAR` was introduced 2026-08-21 (a new artifact type named and documented before its second instance) — this artifact does not itself establish that convention; it is filed under the closest existing precedent, once, disclosed as such.

PM decision: **JD/PM decision, 2026-09-02, verbatim, as given to this task:** "Matrix retirement is AUTHORIZED for both existing Kling commercial-use Matrix claims as representation supersession, not substantive reversal, subject to the successor TopicClaims independently passing CPR reconsideration and to retirement being executed only as part of a transition that never exposes equivalent Matrix and TopicClaim representations simultaneously."

Historical status: VERBATIM ARCHIVE — DO NOT EDIT HISTORICAL BODY once PM's decision is recorded. Future amendments should be appended outside the body below, or captured in a new review artifact — never inserted into the verbatim body.

Source: written directly to this file as the review was conducted this session, immediately following the JD/PM authorization given in this session's own conversation.

--- BEGIN VERBATIM MATRIX RETIREMENT REVIEW ---

# Kling Matrix Retirement — Formal Authorization Record

## 0. Repository / governance state verified before this artifact was written

LK dedicated worktree (`work/lk-eu-ai-act-art50-research`) confirmed at `HEAD == eaa1c0fa12add32c474f06bc7b1a9b843fd5465b`, `origin/main == 02dd13d1c74548f3bfeb5dc795f37650a5654f9a`, 2 ahead / 0 behind, working tree clean, before this artifact was written. Main worktree's pre-existing WIP, the concurrent Consultative Composition worktree (`si8-cc3a`, `work/crc-cc3a-answer-plan`), and a further `si8-cc3b` worktree (`work/crc-cc3b-surface-realization`) confirmed present and untouched by this task. `origin/main` had not advanced beyond the expected baseline at time of writing.

## 1. What this artifact is and is not

This artifact **authorizes retirement in principle**. It does **not**, by itself:
- modify `PLATFORM-RIGHTS-MATRIX.md` or `matrix-fixture.ts` — both Kling rows remain exactly as they were on 2026-08-24, `crc_eligible: Yes`, unmodified;
- flip either Matrix claim's `crc_eligible` value to `'No'`;
- grant CRC eligibility to either successor TopicClaim — that is the separate, later CPR reconsideration this same task also conducts, persisted as `CPR_014` (see below), not this artifact;
- execute the coordinated activation transition (Matrix flip + TopicClaim runtime-fixture publication) — that remains a distinct, separately-authorized future task, per the JD/PM decision's own second condition.

This artifact is the durable record of the first condition being satisfied: an explicit, dated, attributed decision from the authority role established as sufficient by the earlier read-only Matrix Retirement Review (this session) — JD (PM), matching the original 2026-08-24 Matrix `CRC Approver: JD` authority.

## 2. Objects authorized for retirement

| Matrix claim | Successor TopicClaim | Retirement mechanism (when executed) |
|---|---|---|
| `kling-commercial-use-baseline` | `CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1` | `crc_eligible: 'No'` on the Matrix claim + dated prose annotation (existing free-text convention; no new field) |
| `kling-commercial-use-member` | `CLAIM-KLING-COMMERCIAL-USE-MEMBER-001-v1` | Same mechanism |

Both are `TopicClaim`s already `Lifecycle: Adopted` (`FGR_013`, 2026-09-02), currently `CRC Publication Scope: WITHHELD FROM CRC` (`CPR_013`, 2026-09-02), with `Adoption Approver: JD (PM)` already recorded.

## 3. Classification: Representation Supersession, not Substantive Reversal

Confirmed, not merely asserted: the earlier read-only Matrix Retirement Review (this session) tested this distinction against actual repository policy text rather than assuming it, finding `CPR_013`'s own §21/§22 language already states this is "a publication-layer, not adoption-layer, finding," "not a finding that this claim's own content is inaccurate, unsafe, or should be distrusted," and "not a Matrix retirement decision — none is made, authorized, or implied by this review." The sole reason for retirement is `CPR_013` §13-§14's empirical finding that simultaneous Matrix + TopicClaim publication produces verbatim duplicate CRC output — a representation/coexistence problem, not a content-accuracy problem with either representation individually. Both the Matrix claims' own text and the successor TopicClaims' own text remain, on their own terms, accurate and unretracted.

## 4. Mechanical encoding, recorded for later execution (not performed here)

Per the earlier Matrix Retirement Review's own finding (§F/§G of that review): `crc_eligible = 'No'` is the correct, already-schema-supported mechanical encoding — `enumerateEligibleClaims` already treats `'No'` as excluded from Retrieval, identically to `'Pending'`, and no new field, enum value, or type is required. Bare `'No'` alone is insufficient because it is indistinguishable from "never approved" or "evidence deemed insufficient." **Required at execution time:** a dated, attributed prose annotation on each Matrix row (using the Matrix's existing free-text-field convention — no new schema), recording: the original 2026-08-24 `Yes` decision/approver/date; the retirement decision/approver/date; explicit statement that this is representation supersession, not substantive reversal; and the successor TopicClaim ID. This artifact does not itself write that annotation — it authorizes it for the future execution task.

## 5. Conditions attached to this authorization (both must hold; neither is satisfied by this artifact alone)

**Condition A — successor CPR reconsideration must independently pass.** This authorization does not itself grant CRC eligibility to either TopicClaim. See `CPR_014` (this same task, separate artifact) for that independent determination — including its own finding on whether an unconditional standing `Yes` is even a coherent disposition while the Matrix claims remain live today (§7 below previews this; `CPR_014` is authoritative).

**Condition B — execution must never expose both representations simultaneously.** Per the earlier Matrix Retirement Review's transition-invariant finding, confirmed correct against `CPR_013`'s own empirical evidence: "CRC must never simultaneously expose substantively equivalent legacy and successor representations as independent authoritative results." The only orderings that satisfy this: (1) Matrix retirement executed no later than TopicClaim publication, ideally in the same bundled change/release, or (2) Matrix retirement executed first, TopicClaim publication following in a later, separate change. The rejected ordering — TopicClaim publication before Matrix retirement — reproduces the proven-unsafe coexistence state and is not authorized by this decision under any circumstance.

## 6. What this authorization does not decide

Does not decide the exact wording of the retirement annotation (left to the execution task, bound only by §4's requirements). Does not decide whether the coordinated activation happens as one commit or two ordered commits (left to the execution task, bound only by §5 Condition B). Does not decide timing. Does not authorize any change to Retrieval, Bounded Interpretation, Composition, or askability code. Does not authorize a runtime `TOPIC_CLAIMS_FIXTURE` entry for either claim independent of the bundled transition.

## 7. Relationship to CPR_014

This authorization is a necessary but not sufficient condition for eventual publication. `CPR_014`, conducted in the same task immediately following this artifact, independently determines whether — and in what form — CRC eligibility can actually be granted, given that as of this artifact's own writing, both Matrix claims remain live and `crc_eligible: Yes` (retirement is authorized, not executed). See `CPR_014` for that determination; this artifact does not pre-empt it.

--- END VERBATIM MATRIX RETIREMENT REVIEW ---
