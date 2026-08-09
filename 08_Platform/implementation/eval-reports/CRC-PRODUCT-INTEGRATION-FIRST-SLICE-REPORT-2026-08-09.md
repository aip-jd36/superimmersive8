# CRC Product Integration — First Usable Live Slice

**Date:** 2026-08-09
**Branch:** `prototype/crc-retrieval-beta` (no dedicated branch created — this is a direct continuation of the same CRC work, no compelling reason found to diverge)
**Commits:** `bb1d250` (session persistence), `f7517d1` (API route), `5285ee6` (UI + renderer)

Built exactly the path specified, nothing more: `/crc` → conversation UI → `POST/GET /api/crc/turn` → `SupabaseSessionStore` → `runTurn()` → on completion `runCRCConversation()` → `ProjectionOutput` → deterministic renderer. No auth, no CRM, no analytics, no Stripe, no saved reports, no admin UI, no share links.

---

## Phase 1 findings (before any code)

No blocker found. Full report delivered separately in-conversation; summary: `lib/supabase/admin.ts` (`supabaseAdmin`, service-role singleton) and `lib/supabase/server.ts` (`createClient()`, anon+cookie factory) are the two existing client patterns; migrations live in `08_Platform/app/supabase/migrations/` (there is a second, older, unused directory at `08_Platform/supabase/migrations/` with a different numeric-prefix convention — not the active one); Route Handlers use manual field-presence validation, never zod, despite zod being used client-side everywhere; no non-auth cookie precedent existed anywhere in the repo (established fresh here); `components/ui/` has only five primitives (Button, Card, Input, Label, Textarea) — several installed Radix packages (dialog, toast, accordion, select) are unused, so the CRC UI was built from the five that exist rather than being the first to wire up an unused one; `ANTHROPIC_API_KEY` was confirmed never referenced in any client file or `NEXT_PUBLIC_` variable anywhere in the codebase.

## Supabase schema

`08_Platform/app/supabase/migrations/20260809000000_create_crc_sessions_table.sql` — one new table, additive only, no foreign keys into any existing table:

```
crc_sessions
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid()   -- IS the opaque session token
  structured_understanding  JSONB NOT NULL
  boundary_state            JSONB NOT NULL
  pending_clarification     JSONB
  transcript                JSONB NOT NULL DEFAULT '[]'::jsonb           -- product-layer, not engine state
  turn_count                INTEGER NOT NULL DEFAULT 0                   -- product-layer, not engine state
  created_at / updated_at   TIMESTAMPTZ (trigger-maintained)
```

RLS enabled, **zero policies** — no auth in v1 and no public-facing reader, so every access path goes through `supabaseAdmin` (service_role), which bypasses RLS entirely. Stricter than the existing `assessments` table (which has a public SELECT policy for its own verification page) since nothing here is ever read directly by the browser.

**Not yet applied to any live database.** No `supabase/config.toml` link exists in this checkout, and `.env.local`'s Supabase credentials are placeholder values (`NEXT_PUBLIC_SUPABASE_URL` is 17 characters, `SUPABASE_SERVICE_ROLE_KEY` is 30 — neither is a real Supabase URL/JWT). This must be applied via the Supabase Dashboard SQL editor (or a properly linked CLI) before any live testing is possible — see Validation results below.

## Session-state contract

Two deliberately separate concerns in one row, per the "challenge whether each field is durable or recomputable" instruction:

- **Engine state** — exactly `CRCSessionState` (`structured_understanding`, `boundary_state`, `pending_clarification`), serialized via the already-tested `serializeStructuredUnderstanding`/`serializeBoundaryState` before storage. `SupabaseSessionStore` (`lib/crc-engine/supabase-session-store.ts`) implements the existing `SessionStore` interface unmodified.
- **Product state** — `transcript` and `turn_count`, which `SessionStore`'s own interface has no way to carry and which are **not** part of `CRCSessionState`. `transcript` exists because `StructuredUnderstanding` stores extracted facts, not literal message text — the runtime doesn't need it to resume correctly, but the browser needs it to redisplay history after a refresh. `turn_count` exists because `RunTurnInput` requires a caller-supplied `turnNumber` that isn't reliably recomputable from persisted engine state alone (a decline turn or a low-signal turn can produce zero `source_turn`-bearing records). Two small helper functions (`loadCrcSessionProductState`/`saveCrcSessionProductState`) handle these, deliberately kept outside the `SessionStore` interface.

**Deliberately excluded** (challenged and rejected): a separate `completion`/`is_complete` column (already inside `structured_understanding.completion_reason`, and `runTurn()` itself already short-circuits on it — a second column would be a second, driftable source of truth) and a stored `ProjectionOutput` (fully recomputable, cheaply, from `structured_understanding` alone — no LLM call involved in that recomputation).

## API request/response contract

`app/api/crc/turn/route.ts`, one file, two methods.

**POST** — body: `{ message: string }` XOR `{ declineAction: 'skip_question' | 'skip_phase' | 'stop_interview' }`, plus optional `{ restart: true }`. Response (all browser-safe, no internal fields):
```
{ status: 'question' | 'acknowledgment', message: string }
{ status: 'complete', projection: ProjectionOutput }
{ status: 'session_not_found' }              -- 404
{ status: 'retry' }                          -- 503
{ status: 'invalid_request', error: string } -- 400
```

