Title: Dependency Askability Review #1 — Stock-Media Unresolved Dependencies (combined)

Reviewed domain: stock-media `unresolved_project_dependencies` (Third-Party Source Assets)

Reviewed objects (dependency strings, evaluated jointly because they share one underlying evidentiary question):
- `editorial_designation_confirmed` (present on all five stock claims)
- `separate_authorization_obtained` (CLAIM-STOCK-EDITORIAL-001-v1, CLAIM-STOCK-GETTY-EDITORIAL-001-v1)
- `release_status_confirmed` (CLAIM-STOCK-EDITORIAL-002-v1)
- `rights_and_clearance_status` (CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1)
- `asset_confirmed_getty` / `asset_confirmed_istock` / `asset_confirmed_shutterstock` (their respective provider-specific claims)
- `which_provider` (CLAIM-STOCK-EDITORIAL-001-v1, CLAIM-STOCK-EDITORIAL-002-v1)

Claims carrying these dependencies (all already `Lifecycle: Adopted`, `CRC Eligible: Yes` — unchanged by this review):
- CLAIM-STOCK-EDITORIAL-001-v1
- CLAIM-STOCK-EDITORIAL-002-v1
- CLAIM-STOCK-GETTY-EDITORIAL-001-v1
- CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1
- CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1

Review date: 2026-08-21

Artifact type: **Dependency Askability Review (DAR)** — a third, distinct decision stage, introduced by this artifact, deliberately separate from a Formal Governance Review (FGR: should a candidate be Adopted at all) and a CRC Publication Review (CPR: should an already-Adopted claim become `CRC Eligible: Yes`). A DAR asks a narrower, later question about a claim that is **already** Adopted and **already** CRC-eligible: for one specific string in that claim's `unresolved_project_dependencies` list, may CRC proactively ask the user a deterministic question to try to resolve it (`askable_in_crc`, registered in `lib/crc-engine/dependency-askability.ts`), or must that fact remain `evidence_only` (never proactively asked; only obtainable through documentary evidence reviewed by Commercial Assurance)? This question did not exist as a governance category until Track A (discovered relevance) and Track B (generic knowledge-readiness acquisition) made a real `askable_in_crc` registry mechanism possible (`e2313e6`, `34dd2aa`) — before that, `unresolved_project_dependencies` was purely descriptive metadata with no corresponding action a registry decision could authorize.

Review recommendation: **D — EVIDENCE-ONLY**, for `editorial_designation_confirmed`, `separate_authorization_obtained`, `release_status_confirmed`, and `rights_and_clearance_status`. **Auto-satisfied / no dedicated question**, for `asset_confirmed_getty`/`asset_confirmed_istock`/`asset_confirmed_shutterstock` and `which_provider`.

PM decision: **APPROVED** — all four evidence-only classifications and both auto-satisfied classifications adopted exactly as reviewed. No `AskabilityEntry` registered for any of these dependencies. No CRC candidate question approved for any of these dependencies.

Askability decision state: **RECORDED (documentation-only)** — `dependency-askability.ts` unmodified; absence from the registry continues to mean non-askable, which is already the correct representation of an `evidence_only` decision under that module's own existing design (see Governance vs. engineering note below).

PM decision date: 2026-08-21

Historical sequence (recorded here, outside the verbatim body, so it is never mistaken for what the review itself concluded): (1) Track A (`e2313e6`) and Track B (`34dd2aa`) shipped, closing the architecture gap that made a real `askable_in_crc` registration possible for the first time; (2) with no real stock dependency yet registered askable, the production iStock UAT (2026-08-20 session) had no governed question to ask when it reached the stock claim's `editorial_designation_confirmed` dependency, surfacing the open governance question this review resolves; (3) PM/JD chartered a bounded, read-only Stock-Media Askability Governance Review (2026-08-21 same-day) to determine whether `editorial_designation_confirmed` (and, by the same reasoning, the other stock dependencies) should be registered askable; (4) that review traced the exact code path from `unresolved_project_dependencies` through Bounded Interpretation's Case 3B hedge and confirmed that resolving any stock dependency today has **zero** effect on Retrieval (`applicability_requirements: []` for every stock claim) and **zero** effect on the Case 3B hedge (a static array-length check, not a resolution-state check) — a genuine dependency-resolution-semantics gap, tracked as a separate architecture follow-up, not fixed by this review; (5) that review additionally found and cited primary-source evidence already present in this project's own research (`01_Business/research/STOCK-MEDIA-EDITORIAL-USE-CANDIDATE-RESEARCH-2026.md` §14, §27) explicitly concluding that whether a specific asset is actually Editorial-designated is a project-specific determination reserved for Commercial Assurance's document-based review, not CRC, and explicitly requiring the provider's own record rather than the user's self-report as the minimum sufficient reviewer evidence; (6) that same reasoning was found to extend to `separate_authorization_obtained`, `release_status_confirmed`, and `rights_and_clearance_status` — each requires a documentary/provider-side confirmation an ordinary user is unlikely to reliably self-report; (7) the `asset_confirmed_*` dependencies were found to be structurally vacuous for provider-scoped claims (a provider-scoped claim can only ever become a retrieval candidate when that exact provider is already canonically confirmed, so the dependency is true by construction the moment the claim is reachable at all) and `which_provider` was found to already resolve organically through the pre-existing, general-purpose `AssetProviderMention` extraction channel with no dedicated question needed; (8) PM/JD reviewed and approved the review's recommendation (D for the four evidence-tier dependencies, auto-satisfied for the remainder); (9) this artifact records that decision.

