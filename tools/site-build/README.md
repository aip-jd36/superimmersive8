# SI8 marketing site generator

Builds the static marketing pages in `07_Website/` from one source for the shared header, footer and navigation. No
dependencies and no Vercel build step: the generated HTML is committed, and Vercel serves `07_Website/` as static files,
exactly as before.

**Design reference:** the Round 2 design freeze (2026-11-17), held privately. Design acceptance is not publication approval;
see "Release rule" below.

## Layout
| Path | What |
|---|---|
| `site.config.json` | Origin, CRC and sign-in URLs, pages not yet built (`pendingRoutes`), allowed external destinations |
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
node tools/site-build/browser-check.mjs [shotDir]  # browser checks (needs Chrome)
```
Edit `pages/` or `partials/`, run the generator, and commit sources and output together.

## Behaviour in `site.js`
- **Analytics:** GA4 `G-628BLE9N15` loads only on `www.superimmersive8.com` and `superimmersive8.com`. On localhost, Vercel
  previews and any other host there is no script, no `dataLayer` and no request. `book_call_click` on Calendly links is kept
  unchanged (labels `nav`, `hero`, `final_cta`).
- **CRC attribution:** links to `https://app.superimmersive8.com/crc` receive only `utm_source`, `utm_medium`,
  `utm_campaign`, `utm_content` and `ref` from the page URL (unchanged from the v5 homepage).
- **Mobile menu:** button with `aria-expanded`; Escape closes it and returns focus.

## Release rule
`pendingRoutes` lists navigation destinations not built yet (`/creator-record`, `/commercial-assurance`, `/pricing`,
`/enterprise`, `/contact`). The navigation keeps its final links; `--links` reports them as pending, and `--links --release`
fails until the list is empty. Do not merge to `main` (which deploys to Production) while it fails. Publication also depends
on the open gates recorded with the design freeze: prices against Pricing Strategy v3.0, brand and founder claims, contact
delivery and privacy, the synthetic sample, and Creator Record's invitation-only status.
