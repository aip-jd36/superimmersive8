# EU AI Act Article 50(4) Audiovisual/Deepfake — Candidate Governance Preparation Package

**Status: CANDIDATE — NOT ADOPTED. NOT CRC-ELIGIBLE.** **Updated 2026-09-12:** formally reviewed via `governance-reviews/FGR_019_CAND-EUAI-ART50-4-AUDIOVISUAL-DEEPFAKE-DISCLOSURE-001_2026-09-12.md`. FGR_019's disposition: **DEFER ADOPTION — TOPIC REPRESENTATION DECISION REQUIRED**, not REJECT — the proposition itself (§4 below, wording corrected per FGR_019 §2) was independently found substantively sound, evidence-complete, and safe; the sole blocker to Adoption is the open `topic`/`GoalCategory` taxonomy architecture question (§8 below), a required-field problem, not a content defect. PM decision on FGR_019 itself: PENDING. **Updated 2026-09-13:** the `KnowledgeTopic` engineering foundation FGR_019 §8 anticipated is now integrated on `origin/main` (`KNOWLEDGE_ONLY_TOPICS` currently `[]` — no real knowledge-only topic yet exists). `governance-reviews/FGR_019_ADDENDUM_TOPIC_TAXONOMY_RECOMMENDATION_2026-09-13.md` now records a RECOMMENDED (not adopted) `KnowledgeTopic` identifier, `ai_content_transparency`, for this candidate — see §4/§8 below, both updated to reflect it. **PM decision on the topic recommendation: PENDING.** This document remains a pre-adoption governance-drafting artifact only. It does not modify `GOVERNED-CLAIMS.md`, `TOPIC-RELATIONSHIPS.md`, `PENDING-QUESTIONS.md`, `EDGE-CASES.md`, `SI8-POSITIONS.md`, any production `TopicClaim`/`TopicRelationship` fixture, `KNOWLEDGE_ONLY_TOPICS` in code, or any `geographic_relevance_scope` production value. Article 50(4) production onboarding remains PAUSED.

**Domain:** EU AI Act Article 50(4), first subparagraph only — the audiovisual/deepfake disclosure branch. Article 50(4)'s second subparagraph (AI-generated/manipulated text published to inform the public on matters of public interest) is explicitly and deliberately excluded from this package — see §14.

**Evidence base:** `06_Operations/institutional-knowledge/notebook/evidence-captures/eu-ai-act/` — `MANIFEST.md` and `EU-AI-ACT-ARTICLE-50-EVIDENCE-NOTE.md` (three capture sessions: Class A AI Act Service Desk text + Commission Guidelines + EPRS briefing; Class B human-captured enacted Digital Omnibus text). This package treats the enacted Regulations as controlling over the Commission Guidelines (non-binding) and the EPRS briefing (institutional description, not law) — per those documents' own self-declared status, preserved faithfully here, not elevated.

---

## 1. Governance contract this package was authored against (Step 2)

