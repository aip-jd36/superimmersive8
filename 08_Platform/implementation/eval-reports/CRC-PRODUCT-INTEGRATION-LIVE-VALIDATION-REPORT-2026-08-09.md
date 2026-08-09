# CRC Product Integration — Live Validation (Phase 8, completed)

**Date:** 2026-08-09 (same day as, and completing, `CRC-PRODUCT-INTEGRATION-FIRST-SLICE-REPORT-2026-08-09.md`)
**Commit:** `36b9b6b`
**Project:** SI8 CaaS Platform (Supabase project `lehqgcgnenwdmuzudbrs`), production instance

The prior report closed with one explicit, disclosed gap: no real Supabase credentials were available, so Phase 8's live scenario checklist had not been run. That gap is now closed. This report covers what changed to close it, three real bugs it surfaced (none reachable by unit tests), and the full live results.

---

## Getting to a live environment

Two migrations required manual application via the Supabase Dashboard SQL editor (no `supabase link`-ed CLI exists in this checkout):

1. `20260809000000_create_crc_sessions_table.sql` — the table itself. Applied successfully.
2. `20260809000001_grant_service_role_crc_sessions.sql` (new, added this session) — `GRANT ALL ON public.crc_sessions TO service_role;`. Required because this project's `public` schema does not auto-grant `service_role` table access on newly created tables — the same issue this project hit once before, for a different set of tables (`005_grant_service_role_permissions.sql`, in the older, unused migrations directory). Without it, `supabaseAdmin` got `permission denied for table crc_sessions` (Postgres `42501`) on every query, despite `service_role`'s own `BYPASSRLS` privilege — table-level grants and RLS bypass are independent gates in Postgres, and only the second one was covered by the original migration.

