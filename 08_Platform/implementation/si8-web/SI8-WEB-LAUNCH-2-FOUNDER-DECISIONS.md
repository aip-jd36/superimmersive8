# SI8-WEB-LAUNCH-2 — Website founder decisions

**Recorded:** 2026-11-17, from the founder's SI8-WEB-LAUNCH-2 instruction. **Scope:** publication of the Round 2 marketing website
(`work/si8-web-impl-1`). **Status:** local implementation only; no Production deployment is authorized.

The design reference is the Round 2 design freeze (2026-11-17), held privately outside this repository
(`SI8-private-evidence/digital-experience/2026-11-17-round-2-design-freeze/`). Its frozen copy is unchanged by this record.

> **Amended by SI8-WEB-LAUNCH-3A (2026-11-17): Creator Record will launch as a public, self-service $29 product.** The
> invitation-only restriction below (under "What these decisions do not authorize") is **superseded as the intended launch
> state** and kept as history. See "Amendment SI8-WEB-LAUNCH-3A" at the end of this record. Until public access is actually
> released, the site keeps the "Request access" calls to action: no link may point to registration or checkout that is not yet
> open.

## Approved for website publication

| # | Decision | Applies to |
|---|---|---|
| 1 | Keep the "Commercial assurance" wordmark tagline and the footer statement "Independent commercial assurance for AI media." | Every page (header, footer) |
| 2 | Keep public pricing: Creator Record **$29** per record; Commercial Assurance Assessment **From $499**, "Starting at $499. Final pricing depends on project scope and is confirmed before proceeding." | `/creator-record`, `/commercial-assurance`, `/pricing` (single source: `tools/site-build/site.config.json` `prices`) |
| 3 | Keep the sample. See note A. | `/`, `/creator-record` |
| 4 | Keep the founder-led and limited-capacity claims ("Taipei · Founder-led", "Taking on a small number of founding assessments.") | `/commercial-assurance` |
| 5 | Kit mailing-list subscription is allowed **only** through a separate, explicit, unticked-by-default consent. Never automatic. | `/contact`, `07_Website/api/contact-form.js` |
| 6 | Enable a working contact form. | `/contact`, `07_Website/api/contact-form.js` |

## What these decisions do not authorize

**Publication approval is not product or commercial authorization.**
- **Creator Record stays invitation-only.** *(Historical, as decided in SI8-WEB-LAUNCH-2; superseded as the launch state by
  SI8-WEB-LAUNCH-3A. It still describes Production until public access is released.)* These decisions don't authorize public
  checkout, registration, payment or general availability. Every Creator Record call to action reads "Request access" and leads to
  `/contact?inquiry=creator_record_access`, an enquiry, not account creation. No page links to sign-up, checkout or payment;
  `tools/site-build/browser-check.mjs` checks this.
- **No pricing change.** Showing the prices doesn't change `PRICING-STRATEGY-v3.0.md`, the "From $499" scoping practice, or how
  either product is sold. It decides only that the prices may appear on the site.
- **No deployment.** Production release needs a separate authorization.

## Verification against the approved design (2026-11-17)

- **Commercial Assurance** wording promises no certification, clearance or legal conclusion. The page states "Not legal advice ·
  not a certification · not a guarantee of any outcome" and describes "documented findings, limitations and unresolved issues".
- **Creator Record** calls to action are "Request access" and "See a sample record". No purchase flow is linked.
- **Founder-led and limited-capacity** wording is unchanged.
- The built pages' visible text matches the freeze line for line, except:
  - the invitation-only calls to action (IMPL-2);
  - the contact-form changes listed below.

### Notes for the founder

**A. The "synthetic sample" is a labelled placeholder, not a sample record.** No synthetic Creator Record PDF has been made or
approved. The pages show a designed placeholder, labelled on its face "Design placeholder · approved synthetic sample pending",
and its accessible name is "Creator Record PDF, design placeholder". It contains no record ID, name, client or finding, so it
can't be mistaken for a real record or assessment. Decision 3 is applied by keeping this placeholder unchanged. A real synthetic
sample would need its own milestone and approval.

**B. No page states in words that Creator Record is invitation-only.** The calls to action say "Request access". Step 04 on
`/creator-record` reads "Pay $29 once and download your Creator Record", which describes the process. This is not a conflict
with the decisions, but a visitor could still expect to buy straight away. Changing it would change frozen copy, so it was left
as is.

## Additions made for the working contact form (need copy approval)

None of these change frozen copy. They are functional text the freeze did not contain:
- **Contact page:** "Read how we handle what you send in our Website Privacy Notice." (links to `/privacy`).
- **Footer:** a "Privacy" link after "Not legal advice." on every page.
- **Field errors:**
  - "Please enter your name."
  - "Please enter a valid email address."
  - "Please add a few lines about the project or question."
- **Status messages:**
  - "Sending…"
  - "Please check the highlighted fields."
  - "Your message could not be sent. Please try again."
  - "Too many messages have been sent from this connection. Please try again later."
  - "Please wait a few seconds and send again."
  - "Online sending is not available right now."

  Each error ends with "You can also email jd@superimmersive8.com or book a call."
- **Success state:** the frozen "Thank you — we'll be in touch." is unchanged. It is now an `h2` instead of the prototype's `h3`,
  for heading order; it looks the same.
- **Optional mailing-list box:** **built but switched off**, so it doesn't appear on the page. Its proposed wording (consent
  version `contact-optin-1`) is in `tools/site-build/partials/mailing-list-optin.html`: "Also send me occasional emails from
  SI8. This is optional and separate from your enquiry, which is sent either way. You can unsubscribe at any time." Turning it
  on needs:
  - approval of that wording;
  - choosing the Kit tag, and checking what that tag's sequence sends;
  - `contactForm.mailingListOptIn: true`;
  - `KIT_OPT_IN_ENABLED`, `KIT_API_SECRET` and `KIT_OPT_IN_TAG_ID` set on the marketing-site project;
  - a matching Website Privacy Notice section.

## Related

- Website Privacy Notice draft: `WEBSITE_PRIVACY_NOTICE_DRAFT.md` (this folder).
- Generator, release rule and commands: `tools/site-build/README.md`.

## Amendment SI8-WEB-LAUNCH-3A — public Creator Record (2026-11-17)

**Founder decision:** Creator Record is to be publicly available as a $29 self-service product. Any visitor can create an
account, create a Creator Record, pay and access the purchased record. Invitation-only access is no longer the intended launch
state.

**What changes now:** the direction only. The SI8-WEB-LAUNCH-2 invitation-only decision above is kept as the historical
record.

**What does not change yet:**
- Public registration and checkout are not activated in this milestone.
- Production stays invitation-only: `creator_record_v2_pilot_access`, enforced in the application.
- The website keeps "Request access".

**Activation is a separate, authorized release.** Its readiness, blockers and sequence are in
`SI8-WEB-LAUNCH-3A-CREATOR-RECORD-PUBLIC-LAUNCH-READINESS.md` (this folder). The planned website call-to-action changes are listed
there and are made only when public access is released and verified.

Decisions 1–6 above are unchanged.
