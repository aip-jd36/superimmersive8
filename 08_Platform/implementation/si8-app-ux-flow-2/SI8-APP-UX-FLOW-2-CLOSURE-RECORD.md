# SI8-APP-UX-FLOW-2 — Closure record (dashboard customer journey)

**Status: CLOSED — Production deployed and founder accepted, with documented residual verification limitations (2026-11-18).**
Founder closure instruction: "SI8-APP-UX-FLOW-2 — Formal Milestone Closure" (2026-11-18).

## 1. Release identity

| | |
|---|---|
| Commit | `998d2d93` on `main` (fast-forward from `915dd3d5`, branch `work/app-ux-flow-2`, no force push) |
| Deployment | Vercel `si8-creator-portal` `EnVwXcNFuZTUdKRrWYSfY633VAsk`, success; https://app.superimmersive8.com |
| Baseline | `915dd3d5` (SI8-APP-UX-REFRESH-1: website visual theme for the dashboard and Creator Record download view) |
| Files | `app/dashboard/page.tsx`, `app/dashboard/layout.tsx`; guards `__tests__/creator-record/purchase-claims.test.ts` and `__tests__/security/creator-record-v1-cutover.test.ts` (under `08_Platform/app/`) |

## 2. Scope delivered

- **Start something new** above the records: Creator Record ($29, "Create a record", `/creator-record`) and Commercial Assurance
  Assessment ($499, "Explore assessment", `/certify`).
- **Your records**, grouped by stored tier: `creator_record` → Creator Record; `si8_certified` → Commercial Assurance Assessment;
  anything else → Other submissions.
- Creator Record v2 rows show the declared video title (question P1 of the user's own prepared record; one field, filtered by user
  and by the user's submission ids). A missing or unreadable title falls back to the stored submission title.
- "Submit New" removed from the header (v1 sales retired; it duplicated the Creator Record card).
- Statuses, dates, detail routes, account controls and admin-only access unchanged in implementation.
- Guards replaced by equally strict rules, by founder decision: the dashboard Commercial Assurance card names the `/certify`
  product and price, links only to `/certify` and never says "from"; the header never links to `/record`.

Not changed: authentication, authorization, payments and checkout, Creator Record issuance, PDF and delivery, Commercial Assurance
processing, CRC, Living Knowledge, schema.

## 3. Evidence

**Founder (Production, signed in):** the new structure renders; both product names and exact prices display; the declared video
title of the founder's Creator Record appears; product and record links work.

**Engineering:**
- Guard suites 10/10 (329/329 tests); TypeScript and production build (including the customer-wording check) pass.
- Full suite: 24 suites / 89 tests fail, the failing-suite list identical to `915dd3d5` (pre-existing baseline).
- Signed out in Production: dashboard, record detail, `/creator-record`, `/certify` and `/admin` redirect to sign-in; the PDF route
  returns 401.
- Read-only Production checks (counts only, no content read): the 8 bound v2 prepared records hold a non-empty P1 title in
  `form_state` (`jsonb`); all 8 have the same owner as their submission; no submission is bound twice.
- `/certify` is the current Commercial Assurance Assessment: live list price 49900 cents for `si8_certified`; checkout copy "Human
  review of submitted project information and supporting evidence…"; admin approval requires a signed-off assessment. The legacy
  `certified` tier is refused at checkout ("enforced no Assessment").

## 4. Residual verification limitations (not known regressions)

Not explicitly confirmed by founder UAT: authenticated mobile layout; account controls in Production; the two legacy `certified`
submissions under Other submissions. The live title lookup was demonstrated for at least one Creator Record, not for every record.
Mobile layout, account controls and grouping were checked only in a local harness with synthetic data.

## 5. Decisions kept

Legacy `certified` submissions stay under Other submissions unless authoritative provenance establishes their product.

## 6. Deferred (separate potential follow-ups; not blockers)

1. Commercial Assurance CTA "Explore assessment" → "Start assessment" (narrow guard update to the card constant).
2. Show the declared video title on Creator Record detail pages.
3. Reconcile the website's contact-led Commercial Assurance journey ("Starting at $499", price confirmed first) with the app's
   fixed $499 `/certify` checkout.
4. The legacy "SI8 Certified" item label in the Stripe webhook's analytics event (internal only).
