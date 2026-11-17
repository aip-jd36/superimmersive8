# Website Privacy Notice — DRAFT

**Status: DRAFT — NOT APPROVED — NOT PUBLISHED.** SI8-WEB-LAUNCH-2, 2026-11-17. No version or effective date is assigned.

This draft is not served. `/privacy` on www.superimmersive8.com is not built; it is listed in `pendingRoutes`, and the release
check fails while it is (`tools/site-build/site.config.json`, blocker `website-privacy-notice`). The footer and contact-page links
to `/privacy` therefore lead nowhere until an approved page is published.

It covers the marketing website only. It is separate from the Commercial Readiness Check Privacy Notice
(`app.superimmersive8.com/crc/privacy`) and the Creator Record Privacy Notice (`app.superimmersive8.com/privacy`). Each of those
already says it does not cover the marketing website.

## Verified data flows (branch `work/si8-web-impl-1`, 2026-11-17)

| Flow | What happens | Evidence | Status |
|---|---|---|---|
| Hosting | Vercel serves the pages and runs the contact endpoint | `07_Website/vercel.json`; Vercel project `superimmersive8` | Implemented. **Vercel's own request logging and its retention: not verified** |
| Fonts | Every page loads Google Fonts from `fonts.googleapis.com` / `fonts.gstatic.com`, so Google receives the visitor's IP address and browser details | `tools/site-build/partials/head.html` | Implemented |
| Analytics | Google Analytics 4 (`G-628BLE9N15`) loads only on `www.superimmersive8.com` / `superimmersive8.com`, when the page opens. There is no consent step and no setting to turn it off | `07_Website/assets/site.js`; browser check | Implemented |
| Website storage | The redesigned pages set no cookie of their own and use no browser storage | `07_Website/assets/site.js` (no `document.cookie`, `localStorage` or `sessionStorage`) | Implemented |
| Contact form | Name, work email, inquiry type and brief description are sent to `/api/contact-form` and validated there | `07_Website/api/contact-form.js` | Implemented locally; off in Production until `CONTACT_FORM_ENABLED=true` |
| Enquiry delivery | Sent as an email through Resend from `noreply@superimmersive8.com` to `jd@superimmersive8.com` (SI8's inbox, hosted by Google per the domain's mail records), with the visitor's address as reply-to. The website keeps no database or file of enquiries | same | Implemented locally. **Resend's retention of sent messages: not verified** |
| Logs | The endpoint logs outcome codes only (for example `delivered:not_requested`, `rate_limited`): never a name, address, message or IP | same; unit test | Implemented |
| Spam prevention | A hidden field; a minimum time between loading and sending; JSON from SI8's site only; size limits; at most 5 enquiries per connection per 10 minutes | same | Implemented. The limit keeps a one-way hash of the IP address in the server's memory for up to 10 minutes and never writes it anywhere. It is per server instance, so it is best effort |
| Kit mailing list | Only if a visitor ticks a separate, unticked box **and** the opt-in is enabled. Otherwise never | same; unit tests | **Built, switched off.** The box is not on the page |
| Links out | CRC (app.superimmersive8.com, receives `utm_*` and `ref` from the page address), Sign in (app), Calendly (shown only if sending fails) | `site.js`, pages | Implemented |
| **Legacy `/sample` page** | Still served. It loads Google Analytics directly and **Contentsquare (session recording, project 715376)** | `07_Website/sample/index.html`; live page checked 2026-11-17 | **Not covered by the text below**, see blocker 1 |
| **Legacy endpoints** | `/api/formspree-to-kit` (adds every submitter to Kit) and `/api/submit` (Airtable) are still deployed; no page calls them | `07_Website/api/` | **Contradicts the Kit-consent decision if called**, see blocker 2 |

## Blockers before this notice can be published accurately

1. **`/sample`:** retire it, or remove Contentsquare and the direct GA tag from it. Otherwise the notice must also describe
   session recording.
2. **Legacy endpoints:** retire `/api/formspree-to-kit` and `/api/submit` (for example to `/api/gone`, as for the other retired
   paths), or the statement "never automatically subscribed" is not true of the whole site.
