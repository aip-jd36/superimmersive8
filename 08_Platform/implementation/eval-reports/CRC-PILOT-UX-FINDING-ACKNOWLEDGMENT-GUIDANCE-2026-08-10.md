# CRC Pilot UX Finding — Acknowledgment Guidance

**Date:** 2026-08-10
**Classification:** Pilot UX finding, **not an engine correction**
**Commits:** `044b215` (fix), diagnosis was investigation-only (no commit)

---

## What was found

The first real pilot user's session ("I recently made an AI video for my client using Kling. My client is going to use it as an advertisement for their social media ad buys." → tier question → "I used the free tier." → "Got it — thanks for sharing that." → apparent stall) was root-cause diagnosed via multi-trial live tracing (8 trials, real Anthropic adapters, the real unmodified `runTurn()`, in-process instrumentation only — no production code modified for the diagnosis itself).

**3/8 trials reproduced the exact symptom**, via two independently legitimate paths:
- Constraint A correctly rejected a redundant re-confirmation question (`FACT_ALREADY_CONFIRMED`).
- Constraint A approved a genuinely useful follow-up, but Constraint B correctly suppressed it as a repeat attempt on an already-once-asked signal.

Every layer checked — Extraction, Mutation, Gate 1, Gate 2, Phase computation, Completion, Candidate generation, Constraint A, Constraint B, pending clarification, API, UI rendering — matched its own documented, tested contract. **This is not an engineering defect.** The acknowledgment fallback (`{status: 'acknowledgment', message: 'Got it — thanks for sharing that.'}`) is `runTurn()`'s own explicit, already-tested default behavior when no candidate question is approved for the turn.

The actual problem: the UI gave the user no signal about what an acknowledgment meant or what to do next. A technically-correct backend response produced a confusing front-end experience.

---

## Fix (presentation-only)

