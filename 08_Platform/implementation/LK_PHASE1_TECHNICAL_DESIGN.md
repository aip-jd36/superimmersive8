# SI8 Living Knowledge Expansion — Phase 1 Repo-Grounded Technical Design

**Status: DESIGN PROPOSAL ONLY — not implemented, no code/schema/DB changes made.**
Produced in response to PRD v0.2 §27. Read-only repo inspection + design. Awaiting PM review per PRD §29 step 3.

Date: 2026-08-16

---

## 1. Executive Verdict

**GO WITH CHANGES.**

PRD v0.2's architecture is directionally correct and the repo confirms it's achievable as a genuine *evolution*, not a rewrite. Three concrete reasons this is "with changes," not a flat GO:

1. **The PRD's own §14 retrieval model ("Tool Retrieval + Topic/LK Retrieval → Governed Applicable Claim Set") is not just a nice framing — it's structurally *required*.** Today's Retrieval Engine can only surface a claim that is a child of a matched *tool row*. A copyright/human-authorship claim has no tool to attach to — it applies regardless of which AI tool was used. This means Topic/LK Retrieval cannot be "more tags on the Matrix"; it must be a second, parallel lookup path. The repo already anticipates this exact seam (see §4/§12 below) — good news, but it means Wave 1 copyright claims literally cannot go live by editing the Matrix alone.
2. **Jurisdiction is not capturable today.** `StructuredUnderstanding` has no jurisdiction field, and Interview Engine never asks about it (correctly — CRC must never infer it from IP). A jurisdiction-gated Wave 1 claim will very often have an *unmet* applicability requirement, which is safe behavior (no guess = no-coverage), but it means most Wave 1 claims won't actually fire in a typical CRC conversation until a real capture mechanism exists. This is a genuine, PM-relevant scoping question (§28 open decision), not a blocker to designing the schema.
3. **The existing Matrix→code mirror (`matrix-fixture.ts`) is already a manually-synced, hand-maintained duplicate of the markdown source of truth.** It works today at 10 rows. Extending the same pattern to Wave 1 claims is the right Phase 1 choice (no new infra, matches PRD's "demonstrate a concrete need before adding infrastructure"), but it is a real, already-observed maintenance burden, not a free extension.

None of these are reasons to abandon the architecture — they're reasons the Phase 1 scope needs to be explicit about what it does and doesn't promise (a copyright claim that mostly won't fire because jurisdiction is unconfirmed is still a successful vertical-slice proof; it just isn't yet a high-volume CRC feature).

---

## 2. Current-State Architecture Map

| Structure | Path | Purpose | Canonical? | Runtime consumer | Governance | Overlaps with |
|---|---|---|---|---|---|---|
| **Platform Rights Matrix** | `06_Operations/institutional-knowledge/notebook/PLATFORM-RIGHTS-MATRIX.md` | Per-tool commercial-use research + CRC publication decisions | **Canonical** for tool/platform facts | None directly — see `matrix-fixture.ts` | CRC-Eligible Governance (claim-level), Publication Policy | `matrix-fixture.ts` (manual mirror) |
| **Matrix code mirror** | `08_Platform/app/lib/retrieval-engine/matrix-fixture.ts` | Runtime `MatrixRow[]` Retrieval actually reads | Noncanonical (mirror) | `retrieve()`, all Retrieval tests | None — hand-copied, no enforcement it matches the markdown | Platform Rights Matrix |
| **SI8 Positions** | `06_Operations/institutional-knowledge/notebook/SI8-POSITIONS.md` | Settled institutional stances (6 entries) | Canonical for positions | None (human-read only) | Status field only; **no CRC-Eligible-equivalent** | Edge Cases, Pending Questions |
| **Edge Cases** | `.../notebook/EDGE-CASES.md` | Resolved one-off judgment calls (1 entry: EC-001) | Canonical | None | None | Positions (EC-001 feeds POS-001) |
| **Pending Questions** | `.../notebook/PENDING-QUESTIONS.md` | Open questions (7: PQ-001–007; PQ-004/005 are copyright, PQ-007 is jurisdiction) | Canonical | None | None | — |
| **Living Notebook PRD** | `08_Platform/prds/PRD_LIVING_NOTEBOOK.md` | Normative spec for the 4 docs above, frozen v1.0 | Canonical (spec) | None | Defines CRC-Eligible mechanics | — |
| **CRC Publication Policy** | `.../notebook/CRC-PUBLICATION-POLICY.md` | 6 principles governing `CRC-Eligible` decisions | Canonical (policy) | None (human judgment aid) | Governs the Matrix's own governance field | — |
| **Matrix Learnings** | `.../notebook/MATRIX-LEARNINGS.md` | Schema-friction log from populating the Matrix | Not canonical — a working log | None | — | Documents the exact gaps this PRD addresses |
| **Reviewer Manual v0.2** | `06_Operations/reviewer-workbook/SI8-Reviewer-Manual-v0.2.md` | Commercial Assurance methodology (7 domains, 5 outcomes) | Canonical | Human reviewers (manual), `guidance.ts` (hardcoded copy) | Governs assessment outcomes | Zero code linkage to Matrix/Notebook |
| **Assessment Registry** | `08_Platform/app/lib/assessments/service.ts` + `assessments` table | Assessment lifecycle, `methodology_version` snapshot | Canonical (runtime) | Admin UI, public Verification Page, C2PA manifest | `methodology_version` immutable-at-creation | — |
| **CRC Retrieval Engine** | `08_Platform/app/lib/retrieval-engine/` | Tool-identifier-keyed claim lookup | Canonical (runtime) | `run-crc-conversation.ts` → M2 | Enforces `CRC-Eligible: Yes` only | Reads `matrix-fixture.ts` |
| **CRC M2 (Bounded Interpretation)** | `08_Platform/app/lib/bounded-interpretation/` | Connects `UserGoal` + `RetrievalResult[]` → bounded text | Canonical (runtime) | `run-crc-conversation.ts` | No doctrine allowed in code (enforced by boundary review this session) | Consumes Retrieval's `topic` field |
| **Research corpus** | `01_Business/research/*.md`, `06_Operations/legal/rights-playbook/research/*.md` | Raw/interpretive legal &amp; market research | **Not canonical** — pre-LK source material | None | None | Overlaps heavily with itself (see §3) |

---

## 3. Knowledge Duplication / Fragmentation Map

This is the problem, shown before any fix:

**Platform commercial-use rules** — live in exactly two places today (Matrix markdown + `matrix-fixture.ts`), kept in sync **by hand**. No automated check that they agree. `matrix-fixture.ts`'s own header comment already documents this as a known, accepted gap.

**Copyright/human-authorship research** — fragmented across **at least 8 documents** with meaningfully different reliability:
- `06_Operations/legal/rights-playbook/research/us-copyright.md` — strongest, primary-source-linked (USCO Part 2 Report, Zarya of the Dawn, Federal Register).
- `01_Business/research/AI-COPYRIGHT-RESEARCH-2026.md` — weaker; contains at least one likely-garbled citation (**"Allen v. Perlmutter"** — unsourced, uncorroborated anywhere else, possibly confused with Thaler) and an unsourced USCO quote.
- `06_Operations/legal/rights-playbook/versions/v0.2.md` — restates the USCO finding correctly with a source link, adds statutory material (§504(c)(2), §1202/1203, Colorado AI Act, EU AI Act Art. 50).
- `01_Business/research/COMMERCIAL-RISKS-AI-VIDEO-EXTERNAL-EVIDENCE-2026.md` and its advertising companion — **the most rigorously verified** (explicit word-for-word source-verification sections).
- `01_Business/research/merged-legal-research-final.md` / `legal-defense-documentation-research.md` — AI-tri-synthesized, "Triple-Verified" labeled but that only means three LLMs agreed, not that a human checked the primary source.
- `01_Business/research/ai-content-risk-landscape.md` — has genuinely new, well-dated primary-adjacent case material (Disney/Warner Bros. v. Midjourney, Getty v. Stability AI UK) not indexed anywhere else.
- Two real prospect **call notes** (XRBB, Anchor Film) contain secondhand, uncited legal claims (a Taiwan "蔡阿嘎's wife" precedent, an unnamed "US Patent Office" recollection) that corroborate SI8's internal position but are not independently verified.
- `EDGE-CASES.md` EC-001 / `SI8-POSITIONS.md` POS-001 — SI8's **own operational precedent** for "prompts alone ≠ authorship," derived from a real assessment mistake, not from external research at all.

The same core proposition ("prompts alone are not sufficient for authorship") is independently stated, with varying rigor, in at least **5** of these documents. None of them currently know about each other's existence in a structured way — a future editor has no way to know that fixing a claim in one place should also update the other four.

**Jurisdictional findings** — scattered across the copyright docs (US/EU/Taiwan/Singapore/Sweden mentioned, with wildly uneven sourcing — US is well-grounded, Sweden is a single unsourced sentence) plus a completely separate NY Synthetic Performer Law document, plus PQ-007's flag that the Reviewer Manual's own 7-domain taxonomy has **no domain at all** for jurisdiction/procurement risk.

**Provenance positions** — POS-005/POS-006 in Positions, plus the entire Provenance Manifest Specification v0.2 (a separate, large, already-versioned document), plus C2PA-as-evidence commentary repeated across nearly every research doc as a positioning contrast rather than as its own researched topic.

**Voice/likeness** — comparatively well-contained: mostly resolved via the `elevenlabs-voice-consent` Matrix claim (explicitly withheld) and POS-003, not fragmented the way copyright is. NY Synthetic Performer Law research is a separate, well-sourced document not yet connected to any Matrix/Position entry.

No normalization proposed here — this is the "show us the problem first" section, per instruction.

---

## 4. Recommended Canonical Knowledge Architecture

**What becomes canonical:** a new file-based claim layer — one canonical **Governed Claim** entry per proposition, living in a new git-native document (see below), following the *exact* entry-block pattern already proven by Positions/Edge Cases/Pending Questions (a formal `###` header + labeled fields), extended with the new fields PRD §7 requires.

**What remains source material:** everything in `01_Business/research/` and `06_Operations/legal/rights-playbook/research/`. These stay exactly where they are, untouched. A Governed Claim's `source_references` field points *into* this material (and to primary external sources) rather than replacing it. Research documents are evidence a claim cites, never themselves retrievable by CRC.

**What remains methodology:** the Reviewer Manual, Publication Policy, and Living Notebook PRD stay as governance documents. Nothing here proposes changing how reviewers work.

**What remains unresolved research:** Pending Questions stays exactly as-is — PQ-004/PQ-005 (copyright) and PQ-007 (jurisdiction) are explicitly *not* claims yet; they're candidates for Wave 1 research to resolve, or to remain open.

**How the Matrix/Positions/Edge Cases/Pending Questions relate to the new claim layer:**
- **Matrix: unchanged, kept as the tool-scoped claim source.** It already has 90% of a governed claim's shape (`claim_id`, `CRC-Eligible`, `Publication Scope`, `Candidate Statement`, `Decision Date`, `Approver`). Do not migrate it. Migrating a working, already-governed 11-claim structure for architectural symmetry alone would violate the guardrail "no silent replacement of existing governed knowledge structures" for zero Phase 1 benefit.
- **Positions: unchanged, stays as curated institutional stances.** Positions lack a publication-governance field and a jurisdiction/applicability model — but Positions' actual job (a handful of settled talking points) doesn't need those. Overloading Positions with claim machinery would break its one genuinely good property: it's short and skimmable.
- **Edge Cases / Pending Questions: unchanged**, they remain exactly what they are — a precedent log and a backlog. PQ-004/PQ-005 are Wave 1's literal starting research brief.
- **The new claim layer is where non-tool-scoped topical knowledge lives**, starting with Wave 1 copyright. It is *not* a replacement for any of the four documents — it is the fifth kind of institutional-knowledge artifact the repo doesn't have yet, because until CRC started asking about copyright, SI8 never needed one.

**Do we extend an existing structure or create a new one? Create a new one — but the smallest possible one.**

Reasoning: I considered extending `SI8-POSITIONS.md` (it already has the closest schema — fact/interpretation split, Status, dates) instead of a new file. Rejected because: (a) Positions has zero readers/consumers today beyond humans, and repurposing it to carry jurisdiction/applicability/lifecycle/versioning fields for CRC's runtime would force every existing Position entry to either grow those fields (most don't need them) or the schema to become optional/inconsistent; (b) Positions is deliberately small (6 entries, curated, high-bar) — a Wave 1 copyright claim set could plausibly reach 10-20 entries on its own, which changes Positions' character from "the short list of things we say" into "the knowledge base," which is a different document with a different audience; (c) the guardrail against "no silent replacement" cuts against repurposing an existing, working document's meaning.

