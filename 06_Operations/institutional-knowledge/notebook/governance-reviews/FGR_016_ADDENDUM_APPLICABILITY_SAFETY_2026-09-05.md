Title: Addendum — Applicability Representation Safety Finding on FGR_016 (Pika Commercial-Use Candidate Formation)

Corrects/supplements: `FGR_016_CAND-PIKA-COMMERCIAL-USE-001_2026-09-05.md` — records a governance consequence discovered after adoption. Does not edit `FGR_016`'s verbatim body or the PM/JD adoption decision recorded there.

Addendum date: 2026-09-05, later same day.

Nature of this artifact: a post-adoption safety finding, not a substantive re-review of the underlying evidence. Per this folder's established "nothing inside a closed governance artifact is ever edited after the fact" discipline (the `CPR_007`/`CPR_009` addendum precedent, most recently applied in `CPR_014_ADDENDUM_DISPOSITION_CORRECTION_2026-09-02.md`), `FGR_016`'s own verbatim body and the PM/JD adoption decision it records are left completely unedited. No FGR-level addendum precedent existed before this file; the CPR-level addendum convention above is the closest and is adapted here rather than inventing a new format. `FGR_013`–`FGR_016`/`CPR_013`–`CPR_017` remain unindexed in `README.md` — a pre-existing gap this addendum does not attempt to close.

--- BEGIN ADDENDUM ---

## 1. What is being recorded

`FGR_016` adopted two Pika commercial-use claims, both correctly disposed **ADOPT** and both correctly left with PM/JD decision `PENDING` at formation time (confirmed unedited, unchanged by this addendum). The JD/PM decision of 2026-09-05 subsequently accepted that adoption.

A separate, independent, strictly read-only architecture diagnostic (this session, human-reviewed) then tested whether the adopted applicability representation for `CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-001-v1` is safe under current runtime semantics, and found that it is not, for a reason specific to how that condition is encoded — not to the underlying evidence.

## 2. Governance classification — four distinct things, not one

**(A) Primary evidence — remains supported, unchanged.** Pika's Free tier is restricted to personal, non-commercial use; Standard, Pro, and Fancy paid tiers carry commercial-use rights, undifferentiated among the three. Nothing in the diagnostic contradicts or reopens this.

**(B) Governed proposition — remains valid, unchanged.** The intended Free-versus-paid distinction that `FGR_016` adopted is correct as a statement of Pika's terms.

**(C) Adopted applicability representation — unsafe.** `CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-001-v1`'s applicability requirement is encoded as:

```
{ fact: 'tool_plan_tier', tool: 'pika', operator: 'not_equals', value: 'Free' }
```

`tool_plan_tier` is, by design, the same field as `ToolMention.plan_tier` (`types.ts` line ~151: `` `tool_plan_tier` (ToolMention.plan_tier, already exists)``) and is deliberately captured as the user's own verbatim wording, never translated to a branded canonical tier name (confirmed by the extraction system prompt's own instruction and a dedicated test, `anthropic-extractor-plan-tier-mapping.test.ts`, asserting exactly this). The applicability evaluator (`lookup-topic-claims.ts`) performs raw, case-sensitive string comparison for this fact with **no canonicalization** — its own code comment states plainly: *"`tool_plan_tier` requirements are deliberately NOT canonicalized here"* (line 81). No intervening change on `origin/main` as of this addendum alters this.

Empirically, against the real evaluator, the following confirmed `plan_tier` values all incorrectly resolve the requirement to `met` (i.e., incorrectly satisfy `not_equals 'Free'`) despite describing the Free tier:
- `'free'`
- `'the free plan'`
- `'free tier'`

Only the exact capitalized string `'Free'` correctly resolves to `not_met`. A user genuinely on Pika's Free tier, describing it in any ordinary phrasing other than that exact string, would be incorrectly granted the paid-plan commercial-use exception. This is a realistic outcome of ordinary conversation, not a contrived edge case.

**(D) Generic architecture — a real gap, not Pika-specific.** `tool_plan_tier` lacks the canonicalization/normalization discipline that safe applicability evaluation against raw user wording requires. This is a property of the fact class and the evaluator, not of Pika's proposition. No `IN`/`one_of`/array-membership operator exists either, and adding one would not by itself resolve (D) — a positive-set operator evaluated with the same raw-string comparison would have the identical problem in reverse (failing to match "the Standard plan" against "Standard").

