# Legacy website retirement — 2026-11-17

**Status:** implemented and checked locally; **not pushed, not deployed.** Production still serves the legacy pages until a
separately authorized release.

## Authorization

Founder instruction "SI8 — Legacy Website Retirement v2" (2026-11-17), which:
- supersedes the earlier four-route scope;
- confirms that the old `/pricing` URL is no longer shared with prospects;
- authorizes implementation and local verification, **not** Production deployment.

**Reason:** these pages belong to previous SI8 website designs (v3 and v4) and their snapshots. The current site is the v5 homepage
(`07_Website/index.html`, unchanged).

## Retired routes (marketing site, `www.superimmersive8.com`)

Each directory below now returns **HTTP 410 Gone**. The bare path, the trailing-slash form, `index.html` and every file beneath it
are covered.

| Route prefix | What was served | Files removed from `07_Website/` |
|---|---|---|
| `/pricing` | v4 pricing page | `pricing/index.html` |
| `/how-it-works` | v4 how-it-works page | `how-it-works/index.html` |
| `/rights-verified` | v4 Rights Verified overview, `chain-of-title/`, `playbook/` | 3 pages |
| `/zh` | v4 Traditional Chinese homepage and its `how-it-works/`, `pricing/`, `rights-verified/` (incl. `chain-of-title/`, `playbook/`) | 6 pages |
| `/_archive` | v3 site files archived March 2026 (homepage, pricing, Rights Verified pages, submit form, terms, README, CSS/JS) | 20 files |
| `/_versions` | full snapshots `v4-2026-07-12` and `v5-2026-07-12`, plus README | 37 files |

## Mechanism

1. **The files are removed from the deployed tree.** On Vercel, a static file is served before any `vercel.json` rewrite is
   applied, and a redirect cannot return 410, so the files themselves had to go. Their source remains in Git history and in the tags
   `marketing-site-v4` (`c3e7fb75`) and `marketing-site-v5` (`025b52ce`), both present on `origin`.
2. **`07_Website/vercel.json` gains 12 rewrites**: `/<dir>` and `/<dir>/:path*` for each of the six prefixes, all to `/api/gone`.
   The patterns are anchored to those directory names only; the 7 existing redirects are unchanged.
3. **`07_Website/api/gone.js`** returns `410` with the plain-text body `410 Gone`, `X-Robots-Tag: noindex` and a one-hour cache.

**Restoring a snapshot** (formerly in `_versions/README.md`): `git checkout marketing-site-v5 -- 07_Website/` (or
`marketing-site-v4`) on a working branch, then review and redeploy.

## Showcase navigation (creator app, `app.superimmersive8.com/showcase`)

`08_Platform/app/app/showcase/page.tsx` linked to retired pages. Removed:
- the nav links "How It Works" and "Pricing";
- the "Rights Verified" dropdown (Overview, Full Playbook, Chain of Title) and its now-unused state;
- the EN / 繁體中文 toggle (the `/zh` link);
- the "See Pricing" button beside "Get Your Film Verified".

Nothing was added, and no other Showcase content or behaviour changed: the catalog, video modal, licensing form, Login dropdown,
"Get Verified" and the logo link to the homepage all remain.

## Pricing strategy

`01_Business/pricing/PRICING-STRATEGY-v3.0.md`, "Website pricing" now records that the instruction to share the unlisted `/pricing`
page is superseded by the founder's 2026-11-17 decision. There is no public pricing page. No price or other pricing decision
changed.

## Verification

| Check | Result |
|---|---|
| No HTML left under the six retired prefixes; remaining HTML in `07_Website/` is `index.html` and `sample/index.html` | PASS (`git ls-files`) |
| Rewrite patterns: 31 retired variants match (bare, trailing slash, `index.html`, nested subpages, snapshot and archive files); 16 current paths do not (`/`, `/index.html`, `/favicon.svg`, `/og-image.png`, `/sample`, `/styles.css`, `/api/*`, `/record`, `/certify`, `/catalog`, look-alikes such as `/pricingx`, `/zhx`) | PASS (Next.js's bundled `path-to-regexp`, the syntax Vercel's `source` uses) |
| `api/gone.js` returns 410, body `410 Gone`, `noindex` | PASS (Node, mock response) |
| No app source links to a retired route | PASS (`git grep`) |
| Creator app type-check and production build | PASS: `tsc --noEmit` exit 0; `next build` exit 0 with placeholder environment values. In the built `/showcase` page: no retired links; nav keeps the logo, Showcase, Login and Get Verified |
| Homepage file unchanged; no change to Creator Record, CRC, payments, GA4 or access controls | PASS (diff limited to the files listed below) |
| **Route behaviour on Vercel itself** | **NOT RUN.** The Vercel CLI here has no credentials, so `vercel dev` could not run. Confirm on a Preview deployment before Production (below). |

If a rewrite did not match on Vercel, the path would return 404 rather than 410. The legacy content would still not be served,
because the files are gone.

## Remaining public legacy routes (outside this scope)

- `/sample`: the v4 "Urban Drift" sample Chain of Title page, not linked from the v5 homepage.
- Root assets used by the v4 pages: `styles.css`, `script.js`, `si8-logo.svg`, `images/*.png`. They are not pages.
- Root documentation files served as text: `DEPLOYMENT.md`, `MIGRATION_v4.md`, `SPAM_PROTECTION.md`, `TROUBLESHOOTING.md`.
- The Showcase page itself still carries earlier-generation wording ("Get Verified", "Verification from $29"). Not changed here.

## Deployment

Two Vercel projects deploy from `main`. Both would redeploy on a push:
- **`superimmersive8` (marketing site, root `07_Website/`):** the retirement takes effect.
- **`si8-creator-portal` (creator app):** the Showcase navigation change takes effect.

**Before Production:** push the branch (not `main`) to get Preview deployments for both projects. On the marketing preview, check:
- a sample of retired variants returns 410;
- `/`, `/favicon.svg`, `/sample` and the form functions still work.

Check that the Showcase preview renders. Then fast-forward `main`.
