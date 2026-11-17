# SI8 — Product, Website & Release Status — 2026-11-17

**Status:** current-state handoff for a new session or a PM/Architecture discussion. Point-in-time; it supersedes nothing and is
not an approval. Evidence was gathered read-only on 2026-11-17 (repository at `origin/main` `fe0cfbf5`, Production database as
`supabase_read_only_user`, HTTP GETs of the live sites). Updated later the same day for the legacy website retirement released at
`9c724e87` and its documentation closeout `e6335026`, which is `origin/main` at the time of this update. Observations keep the date
they were made.

**Kinds of evidence used.** They are not interchangeable:
- an HTTP check shows what one URL returned at one moment;
- a successful build shows that code compiled and deployed, not that it behaves correctly;
- a Production UAT exercised a real workflow end to end;
- runtime health (a service working for its users over time) was not monitored for this document.

## A. Products in Production

| | Commercial Readiness Check (CRC) | Creator Record (V2) | Commercial Assurance Assessment |
|---|---|---|---|
| Purpose | Free conversational educational check | $29 self-declared, educational record of how an AI video was made, with optional AI document readings | Independent, human-reviewed assessment across seven domains; Assessment Report (PDF) and Public Assessment Record |
| Availability | Public: `app.superimmersive8.com/crc` (HTTP 200), linked from the live homepage | **Invitation-only.** `creator_record_v2_pilot_access` holds 1 row (the admin account). `/creator-record` requires sign-in. The submissions switch is `'open'`, which is **not** public access: preparing, reviewing, purchasing and document intake each check the switch first (503 if stopped) and then the invitation list (403 `not_invited`) | Founder-led service, sold by conversation (Calendly on the homepage); not self-serve |
| Shape | Software product (frozen PRD `08_Platform/prds/PRD_CRC_v1.0.md`) | Software product (scope `PRD_CREATOR_RECORD_v2_MVP_SCOPE.md`) | Human service supported by software (Registry, workbook, Report, Public Assessment Record) |
| Evidence of use (database, 2026-11-17) | 7 sessions in the last 30 days | 7 V2 records issued, 5 since 2026-11-14. **None is a paying customer:** all 7 belong to the admin account and each was US$29 with a US$29 discount (US$0 collected). Five are named UAT purchases in release records (`CR-2026-7E82CA09`, `-0454615D`, `-AA5D2711`, `-32D43FC8`, `-1E1AED2D`); the two earliest (`-719228D9`, `-8D1022F5`) appear in release records only as earlier issued records | Registry: 3 assessments, 2 delivered |
| Boundaries | Educational only; not an assessment, certification or clearance | Self-declared; not legal advice, not a clearance, no human review. D10: AI readings never validate, contradict, qualify or resolve declarations and are never compared with them | The only human-reviewed offering; not legal advice or certification |
| Known limitations | — | No nonzero payment ever collected (0 accepted payments with amount > 0); public access not specified (§D) | Agency pricing is a $499 floor hypothesis set per call (`PRICING-STRATEGY-v3.0.md`). There is no public pricing page: the old unlisted `/pricing` page was retired on 2026-11-17 and is no longer shared |

The three are distinct offerings with different levels of human involvement. They are not tiers of one assurance.

## B. SI8-UX-2 (closed)

**CLOSED / GO, 2026-11-17.** Record: `08_Platform/implementation/si8-ux-2/04-SI8-UX-2-RELEASE-CLOSURE-RECORD.md`; closure commit
`fe0cfbf5`. SI8-UX-2 was released at `0a8b256a` (Vercel `HqrR2GqAk8CYZwZAdNAQYvHLJer2`). Production has since been redeployed at
`9c724e87` (legacy website retirement); that release does not change Creator Record.

- Path A `CR-2026-32D43FC8` and Path B `CR-2026-1E1AED2D`: functional PASS.
- Historical PDF regression (`CR-2026-AA5D2711`, `CR-2026-06E8B60A`): GO.
- Synthetic-UAT exclusion documentation integrated (`03-SI8-UX-2-CONTROLLED-RELEASE-PLAN.md`).
- No outstanding SI8-UX-2 engineering action.

Accepted administrative limitations, which do not reopen the release:
- the Path A discount-code name is unverified;
- the `COMP-JD2` single-use restriction is unverified;
- synthetic-UAT reporting exclusion is manual;
- whether GA4 received the synthetic purchase events is unverified;
- nonzero Creator Record payment collection has not been demonstrated.

## C. Marketing-site redesign (Claude Design, Round 2)

**What exists.** One integrated clickable prototype, "SI8 Digital Experience Round 2", covering the marketing site, registration,
dashboard and the Creator Record flow. Originals are held privately (`SI8-private-evidence/digital-experience/2026-11-16-round-2/`,
hashes match its `MANIFEST.sha256`); the repository holds only the pointer
`08_Platform/design/digital-experience/2026-11-16-round-2/README.md`.

Marketing pages in the prototype: home, Creator Record, Commercial Assurance, Commercial Readiness Check, pricing,
enterprise/platform, contact, sign-in, registration. Nav: Creator Record · Commercial Assurance · Enterprise · Pricing.

| Layer | Status | Evidence |
|---|---|---|
| Design | **Concept.** "Design direction, provisionally accepted"; not implementation, not approved wording. **No recorded approval exists for implementing or deploying the prototype as a whole** | Round 2 README; its rationale §4E ("subject to SI8 review") and §4G (open decisions) |
| Approved decisions | Only the homepage headline "Commercial readiness starts with documentation.", plus SI8-UX-1 directives to remove C2PA "coming soon", the discovery quotes and unsupported capability claims | SI8-UX-1 founder instructions (conversation record) |
| Implementation | **None.** No branch, worktree or commit implements it. The only later change under `07_Website/` is the legacy-page retirement (`9c724e87`); the v5 homepage is unchanged since `52a0f32f` (2026-09-28, CRC links) | `git log --all -- 07_Website`; worktree list |
| Merged | No | — |
| Deployed | No. The live homepage is byte-identical to `07_Website/index.html` on `main` (v5, 2026-07-12) | SHA-256 of the live response equals `main` |

