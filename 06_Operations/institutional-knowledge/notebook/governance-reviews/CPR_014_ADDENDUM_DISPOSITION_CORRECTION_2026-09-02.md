Title: Addendum — Disposition Vocabulary Correction to CPR_014 (Kling Commercial-Use Reconsideration)

Corrects: `CPR_014_KLING_COMMERCIAL_USE_RECONSIDERATION_PACKAGE_2026-09-02.md` §4 ("Disposition") only.

Addendum date: 2026-09-02, later same session.

Nature of this artifact: a governance-vocabulary correction, not a substantive re-review. Per this folder's own "nothing inside that boundary is ever edited after the fact" discipline (established by the `CPR_007`/`CPR_009` addendum precedent), `CPR_014`'s own verbatim body is left completely unedited. This note is filed as a standalone addendum file rather than a `README.md` narrative addendum only because `FGR_013`/`CPR_013`/`FGR_014`/`CPR_014` are not yet indexed in `README.md` at all — a pre-existing indexing gap this addendum does not attempt to close, flagged here only for a future indexing pass.

--- BEGIN ADDENDUM ---

## 1. What is being corrected

`CPR_014` §4 recorded the disposition **"CONDITIONAL APPROVE — contingent on execution"**, self-disclosed at the time as "not an established disposition type in this repository's prior CPR vocabulary (APPROVE / WITHHOLD / DEFER)."

A subsequent, independent, strictly read-only governance diagnostic (this session, human-reviewed) tested that self-disclosure against actual repository authority rather than accepting it as sufficient justification on its own, and found:

- `CRC-PUBLICATION-POLICY.md`'s coexistence-check practice names exactly **APPROVE or WITHHOLD**.
- `CPR_008` §T independently confirms the full operative CPR disposition vocabulary as **APPROVE / WITHHOLD / ESCALATE**.
- `CRC_ELIGIBLE_VALUES` (`retrieval-engine/types.ts`) is exactly `['Yes', 'No', 'Pending']` — no fourth structured value exists anywhere in code.
- `CPR_013` §21 (Kling's own immediately-prior review) and `CPR_008` §N (the NY Likeness precedent) both already demonstrate that ordinary **WITHHOLD** carries a precise blocker, an explicit non-substantive characterization, and a stated reconsideration condition — the exact content `CPR_014` needed to express.
- `GOVERNED-CLAIMS.md` was never actually modified by `CPR_014` in the first place — both Kling claims' `CRC Approver`/`CRC Decision Date` remained `PENDING`, unchanged, identical to a WITHHOLD state. Structurally, the ledger has been recording WITHHOLD this entire time.

**Conclusion of that diagnostic, adopted by this addendum:** no new disposition concept was needed. `CPR_014`'s underlying substantive reasoning (§1–§3, §5–§6 of its verbatim body) is sound and is **not** re-litigated or reopened by this addendum. Only §4's disposition label was incorrect.

## 2. Corrected authoritative disposition

For both:
- `CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1`
- `CLAIM-KLING-COMMERCIAL-USE-MEMBER-001-v1`

the authoritative disposition is:

**WITHHOLD.**

Reason: `FGR_014` resolved the question of whether retirement of the corresponding legacy Matrix claim is *authorized*. It did not resolve whether that retirement has been *executed*. As of this addendum, `kling-commercial-use-baseline` and `kling-commercial-use-member` remain `crc_eligible: 'Yes'`, live, unmodified, in `PLATFORM-RIGHTS-MATRIX.md`/`matrix-fixture.ts`. Therefore the coexistence blocker `CPR_013` §13–§14 identified — and that `CPR_014` §3 itself already correctly re-confirmed was still present today — remains present under current governed/runtime state.

This WITHHOLD is explicitly **not**:
- a finding that either Kling proposition is inaccurate;
- an evidence rejection;
- a reversal of `FGR_013`;
- a reversal of `FGR_014`;
- a new `unresolved_project_dependency`;
- an applicability condition.

It is a publication-layer WITHHOLD only, identical in kind to `CPR_013`'s own — not a contradiction of `CPR_014`'s substantive analysis, which correctly found the underlying evidence and applicability strong; only the label attached to that analysis is corrected here.

## 3. Updated reconsideration condition

- **Prior blocker** (`CPR_013`): authority to retire the equivalent Matrix representation had not yet been established.
- **Current blocker** (this addendum, superseding the above): the now-authorized (`FGR_014`) Matrix retirement has not yet been **executed**.

This narrowing is `CPR_014`'s own genuine substantive contribution and is preserved exactly — only its label was wrong, not this finding.

**Execution does not automatically yield APPROVE.** A future CPR reconsideration, conducted at or after execution, must independently re-verify — not merely confirm the coexistence blocker is cleared — at minimum:
- evidence freshness (K1/K2, independently re-checked, not inherited from a same-day or stale prior finding);
- provider/source status (no superseding Kling terms in the interim);
- proposition scope (no drift from the Adopted wording);
- applicability (the `tool_account_status` gate on the member claim, unchanged);
- dependencies (`unresolved_project_dependencies: []`, unchanged, re-confirmed);
- fail-closed behavior (unresolved/unknown account status still correctly withheld, not guessed);
- Matrix/TopicClaim coexistence (empirically re-tested post-execution, per `CPR_014` §5.4 — the pre-execution canary tested the problem, not the fixed state);
- any other intervening governance or implementation change since this addendum.

## 4. Structured state — no ledger change required

`GOVERNED-CLAIMS.md` requires no correction. Both Kling claims already correctly show:
- `Lifecycle: Adopted`
- `CRC Approver: PENDING`
- `CRC Decision Date: PENDING`

No `crc_eligible: Yes` was ever set by `CPR_014`, and none is set by this addendum. The ledger has been, and remains, structurally consistent with WITHHOLD throughout.

## 5. Relationship to FGR_014 — unchanged, preserved exactly

This addendum does not alter `FGR_014` in any respect. `FGR_014` continues to mean exactly what it stated:
- future Matrix retirement is **authorized** as representation supersession;
- it does **not** mean Matrix retirement has occurred;
- it does **not** mean successor TopicClaim publication is approved;
- it does **not** predetermine the future CPR result at execution time.

## 6. What this addendum does not do

Does not modify `CPR_014`'s committed file. Does not modify `FGR_014`. Does not modify `GOVERNED-CLAIMS.md`. Does not modify `PLATFORM-RIGHTS-MATRIX.md` or `matrix-fixture.ts` — both Kling Matrix rows remain live, `crc_eligible: 'Yes'`, unannotated. Does not add either TopicClaim to any runtime fixture. Does not perform, plan the mechanics of, or authorize execution of the coordinated activation transition. The current safe state remains exactly: **Matrix live, TopicClaim withheld.**

--- END ADDENDUM ---
