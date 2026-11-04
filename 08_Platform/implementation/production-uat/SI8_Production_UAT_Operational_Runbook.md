# SI8 Production UAT: Operational Runbook

**Status: ready once deployed.** Built on `work/cr-v2-admin-uat`. It works on Production after migration `20261107000000` is applied and the code is deployed.

## Who and what

- **Who:** an existing SI8 administrator (`users.is_admin`), signed in normally, with MFA if D4 is approved.
- **Where:** `https://app.superimmersive8.com/admin/creator-record-v2/uat`
- **Never needed:** new users, invitations, grants, windows, bans, binding codes, closure queries, or SQL.
- **Test documents:** only SI8's committed synthetic fixtures. Anything else is refused.

## Routine cycle

1. **Develop** locally on a branch.
2. **Test** the focused suites, TypeScript and build. Compare the full suite against the saved failure baseline: **no new failures**.
3. **Deploy:** fast-forward to `main`, then confirm Vercel Production success for `si8-creator-portal`.
4. **Sign in** as an administrator.
5. **Open** the UAT page and confirm the red synthetic-test notice is showing.
6. **Run** a scenario from the table below.
7. **Inspect** the review page, or reopen an earlier version from the recent-versions list.
8. **Fix and repeat.** There's nothing to close.

If a change includes a migration, apply it once before step 3, using the existing apply-and-verify wrapper. That's the only SQL in the process.

## Standard scenarios

Use `pdf-kling-pro-monthly.pdf`, plus other committed fixtures as needed.

| # | Set up | Expect |
|---|---|---|
| 1 | Kling; receipt linked to Tool 1; findings included | Schema v6; 10 observations, all "Not verified"; 4 limitations; Kling cards show the receipt; Member condition unresolved |
| 2 | Same, linked to no tool | Observations listed; cards say no document is linked |
| 3 | Second fixture linked, not examined | "Linked, but not examined" |
| 4 | No documents | Schema v5; no examination panel; same conclusions as 1–3 |
| 5 | Kling and Pika; Kling receipt on Tool 2 | Only Pika cards link it; provider "Appears to conflict"; conclusions unchanged |
| 6 | Confirm any version | Version fixed; no payment offered |

**Always check:** no payment option, no email received, conclusions unchanged by documents.

## Troubleshooting

| Symptom | Likely cause | Action |
|---|---|---|
| No findings panel | The document stayed on "Not in this version", or the include box was unticked | Correct the answers, link the document, tick include |
| Redirected to the dashboard | Account isn't an administrator | Use an admin account; never change `is_admin` to run a test |
| "Document examination is not available" | Fixture not recognized, or the migration isn't applied | Check the file against the committed fixtures, then the deployment |
| "Findings could not be included" after a receipt-profile change | Two runs exist for that document (`multiple_runs`) | Use a different fixture; report it as a known limit |
| "Examine" re-enables after leaving the page | Display state only | Harmless: it returns the existing run, and logs one more read |
| Evidence quota reached | 24 live documents per user | Re-use existing fixtures. The UAT page has no delete control, and referenced documents are retained by design |
| "The synthetic test inputs are not available" | The synthetic ledger's `refresh_by` date (2027-01-31) has passed | Refresh the synthetic test authority in a reviewed commit |

## Reading results

All synthetic records carry `SYNTHETIC TEST AUTHORITY` in their digest-covered sources, and admin runs carry `execution_boundary = 'admin_synthetic_uat'`. Filter on these for any reporting. Nothing else about a test session needs to be recorded, except a note in the relevant milestone record when a UAT matters for a decision.

## Rules

- Don't upload real customer or personal documents; the lock refuses them, so don't try to work around it.
- Don't change launch locks to run a test.
- Don't edit synthetic records or audit history; they're immutable and stay.
- Don't share the admin session or use a customer's account.

## Stop and escalate

Stop testing and report if you ever see any of these:
- A payment page or Stripe redirect.
- An email from the system.
- Synthetic content on a customer route, or customer data on the UAT page.
- A non-admin reaching the UAT page.
- An observation shown as verified, or any conclusion changing because of a document.

## If the UAT page must be disabled

1. **Immediate:** Vercel Instant Rollback to the previous Production deployment.
2. **Code:** revert the admin UAT commit, or remove the route.
3. **Examination only:** re-apply the previous guard function bodies. History stays valid.

Don't ban or delete accounts as a way of closing access.
