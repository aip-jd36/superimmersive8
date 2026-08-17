# Stock-Media "Editorial Use" — Candidate-Claim Research (Phase 1A + 1B)

**This document has two parts.** Part 1 (below, unchanged from its original 2026-08-17 Phase 1A form except where explicitly noted) is the initial candidate research. **Part 2** (appended at the end of this file, added 2026-08-17 in the same research program, Phase 1B) closes Part 1's identified source gaps and drafts provider-specific candidates. Where Phase 1B's harder evidence changed a Part 1 disposition (notably `CAND-STOCK-EDITORIAL-003`), **Part 1's original text is preserved unedited** — the revision is recorded in Part 2 with an explicit cross-reference, never silently rewritten into history.

## Part 1 — Phase 1A original research (2026-08-17, unmodified)

**Status: RESEARCH ARTIFACT, NOT GOVERNED KNOWLEDGE.** Candidate source material only, per `GOVERNED-CLAIMS.md`'s own governance discipline. Produced 2026-08-17. **Does not create, adopt, or modify any `GOVERNED-CLAIMS.md` entry, `TopicRelationship`, Matrix row, or runtime fixture.** No claim in this document exists outside this file. Candidate IDs below use a deliberately non-governed prefix (`CAND-STOCK-EDITORIAL-NNN`), never `CLAIM-`, so they can never be mistaken for an Adopted entry by a future search.

**Related:** `LIVING-KNOWLEDGE-THIRD-PARTY-STOCK-MEDIA-DOMAIN-DISCOVERY-2026.md` (Phase 0 — this document's `CAND-STOCK-003` lead comes from there; its wording/scope was NOT assumed correct and was independently re-tested here). `THIRD_PARTY_SOURCE_ASSETS_ROUTING_ARCHITECTURE.md` (Phase 0.5 — the approved but unimplemented `third_party_source_rights`/`AssetProviderMention` architecture this research targets; not reopened here). `GOVERNED-CLAIMS.md` (CLAIM-COPY-004's "Global" governance meaning, reused as the test this research applies to jurisdiction metadata, per §17 below).

---

## 1. Research question

Is there a defensible atomic governed proposition concerning use of stock-media content designated Editorial (or an equivalent term) in advertising/promotion/marketing/commercial-client campaigns — and should the resulting knowledge be one cross-provider claim, provider-specific claims, both, or none yet?

## 2. Phase 0 hypothesis tested

Phase 0's `CAND-STOCK-003`: *"Editorial-designated stock content is categorically excluded from commercial/advertising/promotional use, independent of the customer's account, subscription tier, or license model — confirmed in the same shape across Getty, iStock, and Adobe Stock's current terms (Shutterstock's editorial restriction confirmed only via lower-tier WebSearch synthesis)."* Treated here as a lead, not a starting assumption — re-verified independently, and specifically pressure-tested for the two things Phase 0 flagged as unconfirmed: Shutterstock, and whether "categorically excluded" survives scrutiny (it does not, unmodified — see §12/§20).

## 3. Methodology

Fresh live research this session (2026-08-17), independent of Phase 0's own fetches, per task instruction not to treat Phase 0 summaries as authoritative. Direct `WebFetch` prioritized on official provider domains; `WebSearch` used only to locate official pages or as explicitly flagged lower-tier corroboration when direct fetch failed. Every finding below is tagged with its actual source tier — no search-engine synthesis is presented as if it were a direct quote.

## 4. Source hierarchy (as applied)

| Tier | Used for |
|---|---|
| 1 — Direct fetch of official license agreement/legal page | Getty (`gettyimages.hk/eula`, 2 independent fetches), iStock (`istockphoto.com/legal/license-agreement`) |
| 1/2 — Direct fetch of official non-agreement provider page | Getty (`gettyimages.hk/rights-and-clearance`), Shutterstock (`submit.shutterstock.com` contributor-help article — official domain, not blocked) |
| 2 — Direct fetch, prior session (Phase 0), re-cited here with tier disclosed | Adobe Stock (`stock.adobe.com/license-terms`, rendered zh-TW) |
| 3 — WebSearch synthesis, explicitly flagged, used only where direct fetch failed | Shutterstock main license page (`shutterstock.com/license` — 403 both this session and Phase 0), Shutterstock Asset Assurance™ (corroborated via `investor.shutterstock.com` press release + Shutterstock's own blog — official-source-adjacent, still search-mediated), Adobe Stock Editorial definition (WebSearch synthesis, direct license-terms page fetch this session did not re-surface Editorial-specific language as clearly as Phase 0's own fetch did) |
| Attempted, failed | `shutterstock.com/help/en/articles/...` (×3, all HTTP 403 — same bot-blocking pattern documented in `MATRIX-LEARNINGS.md`); Adobe Stock Additional Terms PDF (fetched but binary-encoded, not machine-readable by the summarizing tool) |

