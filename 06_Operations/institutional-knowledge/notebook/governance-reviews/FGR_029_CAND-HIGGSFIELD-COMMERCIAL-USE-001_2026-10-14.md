# FGR_029 — CAND-HIGGSFIELD-COMMERCIAL-USE-001

**Wave 1: Standard Higgsfield commercial-output permission + ownership/originality limitations**
**Date:** 2026-10-14
**Reviewer:** Claude (fork), following LK-HIGGSFIELD-ARCHITECTURE-SOURCE-VERIFICATION-1

## 1. Candidate and scope

`CAND-HIGGSFIELD-COMMERCIAL-USE-001` — Higgsfield's standard contractual treatment of
(a) commercial use of generated Outputs, and (b) ownership/originality/exclusivity
limitations. Enterprise indemnification, no-training guarantees, confidentiality, and
exhaustive third-party-model terms are explicitly OUT OF SCOPE for this Wave (parked
for a future Wave 2, per the preceding investigation).

This FGR independently re-derives the governance decision. The preceding milestone's
"ONBOARD WITH LIMITED SCOPE" is treated as a hypothesis to test, not an approval.

## 2. Repository baseline

Checkout: root checkout, `C:\Users\User\Desktop\superimmersive8`. Branch: `main`.
HEAD at review start: `1a8a3cb4`, matching `origin/main` exactly (0 ahead/0 behind).
Working tree clean. Existing FGR numbering confirmed by directory listing
(`06_Operations/institutional-knowledge/notebook/governance-reviews/`) — highest prior
number FGR_028 — this document is FGR_029, verified, not guessed.

## 3. Source freeze

Controlling source: Higgsfield Terms of Use Agreement (`higgsfield.ai/terms-of-use-agreement`),
last updated **July 26, 2026**, per the preceding investigation's direct fetch and
section-numbered quotation. This FGR does not re-fetch the live page (no network tool
invoked in this review); it relies on the preceding investigation's own directly-quoted,
section-numbered text as the evidentiary record, consistent with this corpus's existing
practice of treating a freshly-fetched-and-quoted prior pass as adequate provenance for
an immediately-following FGR when no intervening event suggests the source changed
(the same discipline used across this session's FGR→Adoption→CPR chains generally).
**This is weaker than this corpus's strongest evidence tier** (a live re-fetch at FGR
time, as done for Kling/Runway/Pika above) and is recorded as a disclosed evidence
limitation, not silently upgraded.

Relevant sections (as quoted in the preceding investigation):
- §4.4 — commercial-use permission; non-claim of ownership; no uniqueness/originality/
  exclusivity guarantee; outputs may be identical across users; survival past
  cancellation; client transfer/sublicense permitted; training-use (out of scope here).
- §13.2 — no representation/warranty as to originality, uniqueness, legality, accuracy,
  or fitness of any Output.
- §1.3 — Enterprise customers governed by a separate, non-public agreement (out of
  scope here, Wave 2).
- §8 — third-party model-provider policy incorporation (out of scope here, Wave 2,
  recorded as a coexistence risk only).

## 4. HF-01 challenge (commercial-use permission)

Operative language (per the preceding fetch): "Company does not claim ownership of any
of your Inputs or Outputs, nor does it restrict your commercial use of Outputs."
Rights survive cancellation; transfer/sublicense to clients is supported. No tier
gating found for this permission in the standard Terms — unlike Kling (gated on
Member Account) or Pika (gated on paid tier), Higgsfield's commercial-use grant reads
as **unconditional across standard (non-Enterprise) terms**, structurally matching
Runway's own unconditional-grant shape, not Kling's/Pika's baseline-plus-exception
shape. Enterprise is explicitly out of scope (separate agreement, §1.3). Third-party
model terms (§8) may still apply in addition — recorded as a prohibited-conclusion
item and a coexistence note, not resolved here.

**Determination: SUPPORTED, unconditional-grant shape (Runway-type), not
baseline-plus-exception (Kling/Pika-type).** No "does not restrict" → "commercially
cleared" strengthening performed.

## 5. HF-02 challenge (ownership / originality limitations)

- A. No ownership claim over Inputs — SUPPORTED (§4.4, direct quote).
- B. No ownership claim over Outputs — SUPPORTED (§4.4, direct quote).
- C. Outputs may be similar/identical across users — SUPPORTED (§4.4, direct quote).
- D. No originality guarantee — SUPPORTED (§4.4 + §13.2).
- E. No exclusivity guarantee — SUPPORTED (§4.4 + §13.2).
- F. No contractual determination of copyrightability — SUPPORTED (absence of any
  copyrightability statement in the quoted text; not inferred from silence as a
  denial, simply recorded as undetermined by this source).
