# CR-DOC-READER-EXT-8B — Privacy Notice and Terms revision: release readiness

**Status: APPROVED IN PRINCIPLE (founder, internal good-faith review; not a legal opinion or compliance certification). NOT PUBLISHED.**
The exact candidate text is built in `08_Platform/app/test-support/legal-candidates-ext-8b.ts` from the live documents
(`privacy-2026-11-09`, `terms-2026-11-18`) by the replacements and insertions below; `__tests__/creator-record/legal-ext-8b.test.ts`
proves nothing else changes. Storage and AI-permission checkbox wording is unchanged.

## Privacy Notice changes

| § | Live | Candidate |
|---|---|---|
| 1 | "…optionally add supporting documents such as receipts or invoices, …" | "…optionally add supporting documents such as receipts, invoices, licences or permissions, …" |
| 2 | "Document readings: … such as who issued it, the plan or product named and dates." | "Document readings: … such as who issued it, the plan, licence or product named, dates, and whether it appears to show details about a person." |
| 4 | (new paragraph after "Adding documents is optional…") | "A licence or permission may name another person or organisation, such as whoever gave a permission. Add one only if you are entitled to share it with SI8 for this purpose. You may cover details that are not needed to show the licence or permission. SI8 does not remove or redact anything from the file you add." |
| 5 | "…SI8 then sends the document and SI8's fixed reading instructions to Anthropic… but the document itself may contain personal information. Anthropic processes…" | "…SI8 then sends the whole document, as you added it, and SI8's fixed reading instructions to Anthropic, the AI model provider SI8 uses. SI8 does not add your name, email address, account details or answers to that request, but the document itself may contain personal information, including about other people. The reading is instructed not to copy people's names, addresses, email addresses, phone numbers or signatures, and SI8 rejects any reading that contains an email address or phone number. Anthropic processes these requests under its applicable service terms." |
| 5 | (new paragraph after "The reading is automated…") | "For licences and permissions, your record does not reproduce text from the document: it shows what kind of document was read, dates, and whether certain details were shown. This applies to what your record shows; the file you added is unchanged, and the reading SI8 keeps may include details the reading was instructed not to copy." |

## Terms §5 change

- "Guidance is currently available for Runway and Higgsfield only, and the tools covered may change." → "Guidance is available only for some AI tools and other services named in the questionnaire, and those covered may change."
- "…and does not show which plan applied to you." → "…and does not show which plan or licence applied to you."

## Release sequence (mirrors the Terms 2026-11-14 / 2026-11-18 changes; each step needs its own authorization)

1. **Final approval** of the text, with the real version identifiers (placeholders: `privacy-2026-11-20`, `terms-2026-11-20`), effective dates and approval references.
2. **Release change (local):** copy the candidate paragraphs into `PRIVACY_NOTICE` and `TERMS_OF_SERVICE` in `lib/legal/policies.ts`; update the tests that pin `privacy-2026-11-09` / `terms-2026-11-18`; run `tsc`, the targeted and full tests and `next build`.
3. **Preflight (read-only):** no paid-but-unissued Creator Record order; exactly one row in `creator_record_v2_ai_permission_authority` (`cr-v2-ai-permission-1__privacy-2026-11-09__terms-2026-11-18`).
4. **Deploy.** From this moment until step 5, AI reading (receipts included) is unavailable: fail closed.
5. **Operator, same session:** delete the authority row and insert `cr-v2-ai-permission-1__<privacy-version>__<terms-version>` (the operator's "section W" step; the table refuses in-place updates). Confirm exactly one row with that value.
6. **Verify:** `/privacy` and `/terms` show the new versions; a new grant under the new identifier is accepted; a document granted only under the old identifier asks for permission again.

**Rollback:** redeploy the previous build and restore the previous authority row (delete and insert). Grants made under the new version then stop permitting examination.

## Consequences (confirmed by tests unless marked)

- New storage consents and AI permissions name the new versions; every earlier identifier stops matching. **All existing AI permissions, receipts included, stop permitting new readings** (by design, E7); creators are asked again per document.
- Re-adding identical bytes stored under the earlier consent is refused `consent_outdated` (existing behaviour, `schema8-path.test.tsx`).
- The approved customer wording fingerprint (`d9ab1ccb…`) and the Source Text and questionnaire digests are unchanged, so prepared versions do not become stale from this change alone.
- Readings already recorded stay in the records that reference them (inferred from the code: checkout and issuance re-verify readings, not permission versions).

## Residual risks

- People named in licences and permissions receive no notice of their own.
- Whole originals go to Anthropic and are kept 90–104 days (plus holds and backups); Anthropic's own retention terms apply (organisation settings not verified here).
- The stored reading may contain a name (only emails and phones are enforced); internal only, never shown.
