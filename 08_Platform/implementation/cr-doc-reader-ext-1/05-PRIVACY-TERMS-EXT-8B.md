# CR-DOC-READER-EXT-8B — Privacy Notice and Terms revision: release readiness

**Status: WORDING APPROVED by the founder 2026-11-19 (`JD-CR-DOC-READER-EXT-8C-20261119`, digest `0a6fa5dd…`; internal good-faith review, not a legal opinion or compliance certification). PUBLISHED by CR-DOC-READER-EXT-8D as `privacy-2026-11-19` / `terms-2026-11-19`, effective 2026-11-19; release record below.**
The exact candidate text is built in `08_Platform/app/test-support/legal-candidates-ext-8b.ts` from the live documents
(`privacy-2026-11-09`, `terms-2026-11-18`) by the replacements and insertions below; `__tests__/creator-record/legal-ext-8b.test.ts`
proves nothing else changes. Storage and AI-permission checkbox wording is unchanged.

## Privacy Notice changes

| § | Live | Candidate |
|---|---|---|
| 1 | "…optionally add supporting documents such as receipts or invoices, …" | "…optionally add supporting documents such as receipts, invoices, licences or permissions, …" |
| 2 | "Document readings: … such as who issued it, the plan or product named and dates." | "Document readings: … such as who issued it, the plan, licence or product named, dates, and whether it appears to show details about a person." |
| 4 | (new paragraph after "Adding documents is optional…") | "A licence or permission may name another person or organisation, such as whoever gave a permission. Add one only if you are entitled to share it with SI8 for this purpose. You may cover details that are not needed to show the licence or permission. SI8 does not remove or redact anything from the file you add." |
| 5 | "…SI8 then sends the document and SI8's fixed reading instructions to Anthropic… but the document itself may contain personal information. Anthropic processes…" | "…SI8 then sends the whole document, as you added it, and SI8's fixed reading instructions to Anthropic, the AI model provider SI8 uses. SI8 does not add your name, email address, account details or answers to that request, but the document itself may contain personal information, including about other people. Anthropic processes these requests under its applicable service terms." |
| 5 | (new paragraph after "The reading is automated…") | "For licences and permissions, the reading is instructed not to copy people's names, addresses, email addresses, phone numbers or signatures, and SI8 rejects any such reading that contains an email address or phone number. Your record does not reproduce text from these documents: it shows what kind of document was read, dates, and whether certain details were shown. This applies to what your record shows; the file you added is unchanged, and the reading SI8 keeps may include details the reading was instructed not to copy." |

## Terms §5 change

- "Guidance is currently available for Runway and Higgsfield only, and the tools covered may change." → "Guidance is available only for some AI tools and other services named in the questionnaire, and those covered may change."
- "…and does not show which plan applied to you." → "…and does not show which plan or licence applied to you."

## Release transition (CR-DOC-READER-EXT-8C)

**Zero-interruption release is not possible with the current mechanism.** `creator_record_v2_ai_permission_authority` holds exactly one
row (singleton primary key; updates refused). Both the grant function and the reading guard require the grant's identifier to equal
that row, and each reading request records a grant under the identifier the build computes from the published Notice and Terms. So the
build and the row must change together, and they cannot change at the same instant. Removing the gap would need more than one authorized
identifier at a time, which is a new consent architecture and out of scope.

**What happens in the gap** (new build serving, old row still current), for receipts and any other profile:
- a page from the new build asks for permission under the new identifier; the grant is refused (`creator_record_v2_ai_permission_invalid`):
  nothing is read, sent to Anthropic or charged;
- a page loaded before the deploy sends the old identifier; the new build asks for permission again (`ai_permission_required`);
- stored readings, checkout, issuance and downloads are unaffected (they read no grant; regression test in
  `schema8-payment-issuance.test.ts`, "stored readings after a legal-version change").

Deploy-first and swap-first give the same gap; deploy-first is kept because it matches the documented precedent and its rollback.

### Shortest safe sequence (each step separately authorized)

1. **Decide** the effective date and identifiers (`privacy-YYYY-MM-DD`, `terms-YYYY-MM-DD`, the release day; placeholders
   `privacy-2026-11-20` / `terms-2026-11-20`) and the approval references.