The new file follows the **same physical convention** every other Notebook document already uses (flat git-native markdown, `###` entry blocks, stable IDs, `[[wiki-link]]`-style cross-references) — this is not a new kind of infrastructure, it's the fifth file of a pattern that already has four working examples.

**Proposed location:** `06_Operations/institutional-knowledge/notebook/GOVERNED-CLAIMS.md` (or one file per domain if Wave 1 alone produces enough entries to make one file unwieldy — Phase 1 doesn't need to decide this yet; PRD explicitly says don't optimize for claim count). This sits alongside the four existing Notebook documents, is git-native, and requires **zero new infrastructure** to create.

---

## 5. Canonical Claim Model

Concrete schema (git-native `###` entry block, following exactly the Positions/Edge-Cases precedent). Every field justified against Phase 1's actual requirement — no decoration.

```markdown
### CLAIM-COPY-001 — v1

Domain: Copyright & Human Authorship
Topic: copyright_ownership          <!-- matches GoalCategory enum CRC already has -->
Subtopic: ai-generated-video-no-human-authorship

Claim character: established         <!-- established | conditional | unsettled -->
Jurisdiction: United States (federal)
Context: commercial AI-generated video, no material human creative contribution

Claim proposition: >
  AI-generated video content produced without meaningful human authorship
  is not eligible for U.S. copyright protection.

Source references:
  - primary: USCO Copyright Office Report, Part 2 (Jan 29, 2025) — copyright.gov/ai
  - primary: Thaler v. Perlmutter, cert denied Mar 2026
Source authority/type: Primary legal/official authority
Source fact: >
  USCO Part 2 Report: works "whose expressive elements are determined by a
  machine" do not qualify for copyright registration. Thaler line of cases
  affirms no non-human authorship.
SI8 interpretation: >
  A commercial AI video with no confirmed human creative contribution
  should not be represented to a client as copyright-protected output.

Applicability requirements:
  - jurisdiction = United States
Prohibited conclusions: >
  Does not establish whether THIS specific video has sufficient human
  contribution to qualify (see CLAIM-COPY-002, human-contribution test).
  Does not address international/EU status. Does not constitute a
  copyrightability determination for a specific work.

Lifecycle: Adopted
Publication scope: CRC eligible (see CRC Publication Scope below)
CRC Publication Scope: >
  CRC may state that, under current U.S. law, AI-generated video with no
  meaningful human creative contribution generally does not qualify for
  copyright protection, and that this is a distinct question from whether
  the video is safe to use commercially. CRC must not state whether THIS
  user's specific video qualifies.
CRC Candidate Statement: >
  Under current U.S. copyright law, AI-generated video without meaningful
  human creative contribution generally isn't eligible for copyright
  protection. This is a different question from whether you're clear to
  use the video commercially.

Effective date: 2026-08-16
Last reviewed: 2026-08-16
Version lineage: v1 (initial) — supersedes: none — superseded by: none

Related: [[POS-001]], [[EC-001]], [[PQ-004]], [[PQ-005]]
```

