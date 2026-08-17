# Living Knowledge — Third-Party Stock Media: Domain Discovery & Scoping

**Status: RESEARCH ARTIFACT, NOT GOVERNED KNOWLEDGE.** Candidate source material only, per `GOVERNED-CLAIMS.md`'s own governance discipline ("existing repo research is candidate source material only — never automatically governed knowledge"). Produced 2026-08-17 as a **Phase 0 domain-discovery and scoping pass**, per PM task instruction. **Does not create, adopt, or modify any `GOVERNED-CLAIMS.md` entry, any `TOPIC-RELATIONSHIPS.md` entry, any Matrix row, any CRC behavior, or any code.** No governed claim exists in this domain as of this writing.

**Originating demand signal:** `PRD_LIVING_KNOWLEDGE_SOURCE_INPUTS_v0.1.md` §3 (Source A — CRC User Demand) already recorded this signal at PRD-authoring time:

> "I sourced them myself via Getty Images." — production CRC conversation. CRC retained the fact but rendered: *"You also mentioned 'Getty Images', which I wasn't able to match to a specific platform yet."*

This document is the first dedicated research pass against that recorded signal — not a new discovery, but the deliberate, structured follow-through the PRD's own lifecycle (`Demand signal → research → candidate knowledge → human governance → governed knowledge`) calls for.

---

## 1. How the signal actually surfaced (architecture reading)

Read before researching Getty itself, per task instruction. Key files: `08_Platform/app/lib/interview-engine/extraction.ts`, `handoff.ts`, `types/interview-engine.ts`; `08_Platform/app/lib/retrieval-engine/types.ts`, `retrieve.ts`; `08_Platform/app/lib/projection-layer/understood-summary.ts`.

CRC's tool-mention pipeline (`normalizeCandidate` → an explicit **alias registry** mapped to canonical Matrix tool identifiers) tried to resolve "Getty Images" the same way it resolves "Runway," "Kling," etc. It correctly failed, because Getty Images is not in that registry — the registry only knows AI *generation* platforms. The unresolved mention was carried through as `handoff.unresolved_aliases`, surfaced by Retrieval as a `'unresolved_alias'` diagnostic (`retrieve.ts:83-84`), and rendered by `understood-summary.ts`'s `unresolvedMentionsClause()` as the generic "wasn't able to match to a specific platform yet" sentence (`understood-summary.ts:177-182`).

**This is not a bug and not a near-miss.** The system behaved exactly as designed: it correctly declined to silently misclassify Getty Images as an AI generation tool. The deeper finding is architectural, not cosmetic — see §9 below: **Getty Images is not the kind of entity this pipeline's "tool" concept models at all**, and no existing knowledge-object type cleanly fits it either. The rendered sentence is honest ("not able to match yet") rather than wrong, but it also can't currently *become* right without new schema, which this task is not authorized to build.

## 2. Existing LK architecture surveyed (unmodified, read-only)

| Document/module | Relevant finding |
|---|---|
| `PRD_LIVING_KNOWLEDGE_SOURCE_INPUTS_v0.1.md` | Already names this exact signal (§3) and lists "Source assets — Stock media, licensed photography, footage, music, client-provided assets" as one of several directional future domains (§20). Establishes the governing lifecycle and the "no automatic CRC publication" rule this document fully respects. |
| `GOVERNED-CLAIMS.md` | Four Adopted claims exist (CLAIM-COPY-001 through -004), all Copyright & Human Authorship, all `topic` values inside the existing 5-value `GoalCategory` enum. No stock-media or third-party-asset claim exists. Entry template and governance discipline (Lifecycle vs. CRC Eligible as separate gates, no automated legal-reviewer role, `Jurisdiction: Global` meaning) reused unchanged for candidates below. |
| `TOPIC-RELATIONSHIPS.md` | One relationship exists (`copyright_ownership → copyrightability`), `CRC Eligible: Pending`. Confirms the double-gate model and one-hop-only rule this document's candidate relationship (§10) would need to follow if ever adopted. |
| `PLATFORM-RIGHTS-MATRIX.md` | 9 rows, all AI *generation* platforms (Runway, Kling, Pika, Veo, Firefly, Sora [discontinued], Gemini API, Gemini Consumer, Midjourney, ElevenLabs). `MatrixRow.identifier` is defined as "the same string Interview's own `normalizeCandidate` resolves to" — i.e., structurally an AI-tool identifier, not a general-purpose "any named platform" slot. |
| `08_Platform/app/lib/retrieval-engine/types.ts` | `GOAL_CATEGORIES = ['commercial_use', 'copyright_ownership', 'copyrightability', 'likeness', 'unknown']` — **no category represents "third-party source-material rights/clearance."** `APPLICABILITY_FACTS = ['jurisdiction', 'tool_plan_tier']` only — **no fact type represents "user used licensed/stock source material."** `client_supplied_asset` was explicitly considered and *rejected* for Phase 1 (comment in this same file) for exactly the reason that matters here: no reliable structured fact exists, and text-matching a free-text `ScopedObservation.note` to manufacture one would be "pretending a predicate is supported when the underlying fact isn't." |
| `08_Platform/app/types/interview-engine.ts` | `ProjectFacts` = `{ intended_use, workflow_role, jurisdiction }` only. `ToolMention` is structurally an AI-tool concept (`access_surface`, `plan_tier`) with no analogue for "licensed source asset." A user's Getty statement can currently only be captured as free-text inside a `ScopedObservation.note` — never as a structured, queryable fact. |
| `CRC-PUBLICATION-POLICY.md` | Six principles (Verified≠sufficient, preserve meaning, subject-sensitivity gate, narrow-before-withhold, stability-over-novelty) reused as the classification lens in §11 below. Nothing in it is domain-specific to copyright — applies unchanged to a future stock-media claim. |
| `SI8-POSITIONS.md` / `EDGE-CASES.md` / `PENDING-QUESTIONS.md` | No existing entry mentions Getty, stock media, third-party source assets, or client-supplied content. Confirmed via direct grep — this is genuinely unclaimed territory, not a duplicate of existing work. |
| `06_Operations/legal/GETTY-SHUTTERSTOCK-AGREEMENT-STRUCTURE-RESEARCH.md` (Mar 2026) | **Not on-point for this task**, despite the name — this is research about SI8's *own* contributor/buyer contract structure (modeling SI8's filmmaker agreement on Getty's contributor/customer separation), not about CRC users licensing stock assets as AI input. Flagged so it isn't mistaken for prior art on the actual question. |
| `06_Operations/chain-of-title-delivery/research/getty-sop-research.md` (Feb 2026) | Also not on-point — about how Getty *delivers* license documentation/certificates to buyers (a Chain-of-Title-delivery UX benchmark), not about what a Getty license permits regarding AI use. Same caution applies. |