Historical status: VERBATIM ARCHIVE — DO NOT EDIT HISTORICAL BODY. Future amendments should be appended outside the body below, or captured in a new review artifact — never inserted into the verbatim body.

Source used to reconstruct this artifact: the assistant's own Stock-Media Askability Governance Review Final Report, present verbatim in this session's own conversation transcript, immediately preceding this recording task — not recreated from memory, not from any condensed summary already in `GOVERNED-CLAIMS.md`.

--- BEGIN VERBATIM DEPENDENCY ASKABILITY REVIEW ---

# Stock-Media Dependency Askability Review — Final Report

**Review type:** Bounded, read-only. Zero production/test files changed. Repository ends byte-identical to start except this governance-recording pass.

## Key Finding

The project's own `STOCK-MEDIA-EDITORIAL-USE-CANDIDATE-RESEARCH-2026.md` (§14, §27) already, explicitly addressed this exact question before Track A/B existed: whether a specific asset is actually Editorial-designated is labeled "Project-specific determination (not for CRC, Commercial Assurance only)", with the required reviewer evidence explicitly specified as "the asset's actual classification... as shown on the provider's own record, **not the user's self-report**." This is a direct, on-point, primary-source recommendation against relying on user self-report for this fact — made independently of this review, by the same research that produced the governed claim text.

## Current stock claims (fresh-read from `topic-claims-fixture.ts`)

| Claim ID | Topic | Lifecycle | CRC Eligible | provider_scope | applicability_requirements | unresolved_project_dependencies |
|---|---|---|---|---|---|---|
| CLAIM-STOCK-EDITORIAL-001-v1 | third_party_source_rights | Adopted | Yes | null (generic) | `[]` | `['which_provider', 'editorial_designation_confirmed', 'separate_authorization_obtained']` |
| CLAIM-STOCK-EDITORIAL-002-v1 | third_party_source_rights | Adopted | Yes | null (generic) | `[]` | `['which_provider', 'editorial_designation_confirmed', 'release_status_confirmed']` |
| CLAIM-STOCK-GETTY-EDITORIAL-001-v1 | third_party_source_rights | Adopted | Yes | `['getty']` | `[]` | `['asset_confirmed_getty', 'editorial_designation_confirmed', 'separate_authorization_obtained']` |
| CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1 | third_party_source_rights | Adopted | Yes | `['shutterstock']` | `[]` | `['asset_confirmed_shutterstock', 'editorial_designation_confirmed', 'rights_and_clearance_status']` |
| CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1 | third_party_source_rights | Adopted | Yes | `['istock']` | `[]` | `['asset_confirmed_istock', 'editorial_designation_confirmed']` |

Every `crc_publication_scope` carries the identical prohibited-conclusion clause: CRC must not state whether the user's own specific asset is Editorial-designated.

## Dependency-by-dependency classification

**`editorial_designation_confirmed`** — per-asset, provider-applied fact. Not a provider-account/plan-tier fact ("standard license" does not answer it — confirmed directly from claim text, which is entirely about content marked "editorial use only," orthogonal to subscription tier). Asset-granularity pressure test: a provider-level plain boolean is dishonest for a genuinely mixed multi-asset case; a full per-asset inventory would require an architecture change this review is not authorized to make and would contradict `AssetProviderMention`'s own documented, deliberate non-goal of asset-level tracking. The smallest truthful structure, if this were ever approved, would be a provider-level categorical state (`none_editorial`/`some_editorial`/`all_editorial`/`mixed`/`unknown`) — not built, not needed, given the recommendation below.

**Classification: D — EVIDENCE-ONLY.** Not because the general claim text is unsafe (it is already carefully hedged and CRC-eligible), and not merely because the data model or composition mechanism is missing — but because the project's own prior research already, explicitly, independently concluded that self-reported Editorial designation is unreliable and belongs to Commercial Assurance's document-based review, not CRC's proactive question path.

**`separate_authorization_obtained`** (EDITORIAL-001, GETTY) — §27 of the research doc explicitly lists "whether separate written authorization/clearance was obtained (invoice, license confirmation, or a Rights & Clearance/Asset Assurance-style approval record)" as required reviewer evidence — documentary, not self-report. **Classification: D — EVIDENCE-ONLY.**

