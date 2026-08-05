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

## Empirical questions only a prototype can answer

1. Does the Interview Engine actually behave the way Section 8 specifies, at volume?
2. Does retrieval feel useful to a real user, or generic?
3. Is Platform Intelligence deep enough to support Gate 1-qualified conversations across common tools?
4. Do users naturally complete conversations (reach Gate 1 + Gate 2), or drop off mid-interview?
5. Do qualified leads actually emerge from completed conversations?

Recommend treating these five as the prototype's actual test plan, not a general "see how it goes" launch.
