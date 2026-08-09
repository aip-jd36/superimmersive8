# CRC Limited Pilot — Implementation Report

**Date:** 2026-08-09
**Branch:** `prototype/crc-retrieval-beta`
**Commits:** `11f02c0`, `144b489`, `07cbf6e`, `1c5f8bf` (four small, bisectable commits, one per approved plan part or part-cluster)
**Context:** Implements the approved Stage B plan following the Stage A review ("CRC Limited Pilot — instrumentation + launch prep"). No architectural contradiction was found during implementation; nothing was escalated mid-build.

---

## 1. Files changed

**New:**
- `08_Platform/app/supabase/migrations/20260810000000_crc_pilot_events_and_feedback.sql`
- `08_Platform/app/lib/crc-engine/pilot-events.ts`
- `08_Platform/app/lib/crc-engine/pilot-access.ts`
- `08_Platform/app/app/api/crc/feedback/route.ts`
- `08_Platform/app/app/api/crc/pilot-access/route.ts`
- `08_Platform/app/app/crc/access/page.tsx`
- `08_Platform/app/__tests__/crc-engine/pilot-events.test.ts`
- `08_Platform/app/__tests__/api/crc-feedback-route.test.ts`

**Modified:**
- `08_Platform/app/app/api/crc/turn/route.ts` — persistence hardening + pilot event logging
- `08_Platform/app/lib/crc-engine/supabase-session-store.ts` — `saveCrcSessionFeedback()` added
- `08_Platform/app/lib/crc-engine/api-contract.ts` — feedback request/response types + `parseFeedbackRequest()`
- `08_Platform/app/app/crc/page.tsx` — feedback UI, CRC/SI8 boundary sentence
- `08_Platform/app/components/CrcProjectionOutput.tsx` — empty-completion copy
- `08_Platform/app/middleware.ts` — pilot-access gate for `/crc` and `/api/crc/*`
- `08_Platform/app/.env.local.example` — documents `CRC_PILOT_ACCESS_CODE`

No file outside `08_Platform/app` was touched. No file inside the CRC engine's own domain logic (`gates.ts`, `boundaries.ts`, `mutations.ts`, `run-turn.ts`, the extraction/candidate-question/decision adapters, `assemble-result.ts`, the projection-layer transforms) was touched — every change in this pass is product/runtime layer only, per the guiding principle.

---

## 2. Database migration

One migration (`20260810000000_crc_pilot_events_and_feedback.sql`), applied live via the Supabase Dashboard SQL editor on 2026-08-09 (same manual process as the two prior CRC migrations — no linked CLI in this checkout). Two additions:

1. **`crc_pilot_events`** — new table (schema below).
2. **`crc_sessions.feedback_rating` / `crc_sessions.feedback_text`** — two new nullable columns, plus a CHECK constraint restricting `feedback_rating` to `yes` / `somewhat` / `no`.

`service_role` GRANT was included in the same migration file this time (not a follow-up), directly incorporating the lesson from the `crc_sessions` table's own two-migration history earlier in this project.

---

## 3. New event schema

