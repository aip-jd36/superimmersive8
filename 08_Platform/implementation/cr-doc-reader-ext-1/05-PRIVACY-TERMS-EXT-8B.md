# CR-DOC-READER-EXT-8B — Privacy Notice and Terms revision: release readiness

**Status: WORDING APPROVED by the founder 2026-11-19 (`JD-CR-DOC-READER-EXT-8C-20261119`, digest `0a6fa5dd…`; internal good-faith review, not a legal opinion or compliance certification). NOT PUBLISHED.**
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