2. **Local release change:** copy the approved paragraphs (digest `0a6fa5dd…`, test-pinned) into `PRIVACY_NOTICE` / `TERMS_OF_SERVICE`;
   update the pins of `privacy-2026-11-09` / `terms-2026-11-18`; `tsc`, targeted and full tests, `next build`.
3. **Preflight (read-only), immediately before:** no paid-but-unissued order; exactly one authority row, the current value; no live
   reading in progress (no `creator_record_v2_live_examination_attempts` row in the last few minutes, count only).
4. **Prepare the swap in advance** (operator, not run yet), as one transaction so the database never has zero rows:
   `BEGIN; DELETE FROM public.creator_record_v2_ai_permission_authority; INSERT INTO public.creator_record_v2_ai_permission_authority
   (permission_version, established_by, reason) VALUES ('cr-v2-ai-permission-1__<privacy>__<terms>', '<operator>', '<approval ref>');
   COMMIT;`
5. **Push** (all three Vercel projects redeploy). The gap starts when `si8-creator-portal` Production is Ready.
6. **Run the swap at once** on Ready (target: under a minute). Confirm exactly one row with the new value.
7. **Verify:** `/privacy` and `/terms` show the new versions; the permission box offers the new identifier; a grant under it is accepted
   (no reading needed: the grant alone proves the row). A chargeable test reading needs its own authorization.

### Rollback

- **Before the swap:** redeploy the previous build (Vercel instant rollback); the old row still matches; nothing else to do.
- **After the swap:** instant rollback to the previous deployment, then the reverse transaction restoring
  `cr-v2-ai-permission-1__privacy-2026-11-09__terms-2026-11-18`. Grants made under the new identifiers stop permitting readings; stored
  readings and records are unaffected. The same short gap applies in reverse.
- If the row is wrong or missing, AI reading stays unavailable (fail closed); fix the row.

## Consequences (confirmed by tests unless marked)

- New storage consents and AI permissions name the new versions; every earlier identifier stops matching. **All existing AI permissions, receipts included, stop permitting new readings** (by design, E7); creators are asked again per document.
- Re-adding identical bytes stored under the earlier consent is refused `consent_outdated` (existing behaviour, `schema8-path.test.tsx`).
- The approved customer wording fingerprint (`d9ab1ccb…`) and the Source Text and questionnaire digests are unchanged, so prepared versions do not become stale from this change alone.
- Readings already recorded stay shown and verifiable for their owner, and invisible to anyone else: projection and the checkout/issuance re-check read no grant (tested, CR-DOC-READER-EXT-8C). Issued records and PDFs are not regenerated.

## Residual risks

