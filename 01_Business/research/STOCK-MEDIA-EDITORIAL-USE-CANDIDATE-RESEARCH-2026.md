# Stock-Media "Editorial Use" — Candidate-Claim Research (Phase 1A)

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
