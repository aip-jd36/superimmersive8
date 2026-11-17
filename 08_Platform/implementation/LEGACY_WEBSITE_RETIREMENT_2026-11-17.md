# Legacy website retirement — 2026-11-17

**Status:** **released to Production 2026-11-17** (`main` = `9c724e8751361a91dd7cc83d00a1a6ef3712babd`, fast-forward from
`fe0cfbf5`). Production behaviour observed after release is in "Production verification" below; it differs from the local
pattern test for trailing-slash paths.

## Authorization

Founder instruction "SI8 — Legacy Website Retirement v2" (2026-11-17), which:
- supersedes the earlier four-route scope;
- confirms that the old `/pricing` URL is no longer shared with prospects;
- authorizes implementation and local verification, **not** Production deployment.

**Reason:** these pages belong to previous SI8 website designs (v3 and v4) and their snapshots. The current site is the v5 homepage
(`07_Website/index.html`, unchanged).

## Retired routes (marketing site, `www.superimmersive8.com`)

The six route prefixes below are retired: their files are no longer deployed. The intended response was **HTTP 410 Gone**. In
Production, the tested paths without a trailing slash return 410 and the tested trailing-slash paths return 404 (see
"Production verification").

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
| Rewrite patterns (local prediction): 31 retired variants matched (bare, trailing slash, `index.html`, nested subpages, snapshot and archive files); 16 current paths did not (`/`, `/index.html`, `/favicon.svg`, `/og-image.png`, `/sample`, `/styles.css`, `/api/*`, `/record`, `/certify`, `/catalog`, look-alikes such as `/pricingx`, `/zhx`) | Local test only (Next.js's bundled `path-to-regexp`). **Not borne out on Vercel for trailing-slash paths**, which return 404 in Production |
| `api/gone.js` returns 410, body `410 Gone`, `noindex` | PASS (Node, mock response) |
| No app source links to a retired route | PASS (`git grep`) |
| Creator app type-check and production build | PASS: `tsc --noEmit` exit 0; `next build` exit 0 with placeholder environment values. In the built `/showcase` page: no retired links; nav keeps the logo, Showcase, Login and Get Verified |
| Homepage file unchanged; no change to Creator Record, CRC, payments, GA4 or access controls | PASS (diff limited to the files listed below) |
| Route behaviour on Vercel before release | **NOT RUN.** The Vercel CLI here has no credentials, and the Preview deployments are behind Vercel Authentication. The founder accepted releasing without Preview route testing. |

Where a rewrite does not match on Vercel, the path returns 404 rather than 410. That is what Production shows for trailing-slash
paths; no legacy content is served either way, because the files are no longer deployed.

## Remaining public legacy routes (outside this scope)

- `/sample`: the v4 "Urban Drift" sample Chain of Title page, not linked from the v5 homepage.
- Root assets used by the v4 pages: `styles.css`, `script.js`, `si8-logo.svg`, `images/*.png`. They are not pages.
- Root documentation files served as text: `DEPLOYMENT.md`, `MIGRATION_v4.md`, `SPAM_PROTECTION.md`, `TROUBLESHOOTING.md`.
- The Showcase page itself still carries earlier-generation wording ("Get Verified", "Verification from $29"). Not changed here.

## Deployment

Released 2026-11-17 under the founder's Production release authorization, without authenticated Preview route testing (accepted).
`main` fast-forwarded `fe0cfbf5` → `9c724e87`, no force. All three Vercel projects that deploy from this repository built
successfully on Preview and Production:

| Project | Production deployment | Previous Production deployment (rollback target) |
|---|---|---|
| `superimmersive8` (marketing site, `07_Website/`) | `superimmersive8-drua0ukss` | `superimmersive8-2tgkoqfy9` |
| `si8-creator-portal` (creator app) | `si8-creator-portal-1xm25lxoz` | `si8-creator-portal-1y8gmzs5d` |
| `superimmersive8-crm` (CRM dashboard, root `03_Sales/crm-deploy`) | `superimmersive8-k9smjobjx` | `superimmersive8-1phed0gjf` |

The release changes no file the CRM project builds from or reads.

## Production verification (2026-11-17, public domains, non-destructive GET/HEAD requests)

Only the paths listed were tested; other URL variants were not.

| Result | Paths tested |
|---|---|
| **410** `410 Gone`, `X-Robots-Tag: noindex` (16) | `/pricing`, `/pricing/index.html`, `/how-it-works`, `/how-it-works/index.html`, `/rights-verified`, `/rights-verified/playbook/index.html`, `/zh`, `/zh/index.html`, `/_archive`, `/_archive/pricing.html`, `/_archive/index-zh.html`, `/_archive/README.md`, `/_versions`, `/_versions/README.md`, `/_versions/v5-2026-07-12/how-it-works/index.html`, `/_versions/v4-2026-07-12/zh/rights-verified/playbook/index.html` |
| **404** Vercel "page could not be found" (11) | `/pricing/`, `/how-it-works/`, `/rights-verified/`, `/rights-verified/chain-of-title/`, `/zh/`, `/zh/pricing/`, `/zh/how-it-works/`, `/zh/rights-verified/playbook/`, `/_archive/`, `/_versions/`, `/_versions/v4-2026-07-12/pricing/` |

No tested path served legacy HTML.

Unchanged:
- **Marketing site:** `/` (byte-identical to `07_Website/index.html`), `/index.html`, `/favicon.svg`, `/og-image.png`, `/sample` and
  `/styles.css` return 200. The form endpoints `/api/contact-form`, `/api/formspree-to-kit` and `/api/submit` return 405 to a GET,
  as before; nothing was submitted.
- **Creator app:**
  - `/showcase` returns 200 with no links to retired pages, and Login and Get Verified are present;
  - `/crc` returns 200;
  - `/creator-record` redirects to sign-in, and `/auth/login` returns 200;
  - Creator Record stays invitation-only: `creator_record_v2_pilot_access` still has 1 row.

## Unresolved observations (not release failures)

1. **CRM runtime not verified.** Its Production build succeeded. The deployment URL is behind Vercel Authentication, so the
   dashboard was not opened. Someone signed in to Vercel should open it once.
2. **Showcase catalog is empty.** `app.superimmersive8.com/api/catalog` returns `{"entries":[]}`, while the database holds one
   approved submission with an opt-in. This release did not change the catalog API or its query, and the state before release was
   not captured, so whether this is a pre-existing visibility setting or something else is undetermined.
3. **Optional 410 consistency.** Trailing-slash forms return 404, not 410. Making them 410 would need further rules and a check on
   Production, under its own authorization.