3. **Contact form in Production:** confirm the marketing project's `RESEND_API_KEY` can send from `noreply@superimmersive8.com`,
   set `CONTACT_FORM_ENABLED=true`, and deliver one real enquiry end to end.
4. **Kit section:** include it only if the opt-in is switched on, with its wording and tag approved.
5. **Your approval** of the text, with a version identifier and effective date.

---

## Website Privacy Notice

PMF Strategy Inc., doing business as SuperImmersive 8 ("SI8", "we" or "us")

Version [to be assigned on approval] · Effective [to be assigned on approval]

This notice explains how SI8 handles personal information on its website at www.superimmersive8.com. The Commercial Readiness
Check and Creator Record each have their own privacy notice. This notice does not cover them.

### 1. Information we collect

- **When you browse:** technical information your browser sends, such as your IP address, browser and device type, and the
  pages you view. Our hosting provider receives this to serve the site, and Google receives it when the site loads its fonts and,
  on www.superimmersive8.com, Google Analytics (section 3).
- **When you contact us:** your name, work email, the inquiry type you choose and your message.

The website itself does not ask you to create an account or make a payment.

### 2. How we use it

- To show you the website and keep it working.
- To understand how the site is used (section 3).
- To read and reply to your enquiry, and to keep a record of our correspondence.
- To protect the contact form from automated and repeated submissions.

### 3. Analytics and cookies

The website uses Google Analytics to understand how it is used. Google Analytics loads when you open the site and uses cookies or
similar technologies to collect technical information about your device, your browser and how you use the pages. The website
does not provide a setting to turn it off. You can block analytics or cookies through your browser settings or a browser
extension.

The website's own pages do not set other cookies.

### 4. Contact form

Your enquiry is sent to SI8 by email and kept in SI8's email inbox. The website does not keep a separate copy. Your email address
is used as the reply address so that we can answer you.

To stop automated and repeated submissions, the form includes a hidden field and a minimum time before sending, and we limit how
many enquiries can be sent from one connection in a short period. For that limit, a one-way code derived from your IP address is
held briefly in the server's memory and is not stored.

Sending an enquiry does not add you to any mailing list.

[INCLUDE ONLY IF THE OPT-IN IS SWITCHED ON:] ### 5. Optional mailing list
If you tick the separate mailing-list box on the contact form, we add your name and email address to SI8's mailing list, run by
Kit, and you may receive occasional emails from SI8. The box is unticked unless you tick it, and your enquiry is sent either way.
You can unsubscribe using the link in any of those emails, or by emailing jd@superimmersive8.com.

### 6. Service providers

- Vercel: website hosting, and running the contact form.
- Google: fonts, Google Analytics, and SI8's email inbox, which receives enquiries.
- Resend: delivering contact-form enquiries to SI8.
- [IF THE OPT-IN IS SWITCHED ON:] Kit: the optional mailing list.

Links to the Commercial Readiness Check, sign-in and booking pages take you to services covered by their own notices and terms.
These providers process information to provide their services to SI8. We do not sell your personal information.

### 7. Where information is processed

SI8 and its service providers may store and process information in countries other than the one where you live, including the
United States.

### 8. How long we keep information

We do not currently delete information automatically. Enquiries are kept in SI8's email inbox until they are deleted. Copies may
remain in our service providers' systems and backups until they are deleted or expire. We are reviewing our retention practices
and may introduce additional retention limits. We will update this notice when those practices change.

### 9. Your requests

You can ask to access, correct or delete personal information you have sent us through the website by emailing
jd@superimmersive8.com. We review each request individually and may ask you to confirm that you control the email address
involved. Some records may need to be kept, for example records of our correspondence. If we keep any information, we will tell
you what we kept and why.

Depending on where you live, you may have other rights over your personal information. To ask about them, email
jd@superimmersive8.com.

### 10. Changes to this notice

We may update this notice. Each version has its own version identifier and effective date.

### 11. Contact

PMF Strategy Inc., doing business as SuperImmersive 8
Email: jd@superimmersive8.com