- G. No non-infringement guarantee — SUPPORTED (§13.2's "no representation... as to
  legality" sweeps this in).

"Higgsfield does not claim ownership" is explicitly preserved as distinct from "the
user owns copyright" — this FGR's proposition text (§7 below) states the former only.

## 6. One claim or two? (Option A/B/C test)

Tested against the three options using the required criteria:

- **Independent retrieval utility**: both would retrieve identically (same `tool_scope`,
  same absent applicability gate) — no scenario separates them.
- **Applicability/source/dependency differences**: none — identical source, identical
  (absent) applicability, identical (absent) dependency set.
- **Direct precedent**: Runway's own governed claim (`CLAIM-RUNWAY-COMMERCIAL-USE-001-v1`)
  quotes the nearly-identical dual language ("does not claim ownership... does not
  restrict commercial use") in its **Source fact** field, but elevates only the
  commercial-use permission to the governed **Claim proposition** text itself — the
  ownership non-claim is carried as source context and reinforced via prohibited
  conclusions, not as a second claim.
- **Risk of serial claim concatenation**: two claims sharing identical applicability
  and `tool_scope` would always co-retrieve together, multiplying Composition surface
  area for zero discriminating value.
- **Future scalability**: a single-claim-per-source-quote pattern (one claim, richly
  bounded) is what this corpus already does for Runway given the same evidentiary
  shape; replicating Kling's two-claim split would misapply a pattern designed for a
  genuine two-valued conditional fact (Member Account yes/no) to a case with no such
  condition.

**Decision: OPTION C — one primary proposition (commercial-use permission), with the
ownership/originality/exclusivity findings carried as explicit evidence content and
prohibited-conclusions boundaries within the same claim, exactly mirroring the Runway
precedent's own structure for the same underlying contractual language shape.**

## 7. Proposed normalized proposition (NOT adopted by this FGR)

> Under Higgsfield's current Terms of Use, Higgsfield does not claim ownership of your
> Inputs or Outputs, and does not restrict your commercial use of Outputs; this
> permission is unconditional across Higgsfield's standard (non-Enterprise) terms and
> survives account/subscription cancellation, and exported Outputs may be transferred
> or sublicensed to clients. Higgsfield does not guarantee the uniqueness, originality,
> or exclusivity of any Output, and makes no representation or warranty as to the
> originality, uniqueness, legality, accuracy, or fitness of any Output — Outputs may be
> identical to Outputs generated for other users. This is Higgsfield's own
> provider/platform policy, not a determination of copyright ownership, originality,
> copyrightability, or non-infringement, and does not extend to Higgsfield's Enterprise
> tier, which is governed by a separate, non-public agreement.

## 8. Topic / GoalCategory

`commercial_use` — identical to Kling, Runway, Pika. No new topic or GoalCategory
required; directly confirmed against the existing precedent entries.

## 9. tool_scope / provider_scope

`provider_scope: null` (unchanged semantics — keyed exclusively to `AssetProviderMention`/
stock-asset vendors; Higgsfield is a generation tool, not an asset provider, exactly the
distinction already preserved for Kling/Runway/Pika).
`tool_scope: ['higgsfield']` — **not yet a registered `CanonicalToolId`.** Confirmed by
direct inspection of `lib/interview-engine/extraction.ts`'s `KNOWN_TOOLS` map and
`lib/tool-identity/registry.ts`'s `CANONICAL_TOOL_IDS`: no `higgsfield` entry exists in
either. This is the "minor data extension" the preceding investigation anticipated —
registering a new canonical tool ID and extraction aliases, the same mechanical step
every existing tool (Kling, Runway, Pika, Midjourney, Luma, Synthesia) already required
at its own onboarding. **Not performed in this FGR** (runtime change, out of scope).

## 10. Account / plan applicability

**No applicability gate required.** Per §4 above, Higgsfield's standard-terms
commercial-use permission is unconditional — it does not depend on Team/Scale/paid
status the way Kling's Member-Account exception or Pika's paid-tier exception do. The
only real gate is the standard-vs-Enterprise boundary, and Enterprise is out of scope
for this Wave entirely (not a conditional branch of this claim — a different claim,
deferred). `tool_account_status`/`tool_plan_tier` exist as real, implemented
`ApplicabilityFact` branches (confirmed via `lookup-topic-claims.ts`, used by the Kling
member claim) but are **correctly not used here** — the evidence does not support
gating Wave-1 permission on them, and creating such a gate would be exactly the
"dependency because the fact exists" error the FGR brief warns against. The prospect
phrase "I used a Higgsfield business account" is not normalized to any applicability
value by this claim — it simply isn't relevant to Wave 1's unconditional grant.

## 11-12. Dependency model

`Applicability requirements: []`, `Unresolved project dependencies: []` — **D0**,
directly matching Runway's own precedent exactly (same unconditional-grant shape,
same evidentiary strength, same absence of a resolvable gating fact). Every candidate
dependency considered (account status, plan tier, underlying model, applicable
agreement) was rejected: none is required for Wave-1 applicability to hold, since the
permission itself is unconditional for standard terms. No dependency converts a legal
characterization into self-attestation, because none is proposed at all.

## 13. Third-party-model coexistence (Higgsfield + Kling)

Traced directly against `lookup-topic-claims.ts`: `toolScopeMatches(claim, activeToolIds)`
takes `activeToolIds` as a **plural array** and independently tests whether a given
claim's own `tool_scope` intersects it (`claim.tool_scope.some(t => activeToolIds.includes(t))`).
This means a project with both `ToolMention = higgsfield` and `ToolMention = kling`
would independently satisfy both the (future) Higgsfield claim's `tool_scope: ['higgsfield']`
and the existing `CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1`'s `tool_scope: ['kling']` —
**each claim is evaluated independently; neither suppresses, supersedes, or hides the
other.** This is the exact same generic mechanism that already lets Kling, Runway, and
Pika coexist as simultaneously-retrievable claims today (confirmed: all three already
exist as separate, independently-matched `tool_scope` entries in the live fixture).
**No generic architecture gap exists.** This is not a hypothetical finding — it is
read directly from the matching function's own implementation, which was written
generically before Higgsfield was ever discussed.

## 14-15. Explicit vs. discovered relevance / Track C

Explicit-goal route: a user asking "does Higgsfield allow commercial use" maps directly
to the existing `commercial_use` GoalCategory — no new UserGoal fabricated.
Discovered-relevance route: a project with a confirmed Higgsfield `ToolMention` and an
explicit `commercial_use` goal elsewhere would discover this claim via the same
generic `ToolMention`-driven mechanism Kling/Runway/Pika already use today — not a new
mechanism, not Track A expansion, not a fabricated goal. Track C provenance is
preserved by the same existing mechanism; nothing claim-specific is required.

## 16. Bounded Interpretation stress test

1. "Higgsfield's published standard terms permit commercial use of generated Outputs" — PERMITTED.
2. "Your Higgsfield video is commercially cleared" — PROHIBITED/TOO STRONG.
3. "Because you used a Higgsfield business account, you can safely use the video commercially" — PROHIBITED/TOO STRONG (conflates ambiguous marketing term with any applicability condition, which doesn't even exist for this claim).
4. "Higgsfield says you own copyright in the Output" — PROHIBITED/TOO STRONG.
5. "Higgsfield does not claim ownership of the Output" — PERMITTED (direct quote).
6. "The Output is original" — PROHIBITED/TOO STRONG (directly contradicted by source).
7. "The Output is exclusive to you" — PROHIBITED/TOO STRONG (directly contradicted by source).
8. "The Output is non-infringing" — PROHIBITED/TOO STRONG (not addressed by source as a guarantee).
9. "The Output is copyrightable" — PROHIBITED/TOO STRONG (not addressed by source).
10. "Your client may use the exported Output under Higgsfield's standard contractual framework" — PERMITTED (direct quote re: transfer/sublicense), WITH the standing condition that this doesn't resolve other project-level rights questions.
11. "Higgsfield's commercial-use permission does not itself resolve all project-level rights or commercial-readiness questions" — PERMITTED, and is the governing frame for any future Composition in this domain.

## 17. BI case classification

**`directly_relevant`** (not Case 3B / `relevant_applicability_unresolved`). Confirmed
directly against `build-bounded-interpretation.ts`: a claim with empty
`applicability_requirements` and empty `unresolved_project_dependencies` reaches the
`directly_relevant` status path, the same path the Kling-baseline, Runway, and Pika
claims above all use (none of their entries mention Case 3B anywhere; all carry
`Applicability requirements: []` / `Unresolved project dependencies: []`, exactly this
candidate's own D0 model). Case 3B is the correct ceiling for claims whose applicability
or dependency state is genuinely unresolved (e.g. real-person-identifiability questions,
or the SPC's own declared national non-decision) — Higgsfield's commercial-use
permission is not such a claim; it is a direct, unconditional contractual fact, bounded
instead by a strict prohibited-conclusions list rather than a structural applicability
ceiling. Forcing Case 3B here would contradict the repository's own established,
precedent-proven case semantics, not protect them.

## 18. CRC eligibility

CRC-ELIGIBLE WITH BOUNDARIES, pending its own separate, later CPR (not performed here).
Reasoning: directly mirrors the already-CRC-approved Kling/Runway/Pika claims' own
shape and risk profile; the evidence is first-party, Class-A-equivalent (though with
the §3 evidence-freshness caveat recorded above); the prohibited-conclusions list is
exhaustive and testable; nothing here requires legal self-attestation.

## 19. Existing-claim interaction

`CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1` / `-MEMBER-001-v1`, `CLAIM-RUNWAY-COMMERCIAL-USE-001-v1`,
`CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1` and its paid-plan siblings — **NO INTERACTION**
(different `tool_scope`, no shared applicability key); **COMPLEMENTARY** in the sense
that they establish the same reusable claim-class pattern this candidate would join.
No existing claim is modified, superseded, or contradicted. Third-party-model
intersection with Kling specifically is a **coexistence watch item**, not a conflict —
see §13.

## 20. Supersession / change-sensitivity design

Evidence metadata needed if adopted: source URL, "last updated July 26, 2026" version
date, retrieval date, `tool_scope: ['higgsfield']`, no plan applicability, `Lifecycle`,
and a recorded refresh trigger (a future Terms-of-Use date change). The existing
version-lineage/supersession mechanism (used for the Pika baseline→paid-plan-tier
correction, and generally for every claim in this ledger) is sufficient — no
Higgsfield-specific refresh mechanism is needed. Temporal/version risk is
MEDIUM-HIGH per the preceding investigation (a prior dated revision already exists;
staggered effective dates show active document management) — this should be recorded
explicitly in any future Adoption entry's evidence-limitations field, not treated as
low-risk by default.

## 21. Composition-readiness observation (not implemented)

For "I used Higgsfield on a business account, so I'm okay to use the resulting video
commercially": what should eventually resolve — Higgsfield's own standard-terms
commercial-use permission (clean, direct). What should remain explicitly unresolved —
whether "business account" establishes anything about Enterprise status (it doesn't,
and this claim has no applicability gate to even test it against); whether any
third-party underlying model's own terms apply in addition; whether Input rights,
likeness, music, or client-asset questions are separately resolved. This is an
observation only — no Composition code is touched by this FGR.

## 22. Commercial Assurance boundary

A Commercial Assurance reviewer could examine: the actual underlying model used (to
check third-party-model-term applicability); whether an executed Enterprise Agreement
exists (Wave 2); actual Input-rights evidence (consent, licenses). Not claimed to
certify legality or clearance — directional only.

## 23. Enterprise Wave 2 — recorded, not created

Per the preceding investigation's own finding, Enterprise training/confidentiality
treatment and Enterprise indemnification should become **two separate future
propositions** (not one), given their differing evidence/authority profiles (the
former is directly stated in the standard ToS's own cross-reference; the latter's
exact scope lives only in a non-public executed agreement). Not created in this FGR.

## 24. Source Monitor observation

Higgsfield's Terms of Use is a single, dated, versioned HTML page — **POTENTIALLY
MONITORABLE** by the existing content-hash mechanism if ever pursued. No allowlist
change made or recommended; Source Monitor expansion remains parked.

## 25. FGR Decision

**ADVANCE — ONE PROPOSITION + BI/EVIDENCE BOUNDARY** (Option C, §6-7 above).

## 26-27. Implementation boundary / artifact

This document is the FGR artifact itself (`FGR_029_CAND-HIGGSFIELD-COMMERCIAL-USE-001_2026-10-14.md`).
No other file touched. `GOVERNED-CLAIMS.md` not edited. No claim adopted. No runtime,
fixture, `ToolMention`, `tool_scope`, Retrieval, BI, Composition, or Source Monitor
code changed.