- People named in licences and permissions receive no notice of their own.
- Whole originals go to Anthropic and are kept 90–104 days (plus holds and backups); Anthropic's own retention terms apply (organisation settings not verified here).
- The stored reading may contain a name (only emails and phones are enforced); internal only, never shown.
- Receipt readings have no personal-details instruction or email/phone check (receipts are the creator's own billing documents); the Notice therefore scopes those statements to licences and permissions only.

## Release record and closure (CR-DOC-READER-EXT-8D): CLOSED / PRODUCTION RELEASED, 2026-11-19

The Privacy Notice and consent publication gate is **COMPLETE** (founder internal good-faith review; not a legal opinion or compliance
certification; external counsel not commissioned). D5 stays approved with PDF v8 inactive (`pending`); licence reading stays OFF.

**Live:** `privacy-2026-11-19` / `terms-2026-11-19`, effective 2026-11-19, approval references `JD-CR-DOC-READER-EXT-8C-20261119 privacy` /
`… terms`. Paragraph digest `0a6fa5dd56da9e0611518727464ba7e1e98d66acd386e905c29c7e1e9f103e89` (the founder's authorization quoted its last
36 characters); per-document digests `88f91a57…` (44 paragraphs) and `94a06c4e…` (31); undoing exactly the approved changes reproduces the
previous approved digests `5d1da758…` and `b4b21b0a…`. Checkbox wording and its fingerprint (`d9ab1ccb…`) unchanged.

**Preflight (read-only, both attempts):** one authority row with the previous value; no reading in the preceding 30 minutes; no
paid-but-unissued order (two 2026-10-21 rows without an issued artifact are a rejected-payment anomaly and a completed earlier-path PDF, not
open orders); licence switch `off`; v8 `pending`.

**Timeline (UTC, 2026-11-19):**

| Time | Event |
|---|---|
| 07:53:19 | Push `4ed085e1 → cdc022f1` (EXT-7B, 7C, 8B ×3, 8C, publication); fast-forward |
| 07:56:11 | New versions live. Authority-row swap attempted from the engineering session: refused (`cannot execute DELETE in a read-only transaction`); nothing changed |
| 07:56:53 | Documented rollback: push of the revert `dd97e89f` |
| 07:59:34 | Previous versions live again; old row matches; all three Vercel projects success |
| 08:13:41 | Re-release: push `dd97e89f → b7300593` (revert of the rollback; tree identical to `cdc022f1`) |
| 08:15:48 | New versions live |
| 08:17:19 | Founder ran the guarded migration in the Supabase SQL Editor; one row, new value |

**Interruptions** (AI reading unavailable, receipts included; fail closed; no reading attempts and no new grants in either window):
07:56:11–07:59:34 (about 3½ minutes) and 08:15:48–08:17:19 (about 91 seconds).

**Verification after the swap:**
- exactly one authority row: `cr-v2-ai-permission-1__privacy-2026-11-19__terms-2026-11-19`;
- `/privacy` and `/terms` serve the new versions; Vercel `si8-creator-portal`, `superimmersive8`, `superimmersive8-crm` success for `b7300593`;
- new permission grant accepted: a rolled-back probe (founder, SQL Editor) of `creator_record_v2_grant_ai_examination_permission` for an
  internal UAT document under the new identifier returned `granted`; afterwards grants were unchanged (5 total, 0 under the new identifier);
- stored readings preserved: 4 examined readings, unchanged.

**Manual Supabase SQL requirement:** the Supabase access available to engineering sessions is read-only. Authority-row replacements,
migrations and grant probes are prepared as guarded SQL and run by the founder in the SQL Editor, ready before the push so the mismatch window
stays short.

**Migration run (2026-11-19 08:17:19 UTC):**

```sql
BEGIN;
LOCK TABLE public.creator_record_v2_ai_permission_authority IN ACCESS EXCLUSIVE MODE;
DO $$
DECLARE
  v_old  constant text := 'cr-v2-ai-permission-1__privacy-2026-11-09__terms-2026-11-18';
  v_new  constant text := 'cr-v2-ai-permission-1__privacy-2026-11-19__terms-2026-11-19';
  v_rows int;
  v_cur  text;
BEGIN
  SELECT count(*), max(permission_version) INTO v_rows, v_cur FROM public.creator_record_v2_ai_permission_authority;
  IF v_rows <> 1 OR v_cur IS DISTINCT FROM v_old THEN
    RAISE EXCEPTION 'EXT-8D guard: expected exactly one row %, found % row(s), value %', v_old, v_rows, v_cur;
  END IF;
  DELETE FROM public.creator_record_v2_ai_permission_authority WHERE permission_version = v_old;
  INSERT INTO public.creator_record_v2_ai_permission_authority (permission_version, established_by, reason)
  VALUES (v_new, 'JD (PMF Strategy Inc. d/b/a SuperImmersive 8)',
          'CR-DOC-READER-EXT-8D Privacy Notice and Terms release: JD-CR-DOC-READER-EXT-8C-20261119');
  SELECT count(*), max(permission_version) INTO v_rows, v_cur FROM public.creator_record_v2_ai_permission_authority;
  IF v_rows <> 1 OR v_cur IS DISTINCT FROM v_new THEN
    RAISE EXCEPTION 'EXT-8D guard: replacement check failed (% row(s), value %)', v_rows, v_cur;
  END IF;
END $$;
COMMIT;
```

**Rollback** (not used after the swap): Vercel instant rollback to the `dd97e89f` deployment (or push a revert of `b7300593`), then the same
script with `v_old` / `v_new` exchanged and reason `CR-DOC-READER-EXT-8D rollback to privacy-2026-11-09 / terms-2026-11-18`, run only once
`/privacy` shows `privacy-2026-11-09`.

**Remaining licence-reading activation gates:** confirmation of the Production Anthropic spending limit; licence-reader activation (v8
`approved` with v7 `superseded`, `LICENCE_READING_SWITCH` on, redeploy); the synthetic-document Production UAT. Each needs its own
authorization.
