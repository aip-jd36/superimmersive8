# SI8-UX-2 — Release closure record (Creator Record questionnaire and supporting-document experience)

**Status: RELEASED AND CLOSED (2026-11-17).** Disposition: **GO — functional and historical regression acceptance**, with the
administrative limitations in §7. Founder closure authorization: "SI8-UX-2 — Final Release Closure and Authorized Integration"
(founder instruction, 2026-11-17).

Verification in §3–§5 was read-only: Production database as `supabase_read_only_user`, storage metadata, deployed source, and
SHA-256 of files downloaded through the live application. Nothing in Production was written, regenerated or re-examined.

## 1. Release identity

| | |
|---|---|
| Wording approval | `JD-SI8-UX-2-R2-20261116` (`02-SI8-UX-2-R2-FOUNDER-AUTHORIZATION-RECORD.md`) |
| Release authorization | "SI8-UX-2-R3 — Controlled Production Release" (founder instruction, 2026-11-16) |
| Release plan | `03-SI8-UX-2-CONTROLLED-RELEASE-PLAN.md` |
| Customer wording identity | `d9ab1ccb43e8e983c997d9a80e12aae208f90123a4c3ea02b9cc780c1b2ff070` |
| Source Text | v9 (schema 7) / v10 (schema 8), `8af542da3e6c48c78df8854f78f0da628db22c7035801859913f7b19a427107d` |
| Questionnaire contract | v4, `6c95569de6093999997c2d17cd64d82b66eae56014c0e4423ae084296bdf45e8` |
| PDF templates (unchanged by this release) | v6 schema 7 `a0cd0c24…f476`; v7 schema 8 `5d7ccfc8…61ab`; generator `creator-record-v2-pdf-v4` |

Production builds (Vercel `si8-creator-portal`, all `main`, fast-forward, no force push):

| Step | Commit | Deployment | Note |
|---|---|---|---|
| D1 pause | `5e769a24` | `4utdk7D2K5df9pQf8SpjQRW3Ui95`, success 2026-11-16 23:08:17 UTC | submissions stopped; drain gate passed 23:09 UTC |
| Release | `e9a474de` | `6wX1h7LKn8cDLaLm37AjzPTp4rrZ`, success 2026-11-16 23:12:12 UTC | deployed while paused |
| D3 reopen | `0a8b256a` | `HqrR2GqAk8CYZwZAdNAQYvHLJer2`, 2026-11-16 ~23:15 UTC | tree equals the verified candidate `cae479f8`; UAT ran here |

Rollback target (unused): `Ck2KQgd95mKUdXH1W8JRYxNk14vA`. Never below Build A `60b1d84d`.

**Current state.** Submissions are `'open'` from D3, invitation-only (the invitation list holds only the admin account). No
public access (CR-PUBLIC-1 is separate). No further release action is required.

## 2. Scope delivered

- Multi-step questionnaire (7 steps) with step navigation.
- Supporting documents managed inside each tool section; an existing document can be linked to a tool.
- Tool-association integrity: stable tool identity, "needs a choice" handling when a linked tool is removed or changed, and the
  SI8-UX-2-R1 fix for uploads that complete after re-linking.
- Submission blocked while uploads are in flight or documents need a choice.
- A separate reading view for what documents appear to show.
- Institutional Trust styling for the questionnaire.

Not changed: PDF templates and generator, payment, fulfilment, download/delivery, Living Knowledge, Retrieval, Bounded
Interpretation, Composition, schema, migrations, pricing, the invitation gate.

## 3. Path A — no-document workflow: PASS