**No existing repo research addresses this task's actual question** (whether/how a stock-media license covers use as AI input, and what that means for CRC/Commercial Assurance). Both superficially-matching files above are tangential. This is genuinely new-domain research, not a duplicate.

---

## 3. The core product question — these are NOT one question

The task's own decomposition (A–J) held up under research. Confirmed as **materially distinct** questions, each requiring a different kind of evidence:

| # | Question | Distinct because |
|---|---|---|
| A | Did the user obtain a valid license at all? | Pure fact question, unverifiable by CRC (no account access). |
| B | Does the license cover this *commercial/client* use? | Depends on license type + content classification (Creative vs. Editorial) — see §4. |
| C | Which license/plan/tier? | RF vs. RM vs. RR is a different axis from Creative vs. Editorial — commonly conflated, confirmed distinct in current Getty terms (§4). |
| D | Editorial-only restriction | A hard categorical bar, not a tier/scope question — confirmed identical in shape across Getty, iStock, Adobe Stock (§4, §7). |
| E | Third-party rights within the image (people, trademarks, art, buildings) | Getty/iStock explicitly disclaim guaranteeing this beyond a narrow release-based warranty (§5). |
| F | What releases Getty/iStock actually represent vs. don't | Narrower than commonly assumed — confirmed in §5. |
| G | AI input/reference use | **The highest-value finding of this research** — see §6. Getty and iStock's own terms directly and explicitly address this, and the answer is not what casual assumption would predict. |
| H | Modification/derivative rights | Different rule for Editorial (technical-only) vs. Creative content (§4, §7). |
| I | Output/downstream rights in AI-generated result | A distinct, harder question this research could not resolve from platform terms alone — see §12 (open questions). Depends on interaction between the stock license, the AI platform's own terms, and copyright law (COPY-001/002/003 territory) simultaneously. |
| J | Documentation/evidence | See §8 — Getty's own model (no per-asset certificate; account history + invoice) is directly informative for what SI8 should expect a user to be *able* to produce, not just what would be ideal. |

Confirms the task's own instruction: do not collapse these. They separately determine whether "I sourced them from Getty" is even good news.

---

## 4. Getty's current product/license taxonomy (verified live, 2026-08-17)

**Two orthogonal axes — commonly conflated, confirmed genuinely separate in current Getty terms:**

1. **License model:** Royalty-Free (RF) / Rights-Managed (RM) / Rights-Ready (RR) — governs *scope of permitted use* (unlimited vs. specific-use).
2. **Content classification:** Creative / Editorial — governs *purpose* (commercial-eligible vs. news/commentary-only), independent of which license model applies to it.

A Creative-classified image can be licensed RF or RM; an Editorial-classified image is essentially never commercial-use-eligible regardless of license model, absent Getty's explicit written authorization.

| Element | Current Getty terms (per direct fetch, "Last Updated: April 2026") |
|---|---|
| License types | Royalty-Free (RF) — one-time fee, unlimited reuse, global, permanent, non-exclusive. Rights-Managed (RM) — scoped by size/placement/duration/geography. Rights-Ready (RR) — similar scoped restrictions to RM. |
| Editorial definition | Content "marked as 'Editorial Content' or 'intended for editorial use'... primarily intended for editorial purposes, i.e., descriptive purposes, such as news reporting and discussion of current events or newsworthy topics" (§3.7 per fetch). |
| Editorial commercial bar | "You must not...use...content marked as 'Editorial Content'...for any commercial, promotional...advertising, endorsement...or marketing purpose" unless Getty explicitly authorizes in writing (§3.7). |
| Editorial modification | Only "technical quality" changes permitted; "you must not otherwise change the content" (§3.2). |
| Sublicensing | Non-transferable, non-sublicensable by default (§4), **with two named exceptions**: (a) purchaser's own employer/client, if purchased on their behalf — but only one party may reuse it, not both; (b) subcontractors bound to the same agreement, for the same project only. |
| AI/ML restriction | **See §6 — this is the highest-value single finding.** |

**Source hierarchy applied:** Tier 1 — direct fetch of `gettyimages.com/eula` (redirected by the server to `gettyimages.hk/eula`, same document, regional domain — noted, not assumed identical without this disclosure). Fetched 2026-08-17. One material uncertainty: the fetch's own section numbering (**"§3.11"**) conflicts with a separate secondary-source synthesis citing **"§3(k)"** for the same clause. Both agree on substance; neither was cross-verified against a downloadable PDF of the *current* (2026) agreement in this pass — flagged, not resolved. A future hardening pass should resolve this via direct PDF download rather than rendered-HTML fetch.

## 5. Model/property releases — narrower than the casual "Getty = safe" assumption

Confirmed via direct fetch, `gettyimages.hk/eula` §9.2–9.3, §10(c):

- Getty warrants non-infringement of privacy/personality rights **only** for RF content (excluding Editorial) and for RM/RR content Getty has "specially notified" as model/property-released.
- Getty explicitly makes **"no warranty"** regarding "names, persons, trademarks, product appearance, logos...designs, artwork or architecture" depicted in content (§9.3) — the user bears "sole responsibility to determine whether permissions are needed" and to obtain them.
- Editorial content "generally is not licensed" for releases at all.
- For Getty's own Generative AI product specifically (§10(c)): Getty does **not** warrant that AI-generated content has consent for "real persons' names, likenesses, trademarks...or other IP-protected elements," even when the user supplied a licensed reference image.

