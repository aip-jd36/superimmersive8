# Creator Record Terms of Service — public-access revision (DRAFT)

**Status: DRAFT — NOT APPROVED — NOT PUBLISHED.** CR-PUBLIC-1, 2026-11-18.

- **Base:** the published Terms `terms-2026-11-14` (`08_Platform/app/lib/legal/policies.ts`, approval
  `JD-CR-V2-MVP-RELEASE-AUTHORIZATION-1-20261114 terms`). Nothing in the application uses this draft.
- **Proposed version identifier:** `terms-<publication date>`, for example `terms-2026-11-25`.
- **Effective date:** the Production publication date. Both are assigned at approval.

## The change

One sentence, in §2. Nothing else changes. Product boundaries, user responsibilities, price and payment, refunds,
AI-reading permission, document and evidence limits, privacy references, liability, governing law and contact are carried over
verbatim.

| | Text |
|---|---|
| Published (`terms-2026-11-14`) | ~~Creator Record is currently available by invitation only.~~ |
| Proposed | **Anyone who creates an SI8 account can prepare and buy a Creator Record.** |

The rest of §2 is unchanged: "You must be at least 18 years old. Individuals and businesses may both buy Creator Records; if
you use it for a business, you confirm that you may accept these Terms for it. You are responsible for keeping your sign-in
details secure and for activity under your account."

