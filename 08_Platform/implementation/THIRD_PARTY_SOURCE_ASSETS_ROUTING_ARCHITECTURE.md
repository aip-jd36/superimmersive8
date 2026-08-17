# Third-Party Source Assets — CRC Knowledge Routing & Representation

**Status: PROPOSED / PM REVIEW REQUIRED.** Architecture/design only. No governed claim, relationship, Matrix row, `GoalCategory`, `ApplicabilityFact`, database schema, migration, or production code is created or modified by this document. Nothing here is adopted merely by appearing in this file — every lettered recommendation in §9 requires a separate PM decision before any implementation work begins.

**Related:** `01_Business/research/LIVING-KNOWLEDGE-THIRD-PARTY-STOCK-MEDIA-DOMAIN-DISCOVERY-2026.md` (Phase 0 — domain discovery, substantive Getty/iStock/Adobe Stock/Shutterstock research; not modified here). `PRD_LIVING_KNOWLEDGE_SOURCE_INPUTS_v0.1.md` §27 (Project-Fact-Aware Bounded Composition — the deferred capability this document's Path B directly overlaps with; see §7). `GOVERNED-CLAIMS.md`, `TOPIC-RELATIONSHIPS.md` (unmodified; this document proposes future entries in both, drafted nowhere yet). `RETRIEVAL_ENGINE_ARCHITECTURE.md`, `INTERVIEW_ENGINE_ARCHITECTURE.md` (the systems this proposal extends).

---

## 1. The real path traced (read before designing)

`user utterance → extraction.ts (candidate → normalize → attest → mutate) → StructuredUnderstanding → handoff.ts (RetrievalHandoff) → retrieve.ts (Tool Retrieval + Topic Retrieval + Related-Topic Retrieval, merged) → build-bounded-interpretation.ts → understood-summary.ts / projection-layer`

Confirmed by direct reading of `extraction.ts`, `lookup-topic-claims.ts`, `lookup-topic-relationships.ts`, `retrieve.ts`, `build-bounded-interpretation.ts` (not just type names, per task instruction):

- **Tool matching** is a closed, hardcoded alias registry (`KNOWN_TOOLS`, `KNOWN_AMBIGUOUS_TOOLS` in `extraction.ts`) resolving to a canonical identifier used two ways downstream: (a) `MatrixRow.identifier` lookup, (b) `ApplicabilityRequirement{fact:'tool_plan_tier', tool}` scoping. Getty is not in this registry and — confirmed by design, not oversight — never will be under the current registry's own semantics, because the registry only models AI-*generation* platforms.
- **Topic matching** (`lookupTopicClaims`) is keyed **only** on `UserGoal.category` — a `TopicClaim` becomes a candidate exactly when some active, confirmed goal's `category` equals the claim's `topic`. Nothing else gates candidacy at this stage.
- **Applicability** (`isApplicable`/`evaluateRequirement`) is a **second-stage, within-topic** filter, evaluated only after topic-candidacy is already established. Its `.every()` semantics treat an **unconfirmed** fact identically to a **confirmed-wrong** fact — both simply fail the requirement (`evaluateRequirement`'s own comment: "Unconfirmed/unresolvable fact -> requirement unmet, never guessed").
- **Diagnostics** (`applicability_unmet`) are emitted per goal-category whenever any Adopted+CRC-eligible claim under that topic exists but fails applicability — and `build-bounded-interpretation.ts`'s Case 3A renders this as a **content-free "relevant, but I need more information" nudge to the user, for every goal in that category**, regardless of whether the unmet fact was ever mentioned at all.
- **`lookupRelatedTopicClaims`** (the `TopicRelationship` path) inherits this exact same diagnostic behavior — `applicability_unmet` is attributed to the *source* (originating) goal category, so an activated relationship propagates the identical nudge back to the origin goal.
- **This is not a bug.** For `jurisdiction` (used by COPY-001/002/003), this behavior is exactly the intended product: jurisdiction is *universally* relevant to any copyrightability goal, so nudging every such user to clarify it is correct. This distinction — a fact that is universally relevant once a goal exists, vs. a fact whose *relevance itself* is conditional on something having been mentioned — is the load-bearing finding of this design pass. See §6.

## 2. The core design question, restated precisely

Not "how do we add Getty knowledge" — Phase 0 already answered that at the domain level. The real question this document answers: **given the existing goal-category-gated, applicability-refined retrieval architecture, what is the smallest change that lets third-party-source-asset knowledge reach CRC users for whom it is actually relevant, without leaking irrelevant nudges to users for whom it is not?**

## 3. Preserving the semantic distinctions (per task §3)

No change proposed to any of these definitions. Applied as follows:

| Concept | Existing type | This domain's use |
|---|---|---|
| User goal | `UserGoal.category` (`GoalCategory`) | New value proposed (§4) — used only for an *explicit* question, never inferred from disclosure. |
| Project fact | `ProjectFacts` (`intended_use`, `workflow_role`, `jurisdiction`) | **Unchanged.** Nothing added here — see §5.C. |
| Entity/source provider | *(no existing type — this is the actual gap, not `ProjectFacts`)* | New minimal type proposed (§5.B). |
| Observation | `ScopedObservation` | Retains its existing role — captures *how* an asset was used (reference vs. upload vs. incorporated) as free text, deliberately not promoted to structure in v0.1 (§8). |
| Applicability requirement | `ApplicabilityRequirement` / `APPLICABILITY_FACTS` | **No addition proposed** for v0.1 (§6). |
| Unresolved project dependency | `TopicClaim.unresolved_project_dependencies` | Reused exactly as designed — governance-visible, non-gating (§8). |
| Governed claim | `TopicClaim` | Reused unchanged — Phase 0's conclusion holds once a real target topic exists (§9.E). |
| Relationship | `TopicRelationship` | Proposed, with an explicit activation caveat (§9.F). |

## 4. GoalCategory decision

Five options pressure-tested against eight realistic user statements (task §4):

| Statement | Actual goal, or fact-only? | Coherent under `commercial_use`? |
|---|---|---|
| "Can I use this Getty photo?" | Goal | Only coarsely — see §6's false-positive finding. |
| "Can I use Getty images in this commercial?" | Goal | Same. |
| "My client gave me Getty images. Is that okay?" | Goal (implicit "is this okay") | Same. |
| "Can I upload a Getty image into Kling?" | Goal | Same, and also crosses into the two-contract problem (Phase 0 §9). |
| "Do I need a license for the stock images?" | Goal | Same. |
| "The agency has a Getty subscription — are we covered?" | Goal | Same. |
| "I used an editorial Getty image." | **Fact/disclosure, not a goal** | N/A — no goal exists to categorize. |
| "I have permission from my client to use the image." | **Fact/disclosure, not a goal** | N/A. |

Six of eight are genuine goals; two are pure disclosures with no goal-shaped content at all — confirming the task's own concern in §5 is real, not hypothetical: incidental disclosure is a materially different case from an explicit question, and no `GoalCategory` value, new or old, helps with the disclosure-only cases (see §5 below).

**Option A (route through `commercial_use`, no new category) — rejected.** Proven, not assumed: any `TopicClaim` tagged `topic: 'commercial_use'` becomes a topic-candidate for **every** user with a confirmed `commercial_use` goal — a very high-traffic category. Absent applicability gating it would render unconditionally for every such user, including users who never touched a stock asset. *With* applicability gating on an unconfirmed fact, §1's finding applies: the resulting `applicability_unmet` diagnostic and Case 3A nudge would **also** fire for every `commercial_use` user, because "never mentioned Getty" and "unconfirmed fact" are indistinguishable to `evaluateRequirement`. Either way, Option A pollutes SI8's single most common goal category with content or nudges irrelevant to most of its users. Rejected on evidence, not on principle.

**Option C (`stock_media_licensing`) — rejected as the category name**, though right as a *subdomain* name (Phase 0 already settled this). A `GoalCategory` scoped to stock media specifically would need renaming the day licensed music or client-supplied footage (§21) needs the same treatment — a foreseeable, avoidable churn cost.

**Option D (`source_asset_rights`) — very close to the recommendation, rejected only on naming grounds** in favor of reusing Phase 0's already-settled domain vocabulary (`Third-Party Source Assets`) rather than introducing a third near-synonym across two documents.

**Recommended: Option B, named `third_party_source_rights`** — matches Phase 0's own domain name closely, deliberately broader than "stock media" so it doesn't need to be renamed when the domain generalizes (§21), and deliberately scoped to explicit-question routing only (§5) so it never inherits Option A's proven false-positive problem: a `GoalCategory` is only ever populated when `extraction.ts`'s own existing, conservative discipline is satisfied — "Set ONLY when the user explicitly stated a goal this turn... never inferred from unrelated workflow facts" (`extraction.ts`, `CandidateObservation.goal_confidence_hint` doc comment, unchanged). This is not a new safety mechanism invented for this design — it's the **existing** mechanism, and the reason a new, narrow category is safer than reusing a broad one.

## 5. Goal vs. trigger — the boundary, made explicit

The task's own pressure test (§5) is confirmed as the central design tension, and it does not resolve to a single mechanism. **Two genuinely different paths, deliberately not merged:**

**Path A — Explicit question.** "Can I commercially use this Getty Editorial image?" → extraction proposes a `user_goal` candidate with `goal_category_hint: 'third_party_source_rights'` (an extraction-prompt change, not covered by this document — see §14) → normal, **already-existing, zero-new-mechanism** goal-category retrieval applies. This path works today, architecturally, the moment (a) the category exists and (b) real Adopted+CRC-eligible claims exist under it. No new retrieval logic required.

**Path B — Incidental disclosure.** "I sourced the other images myself from Getty Images" (the actual production case) — never produces a `user_goal` candidate at all, under the extractor's existing, correct discipline (this is not a gap to close casually; inferring a goal from a disclosure the user didn't ask about is exactly the over-eager behavior that discipline exists to prevent). **This document does not recommend building automatic retrieval for Path B in v0.1.** Making an incidentally-mentioned entity retroactively relevant to an *already-existing, differently-categorized* goal (here, the user's actual `commercial_use`/`copyright_ownership` goals) is not a routing tweak — it is precisely the shape of capability `PRD_LIVING_KNOWLEDGE_SOURCE_INPUTS_v0.1.md` §27 already named and deliberately deferred ("Project-Fact-Aware Bounded Composition"): using conversational facts the system already has to determine *which* governed knowledge is relevant to *what the user actually described*, beyond goal-category matching alone. Building a bespoke, parallel version of that capability just for this domain would fragment exactly the governance discipline §27 was written to protect. **Recommendation: Path B remains an unaddressed, disclosed limitation of v0.1** — the fact is captured losslessly (§5.B below) so it is *available* the day a general composition capability exists, but it does not drive retrieval yet.

This is the single most consequential recommendation in this document, so it is stated plainly: **v0.1 answers the explicit-question case correctly and safely. It does not solve the incidental-disclosure case — the literal case that started this line of work — because solving it safely requires a capability this document is not authorized to design (§27 is explicitly out of scope for both the source-inputs PRD and this one).** A future milestone should design Path B and §27 together, not separately.

## 6. Why this isn't a routing-mechanism gap alone — the fact-relevance-shape finding

Restating §1's finding as a named principle, because it is the reason Options A/C/D and naive applicability-gating all fail the same way: **the existing `ApplicabilityFact` mechanism (`jurisdiction`, `tool_plan_tier`) is designed for facts that are *universally* relevant to every goal in a topic once that goal exists.** Third-party-source-asset use is not that kind of fact — it is relevant only to the subset of users who actually used such material, and "unconfirmed" is the common case, not the exception. Reusing the applicability mechanism for this shape of fact converts "most users never mention this" into "most users get an unexplained nudge," which is a regression, not a feature. This is why §5's Path B cannot be solved by "just add an `ApplicabilityFact`" (§8 of the task's own framing already suspected this and asked not to add one automatically — confirmed correct).

## 7. Entity/provider representation

Six options pressure-tested (task §6):

- **(A) Existing `ToolMention`** — rejected. `ToolMention.access_surface`/`plan_tier` are AI-platform-specific concepts with no analogue for a licensing provider; forcing Getty through this shape would either leave those fields permanently meaningless or invite a future engineer to misuse them.
- **(B) Extend `ToolMention` semantics** — rejected for the same reason, plus: `MatrixRow.identifier` is explicitly documented as "the same string Interview's own `normalizeCandidate` resolves to," and Retrieval's tool path (`lookupRows`) is Matrix-keyed — extending `ToolMention` without also reworking Matrix's own contract would produce mentions that resolve but still match nothing, a confusing half-state.
- **(C) New `SourceAssetMention` / `AssetProviderMention` entity — recommended.** Smallest correct fit: reuses `ToolMention`'s already-proven `resolution: {kind:'canonical', identifier} | {kind:'unresolved_alias', raw_name}` shape verbatim (same alias-registry pattern, same "never silently canonicalize an ambiguous name" discipline, same normalize→attest→mutate pipeline shape) but as its **own** type and its **own** `StructuredUnderstanding` field (`source_asset_mentions: SourceAssetMention[]`, sibling to `tool_mentions`, never merged into it). No `access_surface`/`plan_tier` fields — this entity answers "which provider," nothing else.
- **(D) Generic `ExternalServiceMention`** — rejected as premature generalization: would need to already anticipate every future non-generation-tool entity type (payment processors? distribution platforms?) this domain has no evidence for yet. §21 shows the *domain* generalizes; nothing here shows the *entity shape itself* needs to be maximally generic on day one.
- **(E) `ScopedObservation` only, no new type** — rejected: this is the status quo (what happens today), and it's exactly what produced the Phase 0 finding of a fact that's "lost" to free text, unqueryable, unable to support even the explicit-question path cleanly (an LLM would need to re-parse free text every time instead of reading a structured field).
- **(F) No new persisted entity; resolve via topic retrieval alone** — rejected: without *some* structured signal for "which provider," Path A's own claims (e.g. a Getty-specific vs. iStock-specific rule, per Phase 0 §7's finding that they differ) cannot be distinguished even within an already-matched `third_party_source_rights` goal.

**Recommended: (C).** Getty is confirmed (Phase 0 §1, §17) to be a structurally different *kind* of thing than Kling — a source/licensing provider, not a generation platform — and the architecture should say so directly rather than encode the distinction as an implicit convention. This is the smallest representation that (a) fixes the literal "wasn't able to match to a specific platform yet" mis-signal (a recognized `SourceAssetMention` is not a failed match — it's a correctly-recognized different kind of entity; future rendering, not written here, could say so), (b) supports Path A cleanly, and (c) is exactly the data Path B's eventual capability (§5) would need as an input, without pre-building that capability now.

## 8. ApplicabilityFact decision

**Recommended: zero new `ApplicabilityFact` values for v0.1.** Pressure-tested against the task's three example claim types:

- "Getty Editorial content may not be used commercially" — under this design, this claim only ever becomes a topic-candidate for a user who already has a confirmed `third_party_source_rights` goal (Path A). Within that already-narrowed set, distinguishing Getty-specific from iStock-specific wording is a **content-authoring** concern (draft two claims, or one claim with provider named in its own text/`Context` field), not necessarily a machine-evaluated `ApplicabilityRequirement` — deferred to whenever real claims are drafted and a real narrowing need is proven, per the Fact Graduation Principle (task §9): "do not model facts solely because research discovered them."
- "Getty prohibits uploading licensed content to third-party AI tools" — same reasoning; additionally, *which* AI tool received the upload is exactly the kind of two-source (stock license × Matrix tool) synthesis Phase 0 §11 already classified as Reviewer-only, likely permanently — not a CRC applicability question at all.
- "Client-owned stock license may have restrictions" — `license_holder_relationship = client` is real information, but (a) CRC cannot verify it (Phase 0 §12), so gating a CRC-visible claim on it would be gating on a fact CRC users cannot supply reliably, and (b) it belongs in `unresolved_project_dependencies` (governance-visible, non-gating) exactly the way `human_creative_contribution_level` already works for COPY-001/002/003 — reusing an existing mechanism instead of adding a new evaluated fact.

This directly answers task §9's own permitted answer: **"Zero new facts" is the recommendation, and it is supported** — not by default, but because every candidate fact examined either (a) only matters after Path A's goal-category gate already narrowed the set (so a coarser mechanism suffices), or (b) is unverifiable by CRC and belongs in `unresolved_project_dependencies` instead, or (c) is genuinely two-source synthesis that's Reviewer-only regardless of applicability machinery.

## 9. Minimum ProjectFacts / role of ScopedObservation / role of unresolved_project_dependencies

**ProjectFacts: unchanged, zero additions.** The new entity list (§7) lives at `StructuredUnderstanding` top level, mirroring `tool_mentions`'s own placement outside `ProjectFacts` — consistent with the existing pattern where `ProjectFacts` holds scalar attested facts (`intended_use`, `workflow_role`, `jurisdiction`) and structured mention lists live alongside it, not inside it.

**ScopedObservation** keeps exactly its current role: the catch-all for anything about *how* an asset was used that hasn't been promoted to structure — reference-only vs. uploaded vs. incorporated (task §13's stress test) stays here in v0.1, deliberately not modeled as a new field, because no product need has yet proven CRC "repeatedly needs" that distinction structured (the Fact Graduation Principle, applied conservatively).

**`unresolved_project_dependencies`** carries exactly the role it already has for COPY-001/002/003: governance-visible, informational, non-gating metadata on a `TopicClaim` naming what real-world application still depends on beyond formal `applicability_requirements`. Every `CAND-STOCK-*` claim from Phase 0, if ever adopted, would use this field for facts like "which provider specifically," "manner of AI-input use" — exactly mirroring the existing pattern, not a new mechanism.

## 10. Stress-test results (task §11–17)

| Case | Representation under this design |
|---|---|
| **Client-supplied** ("My client gave me a Getty image") | `SourceAssetMention{resolution: canonical, identifier: 'getty'}` recorded. Nothing else inferred — `workflow_role`/relationship-to-client stays exactly what `ProjectFacts.workflow_role` and free-text `ScopedObservation` already capture today, unchanged. No claim about license validity is fabricated. Matches task's own requirement: represent the state without pretending unknowns are known. |
| **User-licensed + uploaded to Kling** | Two independent, correctly-typed mentions coexist: `ToolMention{identifier:'kling'}` (existing, unchanged) and `SourceAssetMention{identifier:'getty'}` (new). Neither overwrites or nests inside the other — this is exactly why (A)/(B) in §7 were rejected. Manner of use (Creative classification, "uploaded into," company-account relationship) remains observation/free-text in v0.1, per §9. |
| **Reference-only, not in final output** | `SourceAssetMention` recorded; the "reference only" qualifier stays in `ScopedObservation.note` (unstructured). The architecture does **not** attempt to resolve whether this satisfies or evades Getty's own AI-input restriction — matches the task's explicit instruction not to force a conclusion; Phase 0 §24 already flagged this exact scenario as genuinely unresolved even at the legal-research level. |
| **Editorial case** | Utterance → `SourceAssetMention{identifier:'getty'}` (Path B, no goal) or, if phrased as a question, a `third_party_source_rights` goal (Path A) → under Path A only, topic retrieval candidates a hypothetical `CAND-STOCK-003`-descended claim → (no applicability gate, per §8) → Bounded Interpretation renders `directly_relevant` with the claim's own governed text, exactly like any existing topic claim. Under Path B, nothing retrieves — disclosed limitation (§5). |
| **Explicit question** ("Can I commercially use this Getty Editorial image?") | Routes via Path A. Contrast with "I used a Getty image" (Path B, disclosure only) — the two are **structurally distinguished by which extraction branch fires** (`user_goal` vs. `scoped_observation`/entity-mention), not by any new classifier; this is the existing `CandidateObservation.kind` distinction, unchanged. |
| **Multiple providers** ("Getty, Adobe Stock, and Kling") | `source_asset_mentions: [SourceAssetMention(getty), SourceAssetMention(adobe-stock)]` + `tool_mentions: [ToolMention(kling)]` — a list, exactly like `tool_mentions` already is a list for multiple AI tools in one project. No new list-handling logic required; the type already supports plurality by being an array. |
| **Multiple assets, same provider, different classification** ("two Creative, one Editorial from Getty") | **This is the clearest evidence for where CRC's abstraction boundary should stop.** A single `SourceAssetMention` per provider (not per asset) is the v0.1 recommendation — CRC does not build an asset inventory. Per-asset classification is real, necessary information, but it is **evidence-level**, squarely inside Commercial Assurance's reviewer-inspection role (Phase 0 §8's evidence table), not a CRC conversational-capture concern. If a user volunteers "two were Creative, one was Editorial," that nuance stays in free-text `ScopedObservation`, available for a human reviewer to read verbatim, never flattened into a misleading single structured value. |

## 11. CRC / Commercial Assurance boundary

Confirmed and preserved by this design, not newly invented: CRC (via the mechanisms above) can recognize *that* a third-party source provider was named and *that* a category of governed knowledge may be relevant (Path A only). It cannot and should not attempt to verify license validity, classification, purchaser identity, or asset-level facts — those remain Commercial-Assurance-only, exactly as Phase 0 §8/§11/§18 already concluded. The upgrade path (`CRC surfaces the issue → Commercial Assurance verifies evidence`) is preserved structurally: nothing in this design lets CRC assert a conclusion about the user's specific asset; every recommended claim (§Phase 0 §19) either renders general educational text or stays Reviewer-only.

## 12. Retrieval routing options compared (task §19)

| Option | False positives | False negatives | Explainability | Governance safety | Compatible w/ existing Retrieval | Engineering complexity |
|---|---|---|---|---|---|---|
| **1 — Goal only** (recommended, = Path A) | None beyond existing goal-category precedent (jurisdiction-style) | High — misses every incidental disclosure (Path B) | High — identical to existing COPY-claim behavior | High — reuses proven governance-gated mechanism unchanged | **Yes, zero new mechanism** | **Low** |
| 2 — Goal + Fact (applicability-gated under `commercial_use`) | **High — proven in §1/§6**, leaks nudges to unrelated users | Low | Low — users see an unexplained "relevant, need more info" nudge | Medium — technically governed, but the *product* behavior wasn't a deliberate choice, it's a side effect of reusing a mechanism built for a different fact shape | Yes, but misapplies existing semantics | Low code, high product-quality risk |
| 3 — Broad goal + observed entity (new join-gate: `commercial_use` AND `SourceAssetMention` exists) | Low, if built correctly | Low | Medium | **Requires new retrieval mechanism** — exactly PRD §27's deferred capability | **No — does not exist today; would be new Retrieval logic** | **High**, and duplicative of already-deferred work |
| 4 — Relationship (`commercial_use → third_party_source_rights`) | **Same leak as Option 2** — proven in §1, `lookupRelatedTopicClaims` inherits the identical diagnostic behavior, attributed to the source goal | Low, once activated | Medium | High as a mechanism, but same product-behavior risk as Option 2 if activated carelessly | Yes, existing mechanism | Low code; requires the same applicability-free-claims discipline as §9.F below to be safe |
| 5 — Other | — | — | — | — | — | — |

**Recommended: Option 1 (goal-only, via the new `third_party_source_rights` category) for v0.1.** Option 4 (relationship) is additionally recommended as a **governed-but-not-activated** record (see §13) for future use once Path B is solved — not as a live v0.1 mechanism. Option 3 is explicitly *not* recommended for v0.1: it is real, needed work, but it is the same work §27 already deferred, and building a narrow, domain-specific version of it here would fragment that future capability rather than feed it.

## 13. TopicRelationship decision

Task §20 asks directly: is this genuinely a `TopicRelationship`, or just applicable knowledge once a fact exists? **Given §6/§8's finding that a fact-conditioned applicability model doesn't safely exist yet, a `TopicRelationship` is not being used as "generic routing glue" here — it is being used for exactly what it already means:** `commercial_use → third_party_source_rights` would state that knowledge under the target topic *may be relevant* to a `commercial_use` goal, without answering it — precisely `REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1`'s own shape and its own already-accepted caveat (a relationship can be `Adopted` while `CRC Eligible: Pending` indefinitely).

**Recommended posture, explicit:** draft the relationship's governance record (Candidate, later possibly Adopted) whenever real claims exist under `third_party_source_rights`, but **keep `CRC Eligible: Pending`** until either (a) every claim reachable through it has `applicability_requirements: []` (vacuously applicable, so no diagnostic leak is possible — `isApplicable([], facts)` returns `true` unconditionally per `lookup-topic-claims.ts`), or (b) Path B's future composition capability changes what "activating a relationship" even means. This mirrors REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1's own real, current, deliberate `CRC Eligible: Pending` state for the identical underlying reason (documented in that relationship's own governance note) — reuse of an already-proven pattern, not a new one.

## 14. Generalization beyond stock media (task §21)

Architecture-only check, no legal research performed (per task §33 instruction). The proposed representation generalizes cleanly:

- `GoalCategory: third_party_source_rights` — already named at the domain level, not the stock-media subdomain level; licensed music, stock footage, fonts, templates, 3D assets, client-provided footage, commissioned photography, and brand assets are all "did the user have rights to input material that isn't their own AI generation" — the same goal shape.
- `SourceAssetMention` — the same entity shape (`resolution: canonical | unresolved_alias`) fits a music-licensing service, a font foundry, or a client's own brand-asset handoff equally well; only the alias registry's contents would need to grow, not the type.
- The explicit rejection of a v0.1 `ApplicabilityFact` (§8) generalizes too — no future subdomain is pre-committed to a fact-graduation decision it hasn't earned yet.

**Caution, not overgeneralization:** this document does not propose building the registry entries or claims for any of these siblings now — §21 asked for an architecture check, not a roadmap commitment, and Phase 0's own domain-boundary discipline (avoid both "too narrow" and "too abstract") applies here identically: the type is general: the *content* stays scoped to what's actually been researched.

## 15. Demand-loop, maintenance-loop, reviewer-loop compatibility

- **Demand loop** (PRD §2's `Demand signal → research → candidate knowledge → human governance → governed knowledge → product use → new demand signals`): unaffected structurally. The Getty disclosure already traveled this loop once (production signal → Phase 0 research → this design). Path A's future claims would travel it again identically. Path B remains an open demand signal, explicitly not resolved here — itself a legitimate loop output ("this needs a future capability, not just a claim").
- **Maintenance loop** (PRD §15/§16, source volatility + change-impact analysis): unaffected. Nothing in this design changes how a future Getty/iStock Terms-of-Service monitor would work — `TopicClaim`'s existing `last_verified`/`superseded_by` fields already carry that role, unchanged, regardless of which `GoalCategory` a claim is tagged under.
- **Reviewer loop** (PRD §9/§10, future Reviewer↔LK query interface, not yet built): compatible by construction — a reviewer asking "Getty asset used as Kling input" would, once such an interface exists, query the same `TopicClaim`/`SourceAssetMention` substrate CRC uses, filtered by Reviewer's broader access (Adopted, any `crc_eligible` value) rather than CRC's narrower one (`Adopted` + `crc_eligible: 'Yes'`) — exactly the existing dual-access-boundary pattern already used for COPY-001/002/003 (Adopted, Reviewer-visible, CRC-Pending).

## 16. Privacy

No raw user text is proposed for persistence beyond what `ScopedObservation`/`ToolMention` already persist today (both already store `source_statement` verbatim — an existing, unchanged pattern, not a new privacy surface). `SourceAssetMention` carries only a resolved identifier or an unresolved raw name — the same shape and the same privacy posture as `ToolMention` already has. No new analytics event is proposed.

## 17. Whether TopicClaim remains sufficient

**Yes — confirmed, not just carried forward from Phase 0.** With `third_party_source_rights` as a real `GoalCategory` value (§4), `TopicClaim.topic` can honestly equal it, resolving Phase 0's own identified blocker (§17 of the Phase 0 artifact: "TopicClaim is the right shape, but structurally blocked" because no matching category existed). No new governed-knowledge object type (`StockClaim`/`LicenseClaim`/`ProviderClaim`) is needed or recommended — doing so would violate the task's own instruction and would duplicate governance machinery (Lifecycle, CRC-Eligible, source references, applicability) that `TopicClaim` already provides correctly.

---

## 18. Recommended V0.1 representation (summary)

| # | Element | Recommendation |
|---|---|---|
| A | `GoalCategory` | **Add one value: `third_party_source_rights`.** Populated only via explicit-question extraction (Path A), never inferred from disclosure. |
| B | Entity representation | **Add one new type, `SourceAssetMention`** (name TBD at implementation time), structurally parallel to `ToolMention` (same `resolution` shape, same alias-registry pattern) but a distinct type with no `access_surface`/`plan_tier` fields. New `StructuredUnderstanding.source_asset_mentions: SourceAssetMention[]` field, sibling to `tool_mentions`. |
| C | `ProjectFacts` | **Unchanged.** No new field. |
| D | `ApplicabilityFacts` | **Unchanged. Zero new values.** Explicitly justified, not a default (§8). |
| E | `TopicClaim` | **Unchanged shape.** New claims simply use `topic: 'third_party_source_rights'` once real claims are drafted (separate, future milestone; not this document). |
| F | `TopicRelationship` | **One relationship recommended in principle** (`commercial_use → third_party_source_rights`, mirroring REL-COPY), **drafted only once real claims exist, and kept `CRC Eligible: Pending`** until the diagnostic-leak precondition in §13 is resolved. |
| G | Matrix | **Unchanged. No role change.** Getty/iStock/Adobe Stock/Shutterstock are never Matrix rows. |
| H | `ScopedObservation` | Unchanged role — captures manner-of-use (reference/upload/incorporated) and per-asset nuance, deliberately not promoted to structure in v0.1. |
| I | `unresolved_project_dependencies` | Unchanged role — reused exactly as COPY-001/002/003 already use it, for provider-specificity and manner-of-use caveats on any future claim. |
| J | Human-review boundary | Unchanged — Reviewer/Commercial Assurance access to Adopted-but-not-CRC-eligible claims under the new topic works identically to the existing COPY-claim pattern. |

**Net new schema surface for v0.1, if approved:** one `GoalCategory` enum value, one new TypeScript type + one new `StructuredUnderstanding` list field, one new alias registry (parallel structure to `KNOWN_TOOLS`, populated with Getty/iStock/Adobe Stock/Shutterstock aliases). No new `ApplicabilityFact`, no new database column beyond what persisting the new field already requires, no change to Matrix, Bounded Interpretation's core logic, or Projection.

## 19. End-to-end canonical example

**Turn 1:** *"I'm using Kling to generate an AI commercial for a client. I'm on a paid Kling plan. I created the video mostly by writing prompts, with some editing afterward. Can I use the video commercially, and do I own the copyright?"*

- `ToolMention{resolution: canonical, identifier: 'kling'}`, `plan_tier` likely confirmed from "paid Kling plan" context (existing mechanism, unchanged).
- Two `UserGoal`s: `category: 'commercial_use'`, `category: 'copyright_ownership'` (existing mechanism, unchanged).
- `ScopedObservation` capturing "mostly prompts, some editing" (existing mechanism — this is exactly COPY-002/003's own `human_creative_contribution_level` territory, already unresolved-dependency-flagged today, unaffected by this design).
- Retrieval (existing, unchanged): Kling's Matrix row's `commercial_use`-tagged claim matches the `commercial_use` goal. Topic Retrieval matches COPY-001/002/003 against `copyright_ownership`/`copyrightability` goals per existing behavior (all currently `CRC Eligible: Pending`, so no content actually renders yet — unaffected by this design).

**Turn 2:** *"The client gave me their logo. I sourced the other images myself from Getty Images."*

- "Client gave me their logo": stays exactly as it is today — likely a `ScopedObservation` (brand-asset/trademark territory, outside this design's scope entirely; `likeness`/IP-infringement domain, not touched here).
- "I sourced the other images myself from Getty Images": under this design, extraction proposes a **`source_asset_mention` candidate** (new `CandidateObservation.kind`, mirroring `tool_mention`'s own shape) → normalizes against the new Getty/iStock/Adobe Stock/Shutterstock alias registry → resolves to `SourceAssetMention{resolution: {kind:'canonical', identifier:'getty'}, source_turn: 2, source_statement: "I sourced the other images myself from Getty Images."}` — **no longer falls into `unresolved_aliases`**, because it is no longer being incorrectly evaluated against the AI-tool registry at all.
- **No new `UserGoal` is created** — this is Path B (§5), disclosure only. This is the honest, disclosed limitation: this specific utterance, even under the recommended v0.1 design, does not by itself cause any Getty-specific governed knowledge to retrieve.

**What becomes potentially relevant:** nothing new retrieves in v0.1 from Turn 2 alone. If, hypothetically, the user had instead asked in Turn 2 *"Can I use Getty images in this commercial?"* — that would extract as a `user_goal` with `category: 'third_party_source_rights'` (Path A), and — once real claims exist and are Adopted+CRC-eligible — would retrieve them through the ordinary, existing, unmodified goal-category mechanism.

**What CRC could eventually ask (Path A only, once claims exist):** nothing user-facing is specified here (task instruction) — only that the *mechanism* to ask a bounded clarification (mirroring how `jurisdiction`-unmet already prompts today) would be available, not what words it would use.

**What CRC should never conclude:** whether this specific Getty asset is validly licensed, Creative or Editorial, or clear for this specific use — unchanged from Phase 0 §11/§18; this design adds no new capability to conclude any of that.

**What gets deferred to Commercial Assurance:** everything evidence-level — asset ID, license record, classification, purchaser identity, releases (Phase 0 §8's evidence table, unaffected by this design).

## 20. Comparison with the copyright/jurisdiction architecture

| Pattern reused | How |
|---|---|
| Jurisdiction's own precedent | Confirms that a *universally*-relevant fact can safely use `ApplicabilityFact`+diagnostics; this design explicitly does **not** reuse that mechanism for a *conditionally*-relevant fact (§6) — a deliberate, evidenced non-reuse, not an oversight. |
| `unresolved_project_dependencies` | Reused verbatim, no change (§9). |
| Topic Retrieval (`lookupTopicClaims`) | Reused verbatim — the new category is just another value in the same mechanism. |
| `TopicRelationship` | Reused verbatim, same double-gate, same `Adopted`-while-`Pending` posture as REL-COPY's own real current state (§13). |
| `ToolMention`'s resolution shape | Reused as a pattern (not the type itself) for `SourceAssetMention` (§7). |
| Genuinely new concepts introduced | One `GoalCategory` value; one new entity type + list field; one new alias registry. That's the entire net-new surface. |

Deliberate reuse, not cargo-cult reuse: every rejected option in §4/§7/§8/§12 was rejected with a specific, evidenced reason (mostly the §1/§6 diagnostic-leak finding), not merely because a novel mechanism seemed unnecessary.

## 21. Engineering size estimate (no implementation; estimate only)

**Overall: SMALL–MEDIUM**, if scoped exactly to §18's recommendation (Path A only; Path B explicitly deferred).

| Surface | Touched? | Why |
|---|---|---|
| Schema/type changes | Yes — small | One `GoalCategory` enum value; one new interface (`SourceAssetMention`); one new `StructuredUnderstanding` field. |
| Extraction | Yes — small–medium | New `CandidateObservation.kind: 'source_asset_mention'` branch (mirrors `tool_mention`'s existing shape closely); new alias registry; extractor prompt update to recognize source-provider mentions and, separately, explicit third-party-rights questions (`goal_category_hint`). |
| Interview behavior (candidate clarification questions) | Possibly — small | Only if a future bounded-clarification prompt is wanted for `third_party_source_rights` (not specified here, per task instruction). |
| Retrieval | **No change** — the existing `lookupTopicClaims`/`lookupRelatedTopicClaims` mechanism already handles a new `GoalCategory` value with zero code changes (it's a runtime enum member, not a branch). |
| Bounded Interpretation | **No change** — already category-agnostic. |
| Fixtures | Yes — small | New alias-registry fixture data; new `topic-claims-fixture.ts` entries once real claims exist (separate future milestone). |
| Tests | Yes — small–medium | New extraction tests (mirroring `tool_mention` test coverage); no new Retrieval/Bounded-Interpretation test *behavior* needed beyond adding fixture data, since the mechanism itself is unchanged. |
| Projection/email | **No change** — `understood-summary.ts` would need one new rendering branch for `source_asset_mentions` (distinct from `unresolved_tool_mentions`) to stop the misleading "wasn't able to match to a specific platform yet" sentence for a recognized provider — small, but real; not specified further here (no CRC copy authored). |
| Analytics | **No change.** |
| Migrations | Yes, if `StructuredUnderstanding` is persisted via a schema requiring an explicit column/JSON-shape update (small; consistent with however `tool_mentions` itself is currently persisted — not independently verified in this pass, flagged). |

## 22. Internal contradiction check (task §32)

No contradiction found between this document and the Phase 0 research artifact's substantive findings. Phase 0's Getty/iStock/Adobe Stock/Shutterstock research (license taxonomy, AI-restriction language, editorial rules) is unmodified and unchallenged by anything discovered while reading the architecture. Phase 0's own architecture section (§17–§19) is **superseded in its tentative framing, not contradicted** — Phase 0 correctly identified the gap ("missing `GoalCategory`/`ApplicabilityFact`") but had not yet traced the diagnostic-leak mechanism (§1/§6 above) that determines *which* of Phase 0's own listed candidate solutions (a new category vs. a new applicability fact) is actually safe. This document resolves that open question; it does not rewrite Phase 0's research.

---

**Design conducted:** 2026-08-17. **Status:** Proposed, PM review required. **Next step:** PM decision on §18's nine recommendations (adopt as a set, adopt selectively, or reject) before any implementation work begins. No implementation should proceed from this document without that decision.