**Implication for SI8:** "I licensed it from Getty" answers copyright/license-permission questions far more than it answers likeness/trademark/third-party-IP questions inside the image. This is a real, evidenced gap between what a CRC user is likely to *assume* "Getty-sourced" means and what it actually covers — directly relevant to SI8's existing `likeness` GoalCategory and to Domain I/L reviewer guidance, not just to a new domain.

## 6. AI-input/transformation findings — the central finding of this research

**This is the single most consequential, most surprising result of this pass**, and it directly resolves (at the research-question level, not the governance level) the task's item 8 sub-questions A–D.

Getty's current Content License Agreement (`gettyimages.hk/eula`, direct fetch, 2026-08-17) contains an explicit AI/ML clause (cited as §3.11 by the direct fetch; a secondary synthesis cites §3(k) for the same substance — see §4's disclosed discrepancy):

> "You must not use...content...for any machine learning and/or artificial intelligence purpose..."
>
> "'Training'... [means] using licensed content directly **or indirectly (e.g., uploading to third-party AI tools)** to develop or improve machine learning technology."

iStock's **separately maintained** license agreement (`istockphoto.com/legal/license-agreement`, direct fetch, "LAST UPDATED: July 2026", §3.15) contains near-identical substantive language:

> "you may not use content...for any machine learning or artificial intelligence purposes"... "these permitted uses of artificial intelligence technology do not allow for use in connection with any training, fine‑tuning or other data ingestion of any machine learning and/or artificial intelligence models, including, for example, any generative training technology."

**Distinguishing the four sub-questions the task asked to keep separate (§8 of the task):**

