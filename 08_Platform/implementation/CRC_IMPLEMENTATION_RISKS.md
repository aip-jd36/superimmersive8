# CRC — Known Implementation Risks (Pre-Prototype)

**Status:** Active — not PRD material, deliberately kept separate
**Date:** 2026-08-05
**Governs:** implementation and evaluation planning for `08_Platform/prds/PRD_CRC_v1.0.md`
**Why this is a separate file:** the design questions in the PRD are considered resolved as of the freeze. What remains are empirical questions a document can't answer — they require a prototype. This file exists so that distinction stays visible: PRD = design decisions, this file = what to go verify.

---

## Risk 1 — LLM behavioral adherence is unproven

The PRD specifies precise behavioral rules (one follow-up per signal, one disambiguation then stop, never introduce "legal"/"procurement" unprompted, presence-not-absence retrieval triggering). None of this has been tested against a real model across real, messy conversations — only against six hand-written examples. This is an evaluation problem, not a design problem.

**Before building at scale:** run the six PRD dialogues (Section 8) against the actual Interview Engine implementation and confirm behavior matches. Then run a larger, deliberately messy test set (terse answers, contradictions, off-topic replies, attempts to rush through) and check for rule violations — especially unprompted use of "legal"/"procurement"/"risk," and multiple follow-ups on a single signal.

## Risk 2 — Mid-conversation correction

Addressed as a data-model requirement in PRD Section 10 (scoped observations must be mutable) — not a design gap, but flagged here as a build requirement that's easy to accidentally implement as append-only. Verify the actual storage layer supports in-place revision before considering this done.

## Risk 3 — Thin retrieval at launch (the biggest launch risk)

Not an architecture problem — a content-coverage problem. The Living Notebook currently has a small number of entries (a handful of SI8 Positions, one Edge Case). CRC's value proposition depends on retrieved knowledge being genuinely specific to what a user describes. If most real conversations retrieve thin or generic content, the product will underperform the polished PRD examples specifically at the moment — first real users — where that matters most for a lead-gen tool.

**Before launch:** audit Platform Intelligence / Living Notebook coverage for the handful of tools most likely to dominate real conversations (Kling, Runway, Nano Banana, and whatever else is currently common). This is a content-population task, fixable without touching the PRD.

---

## Risk 4 — `unresolved_project_dependencies` resolution has no runtime effect (confirmed real, 2026-08-21)

Confirmed by direct code trace during the Stock-Media Dependency Askability Review (`governance-reviews/DAR_001_STOCK_DEPENDENCY_ASKABILITY_2026-08-21.md`), not hypothetical. `unresolved_project_dependencies` is read in exactly one place in Bounded Interpretation — the Case 3B hedge trigger (`matches.some((m) => m.unresolved_project_dependencies.length > 0)`) — which checks only whether the array is non-empty, never whether a specific dependency has actually been resolved or what value it resolved to. The array is static claim metadata; nothing in the codebase mutates it based on conversation state. `applicability_requirements` (the one mechanism that genuinely gates retrieval) is empty for every stock claim today, so resolution has zero effect there either.

**Practical consequence:** if a future `askable_in_crc` registration ever resolved a dependency to a definite value (e.g., a confirmed "not Editorial"), the governed claim would still render with its full hedge language, identically to an unresolved or "unknown" answer. The only existing precedent for a resolved dependency having any visible effect at all is `shouldIncludeHumanContributionSentence` in `build-bounded-interpretation.ts` — and that is purely additive (inserts one clarifying sentence), never suppressive of the claim or its hedge.

**Before registering any future dependency as `askable_in_crc` where the resolved value should change claim framing:** build an H5-style additive-sentence composition mechanism for that dependency first (mirroring `shouldIncludeHumanContributionSentence`). Registering a question whose answer currently has no visible effect would be misleading — the user would reasonably expect their answer to matter. Not a blocker for DAR_001's own `evidence_only`/`auto_satisfied` decisions, which introduce no new askable dependency and are therefore unaffected by this gap; recorded here purely as a standing follow-up for any *future* stock or other-domain dependency review.

## Empirical questions only a prototype can answer

1. Does the Interview Engine actually behave the way Section 8 specifies, at volume?
2. Does retrieval feel useful to a real user, or generic?
3. Is Platform Intelligence deep enough to support Gate 1-qualified conversations across common tools?
4. Do users naturally complete conversations (reach Gate 1 + Gate 2), or drop off mid-interview?
5. Do qualified leads actually emerge from completed conversations?

Recommend treating these five as the prototype's actual test plan, not a general "see how it goes" launch.