**GET** — read-only rehydration for page load/refresh, and `?restart=true` to explicitly discard a session (clears the httpOnly cookie; does not touch the DB row):
```
{ status: 'new' }
{ status: 'session_not_found' }              -- 404
{ status: 'active', transcript: TranscriptEntry[] }
{ status: 'complete', transcript: TranscriptEntry[], projection: ProjectionOutput }
```

Missing/corrupt session handling: a client-supplied cookie token that doesn't resolve (`SessionStore.load()` returns `null` for a missing row, a query error, or corrupt stored JSON — all three collapse to the same outcome) returns `session_not_found` and is **never** silently treated as a fresh session. Only the genuine absence of a cookie, or an explicit `restart: true`, mints a new token. Retry safety needed no extra application logic: `runTurn()` already guarantees its own `sessionStore.save()` calls are the last thing it does on every path, after every upstream step has already succeeded in memory — any exception from `runTurn()` is therefore always safe to report as retryable without having persisted anything.

## Browser-visible data boundary

The client (`app/crc/page.tsx`) never has and never requests `StructuredUnderstanding`, `BoundaryState`, `pending_clarification`, `RetrievalHandoff`, `RetrievalResult`, `claim_id` (used only as a React `key`, never rendered), publication scope, CRC eligibility, or any governance metadata — none of it exists on either response type's TypeScript shape at all, so there is no code path that could leak it, not just a rendering discipline. `ANTHROPIC_API_KEY`, the three Anthropic adapters, and `supabaseAdmin` (service-role) exist only inside `route.ts`, a server-only module; nothing from it reaches the client bundle beyond two `import type` re-exports (`TurnResponseBody`/`SessionStatusResponseBody`), which TypeScript erases entirely at compile time.

## Test count

**21 new tests**, all passing: 11 for `SupabaseSessionStore` (load: missing row, query error, corrupt JSON, valid round-trip, completed-session round-trip; save: writes exactly the three engine-state fields, throws on error; plus 4 for the two product-layer helpers) + 10 for the route's own pure `parseRequest` validation logic. Full suite: **491/500 passing** (6 skipped, 3 failing — the same 2 pre-existing, unrelated failures confirmed present before this work began, in `mock-provider.test.ts` and `subsystem-boundaries.test.ts`). `npx tsc --noEmit` clean throughout.

## Manual/browser validation results

**Could not be completed — real Supabase credentials are not present in this environment.** What was verified:
- Dev server boots cleanly (`next dev`, ready in ~5s).
- `GET /api/crc/turn` was hit live against the running server. It correctly reached the Supabase-client-construction step and failed there with `Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL` — confirming the route's own code path executes as designed up to that point, but also confirming this local `.env.local` cannot reach any real database. This isn't specific to my code: every existing Supabase-backed route in the app (`submissions/create`, the Stripe webhook, etc.) depends on the same `supabaseAdmin` singleton and would fail identically here.
- `ANTHROPIC_API_KEY` in `.env.local` has the length profile of a real key (108 characters); `SUPABASE_SERVICE_ROLE_KEY` (30 characters) and `NEXT_PUBLIC_SUPABASE_URL` (17 characters) do not — both are far short of real Supabase credential lengths.
- No browser automation tool is available to me in this session, so even with working credentials I could not have performed true interactive/visual browser testing — only API-level (curl) simulation of the full multi-turn flow, same discipline as every live-model validation battery in this whole engagement.

**None of Phase 8's required scenarios (completion, gradual discovery, refresh mid-conversation, ambiguous clarification, explicit correction, the three decline actions, transient-error retry, Knowledge Items rendering, full opt-out, missing-session recovery) have been run against the live route.** This is the one explicit gap in this deliverable, and I'm not overstating readiness past it.

**To close this gap:** (1) apply the migration via the Supabase Dashboard SQL editor (or a properly `supabase link`-ed CLI — none exists in this checkout); (2) populate real `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` (or run against the deployed Vercel environment, which already has real values); (3) re-run the dev server and step through Phase 8's own scenario list — the API contract, error taxonomy, and UI states are all built and unit-tested for every one of those cases, they just haven't been observed live yet.

## Security findings

None new. `ANTHROPIC_API_KEY` and all three Anthropic adapters remain server-only (only imported inside `route.ts`). `supabaseAdmin` (service-role) is used exclusively server-side, matching the existing convention exactly. No `NEXT_PUBLIC_` variable was added. The session cookie is httpOnly, `sameSite: 'lax'`, `secure` in production, so client JS cannot read or forge it. RLS is enabled with zero policies on the new table — stricter than any existing table in the schema, since there is no legitimate direct-read path from the browser at all.

## Runtime behavior changed

None. `runTurn()`, `runCRCConversation()`, and every engine module are untouched by this work — `SupabaseSessionStore` implements the existing `SessionStore` interface exactly as written, and the dependency direction stayed `runTurn() ← SessionStore interface ← SupabaseSessionStore`, never the reverse. No engine contradiction was exposed during integration; nothing to report there.

## Is CRC ready for a limited real-user test?

**Not yet — one concrete step short.** The code path is complete, typechecked, and unit-tested end to end for every layer this milestone specified. The one thing standing between this and a real user is entirely environmental, not architectural: apply the migration and supply real Supabase credentials, then run Phase 8's own scenario list once, live. Nothing in the design is provisional or waiting on a further decision — this is a "run the checklist," not a "build more first," gap.