**Files changed:**
- `08_Platform/app/lib/crc-engine/acknowledgment-guidance.ts` (new) — `shouldShowAcknowledgmentGuidance(phase, lastOutcomeWasAcknowledgment)`, a pure function, plus the `CrcPagePhase` type (now the single source of truth for the page's phase enum) and the `ACKNOWLEDGMENT_GUIDANCE_COPY` constant.
- `08_Platform/app/app/crc/page.tsx` — imports both from the new module; adds a `lastOutcomeWasAcknowledgment` boolean state, set explicitly on every response branch (`true` only when `data.status === 'acknowledgment'`; `false` on a real question, completion, session-not-found, and page load/restart); renders the guidance line conditionally, directly above the input area.
- `08_Platform/app/__tests__/crc-engine/acknowledgment-guidance.test.ts` (new) — 9 tests.
- `08_Platform/app/__tests__/crc-engine/run-turn.test.ts` — 1 new integration test (Stop immediately after an acknowledgment turn specifically, not after a question).

**Exact copy used** (verbatim, per the approved spec):
> If there's anything else about how the video was made that you'd like to mention, you can continue. Otherwise, click Stop and I'll summarize what we've learned so far.

Rendered as a plain line under the existing "Got it — thanks for sharing that." message, which is itself untouched — same `ACKNOWLEDGMENT_COPY` constant in `run-turn.ts`, unmodified.

**What did not change:** `runTurn()`'s acknowledgment semantics, candidate generation (no retry, no second attempt at a different eligible signal), Constraint A, Constraint B, phase computation, gates, boundaries, pending_clarification, Retrieval, Projection. Confirmed by: `git diff` scope (only the two files above plus tests), and by the fact that every existing engine-layer test still passes unmodified.

**Known, deliberate scope limit:** the guidance does not reappear on a page refresh/reload mid-acknowledgment — `SessionStatusResponseBody` (the `GET` response) doesn't carry whether the last turn was a question or an acknowledgment, and extending it to do so was out of scope for "deliberately small." Only live transitions within the same browser session show it.

---

## UX behavior verified

Shown only for: `phase === 'idle' && lastOutcomeWasAcknowledgment === true`.

| State | Guidance shown? |
|---|---|
| Non-complete acknowledgment | **Yes** |
| Real follow-up question just arrived | No |
| Interview completed | No |
| Stop already pressed | No (stop_interview always completes the same turn per the prior fix — never reachable as idle+acknowledgment) |
| Retryable technical error | No |
| Session could not be resumed | No |
| Send in flight | No |
| Initial page load | No |

---

## Tests added

`acknowledgment-guidance.test.ts` (9 tests, pure-function level — no component-rendering framework exists in this repo, and this fix doesn't require introducing one):
1. Non-complete acknowledgment → visible
2. Real question just landed → absent
3. Completed (both flag values) → absent
4. Retryable error (both flag values) → absent
5. Session not found (both flag values) → absent
6. Send in flight → absent
7. Initial load → absent
8. "User already pressed Stop" — documents why this state is structurally unreachable as idle+acknowledgment (covered by the completion.ts fix from the prior milestone)
9. **The exact pilot transcript** (Kling / social-media advertising / free tier / acknowledgment) → visible

`run-turn.test.ts` (+1 test): Stop pressed immediately after an acknowledgment turn (not a question) — completes the same turn, produces a non-empty `ProjectionOutput` (not the sparse/empty case, since real facts were gathered), `completion_reason: 'declined'`. No existing engine fixture or expectation was modified — this is additive only.

Full suite: 520 passed (up from 510), same 2 pre-existing, unrelated failures (`mock-provider.test.ts`, `subsystem-boundaries.test.ts`). Typecheck and `next build` both clean.

---

## Production verification

Reproduced the exact pilot conversation against `app.superimmersive8.com` after deploy:

1. `"I recently made an AI video for my client using Kling. My client is going to use it as an advertisement for their social media ad buys."` → real follow-up question (tier), as expected.
2. `"I used the free tier."` → **acknowledgment** (the stochastic path reproduced on this run).
3. Confirmed the deployed JS bundle for `/crc` (`page-5835289c42629f0d.js`) contains the exact guidance copy string — the fix is live, not just built. (No browser-automation tool is available in this environment, so this is bundle-content verification, not a visual screenshot — disclosed the same way every prior live validation in this project has disclosed that same limitation.)
4. Pressed Stop from that exact acknowledgment state → immediate `{"status": "complete", ...}`, same turn, with a real, non-sparse `ProjectionOutput`: `understood_summary` correctly reflects Kling + the client/ad-buy context, and `knowledge_items` correctly surfaces Kling's free-tier commercial-use permission requirement (the exact real-world-relevant fact for this user's situation). Refresh confirms `complete`, transcript intact, never reverts to active.

---

## Confirmation: no Interview Engine / Runtime / Retrieval / Projection behavior changed

`git diff` for this commit touches only `lib/crc-engine/acknowledgment-guidance.ts` (new), `app/crc/page.tsx`, and two test files. No file under `lib/interview-engine/`, `lib/retrieval-engine/`, `lib/projection-layer/`, `lib/crc-engine/run-turn.ts`, `completion.ts`, or any route handler was touched. All pre-existing tests for those subsystems pass unmodified.

---

## Is the original "stall" resolved?

**Yes, for what it actually was.** The engine was never stalled — it was correctly, silently waiting at a legitimate acknowledgment state with no forward signal. That signal now exists. A user in the reproduced state sees exactly what happened (their answer was received), what they can still do (add more), and what ends the interview (Stop), with a preview of what happens if they do (a summary from what's already known) — matching the four required semantic guarantees (received / may continue / not required to continue / Stop finishes with existing facts) without ever claiming the interview is waiting on something it isn't requiring, and without ever implying completion before it actually occurs.

Not touched or reopened: `LIVE_INTERVIEW_RUNTIME_ARCHITECTURE.md`, `PRD_CRC_v1.0.md`, or any other architecture document — this finding and its fix live entirely at the product-copy/presentation layer.