Field-by-field justification (Phase 1 only — every field the PRD's own §7 table asked for, and *only* those):

| Field | Why Phase 1 needs it |
|---|---|
| **Stable claim ID** (`CLAIM-COPY-001`) | Required for M2/assessment references, cross-links, and version lineage. Mirrors `POS-NNN`/`EC-NNN` naming already in use. |
| **Version suffix** (`v1`) | Required by PRD §13 (historical reproducibility) — an assessment must be able to reference an exact version, not just an ID that keeps changing meaning. |
| **Domain / Topic / Subtopic** | Domain = the §8 taxonomy row (routing/reporting). Topic = the exact `GoalCategory` enum CRC's M1/M2 already use (`commercial_use`/`copyright_ownership`/`copyrightability`/`likeness`/`unknown`) — this is the field Retrieval actually matches on. Subtopic exists only because "copyright" alone is too coarse once more than one copyright claim exists; kept free-text, not enum, to avoid premature taxonomy explosion (PRD §8 explicit warning). |
| **Claim character** | Required by PRD §12 — distinguishes established/conditional/unsettled. See §6 below for exact semantics; "no coverage" is deliberately *not* a value here (it's a retrieval outcome, not a stored state). |
| **Jurisdiction** | Required by PRD §9. Drives applicability gating (§7 below). |
| **Context** | Needed to scope claims narrowly per Publication Policy Principle 4 ("scope narrowly rather than withhold") — without it, "AI video copyright" claims would collide across commercial/non-commercial/personal contexts that may have different answers later. |
| **Claim proposition** | The actual governed sentence — this *is* the claim. |
| **Source references / Source authority/type / Source fact** | Directly required by PRD §10. Authority/type uses the PRD's own 6-value taxonomy verbatim (primary legal, official platform, strong secondary, industry evidence, SI8 operational, SI8 judgment) — reusing the PRD's own table rather than inventing a parallel one. |
| **SI8 interpretation** | Mirrors the existing fact/interpretation split already proven in Positions/Edge Cases — keeps "what the source says" separate from "what SI8 concludes," so a future source re-check doesn't require rewriting SI8's own judgment. |
| **Applicability requirements** | Required by PRD §9. See §8 below for the concrete predicate design. |
| **Prohibited conclusions** | Required by PRD §7 and directly load-bearing for M2's "relevant to, not answering" boundary rule (the exact discipline I just enforced in the M2 boundary-violation fix this session) — this field is what a future claim author uses to pre-declare the boundary, instead of relying on M2's own templates to invent one. |
| **Lifecycle** | Required by PRD §11. Four values, taken verbatim from the PRD's own table (Candidate/Under Review/Adopted/Deprecated-Superseded) — not the Matrix's `Status` enum (Verified/Needs Reverification/Unconfirmed), which is a *factual-freshness* concept, not a *governance-stage* concept. Keeping these as two distinct enums (one per structure) avoids conflating "is this fact still true" with "has this been through the adoption process," which MATRIX-LEARNINGS.md already flags as a real, live confusion risk in the existing Matrix. |
| **Publication scope / CRC Publication Scope** | Required by PRD §11 + Success Criteria #1/#2. Reuses the Matrix's exact existing `CRC-Eligible`/`CRC Publication Scope` mechanism and vocabulary — not a new concept, the same one extended to a second document. |
| **CRC Candidate Statement** | Same field the Matrix already has, same purpose: pre-drafted, human-approved, verbatim-renderable prose — never model-generated at retrieval time. |
| **Effective date / Last reviewed** | Required by PRD §13 (freshness) and mirrors the Matrix's `Last Verified`. |
| **Version lineage** | Required by PRD §13. See §10 below. |
| **Related** | Reuses the Notebook's existing `[[wiki-link]]` cross-reference convention — no new mechanism. |

**Fields deliberately NOT added**, and why: no `risk_score`/`confidence_percentage` (PRD's own uncertainty model is qualitative, not numeric — adding a fake-precision number here would be exactly the kind of "field that sounds useful" the task explicitly warns against); no `reviewer_assigned`/`workflow_state` beyond `Lifecycle` (Under Review is already a lifecycle value; a separate workflow-tracking field is Phase-2-or-later process tooling, not part of the claim's own semantics); no `citation_count`/`usage_count` (derivable from Retrieval logs later if ever needed — not stored on the claim itself, matching the same "durable vs. recomputable" discipline already used to keep `ProjectionOutput` out of `crc_sessions`).

---

## 6. Claim Character / Uncertainty Model

Four semantics, three of them **stored on the claim**, one of them **not a stored value at all**:

| Semantic | Stored as | Where it lives |
|---|---|---|
| Established proposition | `Claim character: established` | On the claim, `Lifecycle: Adopted` |
| Conditional/restricted proposition | `Claim character: conditional` | On the claim — the condition itself lives in `Applicability requirements` (not a separate free-text field; PRD §9 already gives applicability its own home) |
| Unsettled/conflicting authority | `Claim character: unsettled` | On the claim, `Lifecycle: Adopted` (an unsettled claim can still be Adopted — "we've reviewed this and confirmed it's genuinely contested" is itself governed knowledge, distinct from "we haven't looked at this yet") |
| **No governed coverage** | **Not stored anywhere.** It is what Retrieval/M2 report when no claim matches (or no CRC-eligible claim matches) a goal's topic+jurisdiction+applicability. | Computed at retrieval/interpretation time |

This directly answers the PRD's own explicit caution ("no governed coverage may be a retrieval result rather than a stored claim type — tell us which"): **it is a retrieval result.** A stored "we have no coverage" claim would be a contradiction in terms — a claim, by definition, is something SI8 has reviewed and adopted; the absence of one is not itself adoptable knowledge. This is also exactly consistent with how M2 already works today (confirmed live in production this session): `outside_current_coverage` is a status M2 *computes* when `results.filter(r => r.topic === goal.category)` is empty — never a value that flows out of the Matrix. Wave 1 doesn't change this pattern; it just gives it more claims to potentially match against.

`unsettled` deserves one more distinction, matching PRD §12's conflict-handling flow (Detect → Verify → Assess impact → Quarantine/review → Human resolution): an `unsettled` claim's `CRC Publication Scope` should typically read as "SI8's governed knowledge on this point is genuinely contested," not silently omitted — this is itself useful, honest information for M2 to relay (a different, better answer than a blank `outside_current_coverage`), so `unsettled` + `CRC-Eligible: Yes` is a legitimate, expected combination, not an edge case.

---

## 7. Jurisdiction Model

Smallest useful representation: **a single free-text `Jurisdiction` field**, not an enum, not a hierarchy table, for Phase 1. Concrete values used in Wave 1: `Global`, `United States (federal)`. State/provincial and sector overlays are representable in the same field the moment they're needed (`United States — California`, `EU — Germany`) without a schema change — this is deliberately under-engineered relative to a full jurisdiction hierarchy table, because Wave 1 has exactly one jurisdiction in scope and PRD §24 defers jurisdictional overlays to Wave 5.

**How CRC determines applicability:** via the `Applicability requirements` predicate list (§8) — a jurisdiction-scoped claim's requirement list contains `{ fact: "jurisdiction", operator: "equals", value: "United States" }`. If `StructuredUnderstanding` has no confirmed jurisdiction fact (true today — see §1), that single requirement is permanently unmet, and the claim simply never fires. This is safe, correct behavior per PRD §9 ("if required facts are unknown, CRC must not guess") — not a bug to work around silently.

**IP address is explicitly, structurally never consulted.** Confirmed by inspection: nowhere in `lib/interview-engine/`, `lib/retrieval-engine/`, or `lib/bounded-interpretation/` does any function accept a request IP or geolocation value as an input. `resolveClientIp`/`normalizeIp` (used for abuse-key hashing) live entirely in `lib/crc-engine/abuse-key.ts` and `traffic-classification.ts` — a completely separate concern (rate-limiting/traffic classification), never passed into extraction, retrieval, or interpretation. This guardrail is trivially satisfiable because the two code paths that touch IP and the code paths that touch claims have no shared function today, and Phase 1's design does not introduce one.

**Multiple potentially-applicable jurisdictional claims coexisting:** already handled correctly by construction — `buildBoundedInterpretations` already `.filter()`s to matches, never picks "the one true answer," and per PRD §9 there is explicitly no "strictest jurisdiction governs" rule. If a US claim and a (future) EU claim both had their applicability requirements met simultaneously, both would surface as separate `directly_relevant` (or equivalent) entries — the existing `directlyRelevantSummary` combining logic (already live, confirmed in production this session combining Kling+ElevenLabs statements) already does exactly this for multiple matched claims.

---

## 8. Applicability Model

Deliberately **not** a rules engine. A small, fixed list of structured predicates, each evaluated deterministically against fields `StructuredUnderstanding`/`RetrievalHandoff` already has (or, if unconfirmed, evaluates to "unmet" — never guessed).

```ts
interface ApplicabilityRequirement {
  fact: 'jurisdiction' | 'tool_plan_tier' | 'client_supplied_asset' | 'creator_relationship' | 'distribution_context'
  tool?: string           // only meaningful when fact === 'tool_plan_tier'
  operator: 'equals' | 'not_equals'
  value: string
}
```

Evaluated the same way `buildBoundedInterpretations` already evaluates `goal.category === result.topic` — a plain, deterministic `.every()` over the list, no scoring, no partial credit, no LLM judgment call at match time (the LLM's only role stays exactly where it is today: proposing structured facts during Extraction; deciding whether a fact satisfies a predicate is pure code, same discipline as everything else in Interview Engine/Retrieval).

Three concrete examples, each drawn directly from the PRD's own §9 example list and mapped onto real fields that already exist in this codebase:

1. **Platform + plan** — `{ fact: 'tool_plan_tier', tool: 'elevenlabs', operator: 'equals', value: 'free' }`. Maps onto `ToolMention.plan_tier` (already exists, already attested per-tool — confirmed live in production this session: `plan_tier: {state:'confirmed', value:'paid'}`). This is the ONLY applicability dimension that's fully capturable *today* with zero Interview Engine change.
2. **Copyright + jurisdiction** — `{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }`. Maps onto a field that **does not yet exist** on `StructuredUnderstanding` (see §1/§28 — flagged as an open PM decision, not silently assumed).
3. **Client-supplied asset** — `{ fact: 'client_supplied_asset', operator: 'equals', value: 'true' }`. Partially capturable today: Interview Engine's own commercial-readiness-discovery catalog already has a `client_provided_source_assets` category (confirmed in `commercial-readiness-catalog.ts`) and a real production turn from this session's own live validation asked exactly this question ("Did the client give you any images/logos...") — but it currently produces a `ScopedObservation`, not a structured boolean fact keyed the way an applicability predicate needs. Wiring this is a small, well-scoped Interview Engine change, not a redesign.

Unmet-requirement behavior is uniform and already proven: same as `outside_current_coverage` (§6) — no requirement met → claim doesn't enter the applicable set → M2 reports honest no-coverage/no-applicable-answer, never a guess.

---

## 9. Publication Model

Reuses the Matrix's existing mechanism **exactly**, extended to the new claim layer — this is not a new concept:

| Scope | Meaning | Enforcement point |
|---|---|---|
| Internal/research | Candidate/Under Review claims; never retrievable | `Lifecycle !== 'Adopted'` excluded before eligibility check |
| Reviewer/Commercial Assurance | Adopted, richer content than CRC permits | Future reviewer-facing lookup (not built in Phase 1 — see §14) reads all Adopted claims regardless of `Publication scope` |
| CRC-eligible | Adopted **and** explicitly `Publication scope: CRC eligible` | `enumerateEligibleClaims`-equivalent for the new claim source, filtering on the *same* per-claim boolean discipline the Matrix already enforces (claim-level, never row/document-level) |
| Public SI8 position | Explicit separate approval | Not built in Phase 1 — no public-position publishing pipeline exists or is proposed here |

**Enforcement is in Retrieval, not the UI** — directly satisfying PRD §14's explicit requirement. Concretely: the new topic-claim lookup function (§12) performs the identical operation `enumerateEligibleClaims` already performs on the Matrix (`.filter(c => c.crc_eligible === 'Yes')`), on the new claim source, before a claim can ever become a `RetrievalResult`. A reviewer-only claim (`Lifecycle: Adopted`, `Publication scope: Reviewer/internal`) is filtered out at this exact point — structurally identical to how `elevenlabs-voice-consent` (`CRC-Eligible: No`) is filtered out of CRC results today, already proven correct in the existing test suite (`retrieve.test.ts`'s own "negative assertions, forbidden fields" tests) and confirmed live in production (the ElevenLabs voice-consent claim never appears in any CRC output, verified this session).

**"Adopted is not automatically CRC-eligible"** — enforced structurally by requiring *two* independent gates on the same filter: `Lifecycle === 'Adopted'` AND `Publication scope includes CRC eligible`. A claim can sit at `Adopted` + `Publication scope: Reviewer/internal` indefinitely — richer reviewer knowledge that never reaches CRC — exactly the PRD's own required behavior (§26 Success Criteria #2).

---

## 10. Versioning + Historical Reproducibility

**Mechanism — reuses the exact pattern already proven twice in this repo** (Reviewer Manual v0.1→v0.2, and Positions' `Status: Superseded (by POS-XXX)`), extended with a stable per-claim version suffix:

```
Claim v1
  CLAIM-COPY-001-v1
  Lifecycle: Adopted
  Version lineage: v1 (initial) — supersedes: none — superseded by: none
       │
       │  (source changes — e.g. a new USCO report clarifies the standard)
       ▼
Claim v2
  CLAIM-COPY-001-v2
  Lifecycle: Adopted
  Version lineage: v2 — supersedes: CLAIM-COPY-001-v1
  [v1's own entry, still physically present in the file, is edited ONLY to:]
  Lifecycle: Deprecated
  Version lineage: v1 (superseded by: CLAIM-COPY-001-v2)
```

**v1's body content — proposition, source references, SI8 interpretation, publication scope — is never edited or deleted.** Only its `Lifecycle` and `Version lineage` header fields change. This mirrors *exactly* how `SI8-Reviewer-Manual-v0.1.md` was preserved (body untouched, only the header block flipped to `SUPERSEDED` + a pointer added) — same discipline, same file-preservation mechanism, now applied at claim granularity instead of whole-document granularity.

**How a Commercial Assurance assessment references v1 after v2 exists:** the exact same mechanism `assessments.methodology_version` already uses today, extended with one new nullable column:

```sql
ALTER TABLE assessments ADD COLUMN knowledge_snapshot_ref TEXT;
```

Populated **once, at assessment creation**, immutable afterward — literally the same discipline `METHODOLOGY_VERSION` already has (a plain string constant, written at row-insert time in `createAssessmentFromWorkbook`, never touched by any `updateAssessment` call). Phase 1 does not need per-claim foreign keys — Domain R reviewers today read the Matrix by hand (confirmed: zero code-level Matrix integration in the reviewer UI), so a single whole-snapshot reference (e.g. a short label like `"LK snapshot 2026-08-16"` or a git commit SHA of the claims file at that moment) is sufficient to satisfy PRD §13/§26's requirement ("bind at least one test Commercial Assurance record/reference... or prove the designed mechanism") without inventing a join table Phase 1 has no real consumer for yet. A future wave, once reviewers actually cite specific claim IDs during a real assessment, is the right trigger for a proper `assessment_claim_references` join table — building it now would be exactly the "infrastructure without demonstrated need" the guardrails warn against.

**Current CRC always retrieves latest-applicable-Adopted** — by construction: the topic-claim lookup only ever considers non-superseded entries (`superseded_by: none`), same filter shape as `su.user_goals.filter(g => g.superseded_by === null)` already used throughout M1/M2. No new concept required.

---

## 11. Source / Provenance Model

Reuses PRD §10's own 6-value `Source authority/type` taxonomy verbatim, stored as free text on each claim's `Source authority/type` field (not an enforced enum in Phase 1 — a controlled vocabulary maintained by convention, matching how the Matrix's own `Status` field works today):

`Primary legal/official authority` · `Official platform authority` · `Strong secondary authority` · `Industry evidence` · `SI8 operational evidence` · `SI8 judgment`

**Are source snapshots/archive copies required in Phase 1? Yes, but minimally** — a plain-text or PDF capture of the retrieved primary source at the moment a claim cites it, so a future re-verification isn't blocked by a source page changing or disappearing. **Where they live:** alongside the source-monitoring pipeline's own archive (§18) — a new, small directory, e.g. `06_Operations/institutional-knowledge/source-archive/`, one file per (source, retrieval-date) pair, referenced from a claim's `Source references` field by relative path. This is git-native (no new storage system), and directly reuses the discipline already established in this repo for evidence preservation (e.g. `06_Operations/assessments/` per-assessment folders already do "one directory per record, README + artifacts"). Not required for every historical secondary-source citation in the existing research corpus — only for primary sources a *new governed claim* actually cites going forward.

---

## 12. CRC Retrieval Integration

**Central finding (see §1): today's retrieval can only surface a claim attached to a matched tool row.** `lookupRows()` looks up `handoff.tools[].identifier` only; nothing in the current pipeline looks up anything by *topic*. `extractMatchableFacts()` already produces `intended_use`/`workflow_role`/`observations` beyond tools, with its own header comment explicitly anticipating exactly this kind of future non-tool-keyed indexing — but a `UserGoal.category` (the actual topic signal, from M1) isn't even part of `RetrievalHandoff` today (by original M1 design: "user_goals cannot leak downstream by construction"). Topic retrieval therefore needs its own, parallel input — the goal list itself, not the existing handoff.

**Exact files/functions that change** (design only — nothing implemented):

| File | Change |
|---|---|
| `lib/retrieval-engine/types.ts` | Add `'topic'` as a second member of `RETRIEVAL_SOURCE_FACT_KINDS` (currently `['tool']` only — the type already has a comment anticipating this). Add a `TopicClaim` type (mirrors `MatrixClaim`, plus the new fields from §5: `jurisdiction`, `applicability_requirements`, `lifecycle`, `character`, `version`). |
| **New:** `lib/retrieval-engine/topic-claims-fixture.ts` | Manually-synced mirror of `GOVERNED-CLAIMS.md`, exact same pattern/precedent as `matrix-fixture.ts`. |
| **New:** `lib/retrieval-engine/lookup-topic-claims.ts` | Given active `UserGoal[]` + `TopicClaim[]`, match on `goal.category === claim.topic`, then apply the §8 applicability check against available facts. Parallel to `lookup-rows.ts`, not a modification of it. |
| `lib/retrieval-engine/retrieve.ts` | Gains a second internal step, called alongside the existing tool-keyed path; both streams merge into one `RetrievalResult[]` before returning — preserves the single "Governed Applicable Claim Set" output PRD §14 asks for. Requires a new parameter (`topicClaims: TopicClaim[]`), additive to the existing `matrix: MatrixRow[]` parameter, not a breaking signature change in spirit (existing callers that don't care about topic claims can pass `[]`). |
| `lib/crc-engine/run-crc-conversation.ts` | Passes `understanding.user_goals` (already has it — M2 already reads this field) and the new `TOPIC_CLAIMS_FIXTURE` into `retrieve()`. |
| `lib/bounded-interpretation/*` | **Zero changes.** Already filters `results.filter(r => r.topic === goal.category)` — it doesn't care whether a result came from a tool row or a topic claim. This is the single strongest piece of evidence that the existing M2 architecture was built correctly for exactly this extension. |

**No implementation performed** — this section names the seam, not the code.

---

## 13. M2 Contract

**M2's own function signature requires no changes at all** — confirmed by inspection of the actual, currently-deployed `buildBoundedInterpretations(goals: UserGoal[], results: RetrievalResult[])`. This directly satisfies PRD Success Criteria #10 ("Phase 1 can expand its corpus without redesigning CRC M2").

**Example payload — "Do I own the copyright?"** (once Wave 1 + topic retrieval exist, and jurisdiction happens to be confirmed):

```json
// UserGoal (already exists, M1)
{
  "goal_id": "t1-c5",
  "state": "confirmed",
  "raw_text": "Do I own the copyright?",
  "category": "copyright_ownership",
  "scope": "informational"
}

// New: a jurisdiction fact (does NOT exist in StructuredUnderstanding today — see §28)
{ "jurisdiction": { "state": "confirmed", "value": "United States" } }

// RetrievalResult (new: source_fact.kind === 'topic')
{
  "source_fact": { "kind": "topic", "identifier": "copyright_ownership" },
  "claim_id": "CLAIM-COPY-001-v1",
  "matrix_identifier": "CLAIM-COPY-001",
  "publication_scope": "CRC may state that... [full text]",
  "candidate_statement": "Under current U.S. copyright law, AI-generated video without meaningful human creative contribution generally isn't eligible for copyright protection...",
  "last_verified": "2026-08-16",
  "topic": "copyright_ownership"
}

// BoundedInterpretation (M2's existing output shape, unchanged)
{
  "goal_text": "Do I own the copyright?",
  "status": "directly_relevant",
  "summary": "Under current U.S. copyright law, AI-generated video without meaningful human creative contribution generally isn't eligible for copyright protection. This is relevant to who owns the copyright, though it reflects general legal principles, not a full determination of your specific project's copyright status."
}
```

**No-coverage case** (jurisdiction unconfirmed — the realistic Phase 1 default, per §1): applicability requirement `jurisdiction = United States` is unmet, so `lookupTopicClaims` never surfaces `CLAIM-COPY-001` as a match at all. `results` stays empty for this goal, exactly like today. Output is **byte-identical to current live production behavior**, already verified this session:

```json
{
  "goal_text": "Do I own the copyright?",
  "status": "outside_current_coverage",
  "summary": "CRC's current governed knowledge doesn't establish an answer to who owns the copyright. A human-reviewed Commercial Assurance Assessment can address this directly."
}
```

---

## 14. Commercial Assurance / Reviewer Integration

Reviewers see **all** Adopted claims, not just `CRC eligible` ones — the same lifecycle/publication distinction from §9, just a different filter (Adopted only, ignore `Publication scope` entirely). **Not building a reviewer-facing lookup UI in Phase 1** — confirmed via inspection that today's reviewer workbook has zero code integration with the Matrix at all (Domain R guidance is hardcoded static copy, reviewers read source material by hand). Building a live reviewer-copilot lookup now, with no demonstrated reviewer workflow need yet, would be exactly the "infrastructure without demonstrated Phase 1 requirement" guardrail warns against.

**Phase 1 scope here is intentionally tiny:** (a) the new nullable `assessments.knowledge_snapshot_ref` column (§10), and (b) manually populating it for one real test assessment to prove the mechanism — nothing else. Everything richer (a real reviewer lookup tool, automatic per-claim citation) is explicitly deferred (§25).

---

## 15. Storage Architecture

| Option | Verdict | Why |
|---|---|---|
| Markdown/git-native | **Recommended for the canonical claim store** | Already proven at scale for 4 documents; zero new infrastructure; matches PM's stated preference (PRD §25 table: "Git-native governance first — Accepted as preferred direction pending repo-grounded technical design") — this design confirms it. |
| Structured JSON/YAML frontmatter inside the markdown | **Recommended, additively** | Not a new storage system — just making the existing `###` entry blocks' field labels machine-parseable later if a build-time index is ever added. Doesn't change anything about how the file is read/edited today. |
| Generated runtime index (TS fixture, hand-synced) | **Recommended for Phase 1 runtime consumption** | Exact precedent already proven (`matrix-fixture.ts`, explicitly justified in its own header as the right choice absent a markdown-parsing precedent in this repo). Real cost: manual sync discipline — already an accepted, observed burden at 10 rows; worth flagging as the first thing to automate (build-time markdown→JSON parse) once Wave 1 grows the claim count meaningfully. Not needed for Phase 1's "one end-to-end path" goal. |
| Supabase/database | **Only for the two additive, non-canonical pieces**: (a) `assessments.knowledge_snapshot_ref` (§10) — one nullable column, and (b) analytics recomputation (§21) — zero new tables, reuses existing `structured_understanding` JSONB. **Not** for the claims themselves. | The claim data doesn't need transactional writes, concurrent-editor conflict resolution, or query flexibility beyond "get all claims for topic X" — a hand-synced in-memory array already handles that at this scale, and DB-backing it now would duplicate git's own audit trail (who/when/why a claim changed) in a second system. |
| Graph database | **Rejected**, per PRD's own explicit instruction and confirmed by inspection — nothing in the current or proposed architecture needs graph traversal. `Related: [[...]]` cross-references and `supersedes`/`superseded_by` pointers are exactly "explicit stable IDs and references," which the PRD itself names as sufficient. A future `assessment_claim_references` join table (§14, deferred) is a plain relational table, not a graph. |

---

## 16. Research / Knowledge Promotion Workflow

```
Research/source
   │  (human or AI-assisted drafting)
   ▼
Candidate claim  (Lifecycle: Candidate)
   │  (human review — authority, scope, conflicts, wording)
   ▼
Under Review     (Lifecycle: Under Review)
   │  (human decision)
   ▼
Adopted          (Lifecycle: Adopted, Publication scope: Internal/research by default)
   │  (SEPARATE human decision, per Publication Policy's 6-question checklist)
   ▼
CRC eligible     (Publication scope updated; only now retrievable by CRC)
   │
   ▼
Runtime (topic-claims-fixture.ts manually synced from the markdown)
```

| Transition | Automated / AI-assisted / Human-approved |
|---|---|
| Research → Candidate draft | AI-assisted (drafting only) |
| Candidate → Under Review | Human-triggered (a person decides to start reviewing it) |
| Under Review → Adopted | **Human approval required** (PRD §19 table, verbatim) |
| Adopted → CRC eligible | **Human approval required**, separately from adoption (same PRD table) |
| Claims file → runtime fixture | Manual sync (same discipline as the Matrix today) |

Nothing in this pipeline auto-promotes past `Candidate`. This is the same shape the Matrix's own CRC-Eligible Governance already uses — extended, not reinvented.

---

## 17. Phase 1 AI-Automation Design

| Capability | Deterministic vs AI | Inputs | Outputs | Human boundary | Audit |
|---|---|---|---|---|---|
| **Observe** (fetch a source) | Deterministic | Allowlisted URL | Raw HTML/PDF | — | Log fetch time |
| **Detect** (meaningful change) | Deterministic (hash/diff) | Prior snapshot vs. new fetch | Boolean + diff | — | Log diff |
| **Retrieve** (archive) | Deterministic | Changed page | Saved snapshot file (§11) | — | File itself is the record |
| **Propose** (draft candidate claim/update) | **AI** (single model call, structured output — same discipline as Extraction's own `messages.parse` pattern already used throughout this codebase) | Snapshot + existing claim (if updating) | Candidate claim draft (markdown, `Lifecycle: Candidate`) | — | Log model/version + raw output |
| **Challenge** (compare against existing LK) | Deterministic (string/field diff against current claim) + AI (summarize the delta in plain language) | Candidate + current Adopted claim | Diff report | — | Log diff |
| **Assess impact** (what does this affect) | Deterministic (grep for `claim_id` references + `Related:` links across the claims file, Positions, Edge Cases) | Candidate claim's ID/topic | List of potentially-affected entries | — | Log impact list |
| **Human govern** | **Human, mandatory** | Review package (candidate + diff + impact list) | Approve/reject/edit decision | **This is the gate — nothing before this line can change `Lifecycle`** | Decision recorded in the commit itself (git author + message) |
| **Publish** | Human-triggered, mechanically simple (git commit) | Approved claim | Updated markdown file | Human already approved above | Git history |
| **Monitor** | Deterministic (scheduled) | — | Triggers next Observe cycle | — | — |

**No capability requires a dedicated multi-agent "org."** Propose/Challenge can both be a single scheduled script making one or two model calls each — same shape as the existing `tools/news-digest/digest.py` (fetch → Claude scoring → categorized output → human-readable delivery), which already proves this exact pattern works at SI8's current operational scale.

---

## 18. Source Monitoring Design

**Recommendation: reuse the existing `tools/news-digest/` pattern directly**, as a new sibling tool (e.g. `tools/lk-source-monitor/`) — not a new architecture.

Confirmed precedent: `tools/news-digest/digest.py` already does scheduled fetch (Google News RSS) → LLM scoring (Claude Haiku) → categorized output → email delivery (Resend) → log-file update, running on a **GitHub Actions scheduled workflow** (not Vercel Cron — confirmed via the tool's own README: "Add GitHub Secrets... The workflow runs automatically every Monday"), using secrets (`ANTHROPIC_API_KEY`, `RESEND_API_KEY`) that already exist in this repo's GitHub Actions configuration.

**Phase 1 scope: 2 sources**, matching "small allowlisted set":
1. USCO's AI initiative page (`copyright.gov/ai`) — the primary authority the strongest existing research (`us-copyright.md`) already cites.
2. The Federal Register listing for USCO AI reports (Part 3, on training data, was still "pre-publication" as of the existing research — worth watching for its final release).

**Design:**
```
Scheduled (weekly, GitHub Actions cron, same cadence as news-digest)
   → fetch each allowlisted URL
   → hash content, compare to last-known hash (stored in a small JSON log file, git-committed)
   → if changed: archive full snapshot (§11), diff against prior snapshot
   → if diff is "meaningful" (a length/similarity threshold, not every whitespace change) →
       one Claude call: "does this page's content still support claim CLAIM-COPY-NNN's Source Fact? Summarize what changed."
   → write a candidate review package: a new markdown file under a `06_Operations/institutional-knowledge/candidate-reviews/` directory, containing the diff, the model's summary, and links to potentially-affected claims (found via the Assess Impact grep step, §17)
   → email JD a notification (reuse the existing Resend pattern) — NOT a commit, NOT a Lifecycle change
```

Nothing in this pipeline writes to `GOVERNED-CLAIMS.md` directly. It produces a *file a human reads and, if they agree, manually incorporates* — same trust boundary the news-digest tool already has today (it emails a digest; it doesn't auto-post to LinkedIn).

---

## 19. Conflict / Impact Analysis

**Worked example: ElevenLabs changes its Free-tier commercial-use Terms.**

```
SOURCE CHANGE
   (monitor detects ElevenLabs ToS page hash changed)
        │
        ▼
VERIFY AUTHORITY/CHANGE
   (is this actually elevenlabs.io's real ToS page, and is the diff
    substantive — not just a footer copyright-year bump? Deterministic
    diff-size check + one AI summarization call, per §17/§18)
        │
        ▼
AFFECTED CLAIM
   (grep `elevenlabs-commercial-tiering` across the Matrix, the new
    claims file, and any `Related:` links — deterministic, §17's
    "Assess Impact" step)
        │
        ├──→ CRC PUBLICATION
        │     (elevenlabs-commercial-tiering is CRC-Eligible: Yes today —
        │      flagged in the review package as "this claim is LIVE in
        │      CRC output, a source change here has immediate user-facing
        │      exposure" — highest-priority flag in the package)
        │
        ├──→ REVIEWER KNOWLEDGE
        │     (Domain R reviewers manually consult the Matrix by hand —
        │      flagged so the next real assessment involving ElevenLabs
        │      knows to re-check rather than trust a stale row)
        │
        └──→ POTENTIALLY AFFECTED METHODOLOGY
              (does this change anything about EC-001/POS-001-style
               precedent? For a ToS-tier change specifically, almost
               certainly no — the impact-assessment step still checks,
               rather than assuming)
        │
        ▼
HUMAN REVIEW PACKAGE (§17/§18) — nothing auto-publishes, nothing
auto-disables `elevenlabs-commercial-tiering`'s current CRC-Eligible: Yes
status. It stays live and correct-as-last-known until a human acts.
```

This directly implements the PRD's explicit, PM-decided rule (§25 table: *"Immediately disable claims on any detected contradiction — Rejected; conflict response must first verify source authority/change"*). The monitor's job ends at "verified, here's the impact" — it never touches `Lifecycle` or `Publication scope`.

---

## 20. Agent Security / Prompt Injection

**Minimum controls, mapped directly onto the PRD's §20 list:**

1. **External content is evidence, never instruction** — enforced by construction: the "Propose" step's model call (§17) receives the fetched page content **only** inside a clearly-delimited data field of a structured-output request (same `messages.parse` + JSON-schema discipline already used everywhere in this codebase — Extraction, Candidate Question, Constraint A). The system prompt for this call must explicitly instruct the model that the fetched content is untrusted data to summarize/compare against, never an instruction to follow — directly mirroring how CRC's own Extraction system prompt already treats user turns as data to classify, never as commands (confirmed pattern: the extraction system prompt already says the model "never sees or affects the final state," "everything you produce is a PROPOSAL, reviewed and possibly rejected by deterministic code downstream").
2. **Structured output only, no free-form agentic tool use in the Propose/Challenge steps.** The model returns a candidate claim draft as a schema-validated JSON object — it cannot execute code, cannot make additional web requests, cannot invoke any function beyond returning its one structured response. This closes the most dangerous injection vector (a compromised source page instructing the model to "call this tool" or "fetch this other URL") by construction, not by prompting discipline alone.
3. **No source page can trigger publication.** Structurally true because nothing before "Human Govern" (§17) can write to `Lifecycle`/`Publication scope` at all — the monitor's entire output is a new file in a `candidate-reviews/` directory plus an email. There is no code path from "fetched page content" to "claim goes live," period — this is the same "browser cannot receive `projection` before email" style of structural guarantee already proven this session for the CRC Results Gate (verified live in production: `projection` absent from every response path, not just documented as a rule).
4. **Prefer primary/allowlisted sources.** Phase 1's monitor list is exactly 2 URLs (§18), hardcoded, not derived from search results or any dynamically-discovered link — no crawling.
5. **Separate retrieval from governance.** The fetch/archive step (§17 Observe/Retrieve) runs with no write access to `GOVERNED-CLAIMS.md` at all — it's a read-only-outward, write-only-to-`candidate-reviews/` process; a compromised or malicious source page has no code path to reach the governed file even in principle.
6. **Provenance required for every candidate.** Every archived snapshot (§11) records source URL, fetch timestamp, and content hash — a candidate claim with no snapshot behind it cannot be drafted (the Propose step's own input requires one).
7. **Source authenticity.** MATRIX-LEARNINGS.md already flags "domain-collision/lookalike-site risk" as a real, previously-observed problem during manual research (Kling/Pika had lookalike/reseller sites). Phase 1's allowlist is hardcoded exact URLs (not a domain pattern), which structurally prevents this — the monitor never resolves "the ElevenLabs site," it fetches one specific, pre-verified URL.
8. **Log everything** — source, retrieval time, diff, model/version, candidate output, human decision, final version — directly per PRD §20's own list; every one of these already has a natural home (the archived snapshot file, the candidate-review markdown file, and the eventual git commit message when a human acts).

---

## 21. Knowledge-Demand Analytics

**Reuses this session's own Milestone 2 analytics decision directly — no new event type, no migration, same "recompute on demand" philosophy already built and live.**

Confirmed existing pattern: `discovery_signal` analytics events already log only structured category labels (`selected_category`, `eligible_categories`, `outcome`) — never raw conversation text (confirmed via a real production query this session). `crc_sessions.structured_understanding.user_goals[].category`/`.scope` already persist for free in the existing schema-less JSONB (Milestone 2, live in production).

**Extension for LK demand analytics** — enhance the *existing* `lib/crc-engine/scripts/goal-analytics-report.ts` script (already built, uncommitted-nothing-new-needed architecture) to additionally report:

- **Goal category frequency** — already computed by this script today.
- **Governed coverage / no-coverage / unsettled rate** — recompute `buildBoundedInterpretations` against the *current* topic-claims fixture for every historical session's stored goals (same technique the existing script already uses against `MATRIX_FIXTURE` for interpretation-status recomputation), tabulating `status` distribution including the new `unsettled` character where applicable.
- **Missing applicability facts** — for each `outside_current_coverage` result where a topic-matched-but-inapplicable claim existed (a NEW diagnostic the topic lookup, §12, should emit — mirroring `RetrievalDiagnostic`'s existing `no_eligible_claims`/`unresolved_alias` pattern), tabulate *which* applicability requirement was unmet (e.g. "jurisdiction unconfirmed: 14 sessions"). This is the concrete signal that would justify the Interview Engine jurisdiction-capture question flagged as an open decision in §28.
- **Jurisdictions/tools creating gaps** — derivable from the same recomputation pass.

**Demand → backlog:** the script's console output (already exists) is itself a lightweight research backlog. No new UI/dashboard proposed for Phase 1 — reading a script's output on demand is sufficient at current CRC volume, matching PRD §15's "measure, don't build a system to measure the measuring."

---

## 22. Wave 1 Copyright Plan

**What we already know (from repo inspection, §3):** the core Wave 1 proposition — "AI-generated content without meaningful human authorship is not copyrightable under current U.S. law" — is independently corroborated across at least 5 documents, most rigorously in `06_Operations/legal/rights-playbook/research/us-copyright.md` (USCO Part 2 Report, Jan 29 2025; Zarya of the Dawn; Thaler line through SCOTUS cert denial). The related "prompts alone are not sufficient authorship" finding is even better corroborated, including SI8's own operational precedent (EC-001/POS-001, from a real assessment mistake and its Reviewer Manual v0.2 fix).

**Candidate material exists but needs primary-source re-verification before adoption** (per §3): the unsourced USCO quote in `AI-COPYRIGHT-RESEARCH-2026.md`, the suspicious "Allen v. Perlmutter" citation (verify it's a real case or drop it), the unsourced Sweden/PRV claim.

**What needs research from scratch:** work-for-hire/employee/contractor/assignment distinctions (zero existing research found anywhere in the repo — a real Wave 1 gap given PRD §23 explicitly lists it in scope), the specific human-edit threshold question (PQ-005, currently only sourced from an informal panel Q&amp;A), and AI-written-script-specific copyrightability (PQ-004, same caveat).

**Likely first claim topics** (ordered by existing evidentiary strength):
1. `CLAIM-COPY-001` — AI-generated video without human authorship is not copyrightable (US) — strongest evidence, ready with light re-verification.
2. `CLAIM-COPY-002` — prompts alone, even iterative/detailed, do not establish sufficient human authorship — strongest evidence, corroborated 4+ independent ways.
3. `CLAIM-COPY-003` — human selection/arrangement/editing of AI output can be independently copyrightable (fractional authorship) — grounded in Zarya + USCO registration guidance, needs the actual Federal Register text re-checked directly rather than relying on the secondary summary.
4. `CLAIM-COPY-004` — USCO registration requires disclosing AI content and describing human contribution — primary source is linked and directly checkable (Federal Register notice 2023-05321).
5. (Deferred, genuinely needs new research) — work-for-hire/employee/contractor distinctions for AI-assisted commercial work.

**Authoritative sources to prioritize** (feeds §18's monitor list directly): `copyright.gov/ai` (USCO AI initiative hub), the specific Federal Register notice URLs for Part 2 (and Part 3 once published), and the Thaler v. Perlmutter docket (for confirming the cert-denial date/status stays accurate).

**What should remain outside CRC initially:** anything jurisdiction-scoped outside the U.S. (EU/Taiwan/Singapore material is real but too thin to adopt yet — genuinely needs primary-source research SI8 hasn't done); the work-for-hire topic (no research exists yet); PQ-004/PQ-005's specific open questions (stay as Pending Questions until actually researched, not fast-tracked into claims because CRC happens to want an answer).

---

## 23. Phase 1 Vertical-Slice Acceptance Test

One concrete, sequential test script (design only):

1. **Existing Platform Rights claim works** — run the existing `retrieve()` test suite unmodified; all current tests pass with zero changes required to `matrix-fixture.ts` or the Matrix markdown.
2. **New U.S. copyright claim works** — a session states `category: copyright_ownership`, confirms `jurisdiction: United States` (once captured — see §28), no tool-specific facts needed; `CLAIM-COPY-001` surfaces as `directly_relevant`.
3. **Jurisdiction gating works** — same session, but jurisdiction is *not* confirmed (today's actual default): `CLAIM-COPY-001` does NOT surface; goal resolves `outside_current_coverage`.
4. **Applicability gating works** — a claim with an unmet non-jurisdiction predicate (e.g. a future `client_supplied_asset` requirement) behaves identically — unmet requirement, no fabricated answer.
5. **Reviewer-only claim cannot leak into CRC** — a test claim set to `Publication scope: Reviewer/internal` never appears in any `RetrievalResult`, verified the same way `elevenlabs-voice-consent`'s exclusion is already tested today.
6. **No-coverage goal does not hallucinate** — a `copyrightability` goal with zero matching claims produces the exact neutral fallback template already live in production (§13's no-coverage example) — no new doctrine text anywhere.
7. **Unsettled knowledge remains bounded** — a test claim with `Claim character: unsettled` renders its `CRC Candidate Statement` verbatim (which itself must say "this is contested," per §6) — never silently upgraded to a confident-sounding answer.
8. **Source provenance is traceable** — every adopted Wave 1 claim's `Source references` resolves to either a real external URL or an archived snapshot file (§11); a manual audit confirms none are dangling.
9. **Claim version can be superseded** — manually edit `CLAIM-COPY-001`'s `Lifecycle` to `Deprecated` and create a `-v2` entry; confirm the fixture mirror correctly excludes v1 from active retrieval.
10. **Historical version remains reconstructable** — confirm v1's full body text is still present, unedited, in the file after the v2 supersession (not deleted, not overwritten).
11. **Authoritative source change generates a candidate review** — manually trigger the §18 monitor against a deliberately-modified test copy of the USCO page; confirm a `candidate-reviews/` file is produced and an email fires, and confirm `GOVERNED-CLAIMS.md` itself is untouched.
12. **Nothing auto-publishes** — direct inspection: no code path from the monitor pipeline to `Lifecycle`/`Publication scope` mutation exists (this is a structural/code-review check, not a runtime test).
13. **Downstream impact can be identified** — the §17 "Assess Impact" grep step correctly lists `CLAIM-COPY-001` (and any `Related:` Position/Edge Case) when given `elevenlabs-commercial-tiering`'s claim ID as a test input... *(more precisely: run the Assess Impact step against a real claim ID with known `Related:` links and confirm the output list matches)*.
14. **Existing CRC behavior does not regress** — full existing `__tests__/` suite (804 passing as of this session's Milestone 2 work) still passes unmodified; `tsc --noEmit` and `next build` remain clean.

---

## 24. Migrations / Deployment Dependencies

| Dependency | Required? | Detail |
|---|---|---|
| DB migration | **Yes — one, small, additive, nullable** | `ALTER TABLE assessments ADD COLUMN knowledge_snapshot_ref TEXT;` (§10/§14). Zero risk to existing rows (nullable, no default needed beyond NULL, no backfill required — mirrors every other additive migration already in this repo's own history, e.g. `20260323000000_add_tier_and_submission_mode.sql`). |
| Generated index | No, for Phase 1 (hand-synced fixture, §15) | Revisit once claim count grows past what hand-sync can reliably support — flagged, not built now. |
| New build step | No | The claims markdown is not parsed at build time in Phase 1; the TS fixture is a hand-written mirror, same as `matrix-fixture.ts` today. |
| Env vars | No new secrets | `ANTHROPIC_API_KEY`/`RESEND_API_KEY` already exist and are already used by `tools/news-digest/`; the new monitor tool reuses them. |
| Cron/scheduled job | **Yes — one new GitHub Actions workflow** | Mirrors `tools/news-digest/`'s existing workflow exactly; no new scheduling infrastructure (Vercel Cron is not used for this — GitHub Actions is the proven precedent). |
| External service | No new vendor | Reuses Anthropic (already used everywhere) and Resend (already used for CRC results emails and the news digest). |

**Deployment ordering** (design only, not to be executed without separate approval):
1. Add the `GOVERNED-CLAIMS.md` file (empty/skeleton) — zero runtime effect, pure documentation, safe to merge any time.
2. Add the retrieval-engine type/function extensions (§12) — additive, `topicClaims` defaults to `[]` if omitted, zero behavior change until real claims exist. Ship and let the existing test suite prove no regression *before* any real claim is added.
3. Apply the `assessments.knowledge_snapshot_ref` migration — independent of everything else, zero coupling.
4. Author + adopt Wave 1's first 1-2 claims through the human governance workflow (§16) — no code deploy required for this step at all, it's a markdown edit + fixture mirror update.
5. Stand up the GitHub Actions source-monitor workflow — fully independent of steps 1-4, can ship in parallel.

**Failure risks:** the fixture-mirror-drift risk (§15) is the single most likely real-world failure mode — a claim edited in markdown but not mirrored into the TS fixture silently does nothing (safe-fails as "claim doesn't exist" rather than serving stale/wrong content, but is a real operational gotcha worth a checklist item, not a code guard, for Phase 1).

---

## 25. What NOT to Build Yet

- **Graph database** — no demonstrated need; explicit `Related:`/`supersedes` references are sufficient at current and near-term scale.
- **A live markdown parser / build-time claim index** — defer until manual fixture-sync becomes a real, observed bottleneck (it hasn't yet, even at the Matrix's current 11-claim scale).
- **A reviewer-facing live knowledge-lookup UI** — zero existing reviewer workflow touches the Matrix in code today; build this only once a real assessment demonstrates the manual-lookup process is actually the bottleneck.
- **Per-claim `assessment_claim_references` join table** — the single whole-snapshot reference (§10/§14) is sufficient until reviewers actually start citing specific claim IDs in real assessments.
- **Jurisdiction as a full hierarchy/overlay model** (country → state → sector) — Wave 1 needs exactly one value (`United States (federal)`); build the richer model only when Wave 5 (jurisdictional overlays) actually needs it, per the PRD's own explicit wave sequencing.
- **Automated Interview Engine jurisdiction-capture question** — real product-scope decision (§28), deliberately not decided here.
- **Any autonomous Adopt/CRC-eligible decision-making** — explicitly forbidden by the PRD; not proposed anywhere in this design.
- **A formal source-authority-type enum with DB-level enforcement** — kept as a documented convention (matching the Matrix's own `Status` field precedent), not hard-enforced, until real drift is observed.
- **Multi-domain expansion (Wave 2-5)** — likeness/voice/trademark/provenance/jurisdictional-overlay claim sets. Wave 1 alone is Phase 1's full corpus scope.

---

## 26. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Fixture/markdown drift (a claim edited in one place, not the other) | **Medium** — already an observed pattern with the Matrix at smaller scale | Medium — worst case is a claim silently not retrievable, not a wrong answer (fails safe, per §24) | A pre-commit or CI check comparing claim counts/`claim_id`s between the markdown and the fixture (cheap, deterministic, no new infra — worth adding even in Phase 1) |
| Doctrine smuggled into M2/rules.ts templates instead of claim content | **Medium-high** — this exact failure mode was found and fixed live, in this codebase, earlier this session (the "unsettled, fact-specific legal question" hardcode) | High — directly violates the PRD's core principle | The same grep-based audit technique used to catch it this session should become a standing check before any M2 template change; §5's `Prohibited conclusions` field exists specifically to give claim authors, not M2 code, ownership of boundary language |
| Wave 1 claims rarely fire because jurisdiction is unconfirmed | **High** (near-certain, given today's `StructuredUnderstanding` has no jurisdiction field) | Low-medium — safe behavior (no-coverage), but undercuts the practical value of shipping Wave 1 at all until resolved | Explicit PM decision required (§28) — either accept low fire-rate as an acceptable Phase 1 proof-of-architecture outcome, or scope in a small Interview Engine jurisdiction question |
| Research corpus quality is uneven (some claims trace to unverified/possibly-garbled citations) | **Confirmed, already found** ("Allen v. Perlmutter") | High if adopted without re-verification — a governed claim citing a fabricated case would be a serious credibility failure | Mandatory primary-source re-verification pass before any Wave 1 claim reaches `Under Review`, not just before `Adopted` |
| Source-monitor false positives (flagging cosmetic page changes as meaningful) | Medium | Low — worst case is wasted human review time, not a wrong publication | Diff-size threshold + AI summarization step before a review package is generated (§18) |
| Publication Policy's judgment (narrow/withhold decisions) doesn't scale past JD as sole approver | Low for Phase 1 (claim count stays small by design), rising with Wave 2+ | Medium, later | Explicitly out of Phase 1 scope; flag for a later wave once claim volume actually requires more than one approver |
| Two parallel "claim-like" schemas (Matrix's CRC Claims sub-table vs. the new claims file) drift apart conceptually over time | Medium | Medium — confusion for future maintainers about which pattern to use for what | This design explicitly documents the split rationale (§4) so it's an intentional, recorded decision rather than accidental drift; revisit if/when Matrix migration is ever proposed |

---

## 27. Implementation Phases

Smallest independently-testable/bisectable sequence (not implemented — proposed only):

1. **Skeleton** — create `GOVERNED-CLAIMS.md` (empty/template only) + the retrieval-engine type/function extensions (§12), shipped with `topicClaims` defaulting to `[]`. Fully testable: existing suite must stay green, zero behavior change.
2. **Migration** — apply the one `assessments.knowledge_snapshot_ref` column. Independently testable: existing assessment flows unaffected (column unused until step 5).
3. **First claim, hand-governed** — author, human-review, and adopt `CLAIM-COPY-001` + `CLAIM-COPY-002` through the manual workflow (§16), mirror into the fixture. Testable via §23 items 2-3, 6-10.
4. **CRC wiring live** — connect the topic lookup into `run-crc-conversation.ts`; verify M2 output for both the applicable and no-coverage cases (§23 items 2-3, 6) against real (or scripted) conversations.
5. **Assessment binding proof** — manually populate `knowledge_snapshot_ref` on one test assessment; verify it's queryable and immutable (§23, not explicitly numbered but implied by §10/§14).
6. **Source monitor** — stand up the GitHub Actions workflow (§18) against the 2 allowlisted sources; verify a review package is generated without touching the claims file (§23 item 11).
7. **Analytics extension** — extend `goal-analytics-report.ts` (§21); no schema change, script-only.
8. **Acceptance test pass** — run the full §23 checklist end-to-end.

Each phase is independently revertable (git revert a single markdown addition, a single migration, or a single code change) without unwinding the others.

---

## 28. Open PM Decisions

**1. Should Phase 1 add jurisdiction capture to Interview Engine, or accept a low Wave-1 fire rate?**
- Options: (a) scope in a small, new Interview Engine question/fact for jurisdiction (a real M1-adjacent change, outside LK's own architectural boundary but necessary for Wave 1 to actually answer anyone); (b) ship Wave 1 claims jurisdiction-gated as designed, accept that most conversations won't get a firm answer until this is addressed later, treating the resulting `outside_current_coverage`/unmet-applicability rate itself as the demand signal (§21) that eventually justifies (a).
- **Recommendation: (b) for Phase 1.** The PRD's own Phase 1 intent (§7) explicitly says "we care whether the architecture works correctly end-to-end," not fire-rate. A low fire-rate with 100% correct, honest no-coverage behavior is a successful proof; a rushed jurisdiction-capture question, added under this PRD's own scope without its own design/interview-flow consideration, risks a worse mistake.
- **Consequence of choosing (a) instead:** meaningfully expands this PRD's blast radius into Interview Engine (a system this PRD's own §21 hard rule says LK "must never" put doctrine into, and which has its own careful phase/gate architecture this design has not touched or reviewed).

**2. Extend `SI8-POSITIONS.md` vs. create a new `GOVERNED-CLAIMS.md` file?**
- Already recommended in §4 (new file) — flagging explicitly per instruction #28 because it's a real architectural fork, not because I'm unsure of my own recommendation.
- **Recommendation: new file**, per §4's full reasoning.
- **Consequence of choosing Positions instead:** Positions' current small, curated character changes; every future Position-adding decision would need to also ask "is this a claim or a position," a distinction that stops being obvious once they share one file.

**3. Where does the "one claim, one file vs. one-file-per-domain" line get drawn?**
- Options: single `GOVERNED-CLAIMS.md` (matches the existing 3-of-4 Notebook documents' pattern); or split by domain from day one (`GOVERNED-CLAIMS-COPYRIGHT.md`, etc., matching how the Matrix keeps growing as one file regardless).
- **Recommendation: single file for Wave 1** (PRD explicitly says don't optimize for claim count); revisit only if the file becomes genuinely unwieldy.
- **Consequence of choosing per-domain now:** more files to keep track of for a genuinely small Wave 1 corpus, for no near-term benefit.

**4. Should `Claim character: unsettled` claims default to `CRC eligible` or `Reviewer/internal only`?**
- The PRD doesn't settle this explicitly. An unsettled-but-honestly-labeled claim could be genuinely useful CRC output ("SI8's knowledge here is contested" is more informative than silence) — or it could read as SI8 hedging in a way Publication Policy Principle 6 ("stability over novelty") would caution against.
- **Recommendation:** default `unsettled` claims to `Reviewer/internal only`; require the SAME explicit per-claim human sign-off the Matrix already requires for `Yes`, with no special-casing. Don't invent a different bar for unsettled claims than for established ones.
- **Consequence of the alternative:** a broader, less-reviewed set of "maybe" answers reaching CRC users, which is a real product-tone decision, not a technical one.

**5. What counts as a "meaningful" source change for the monitor (§18) to escalate?**
- Purely a tuning parameter (diff-size threshold), but the PRD's own Principle 6 ("stability over novelty," and the explicit rejection of auto-disabling on any detected contradiction) implies a real product stance about how twitchy this should be.
- **Recommendation:** start conservative (large threshold, weekly cadence, human can always manually re-check) — matches PRD §17's "monitor... detect meaningful... changes," not "detect any change."
- **Consequence of a twitchy threshold:** review-package fatigue, which risks the human governance step becoming a rubber stamp — the exact failure mode the PRD's guardrails are trying to prevent.

---

## 29. Final Recommendation

**Phase 1 should proceed**, with the architecture recommended above: a new git-native `GOVERNED-CLAIMS.md` file (same pattern as the four existing Notebook documents), a parallel topic-keyed Retrieval path added alongside (never replacing) the existing tool-keyed one, zero changes to M2's own contract, one small additive DB migration for assessment-side historical reproducibility, and a source-monitoring pipeline that reuses this repo's own already-proven `news-digest` pattern rather than inventing new infrastructure.

**The smallest viable implementation** is the 8-phase sequence in §27 — each phase independently shippable and revertable, none requiring the others to be complete first except in the stated order.

**What should remain deferred:** everything in §25 — a live markdown parser, a reviewer-facing lookup UI, per-claim assessment references, a full jurisdiction hierarchy, any richer automation than the narrow Observe→Monitor pipeline in §17-18, and expansion beyond Wave 1's copyright scope.

**What needs approval before any code is written:**
1. Confirmation of the §4 architecture choice (new `GOVERNED-CLAIMS.md` file vs. any alternative).
2. Resolution of the 5 open decisions in §28 — most importantly #1 (jurisdiction capture), since it materially affects whether Wave 1 is a quiet architectural proof or a user-visible feature.
3. Sign-off on the one migration in §24.
4. A named human owner for the Publication Policy's "narrow/withhold" judgment calls on the first real Wave 1 claims (today, that's implicitly JD, matching every existing `CRC Approver` value in the Matrix — worth stating explicitly rather than assuming).

This design deliberately does not resolve those four items — per the task's own instruction, they're PM's to decide, not mine to silently choose.