This is explicitly **not**:
- a reversal of the primary evidence;
- a finding that the baseline proposition is false;
- a Composition defect (Composition never receives a chance to misrender anything here — the evaluator itself resolves incorrectly upstream, before Bounded Interpretation or Composition are ever reached).

## 3. Governance consequence

- `CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-001-v1` must **not** progress to CPR publication assessment in its currently encoded applicability form.
- It must **not** become CRC-eligible or published while so encoded.
- The unsafe condition must **not** be activated in runtime (i.e., must not enter `topic-claims-fixture.ts`) as currently written.
- `tool_plan_tier` askability must **not** be authorized as a means of unblocking Pika specifically — any askability decision for this fact remains a separate, generically-justified architecture question, independent of Pika's timeline.
- A separate, generic canonicalization/normalization architecture milestone is required for the `tool_plan_tier` fact class before this claim's applicability can be safely re-evaluated.
- After that architecture question is resolved, Pika's applicability semantics for the paid-plan exception must be reconsidered and, if necessary, corrected through the proper governance mechanism (a fresh FGR-level review of the corrected expression, or an equivalent gate — not decided or designed here) before any CPR proceeds.
- The provider evidence and the intended Free-versus-paid governed distinction remain intact unless separately superseded by new evidence — this addendum does not touch (A) or (B).

**Baseline claim assessed separately, per instruction — not automatically invalidated.** `CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1` itself carries `applicability_requirements: []` and is not affected by the paid-plan claim's representation defect on its own semantic merits. However: the baseline's own proposition text is explicitly written as a default *paired with* the paid-plan exception ("this baseline is unconditional and applies regardless of plan tier; the paid-plan commercial-use exception is recorded separately as `CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-001-v1`") — publishing the baseline alone, while its evidenced companion exception remains blocked, would present Pika users with only the restrictive half of the adopted, evidence-supported picture and **would constitute materially misleading Pika guidance by omission**. The baseline must therefore **not** proceed to independent publication either until the paid-plan claim's representation defect is resolved and both claims can be assessed for coexistence and publication together, as the evidenced pair `FGR_016` actually adopted.

This is an authority/coexistence consequence of the pairing, not a finding against the baseline claim's own truth or evidence.

## 4. Structured state — no ledger change required

`GOVERNED-CLAIMS.md` requires no correction. Both Pika claims already correctly show:
- `Lifecycle: Adopted`
- `CRC Approver: PENDING`
- `CRC Decision Date: PENDING`

No `crc_eligible: Yes` was ever set for either claim, and none is set by this addendum. The ledger has been, and remains, structurally consistent with "not yet publication-ready" throughout — the same reasoning `CPR_014_ADDENDUM_DISPOSITION_CORRECTION_2026-09-02.md` §4 applied to Kling applies here.

## 5. Relationship to FGR_016 and the PM/JD adoption decision — unchanged, preserved exactly

This addendum does not alter `FGR_016` in any respect, and does not alter or retroactively characterize the 2026-09-05 JD/PM adoption decision. Both continue to mean exactly what they stated:
- the two Pika claims are Adopted, on the evidence and proposition terms `FGR_016` recorded;
- adoption did not authorize CRC publication, Matrix retirement, `tool_plan_tier` askability, or any provider-specific orchestration;
- the defect recorded here was not known at adoption time and this addendum does not claim otherwise.

## 6. What this addendum does not do

Does not modify `FGR_016`'s committed file or the PM/JD adoption decision. Does not modify `GOVERNED-CLAIMS.md`. Does not modify `PLATFORM-RIGHTS-MATRIX.md` or `matrix-fixture.ts` — Pika's Matrix row remains live, `crc_eligible: 'Yes'`, unannotated; no retirement has been considered or is authorized by this addendum. Does not add either Pika claim to any runtime fixture. Does not propose, design, or encode a corrected applicability expression — the correct generic representation is not yet known and is out of scope here. Does not authorize or perform any generic canonicalization architecture work. The current state remains exactly: Matrix live and unretired, both TopicClaims Adopted/withheld, neither published.

--- END ADDENDUM ---