SI8-UX-2 implemented only the Creator Record questionnaire and supporting-document part of Round 2. Its dashboard and marketing
parts were explicitly out of scope.

**Messaging issues in the prototype (not corrected here):**
1. **Availability.** The homepage, Creator Record page and registration present Creator Record as public self-service ("Create a
   Creator Record · $29", "without contacting SI8"). In Production it is invitation-only. The rationale says this shows the
   intended future, not today.
2. **Public pricing.** The prototype publishes $29 and $499. `PRICING-STRATEGY-v3.0.md` (ACTIVE) keeps Agency pricing ad hoc and
   the self-serve record "unpublished, unmarketed"; its unlisted pricing page was retired on 2026-11-17, so the site has no pricing
   page at all. Creator Record V2 is now a $29 product (CR-V2-MVP-SCOPE-1), but no recorded decision puts either price on the
   public site.
3. **Report naming.** The prototype names the deliverable "Commercial Assurance Report". The frozen terminology is
   "Assessment Report (PDF)".
4. **EU AI Act / Article 50 copy.** Claude Design flagged it for separate legal review. Before any such copy is published, the founder
   needs to decide whether to omit it or obtain appropriate review. This document draws no legal conclusion about the copy. The
   live v5 homepage already carries similar copy, published before this question was recorded.
5. **Positive.** Each product states its limits, AI readings are described as unchecked by a person and kept apart from
   declarations, and CRC is labelled educational and not required.

**Legacy pages retired (2026-11-17).** The v4-era pages `/pricing`, `/how-it-works`, `/rights-verified` and `/zh`, and the public
copies under `/_archive` and `/_versions`, were retired in Production at `9c724e87`. Tested paths without a trailing slash return
410; tested trailing-slash paths return 404; no tested path serves legacy HTML. Showcase links to them were removed. Record:
`08_Platform/implementation/LEGACY_WEBSITE_RETIREMENT_2026-11-17.md`. Still served: `/sample` (v4 sample page) and root assets.
There is no `robots.txt` or sitemap.

## D. Release boundaries

| Change | Controlled by | Independent of the others? |
|---|---|---|
| Marketing-site deployment | `07_Website/` on `main`, Vercel project `superimmersive8` | Functionally yes: it is static and shares no code with the app. It must not promise availability the app lacks |
| Creator Record invitation-only access | `creator_record_v2_pilot_access` (database) plus the submissions switch (code constant) | Yes. A website release changes neither |
| Creator Record public access | "CR-PUBLIC-1": **a name only**, used in SI8-UX-2 documents to mean "public access is separate". No scope, acceptance criteria or approval exists | Needs its own specification and authorization |
| CRC availability | `app.superimmersive8.com/crc` | Already public |
| Commercial Assurance workflow | Human-reviewed service; admin workbook | Unaffected by either |

**Functional independence is not deployment independence.** Three Vercel projects deploy from this one repository: `superimmersive8`
(marketing site), `si8-creator-portal` (creator app) and `superimmersive8-crm` (CRM dashboard). On each push to `main` observed
here (`fe0cfbf5`, `9c724e87`, `e6335026`), all three redeployed, including for documentation-only commits. No Vercel build-skip
setting was inspected. A website-only change can therefore still rebuild the creator app and the CRM; their behaviour stays the
same only if their inputs are unchanged.

A redesigned marketing site **can be released before CR-PUBLIC-1** only if its Creator Record calls to action match invitation-only
availability (for example, request access or ask SI8). As designed, the prototype's self-service calls to action assume
CR-PUBLIC-1.

## E. Milestones

- **Completed:**
  - Creator Record V2 MVP (closed 2026-11-15);
  - CR-DESIGN-2D Institutional Trust PDF (closed 2026-11-16);
  - SI8-UX-2 (closed 2026-11-17);
  - legacy website retirement (released 2026-11-17, `9c724e87`).
- **Approved, unfinished:** none found for the website or public access.
- **Proposed or named only:**
  - CR-PUBLIC-1 (public Creator Record access);
  - marketing-site implementation of Round 2;
  - dashboard redesign;
  - a genuinely synthetic public sample PDF. **Proposed, not an approved deliverable.** SI8-UX-1 asked only to identify a safe way
    to generate one from the released v6/v7 templates, and said "Do not generate or publish new marketing sample PDFs in this
    milestone." No later decision authorizes producing one.
- **Awaiting decision:**
  - availability framing;
  - public pricing versus Pricing Strategy v3.0;
  - report naming;
  - EU AI Act copy: omit it, or obtain appropriate review before publication (founder decision).
- **Strategic validation, separate from all of the above:** the Decision Engine hypothesis (`claude.md` §3s), which authorizes no
  build.

## F. Recommended next step

**A founder decision record for the marketing site (documentation only), before any implementation.** It should settle:
1. Creator Record framing while invitation-only.
2. Whether prices appear publicly, reconciled with `PRICING-STRATEGY-v3.0.md`.
3. Deliverable naming ("Assessment Report").
4. The EU AI Act copy: omit it, or obtain appropriate review before it is published.
5. ~~What happens to the live v4-era pages~~: decided and done. They were retired on 2026-11-17 (§C).

With those decided, a bounded implementation milestone can build the Round 2 marketing pages in `07_Website/` without touching
Creator Record access controls.