**Why this wording:**
- It states availability only. It adds no service level, guarantee or new commercial promise.
- The age, business-use and account-security conditions that follow it still apply to everyone.
- §6 (US$29 through Stripe, promotional codes may reduce the price, order confirmed on Stripe's confirmation) and §8 (refunds)
  already describe self-service and are unchanged, as decided (existing discount policy retained).

The Creator Record Privacy Notice `privacy-2026-11-09` doesn't mention invitations and needs no change for public access.

## Full proposed text

Creator Record Terms of Service

These Terms apply to Creator Record, the service at app.superimmersive8.com provided by PMF Strategy Inc., doing business as SuperImmersive 8 ("SI8", "we" or "us"). You agree to these Terms when you confirm them in the Creator Record questionnaire, and they apply to every Creator Record you prepare or buy. The Creator Record Privacy Notice explains how we handle personal information.

1. What Creator Record is

A Creator Record is a private PDF that contains what you told SI8 about an AI-assisted video, educational guidance about the published terms of certain AI tool providers and, if you added documents and asked for them to be read, what an automated reading reports each document appears to show.

Creator Record is self-declared and automated. No person at SI8 reviews your video, your answers, your documents or the readings. It is not legal advice, not a clearance, not a decision that your video may be used commercially, and not SI8's human-reviewed Commercial Assurance Assessment.

2. Who can use Creator Record

**Anyone who creates an SI8 account can prepare and buy a Creator Record.** You must be at least 18 years old. Individuals and businesses may both buy Creator Records; if you use it for a business, you confirm that you may accept these Terms for it. You are responsible for keeping your sign-in details secure and for activity under your account.

3. Your answers and documents

You confirm that what you tell SI8 is accurate to the best of your knowledge. Add only documents you are entitled to share, and remove details that are not needed, such as card numbers, home addresses and other people's personal information. SI8 does not check that any document is genuine, complete or current, or that it belongs to you.

4. Automated readings

If you give permission, an AI model reads a document you choose and reports what it appears to show. Readings may be incomplete or wrong, and no person checks them. You can mark a reading as wrong before you buy; your response is printed beside it but does not change it. Readings are not used to select or change the guidance, and they do not change your answers. SI8 does not decide whether a reading matches what you told SI8.

5. Educational guidance

Guidance is currently available for Runway and Higgsfield only, and the tools covered may change. It describes each provider's own published terms as SI8 last read them. Providers change their terms, and the terms that applied to your account when you made your video may differ. Guidance is general, is not a determination about your video, your account or your use, and does not show which plan applied to you. Other tools and services can be listed in your record but receive no guidance; that is not a finding about them.

6. Price and payment

A Creator Record costs US$29, paid once through Stripe when you buy it. Promotional codes may reduce the price. You review your record before you pay. Your order is confirmed only after Stripe confirms successful payment. If checkout is interrupted or a charge appears incorrect, contact SI8 so we can investigate.

7. Issuing your record

After payment, your PDF is prepared automatically and made available on your dashboard. If it cannot be prepared automatically, it waits for SI8 and we will contact you. A record that uses a document for which you withdrew AI-reading permission, or a document deleted before the record was issued, cannot be issued automatically.

An issued record cannot be changed. If your answers change, you can prepare and buy a new record.

8. Refunds

If SI8 cannot deliver a Creator Record you paid for, including because permission was withdrawn or a required document was deleted before issuance, we will refund that purchase in full. If your order is paused, contact jd@superimmersive8.com for assistance. Refunds are made manually through Stripe to the original payment method where possible. Once a record is issued, we do not ordinarily refund a change of mind, but we will review billing errors, material service errors and any refund or cancellation rights required by applicable law. Nothing in these Terms limits rights that cannot lawfully be excluded.

9. Your information

How SI8 handles personal information, how long documents are kept and how to ask for deletion are described in the Creator Record Privacy Notice.

10. Use of the service

Do not use Creator Record to upload material you are not entitled to share, to interfere with the service or other users, or for unlawful purposes. SI8 may suspend an account that does so.

11. Our responsibility to you

Creator Record provides automated educational information. It does not guarantee commercial clearance, third-party rights or fitness for a particular project, and SI8 does not guarantee that the service will be uninterrupted or error-free. To the extent permitted by applicable law, SI8 is not responsible for decisions made by treating a Creator Record as rights clearance, or for indirect or consequential loss, and SI8's total liability for a Creator Record is limited to the amount you paid for it. Nothing in these Terms excludes or limits liability, or consumer rights, that cannot lawfully be excluded or limited.

12. Changes

We may update these Terms. Each version has its own version identifier and effective date. You may be asked to agree to the new version before you continue to use Creator Record.

13. Governing law and disputes

These Terms are governed by the laws of the State of Texas, United States, without affecting any mandatory consumer protection of the country where you live. Disputes may be brought in the courts of Texas, or in the courts where you live if the law gives you that right. Before starting a claim, please contact jd@superimmersive8.com so we can try to resolve it.

14. Contact

PMF Strategy Inc., doing business as SuperImmersive 8
Email: jd@superimmersive8.com

## What a new Terms version changes in the system

Both authorization identifiers embed the Terms version (`lib/creator-record-flow/authorization-versions.ts`):
- storage consent: `cr-v2-storage-consent-1__privacy-2026-11-09__terms-<new>`;
- AI permission: `cr-v2-ai-permission-1__privacy-2026-11-09__terms-<new>`.

The database accepts an AI-reading grant only for the identifier in `creator_record_v2_ai_permission_authority` (migration
`20261113000000`): one row, changed only by delete and insert. Therefore:
- From the moment the new build is live until the operator replaces the row, **AI reading is unavailable (fail closed).** A
  grant under the new identifier is refused because the row still names the old one.
- After the row is replaced, every grant made under `terms-2026-11-14` **stops permitting examination**. Each creator must give
  the current permission again. Grants stay in the append-only table as history.
- New uploads record the new storage-consent identifier. A file added under the earlier version can't be reused under the new
  one (existing wording: "You added this file earlier under a previous version …").
- Purchases refuse while either policy is incomplete (`legalPoliciesApproved`, 503 `unavailable`), so an incomplete Terms entry
  can't open checkout.

These identifiers are pinned by `__tests__/creator-record/cr-public-terms-versioning.test.ts`.

## Production sequencing

This mirrors the Terms 2026-11-14 change (`CR-V2-MVP-RELEASE-AUTHORIZATION-1-APPROVAL-RECORD.md` §5). Each step needs its own
authorization.

1. **Founder approval** of the text above, with the effective date and an approval reference.
2. **Release change (engineering, local):**
   - `TERMS_OF_SERVICE` gets the new version, effective date, approval reference and §2 sentence;
   - update the tests that pin `terms-2026-11-14`;
   - `CREATOR_RECORD_V2_ACCESS` stays `'invitation'`;
   - run `tsc`, the targeted and full tests, and `next build`.
3. **Preflight (read-only):**
   - no paid-but-unissued Creator Record order;
   - exactly one authority row (the current one);
   - note any in-progress drafts, which are admin-only today.
4. **Deploy the Terms build** (invitation-only). `/terms` shows the new version. AI reading is unavailable until step 5.
5. **Operator, the same session:**
   - delete the authority row and insert `cr-v2-ai-permission-1__privacy-2026-11-09__terms-<new>`. This is the operator's
     "section W" step used for `terms-2026-11-14`; the operator script is not in this repository, so confirm its current copy
     before use;
   - confirm exactly one row with that value.
6. **Verify:**
   - `/creator-record` offers the AI permission with the new identifier;
   - a grant under the new identifier is accepted;
   - a document granted only under `terms-2026-11-14` is not examined (asks for permission again);
   - a real model reading by an internal account under the new grant (chargeable; separately authorized).

**Failure conditions and rollback:**
- **The authority row is not replaced, or is wrong:** AI reading stays unavailable. This is safe and fails closed. Fix: replace
  the row.
- **Terms incomplete or malformed:** `legalPoliciesApproved` is false and purchases refuse (503). Fix: correct and redeploy.
- **Roll back to the `terms-2026-11-14` build:** the identifiers revert. The operator must restore the old authority row (delete
  and insert `…__terms-2026-11-14`), otherwise AI reading stays unavailable (safe). Grants made under the new version stop
  permitting examination.
- **Never** deploy a build without the takeover guard (Creator Record README).