```
crc_pilot_events
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
  session_id  TEXT (nullable — a missing_session event is, by definition, a token that resolves to nothing)
  event_type  TEXT NOT NULL, CHECK IN (
                retryable_failure, persistence_error, missing_session,
                skip_question, skip_phase, stop_interview
              )
  detail      TEXT (nullable — short system-generated diagnostic string only, never conversation text)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

Append-only, no update/delete path anywhere in the app. Deliberately excludes anything reconstructable from `crc_sessions` (turn count, completion state, phases reached, corrections) — only the handful of signals that leave no trace anywhere else.

**Live confirmation:** queried directly against the production table after the smoke battery (Section 7) — both a `stop_interview` event (session-scoped) and a `missing_session` event (forged-cookie scenario) were present, correctly typed, with `detail: null` in both cases. No conversation text in any row.

---

## 4. Feedback implementation

`POST /api/crc/feedback` — validates `rating` (`yes`/`somewhat`/`no`, required) and `text` (optional, trimmed, whitespace-only normalized to `null`), resolves the session from the httpOnly `crc_session` cookie, requires the interview to actually be complete (`structured_understanding.completion_reason !== null`) before accepting, then writes directly to `crc_sessions.feedback_rating`/`feedback_text` via `saveCrcSessionFeedback()` (plain `.update()`, same precondition-throws-if-zero-rows discipline as `saveCrcSessionProductState`).

UI: a three-button rating control + optional free-text field, shown on the completion screen once, replaced with a static "Thanks for the feedback" line after a successful submit. No survey framework, no separate feedback table, no analytics workflow — exactly the one mechanism approved.

**Live confirmation:** submitted `{rating: "somewhat", text: "smoke test note"}` against a real completed session; a direct query against `crc_sessions` afterward showed `feedback_rating: "somewhat"`, `feedback_text: "smoke test note"` (trimmed correctly).

---

## 5. Pilot access implementation

`CRC_PILOT_ACCESS_CODE` (server-side env var, not `NEXT_PUBLIC_`) is validated by `POST /api/crc/pilot-access`. On a match, the response sets an httpOnly `crc_pilot_access` cookie carrying a fixed marker value (`granted`) — never the raw code. `middleware.ts` now gates `/crc/:path*` and `/api/crc/:path*` behind that cookie, exempting only `/crc/access` (the entry page) and `/api/crc/pilot-access` (its own validation route) — without that exemption, no one could ever pass the gate. Page requests without the cookie redirect to `/crc/access?redirectedFrom=...`; API requests without it get a `401 {status: "pilot_access_required"}` JSON response, never a redirect.

No accounts, no user identities, no auth system — one shared code, consistent with the approved plan's explicit instruction. The cookie value being a fixed marker rather than a derivation of the code is a deliberate simplicity tradeoff, documented in `lib/crc-engine/pilot-access.ts`'s own header: this is a soft gate to keep the pilot URL from being casually stumbled into, not a hardened security boundary.

**Live confirmation:** verified all four states — no cookie + page request → 307 to `/crc/access`; no cookie + API request → 401; wrong code → 403; correct code → 200 + `Set-Cookie: crc_pilot_access=granted; HttpOnly; SameSite=lax`.

---

## 6. Persistence hardening

`saveCrcSessionProductState()` in the turn route's `POST` handler was previously unhandled — a transient failure there would have produced an unhandled 500. It's now wrapped in its own try/catch: on failure, a `persistence_error` pilot event is logged and the client receives `{status: "retry"}` (503), matching the existing retry philosophy used for `runTurn()` failures.

The two failure paths in the route are deliberately asymmetric on cookie-setting, and this asymmetry is the one substantive design decision in this hardening pass:

- **`runTurn()` failure** (nothing persisted yet, by `runTurn()`'s own structural guarantee that `sessionStore.save()` is always its last step) → no cookie set on the retry response. For an existing session the browser already holds the right cookie from a prior turn; for a brand-new session, nothing was ever created, so a retry correctly re-enters "mint a new token."
- **`saveCrcSessionProductState()` failure** (by this point `runTurn()` has already committed engine state and the row is guaranteed to exist) → the cookie **is** set on the retry response, so a retry targets the same row rather than minting a new token and orphaning the one that already exists.

No partial engine-state commits are possible either way: each Supabase call is its own atomic statement, and `runTurn()`'s own save has already fully succeeded (or the whole request already returned) before this second call is ever reached.

---

## 7. Smoke validation results

Run against `next dev` with real credentials, live Supabase, live Anthropic — cookie-jar `curl`, same discipline as the original Phase 8 battery but intentionally lightweight per the approved plan (not a full battery repeat, since no engine-layer file changed).

| Scenario | Result |
|---|---|
| No pilot cookie, page request | 307 → `/crc/access?redirectedFrom=%2Fcrc` |
| No pilot cookie, API request | 401 `{status: "pilot_access_required"}` |
| Wrong pilot code | 403 `{status: "invalid_code"}` |
| Correct pilot code | 200 + httpOnly `crc_pilot_access` cookie set |
| Fresh session (with pilot cookie) | `{status: "new"}` |
| Feedback before any session exists | 404 `{status: "session_not_found"}` |
| `stop_interview` on turn 1 (empty-completion path) | `{status: "complete", projection: {opening_line: "", understood_summary: "", knowledge_items: [], closing_cta: ""}}` — exact all-empty shape, unchanged from the frozen contract |
| Feedback with invalid rating | 400, specific error message |
| Feedback with valid rating + text, on the now-complete session | 200 `{status: "ok"}` — confirmed written to `crc_sessions` directly |
| Refresh (`GET`) after completion | Same transcript + same projection returned |
| Forged/nonexistent session cookie | 404 `{status: "session_not_found"}`, `missing_session` event logged |
| Full-stack normal turn (restart → real message → extractor/generator/decider → persistence, all behind the pilot gate) | Correct clarifying question returned, session cookie set |
| `crc_pilot_events` direct query | Both events from this battery present, correctly typed, `detail: null`, no conversation text |

**Not exercised in this pass:** a genuine `saveCrcSessionProductState()` failure was not forced (would require injecting a network/DB fault) — its unit-test coverage and the identical, already-live-validated pattern from `saveCrcSessionProductState`'s zero-rows-updated case are the basis for confidence here, consistent with "lightweight smoke, not full battery" scope. The original Phase 8 battery already validated the `runTurn()` failure path live, organically.

`npx tsc --noEmit`: clean. `npx next build`: clean, including Next.js's own route-shape typecheck for both new routes (`/api/crc/feedback`, `/api/crc/pilot-access`) and the new `/crc/access` page — this was checked explicitly given the exact same class of error surfaced and had to be fixed during the prior milestone. Full Jest suite: 505 passed (up from 499 before this pass — 6 new tests: `parseFeedbackRequest` coverage), same 2 pre-existing, unrelated failures (`mock-provider.test.ts`, `subsystem-boundaries.test.ts`) — no regressions.

---

## 8. Confirmation: no engine behavior changed

Every change in this pass lives in the product/runtime layer: the API routes, the product-state helpers on `supabase-session-store.ts` (which were already explicitly separate from `SessionStore`), the page UI, and middleware. No file under the CRC engine's own domain-logic modules — `gates.ts`, `boundaries.ts`, `mutations.ts`, `run-turn.ts`, the Anthropic adapters, `assemble-result.ts`, `retrieve.ts`, the projection-layer transforms — was touched. `structured_understanding`/`boundary_state`/`pending_clarification` are written by the same `SessionStore.save()` path as before, untouched by this pass. `saveCrcSessionFeedback()` and `saveCrcSessionProductState()` write disjoint column sets and never interact.

## 9. Confirmation: no governance data became client-visible

`FeedbackResponseBody` and the pilot-access response carry no fields beyond `status` (and, on error, a short client-safe `error` string) — no new field type was added to `TurnResponseBody`/`SessionStatusResponseBody`. `logPilotEvent()`'s `detail` field is explicitly typed and documented as system-generated diagnostic text only, never conversation content, and this was verified directly (Section 7) against the two live-recorded rows. The pilot-access cookie carries a fixed marker string, never the raw `CRC_PILOT_ACCESS_CODE`. No new route returns `StructuredUnderstanding`, `BoundaryState`, `RetrievalHandoff`/`RetrievalResult`, Publication Scope, CRC eligibility, approver, decision date, or SI8 Interpretation — the same exclusion list enforced in the prior milestone.

---

## 10. Pilot review table (Stage A draft + Part 9 addition)

The Stage A review drafted this table in text form only, not as a committed file. Recording it here now, with the one qualitative row Part 9 specifies added:

| Question | How answered |
|---|---|
| Is CRC technically reliable? | Error/event logs (`crc_pilot_events`), manual Supabase inspection |
| Did the interview understand the user's workflow? | Manual transcript + `ProjectionOutput` review per session |
| Did CRC ask the minimum number of questions necessary? | Manual transcript review |
| Did users understand the difference between CRC and SI8? | Feedback free-text field + informal follow-up, if needed |

No dashboard, no KPI, no aggregate metric was invented for any of these — each is answered by direct inspection of a small number of real sessions, consistent with Part 7's explicit reversal of the Stage A dashboard proposal.

---

## 11. Final recommendation

**Ready for the first 5–10 real pilot users**, with one operational step outstanding: `CRC_PILOT_ACCESS_CODE` is currently set only in local `.env.local` (value: shared with JD separately, not repeated in this file) — it needs to be added to the Vercel production environment variables before the pilot's actual URL is reachable by real invitees, the same way `NUMBERS_API_KEY` and the Stripe/Resend keys already are. Once that's set, distributing the `/crc` link + the access code to the first cohort is the only remaining step.

No architectural contradiction was found at any point in this implementation. All nine approved plan parts are complete: Parts 1–2 (persistence hardening, pilot events) landed in the prior commit this session continued from; Parts 3–9 (feedback, intro copy, empty-completion copy, pilot access, no dashboard, smoke validation, pilot review table) are complete as of this report.
