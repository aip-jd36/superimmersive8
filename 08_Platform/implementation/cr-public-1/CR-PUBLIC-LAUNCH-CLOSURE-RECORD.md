# CR-PUBLIC — Creator Record public launch: closure record

**Status: COMPLETE — founder accepted (2026-11-18).** Creator Record V2 is publicly available as a $29 self-service product.

## Production state

| Item | Value | How established |
|---|---|---|
| Deployment | `origin/main` = `ece9b196` (fast-forward from `b63c7cf1`, branch `release/cr-public-launch`) | Push; Vercel deploys observed live |
| Access | `CREATOR_RECORD_V2_ACCESS = 'public'` (`lib/creator-record-flow/access-policy.ts`); no invitation needed | Code; the smoke record's owner had no invitation row |
| Terms | `terms-2026-11-18`, effective 2026-11-18, approval `JD-CR-PUBLIC-LAUNCH-20261118 terms`. Only change from `terms-2026-11-14`: the §2 availability sentence | Live `/terms`; hash test |
| Privacy Notice | `privacy-2026-11-09` (unchanged) | Live `/privacy` |
| AI-permission authority row | `cr-v2-ai-permission-1__privacy-2026-11-09__terms-2026-11-18`, one row, established by the founder 2026-11-18 02:28:14 UTC with `operator/creator-record-v2-terms/replace_ai_permission_authority.sql` | Read-only verification |
| Website | Round 2 redesign live; Creator Record CTAs "Create a Creator Record" → `https://app.superimmersive8.com/auth/signup?next=/creator-record` | Live HTTP checks |
| Contact form | Intentionally off (`CONTACT_FORM_ENABLED` unset; endpoint answers `not_configured`) pending the Website Privacy Notice | Live HTTP check; founder decision |
| Security fixes released | Public `/api/notify-signup` removed (notification only after confirmed sign-up, escaped); same-origin post-login redirects | Live checks (`404`; `next=//evil.example` → `/dashboard`) |

## Smoke test (Production)

Record `CR-2026-59E5118A`:
- **Payment:** live Stripe session, `accepted`, bound to its order, one signed webhook event, subtotal $29.00, discount $29.00,
  total $0.00. **The founder intentionally entered the 100% discount code.** The $0 checkout was expected; this is explained,
  not a defect.
- **Fulfilment:** completed, attempts 1, no error. One issued artifact (generator `creator-record-v2-pdf-v4`, stored in the
  private `creator-records` bucket); confirmation email accepted.
- **Download:** the founder downloaded the PDF from the dashboard.
- **Duplicates and failures:** none; no paid-but-unissued v2 order.
- **"PAID" on the dashboard** for a fully discounted checkout is current product design (FIX-1).

## Accepted residual risks (not defects; no further launch tests scheduled)

- A genuine non-zero US$29 Stripe charge has not run in Production.
- A brand-new account has not completed the public sign-up journey in Production (the smoke account predates the launch).
- AI document reading under the new permission version has not run in Production.

Respond to actual Production incidents if they occur.

## Follow-ups (outside this milestone; kept in their own workstreams)

| Item | Workstream / owner | Where recorded |
|---|---|---|
| Governed successor to `CLAIM-RUNWAY-COMMERCIAL-USE-001-v1`: separate the plan the user declared from any plan SI8 verified (Creator Record establishes none). Optionally align the Terms §5 phrase at the next Terms revision | Living Knowledge governance (founder approval) | This record; analysis in the post-launch verification report |
| Approve and publish the marketing Website Privacy Notice | Website (founder) | `08_Platform/implementation/si8-web/WEBSITE_PRIVACY_NOTICE_DRAFT.md` |
| Retire or remediate legacy `/sample` (direct GA, Contentsquare) and legacy endpoints `/api/formspree-to-kit`, `/api/submit` | Website | Same draft (blockers 1–2); `SI8-WEB-LAUNCH-2-FOUNDER-DECISIONS.md` |
| Enable the contact form after the privacy notice and delivery check | Website (founder sets `CONTACT_FORM_ENABLED=true`) | `tools/site-build/site.config.json` `launchExceptions` |
| Privacy Notice and Terms don't mention the 12-month owner download window (`410 access_expired`); first possible effect November 2027 | Creator Record legal content (next revision) | This record |
| The 2026-10-21 historical anomaly is still open (`resolve_anomaly` with a note) | Creator Record payments (admin) | `caa-3b/CAA_3B_FIX_1_RUNBOOK.md` |

## References

- **Plans and procedures:** `CR-PUBLIC-1-ACTIVATION-CHECKLIST.md`, `CR-PUBLIC-2A-PRODUCTION-UAT-READINESS.md`,
  `CR-PUBLIC-2A-FIX-AI-PERMISSION-RUNBOOK.md` and `CR-PUBLIC-2A-FINAL-UAT-SEQUENCE.md` (this folder).
- **Website decisions:** `08_Platform/implementation/si8-web/SI8-WEB-LAUNCH-2-FOUNDER-DECISIONS.md` (launch amendment).
