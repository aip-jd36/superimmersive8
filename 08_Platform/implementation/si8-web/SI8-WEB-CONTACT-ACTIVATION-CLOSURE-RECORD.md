# SI8-WEB-CONTACT-ACTIVATION — closure record

**Status: COMPLETE — founder verified (2026-11-18).** The marketing-website contact form is live in Production.

## Production state

| Item | Value |
|---|---|
| Vercel project | `superimmersive8` (marketing website) |
| Production commit | `b13ddbe1` (fast-forward from `67dcd65a`) |
| Deployment | `8CLwccBuLFcNwZpKwngZmok176VY`, Ready / Current |
| Website Privacy Notice | `https://www.superimmersive8.com/privacy`, version `website-privacy-2026-11-18`, linked from the footer and the contact form |
| Legacy routes retired (410) | `/sample`, `/api/formspree-to-kit`, `/api/submit` |
| Contact endpoint | `/api/contact-form`, unchanged; `CONTACT_FORM_ENABLED=true` set in Vercel Production by the founder |
| Email delivery | Existing Resend configuration reused without modification; from `noreply@superimmersive8.com` to `jd@superimmersive8.com` |
| Mailing list | Opt-in not offered (`contactForm.mailingListOptIn: false`); enquiries never subscribe anyone |

## Live test (Production, 2026-11-18, founder)

One real enquiry submitted through the public website:
- **Website result:** "Thank you — we'll be in touch."
- **Email:** delivered to `jd@superimmersive8.com`, subject "Website enquiry: General Inquiry", received
  `2026-11-18T05:18:03.795Z`.
- **Content preserved:** name "SI8 Test", the sender address supplied (a founder-controlled address; not recorded here because the
  repository is public), inquiry type General Inquiry, message "Internal test enquiry; no response required".
- **Mailing-list status in the email:** not requested; do not subscribe.

## What this establishes, and what it does not

- **Verified:** a Production submission succeeds, the visitor sees the success message, and the enquiry is emailed to SI8 with its
  details intact and no mailing-list subscription.
- **Not established by the live test** (covered only by the 22 endpoint tests and 24 browser checks, with mocked delivery):
  spam-protection effectiveness (hidden field, minimum fill time, per-connection rate limit, which is per server instance and
  best effort), the delivery-failure message and fallback, and long-term deliverability. No further UAT is scheduled; respond to
  actual incidents if they occur.

## Known inconsistency (not changed here)

`tools/site-build/site.config.json` still lists the `contact-form-production-config` entry under `launchExceptions`. It is
descriptive only (it does not gate the build or the endpoint) and is now out of date. It was left unchanged because this closure is
documentation-only; remove it with the next website change.

## References

- Website Privacy Notice source: `tools/site-build/pages/privacy.html` (authoritative); draft history in
  `WEBSITE_PRIVACY_NOTICE_DRAFT.md` (this folder).
- Founder decisions: `SI8-WEB-LAUNCH-2-FOUNDER-DECISIONS.md` (this folder).
- Endpoint behaviour: `tools/site-build/README.md`, `07_Website/api/contact-form.js`.