Real credentials (Project URL, publishable/anon key, secret/service-role key — this project uses Supabase's newer key format, `sb_publishable_...`/`sb_secret_...`, not legacy JWTs) were supplied by JD directly and written into `.env.local`.

## Three real bugs found and fixed

All three surfaced only once tested against the live database — none were reachable by the unit test suite, which uses a fake in-memory client.

**1. Missing service_role grant** (above) — fixed via the new migration.

**2. `Supabase JS .upsert()` unreliable for this project.** After the grant fix, every turn still failed: `null value in column "structured_understanding" ... violates not-null constraint`. Root-caused with an isolated diagnostic script run directly against the live database (bypassing the whole Next.js/route stack entirely, to eliminate every other variable): `store.save()` correctly created a row; a direct `SELECT` confirmed it existed; but `saveCrcSessionProductState()`'s partial-column `.upsert({id, turn_count, transcript})` — with or without an explicit `onConflict: 'id'` — still attempted a plain `INSERT` against the existing row rather than recognizing the conflict, failing the `NOT NULL` constraint on the columns it didn't include. Independently verified in the same script that plain `.update()` and `.insert()` both behave correctly and predictably (including `.update()` against a non-matching id returning an empty data array with no error, never a false success). **Fix:** replaced every `.upsert()` call in `lib/crc-engine/supabase-session-store.ts` with manual `.update()` → check for zero rows matched → `.insert()` if empty. `saveCrcSessionProductState` (which has its own documented precondition that the row already exists) uses `.update()` alone and now throws explicitly if it ever matches zero rows, surfacing a genuine precondition violation instead of silently no-op-ing.

**3. Next.js's own route-shape typechecking rejects non-standard exports.** `npx tsc --noEmit` was clean when last checked in isolation, but once the dev server had run and generated `.next/types/app/api/crc/turn/route.ts`, typecheck failed: Next.js's generated type maps every export of a Route Handler file to `never` except `GET`/`POST`/etc. and a small fixed set of special names. `parseRequest`/`ParsedRequest`/`TurnResponseBody`/`SessionStatusResponseBody` had been exported directly from `route.ts` for test and page reuse — this is disallowed under Next's own strict route typing, not just a style question. **Fix:** moved all four into a new `lib/crc-engine/api-contract.ts`; `route.ts` now only exports `GET`/`POST`, importing the contract internally; the test file and `app/crc/page.tsx` import from the new module instead.

Tests updated to match (11 → 14 tests in `supabase-session-store.test.ts`; full suite 494/503, same 2 pre-existing unrelated failures). `npx tsc --noEmit` clean.

## Live Phase 8 results — all 12 required scenarios, all passed

Run via `curl` against `next dev` with real credentials (cookie-jar based, simulating real browser session continuity — no browser automation tool is available in this environment, so this is API-level rather than visual/interactive validation, same discipline as every other live-model validation in this project).

| Scenario | Result |
|---|---|
| Straightforward completion | 3-turn conversation → correct `ProjectionOutput`: populated `opening_line`, `understood_summary`, one `knowledge_items` entry (Runway, correct `statement` + `last_verified`), `closing_cta`. |
| Multi-turn gradual discovery | Facts accumulated correctly turn over turn (tool → role → intended use). |
| Refresh mid-conversation | `POST` (question asked) → `GET` (simulating reload) returned the exact transcript (`user` + `assistant` entries) that had actually occurred. |
| Ambiguous tool clarification | "Nano Banana" → clarifying question asked → resolved cleanly on the next turn, no duplicate/dropped state. |
| Explicit correction | "we used Runway, not Midjourney" → handled cleanly, no `MUTATION_DUPLICATE_ID`, no crash (confirms the proposal-ID collision fix from earlier this session holds live in the product route too). |
| `skip_question` | Question suppressed (`acknowledgment` returned) → interview continued normally on the next turn with a new question. |
| `skip_phase` | Same suppression behavior confirmed. |
| `stop_interview` | Immediate `complete`, correctly partial `ProjectionOutput` (tool unresolved at time of stop → empty `knowledge_items`, `understood_summary` honestly reflects the unresolved state). |
| Transient model error + retry | **Encountered organically, not manufactured** — a genuine Anthropic structured-output validation failure on the Constraint A decider mid-battery. Returned `{status:'retry'}` (503); nothing was persisted (confirmed by a true retry — same message resent on the same session — succeeding normally afterward with correct turn continuity). |
| Knowledge Items rendering | Confirmed in the completion above: `statement` rendered, `last_verified` present and correctly formatted by `CrcProjectionOutput`. |
| Full opt-out / empty result | `stop_interview` on turn 1 → `{opening_line:'', understood_summary:'', knowledge_items:[], closing_cta:''}` exactly, matching `assembleProjectionOutput`'s own deliberate all-empty rule. |
| Missing session recovery | A forged/nonexistent session cookie → `{status:'session_not_found'}` (404), never silently treated as a valid new session. The `?restart=true` "Start Over" path was also verified: clears the cookie, subsequent `GET` correctly reports `{status:'new'}`. |

**Governance/internal-data check:** every raw JSON response across all scenarios was inspected directly. None contained `StructuredUnderstanding`, `BoundaryState`, `pending_clarification`'s internal signal ids, `RetrievalHandoff`, `RetrievalResult`, publication scope, CRC eligibility, approver, decision date, or SI8 Interpretation — only `status`, `message`, and, on completion, the frozen `ProjectionOutput` shape (which legitimately includes `claim_id` as part of its own contract; the renderer only ever uses it as a React key, never displays it).

## Updated answer: is CRC ready for a limited real-user test?

**Yes.** The one gap the prior report flagged is closed. All 12 required scenarios passed live against the real production Supabase project and real Anthropic calls, including one organically-occurring transient failure that confirmed the retry path works exactly as designed under real conditions, not just in theory. Three real infrastructure bugs were found and fixed in the process — all three were genuinely undiscoverable without live testing (a missing grant, an unreliable third-party client method against this specific project, and a Next.js build-time constraint that only appears once the dev server has actually run) — which is exactly why this step existed rather than being skippable.

Remaining caveats, both already disclosed and neither blocking a *limited* test: no visual/interactive browser testing was performed (no browser automation tool available — this was thorough API-level simulation of the full multi-turn flow); the dev server used for this validation was stopped after testing and will need to be running (or the change deployed) for anyone to actually use `/crc`.