Re-derived from `08_Platform/app/lib/retrieval-engine/types.ts` on `origin/main` (this worktree's own checkout predates the territory-mechanism merge; read via `git show origin/main:<path>`, not checked out — no working-tree change made to re-derive this) and from `GOVERNED-CLAIMS.md`/`TOPIC-RELATIONSHIPS.md`'s own entry templates:

- **`GOAL_CATEGORIES`** (the closed set `TopicClaim.topic` / `TopicRelationship.{source,target}_topic` must match): `commercial_use | copyright_ownership | copyrightability | likeness | third_party_source_rights | unknown`. **No category exists for an AI-content disclosure/transparency/labeling obligation** — see §3/§8 below; this is the package's central open gap.
- **`APPLICABILITY_FACTS`**: `jurisdiction | tool_plan_tier | tool_account_status` only. No `distribution_territory` or similar fact type is implemented for applicability — territory can only ever drive `geographic_relevance_scope` (discovery), never `applicability_requirements`, in the current codebase.
- **`geographic_relevance_scope?: string[] | null`** — INVERTED default polarity vs. `provider_scope`/`tool_scope`: `null`/absent = opt-OUT (fail-closed). Non-empty array = explicit opt-in, consulted ONLY by the Track A `distribution_territory_mention` discovery path, never by applicability/Bounded Interpretation/Composition. Values are plain literal strings matched exact-case-insensitive against `DistributionTerritoryMention.value` — **no alias table, no country-to-region inference, no legal-jurisdiction hierarchy anywhere in this codebase** (confirmed in both the field's own doc comment and `DistributionTerritoryMention`'s doc comment). A user who says "France" will never match a claim scoped only to `["European Union"]`.
- **`JURISDICTION_VALUE_ALIASES`** (`lookup-topic-claims.ts`) currently contains only United States variants (`us`, `usa`, `u.s.`, `u.s.a.`, `the us`, `united states of america` → `United States`). **Zero EU-related aliases exist.** A `jurisdiction` applicability requirement authored as `value: "European Union"` would only ever match a `ProjectFacts.jurisdiction` attestation that is literally, verbatim "european union" (case-insensitive) — the same class of architecture gap the existing NY likeness package (`LIKENESS-NY-SCENARIO-A-FGR-PACKAGE.md` §"Applicability requirements") already honestly discloses for a "New York" value against a generic "United States" attestation.
- **`TopicRelationship`**: `relationship_type` has exactly one implemented value, `relevant_consideration`. Both `source_topic` and `target_topic` must be existing `GoalCategory` values — the same taxonomy gap above blocks any relationship targeting an Article 50(4) claim by the same mechanism it blocks the claim's own `topic` field.
- Representative adopted claim (`CLAIM-COPY-001-v1`) and representative candidate-preparation package (`LIKENESS-NY-SCENARIO-A-FGR-PACKAGE.md`) both confirm the entry-template fields used below and the convention of drafting a `-FGR-PACKAGE.md` file at notebook root before any FGR occurs, including for candidates explicitly marked "NOT READY."

---

## 2. Canonical evidence actually available for this package

From the three-session evidence package (see MANIFEST for full provenance/checksums):

- **Article 50, full text** (paragraphs 1–7), Class A (AI Act Service Desk) + confirmed unamended in paragraphs 1–6 by Class B enacted-Omnibus text (only paragraph 7 replaced).
- **Article 50(4), full text, both subparagraphs**, verbatim, Class A/B.
- **Article 2, full text** (all 12 paragraphs), Class A + confirmed by Class B enacted text that paragraph 1 (territorial/application scope) is unamended.
- **Recitals 132, 133, 134, 136, 137** — the set the Commission's own tool flags as relevant to Article 50 generally. None specifically elaborates the deep-fake/audiovisual branch's rationale in the depth Recital 133 gives the marking obligation (50(2)) — recitals more specifically on-point for 50(4) (deep-fake harms, artistic-work carve-out rationale) were not identified in the set captured; a search of the full ~180-recital preamble for a more specifically on-point recital was not performed (out of the bounded scope of the sessions that did the capturing).
- **Commission Communication C(2026) 5054 final** (Guidelines), full 51 pages, Class A, non-binding, containing a dedicated Section 6 ("Article 50(4): Labelling of Deep Fakes and Certain Text Publications," confirmed present in the earlier session's `pdftotext` extraction, page range corresponding to lines ~1688-2340 of that extraction) — **not re-read in granular detail for this package** (see §Open Issues).
- **Regulation (EU) 2026/1744 (Digital Omnibus)**, enacted text, Class B — confirmed Article 50(4) is **not named anywhere** in the full point-(1)-through-(43) amendment list, and Article 111(4)'s new transitional rule names only Article 50(2).

**RESOLVED (2026-09-11/12, follow-up "Article 3 Definition Evidence Completion" milestone):** Article 3's definitions of "deployer" (point 4), "deep fake" (point 60), "provider" (point 3), and "AI system" (point 1) are now independently captured as Class B primary text — see `evidence-captures/eu-ai-act/MANIFEST.md`'s new consolidated-text row and `EU-AI-ACT-ARTICLE-50-EVIDENCE-NOTE.md` §2c for full verbatim text, provenance, and cross-validated Digital-Omnibus amendment status (all four: **unchanged**). This did not require rewriting this package's proposition or dependency classifications — §2c.iv found the candidate package's own pre-capture caution (declining to assume an identifiable-natural-person requirement for "deep fake") was confirmed, not contradicted, by the actual definition text. See §5/§9/§16 below for where this resolution now applies.

---

## 3. Candidate proposition boundary (Step 3)

**What CRC actually needs to retrieve:** a single, bounded educational statement that a deployer of an AI system generating/manipulating audiovisual content constituting a deep fake has a disclosure obligation under EU law (Article 50(4), first subparagraph) toward the audience, with the artistic/creative/satirical exception represented as a modification of *how* disclosure must be made, not as a binary exemption.

**Is the obligation atomic enough for one governed claim?** Yes, for the core disclosure obligation itself — one clean, single-sentence-per-source-text proposition (mirroring the "one clause = one claim" atomicity discipline used elsewhere in this notebook, e.g. `CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1`'s single-paragraph proposition drawn from two statute sections).

**Materially different conditions requiring separate claims?**
- The **law-enforcement exception** ("authorised by law to detect, prevent, investigate or prosecute criminal offence") is categorically unlikely to ever be relevant to SI8's actual CRC user population (commercial/advertising AI-video creators, not law-enforcement bodies) — represented as a **prohibited-conclusions/scope note**, not a live dependency requiring active questioning (see the Stock Governance Rule, §9 below) and not a separate claim.
- The **artistic/creative/satirical/fictional/analogous-work carve-out** is, per the statute's own single-sentence structure, a *modification of the same paragraph's disclosure manner* ("the transparency obligations set out in this paragraph are limited to disclosure of the existence of such... content in an appropriate manner that does not hamper the display or enjoyment of the work") — **not** a full exemption, **not** a separate rule. Represented as **bounded wording within the same proposition** (Step 3 Q4's fourth option), with whether a specific project's content qualifies as "evidently artistic, creative, satirical, fictional or analogous" represented as an unresolved, evidence-only/judgment-laden dependency CRC cannot resolve from conversation (§9).

**Does Article 50(2) belong in this package?** No — see §13, a dedicated separation analysis.

**Does Article 50(7)/codes-of-practice material alter the proposition?** No. Article 50(7) (the only paragraph the Omnibus amended) governs a Commission/codes-of-practice compliance-demonstration mechanism for the *providers'* marking obligation under paragraph 2 specifically ("assess whether adherence to those codes of practice is adequate to ensure compliance with the obligations laid down in paragraphs 2 and 4" — note paragraph 4 IS named here, but only insofar as codes of practice may also serve as an implementation aid for it; the underlying paragraph-4 obligation itself is unchanged). Treated as **implementation context**, not a proposition-altering fact.

**Does the Digital Omnibus (2026/1744) change anything material to Article 50(4) wording?** No — confirmed by direct reading of the enacted text (§2 above); this is itself a material, source-grounded finding worth stating plainly in the proposition's own evidence-limitations text (a future reader should not assume, absent this package, that "the law changed" the way it visibly did for 50(2)).

**Recommended smallest structure: ONE candidate claim** (below), not a set — the smallest generic structure that accurately preserves the source, per Step 3's own closing instruction.

---

## 4. Candidate claim

### `CAND-EUAI-ART50-4-AUDIOVISUAL-DEEPFAKE-DISCLOSURE-001`

**Topic: RECOMMENDED `ai_content_transparency` (KnowledgeTopic) — PENDING PM CONCURRENCE, NOT YET ASSIGNED.** Recorded 2026-09-13 in `governance-reviews/FGR_019_ADDENDUM_TOPIC_TAXONOMY_RECOMMENDATION_2026-09-13.md`, following the `KnowledgeTopic` engineering foundation now on `origin/main`. `KnowledgeTopic` (not `GoalCategory`) is the correct field type for this claim — see §8, updated. This is a recommendation, not a production value: `KNOWLEDGE_ONLY_TOPICS` remains `[]` in code, and this field is not finalized until a PM concurs.

**Claim character:** established (the statutory text itself is not conditional or unsettled; what would make an *application* of it uncertain is captured entirely in `applicability_requirements`/`unresolved_project_dependencies` below, not in the claim's own character).

**Jurisdiction:** European Union (see §6 for the precise, source-grounded scope — not simply "EU" as a shorthand; and see §1 above for the honestly-disclosed `JURISDICTION_VALUE_ALIASES` gap this value would hit in the current codebase).

**Context:** commercially intended AI-generated or AI-manipulated audiovisual (image/audio/video) content deployed (published, put into use, made available) by an entity within Regulation (EU) 2024/1689's territorial scope.

**Claim proposition:**
> Under Article 50(4), first subparagraph, of Regulation (EU) 2024/1689 (the AI Act), a deployer of an AI system that generates or manipulates image, audio, or video content constituting a "deep fake" must disclose that the content has been artificially generated or manipulated. This obligation does not apply where the use is authorised by law to detect, prevent, investigate, or prosecute criminal offences. Where the content forms part of an evidently artistic, creative, satirical, fictional, or analogous work or programme, this disclosure obligation is not removed but is limited to disclosing the existence of such generated or manipulated content in an appropriate manner that does not hamper the display or enjoyment of the work.
>
> *(Wording corrected 2026-09-12 per `governance-reviews/FGR_019_CAND-EUAI-ART50-4-AUDIOVISUAL-DEEPFAKE-DISCLOSURE-001_2026-09-12.md` §2 — restored the source's "an appropriate manner" [previously "a manner"] and its own sentence order [law-enforcement exception before the artistic-work carve-out]. Bounded, mechanical correction only; substance, actor scope, and manner-limitation framing unchanged, per that review's own explicit finding.)*

**Source references:**
- primary: Regulation (EU) 2024/1689, Article 50(4), first subparagraph — captured verbatim, `evidence-captures/eu-ai-act/ai-act-servicedesk-article-50_20260912T040235Z_eb822bdb.html` (Class A) and confirmed unamended by `eur-lex-regulation-2026-1744-digital-omnibus_20260912T085700Z_b5544b0c.pdf` (Class B, point (20) of the amendment list touches only paragraph 7).
- context: Regulation (EU) 2024/1689, Article 2(1)(b)/(c) — territorial/application scope (see §6).
- context: Commission Communication C(2026) 5054 final, §6 ("Article 50(4): Labelling of Deep Fakes...") — non-binding interpretive guidance, cited as context only, not as the source of the proposition's own wording (see §10 for exact treatment).

**Source authority/type:** Primary legal/official authority (enacted Regulation text) — **Class A/B**, per §2 above.

**Source fact (verbatim):**
> "4. Deployers of an AI system that generates or manipulates image, audio or video content constituting a deep fake, shall disclose that the content has been artificially generated or manipulated. This obligation shall not apply where the use is authorised by law to detect, prevent, investigate or prosecute criminal offence. Where the content forms part of an evidently artistic, creative, satirical, fictional or analogous work or programme, the transparency obligations set out in this paragraph are limited to disclosure of the existence of such generated or manipulated content in an appropriate manner that does not hamper the display or enjoyment of the work."

**SI8 interpretation:** [SI8 operational judgment, not itself sourced from the statute] A commercially distributed AI video containing synthetic audiovisual content resembling an existing person, object, place, entity, or event, that a reasonable viewer could mistake for authentic (i.e., plausibly "constituting a deep fake" per the now-captured Article 3(60) definition — see `EU-AI-ACT-ARTICLE-50-EVIDENCE-NOTE.md` §2c.ii) should not be represented to a client, buyer, or platform as clear of Article 50(4) disclosure obligations without confirming both (a) whether the content in fact meets that definition, and (b) who the "deployer" is for this specific project (Article 3(4)) — SI8's typical client role (production agency creating content on behalf of a brand/publisher) does not automatically resolve either question, and CRC must not assume it does.

**Applicability requirements:** see §6 (none authored formally in this draft — see the reasoning there for why).

**Unresolved project dependencies:** see §9.

**Provider/actor scope:** see §5. This claim addresses **deployer** obligations only, per the statute's own term — never conflated with "provider" (the Article 50(2) actor), "operator" (an Article 74 market-surveillance term not used in Article 50 at all), "user," "producer," "advertiser," "agency," or "client" (none of these are the statute's own vocabulary).

**Tool scope:** null (statutory, tool-independent — applies regardless of which AI generation tool produced the content).

**Provider scope (`provider_scope`, asset-provider sense):** null (not a third-party asset-provider-scoped claim).

**Geographic relevance scope:** see §7 — proposed, not authored as a production value.

**Prohibited conclusions:**
> Does not establish whether a SPECIFIC project's content constitutes a "deep fake" as the Regulation defines the term (Article 3(60), now captured — see `EU-AI-ACT-ARTICLE-50-EVIDENCE-NOTE.md` §2c.ii — but applying that definition to a specific project remains a judgment call this claim does not make). Does not establish who the "deployer" is for a specific project (Article 3(4)). Does not establish whether the artistic/creative/satirical/fictional/analogous-work carve-out applies to a specific project. Does not establish whether Article 2's territorial/application conditions are met for a specific project (see §6). Does not constitute a compliance determination, legal advice, or certification that any project is cleared under Article 50(4) — that remains a Commercial Assurance Assessment / legal-review question, never a CRC output. Does not address the deferred public-interest-text branch (Article 50(4), second subparagraph) — see §14.

**Lifecycle:** Candidate. **Adoption Approver:** none (not adopted). **Adoption Decision Date:** none.

**Publication scope:** Internal/research (candidate stage; no publication-scope decision made).

**CRC Publication Scope / CRC Candidate Statement:** not authored — see §11 (CRC eligibility not yet resolved).

**CRC eligible:** Pending, pending resolution of §8's taxonomy gap and §Open Issues' definitional gaps — see §11 for the full analysis (this package does **not** recommend `No` outright; the proposition itself is educable and boundable, but the taxonomy gap makes the question partly moot until resolved).

**Effective date / Last reviewed:** 2026-09-12 (this package's drafting date).

**Version lineage:** v1 (initial candidate) — supersedes: none — superseded by: none.

**CRC Approver / CRC Decision Date:** none (not decided).

**Related:** `[[POS-002]]`, `[[POS-003]]` (both already establish SI8's "do not pitch as EU AI Act compliance" position, directly applicable here), `[[EC-001]]` (Domain H self-attestation caution, structurally analogous to the deployer-identity dependency in §9).

---

## 5. Provider/actor scope (Step 4)

The obligation in Article 50(4), first subparagraph, falls exclusively on **deployers** — the statute's own term, used consistently and exclusively in this paragraph (contrast Article 50(2), which uses "providers"). The statute does not use "operator," "user," "producer," "advertiser," "agency," or "client" anywhere in Article 50. This package preserves that exact vocabulary and does not normalize it.

**What CRC can know from structured project facts today:** nothing directly. A review of the interview-engine's structured fact types (`ToolMention`, `AssetProviderMention`, `ContentPresenceMention`, `DistributionTerritoryMention`, `AssessmentJurisdictionMention`, `ProjectFacts` generally) found in this session's contract-derivation pass (§1) did not surface any structured fact type representing "who is deploying/publishing this AI system's output" or "is the user the deployer, the provider, or neither." This is consistent with the general pattern already established for the likeness domain (`written_consent_confirmed` marked evidence-only, not questionable) and copyright domain (`human_contribution_description`) — deployer-identity is exactly the kind of legally-loaded status determination this notebook's existing discipline says must not be turned into a naive self-attestation question.

**Recommendation:** represent `deployer_status_confirmed` as an unresolved project dependency, **Type D (not currently representable)** per §9's classification — CRC has no structured fact to even partially resolve this, and none should be manufactured here (that would be CRC engineering, out of scope for this milestone).

---

## 6. Applicability (Step 6)

Article 2(1) lists the categories of actors Regulation (EU) 2024/1689 applies to. For a **deployer** obligation specifically, the relevant sub-clauses (confirmed unamended by the Digital Omnibus, §2 above) are:

- **2(1)(b):** "deployers of AI systems that have their place of establishment or are located within the Union" — applies regardless of where the AI system's output is subsequently used.
- **2(1)(c):** "providers and deployers of AI systems that have their place of establishment or are located in a third country, **where the output produced by the AI system is used in the Union**" — applies to non-EU-established deployers, conditioned specifically on Union output-use.

**These are two independently sufficient pathways, not one.** A deployer established in the EU is in scope under (b) even if the content is never distributed there; a deployer established outside the EU is in scope under (c) only if the AI system's output is used in the Union.

**Explicit caution, per this milestone's own instruction, honored here:** a stated project **distribution territory** (e.g., "this will run in France") is captured by CRC's `DistributionTerritoryMention` fact and is NOT the same statutory concept as either (b)'s "place of establishment or location" or (c)'s "output... used in the Union." "Used in the Union" and "distributed/run in France" plausibly overlap in the ordinary case but are not textually identical, and this package does not assume they are. Distribution territory alone:
- does **not** establish where the deployer is established/located (2(1)(b)) — a completely separate, unaddressed fact;
- **may be evidence toward, but does not by itself conclusively establish**, "output... used in the Union" under 2(1)(c) — no primary source captured in this package states that "distribution territory" and "output use location" are legally synonymous, and this package does not manufacture that equivalence.

**Formal `applicability_requirements` authoring:** the only implemented fact type available is `jurisdiction` (`tool_plan_tier`/`tool_account_status` are plainly inapplicable — this is not a tool-plan question). This package **does not author a formal `applicability_requirements` entry in this draft**, for two compounding reasons:
1. No fact type exists for "deployer established/located in [X]" or "output used in [X]" — the only available proxy, `jurisdiction`, is a blunt instrument that would conflate both 2(1)(b) and 2(1)(c)'s genuinely different conditions into one undifferentiated value.
2. Even setting that aside, `JURISDICTION_VALUE_ALIASES` has zero EU-related entries (§1) — a `value: "European Union"` requirement would only match an exact, literal "european union" attestation, which no current extraction pathway (`AssessmentJurisdictionMention`, `DistributionTerritoryMention`) is confirmed to produce in this session's contract-derivation pass.

**Recommendation:** applicability for this claim is represented, for now, as an **unresolved project dependency** (§9) rather than a formal `applicability_requirements` gate — mirroring the honest architecture-gap handling the NY likeness package already established, rather than authoring a formal requirement this package cannot confirm will ever evaluate to `met`.

---

## 7. Geographic discovery relevance (Step 7)

**Is there canonical evidence that a stated distribution/output-use territory can make this claim relevant?** Yes, in principle — Article 2(1)(c)'s "output... used in the Union" condition means a project's stated distribution territory is at least evidentially relevant to whether Article 50(4) could apply, even though (per §6) it does not conclusively establish applicability by itself. This is exactly the "relevance without applicability" distinction the territory architecture was built to represent (`DISCOVERY RELEVANCE IS NOT APPLICABILITY`).

**What exact `geographic_relevance_scope` would be justified?** Given the matching contract's own constraints (§1: literal strings, exact case-insensitive match, no hierarchy, no alias table, no region inference), a single value of `["European Union"]` would be **functionally near-useless** — it would only match a project that states its distribution territory as the literal phrase "European Union," while the extractor's own documented examples (`"this will run in France"`, `"the UK and Germany"`, `"we're launching this in Japan"`) show users overwhelmingly name individual countries, not the political union. Per Step 7 Q4's own framing, the honest answer is: **the current matching semantics cannot represent "the EU" as a single governed label that reliably fires for realistic user statements.** The technically correct representation would be an explicit, literal enumeration of all 27 EU member state names (Austria, Belgium, Bulgaria, Croatia, Cyprus, Czechia, Denmark, Estonia, Finland, France, Germany, Greece, Hungary, Ireland, Italy, Latvia, Lithuania, Luxembourg, Malta, Netherlands, Poland, Portugal, Romania, Slovakia, Slovenia, Spain, Sweden) — but this package does **not** author that list as a production value here, for three reasons:
1. It is a genuinely large, error-prone list to hand-author and hand-verify against an authoritative EU membership source, which this package has not independently captured (another evidence gap, minor, listed in §Open Issues) — better done deliberately, once, by a human reviewer, than embedded unreviewed in this draft.
2. Every one of those 27 country names, individually, is *also* relevant to whatever OTHER EU-law claims this notebook may eventually govern (GDPR-adjacent, DSA-adjacent, etc.) — a future engineering decision about whether "EU member state" deserves a first-class governed list (reducing 27 literals to one reusable reference) is a legitimate open question this package flags but does not resolve, since that would be schema/engineering work.
3. Per §Open Issues, this package has not independently confirmed the *current, live* list of EU member states as a primary-sourced fact (obvious as it may seem) — flagged for completeness/rigor, not because there's real doubt about EU membership, but because this notebook's own evidentiary discipline (§EVIDENCE-CAPTURE-SOP.md) does not carve out an "everybody already knows this" exception.

**Would opting in risk implying applicability when only relevance is known?** This is the central design question the architecture is already built to prevent structurally (the field is "never consulted anywhere except `territoryRelevanceMatches`/`lookupDiscoveredTopicClaims`... does not participate in applicability_requirements evaluation, Bounded Interpretation, or Composition"), so opting in itself carries no structural applicability risk *if* Bounded Interpretation for this claim (§10) is drafted correctly to never conflate "discovered via territory" with "applicable." This package's own §10 draft honors that distinction explicitly (State D).

**Recommendation:** propose (not adopt) `geographic_relevance_scope` as the full literal 27-member-state enumeration, once independently verified — deferred to a future, narrower drafting pass, not authored here. **No production value is set by this package.**

---

## 8. Explicit-goal authorization / TopicRelationship (Step 8) — PARTIALLY UNBLOCKED 2026-09-13, see update below

**Update, 2026-09-13:** the `KnowledgeTopic` engineering foundation this section originally called for is now integrated on `origin/main`, and `governance-reviews/FGR_019_ADDENDUM_TOPIC_TAXONOMY_RECOMMENDATION_2026-09-13.md` records a RECOMMENDED (not yet PM-concurred, not yet production) `KnowledgeTopic` identifier for this claim: **`ai_content_transparency`**. This resolves the *naming* half of the gap described below — it does NOT itself author a production `TopicRelationship`, does NOT set `KNOWLEDGE_ONLY_TOPICS` in code, and does NOT change `crc_eligible` (see the addendum's own §8 for why topic assignment removes only the Adoption-level blocker, not the CRC-activation-level ones). The original analysis below is preserved unedited as the historical record of why no relationship could be proposed at the time it was written.

Per Step 8's own explicit instruction ("If no current explicit goal cleanly authorizes contribution: STOP that portion of activation design. Report the taxonomy/governance gap. Do not manufacture a relationship merely to activate geographic discovery"), **this step was stopped, not completed, as originally drafted:**

**Inspection of the current `GOAL_CATEGORIES`:** `commercial_use | copyright_ownership | copyrightability | likeness | third_party_source_rights | unknown`. None of these is "does my AI content need to be disclosed/labeled as AI-generated" — the actual question Article 50(4) answers. The nearest adjacent category, `likeness` (governing whether using a specific real person's face/voice/name is permitted), is a **different legal question** from disclosure/transparency: a project can have full likeness clearance (consent obtained) and still face an undisclosed Article 50(4) deep-fake-labeling obligation, and conversely a project with no likeness issue at all (e.g., a wholly synthetic, non-real depiction that nonetheless "resembles existing... entities" per the general deep-fake concept) could still trigger Article 50(4). Forcing `topic: likeness` onto this claim would make it surface for the wrong user question (a likeness-clearance question) and fail to surface for the right one (a disclosure question), which is a **worse** outcome than not authoring the claim's topic at all.

**No `TopicRelationship` is proposed.** A relationship requires both a `source_topic` (the explicit goal that would receive the related knowledge) and a `target_topic` (this claim's own topic) — both must be existing `GoalCategory` values. With no viable target topic, no relationship can be soundly authored without manufacturing one, which this package declines to do.

**Reported gap:** the `GOAL_CATEGORIES` taxonomy has no category for AI-content transparency/disclosure/labeling obligations — the general subject Article 50(1), 50(2), and 50(4) all belong to. This is a genuine taxonomy gap, not something this evidence/governance-drafting milestone is authorized to resolve (adding a new `GoalCategory` value is CRC engineering). **This is the single most load-bearing open issue in this entire package** — see §17 Q8, Q10.

---

## 9. Project dependencies (Step 9)

| Dependency | Classification | Why it matters | Can CRC ask it? | Fails closed? |
|---|---|---|---|---|
| `deployer_status_confirmed` (is the user/their client the "deployer" for this specific AI system's output, per the now-captured Article 3(4) definition: "a natural or legal person, public authority, agency or other body using an AI system under its authority except where the AI system is used in the course of a personal non-professional activity"?) | **D — not currently representable.** No structured fact type exists anywhere in the reviewed interview-engine contract for this concept. The definition being now known and reasonably determinate does not change this classification — CRC still has nothing structured to check it against. | The entire obligation is deployer-specific; without this, CRC cannot even identify who the claim addresses. | No — nothing to ask against; would require new engineering, out of scope here. | Yes — absent this, the claim cannot resolve to "applies to you" for any project. |
| `content_constitutes_deep_fake` (does the specific content meet Article 3(60)'s definition: "AI-generated or manipulated image, audio or video content that resembles existing persons, objects, places, entities or events and would falsely appear to a person to be authentic or truthful"?) | **C — evidence-only.** Now precisely bounded (see `EU-AI-ACT-ARTICLE-50-EVIDENCE-NOTE.md` §2c.ii) — a two-part test (content-type gate + a "would falsely appear... authentic" characterization). The characterization half is a judgment call closer to `advertising_or_trade_use_confirmed` in the NY likeness package (a legal/factual characterization, not a raw fact) than a simple self-attestable yes/no — the definition's own precision reinforces, rather than removes, this classification. | Central gating condition for the whole obligation. | Provisionally no — mirrors the Stock Governance Rule (§ below): a legal-characterization question should not become a naive self-attestation question. | Yes. |
| `artistic_creative_satirical_fictional_analogous_work` (does the content qualify for the disclosure-manner carve-out?) | **C — evidence-only / judgment-laden**, structurally identical in kind to the NY likeness package's `advertising_or_trade_use_confirmed` treatment. | Determines disclosure *manner*, not whether disclosure is owed at all. | Provisionally no, same reasoning. | Yes — absent resolution, the stricter (non-carve-out) disclosure manner should be assumed as the safer default framing, never the reverse. |
| `union_establishment_or_output_use` (Article 2(1)(b)/(c) applicability — see §6) | **B — bounded user-attestable fact, but only partially.** A stated `DistributionTerritoryMention` is a legitimate, already-modeled structured fact CRC can ask about and capture (it already does, per the extractor's own documented behavior) — but per §6, it only evidences, never conclusively resolves, this dependency. | Determines whether EU law applies to this deployer at all. | Yes, already asked (existing `distribution_territory_mention` mechanism) — but the *answer it produces is evidence toward, not proof of,* this dependency. | Yes — CRC must never treat a captured distribution territory as itself resolving Article 2(1)(b)/(c) applicability. |

**Stock Governance Rule applied:** none of the three legal-characterization dependencies above (`deployer_status_confirmed`, `content_constitutes_deep_fake`, `artistic_creative_satirical_fictional_analogous_work`) is proposed as a direct CRC self-attestation question, per this notebook's existing discipline that project-specific facts requiring evidence, not user assertion, must not become naive attestation prompts (mirroring `written_consent_confirmed` in the NY likeness package).

---

## 10. Bounded Interpretation — draft states (Step 10)

| State | What appears resolved | Material unresolved issue | Evidence missing | CRC can conclude | CRC cannot conclude | Commercial Assurance would verify |
|---|---|---|---|---|---|---|
| **A.** Claim relevant + applicability resolved + dependencies resolved | (Hypothetical — not currently reachable; §6/§9 show applicability cannot currently be formally "resolved" by any implemented mechanism) | — | — | (Not currently reachable given §6/§8/§9's open items) | — | — |
| **B.** Claim relevant + applicability unresolved (e.g., a distribution territory was stated, but establishment/output-use per 2(1)(b)/(c) is not confirmed) | A distribution territory was stated | Whether Article 2's conditions are actually met | Deployer's own establishment/location; precise output-use scope | That EU law generally imposes a deepfake-disclosure obligation on deployers meeting certain conditions | Whether THIS project's deployer meets those conditions | Confirm establishment/location and output-use scope against Article 2 |
| **C.** Claim relevant + evidence-only dependency unresolved (e.g., applicability plausible, but "is this a deep fake" / "is this artistic work" unresolved) | Applicability plausible | Content characterization | Independent review of the content against the statutory definition | The general disclosure rule and its carve-out shape | Whether THIS content triggers the obligation or qualifies for the carve-out | Characterize the content against the now-captured Article 3(60) definition and the carve-out language |
| **D. Territory creates discovered relevance but not applicability** (the specific state the geographic-relevance architecture exists to represent correctly) | A distribution territory was stated, surfacing this claim via Track A discovery | Discovery is not applicability — see §6/§7 | Establishment/location facts; conclusive output-use characterization | That this topic MAY be relevant given the stated territory | That the obligation applies | Confirm applicability properly before any assurance conclusion |
| **E.** Explicit goal asks about the topic directly | (Not currently reachable — no `GoalCategory` exists for this question; see §8) | — | — | — | — | — |
| **F.** Neither explicit nor discovered relevance exists | No territory stated, no matching explicit goal | — | — | Nothing — claim does not surface | — | — |

**No state above produces or implies a compliance/legal conclusion.** State D is the one this milestone's architecture background most wants tested, and it is drafted here to explicitly preserve the relevance-vs-applicability boundary, per this milestone's own repeated instruction.

---

## 11. CRC eligibility (Step 11)

- **Can it be expressed educationally without legal advice?** Yes — the proposition as drafted (§4) states the general rule and carve-out without characterizing any specific project.
- **Can applicability be bounded?** Partially — see §6/§10 State D; the mechanism exists to represent "relevant but not applicability-resolved," but no formal `applicability_requirements` gate is currently authorable (§6).
- **Can unresolved dependencies fail closed?** Yes — §9's table is explicitly designed this way.
- **Can evidence limitations be preserved?** Yes — §Open Issues below is exactly this.
- **Can Projection avoid converting it into a compliance conclusion?** In principle yes, following the same `RELATED_TOPIC_BOUNDARY_CLAUSE`/Case-3B-hedge pattern already proven for the copyright domain — but this has not been tested against real pipeline code in this evidence/governance-only milestone (no CRC engineering was touched, per this milestone's own prohibition).
- **Would Commercial Assurance remain meaningfully higher-assurance?** Yes — clearly, per §10's every row: CRC can only ever state the general rule; Commercial Assurance is needed for every project-specific determination.

**Recommendation: `CRC eligible: Pending` — not `No`, but not ready for `Yes` either.** The proposition itself is CRC-suitable in principle. What blocks a `Yes` recommendation is now, following Article 3's definitions being captured (§2c), **entirely the taxonomy gap in §8** (no topic to attach it to means the question is currently moot) — the definitional imprecision that previously also contributed to this recommendation has been resolved (the definitions are precise; `content_constitutes_deep_fake` remains evidence-only because the definition's own *characterization* test is inherently judgment-laden, not because the definition itself is unknown).

---

## 12. Candidate lifecycle / supersession (Step 12)

- **Proposed lifecycle: Candidate** (this package's own recommendation — not `Under Review`, since the taxonomy gap in §8 means a meaningful FGR cannot yet fully evaluate it against a real topic/relationship structure).
- **Evidence version:** tied to the three-session evidence package (`a8fe96d` / `d74f1ca` / `c5d9378`), specifically the Class B enacted-instrument capture in `c5d9378`.
- **Relationship to Regulation 2026/1744:** confirmed non-relevant to this specific paragraph's wording (§2/§3) — a future refresh should re-confirm this remains true if a further amending instrument is ever adopted, per the standard SOURCE CHANGED vs. GOVERNED PROPOSITION CHANGED discipline (`EVIDENCE-CAPTURE-SOP.md` §7).
- **Commission guidance treatment:** represented throughout this package as **non-binding supporting/interpretive evidence**, never as proposition authority — per its own explicit self-description ("These Guidelines are non-binding. Any authoritative interpretation of the AI Act may ultimately only be given by the CJEU," captured verbatim in the prior evidence session). The candidate proposition's own wording (§4) is drawn from the enacted Regulation text, not from the Guidelines' paraphrase of it.
- **Future supersession triggers:** (a) resolution of the `GOAL_CATEGORIES` taxonomy gap; (b) ~~independent capture of Article 3's "deep fake"/"deployer" definitions~~ — **done, 2026-09-11/12, see `EU-AI-ACT-ARTICLE-50-EVIDENCE-NOTE.md` §2c**; (c) any future amendment to Article 50(4), Article 2, or Article 3's "deployer"/"deep fake" definitions by a further Digital-Omnibus-style instrument; (d) a future CRC engineering decision about how (or whether) to formally represent Article 2(1)(b)/(c)'s establishment/output-use distinction as an applicability fact.

---

## 13. Article 50(2) separation check (Step 13)

**Determination: (A) Article 50(2) is outside this package entirely**, with a narrower qualification: Article 111(4)'s transitional rule is cited (§2, §4 source references) purely as evidence-limitation context establishing that the Omnibus's only Article-50-adjacent effect is elsewhere (on 50(2)'s compliance timeline for pre-existing systems), and therefore does *not* touch this package's own proposition — not as a dependency, not as bundled content, not as a co-proposition.

**Why not (B), (C), or (D):**
- Not **(B) a separate future candidate** in the sense of "on the same track" — 50(2) is a *provider* marking/detection obligation; 50(4) is a *deployer* disclosure obligation. Different actor, different mechanism (technical marking vs. audience-facing disclosure), different Omnibus treatment (transitional rule exists for one, not the other — §2). A future 50(2) candidate package, if ever drafted, would stand entirely on its own.
- Not **(C) a dependency/context proposition needed for 50(4)** — nothing in Article 50(4)'s own text conditions the deployer's disclosure obligation on the provider's marking-technology compliance status. A deployer's disclosure duty does not depend on whether the underlying tool's provider has (or hasn't) implemented Article 50(2) marking.
- Not **(D) structurally coupled** — no source or architecture evidence supports coupling; the statute itself places them in separate paragraphs with separate addressees, and the Omnibus's own targeted amendment (touching only 50(2)'s transitional timing, confirmed by direct reading of the enacted text) reinforces that EU legislative practice itself treats them as severable.

**The fact that Article 50(2) is unusually well-evidenced (three independent sources: Guidelines, EPRS, enacted text) is explicitly not treated as a reason to bundle it here**, per this milestone's own instruction.

---

## 14. Public-interest-text exclusion check (Step 14)

**Confirmed separable, per the statute's own structure.** Article 50(4) has two subparagraphs:

1. First subparagraph (this package's scope): "Deployers of an AI system that generates or manipulates **image, audio or video content constituting a deep fake**, shall disclose..." — gated on content type (audiovisual) and the "deep fake" characterization; carve-out is the artistic/creative/satirical/fictional/analogous-work test.
2. Second subparagraph (deferred, out of scope): "Deployers of an AI system that generates or manipulates **text** which is published with the purpose of **informing the public on matters of public interest**, shall disclose..." — gated on content type (text) and a wholly different subject-matter test (public-interest informational purpose); carve-out is different too (law-enforcement exception, **plus** a human-review/editorial-responsibility exception not present in the first subparagraph at all).

Different content type, different qualifying test, different exception set, same paragraph number but textually and structurally independent obligations. **This package can and does keep the second subparagraph out of scope without corrupting the first** — nothing in the first subparagraph's own conditions or carve-outs references or depends on the second.

---

## 15. Adversarial review (Step 16)

Tested against the milestone's own enumerated attack list:

| Attack | Finding |
|---|---|
| Proposition stronger than source | Not found — §4's proposition tracks the captured source text closely; the carve-out is represented as a manner-limitation, not an exemption, matching the source's own "limited to... an appropriate manner" language exactly. |
| Provider/deployer conflation | Not found — §5 explicitly preserves "deployer" throughout and calls out the statute's own vocabulary discipline. |
| Discovery treated as applicability | Actively guarded against — §7's own text and §10 State D are drafted specifically to prevent this; flagged as the architecture's central risk and addressed directly. |
| Fabricated UserGoal | Not found — §8 explicitly declines to manufacture one. |
| Arbitrary TopicRelationship | Not found — §8 explicitly declines to author one. |
| Geographic overbreadth | Addressed — §7 explicitly rejects a bare `["European Union"]` value as both overbroad-by-implication-of-authority and simultaneously under-inclusive-in-practice given the no-hierarchy matching rule, and does not author a production value. |
| Individual Member State → EU equivalence errors | Addressed — §7 explicitly distinguishes literal member-state matching from any "EU" aggregate. |
| Missing exceptions/qualifications | Checked — both the artistic-work carve-out and the law-enforcement exception from the captured source text are represented (§3, §4, §9). |
| Legal-advice wording | Checked — §4's "Prohibited conclusions" and this package's own header explicitly disclaim legal advice/compliance certification throughout. |
| Compliance/certification implication | Checked — same as above; §10's every state stops short of a compliance conclusion. |
| Dependencies converted improperly into self-attestation | Checked — §9 explicitly withholds direct-question treatment from the three legal-characterization dependencies, per the Stock Governance Rule. |
| Domain-specific orchestration disguised as governance | Checked — no new extraction/engineering logic proposed anywhere in this package; every gap (§8, §Open Issues) is reported, not engineered around. |
| Article 50(2)/50(4) accidental bundling | Checked directly — §13 is a dedicated section for exactly this. |
| Deferred public-interest text leaking into scope | Checked directly — §14 is a dedicated section for exactly this. |
| Commission guidance treated as binding law | Checked — §12 and §4's source references explicitly preserve non-binding status throughout. |
| Digital Omnibus timing misapplied to Article 50(4) | Checked directly — §2/§3/§4 explicitly state the Omnibus does NOT touch 50(4) or its timeline, confirmed by direct reading of the enacted text, not assumed. |

**One correction made during this review pass:** an earlier internal draft of §4's proposition risked implying the artistic-work carve-out removes the obligation entirely; revised (final version above) to state explicitly that the obligation is "not removed but is limited to disclosing the existence" — matching the source text's own "limited to... " construction rather than a binary on/off framing.

**No load-bearing issue found that could be silently resolved without evidence.** The §8 taxonomy gap remains marked OPEN below, not force-closed. The Article 3 definitional gap noted in this section's original drafting has since been resolved (2026-09-11/12, see §16 item 2 below and `EU-AI-ACT-ARTICLE-50-EVIDENCE-NOTE.md` §2c) — it is retained in this list as a closed item, not deleted, so the review trail stays intact.

---

## 16. Open governance issues (Step 16 output)

1. **[BLOCKING] No `GoalCategory` exists for AI-content transparency/disclosure obligations** (§8). This blocks a final `Topic:` assignment, blocks any `TopicRelationship`, and makes the CRC-eligibility question (§11) largely moot until resolved. Resolution requires an engineering/taxonomy decision outside this milestone's authority.
2. **[RESOLVED, 2026-09-11/12] Article 3's "deep fake" and "deployer" definitions** — previously not independently captured — **are now captured as Class B primary text**, cross-validated against the Digital Omnibus's own enacted amendment list (both definitions: unchanged). See `EU-AI-ACT-ARTICLE-50-EVIDENCE-NOTE.md` §2c for the full verbatim text and reconciliation. Net effect on this package: the pre-capture caution against assuming an identifiable-natural-person requirement for "deep fake" is confirmed correct; the `content_constitutes_deep_fake` dependency's evidence-only classification (§9) is reinforced, not removed, now that the definition's own characterization test is precisely known.
3. **[MATERIAL] `JURISDICTION_VALUE_ALIASES` has zero EU-related entries** (§1, §6) — even setting aside whether `jurisdiction` is the right applicability-fact type at all for this claim, the mechanism would not currently canonicalize any EU-adjacent user statement.
4. **[MINOR] No more specifically on-point recital than 132-137 (already captured, mostly about 50(2)) was identified for the deep-fake/audiovisual branch's own rationale** — a full-preamble search was not performed (out of bounded scope for the sessions that captured evidence).
5. **[MINOR] The 27-country EU-member-state list proposed in §7 was not independently primary-sourced in this package** — flagged for rigor, not because of genuine uncertainty about EU membership.
6. **[MINOR] Commission Guidelines §6 (Article 50(4) discussion, ~51 pages, already Class A captured in full) was not re-read in granular detail for this package** — the earlier `pdftotext` extraction confirms the section exists and roughly where it sits, but its specific interpretive content was not mined for this draft; a future pass could usefully extract the Commission's own worked examples for the artistic-work carve-out.

---

## 17. Governance readiness gate (Step 17)

1. Is the candidate proposition source-grounded? **YES** — verbatim Class A/B text.
2. Is actor/provider scope source-grounded? **YES** — "deployer" preserved exactly; see §5.
3. Are applicability requirements source-grounded? **PARTIALLY** — Article 2(1)(b)/(c)'s conditions are source-grounded (§6); no formal, currently-implementable `applicability_requirements` entry could be soundly authored, honestly disclosed rather than forced.
4. Are dependencies bounded and correctly classified? **YES** — §9.
5. Is CRC eligibility defensible? **YES, as `Pending` with clear reasoning** (§11) — not defensible as `Yes` yet.
6. Is geographic discovery justified independently of applicability? **YES** — §7's reasoning, and the relevance-vs-applicability distinction is actively preserved, not collapsed.
7. Is proposed geographic_relevance_scope supported? **PARTIALLY** — the *rationale* for opting in is supported; the exact value (27-state enumeration) is proposed but not independently verified or authored as production (§7).
8. Is the proposed explicit-goal TopicRelationship semantically justified? **NO RELATIONSHIP IS PROPOSED** — correctly, per §8's own analysis; this question is answered by declining to propose one.
9. Is Track C provenance preserved? **N/A currently** — Track C (discovered-topic RetrievalResults preserving the originating explicit goal) presupposes a working topic/goal pairing, which §8 shows does not yet exist for this claim; nothing in this package's design would violate Track C's discipline once a topic exists, but it cannot be demonstrated live today.
10. Is Article 50(2) correctly separated? **YES** — §13.
11. Is public-interest text correctly deferred? **YES** — §14.
12. Can Bounded Interpretation prevent a legal/compliance conclusion? **YES, as drafted** (§10) — not yet tested against real pipeline code (no engineering touched, per this milestone's scope).
13. Can Commercial Assurance remain meaningfully higher assurance? **YES** — clearly, per every §10 row.
14. Are all remaining uncertainties explicitly represented? **YES** — §16.

**Load-bearing NOs: Q3 (partial), Q7 (partial), Q8 (no relationship proposed — by design, not a defect, but still means the activation chain is incomplete), Q9 (not currently demonstrable).** Per the gate's own instruction, **do not recommend FGR yet.**

---

## 18. Repository hygiene (Step 18) — confirmed before commit

- Production `TopicClaim` fixture (`08_Platform/app/lib/retrieval-engine/topic-claims-fixture.ts` or equivalent): **NOT TOUCHED.**
- Production `TopicRelationship` fixture: **NOT TOUCHED.**
- Production `geographic_relevance_scope` values: **NONE SET.**
- CRC engineering / Retrieval / Bounded Interpretation / Projection-Composition / questioning-gates: **NOT TOUCHED.**
- `GOVERNED-CLAIMS.md`, `TOPIC-RELATIONSHIPS.md`, `PENDING-QUESTIONS.md`, `EDGE-CASES.md`, `SI8-POSITIONS.md`: **NOT TOUCHED.**
- Only this new file (`EU-AI-ACT-ARTICLE-50-4-AUDIOVISUAL-FGR-PACKAGE.md`) is added.
- No Article 50(4) production onboarding performed.

---

## 19. Explicit statement

**This package is NOT ADOPTED.** It is a candidate governance-drafting artifact for future human review. No `Lifecycle` value in this document other than `Candidate` is asserted anywhere. No `CRC eligible: Yes` is asserted anywhere. No production fixture, relationship, or geographic-relevance value has been created. Article 50(4) audiovisual/deepfake production onboarding remains PAUSED.
