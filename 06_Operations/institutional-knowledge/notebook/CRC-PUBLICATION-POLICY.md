# CRC Publication Policy

**Purpose:** SI8's institutional model has three distinct layers. **Knowledge** — what do we know? (Living Notebook, Platform Rights Matrix). **Judgment** — what is SI8's institutional opinion? (human reviewer, Assessment Report). **Publication** — what institutional knowledge can be published automatically, without human judgment at the time of publication? (this document, `CRC-Eligible`). CRC publishes educational guidance — not institutional opinions. `CRC-Eligible` is not a content approval; it's a publication approval, and it attaches to a specific claim, not a whole platform row. A claim being true (`Status = Verified`) is a Knowledge-layer fact, confirmed with a human doing the checking. Whether SI8 is willing to let that exact claim go out through a channel with no human reviewing the specific moment it's said is a separate, Publication-layer decision — this document is the judgment applied at that layer. A row can carry more than one claim at different confidence levels; approving one does not approve the rest.

**Scope:** Governs `CRC-Eligible` decisions only. Does not touch Matrix verification, Knowledge Card rendering, or retrieval. Not one of the Living Notebook's four canonical documents — an adjacent policy doc, same status as `MATRIX-LEARNINGS.md`.

---

## Principles

**1. Verified is necessary, not sufficient.** Every `CRC-Eligible` decision is a second, independent judgment, made about a specific claim — never inferred from Status, never defaulted to Yes because verification was thorough, and never extended to a sub-claim just because a neighboring claim in the same row was approved.

**2. Preserve meaning, don't just minimize caveats.** A statement should be as plain as it can be without losing what actually makes it true. If simplifying a fact for plain publication would change its meaning, the fact isn't ready to publish as-is — narrow or rewrite it rather than stripping caveats that are load-bearing. Plainness serves accuracy; it isn't a goal on its own.

**3. Subject sensitivity outweighs confidence in the fact.** A well-verified fact touching SI8's No List boundaries — likeness, voice cloning, deepfakes, political persuasion — gets more scrutiny, not less, regardless of verification strength. **This is a gate, not a scope to narrow around** — see Principle 5.

**4. Scope narrowly rather than withhold entirely.** Incomplete coverage isn't automatically a reason to say No. A fact confirmed for one access path of a multi-surface tool is genuinely useful if the card states that boundary honestly.

**5. When uncertain, narrow before withholding.** CRC should ask "can this be expressed more narrowly?" before asking "should this be withheld?" — narrow, then rewrite, then withhold, in that order. **Exception: this hierarchy does not apply to Principle 3 concerns.** A sensitivity gate isn't resolved by finding a narrower phrasing; it's resolved by withholding or escalating to human review. Narrow-before-withhold governs scope and wording doubt, not subject-matter risk.

**6. Stability over novelty.** CRC favors stable, well-understood guidance over newly changed platform terms. A recently-updated Matrix row may stay `Pending` until SI8 has had the chance to observe how the change plays out in practice — has the platform issued a clarification, has anything unintended surfaced. This applies specifically to freshness of a *platform's own ToS change*, not a general license to delay; a long-settled fact doesn't need a waiting period just because it was verified recently. CRC is an educational product, not a breaking-news service.

## Applying this to a specific row

1. Can this be said plainly without losing the nuance that makes it accurate?
2. Does it touch a No List-adjacent subject? (If yes, Principle 3 governs — narrowing doesn't resolve this.)
3. Is the verification's scope narrower than the tool's full offering, and does the card say so?
4. If a user acted on this fact alone, would they be reasonably informed, or quietly under-informed?
5. Is the underlying platform term itself new enough that SI8 hasn't yet seen how it holds up?
6. For a compound row (mixed-confidence claims within one Tool): does `CRC Publication Scope` name the exact claim CRC is permitted to state, and confirm the weaker sub-claim is excluded — not just that the row overall is Verified?
7. Does this claim carry a non-null `tool_scope`? If so, has legacy `PLATFORM-RIGHTS-MATRIX.md` coexistence for the scoped tool(s) been reviewed per the practice below?

A No on any of these is a real reason to narrow, rewrite, or withhold — not just note and proceed.

## Tool-Scoped Claims — Legacy Matrix Coexistence Check (Living Knowledge Matrix Coexistence practice, 2026-08-30)

A `TopicClaim` with a non-null `tool_scope` narrows an already-relevant proposition to one or more specific tools (see `tool_scope`'s own doc comment, `08_Platform/app/lib/retrieval-engine/types.ts`) — the same tool may also already carry legacy commercial-use knowledge in `PLATFORM-RIGHTS-MATRIX.md`. **Sharing a tool is a discovery trigger only** — it does not by itself mean the two propositions concern the same real-world decision, and it does not by itself mean they conflict; the reviewer judges proposition relevance, not the runtime, and not the mere fact of a shared tool identifier.

Before granting `CRC Eligible: Yes` to a tool-scoped claim:

1. Inspect existing Matrix coverage for the scoped tool(s).
2. Through ordinary human governance review, determine whether any Matrix proposition could materially overlap the candidate's own CRC conclusion.
3. If a relevant Matrix proposition is identified, include those specific `MatrixRow`/`MatrixClaim` entries in the existing synthetic eligibility canary alongside the candidate, and inspect the combined Bounded Interpretation output for the same project state.
4. If compatibility cannot be established, WITHHOLD `CRC Eligible: Yes` until it can.

When Matrix coexistence is materially reviewed, record in the CPR artifact: the relevant `MatrixRow.identifier`, the relevant `MatrixClaim.claim_id` value(s), the coexistence conclusion, and whether the disposition is APPROVE or WITHHOLD — durable governance evidence in the CPR artifact, the same discipline as every other CPR finding; no new schema field or enum is introduced by this practice.

This review reflects Matrix content as read at review time only. It does not remain automatically valid if the referenced Matrix row is later edited — Matrix carries no versioning or supersession mechanism to signal such a change. Re-verification triggered by a later Matrix edit is not addressed by this practice.

This check governs `CRC Eligible: Yes` only. It does not affect whether a tool-scoped proposition may be substantively `Lifecycle: Adopted` — Adoption is a Living Knowledge governance decision under ordinary FGR criteria, independent of Matrix coexistence (see this document's own Purpose statement above: publication is a separate layer from knowledge and judgment).

## Publication Test

Before approving any CRC statement, ask:

**Would I be comfortable having a prospect's legal team quote this exact sentence back to SI8?**

If the answer is no: rewrite it, narrow it, or withhold it.

---

**Related:** `PRD_LIVING_NOTEBOOK.md` § CRC-Eligible Governance (mechanical rules); `PLATFORM-RIGHTS-MATRIX.md` (the six Verified rows this applies to); `PRD_CRC_v1.0.md` §§ 2, 12, 14 (the philosophy this operationalizes).