- **(A) Getty restricting use of its content to train an AI model** — Yes, explicitly, both platforms.
- **(B) Getty restricting a customer from uploading a licensed asset into a generative-AI tool** — **Also yes**, and this is the finding that breaks the casual assumption: Getty's own definition of prohibited "training" expressly names "uploading to third-party AI tools" as an *indirect* form of the same prohibited use. This is not a separate, lesser restriction — Getty's terms structurally collapse (B) into (A). A CRC user's literal scenario — "I uploaded Getty photos into Kling and animated them" — reads, on the plain text of Getty's own §3.11, as falling inside this prohibition, independent of whether Kling itself trains on uploaded input.
- **(C) Getty restricting creation of derivative/synthetic output** — Not separately addressed as its own clause; folded into (A)/(B) above, since the prohibition is framed around the *use* (training/uploading), not the resulting output artifact.
- **(D) The third-party AI platform's own rules concerning uploaded content** — Genuinely separate, and Getty's terms do not purport to control it (Kling's own terms about what SI8 can do with input/output are a wholly independent contract — see §9, the two-contract problem, confirmed as a useful and accurate model by this finding, not merely a hypothesis).

**One narrow carve-out exists:** Getty's own first-party "Generative AI by Getty Images" product is licensed separately and permits AI modification of *Creative* (never Editorial) content, with its own indemnification (a per-image floor figure appears in secondary sources — **not independently re-verified to primary-source precision in this pass**, flag only). This carve-out is explicitly Getty's *own* tool, not a license to use *third-party* tools — reinforces rather than undermines the finding above.

**Confidence and caveat:** This finding rests on one direct fetch per platform (Getty, iStock), both consistent with each other and internally consistent on substance. It has **not** been cross-verified against a downloaded PDF, has the unresolved §3.11-vs-§3(k) section-number discrepancy noted above, and — critically — **has not been checked against SI8's own AI-platform Matrix rows** (Runway, Kling, etc.) for whether *those* platforms' own terms independently prohibit or permit uploaded third-party-licensed input on their side. This is exactly the "two-contract problem" (§9) and is flagged, not resolved, here.

## 7. Cross-platform generalization check (Adobe Stock, Shutterstock)

Not a source-hardening pass (per task scope) — a shape comparison only.

| Platform | Commercial/Editorial split | Explicit AI-input/training restriction | License-tier structure | Verification tier |
|---|---|---|---|---|
| **Getty Images** | Yes — Creative vs. Editorial, orthogonal to RF/RM/RR (§4) | Yes, explicit and broad (§6) | RF / RM / RR | Direct fetch (primary) |
| **iStock** | Yes — "Editorial use only" content, same shape as Getty (§3.2) | Yes, near-identical language to Getty (§3.15) | Standard / Extended | Direct fetch (primary) — confirmed a **separately maintained** agreement from Getty's, same corporate parent (see §9 of task / Getty vs. iStock below) |
| **Adobe Stock** | Yes — "Editorial Use Only" content, same shape, no releases, no commercial use (direct fetch, `stock.adobe.com/license-terms`) | **Not found** on the core license-terms page fetched directly. A prior WebSearch-only synthesis (lower-confidence tier, not independently confirmed) referenced Adobe's separate Gen AI User Guidelines / Additional Terms documents as the more likely home for any such restriction — **that document could not be fetched in this pass** (connection reset). This is a genuine, disclosed gap, not an assumed "no restriction." | Standard / Enhanced / Extended | Direct fetch (primary) for commercial/editorial; restriction question unresolved |
| **Shutterstock** | Yes, per WebSearch synthesis only (`shutterstock.com/license` returned HTTP 403 — bot-blocked, consistent with the exact friction pattern already documented in `MATRIX-LEARNINGS.md` for other platforms' help/legal pages) | Yes, per WebSearch synthesis — and describes a materially **different boundary** than Getty/iStock: prohibits using content as AI *training data*, but does **not** appear to prohibit using AI *editing software* on the content, "provided that such software does not train on the Visual Content." A separate "Enhanced AI License" is also referenced as removing most restrictions. **Not independently primary-verified — WebSearch synthesis only, explicitly flagged as the lower source tier per this task's own instructions.** | Standard / Enhanced (+ separate Enhanced AI License) | WebSearch synthesis only (site blocked automated fetch) |

**Generalization conclusion:** The domain *shape* generalizes well — every platform checked has some version of (a) a commercial/editorial split, (b) a license-tier/scope structure, (c) sublicensing/client-use provisions, (d) some relationship to AI use. The *specific rules* do **not** generalize — Shutterstock's apparent train-vs-edit distinction, if confirmed, is a materially different boundary from Getty/iStock's broader "uploading counts as indirect training" framing, and Adobe Stock's core terms page did not surface an equivalent restriction at all in this pass. **This is itself the key architectural lesson for domain design:** a Getty-only claim would be too narrow (Shutterstock's users hit a different rule); a single undifferentiated "stock media and AI" claim would be inaccurate (it would silently imply Shutterstock's narrower "training only" bar or Getty's broader "any upload" bar applies universally, when the platforms disagree). See §10.

## 8. Evidence a reviewer would need — REQUIRED / USEFUL / CONTEXTUAL

Derived from Getty's own documented delivery model (`getty-sop-research.md`, Feb 2026 — itself only a UX benchmark, not authority, but a reasonable proxy for what evidence actually *exists* for a user to produce) plus the license findings above.

| Tier | Item | Why |
|---|---|---|
| **Required** | Exact asset ID / license record (Getty's account "License History" is the actual system of record — no per-asset certificate exists) | Without this, nothing else in this table is checkable at all. |
| **Required** | Content classification: Creative or Editorial | Gates commercial eligibility categorically (§4). |
| **Required** | Confirmation of how the asset was used relative to AI (as visual reference only / uploaded directly into a generative tool / incorporated into final output) | Directly implicates §6's finding — different uses may fall on different sides of §3.11-type clauses. |
| **Useful** | License model (RF/RM/RR) and account/subscription type (individual vs. team/enterprise) | Affects scope and client-use eligibility (§4, §9 of this doc / task item 15). |
| **Useful** | Whether the license was purchased by the submitter or supplied by a client | Directly implicates the non-sublicensable-by-default rule and its two narrow exceptions (§4). |
| **Contextual** | Date licensed, relative to any Terms version change | Getty/iStock terms carry effective dates (Apr/Jul 2026 respectively) and evolve — see §14 (task item 16) below; contextual because SI8 has not yet decided which date should govern (open question). |
| **Contextual** | Whether model/property releases were "specially notified" for the specific asset | Only load-bearing if the content depicts an identifiable person — connects to `likeness` GoalCategory, not this domain alone. |

## 9. The two-contract problem — confirmed as a real, useful model (not adopted doctrine)

The task's hypothesis pressure-tests as accurate given §6's finding: a user who licenses Getty/iStock content and then uploads it to an AI generation platform is potentially subject to **two independent contracts simultaneously**:

1. **The stock license** — governs whether the user was permitted to use the *input* this way in the first place (§6 shows this is a real, not hypothetical, constraint for at least Getty/iStock).
2. **The AI platform's own Terms** (Matrix territory — Runway, Kling, etc.) — governs the user's representations about *having rights to submitted input*, plus rights in the *output*.

Both must be satisfied; satisfying one says nothing about the other. This is not a new invented doctrine — it is the direct, evidenced structural consequence of §6's finding, expressed as a description, not a governed claim.

## 10. Domain boundary recommendation

Pressure-tested against the task's five options using §7's generalization result.

- **Getty alone** — rejected. §7 shows iStock (a separate contract, same parent) and the broader stock-media pattern would be excluded arbitrarily, and Getty-only framing would miss the fact that other platforms draw the AI-restriction line differently (§6 vs. Shutterstock's apparent train/edit distinction).
- **A maximally abstract "third-party rights" domain** — rejected. Would swallow trademark, likeness, and IP-infringement territory that already has (or will have) its own domain identity; too abstract to produce atomic, checkable claims.
- **Recommended: "Third-Party Source Assets"**, matching the PRD's own existing vocabulary (§20's "Source assets" domain, §3's "Third-party source assets / stock-media licensing" label) rather than inventing new terminology. This is deliberately the *broader* umbrella (would eventually also cover licensed music, licensed footage, client-supplied assets — none researched in this pass) with **"Stock Media Licensing" as its first subdomain**, scoped to what was actually researched here: Getty, iStock, Adobe Stock, Shutterstock.

This avoids both failure modes the task named: not Getty-only (too narrow — misses iStock's separate contract and cross-platform rule variance), not infinitely abstract (Stock Media Licensing is concrete enough to produce atomic claims; the umbrella name is reserved for siblings this pass didn't touch).

## 11. CRC-safe vs. Reviewer-only preliminary classification

Applying `CRC-PUBLICATION-POLICY.md`'s six principles and the Publication Test to what this research actually found (not a publication decision — a classification exercise per task instruction):

| Candidate knowledge | Preliminary classification | Why |
|---|---|---|
| "Major stock-photo licenses commonly restrict using licensed content for AI/machine-learning purposes, including as input to third-party AI tools — check your specific license" | **Likely CRC candidate after narrowing**, Reviewer-only until then | Passes Principle 1 (well-verified for Getty/iStock) but fails the Publication Test as stated broadly — "commonly" risks misapplying Getty's specific broad "any upload counts" framing to a Shutterstock user whose narrower rule might not restrict their exact use (§7). Needs per-platform narrowing (Principle 5) before CRC eligibility is even a live question. |
| "A stock-media license and a 'commercially clear to use' status are two different questions" | **Likely CRC candidate**, structurally identical in shape to already-approved CLAIM-COPY-004 | No sensitivity-gate concern (Principle 3 doesn't apply — not a No List subject), a pure framing/distinction claim like COPY-004, which is exactly the kind of thing COPY-004 already proved SI8 is comfortable publishing once properly sourced. |
| "Editorial-designated stock content cannot be used for commercial/advertising purposes" | **Likely CRC candidate**, high confidence, consistent across all 4 platforms checked | Passes Publication Test cleanly — plain, well-supported, doesn't require project-specific application to be useful; a user can self-check "is my asset marked Editorial?" |
| "Stock licenses generally don't cover client-use unless purchased on the client's behalf or under a subcontractor clause" | **Reviewer-only candidate** | Requires knowing who purchased the license and under what account — a fact CRC cannot verify, closer to Commercial Assurance evidence-review territory (§8) than to a general educational statement. |
| Getty's specific "indirect training via third-party upload" framing, applied to a *specific* named AI platform (e.g. "...so uploading to Kling specifically is not covered") | **Reviewer-only, likely permanently** | Would require combining two separate contracts' terms (§9) into a single user-facing conclusion — precisely the kind of project-specific, two-source synthesis Commercial Assurance review exists for, not CRC's bounded educational role. |

## 12. Minimum unresolved facts before this domain's knowledge becomes CRC-useful

Confirmed the task's own hypothesis — "I sourced the images myself from Getty Images" resolves almost none of what's needed:

- Whether a valid license was actually obtained (vs. e.g. a free-tier/unlicensed download, or client-supplied without the client's own confirmed rights).
- Which platform, precisely (Getty proper vs. iStock — confirmed materially different contracts, §7/§9 of task).
- Content classification (Creative vs. Editorial) — categorically gates everything (§4).
- Whether the asset was uploaded into a generative AI tool as input, used only as an unseen visual reference, or not used with AI at all (materially different under §6's finding).
- Who purchased the license (submitter directly vs. client-supplied) — gates the sublicensing exceptions (§4).
- Whether the asset depicts an identifiable person, trademark, or third-party IP (triggers the release-gap finding in §5, connects to the existing `likeness` GoalCategory).

**None of these currently correspond to a structured, queryable CRC fact.** They would today only ever appear as free text inside a `ScopedObservation.note` — confirmed by reading `types/interview-engine.ts` (§2 above), and directly consistent with `client_supplied_asset`'s explicit Phase 1 rejection as an `ApplicabilityFact` in `retrieval-engine/types.ts` for the identical underlying reason.

## 13. User-language scenario taxonomy

| # | Statement | What's actually known | What's not known | Likely domain | Reviewer evidence needed? |
|---|---|---|---|---|---|
| 1 | "I got the images from Getty." | Platform named | License validity, tier, classification, AI-use | Stock Media Licensing | Yes, if it proceeds to Assurance |
| 2 | "I bought the images from Getty." | Purchase claimed | Everything else in #1, plus which license model | Stock Media Licensing | Yes |
| 3 | "I licensed them through my company's Getty account." | Account is company-held | Whether submitter is an authorized user of that account/license (§15 of task) | Stock Media Licensing + client/agency-use subdomain | Yes |
| 4 | "I downloaded them from Getty." | Download occurred | Whether download = valid license (could be a free trial/sample per §4's "Samples/Mockups" 30-day test-only provision) | Stock Media Licensing | Yes |
| 5 | "I used Getty editorial images." | Editorial classification stated | Whether Getty gave written commercial authorization (rare exception) | Stock Media Licensing — likely a near-automatic caution flag given §4 | Yes, but likely resolves toward "not clearable as-is" quickly |
| 6 | "I uploaded Getty photos into Kling and animated them." | AI-input use confirmed | License validity/tier; whether this specific use falls inside §6's "indirect training" language; Kling's own input-rights terms (§9) | Stock Media Licensing **and** the existing Matrix (two-contract problem, §9) | Yes — genuinely a two-source review |
| 7 | "I used Getty images as references but they aren't visible in the final video." | "Reference only," not literal upload, claimed | Whether "reference" still constitutes the "uploading to third-party AI tools" §6 describes — genuinely unresolved by this research; a real edge case | Stock Media Licensing | Yes — this is exactly the kind of boundary case Commercial Assurance judgment exists for, not CRC |
| 8 | "My client gave me Getty images." | Client-supplied | Whether client's own license covers contractor use (§4's narrow exceptions); no way for the contractor to verify this independently | Stock Media Licensing + client/agency-use subdomain | Yes, and likely needs client-side documentation |
| 9 | "The agency has a Getty subscription." | Agency-level account | Whether the specific project/user is a covered use under that subscription | Stock Media Licensing + client/agency-use subdomain | Yes |
| 10 | "I don't know what Getty license we have." | Nothing usable | Everything | Stock Media Licensing | Yes — this is a documentation gap, not a knowledge gap; no claim resolves it |

## 14. Client-supplied and agency/enterprise scenarios (task items 14–15)

Confirmed via §4's direct-fetch findings: Getty's terms **do** address this, narrowly. Rights are non-transferable/non-sublicensable **except**: (a) the purchaser's own employer/client, if purchased on the client's behalf (with a "only one party may reuse it" limitation), and (b) subcontractors bound to the same agreement terms, for the same production only. This means "my client gave me a Getty image" is not automatically a problem, but is not automatically fine either — it depends on whether the *client* purchased on the contractor's behalf under this specific provision, which is not something a contractor can self-certify. iStock's equivalent clause (§4, direct fetch) has the identical shape (employer/client/subcontractor/distributor, non-transferable otherwise).

## 15. Temporal/versioning findings (task item 16)

Both Getty (`gettyimages.hk/eula`, "Last Updated: April 2026") and iStock (`istockphoto.com/legal/license-agreement`, "LAST UPDATED: July 2026") carry visible effective/update dates and are **separately versioned from each other** despite the shared corporate parent — direct evidence that "Getty" and "iStock" terms drift independently over time, not just from each other's current baseline. **This research could not determine which date governs a specific past license** (date of download vs. date of the Terms in effect at that time vs. current Terms) — neither page's fetched content stated this explicitly. **Flagged as unresolved**, consistent with the task's instruction not to guess. This matters directly for future LK source-monitoring design (PRD §15/§16) — a "high volatility" source class, per the PRD's own volatility framework.

## 16. Getty vs. iStock (task item 6)

Confirmed: **separate, independently-versioned legal agreements** (different update dates, different section numbering — §3.7/§3.11 vs. §3.2/§3.15 — for substantively parallel provisions), **same corporate parent** (Getty Images Holdings), **materially similar but not identical AI-restriction language** (§6). A user who says "Getty Images" without specifying could plausibly mean either — and per §7's finding that even Getty/iStock (same company) differ in section numbering and exact wording (though not in substance, for the clauses checked), this distinction is worth CRC/reviewer attention, though for the AI-restriction question specifically the practical answer would currently be the same either way. It would matter more for license-model specifics (RF/RM/RR vs. Standard/Extended are different vocabularies entirely).

---

## 17. Knowledge object type recommendation (task item 18/19/24) — the key architectural finding

Given §2's survey, neither existing knowledge-object type is a clean fit today:

- **Matrix/`MatrixRow`** — structurally wrong. `MatrixRow.identifier` is, by its own type documentation, "the same string Interview's own `normalizeCandidate` resolves to" — an AI-*generation*-tool identifier. Getty is confirmed (§1) to fall into `unresolved_aliases`, never a matched tool identifier, under the *existing, unmodified* alias-registry architecture. Putting Getty knowledge in a Matrix row would not be retrievable by anything in the current pipeline — it would be inert data, not a design choice.
- **TopicClaim** — the right *shape* (non-tool-scoped governed knowledge, exactly the pattern that already exists for Copyright & Human Authorship), but structurally blocked: `TopicClaim.topic` must equal an existing `GoalCategory` value, and **none of the five current values (`commercial_use`, `copyright_ownership`, `copyrightability`, `likeness`, `unknown`) honestly represents "third-party source-material licensing/clearance."** Forcing this domain's claims under `commercial_use` would be a category error that silently narrows or misrepresents what the claim is actually about — the same failure mode `GOVERNED-CLAIMS.md`'s own governance discipline exists to prevent elsewhere.
- **TopicRelationship** — usable *once* a topic exists (§18 below), not before.
- **A missing knowledge-object type** — not needed. The gap is not a missing *type*, it's a **missing `GoalCategory` value** (and a missing `ApplicabilityFact` value, per §12). TopicClaim's existing shape would work perfectly well the moment a new category like (illustratively) `third_party_source_rights` existed. This document does not propose adding one — that is exactly the "new database tables / schema changes" the source-inputs PRD's Non-Goals (§25) reserves for a separate, later design decision.

**Recommendation:** When/if this domain proceeds past discovery, its first engineering decision is not "write claims" — it's "does this domain need a new `GoalCategory` value, and if so, what should it be called and how does Interview Engine ever produce it (goal capture is currently LLM-hinted from the same extraction call that captures `UserGoal`, per `types/interview-engine.ts` §comments)." That is out of scope for this document and for Phase 0 generally.

## 18. Matrix vs. Living Knowledge placement, worked examples (task item 19)

| Finding | Where it belongs (once eventually governed) |
|---|---|
| "Getty's RF license permits commercial use in any media globally" | Would be Matrix-shaped (platform-specific fact) if Matrix's `identifier` concept is ever widened to non-generation platforms — not authorized here. |
| "A stock-media license may depend on whether content is editorial or creative" | Cross-platform structural concept — TopicClaim-shaped, once a topic exists. |
| "The applicable license must be identified before any clearance conclusion is possible" | A workflow/evidence-gathering dependency, not a legal proposition at all — closer to Reviewer Workbook / Evidence Preparation Guide territory (`06_Operations/customer-onboarding/`) than to either Matrix or GOVERNED-CLAIMS.md. Worth naming so a future engineer doesn't try to force it into a claim shape it doesn't fit. |

---

## 19. Candidate knowledge (proposed only — not adopted, not CRC-eligible, not added to any runtime fixture)

Deliberately kept small (5 items) per task instruction. Uses a **`CAND-STOCK-NNN` prefix, not `CLAIM-`**, specifically so these can never be mistaken for a `GOVERNED-CLAIMS.md` entry by a future search/grep. None of these exist anywhere outside this file.

### CAND-STOCK-001
**Proposition:** Major stock-photo platforms' standard customer licenses (Getty, iStock confirmed via direct primary-source fetch; Adobe Stock, Shutterstock not yet confirmed to the same tier) contain an explicit contractual restriction on using licensed content for AI/machine-learning purposes — for at least Getty and iStock, this restriction is defined broadly enough to expressly include uploading the licensed content into third-party generative AI tools as an "indirect" prohibited use, independent of whether the receiving AI tool itself trains on the input.
**Platform/topic:** Stock Media Licensing (proposed subdomain of Third-Party Source Assets).
**Jurisdiction:** Not jurisdiction-specific — contractual, not statutory.
**Source:** Direct fetch, `gettyimages.hk/eula` §3.11 (2026-08-17); direct fetch, `istockphoto.com/legal/license-agreement` §3.15 (2026-08-17). Section-number discrepancy for Getty noted (§3(k) in one secondary synthesis) — unresolved.
**Applicability dependencies:** Would need a not-yet-existing `ApplicabilityFact` (e.g. `third_party_source_asset_used`) — none exists in Phase 1's `APPLICABILITY_FACTS`.
**Unresolved project dependencies:** which specific platform (Getty vs. iStock vs. other); whether the use was "upload as generative input" vs. "reference only, not uploaded"; PDF-verified section numbering.
**Likely publication audience:** Reviewer candidate first (§11); CRC-eligible only after platform-specific narrowing, given Shutterstock's apparently different train/edit boundary (§7) makes an unqualified cross-platform statement risk overreach.
**Confidence:** Moderate-high for Getty/iStock specifically; low for generalizing to "stock platforms" as a class without per-platform verification.
**Why useful:** Directly answers the literal CRC scenario that generated this research (§6) — the single highest-value finding of this pass.

### CAND-STOCK-002
**Proposition:** Holding a valid stock-media license for a source asset is a different question from whether the resulting AI-generated or AI-modified work is commercially clear to use — analogous in structure to CLAIM-COPY-004's ownership/commercial-use distinction, but concerning input-material rights rather than output copyright.
**Platform/topic:** Stock Media Licensing (cross-cutting framing claim, no jurisdiction).
**Source:** SI8 synthesis, directly modeled on CLAIM-COPY-004-v1's own governance-approved framing pattern (`GOVERNED-CLAIMS.md`) — explicitly not an external legal citation, same governance treatment CLAIM-COPY-004 itself uses.
**Applicability dependencies:** None (mirrors COPY-004's `Applicability requirements: []`).
**Unresolved project dependencies:** None — purely conceptual, like COPY-004.
**Likely publication audience:** Both — this is the shape of claim SI8 has already shown willingness to publish (COPY-004 precedent).
**Confidence:** High (structural claim, not a substantive legal determination).
**Why useful:** Prevents "I sourced it from Getty" from being silently read by a user (or a future under-designed CRC response) as "therefore cleared" — exactly the task's own §7 concern.

### CAND-STOCK-003
**Proposition:** Editorial-classified stock content is categorically excluded from commercial/advertising/promotional use, independent of the customer's account, subscription tier, or license model — confirmed in the same shape across Getty, iStock, and Adobe Stock's current terms (Shutterstock's editorial restriction confirmed only via lower-tier WebSearch synthesis).
**Platform/topic:** Stock Media Licensing.
**Source:** Direct fetch — Getty §3.7, iStock §3.2, Adobe Stock license-terms page (all 2026-08-17).
**Applicability dependencies:** Same unmet-fact-type gap as CAND-STOCK-001.
**Unresolved project dependencies:** Whether the specific asset is actually marked Editorial — a fact CRC has no way to confirm.
**Likely publication audience:** Likely CRC candidate after review — high confidence, low ambiguity, doesn't require project-specific application to be useful (a user can self-check the label).
**Confidence:** High for the three directly-verified platforms.
**Why useful:** A clean, low-risk, high-clarity fact — the strongest CRC-eligibility candidate of the five precisely because it doesn't require resolving any of this domain's harder open questions first.

### CAND-STOCK-004
**Proposition:** Rights granted under an individually-purchased stock-media license are generally non-sublicensable except to the purchaser's own employer/client (if purchased on their behalf) or to production subcontractors bound to the same license terms for the same project — meaning a contractor's personal stock subscription does not automatically extend to a different client's project, and a client-supplied stock asset's coverage depends on how the client's own license was purchased.
**Platform/topic:** Stock Media Licensing — client/agency-use subdomain.
**Source:** Direct fetch — Getty §4, iStock §4 (2026-08-17), materially parallel provisions.
**Applicability dependencies:** Same gap as above, plus would need a fact distinguishing "self-purchased" vs. "client-supplied" license — also not modeled today.
**Unresolved project dependencies:** Who purchased the license; whether it was purchased "on behalf of" the current project's client.
**Likely publication audience:** Reviewer-only — requires facts CRC cannot verify (§11).
**Confidence:** High for Getty/iStock; not checked for Adobe Stock/Shutterstock in this pass.
**Why useful:** Directly addresses the task's client-supplied/agency scenario (§8/§13 of task; §14 of this doc) with real sourced language rather than assumption.

### CAND-STOCK-005
**Proposition:** A stock-media platform's own customer license terms and a downstream AI-generation platform's own Terms of Service are two independently-governing contracts; satisfying one does not establish satisfying the other, when licensed stock content is used as AI-generation input.
**Platform/topic:** Stock Media Licensing × Platform Rights Matrix (cross-domain, structurally).
**Source:** SI8 synthesis, directly derived from CAND-STOCK-001's evidenced finding (§6/§9 of this doc) — the "two-contract problem" the task asked to pressure-test, confirmed real rather than hypothetical.
**Applicability dependencies:** None inherent to the framing claim itself; would need `third_party_source_asset_used` if ever combined with a specific Matrix row's own applicability logic.
**Unresolved project dependencies:** Which specific AI platform was used (to know which Matrix row's terms are the "other contract").
**Likely publication audience:** Reviewer-only, likely permanently, per §11's reasoning — combining two sources into one project-specific conclusion is Commercial Assurance territory.
**Confidence:** High as a structural description; not itself a claim about any specific platform pair.
**Why useful:** Gives reviewers (and, later, a possible Reviewer↔LK query interface per PRD §10) a named, correct mental model instead of ad hoc reasoning each time this fact pattern recurs.

---

## 20. Candidate relationship (proposed only — not adopted)

### CAND-REL-COMMERCIAL-USE-STOCK-MEDIA
**Source topic:** `commercial_use` (existing GoalCategory).
**Target topic:** Not yet expressible — would target the not-yet-existing third-party-source-rights topic (§17). **This relationship cannot actually be authored today**, even as a Candidate, because `TopicRelationship.target_topic` must also equal an existing `GoalCategory` value. Recorded here as a placeholder for the eventual shape, not as a real draft.
**Relationship type:** `relevant_consideration` (the only Phase 1 type) — a `commercial_use` goal should surface that source-material licensing may be a relevant consideration, without answering the commercial-use question itself. Directly parallel to `REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1`'s own shape.
**Why not created for real, even as Candidate:** Same blocking dependency as §17 — no `GoalCategory` exists to be its `target_topic`. This is itself evidence for §17's recommendation, not a separate finding.

---

## 21. Source hierarchy used in this pass

| Tier | Source | Used for |
|---|---|---|
| 1 (Primary, direct fetch, this pass) | `gettyimages.hk/eula` (2026-08-17) | Getty license taxonomy, editorial rules, AI restriction, releases, sublicensing |
| 1 (Primary, direct fetch, this pass) | `gettyimages.hk/ai/generation/faqs` (2026-08-17) | Getty's own Generative AI product scope/indemnification/exclusions |
| 1 (Primary, direct fetch, this pass) | `istockphoto.com/legal/license-agreement` (2026-08-17) | iStock license taxonomy, AI restriction, editorial, client/agency use |
| 1 (Primary, direct fetch, this pass) | `stock.adobe.com/license-terms` (2026-08-17) | Adobe Stock license taxonomy, editorial rules, sublicensing (rendered in zh-TW; AI-restriction question left unresolved by this specific page) |
| 3 (Secondary, WebSearch synthesis, this pass — explicitly lower tier, flagged inline) | Multiple, re: iStock/Getty corporate relationship, Adobe Gen AI guidelines, Shutterstock terms | Cross-checking, filling gaps where direct fetch failed or was out of Phase-0 scope |
| — (Attempted, failed) | `shutterstock.com/license` (HTTP 403 — bot-blocked) | Could not verify directly; WebSearch synthesis used instead, flagged |
| — (Attempted, failed) | `adobe.com/legal/licenses-terms/adobe-gen-ai-user-guidelines.html` (connection reset) | Could not verify directly; Adobe's AI-input restriction (if any) remains genuinely unresolved |
| 4 (Repo-internal, not authoritative for this question) | `06_Operations/legal/GETTY-SHUTTERSTOCK-AGREEMENT-STRUCTURE-RESEARCH.md`, `06_Operations/chain-of-title-delivery/research/getty-sop-research.md` | Ruled out as on-point (§2); cited only to explain why they don't apply |

No SEO-blog or model-background-knowledge source was used as authority anywhere in this pass; every substantive finding traces to a dated fetch or is explicitly flagged as WebSearch-synthesis-tier.

## 22. Monitoring-source recommendations (if this domain is ever governed)

| Candidate source | Governs | Change frequency (observed) | Monitoring priority | Machine-monitoring feasibility |
|---|---|---|---|---|
| `gettyimages.com/eula` | Getty license terms, AI restriction | At least once in the observed window (Apr 2026 "Last Updated") | High | Feasible — fetched cleanly twice in this pass, though redirects to a regional domain |
| `istockphoto.com/legal/license-agreement` | iStock license terms | At least once in the observed window (Jul 2026 "Last Updated") | High | Feasible — fetched cleanly |
| `stock.adobe.com/license-terms` + Adobe's separate Gen AI guidelines doc | Adobe Stock license terms | Unknown — no date surfaced in this pass | Medium (pending the unresolved AI-restriction question) | Partial — core terms page fetched cleanly; Gen AI guidelines page failed twice in this pass |
| `shutterstock.com/license` | Shutterstock license terms | Unknown | Medium | **Poor** — confirmed bot-blocked (HTTP 403), consistent with `MATRIX-LEARNINGS.md`'s already-documented pattern for other platforms' legal/help pages |

## 23. Contrary / failure cases found (task item 23)

Actively searched for, not just accepted at face value:

- Getty's own §3.11 exception: internal archiving/searching/indexing/permitted-editing of *Creative* content is allowed even though broader AI use is not — a simplistic "Getty content can never touch AI" rule would overreach.
- Getty's own first-party Generative AI product is an *authorized* AI use of Creative content, on Getty's own platform, with indemnification — directly contradicts a naive "Getty always prohibits AI" reading; the actual boundary is "Getty's own tool, yes; third-party tools, no" (§6).
- Editorial content is excluded from Getty's own AI product too — "commercial-use-permitted" does not imply "AI-eligible" even within Getty's own ecosystem.
- Shutterstock's apparent train/edit distinction (§7) directly contradicts an assumption that "all stock platforms treat AI upload the same way Getty does" — a real, found counter-example, not resolved to primary-source certainty in this pass but real enough to block over-generalization.
- Adobe Stock's core terms page not surfacing an AI-input restriction at all directly contradicts an assumption that "every major stock platform has this exact restriction" — genuinely unresolved, not assumed either way.
- The client-supplied-asset exception (§4/§14) contradicts a simplistic "no sublicensing ever" reading of the non-transferable clause.

## 24. Open questions carried forward (not resolved by this pass)

1. Getty's §3.11-vs-§3(k) section-number discrepancy — needs a direct PDF-level re-verification.
2. Adobe Stock's actual position on AI-input use of licensed Stock content — genuinely unresolved (two fetch failures).
3. Shutterstock's exact license text — genuinely unresolved beyond WebSearch synthesis (site blocked automated fetch).
4. Which date governs a specific already-licensed asset when Terms change later (download date / license date / current Terms) — not stated on either fetched page.
5. Getty's Generative AI indemnification dollar figure — appeared in secondary sources only, not independently confirmed to primary-source precision.
6. Whether "used as visual reference but not uploaded/visible in final output" (user-language scenario #7, §13) falls inside or outside Getty's own "indirect training via upload" language — the plain text doesn't clearly resolve this edge case either way.
7. Whether SI8's own AI-platform Matrix rows (Runway, Kling, etc.) independently address receiving third-party-licensed input — not checked in this pass; needed to fully resolve the two-contract problem (§9) for any specific platform pair.
8. Whether this domain, once governed, should be one topic or several (e.g. splitting "license scope/commercial eligibility" from "AI-input restriction" from "client/agency use") — not decided here; §17/§18 name the placement question but do not resolve claim granularity.

---

## 25. Whether existing LK architecture handles this domain cleanly

**No — with a precisely locatable reason.** The governance *process* (Candidate → human review → Adopted → separately-decided CRC-eligible) applies to this domain exactly as-is, with zero modification needed — that machinery is domain-agnostic by design and this research needed no exception to it. What does **not** yet exist is the *data model surface* this domain would need to actually reach CRC users: no `GoalCategory` value represents its topic, no `ApplicabilityFact` represents "third-party/stock source material was used," and the Matrix's `identifier` concept is structurally scoped to AI-generation tools, not source-asset providers. This is a **precise, narrow, identified gap** — not a vague "the architecture isn't ready" — and matches exactly the caution the source-inputs PRD itself anticipated in §20 ("This list is directional, not exhaustive") without previously naming the specific missing pieces.

## 26. Recommended next milestone

Not authorized by this document to begin. For PM decision:

1. Decide whether "Third-Party Source Assets" (with "Stock Media Licensing" as first subdomain) is the right domain name going forward, or revise per §10.
2. Decide whether a new `GoalCategory` value is warranted (per §17) — this is a real schema/design decision requiring its own scoped milestone, likely modeled on how Milestone 2's `goal_category`/`goal_scope` extraction was originally designed and approved.
3. If yes: a follow-on research/design milestone should (a) resolve the open questions in §24, particularly the Adobe Stock and Shutterstock verification gaps and the PDF-level Getty section-number check; (b) draft the actual new `ApplicabilityFact` and `GoalCategory` proposals for separate PM review; (c) only then move CAND-STOCK-001 through -005 through real `Under Review` → `Adopted` governance.
4. CAND-STOCK-003 (Editorial-use categorical bar) is the strongest early candidate for a first real claim in this domain — narrowest scope, highest confidence, fewest unresolved dependencies, closest in shape to already-successful CLAIM-COPY claims.

---

**Research conducted:** 2026-08-17. **Researcher:** Claude (via direct web fetch + WebSearch, this session). **Status:** Complete for Phase 0 domain-discovery scope. **Next step:** Return to PM for review — no further LK work should proceed from this document without an explicit PM decision on §26.