**Methodological finding, disclosed prominently because it is load-bearing for confidence:** three separate fetches of Getty's own EULA across this research program (Phase 0, and twice in this session) returned **three different section-number citations for materially the same clause** — "§3.7," "§3(g)," and "§3(k)"/"§3.11" for related-but-distinct provisions. The underlying substance was consistent across all three fetches; the section labels were not. This is evidence that automated fetch-and-summarize of Getty's page is not reliably extracting stable section numbers (possibly a rendering/localization artifact — Getty serves a regional domain redirect — or the summarizing step's own imprecision). **No exact Getty section number in this document should be treated as confirmed without a direct PDF-level check** — a repeat of Phase 0's own disclosed limitation, now reproduced independently, which increases confidence this is a real methodological constraint rather than a one-off error.

---

## 5. Provider-by-provider findings

### 5.1 Getty Images

| Question | Finding | Source tier |
|---|---|---|
| Exact terminology | "Editorial Content" / content "marked as 'Editorial Content' or 'intended for editorial use'" | 1 |
| Definition | Content "primarily intended for editorial purposes, i.e., descriptive purposes, such as news reporting and discussion of current events or newsworthy topics" | 1 |
| Prohibited uses (as enumerated) | "commercial, promotional, advertorial, endorsement, advertising, gambling/betting/gaming, or marketing purposes" — enumerated list, not a single "commercial use" term | 1 (two independent fetches agree on substance, disagree on section label) |
| Exceptions | **Yes — a real, named exception exists.** "You may be authorized to use editorial content in commercial projects by obtaining additional permissions" via Getty's own "Rights and Clearances" team, whose stated role includes clearing "advertising" and "promotional use" specifically. The EULA itself: "Unless expressly authorized on the Getty Images invoice, sales order confirmation, or licensing agreement" — implying a written-agreement path to override the default restriction. | 1 |
| License-scope vs. releases | **Internally inconsistent across Getty's own pages, genuinely worth flagging rather than resolving artificially.** The `rights-and-clearance` page frames Editorial's commercial restriction as fundamentally *about* missing releases ("Editorial designation specifically indicates missing releases, not a pure license restriction"). The EULA fetch frames it as an *independent* license-type restriction ("Editorial designation operates independently from release status... a content type with inherent restrictions, separate from whether releases were obtained"). Both cannot be the primary framing simultaneously. Treated here as: **two real, coexisting provisions** (a contractual use-restriction, and a separate no-releases-generally-provided fact), not one reducible to the other — see §9. |
| Classifications | Editorial and (implicitly, by contrast) Creative — no "unreleased Creative" sub-category surfaced in this pass; not pursued further as out of scope for this milestone. |

### 5.2 iStock

| Question | Finding | Source tier |
|---|---|---|
| Exact terminology | "editorial use only" (lowercase, distinct capitalization convention from Getty's "Editorial Content") | 1 |
| Definition | Section 3(2) (as cited by this fetch — see the same section-number-instability caveat above): "not model or property released and is primarily intended to be used for editorial purposes, meaning descriptive purposes such as news reporting and discussion of current events or other human interest topics (for example, in a blog, textbook, newspaper or magazine article)" | 1 |
| Prohibited uses | "You may not use content marked 'editorial use only' for any commercial, promotional, advertorial, endorsement, advertising, gambling/betting/gaming uses or merchandising purpose" — near-verbatim identical enumerated list to Getty's | 1 |
| Exceptions | **None found in this pass.** No stated mechanism for converting editorial-use-only content to commercial use; Extended licenses (available for other restriction categories) explicitly do not cover this. **This is a genuine negative finding — weaker evidence than a "found and quoted" result** (per this document's own §4 discipline), but consistent between this session's fetch and Phase 0's earlier read. |
| License-scope vs. releases | Cleaner than Getty's own framing: **stated as two separate, coexisting provisions** — the prohibited-use clause (contractual) in the same section as the definition, AND a separate warranty disclaimer (Section 9(b), same section-label caveat applies) stating iStock "does not grant any right or make any warranty with regard to the use of names, people, trademarks, trade dress, logos" and that "no releases are generally obtained" for such content. Neither provision is presented as derivative of the other. |
| Effective date | "LAST UPDATED: July 2026" — stated consistently, both this session and Phase 0. |

### 5.3 Adobe Stock

| Question | Finding | Source tier |
|---|---|---|
| Exact terminology | "Editorial Use Only" (content "marked as such") | 2 (Phase 0's direct fetch, re-cited) / 3 (this session's WebSearch corroboration) |
| Definition | "may only be used in relation to events or topics which are newsworthy or of public interest, typically in newspaper or magazine articles, news blogs, or similar media" — and, per this session's WebSearch (Tier 3, unverified directly): "strictly limited to conveying information, illustrating a newsworthy event, or supporting an article, blog post, **documentary**, or educational material that comments on, reports on, or educates about a topic." **The explicit inclusion of "documentary" and "educational material" in Adobe's own definitional language is directly load-bearing for the documentary scenario pressure test (§14).** |
| Prohibited uses | Phase 0's direct fetch: "cannot '製作商品、範本或其他用於轉售或分銷的產品'" [create merchandise/products for resale]; this session's WebSearch corroboration adds the fuller enumerated list: "advertisements, promotions, endorsements, advertorials, **commercial blogs**, merchandise, etc." — the explicit "commercial blogs" term is directly load-bearing for the brand-blog scenario (§17). |
| Exceptions | Ambiguous, weaker than Getty/Shutterstock. This session's WebSearch: "would require separate written consent from copyright holders and other necessary parties" — this reads as **customer-self-directed** ("you go get consent"), not a provider-brokered clearance service the way Getty's Rights & Clearance team or Shutterstock's Asset Assurance™ are. Not independently confirmed via direct fetch this session (Additional Terms PDF fetch failed — binary/unreadable). Flagged as needing direct verification before relying on the "no exception" framing one search result offered, which itself may simply be describing the absence of a *provider-run* service rather than the absence of any path at all. |
| Attempted, failed | Adobe Stock Additional Terms PDF (`wwwimages2.adobe.com/.../Stock-Additional-Terms_en_US_20240510.pdf`) — fetched, but FlateDecode-compressed content not machine-readable by the summarizing tool. Genuinely unresolved, not silently substituted. |

### 5.4 Shutterstock

| Question | Finding | Source tier |
|---|---|---|
| Exact terminology | "Editorial" content / "Editorial Use Only" | 1 (contributor-help page, direct fetch) / 3 (license-page substance, WebSearch only — main license page still 403-blocked, same as Phase 0) |
| Definition | Direct fetch (official `submit.shutterstock.com` page): "The simple answer to the difference between commercial and editorial content is how that content is permitted to be used." Commercial content "can be used to commercialize, monetize, sell, promote, and advertise a product, business or service." Editorial content "cannot be used to sell, promote, or monetize a business, product or service" — "used for the public good via news outlets." **Structurally different from Getty/iStock/Adobe**: those three define the restriction as an *enumerated list of prohibited use-categories*; Shutterstock instead *defines a term* ("commercial content") functionally and then negates it for Editorial — a real, evidence-supported structural difference, not just different wording of the same rule. |
| Prohibited uses | WebSearch (Tier 3, unverified against the primary license text directly): "commercial use is defined as any promotion/advertising for a product or service that generates revenue... direct or indirect," with an explicit example of "indirect" use — "a social media post on a business page that promotes a holiday without specifically selling or promoting the business" still counts as prohibited. **This directly and strongly informs the paid-social scenario (§16).** |
| Exceptions | **Confirmed real, via a genuinely different and stronger source than the initial search snippet: an official Shutterstock investor press release** (`investor.shutterstock.com`) and Shutterstock's own blog, both corroborating "Asset Assurance™" — launched 2020, Shutterstock's "team of editorial and legal experts evaluate all editorial content and work with... customers to review the potential commercial use," an extension of a "Rights and Clearance" service. **This directly parallels Getty's own Rights and Clearances team** — two of four providers confirmed to offer a provider-administered clearance path, not merely "ask the original rights-holder yourself." Note: the contributor-facing help article fetched directly (§5.4 row above) states no exception exists — this is not a contradiction once reconciled: that page is a narrow contributor FAQ, not Shutterstock's customer-facing enterprise product page; Asset Assurance is a separate, enterprise-tier product the contributor FAQ simply doesn't mention. |
| Effective date / document type | **Weakest-sourced provider of the four on this specific point.** The substantive Editorial restriction was verified against help-center articles (dynamic, unversioned pages) and press/blog material, not against Shutterstock's own formally-dated License Agreement text — that page remained inaccessible (HTTP 403) in both this session and Phase 0. Flag this explicitly as the one provider where the load-bearing restriction has not been confirmed against a formally versioned legal document. |

## 6. Comparative table

| | Getty | iStock | Adobe Stock | Shutterstock |
|---|---|---|---|---|
| Term | "Editorial Content" | "editorial use only" | "Editorial Use Only" | "Editorial" / "Editorial Use Only" |
| Rule structure | Enumerated prohibited-use list | Enumerated prohibited-use list (near-identical to Getty) | Enumerated prohibited-use list | Functional definition of "commercial," then negated |
| Advertising/promotional named explicitly? | Yes | Yes | Yes | Yes (via the negated "commercial" definition) |
| Documentary explicitly addressed? | Not surfaced this pass | Not surfaced this pass | **Yes — explicitly named as within-scope editorial use** | Not surfaced this pass |
| "Commercial blogs" explicitly named? | No (generic "commercial"/"marketing") | No | **Yes, explicitly** | No |
| Framed as releases-related? | Both ways (internally inconsistent — §5.1) | Yes, as a separate coexisting provision | Not clearly confirmed this pass | Yes ("doesn't have a model or property release on file") |
| Provider-administered clearance path? | **Yes — confirmed, named (Rights & Clearance)** | **Not found — negative finding, weaker confidence** | Ambiguous — self-directed only, not confirmed as provider-run | **Yes — confirmed, named (Asset Assurance™)** |
| Effective date sourced | Unstable across fetches (see §4) | Stable: July 2026 | Not surfaced this pass | Not sourced — help pages are undated/mutable |
| Strongest source tier obtained | 1 | 1 | 2 | 1 (definition) / 3 (full restriction + exception) |

## 7. What "Editorial" means across providers

**Substantively comparable, not identical.** All four converge on the same functional idea — content licensed for descriptive/newsworthy/public-interest use, not for commercializing a product, service, or brand — but arrive at it through genuinely different contract structures (an enumerated prohibited-use list for three providers vs. a defined-term-and-negation approach for Shutterstock). A cross-provider claim can honestly describe the *shared functional effect* without claiming the *underlying contract mechanism* is identical — this distinction should be preserved in claim wording (§20).

## 8. Commercial-vs-promotional finding

The task's own suspicion (§13) is **confirmed by the evidence, not just theoretically plausible**: none of the four providers actually restrict Editorial content using the bare word "commercial" alone. All four use — or functionally reduce to — a specific enumerated or defined set: advertising, promotion, endorsement, advertorial, merchandising (and Adobe explicitly: commercial blogs). "Not for commercial use" is measurably less precise than the providers' own language and should not be used as candidate wording. Recommended framing: *"not for advertising, promotional, endorsement, or merchandising use"* (or the provider's own closest phrase), never bare "commercial."

## 9. License-vs-release finding

**These are not the same proposition, and evidence does not support collapsing them — confirmed, not merely suspected.** Getty's own materials are internally inconsistent about which one is doing the work (§5.1); iStock keeps them as two separate, coexisting provisions in its own agreement (a use-restriction clause and a separate warranty-disclaimer clause); Shutterstock's contributor page frames the restriction primarily via the release fact ("doesn't have a model or property release on file"). **Recommendation: keep as two separate atomic claims** (§20, Claim A = license-scope restriction; Claim B = release-relatedness), consistent with the task's own explicit instruction not to merge them, and consistent with what the sources themselves actually show (not fully reconciled with each other).

## 10–13 covered inline above (terminology, commercial-use definition, Getty/iStock/Adobe/Shutterstock deep dives) — see §5–§9.

---

## 14. Scenario: advertisement ("AI commercial for Nike, used a Getty Editorial image")

**Known general rule (safe to state, not project-specific):** Editorial-designated stock content is licensed by its provider for editorial/descriptive/newsworthy purposes; standard provider terms name advertising and promotional use as outside that license's scope; using such content in a commercial advertisement would exceed the standard license absent separate written authorization.

**Project-specific determination (not for CRC, Commercial Assurance only):** whether this specific image is actually Editorial-designated (vs. mislabeled or misremembered by the user); whether Getty in fact granted written authorization/clearance for this specific use (via its Rights and Clearances team or an invoice/license-agreement override); whether the depicted subject's likeness independently requires separate release regardless of the license question (a `likeness`-domain question, not this domain's).

## 15. Scenario: documentary for a paying client

**Pressure-tests whether "commercial project" is too broad a trigger — confirmed that it is, per evidence.** Adobe's own definitional language explicitly names "documentary" and "educational material that comments on, reports on, or educates about a topic" as within-scope editorial use. A paying client does not, by itself, convert an editorial *use* into a promotional *use* — the enumerated-use test (is this specific use advertising/promotional/endorsement/merchandising) is the evidence-supported dividing line, not whether money changed hands or whether the production is commercially distributed. **This directly disproves an unqualified "commercial project" framing** and supports the narrower, evidence-grounded wording recommended in §20.

## 16. Scenario: paid Instagram ad using an Editorial image

**High confidence, squarely within the prohibited category under every provider checked.** This scenario matches Shutterstock's own explicit stated example almost exactly (a promotional social media post). Under the enumerated-list providers (Getty/iStock/Adobe) it falls under "advertising"/"promotional" directly. General proposition: paid social advertising is a form of advertising/promotional use under every provider's own terminology — no genuine ambiguity found here.

## 17. Scenario: Editorial image in an article on the company's own website (brand blog)

**Genuinely ambiguous — evidence does not support a binary answer, and the task's own instruction not to force one is followed.** Could plausibly be read as editorial/descriptive content (if the article genuinely reports/discusses a topic) or as "commercial blogs" — a term Adobe explicitly and specifically names as a *prohibited* use category. The deciding factor per the evidence is the *character of the specific content* (does it read as reporting/discussion, or as promotion of the company's own product/service), which CRC cannot assess and a reviewer would need to inspect directly. Recorded as an open, evidence-supported ambiguity, not resolved here.

## 18. Scenario: Getty Editorial image, but the client independently has the depicted person's permission

**Pressure test answer: probably not sufficient on its own — and this is now evidenced, not just inferred, via Getty's own EULA framing** ("Editorial designation operates independently from release status... a content type with inherent restrictions, separate from whether releases were obtained" — §5.1). A client's own independently-obtained release addresses the *underlying rights in the depicted subject*, but does not, by itself, modify the *provider's own license grant* — which is a separate contractual limitation the provider itself must waive (via its own Rights & Clearance / Asset Assurance-style process, where one exists) rather than something an independent third-party release can override unilaterally. This is exactly the license-scope-vs-releases distinction §9 already established as real and non-collapsible.

## 19. Scenario: uploaded a Getty Editorial image into Kling to make an advertisement (AI-input boundary only — not reopening Phase 0's broader research)

**Yes — the Editorial-use restriction independently creates an issue before the AI-input question is even reached, and the two must be recorded as separate, stacking concerns, not combined into one claim** (per task instruction). Using Editorial content in an advertisement already falls outside the standard Editorial license per §14/§16's findings, regardless of whether AI tooling is involved at all. Separately, Phase 0's own finding (Getty §3.11/iStock §3.15, not re-verified in this pass, out of scope per task instruction) is that uploading licensed content into a third-party AI tool may independently violate a *different* clause (the AI/ML-use restriction). **These are two independent potential license violations, evaluated by two different provisions, and any future claim wording must not conflate "used in an ad" with "uploaded to AI" as if resolving one resolves the other.**

---

## 20. Atomicity — proposed candidate structure

Following the task's own illustrative (not prescriptive) A/B/C structure, tested against evidence and revised where evidence demanded it:

### CAND-STOCK-EDITORIAL-001 — License-scope restriction (cross-provider structural)
**Proposition:** A stock-media provider's standard license for content it designates "Editorial" (or an equivalent editorial-use-only classification) authorizes editorial/descriptive/newsworthy use; it does not, by itself, authorize advertising, promotional, endorsement, or merchandising use of that content.

**Proposition map:**
- P1 — Getty defines Editorial Content as primarily intended for editorial/descriptive/newsworthy purposes. **SOURCE →** direct fetch, `gettyimages.hk/eula`. **SUPPORTED.**
- P2 — Getty's standard license names commercial/promotional/advertising/endorsement/marketing as prohibited uses of such content absent separate written authorization. **SOURCE →** same. **SUPPORTED.**
- P3 — iStock's definition and prohibited-use clause are materially parallel (near-verbatim enumerated list). **SOURCE →** direct fetch, `istockphoto.com/legal/license-agreement`. **SUPPORTED.**
- P4 — Adobe Stock's Editorial Use Only content is similarly restricted from advertisements/promotions/endorsements/commercial blogs/merchandise. **SOURCE →** Phase 0 direct fetch (Tier 2) + this session's WebSearch (Tier 3). **PARTIALLY SUPPORTED** (Tier 2/3 only, not a fresh direct-fetch quote this session).
- P5 — Shutterstock functionally negates its own "commercial content" definition (sell/promote/monetize) for Editorial content. **SOURCE →** direct fetch, `submit.shutterstock.com` (definition) + WebSearch (full restriction detail, Tier 3). **SUPPORTED** for the core definitional distinction; **PARTIALLY SUPPORTED** for exact restriction wording (license-agreement text itself unverified — 403).

**SI8 candidate synthesis:** *"Content that a stock-media provider designates 'Editorial' or an equivalent editorial-use-only classification is licensed by that provider for editorial/descriptive/newsworthy purposes. Under the provider's standard license, this does not include advertising, promotional, endorsement, or merchandising use — exact wording and any provider-specific exceptions vary by provider and should be checked against the specific provider's current terms."*

**Provider scope:** Cross-provider structural (Getty, iStock, Adobe Stock, Shutterstock).
**Jurisdiction:** See §17 — not a legal-jurisdiction claim; flagged as a metadata-fit issue, not resolved here.
**Applicability requirements:** `[]` — vacuously applicable; no existing `ApplicabilityFact` fits a contractual, provider-scoped claim, and PM has approved zero new ones (§Phase 0.5 closure). Safe under this architecture specifically because this claim would only ever be retrieved via Path A (an explicit `third_party_source_rights` goal already exists) — see §24 below.
**Unresolved project dependencies:** `[which_provider, editorial_designation_confirmed, separate_authorization_obtained]` (informational, not implemented — `AssetProviderMention` does not exist yet; see §25).
**Likely audience:** Reviewer candidate first; plausible CRC candidate after provider-specific narrowing (see §26).
**Confidence:** High for Getty/iStock (Tier 1, both fetched twice independently); Moderate for Adobe Stock (Tier 2/3); Moderate for Shutterstock (Tier 1 definition, Tier 3 full restriction).
**Known exceptions:** See CAND-STOCK-EDITORIAL-003.

### CAND-STOCK-EDITORIAL-002 — Release-relatedness (cross-provider structural, deliberately separate from -001)
**Proposition:** Content designated "Editorial" by a stock-media provider is typically supplied without model or property releases having been obtained — a distinct fact from, though often correlated with, the provider's own license-scope restriction on advertising/promotional use (CAND-STOCK-EDITORIAL-001).

**Proposition map:**
- P1 — Getty: Editorial content "generally" lacks model/property releases (§5.1). **SUPPORTED**, Tier 1, though Getty's own materials are inconsistent about whether this IS the restriction or merely correlates with it (disclosed in §5.1/§9, not resolved).
- P2 — iStock: explicit, separate warranty-disclaimer clause states no releases "generally" obtained for editorial-use-only content, distinct from the prohibited-use clause itself. **SUPPORTED**, Tier 1.
- P3 — Shutterstock: Editorial content "doesn't have a model or property release on file." **SUPPORTED**, Tier 1 (contributor-help page).
- P4 — Adobe Stock: not independently confirmed with a direct quote in this pass. **UNSUPPORTED (not yet evidenced, not contradicted)** — genuine gap, not assumed either way.

**SI8 candidate synthesis:** *"Stock-media content marked 'Editorial' is typically licensed without the model or property releases that would otherwise support broader commercial use — a separate consideration from, though often related to, the provider's own license-scope restriction."*

**Provider scope:** Cross-provider for Getty/iStock/Shutterstock; unconfirmed for Adobe Stock — recommend flagging Adobe as an open item rather than silently assuming parity.
**Confidence:** High (Getty/iStock/Shutterstock); none established (Adobe).
**Applicability/dependencies/audience:** Same posture as CAND-STOCK-EDITORIAL-001.

### CAND-STOCK-EDITORIAL-003 — Exceptions exist, restriction is not absolute (cross-provider structural, with named provider asymmetry)
**Proposition:** At least some stock-media providers offer a distinct, provider-administered process to clear Editorial-designated content for commercial/advertising use, separate from the standard license (e.g., Getty's Rights and Clearances team; Shutterstock's Asset Assurance™). Availability of such a path is not uniform across providers, and its mere existence does not itself establish that clearance was obtained for any specific asset.

**Proposition map:**
- P1 — Getty offers a named "Rights and Clearances" service explicitly covering advertising/promotional clearance. **SOURCE →** direct fetch, `gettyimages.hk/rights-and-clearance`. **SUPPORTED**, Tier 1.
- P2 — Shutterstock offers a named "Asset Assurance™" product for the same purpose. **SOURCE →** official investor press release + Shutterstock's own blog (Tier 2, search-located but from Shutterstock's own domains). **SUPPORTED.**
- P3 — iStock shows no equivalent mechanism in its own license agreement. **SOURCE →** direct fetch, this session. **Negative finding — weaker confidence than a positive quote, disclosed as such, not asserted as proof of absence.**
- P4 — Adobe Stock's path (if any) appears to be customer-self-directed ("obtain written consent from copyright holders yourself"), not provider-administered. **SOURCE →** WebSearch, Tier 3, not independently confirmed. **PARTIALLY SUPPORTED.**

**SI8 candidate synthesis:** *"At least some stock-media providers (confirmed for Getty and Shutterstock in this research) offer a separate, provider-run process to clear Editorial-designated content for commercial use — this is not available from every provider, is not automatic, and does not itself confirm that a specific asset was actually cleared."*

**Provider scope:** Provider-specific in substance (Getty, Shutterstock confirmed positive; iStock confirmed negative; Adobe unresolved) even though framed as one cross-provider claim about *variability* — this is the "structural claim about the domain" the task's Option C anticipated, not a claim that the exception itself is uniform.
**Confidence:** High for the Getty/Shutterstock positive findings; Moderate for the iStock negative finding; Low/unresolved for Adobe.

## 21. Cross-provider claim assessment

**Yes, for CAND-STOCK-EDITORIAL-001 and -002 (with the Adobe caveat on -002)** — materially true across the four providers researched, precise enough to be useful (names the actual prohibited-use categories rather than the vaguer "commercial"), narrow enough to preserve provider-specific exception texture (defers exceptions to a separate claim rather than overclaiming a uniform absolute rule), sourceable (Tier 1 for two of four providers, Tier 1/2/3 mix for the other two, disclosed honestly), and stable (contractual language of this kind changes, but the underlying editorial/commercial distinction itself is a long-standing stock-photography-industry concept, not a novel or volatile one). **Not forced merely because the domain architecture is cross-provider** — the generalization held up under independent scrutiny of all four providers, including the one (Shutterstock) that used a structurally different drafting approach.

## 22. Provider-specific claim assessment

**Yes, both layers are justified — confirmed, not assumed.** The generic structural claims (§20) tell CRC *that* a rule of this shape generally exists; they cannot tell a user or reviewer Getty's exact enumerated list, iStock's exact "human interest topics" definition, or which two of the four providers actually offer a named clearance service. Provider-specific claims (not fully drafted here — recorded as a recommended next step, consistent with keeping this pass atomic) would carry: the provider's own exact terminology, exact enumerated prohibited-use list, and exact exception mechanism (or its absence) — none of which the generic claim can honestly assert on a provider's behalf.

## 23. Jurisdiction recommendation

**These are contractual/platform-licensing propositions, not statutory legal propositions, and do not fit the existing `jurisdiction` field's governance meaning cleanly.** Per `GOVERNED-CLAIMS.md`'s own fixed meaning of `Jurisdiction: Global` (established during CLAIM-COPY-004's hardening pass): "a jurisdiction-neutral **structural relationship between legal concepts**, pressure-tested across materially different legal systems." A stock-provider's contract terms are not a legal-system-neutral structural relationship at all — they're a single company's contract, which happens to apply to users regardless of geography not because it is jurisdiction-neutral doctrine but because it is one contract with one set of terms attaching to whoever accepts it. Labeling this `Global` in COPY-004's sense would be a category error — reusing a word this repo's own governance discipline has already gone to real trouble to define precisely, for a genuinely different kind of "doesn't vary by geography." **Recommendation: do not label `Global`.** The field is free text (not an enum, per `types.ts`), so a value such as `"Not jurisdiction-specific — provider contract terms"` is technically expressible without a schema change — but this is flagged as a genuine representational-fit gap for PM to resolve deliberately (a documented convention for contractual claims' jurisdiction field), not silently decided by this research pass.

## 24. Applicability_requirements recommendation

`applicability_requirements: []` for all three candidates — vacuously applicable, per `isApplicable([], facts)`'s own existing semantics. This is safe specifically because Phase 0.5's approved architecture routes any future claim in this domain through Path A only (an explicit `third_party_source_rights` goal must already exist before a topic lookup even occurs) — the false-positive diagnostic-leak risk that made an empty-but-broad-category placement dangerous under `commercial_use` (Phase 0.5 §1/§6) does not apply here, because these claims would never be topic-candidates for an unrelated `commercial_use`-only user in the first place. No new `ApplicabilityFact` is proposed, per PM's standing decision.

## 25. Unresolved_project_dependencies recommendation

For all three candidates: `[which_provider, editorial_designation_confirmed, separate_authorization_obtained]`. Explicitly informational, non-gating, per existing `TopicClaim` semantics (mirrors COPY-001/002/003's own `human_creative_contribution_level` usage). **`AssetProviderMention` is not implemented** (Phase 0.5 explicitly deferred it pending governed knowledge demonstrating the need) — these dependency strings do not imply CRC currently captures a `which_provider` fact; they name what a future, still-unbuilt structured fact would need to resolve, exactly as the existing mechanism is designed to do.

## 26. CRC-safe / Reviewer-only preliminary classification

| Candidate | Classification | Why |
|---|---|---|
| CAND-STOCK-EDITORIAL-001 (license scope) | **C — both, with different application boundaries.** Reviewer-first; a CRC-eligible version would need per-provider narrowing (the generic cross-provider synthesis alone risks implying a uniform exception structure that doesn't exist — §20's own honesty about Getty/Shutterstock vs. iStock's asymmetry matters here). | Doesn't require inspecting a specific asset to be generally true; but a naive general statement risks misleading a user about whether an exception path exists for *their* provider. |
| CAND-STOCK-EDITORIAL-002 (release-relatedness) | **B — Reviewer-only, at least until Adobe Stock is independently confirmed.** | The Adobe gap (§20) means a cross-provider statement can't yet honestly claim uniformity; safer withheld from CRC until closed. |
| CAND-STOCK-EDITORIAL-003 (exceptions exist) | **B — Reviewer-only.** | Whether a specific asset was actually cleared is inherently a project-specific, evidence-inspection question — squarely Commercial Assurance's role, not CRC's, even though the *general fact that exceptions exist* is itself fairly stated. |

No publication decision is made here — this is preliminary classification only, per task instruction.

## 27. Minimum reviewer evidence (advertisement scenario)

| Tier | Item |
|---|---|
| Required | Which provider licensed the asset; the asset's actual classification (Editorial vs. Creative) as shown on the provider's own record, not the user's self-report; whether separate written authorization/clearance was obtained (invoice, license confirmation, or a Rights & Clearance/Asset Assurance-style approval record) |
| Useful | Date licensed and which Terms version was then in effect (§28); account/license type |
| Contextual | Whether the depicted subject independently gave the client permission — relevant as an input to a possible clearance request, but (per §18's finding) not sufficient on its own to satisfy the provider's own license restriction |

## 28. Temporal/versioning findings

| Provider | Effective date sourced? | Document type |
|---|---|---|
| Getty | Unstable — shown once (April 2026) in Phase 0, not restated in this session's fetches | Formal EULA (versioned, but section labels drift across fetches — §4) |
| iStock | Stable — "Last Updated: July 2026," consistent across two independent fetches | Formal license agreement |
| Adobe Stock | Not surfaced in either pass | Formal license-terms page + a separately-dated (2024-05-10, per its filename) Additional Terms PDF not independently re-verified this session |
| Shutterstock | Not sourced at all — the load-bearing restriction was verified only against undated, mutable help-center articles and press/blog material, never the formally-dated license agreement itself (still 403-blocked) | **Weakest source-versioning posture of the four — explicit LK source-versioning implication: this provider's claim, if ever adopted, would need its primary source resolved to a real, dated legal document before Adoption, not left resting on help-center prose.** |

## 29. Maintenance-source recommendations

| Provider | Source | Proposition governed | Change risk | Monitoring priority | Machine-monitor feasibility |
|---|---|---|---|---|---|
| Getty | `gettyimages.com/eula`, `gettyimages.com/rights-and-clearance` | License scope, exceptions | Medium (single doc changed effective date across the research window already) | High | Feasible, but section-number instability (§4) should be a known caveat for any future monitor's own confidence scoring |
| iStock | `istockphoto.com/legal/license-agreement` | License scope, no-releases disclaimer | Medium | High | Feasible — fetched cleanly twice |
| Adobe Stock | `stock.adobe.com/license-terms`, Additional Terms PDF | License scope, editorial definition | Unknown | Medium | Partial — core page fetchable; PDF format is a real monitoring obstacle (binary-encoded, needs a different extraction path than HTML) |
| Shutterstock | `shutterstock.com/license` (still inaccessible), `submit.shutterstock.com` contributor help, Asset Assurance product/press pages | License scope, exceptions | Unknown | Medium — but **should be upgraded to High once the primary license-agreement text becomes accessible**, since this is currently the weakest-verified provider | **Poor** for the primary document (confirmed bot-blocked across two independent research sessions); moderate for the contributor-help/product pages, which are on a different, currently-accessible subdomain |

## 30. Contrary evidence found

Actively searched for, per task instruction, not merely accepted at face value:

- **Documented, official exceptions exist for two of four providers** (Getty, Shutterstock) — directly contradicts an unqualified "Editorial content can never be used commercially" framing. This is the single most important contrary-evidence finding and is why CAND-STOCK-EDITORIAL-001's synthesis explicitly avoids "always"/"never" language.
- **Adobe's own definition explicitly includes "documentary" and "educational material"** as within-scope editorial use — contradicts a simplistic "commercial project = excluded" framing (§15).
- **Shutterstock's structurally different drafting approach** (defined-term-and-negation, not enumerated list) is itself a form of contrary evidence against assuming all four providers share one contract mechanism — the functional outcome converges, the legal drafting does not.
- **No evidence found, despite active searching, that Editorial content can be used in advertising/promotion/merchandising *under the standard license, without separate authorization*, for any of the four providers** — the core Phase 0 hypothesis (minus its overbroad "categorical"/absolute framing) survives this research intact.

## 31. Claim wording discipline

Applied throughout §20: no "always," "never," "commercially cleared," "illegal," or "copyright infringement" language used in any candidate synthesis. Every material clause traces to a specific proposition in each candidate's own proposition map, each marked SUPPORTED/PARTIALLY SUPPORTED/UNSUPPORTED rather than asserted uniformly.

---

## 32. Decision Test outcome

**B — Cross-provider structural + provider-specific candidates.**

A general, evidence-supported structural proposition exists and is genuinely useful (§20's three candidates, §21). But exact, actionable guidance — and honest handling of the real asymmetries found (Getty/Shutterstock's named exception paths vs. iStock's apparent absence of one; Adobe's unconfirmed release-relatedness) — requires provider-specific claims as a second layer (§22), not yet drafted in this pass (kept atomic, per task instruction), recommended as the next research increment.

## 33. Architecture contradiction check

**None found.** This research operated entirely within the PM-approved architecture (Path A only, zero new `ApplicabilityFact`s, `TopicClaim` as the object type, jurisdiction field unmodified) without needing to challenge any of it. The one genuine anomaly surfaced — the `jurisdiction` field's Global-meaning not fitting a contractual claim cleanly (§23) — is a **metadata-fit gap the task itself anticipated and asked to have reported, not a contradiction of any approved architecture decision.** No schema change proposed or implied.

## 34. Unresolved research questions

1. Getty's exact section numbering (unstable across three independent fetches — needs PDF-level verification before Adoption).
2. Adobe Stock's Editorial-content release-relatedness (CAND-STOCK-EDITORIAL-002, P4) — genuinely unconfirmed, not assumed either way.
3. Adobe Stock's actual exception/clearance mechanism — self-directed only, or does Adobe itself broker anything? Unresolved (PDF fetch failed).
4. iStock's negative finding (no exception mechanism) — a "not found" result, weaker than a positive quote; worth one more direct verification pass before relying on it as confirmed absence.
5. Shutterstock's primary license-agreement text remains unverified (still 403-blocked) — the weakest-sourced provider on formal-document grounds despite reasonably strong corroboration from other Shutterstock-owned sources.
6. The brand-blog scenario's genuine ambiguity (§17) is recorded, not resolved — would need real submission evidence to develop reviewer guidance, per the same pattern `PENDING-QUESTIONS.md` already uses for comparable open questions elsewhere in this repo.

---

**Research conducted:** 2026-08-17. **Status:** Complete for Phase 1A scope (Editorial-use restriction only; AI-input boundary explicitly not reopened per task instruction). **Next step:** Return to PM for review — no candidate in this document proceeds toward `Under Review`/`Adopted` without an explicit separate governance decision.

---

# PART 2 — Source-Gap Closure + Provider-Specific Candidates (Phase 1B, 2026-08-17)

**Status: RESEARCH ARTIFACT, NOT GOVERNED KNOWLEDGE — same discipline as Part 1.** Fresh live research this session, independent of both Phase 0 and Phase 1A's own fetches. **No Part 1 statement required a factual correction** — Phase 1B hardened, narrowed, and in one case reversed a *disposition* (`CAND-STOCK-EDITORIAL-003`), but found no instance where Part 1 asserted something the new evidence contradicts. Candidate IDs continue the `CAND-STOCK-*` (never `CLAIM-`) discipline.

## 1. Gap-closure matrix

| Gap (from Part 1) | Targeted | Closed? | Result |
|---|---|---|---|
| A. Getty section-number instability | Yes | **Partially — resolved via citation-strategy change, not via achieving a stable number** | See §2 below. |
| B. iStock clearance negative-finding | Yes | **Rechecked, same result, correct epistemic status now explicit** | See §3. |
| C. Adobe release-relatedness + exception mechanism | Yes | **Partially — stronger corroboration found, but still no successful direct fetch of Adobe's own page this session (3 attempts, all failed)** | See §4. |
| D. Shutterstock primary document | Yes — highest priority per task | **Not closed — confirmed structural limitation, not a one-off.** Strong Official-Secondary corroboration obtained instead. | See §5. |
| E. Brand-blog ambiguity | Yes | **Closed to the extent evidence allows — dividing line identified, genuine cases-differ residual ambiguity preserved, not forced.** | See §6. |

## 2. Getty — canonical source hardening

Two more direct fetches this session (`gettyimages.hk/eula`, `gettyimages.hk/rights-and-clearance`) plus one search pass for a stable PDF citation, joining the two Phase 1A fetches and one Phase 0 fetch — **five independent fetches of Getty's own materials across this research program.**

**Result: the section-number instability is confirmed, not a fluke.** Five fetches have now produced citations of "§3.7," "§3(g)," "§3(k)," and "§3.11" for materially the same or adjacent clauses. A `pressreleasefinder.com`-hosted PDF surfaced dated **April 2019** — clearly stale (predates even Phase 0's April-2026-dated fetch) and **not used as evidence**, cited here only to show that even third-party-archived "official" PDFs are not a shortcut to stability.

**Recommended citation strategy (per task §4 instruction to document one rather than keep chasing a stable number):** cite Getty provisions by **document title + exact clause language**, e.g. *"Getty Images Content License Agreement, the clause defining 'Editorial Content' as intended for descriptive/newsworthy purposes"* and *"...the clause prohibiting commercial, promotional, advertorial, endorsement, advertising, gambling/betting/gaming, or marketing use of Editorial Content absent express written authorization"* — never a bare section number as the sole identifier. Any future formal claim drafted from this research should carry this instruction forward explicitly in its own `Source references` field.

**Exact rule (re-confirmed, unchanged in substance across all five fetches):** Editorial Content is licensed for descriptive/newsworthy/current-events purposes; commercial, promotional, advertorial, endorsement, advertising, gambling/betting/gaming, and marketing uses are prohibited absent express written authorization.

**Exception/clearance finding (re-confirmed, Tier 1):** Getty's own "Rights and Clearance" function is real and explicitly scoped to include "advertising" and "promotional use" clearance — directly, not by inference.

## 3. iStock — clearance negative-finding recheck

One fresh direct fetch (`istockphoto.com/legal/license-agreement`, this session) plus one dedicated `WebSearch` pass targeted specifically at the clearance question (distinct from Phase 1A's search).

**Epistemic classification: NO EVIDENCE FOUND** (not `SUPPORTED NO`). Two independent research passes (Phase 1A, Phase 1B) targeting this specific question have not surfaced any iStock-run clearance/authorization mechanism analogous to Getty's Rights & Clearance or Shutterstock's Asset Assurance. This is meaningfully stronger than a single miss, but **still does not meet the bar for `SUPPORTED NO`**, which would require iStock's own materials to affirmatively state no such path exists. No such affirmative disclaimer was found either. The correct status, honestly stated, is: *iStock's own license agreement is silent on any provider-run conversion path, and no independent search surfaced one — silence is evidence of likely absence, not proof of absence.*

**Editorial restriction itself: remains well-supported**, Tier 1, stable effective date ("Last Updated: July 2026"), consistent across two independent direct fetches (Phase 1A, Phase 1B) plus the original Phase 0 fetch — the single most consistently-sourced provider in this entire research program.

## 4. Adobe Stock — release-relatedness

**Three fetch attempts this session, all failed** (`helpx.adobe.com/stock/help/usage-licensing.html` — timeout; `helpx.adobe.com/il_en/stock/contributor/help/illustrative-editorial-content.html` — timeout; the Additional Terms PDF, re-attempted, still binary-unreadable). **No successful direct official fetch was obtained for Adobe this session** — a genuine, disclosed limitation, not silently worked around.

Two independent `WebSearch` passes (Phase 1A's original + one fresh pass this session) both surface consistent language attributed to Adobe's own help documentation: *"All assets intended for commercial use and containing recognizable people are uploaded with a signed model release... editorial images don't have model releases and are therefore not cleared for commercial use."* Consistent phrasing across two independently-timed searches is modestly reassuring but **remains Tier 3** per this document's own discipline (§4/§9 governance) — a search-engine synthesis, however consistent, is not a substitute for a direct official fetch that Adobe's own servers declined to complete three times.

**Finding: release-relatedness is plausible and consistently reported for Adobe, but not elevated to Tier 1 or Tier 2 by this session's work.** Recommendation unchanged from Part 1: do not assert Adobe-specific release-relatedness with the same confidence as Getty/iStock/Shutterstock.

## 5. Adobe Stock — exception/authorization mechanism

**A specific, checkable, but Tier-3 (community forum) finding surfaced this session, not present in Part 1:** an Adobe Community discussion thread states that although Adobe's license text theoretically permits "written consent from copyright owner" as a path to commercial use of Editorial content, **Adobe Stock provides no mechanism for a customer to contact the original contributor to request that consent** — meaning the theoretical exception clause may be functionally inoperative in practice, a materially different situation from Getty's or Shutterstock's own actively-offered, provider-run clearance services.

**Classification: CUSTOMER INDEPENDENTLY OBTAINING THIRD-PARTY PERMISSION, and even that path appears to lack a working contact mechanism** — not PROVIDER-RUN CLEARANCE, and not confirmed to be workable at all as customer-self-directed either. This is the most negative (weakest exception access) finding of any of the four providers, but rests on a single community-forum source, Tier 3, and is flagged as such — worth a reviewer's attention, not worth asserting as settled fact.

## 6. Adobe Stock — primary source hardening

**Not achieved this session.** The Additional Terms PDF (`wwwimages2.adobe.com/.../Stock-Additional-Terms_en_US_20240510.pdf`, and a second, older `20180605` version surfaced by search but not fetched) remains FlateDecode-compressed and unreadable by the available fetch/summarize tool in both Phase 1A and Phase 1B. **This is a tooling limitation of this research environment, not evidence about Adobe's actual terms** — flagged distinctly so a future pass with a proper PDF-text-extraction capability is not discouraged from trying again. Per task instruction, this PDF inconvenience is **not** treated as a reason to downgrade Adobe's underlying (Tier 2, Phase 0-sourced) `stock.adobe.com/license-terms` evidence for the core commercial/editorial distinction itself — only the two narrower propositions (release-relatedness, exception mechanism) remain under-verified.

## 7. Shutterstock — primary document (highest-priority gap)

**Not closed. Confirmed as a stable, repeated, structural access limitation — not a one-off failure.** Four distinct official Shutterstock URLs have now been attempted across Phase 1A and Phase 1B, all returning HTTP 403: `shutterstock.com/license`, `shutterstock.com/license-history`, `shutterstock.com/terms`, and three `shutterstock.com/help/en/articles/...` pages. **Zero of seven attempted fetches of Shutterstock's own customer-facing legal/help pages (across two research sessions) succeeded.** The one Shutterstock official page that *did* fetch successfully in both sessions is on a *different* subdomain (`submit.shutterstock.com`, the contributor-facing help center) — this asymmetry (contributor pages accessible, customer/legal pages blocked) is itself worth recording as a pattern for future LK source-monitoring design.

**What was obtained instead, correctly tiered (per task §9's explicit instruction not to falsely upgrade a help article into primary authority):**
- **Tier 1 (direct official fetch):** `submit.shutterstock.com`'s contributor-facing "What is the difference between Commercial and Editorial content?" page — the functional definition itself.
- **Official Secondary (direct fetch of an official Shutterstock-issued document, but not the contractual license text itself):** the Shutterstock/`stocktitan.net` financial-news republication of Shutterstock's own press release characterizing Rights and Clearance and Asset Assurance™.
- **Official Secondary, located via search, from Shutterstock's own domains (`investor.shutterstock.com`, Shutterstock's own blog):** corroborating detail on Asset Assurance's 2020 launch and scope.

**None of this constitutes Verified Primary contractual text.** The load-bearing proposition — the exact wording of the customer-facing prohibited-use clause for Editorial content — rests on **Tier 1 for the definitional distinction** and **Official Secondary, not Verified Primary, for the exact restriction language and the exception mechanism's precise legal effect.** This is disclosed prominently, per task instruction, rather than smoothed over.

## 8. Shutterstock — Asset Assurance, precisely characterized

Directly fetched this session (Official Secondary, Shutterstock's own press materials via `stocktitan.net`), resolving Part 1's own hedge:

- **Rights and Clearance** is the service that actually **obtains third-party permissions** ("obtains third party permissions across the entire portfolio of assets for promotional use in advertisements, social campaigns, marketing materials and more") — this is the piece that functions like a genuine clearance/authorization mechanism (task's option B).
- **Asset Assurance™** (launched 2020) is a **separate, complementary indemnity product** — "adds indemnification on top of the commercial license already obtained." It does **not** itself change what use is permitted; it insures against claims once permission/clearance has independently been secured (task's option C, not B).

**Corrected characterization (refines, does not contradict, Part 1's own more general "exceptions exist" framing):** Shutterstock's actual mechanism is **two-layered** — a genuine provider-run clearance service (Rights and Clearance) plus a separate indemnity layer (Asset Assurance) — not a single undifferentiated "exception." This precision is exactly why the disposition of `CAND-STOCK-EDITORIAL-003` changes below (§13).

## 9. Brand-blog ambiguity — resolved to the extent evidence allows

**Dividing line identified: purpose/character of the specific page's content, not identity or commercial status of the publisher.** This is directly evidenced, not inferred: Adobe's own definitional language explicitly includes "blog post... that comments on, reports on, or educates about a topic" as within-scope editorial use, while separately and explicitly naming "**commercial blogs**" among prohibited uses. Since both phrases describe *blog content generally*, the only coherent reading is that Adobe itself draws the line on **what the specific post does** (report/discuss/educate about a topic, vs. promote the company's own product/service/brand), not on who is hosting it. A corporate website is capable of hosting genuinely editorial content (an unbiased industry-news roundup) exactly as a newspaper is capable of hosting advertorial content — the evidence supports content-character as the test, publisher-identity as not the test. **Residual, evidence-supported ambiguity preserved, not forced:** where a specific piece of brand content sits on that spectrum (a company blog post that reports on an industry trend while incidentally mentioning its own product) is a genuinely contextual, reviewer-level judgment call — this research narrows the question to the right axis without claiming to resolve every instance of it.

## 10. Recheck: "commercial use"

**Falsification attempt failed — Part 1's conclusion is reaffirmed, not weakened, by this session's evidence.** Every new source obtained this session (Getty's rights-and-clearance page, iStock's re-fetch, Shutterstock's definitional page, the Adobe community thread) continued to use or reduce to the same narrower vocabulary — advertising, promotional, endorsement, merchandising, advertorial, commercial blogs — never resting the restriction on the bare word "commercial" alone. **Explicit reaffirmation: do not use "commercial use" as the primary governed boundary.** Best cross-provider vocabulary, evidence-grounded: *"advertising, promotional, endorsement, or merchandising use"* as the core phrase, with the understanding (per §6/§9) that exact enumerated lists differ slightly by provider and a provider-specific claim should use that provider's own exact terms rather than the generalized phrase.

---

## 11. CAND-STOCK-EDITORIAL-001 — re-evaluated

1. **Survives.**
2. **Wording refined** — see below.
3. **Genuinely atomic** — one proposition (license scope excludes advertising/promotional/endorsement/merchandising use); does not merge in releases (-002) or exceptions (which no longer has a standalone cross-provider claim — see §13).
4. **Every material clause has support across all four providers** — Getty/iStock Tier 1, Adobe Tier 2/3 (hedged), Shutterstock Tier 1 (definition)/Official Secondary (exact restriction wording).
5. **Does not improperly imply no exceptions** — refined wording explicitly flags that some providers offer a separate authorization path, without naming which, avoiding both overclaiming universality and underclaiming Getty/Shutterstock's real mechanisms.
6. **Does not improperly imply every paid/commercial context is prohibited** — refined wording uses the narrow enumerated-use vocabulary (§10), not "commercial project."
7. **Distinguishes general rule from project determination** — explicit closing clause.

**Recommended final research-stage wording:**

> "A stock-media provider's standard license for content it designates 'Editorial' (or an equivalent editorial-use-only classification) authorizes use for descriptive, newsworthy, or public-interest purposes. Under that standard license, this does not include advertising, promotional, endorsement, or merchandising use. Some providers offer a separate, provider-specific process to authorize such use for a given asset — this proposition does not itself confirm whether such authorization exists for any particular asset or project."

## 12. CAND-STOCK-EDITORIAL-002 — re-evaluated

**Outcome: A — survives cross-provider, with an explicit, carried-forward confidence asymmetry (Getty/iStock/Shutterstock: Tier 1; Adobe: Tier 3, unresolved despite a dedicated hardening attempt this session).** Not preserved merely because Part 1 drafted it — actively re-tested (§4 above) and the Adobe gap did not close; recommend a governance reviewer explicitly decide whether to (a) adopt with Adobe flagged as a lower-confidence leg, or (b) narrow the claim's provider scope to exclude Adobe until independently confirmed. Wording unchanged from Part 1's own synthesis (already appropriately hedged):

> "Stock-media content marked 'Editorial' is typically licensed without the model or property releases that would otherwise support broader commercial use — a separate consideration from, though often related to, the provider's own license-scope restriction."

## 13. CAND-STOCK-EDITORIAL-003 — re-evaluated (disposition changed)

**Outcome: REJECTED as a standalone cross-provider TopicClaim.** This is a genuine reversal of Part 1's drafted candidate, made possible by, and directly because of, this session's more precise Shutterstock finding (§8).

**Reasoning:** Part 1's -003 proposition ("some providers offer separate clearance mechanisms") is **true**, but on closer inspection is not itself an atomic, actionable proposition — it is a *comparative observation about the domain*, not a fact a user or reviewer could be told and act on. Worse, stating it generically risks the exact failure the task's own §15 warned against: a user reading "some providers offer clearance mechanisms" has no way to know whether *their* provider is one of them, and — now that Shutterstock's mechanism is known to be **two functionally different things** (a real clearance service, Rights and Clearance, plus a separate indemnity product, Asset Assurance) — a single cross-provider sentence cannot honestly compress that nuance without either oversimplifying Shutterstock's actual structure or omitting it.

**Resolution: the substance is not discarded, it is redistributed** — each provider-specific candidate (§14 below) that has a real, evidenced exception mechanism (Getty, Shutterstock) states its own mechanism directly, precisely, and by name; providers without one (iStock) or with an unresolved one (Adobe) say so in their own candidate's "known exceptions" field with the correct epistemic hedge. This is a **structural finding recorded in this research document (§6/§8 above, and the comparative table), not a governed claim** — exactly matching the task's own suggested possible outcome that -003 "may be factually true but too operational/provider-variable to deserve a cross-provider governed claim."

---

## 14. Provider-specific candidates

### CAND-STOCK-GETTY-EDITORIAL-001
**Proposition:** Getty Images' standard license prohibits using content it marks "Editorial Content" for commercial, promotional, advertorial, endorsement, advertising, gambling/betting/gaming, or marketing purposes, absent express written authorization on the applicable invoice, sales order confirmation, or licensing agreement. Getty separately offers a "Rights and Clearance" function through which a customer may seek such authorization, including specifically for advertising and promotional use.

**Proposition map:**
- P1 — Getty's Editorial Content definition (descriptive/newsworthy purpose). **SOURCE →** direct fetch, `gettyimages.hk/eula` (×3 across this research program). **SUPPORTED.**
- P2 — Getty's exact enumerated prohibited-use list. **SOURCE →** same. **SUPPORTED**, exact section number unstable (§2), clause text stable.
- P3 — Getty's written-authorization override language. **SOURCE →** same. **SUPPORTED.**
- P4 — Getty's Rights and Clearance function, scoped to include advertising/promotional clearance. **SOURCE →** direct fetch, `gettyimages.hk/rights-and-clearance`. **SUPPORTED.**

**Adds value beyond the structural claim (per §17's test):** names Getty's exact enumerated list and, critically, names and confirms the real, provider-run clearance mechanism the structural claim deliberately declines to name.

**Why it exists (not a restatement):** the structural claim (§11) can only say "some providers offer a path"; this claim can honestly say Getty specifically does, and roughly what that path is for.

**Jurisdiction:** Not a legal jurisdiction — see §21 below; recommend `"Provider contract terms (not a legal jurisdiction) — Getty Images Content License Agreement"`.
**Applicability requirements:** `[]` — see §16's engineering-prerequisite finding.
**Unresolved project dependencies:** `[asset_confirmed_getty, editorial_designation_confirmed, separate_authorization_obtained]`.
**Preliminary CRC/reviewer classification:** **C** — potentially CRC-safe only with additional routing/applicability capability beyond Path A (see §16).
**Readiness grade: R2 — governance-ready.**

### CAND-STOCK-ISTOCK-EDITORIAL-001
**Proposition:** iStock's standard license restricts content marked "editorial use only" (defined as lacking model/property releases and intended for descriptive/newsworthy/human-interest purposes) from commercial, promotional, advertorial, endorsement, advertising, gambling/betting/gaming, or merchandising use. No evidence was found, across two independent research passes, of an iStock-run mechanism to authorize such use for a specific asset — this is a negative finding, not a confirmed absence.

**Proposition map:**
- P1 — iStock's editorial-use-only definition (Section 3(2), same section-label-stability caveat as Getty applies, though only one alternate label was ever observed for iStock across three fetches — materially more stable than Getty's numbering). **SOURCE →** direct fetch, `istockphoto.com/legal/license-agreement` (×2 this research program, both this session's re-fetch and Phase 1A's). **SUPPORTED.**
- P2 — Prohibited-use clause, near-verbatim match to Getty's own list. **SOURCE →** same. **SUPPORTED.**
- P3 — No provider-run clearance mechanism found. **SOURCE →** absence across the primary agreement text and two independent `WebSearch` passes. **Status: NO EVIDENCE FOUND — explicitly not `CONTRADICTED` or `UNSUPPORTED`; this is its own epistemic category, not a weaker version of "supported."**

**Adds value:** the specific enumerated list (near-identical to but not byte-identical with Getty's), the stable effective date, and — genuinely useful to a reviewer — the explicit, correctly-hedged statement that no clearance path is known to exist for this specific provider, which shapes what a reviewer should expect to find (or not find) when evaluating an iStock Editorial asset.

**Jurisdiction:** Same recommendation as Getty's candidate, substituting iStock's own agreement name.
**Applicability requirements:** `[]`.
**Unresolved project dependencies:** `[asset_confirmed_istock, editorial_designation_confirmed]` — deliberately omits `separate_authorization_obtained`, since no mechanism to obtain one is evidenced; a future submission that somehow demonstrates one would itself be new information requiring this candidate's own revision, not something CRC/Reviewer should expect to resolve via a dependency prompt.
**Preliminary CRC/reviewer classification:** **C**, same reasoning as Getty's.
**Readiness grade: R2 — governance-ready.** (The core rule is R2-strength Tier 1 evidence; the negative finding is correctly epistemically hedged rather than overclaimed, which is itself what makes it governance-ready rather than blocked.)

### CAND-STOCK-SHUTTERSTOCK-EDITORIAL-001
**Proposition:** Shutterstock distinguishes "Commercial" content (usable to commercialize, monetize, sell, promote, or advertise a product, business, or service) from "Editorial" content (which cannot be used for those purposes, being intended for public-interest/news use). Shutterstock separately offers a "Rights and Clearance" service to obtain third-party permissions for promotional use of Editorial assets, and a related "Asset Assurance™" product that adds indemnification once such permission/clearance has been secured — the two are functionally distinct (clearance vs. insurance), not one undifferentiated exception.

**Proposition map:**
- P1 — Shutterstock's Commercial/Editorial functional definition. **SOURCE →** direct fetch, `submit.shutterstock.com` (official domain). **SUPPORTED**, Tier 1.
- P2 — Exact prohibited-use characterization (direct/indirect advertising, including the "social media post promoting a holiday" example). **SOURCE →** `WebSearch` synthesis, Tier 3, not independently primary-verified — the license-agreement text itself remains inaccessible (§7). **PARTIALLY SUPPORTED.**
- P3 — Rights and Clearance obtains third-party permissions for promotional use. **SOURCE →** direct fetch of Shutterstock's own press release via `stocktitan.net` republication — Official Secondary. **SUPPORTED**, not Verified Primary.
- P4 — Asset Assurance adds indemnification on top of an already-obtained commercial license, distinct from Rights and Clearance itself. **SOURCE →** same. **SUPPORTED**, same tier caveat.

**Adds value:** the precise two-layer mechanism characterization (§8) that neither Part 1 nor a generic cross-provider claim could honestly state, and the functional (rather than enumerated-list) definitional structure that distinguishes Shutterstock's drafting approach from the other three providers.

**Jurisdiction:** Same pattern, substituting Shutterstock's own Terms of Service name.
**Applicability requirements:** `[]`.
**Unresolved project dependencies:** `[asset_confirmed_shutterstock, editorial_designation_confirmed, clearance_or_assurance_obtained]`.
**Preliminary CRC/reviewer classification:** **C**, same reasoning.
**Readiness grade: R2 — governance-ready, with an explicit caveat carried into governance review: the exact prohibited-use wording and the precise legal mechanics of Rights and Clearance/Asset Assurance rest on Official Secondary, not Verified Primary, sourcing.** A governance reviewer may reasonably want the raw license-agreement text before final Adoption even if not before proceeding to review — this grade reflects "ready to be reviewed," not "ready to be adopted without further inquiry."

### Adobe Stock — no dedicated provider-specific candidate drafted

**Deliberately not drafted**, per the task's own instruction that a provider may need zero candidates and per §17's "should not merely restate the cross-provider claim" test. Three independent direct-fetch attempts this session (helpx page ×2, PDF ×1, on top of Phase 1A's own failed PDF attempt) produced no Tier 1/2 evidence beyond what Phase 0/Phase 1A already captured (a single Tier 2 fetch, zh-TW-rendered, from `stock.adobe.com/license-terms`). Drafting a dedicated Adobe candidate now would either (a) restate the already-captured Tier 2 general restriction with no new information, or (b) rest the release-relatedness and exception-mechanism findings (§4/§5, both Tier 3) on evidence this document's own discipline says should not be treated as load-bearing. **Readiness grade for a hypothetical Adobe-specific candidate: R3 — BLOCKED.** Adobe remains covered only at the cross-provider level (§11/§12), each explicitly hedged for Adobe.

## 15. Cross-provider / provider-specific layering and duplication analysis

**Layering (confirmed, refined from Part 1's own tentative example):** the structural claim (§11) is *conceptual framing* — it tells a user or reviewer that this shape of rule generally exists and that exceptions may exist without naming which. Each provider-specific claim (§14) is the *concrete current instance* — naming the exact prohibited-use list and, where evidenced, the exact mechanism and its real legal effect. This mirrors the task's own illustrative structure and survived contact with the actual evidence, including the one place (Shutterstock) where the concrete instance turned out to be genuinely more nuanced (two-layered) than a flat "has an exception" fact would have suggested.

**Duplication test:** if both the structural claim and, say, `CAND-STOCK-GETTY-EDITORIAL-001` were retrieved together for the same user, the structural claim's own final sentence ("some providers offer a separate... process... this proposition does not itself confirm whether such authorization exists") and the Getty claim's specific naming of Rights and Clearance are **complementary, not redundant** — the general sentence sets expectation, the specific sentence delivers on it. No composition/Projection logic is designed here (per task instruction) — this is a description of how the two *could* coexist conceptually, not an implementation.

## 16. Path A engineering prerequisite exposed (report only, not solved)

**A precise, load-bearing finding, directly requested by task §22.** Path A's approved architecture gates retrieval on an explicit `third_party_source_rights` goal existing — but nothing in that architecture, as approved, lets Retrieval distinguish *which provider* the user meant. A user asking "Can I use my Adobe Stock image commercially?" would, under Path A alone, become a topic-candidate for **every** claim tagged `third_party_source_rights` — including `CAND-STOCK-GETTY-EDITORIAL-001`, which has nothing to do with their actual question. Because `AssetProviderMention` is not implemented (Phase 0.5, deliberately deferred pending exactly this kind of demonstrated need), **there is currently no applicability mechanism to narrow a provider-specific claim to users who actually mentioned that provider** — and PM's standing decision is zero new `ApplicabilityFact`s, so this cannot be solved by adding one either, even once `AssetProviderMention` exists, without a corresponding new fact type.

**This is why every provider-specific candidate above is classified C, not B, in §14's CRC/reviewer classification** — they require not just Path A (already NO-GO pending governed knowledge) but a **second, currently-unscoped capability**: either `AssetProviderMention`-driven applicability (which would need a new `ApplicabilityFact`, itself requiring a fresh PM decision reversing or extending the current zero-new-facts posture) or some other narrowing mechanism not yet designed. **Reported, not solved, per task instruction.**

## 17. Jurisdiction metadata — recommendation

Re-examined per task §21's five options, using only currently-valid representations:

- **(A) `Global`** — rejected, unchanged from Part 1's own conclusion: these are contract terms, not jurisdiction-neutral legal doctrine in COPY-004's specific defined sense.
- **(B) provider-contract-specific text in the `jurisdiction` field** — closest fit given the field is free text.
- **(C) `"Not jurisdiction-specific"`** — accurate but under-informative on its own (doesn't say *why*, or what governs instead).
- **(D)** another currently-valid representation — none found that improves on a combination of B+C.
- **(E) the field is semantically inadequate** — true as a structural observation, but not itself an answer to "what do we write today."

**Recommendation: combine B and C.** Least-misleading current representation: `"Not a legal jurisdiction — governed by [Provider]'s own Terms of Service / License Agreement, independent of user or asset geography."` — descriptive, accurate, uses only the field's existing free-text flexibility, requires no schema change.

**Separately, per task's explicit request (not implemented, only stated):** a future schema evolution should probably introduce a distinct concept — something like a `governing_source_type` or `claim_basis` field (`statutory_law` | `contractual_terms` | ...) — so `jurisdiction` can keep meaning exactly what it means today for legal-doctrine claims (COPY-001/002/003/004) without being asked to also carry an unrelated "which contract governs" concept for domains like this one. This would let a future engineer stop having to choose between an honest-but-verbose free-text jurisdiction value (as recommended above) and a schema that actually models the distinction. **Not authorized or scoped here — reported as the task requested.**

## 18. Applicability & unresolved-dependency summary (all candidates)

| Candidate | `applicability_requirements` | Why safe | `unresolved_project_dependencies` |
|---|---|---|---|
| -001 (structural) | `[]` | Path A gate already required before topic lookup occurs | `[which_provider]` |
| -002 (release-relatedness) | `[]` | Same | `[which_provider]` |
| GETTY-001 | `[]` | Same, **but see §16 — provider-narrowing gap remains unsolved beyond Path A** | `[asset_confirmed_getty, editorial_designation_confirmed, separate_authorization_obtained]` |
| ISTOCK-001 | `[]` | Same, same caveat | `[asset_confirmed_istock, editorial_designation_confirmed]` |
| SHUTTERSTOCK-001 | `[]` | Same, same caveat | `[asset_confirmed_shutterstock, editorial_designation_confirmed, clearance_or_assurance_obtained]` |

No candidate reuses Part 1's original three-string dependency list uniformly — each set was re-derived from what that specific candidate's own proposition map actually requires, per task instruction.

## 19. Reviewer evidence, refined per provider

Building on Part 1 §27, provider-specific nuance added:

- **Getty:** proof of Rights and Clearance approval (if commercial use is claimed), not merely the underlying asset license.
- **iStock:** absent any known mechanism, a reviewer should treat an Editorial-designated iStock asset used commercially as presumptively non-conforming unless independent evidence of authorization is produced — there is no known provider-side approval record to check for.
- **Adobe Stock:** given the Tier 3 finding that contributors may not be contactable through official channels (§5), a reviewer should treat a claimed "I got written consent from the copyright owner" representation with real scrutiny — ask *how*, specifically, given the apparent absence of an official contact path.
- **Shutterstock:** proof of Rights and Clearance approval (for the underlying permission) is the load-bearing evidence; a stated Asset Assurance enrollment alone is not sufficient, since Asset Assurance is indemnity, not permission (§8) — these are two different pieces of evidence a reviewer must not conflate.

## 20. Source-versioning / maintenance findings

| Provider | New finding this session |
|---|---|
| Getty | Confirmed unstable section numbering across 5 fetches — monitoring should track clause *text*, not section numbers, or it will silently break. |
| iStock | Most stable of the four — consistent "July 2026" date across 3 fetches total this program. |
| Adobe | No new date evidence; PDF format remains a real monitoring obstacle, independently confirmed a second time this session. |
| Shutterstock | New finding: the primary legal pages and the contributor-help pages sit on different subdomains with different bot-access postures (blocked vs. accessible) — a future monitor should plan for this asymmetry explicitly rather than assuming one working fetch path covers both. |

## 21. Candidate readiness grades — summary

| Candidate | Grade | Basis |
|---|---|---|
| CAND-STOCK-EDITORIAL-001 (structural) | **R2** | Tier 1/2 across all four providers, refined wording avoids overclaiming |
| CAND-STOCK-EDITORIAL-002 (release-relatedness) | **R2**, Adobe leg flagged | Tier 1 for 3 of 4 providers; Adobe remains Tier 3 despite a dedicated hardening attempt |
| CAND-STOCK-EDITORIAL-003 (exceptions exist) | **R4 — REJECTED** as a standalone claim | Substance redistributed into provider-specific candidates (§13) |
| CAND-STOCK-GETTY-EDITORIAL-001 | **R2** | Strong Tier 1 across all four proposition-map entries |
| CAND-STOCK-ISTOCK-EDITORIAL-001 | **R2** | Strong Tier 1 for the rule; negative finding correctly epistemically hedged |
| CAND-STOCK-SHUTTERSTOCK-EDITORIAL-001 | **R2, with an explicit Verified-Primary-outstanding caveat** | Tier 1 definition; Official Secondary (not primary) for exact restriction text and mechanism mechanics |
| Adobe-specific candidate | **R3 — not drafted, BLOCKED** | Insufficient direct-fetch evidence across two full research sessions |

## 22. Unresolved gaps carried forward

1. Adobe Stock: no successful direct fetch of any official Adobe page achieved across two full research sessions (5 attempts total) — the single most persistent evidence gap in this research program.
2. Shutterstock's primary license-agreement text: 0/7 attempted fetches succeeded across two sessions — confirmed structural, not incidental.
3. Getty's section-number instability: resolved via citation strategy, not via achieving an actual stable number — a future PDF-level check remains recommended before formal Adoption.
4. iStock's negative clearance finding remains "no evidence found," not "confirmed absent" — a third research pass would not likely change this without an iStock-side disclosure the company has no reason to volunteer.
5. The Path A provider-narrowing engineering prerequisite (§16) is unresolved and unscoped — a real, load-bearing gap between "Path A exists" and "provider-specific claims can be safely retrieved."
6. The jurisdiction-field semantic gap (§17) remains unresolved at the schema level, by design (not authorized here).

## 23. Out-of-scope future research signals

None newly encountered this session requiring flagging beyond what Phase 0 already recorded — no AI-input-restriction language was newly surfaced in any source fetched or searched during this specific Phase 1B pass (the Editorial-focused queries did not incidentally surface AI/ML clauses the way some of Phase 0's own broader queries did).

## 24. Part 2 recommendation

**Bring `CAND-STOCK-EDITORIAL-001`, `-002` (with its Adobe caveat), `CAND-STOCK-GETTY-EDITORIAL-001`, `CAND-STOCK-ISTOCK-EDITORIAL-001`, and `CAND-STOCK-SHUTTERSTOCK-EDITORIAL-001` (with its Verified-Primary caveat) to PM for formal governance review as a package.** Do not bring a standalone `-003` (rejected, §13) or an Adobe-specific candidate (not drafted, R3). Flag the Path A provider-narrowing gap (§16) and the jurisdiction-field semantic gap (§17) to PM alongside the candidates themselves, since both materially affect what "governance-ready" can practically deliver even after Adoption.

---

**Part 2 research conducted:** 2026-08-17. **Status:** Complete for Phase 1B scope. **Next step:** PM decision on whether to convene formal governance review for the R2-graded candidates above — this document does not convene that review itself.