**`release_status_confirmed`** (EDITORIAL-002) — a user sourcing stock images has no ordinary visibility into whether model/property releases exist for a given asset; that is provider/contributor-side documentation. Asking risks eliciting a confident but unverifiable guess. **Classification: D — EVIDENCE-ONLY.**

**`rights_and_clearance_status`** (SHUTTERSTOCK) — the governed claim text is explicit that CRC "must not state whether... Rights and Clearance was engaged for it." Determining whether it was actually engaged, and with what outcome, requires a real confirmation record, not user recollection. **Classification: D — EVIDENCE-ONLY.**

**`asset_confirmed_getty` / `asset_confirmed_istock` / `asset_confirmed_shutterstock`** — structurally vacuous by construction, not merely "already satisfiable." A provider-scoped claim only ever becomes a Retrieval candidate when `providerScopeMatches` finds an active canonical mention for that exact provider — meaning this dependency is already true the instant the claim is a candidate at all. **Classification: A — AUTO-SATISFIED.** No registry entry, no question needed.

**`which_provider`** (EDITORIAL-001, EDITORIAL-002) — already resolved organically whenever a canonical `AssetProviderMention` exists, via ordinary extraction, unprompted by any dedicated question. A dedicated "which provider" question would duplicate a capability that already exists as a side effect of normal conversation. When genuinely unresolved (an alias), it should simply remain unresolved, consistent with the existing "never force-resolve a provider alias" discipline. **Classification: registry-unaskable / resolved via existing extraction.** No registry entry.

## The second architecture issue (confirmed, not fixed here)

Traced directly in code: `unresolved_project_dependencies` is read in exactly one place in Bounded Interpretation — `matches.some((m) => m.unresolved_project_dependencies.length > 0)` (Case 3B hedge trigger). This checks only whether the array is non-empty, never whether a specific dependency has been resolved or what value it resolved to. The array itself is a static property of the governed claim, never mutated by conversation state (matching the existing COPY-004 precedent that a resolved-in-conversation dependency string is deliberately never removed from this list, since resolving the conversational information gap does not resolve the underlying legal dependency).

**Direct answer: today, learning that a set of iStock images was NOT Editorial has zero effect on Retrieval and zero effect on the Case 3B hedge.** The claim would render with its full Editorial-restriction language exactly as if the user had said "yes" or "I don't know." The only existing precedent for a resolved dependency having any visible effect is `shouldIncludeHumanContributionSentence` — purely additive (inserts one clarifying sentence), never suppressive.

**Classification: B — dependency-resolution semantics gap**, not an applicability_requirements gap (that mechanism already works correctly for what it is designed for). The gap is that no H5-style additive-sentence mechanism exists yet for any stock dependency, only for `human_contribution_description`. **This finding stands independent of the evidence-only recommendation above** — it would matter for any future genuinely CRC-askable stock or other-domain dependency. Recorded as a follow-up, not implemented by this review.

## Governance vs. engineering

**Governance/PM (this review):** is each fact askable at all; what treatment it should carry.
**Engineering (not this review, and not yet chartered):** if any stock dependency is ever approved askable in the future, a structured target field and, separately, an H5-style additive-sentence composition mechanism would both need to be built before registration would be safe — today's gap means a "yes" or "no" answer to any stock dependency currently renders identically.

## Approval classification (final)

**D — EVIDENCE-ONLY**, for `editorial_designation_confirmed`, `separate_authorization_obtained`, `release_status_confirmed`, `rights_and_clearance_status`.
**A — AUTO-SATISFIED / no dedicated question**, for `asset_confirmed_getty`/`asset_confirmed_istock`/`asset_confirmed_shutterstock` and `which_provider`.

No CRC candidate question is approved for any of these seven dependency strings. No `AskabilityEntry` is added. `dependency-askability.ts` remains unmodified — absence from that registry is the correct, already-existing representation of an evidence-only decision. Claim propositions, Lifecycle, Publication scope, CRC Eligibility, and applicability_requirements for all five stock claims are unchanged by this review.

## Desired future iStock UAT flow

Discovery (explicit `commercial_use` goal + canonical iStock provider mention → Track A discovers `third_party_source_rights` relevance → stock claims retrieve → general Editorial-policy knowledge surfaces in `knowledge_items`) is fully possible today and requires no further work. The step this review declines to enable — CRC proactively asking the user to self-report whether their specific iStock images were Editorial-designated — is intentionally not built, by governance decision, not by missing engineering. Rerunning the original iStock UAT should show: the explicit `commercial_use` goal preserved, iStock captured, `third_party_source_rights` discovered, stock knowledge surfacing in `knowledge_items`, no unsafe Editorial-designation self-report question asked, and no fabricated `third_party_source_rights` UserGoal.

## Consultative composition

Independent of this decision — confirmed. No `applicability_requirements` coupling is introduced or required by an evidence-only classification.

--- END VERBATIM DEPENDENCY ASKABILITY REVIEW ---