| Item | Observed |
|---|---|
| Record | `CR-2026-32D43FC8`; artifact `74c2f527-41d2-41ce-9a0a-2b3b1a34486f`; submission `32d43fc8-3db2-44cf-aaad-92e20b730af5` |
| Declarations | prepared `acd814ae-cd7c-4897-a385-cad72ebed413`, version 1 (the only version), confirmed 02:37:08 UTC; answers fingerprint `b87c2b30…7c7b` printed in the PDF |
| Answers | "SI8-UAT-UX2-A — Harbour Lights (synthetic)"; own channels or portfolio; based Taiwan; shown United States; Runway, Pro, October 2026; no real person; no source material; edited the video |
| Identities | schema 7, builder v5, Source Text v9, contract v4, template v6 `a0cd0c24…` |
| Documents and readings | none: 0 documents, 0 readings, 0 examination attempts, reservations or permissions; comparison disabled |
| Guidance | `CLAIM-RUNWAY-COMMERCIAL-USE-001-v1`, selected from the declared tool; printed verbatim from the record |
| PDF | 5 pages, issued 2026-11-17 02:38:43 UTC; SHA-256 `dffef0095186ee8dc33b5ef759bd3b1f5d3be5ee0ea703bfa9563422c7882006`, 63,163 bytes; downloaded file byte-identical (storage eTag equals its MD5); object never updated |
| Checkout | `cs_live_bglx5jcxXfXF7jDDRp37n34lhQY9kqFJ0VTn3Gz7tnEBRmuPkny4LqsAgB`; subtotal US$29.00, discount US$29.00, total US$0.00, no payment intent |
| Fulfilment | 1 fulfilment, 1 attempt, accepted, no anomaly, no error; 1 artifact |
| Email | provider accepted 02:38:48 UTC (`01a1e75f-0c5c-77fa-aed6-3eed7fe3dff7`); inbox receipt founder-confirmed |

Note: the UAT checklist suggested plan "Standard"; the operator entered "Pro". The record reproduces what was declared.

## 4. Path B — document-reading workflow: PASS

| Item | Observed |
|---|---|
| Record | `CR-2026-1E1AED2D`; artifact `58f7e2c7-4ea8-4be8-9e8e-0227ccd7de20`; submission `1e1aed2d-b5b6-47b2-854b-05d06a198bbd` |
| Declarations | 3 versions of one draft; version 3 `5da695e3…` confirmed 03:14:01 UTC and bound to the purchase. Versions 1–3 have identical answers, document links and guidance; version 3 adds the creator response |
| Answers | "SI8-UAT-UX2-B — Night Market (synthetic)"; Tool 1 Higgsfield, "Not sure", September–October 2026; Tool 2 Runway, Standard, November 2026 |
| Identities | schema 8, builder v7, Source Text v10, contract v4, template v7 `5d7ccfc8…` |
| Document 1 | `SI8-UAT-SI8-UX-2-003_synthetic-runway-receipt.pdf` (`c569755f…`), linked to Tool 1; newly read under AI permission (attempt `13ac4d47…`, 2026-11-17 02:49:48 UTC, one model call, 14,826 micro-USD settled) |
| Document 2 | `SI8-UAT-CR-DESIGN-2D-002-synthetic-runway-receipt.pdf` (`f9e49519…`), not linked to a tool; reading reused from 2026-11-16 (attempt `52733653…`); no new permission, access-log or reservation row |
| Creator response | `other_plan_applies` on Document 1's plan reading, given in version 3 |
| Comparison | method v2 withheld every result (`not_assessed` / `determination_withheld`); the PDF states readings were not compared with declarations |
| PDF | 9 pages, issued 2026-11-17 03:15:41 UTC; SHA-256 `df39285a55e86d91b6cd0d21f756598c243ccd4079cdc7e8212dbf9cd1363d5d`, 91,456 bytes; downloaded file byte-identical (eTag equals its MD5) |
| Checkout | `cs_live_bcAp7ijxAufFo6kV5SHdZ839t8qxdunP9UESNupwcm7Qt7kHctczuV5pcy`; promotion code `COMP-JD2` (founder-confirmed in Stripe); US$29.00 − US$29.00 = US$0.00 |
| Fulfilment | 1 fulfilment, 1 attempt, accepted, no anomaly; 1 artifact |
| Email | provider accepted 03:15:44 UTC (`01a1e780-dc33-7cb3-b325-5df4fe68ca45`); inbox receipt founder-confirmed |

Fingerprint note: `8f4c3888…bfc0` is the hash of the web presentation-template source (`CUSTOMER_WORDING_TEMPLATES_SHA256`, one input to
the customer wording identity) and `5d7ccfc8…61ab` is the approved PDF template v7. They identify different things; neither
changed.

## 5. Historical PDF regression: GO

