# Creator Record v2 — Public UAT Harness (CR-V2-WORK-UAT-HARNESS-2)

**What:** a temporary, passwordless, synthetic-only copy of the Creator Record v2 prototype flow that a cloud browser (ChatGPT Work) can operate without an SI8 login.

- Page: `/uat/creator-record-v2`
- API: `POST /api/uat/creator-record-v2/draft`
- Admin prototype (`/admin/creator-record-v2`, `/api/admin/creator-record-v2/*`) is unchanged and stays admin-only.

**Status: ARMED by CR-V2-WORK-UAT-HARNESS-3B (PM GO, 2026-10-27).** Window `2026-10-27T07:00:00Z` → `2026-11-10T07:00:00Z` (14 days; do not extend). Outside it the page and the route answer 404. Rollback target: Production deployment 7351003604 (`b36304d`, no harness). Firewall: Vercel rule "Creator Record UAT API Limit" — `/api/uat/*`, 30 requests / 60 s per IP, 429 (enforcement verified 2026-10-27: requests 31–33 → 429, `X-Vercel-Mitigated: deny`).

## Boundary

| Reaches | Does not reach (test-enforced runtime import closure) |
|---|---|
| The unchanged Creator Record orchestrator (`buildCreatorRecordDraft`), pilot registry and ledger, governed claim fixtures, identities, plan suggestions, form validation, templates, view model | Auth/session (`reviewer-context`, `lib/auth`), Supabase/service role, middleware, storage, email, Stripe/payments, PDF, CRC, assessments, document examination (`examine-upload`), the live gate/adapter, `receipt-examination/examine`, `prompt`, `examine.anthropic`, any AI SDK |

- **No upload.** The browser chooses one of 9 allowlisted synthetic fixtures (`lib/creator-record/public-uat/fixtures.ts`). It sends only `{tool_index, fixture_id, review: {decision, adopted_value}}`. The server builds each document observation from the committed replay table. Any browser-supplied observation, hash, id, extraction, mode or unexpected field → 400.
- **Display-only documents.** Guidance is computed only from the creator's answers (same as admin; parity test-enforced).
- **Public presentation** (`toPublicUatView`): adds `PUBLIC UAT — SYNTHETIC TEST DATA — NOT AN ISSUED CREATOR RECORD` to the record title, status, banner, summary (first line), method and "What SI8 did not do", plus "All guidance shown is pilot wording that has not been approved for Creator Records and has not been reviewed by counsel." Removes the internal trace, publication-entry provenance, claim/dependency ids and internal version ids. Changes no conclusion, guidance text, open item, limitation or omission.
- **Limits:** streamed 32 KB body; JSON only; ≤ 3 documents, 1 per tool; `no-store`; `noindex` (page metadata + `X-Robots-Tag` on `/uat/*` and `/api/uat/*`).
- **Analytics:** the root layout sets `window['ga-disable-G-628BLE9N15'] = true` before `gtag('config')` on `/uat` paths only; the harness client sets it again on mount. Every other path is unchanged.

## Arming (deployment commit only — needs a PM GO)

Set in `lib/creator-record/public-uat/config.ts`, in the commit that deploys:

```ts
export const PUBLIC_UAT_WINDOW = { opens_at: '<deploy date>T00:00:00Z', closes_at: '<deploy date + 14 days>T00:00:00Z' }
```

The window must be ≤ 14 days, or it is refused (closed). Update the test "as committed for local development the window is NOT armed" in the same commit; it exists to stop accidental arming.

## Disable procedure (any one is sufficient; tested states in `public-uat-harness.test.ts` H1)

1. **Immediate, no code:** Vercel → Deployments → Instant Rollback to the deployment before the harness.
2. **Code:** `PUBLIC_UAT_HARNESS_ENABLED = false` (or `PUBLIC_UAT_WINDOW = null`), commit, push; the next deployment answers 404.
3. **Automatic:** at `closes_at` the page and the route answer 404 on the next request (evaluated per request, `force-dynamic`; nothing is frozen at build time).

Verify after disabling: `GET /uat/creator-record-v2` → 404; `POST /api/uat/creator-record-v2/draft` → 404.

## Recommended Vercel Firewall configuration (NOT applied — PM to configure)

- Custom rule, **rate limit**: path starts with `/api/uat/` → e.g. 30 requests / 60 s per IP, action **deny (429)**.
- Optional: path starts with `/uat/` → e.g. 60 requests / 60 s per IP.
- Do **not** apply a challenge or bot-protection action to these paths: an interactive challenge would block ChatGPT Work's cloud browser.
- Availability and limits of rate-limit rules depend on the Vercel plan — check in the dashboard.

## What it can and cannot establish

- **Can:** that Work can drive and read the questionnaire, conditional questions, validation, dropdown identities, plan suggestions, document review on synthetic observations, guidance composition and wording, and that results are deterministic.
- **Cannot:** login/signup/Turnstile, admin authorization, the real upload path (multipart, byte sniffing, 4 MB limit), live extraction quality, payment, persistence, amendments, email/PDF, real load, approved customer wording.
