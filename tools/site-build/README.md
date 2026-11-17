# SI8 marketing site generator

Builds the static marketing pages in `07_Website/` from one source for the shared header, footer and navigation. No
dependencies and no Vercel build step: the generated HTML is committed, and Vercel serves `07_Website/` as static files,
exactly as before.

**Design reference:** the Round 2 design freeze (2026-11-17), held privately. Design acceptance is not publication approval;
see "Release rule" below.

## Layout
| Path | What |
|---|---|
| `site.config.json` | Origin, CRC and sign-in URLs, pages not yet built (`pendingRoutes`), allowed external destinations, and `prices`: the single source for every displayed price (`{{PRICE_CR}}`, `{{PRICE_CA_FROM}}`, `{{PRICE_CA_QUALIFICATION}}`) |
| `partials/head.html`, `header.html`, `footer.html` | Shared markup. Placeholders: `{{title}}`, `{{ogTitle}}`, `{{description}}`, `{{canonical}}`, `{{CRC_URL}}`, `{{SIGNIN_URL}}`, `{{current:/route}}` |
| `pages/*.html` | One file per page: a `<!--page {json} -->` header (`route`, `pageId`, `title`, `ogTitle`, `description`) followed by the page's sections |
| `build.mjs` | The generator and its checks |
| `browser-check.mjs` | Headless-Chrome checks of the generated site |
| `../../07_Website/assets/site.css`, `site.js` | Shared styles and behaviour (edited directly; not generated) |

## Commands (from the repository root)
```
node tools/site-build/build.mjs                    # regenerate pages
node tools/site-build/build.mjs --check            # fail if committed pages are stale
node tools/site-build/build.mjs --links            # link check; pending routes reported, allowed
node tools/site-build/build.mjs --links --release  # release link check; pending routes fail
node tools/site-build/browser-check.mjs [shotDir]  # browser checks (needs Chrome); runs the real contact endpoint, delivery mocked
node --test tools/site-build/tests/contact-form.test.mjs   # contact endpoint unit tests (all external calls mocked)
```
Edit `pages/` or `partials/`, run the generator, and commit sources and output together.

**Creator Record calls to action** read "Request access" and lead to `/contact?inquiry=creator_record_access` while Creator
Record is invitation-only in Production (an inquiry only, not account creation or access approval); no page links to sign-up,
checkout or payment (checked by `browser-check.mjs`). The founder has since chosen a public self-service launch
(SI8-WEB-LAUNCH-3A). The call-to-action changes for that launch are planned in
`08_Platform/implementation/si8-web/SI8-WEB-LAUNCH-3A-CREATOR-RECORD-PUBLIC-LAUNCH-READINESS.md`, and are made only once public
access is released and verified.

**Contact page:** `?inquiry=` preselects the inquiry type only if it equals an existing option value (`assurance`,
`enterprise`, `creator_record_access`, `general`); anything else selects `general`. The value is never written into the page.

**Contact form (SI8-WEB-LAUNCH-2).** The page posts JSON to `/api/contact-form` (`07_Website/api/contact-form.js`).
- **Server:**
  - off unless the marketing project has `CONTACT_FORM_ENABLED=true` and `RESEND_API_KEY` (503 otherwise);
  - accepts only SI8 origins (plus `CONTACT_FORM_EXTRA_ORIGINS`, for example a preview) and bodies of at most 8 KB;
  - validates every field;
  - refuses bots (hidden field `website`, minimum 3 s fill time) and limits each connection to 5 per 10 minutes, keeping a
    one-way IP hash in memory only;
  - emails the enquiry from `noreply@superimmersive8.com` to `jd@superimmersive8.com`, with reply-to set to the visitor;
  - logs outcome codes only.
- **Mailing list:** only when the visitor ticks the separate box **and** `KIT_OPT_IN_ENABLED=true`, `KIT_API_SECRET` and
  `KIT_OPT_IN_TAG_ID` are set. The box renders only if `site.config.json` `contactForm.mailingListOptIn` is `true` (currently
  `false`).
- **Founder decisions and the privacy draft:** `08_Platform/implementation/si8-web/`.

## Behaviour in `site.js`
- **Analytics:** GA4 `G-628BLE9N15` loads only on `www.superimmersive8.com` and `superimmersive8.com`. On localhost, Vercel
  previews and any other host there is no script, no `dataLayer` and no request. `book_call_click` on Calendly links is kept
  unchanged (labels `nav`, `hero`, `final_cta`).
- **CRC attribution:** links to `https://app.superimmersive8.com/crc` receive only `utm_source`, `utm_medium`,
  `utm_campaign`, `utm_content` and `ref` from the page URL (unchanged from the v5 homepage).
- **Mobile menu:** button with `aria-expanded`; Escape closes it and returns focus.
- **Contact inquiry preselection and contact form:** see above.

## Release rule
`pendingRoutes` lists navigation destinations not built yet (currently `/privacy`, the Website Privacy Notice draft).
`releaseBlockers` lists conditions a link check cannot see:
- `website-privacy-notice`: the notice is not approved;
- `contact-form-production-config`: Production configuration and a real end-to-end delivery are not confirmed.

`--links --release` fails while either list is non-empty. Do not merge to `main` (which deploys to Production) while it fails.
The founder's publication decisions (tagline, footer, prices, sample placeholder, founder claims, Kit consent, working form)
are recorded in `08_Platform/implementation/si8-web/SI8-WEB-LAUNCH-2-FOUNDER-DECISIONS.md`. They do not open Creator Record
checkout, registration or general availability.