Both downloaded through the live application on 2026-11-17 after the release, as the admin. The PDF route, delivery, artifact
store and templates are unchanged by this release; delivery re-verifies bytes against the recorded SHA-256 before serving.

| Record | Artifact | Generator | SHA-256 (downloaded = recorded) | Bytes | Pages | Object |
|---|---|---|---|---|---|---|
| `CR-2026-AA5D2711` | `d4f58e08-e393-43de-bd34-2d604d07a9aa` | `creator-record-v2-pdf-v4`, template v7, schema 8 | `41aa0ffa98ef724aa1f94626714b7b8321633f4c60c8a94631a02245e0fd10f7` | 82,646 | 8 | unchanged since 2026-11-16 06:07 UTC |
| `CR-2026-06E8B60A` | `56846d1f-ca68-4e2c-ba65-9fcd329ff444` | `legacy-creator-record-pdf-v1` | `4bfa290fcb7167eb1dbd3889f16036574a77f576585abd67fa3b30a5fa0ae5b1` | 8,818 | 2 | unchanged since 2026-10-29 09:04 UTC |

Both open without repair and contain only their own record number. A truncated legacy digest that appeared in one instruction
was not used; the complete digest above is the recorded one.

## 6. Governance and evidence boundaries

- **Functional acceptance and artifact integrity** (§3–§5) are engineering verifications of this release. They are not a review
  of any video, project or commercial position.
- **Creator Records are self-declared and educational.** Neither UAT PDF states or implies commercial clearance, legal advice or
  human review; both carry the self-declared, not-legal-advice and not-a-clearance statements.
- **AI document readings are automated and not checked by a person.** The PDFs say so.
- **D10 is preserved.** Readings do not validate, contradict, qualify or resolve declarations: the Path B comparison withheld
  every result, guidance was selected from declarations only, and the creator response is recorded as given.
- **Commercial Assurance** (human-reviewed assessment) is a separate product and is not exercised or implied by this release.

## 7. Accepted non-blocking administrative limitations

1. **Path A promotion code identity is unverified.** The ledger records the full discount, not the code. It was an authorized
   100% complimentary code; its name is not recorded.
2. **`COMP-JD2` single-use restriction was not independently verified** (no read-only Stripe access here).
3. **Email delivery** is evidenced by provider acceptance plus founder-confirmed inbox receipt; delivery events are not tracked.
4. **Synthetic-UAT exclusion is manual.** It is documented by record and Checkout session identity; nothing enforces it
   automatically. Both records carry `uat = false`, as at every earlier UAT. They may appear in the admin dashboard and users
   page submission counts, the admin payments list (at US$0.00) and, if a server-side `purchase` event was sent, in GA4 and the
   daily digest / GTM report. Whether GA4 received either event is not established.
5. **No nonzero payment collection is validated.** Every Production payment to date collected US$0.00.

## 8. Synthetic UAT exclusion references

`03-SI8-UX-2-CONTROLLED-RELEASE-PLAN.md`, section "UAT records: exclusion from customer and commercial metrics" (Path A and
Path B, with Checkout session ids). Precedent: `CR-V2-MVP-RELEASE-AUTHORIZATION-1-APPROVAL-RECORD.md` ("UAT flag") and
`cr-design-2c/04-CR-DESIGN-2D-RELEASE-AUTHORIZATION-RECORD.md` §9.

## 9. Disposition

**GO — functional and historical regression acceptance.** SI8-UX-2 is closed. Submissions stay open, invitation-only. Public
access, the dashboard and marketing redesign remain outside this release.

## 10. Evidence and commit references

- Implementation and approvals (rebased, patch-identical): `5e5b71c6` … `0ceb19fc`, `e9a474de`; pause `5e769a24`; reopen
  `0a8b256a`.
- Exclusion documentation: commit `1cd6ff22`; this record and the Path A session-id correction: the closure commit.
- Pre-release verification of `cae479f8`: full suite equal to the 24/89 baseline, `tsc` clean, wording guard OK, `next build`
  exit 0, browser checks 113/113.
- Operator UAT checklist, drain-gate output and the downloaded PDFs are held in SI8's private evidence store (not in this
  public repository).
