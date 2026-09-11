# ADR-003: A visible HRR research thread is UI; the reasoning pipeline gets a bounded enum-only referent, never the transcript

**Status:** ACCEPTED — CAH-4G.9 (design, 2026-09-10). **Slice A: CLOSED / PRODUCTION-PROVEN (CAH-4G.10 → CAH-4G.10P deployment-gap found → CAH-4G.10I integrated to `main` = `4b9ee5a` → CAH-4G.10C authenticated production UAT PASSED all 10 checks, 2026-09-11 — evidence: `HRR_CONVERSATIONAL_ARCHITECTURE.md §FF`).** Decisions 1, 5, 6, 7, 8 below are production-proven in code + a real reviewer session. Decisions 2, 3, 4 (the bounded enum-only referent + follow-up resolution) remain design only — **Slice B is a separate, NOT STARTED, NOT PM-authorized** milestone. The VISIBLE thread is `hrr-thread.ts` (reducer) + `ReviewerLkLookup` (`useReducer`). As-built: `HRR_CONVERSATIONAL_ARCHITECTURE.md §BB`; deployment-gap reconciliation: §CC; integration record: §DD; production UAT evidence: §FF.

**Context:** CAH-4G is production-deployed and semantically safe. PM production UAT found the single-turn HRR model *too visible*: asking a second free-form question replaces the first. Human Reviewers expect a conversational research thread (interaction model like CRC). See `HRR_CONVERSATIONAL_ARCHITECTURE.md` §A.

## Decision

1. **The visible thread is UI only.** An append-only list of reviewer turns and assistant turns (each assistant turn = one existing `HrrResearchAnswerView`). It lives in **client React memory** — no `localStorage` / `sessionStorage` / cookie / database / migration. It survives inspector tab-switch and close/reopen (already hidden-not-unmounted); a page refresh clears it. This is the honest representation of "not a persisted conversation".

2. **A visible thread does NOT authorize sending the transcript to an LLM.** The follow-up classifier call receives the new question plus, at most, one fixed-template `[Context: …]` line built from a bounded enum-only structured referent:

   ```
   HrrThreadContext {
     prior_turn_id
     prior_entry_mode: 'topic' | 'free_form'
     prior_resolved_topics: Array<{ topic; scope; bi_status }>   // all enum values
   }
   ```

   It is structurally incapable of carrying prior answer prose, a governed statement, a claim id, an applicability value, an assessment conclusion, or a project fact.

3. **Prior HRR answer prose never becomes** project fact · evidence · assessment state · governed knowledge · applicability input · authority · a `UserGoal` · a stronger conclusion. An inherited referent ("that", "it") resolves only to a topic an **explicit reviewer utterance** raised (this turn's or a prior turn's) — never to a topic an HRR *answer* merely mentioned (Track C parallel).

4. **Reviewer conversation is not project-fact entry.** A reviewer asserting a fact in HRR ("this ran in New York") never mutates an assessment field and never enters `HrrThreadContext`. Every turn re-reads the submission's authoritative facts fresh.

5. **The one-model-call ceiling holds:** topic shortcut = 0; self-contained free-form = ≤1 classify-only; contextual follow-up = ≤1 classify-only (same call, marginally longer input). No second conversational or composition LLM call.

6. **No audit change.** Each research *action* still writes exactly one bounded `lk_research` row; an authority-only turn writes none. Turn ids / conversation ids / raw questions / answer prose are never audited.

7. **Every new turn re-runs the full fresh pipeline** (current facts → `selectReviewerClaims` → deterministic applicability → BI → `projectHrrResearchAnswer`). Old displayed turns are records of what HRR returned then; they are never authoritative context for new research.

8. **No CRC change.** CRC's conversational architecture already uses bounded structured context (`buildUserMessageContent`), not transcript-to-LLM — it is a precedent, not a dependency. Sharing is limited to a new generic client-shell primitive set (`components/conversation/`); CRC adopts it opportunistically, later or never.

## Why (the problem this prevents)

- A chat transcript sent to a model is an unbounded prompt-injection surface, a growing cost, a privacy/retention liability, and a channel for a previously-generated answer to be re-ingested as if it were fact.
- Persisting an HRR conversation would create a raw-question / answer-prose retention surface the frozen `lk_research` audit contract deliberately avoids, and would risk an old answer being read as a governed record.
- Letting reviewer conversational assertions reach applicability would undermine deterministic applicability and blur research against evidence entry.

## Consequences

- Follow-ups like "why does that matter?" and "does that mean I should approve this?" are resolvable safely with an enum-only referent; hypothetical/jurisdiction-qualifier research ("what if this were in New York?") is **out of V1** and needs separate PM + applicability-architecture review.
- The thread is ephemeral across refresh — accepted for a lookup tool inside an already-persistent workbook session.
- Implementation is incremental (`HRR_CONVERSATIONAL_ARCHITECTURE.md` §X, Slices A→B→C), each reversible, no big-bang refactor.

## Enforcement

- `parseBody` rejects a `prior_context` carrying prose / claim ids / facts / applicability / a raw question (Slice B).
- `buildFollowupClassifierInput` output asserted to contain no prose beyond the fixed template + the question.
- Model-call-count tests (topic = 0, free-form ≤1, follow-up ≤1).
- `lk_research` payload shape test unchanged.
- CRC `subsystem-boundaries.test.ts` / `crc-assurance-handoff/boundaries.test.ts` — zero regression.
