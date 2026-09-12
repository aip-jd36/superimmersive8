# EU AI Act Article 50 — Evidence-Only Reconciliation Note

**Status:** ACTIVE — durable evidence-reconciliation record, not itself governed knowledge. Does not draft a candidate proposition, does not assign CRC eligibility, does not assign `geographic_relevance_scope`, does not create a `TopicRelationship`.
**Added:** 2026-09-12, during "EU AI Act Article 50 — Canonical Primary-Source Evidence Capture."
**Updated:** 2026-09-12, during the follow-up milestone "EU AI Act Article 50 — Digital Omnibus Canonical Evidence Completion" — added §2a below. That milestone used the labels **SOURCE-DERIVED FACT** / **LATER GOVERNANCE INTERPRETATION**; the original sections below still use this note's original **SOURCE SAYS** / **SI8 INTERPRETATION FOR LATER REVIEW** labels, left as originally written. The two label pairs mean the same thing; §2a uses the newer wording because that is what its own milestone specified.
**Updated again:** 2026-09-12, during "EU AI Act Article 50 — Digital Omnibus Canonical Instrument Ingestion and Evidence Reconciliation" — added §2b below, reconciling §2a's institutional-description-based findings against the actual enacted text of Regulation (EU) 2026/1744, now captured (see `MANIFEST.md`). §2b uses the same SOURCE-DERIVED FACT / LATER GOVERNANCE INTERPRETATION labels as §2a.
**Updated a third time:** 2026-09-12, during "EU AI Act Article 50(4) — Article 3 Definition Evidence Completion" — added §2c below, capturing Article 3's canonical "deployer" and "deep fake" definitions (load-bearing for the Article 50(4) candidate package, `EU-AI-ACT-ARTICLE-50-4-AUDIOVISUAL-FGR-PACKAGE.md`) and their amendment status under Regulation (EU) 2026/1744. §2c uses the same SOURCE-DERIVED FACT / LATER GOVERNANCE INTERPRETATION labels as §2a/§2b.
**Supports:** the evidence in `MANIFEST.md` (this folder). Written per that milestone's Step 8 instruction to separate **SOURCE SAYS** from **SI8 INTERPRETATION FOR LATER REVIEW**, and to record which prior SI8 secondary assertions are supported, unsupported, stale, or incomplete — without deciding what a governed proposition should say.
**Prior state this corrects:** a read-only diagnostic immediately preceding this milestone established that the inherited claim "canonical EU evidence is complete" was not repository-provable, and that everything previously labeled "Article 50 research" (`01_Business/research/ASA-IAB-2026-AI-CONTENT-RESEARCH.md` §7, `06_Operations/institutional-knowledge/notebook/SI8-POSITIONS.md` POS-002) was secondary/interpretive, not canonical primary-source capture. This note records what capture actually changed that picture.

---

## 1. What was captured

See `MANIFEST.md` for the full provenance table. In summary, this session captured, as Class A evidence:

- The full verbatim text of **Article 50** (paragraphs 1-7) and **Article 2** (all 12 paragraphs) of Regulation (EU) 2024/1689, from the European Commission's own **AI Act Service Desk**.
- **Recitals 132, 133, 134, 136, and 137** — the full set the Service Desk itself flags as "relevant recitals" for Article 50.
- The Commission's official **Guidelines on the implementation of the transparency obligations for certain AI systems under Article 50** — Communication C(2026) 5054 final, Annex, dated Brussels 20.7.2026, 51 pages.
- The Commission's own **news confirmation** that "the AI Omnibus enters into force" on 27 July 2026, including the raw HTML `href` citing `OJ:L_202601744` as the amending instrument.
- The Commission's own **Digital Omnibus FAQ** (4 entries).

What was **not** captured despite genuine, multi-vector attempts across two sessions (see MANIFEST "What could not be captured"): anything hosted directly on EUR-Lex (confirmed, in the follow-up session, to be gated by an AWS WAF JavaScript bot-challenge — not a routing bug), and consequently the Digital Omnibus regulation's own verbatim amending text. See §2a below for what a follow-up session added: a second, independent official-institution source (European Parliament's EPRS) corroborating the Omnibus's effect on Article 50(2), and a more precise characterization of the EUR-Lex retrieval barrier.

---

## 2. Currentness / version status — the single most load-bearing finding

**SOURCE SAYS:** Every AI Act Service Desk page captured (Article 50, Article 2) carries this exact banner, verbatim: *"This provision has been amended by the Digital Omnibus on AI. The text displayed on this page has not yet been updated to reflect those amendments."* Separately, the Commission's own Guidelines document (¶ following footnote 49, referencing footnote 50) states: *"Regulation amending the AI Act (the AI Omnibus), which has been recently adopted by the Union legislature, envisages a targeted grandfathering rule only with regard to the marking and detection obligations under Article 50(2) AI Act for generative AI systems placed on the market or put into service before 2 August 2026. It gives providers of those existing systems a transitional period to bring their systems in conformity by 2 December 2026."*

**SI8 INTERPRETATION FOR LATER REVIEW:** The Article 50 and Article 2 text captured in this package is the **original, pre-Omnibus text** (as enacted 13 June 2024), not the current consolidated text. It remains accurate as far as it goes — the Commission's own reference tool still displays it and the Guidelines document (dated *after* the Omnibus's entry into force) does not describe Article 50(2)'s substantive marking obligation as having changed, only that a **transitional/grandfathering period** was added for systems already on the market before 2 August 2026. A future governance reviewer should not treat this package's Article 50/Article 2 text as "the current consolidated Article 50" without also accounting for this transitional rule, and should not assume it is the *only* change the Omnibus made to Article 50 or Article 2 without independently reading the Omnibus's own text (not obtained this session).

---

## 2a. Digital Omnibus completion pass (2026-09-12, follow-up milestone)

This section was added specifically to close the one gap §2 named: the Digital Omnibus's own text was still not in hand. A second retrieval attempt was made, plus a search for alternative official-EU-institution sources. Labels below use this follow-up milestone's own vocabulary (**SOURCE-DERIVED FACT** / **LATER GOVERNANCE INTERPRETATION**), which is equivalent in meaning to §2's **SOURCE SAYS** / **SI8 INTERPRETATION FOR LATER REVIEW**.

### 2a.i — Why the Omnibus's own text is still not captured

**SOURCE-DERIVED FACT:** A retry against EUR-Lex specifically targeting `OJ:L_202601744` reproduced the same "Today's OJ" redirect failure as the base Act (confirmed non-target-specific via a repeated GDPR control fetch). One additional URL form — `eur-lex.europa.eu/eli/reg/2026/1744/oj/eng` (content-negotiated ELI permalink) — behaved differently: it returned HTTP 202 with a page whose body is an AWS WAF (`awswaf.com`) JavaScript challenge (a token/cookie exchange script, `<noscript>This requires JavaScript</noscript>`), not the requested document. `op.europa.eu` (Publications Office) returned HTTP 403 (Azure WAF) and `efta.int/eea-lex/32026r1744` (an EEA Joint Committee factsheet mirror, checked as an alternative official multi-government surface) also returned HTTP 403.

**LATER GOVERNANCE INTERPRETATION:** This is now established as a genuine, JS-challenge-gated bot-detection barrier on EUR-Lex itself — not a content-availability question and not something CLI-based tooling or the WebFetch tool used in this session can pass. A live browser session (human-assisted, per `EVIDENCE-CAPTURE-SOP.md` §3, or a working browser-automation tool) is the only retrieval path identified so far that could plausibly succeed against it.

### 2a.ii — What the Omnibus does to Article 50, now corroborated by a second independent official source

**SOURCE-DERIVED FACT:** The European Parliament's own research service (EPRS briefing EPRS_BRI(2026)782651, captured this session) independently confirms the Commission Guidelines' account: the final trilogue agreement (7 May 2026) set "The obligation to mark AI-generated content was delayed to 2 December 2026 for systems on the market before 2 August 2026." The briefing also documents the full negotiating history of that one number: Commission proposal (19 Nov 2025) — 6 months; Council general approach (13 Mar 2026) — 6 months maintained; Parliament's IMCO/LIBE joint report (18 Mar 2026) — reduced to 3 months; final trilogue (7 May 2026) — settled at the fixed date 2 December 2026 (≈4 months from 2 August 2026). Adoption dates confirmed: EP vote 16 June 2026 (423-57-174), Council adoption 29 June 2026, signature 8 July 2026, OJ publication 24 July 2026, entry into force 27 July 2026. The briefing states the Regulation "amends Regulations (EU) 2024/1689, (EU) 2018/1139 and (EU) 2023/1230."

**LATER GOVERNANCE INTERPRETATION:** This is now a **two-independent-official-source corroboration** (European Commission Guidelines + European Parliament EPRS) of the identical substantive fact and identical final date, arrived at via entirely separate institutional processes (one interpreting the adopted law after the fact, one narrating the negotiation as it happened). This is materially stronger than either source alone, and stronger than the previous milestone's single-source (Commission-only) evidence. It should be treated as reliable for the *substance* of what changed, while still not substituting for the enacted instrument's own text if a future proposition needs to quote the amending provision verbatim (e.g. to cite exact statutory wording rather than describe the effect).

### 2a.iii — Article 50(4) and Article 2 — no evidence of amendment found (absence of evidence, not evidence of absence)

**SOURCE-DERIVED FACT:** The EPRS briefing, a dedicated 12-page account of this exact Regulation's full content and legislative history, contains no mention anywhere of "Article 2," "deep fake," "50(4)," or any territorial/scope provision. Its own itemized list of "main changes" (proposal stage) and its "next steps" narrative (final-agreement stage) cover: high-risk AI rules timeline (Annex III → 2 Dec 2027; Annex I → 2 Aug 2028), centralised AI Office enforcement, AI literacy, single conformity-assessment application, post-market monitoring template removal, SME→SMC extension, special-category personal data for bias correction, non-high-risk registration relief, regulatory sandboxes, the generative-AI-marking transitional period (§2a.ii above), a new ban on non-consensual intimate/sexual synthetic content and CSAM, and Machinery Regulation interplay. None of these is Article 2 or Article 50(4).

**LATER GOVERNANCE INTERPRETATION:** Per this notebook's own fail-closed discipline (`EVIDENCE-CAPTURE-SOP.md` §5, "retrieval failure is never evidence of absence"), the correct record is: **no source read this session indicates the Omnibus amends Article 2 or Article 50(4)** — not a confirmed, source-proven "Article 2 and Article 50(4) are unaffected." A briefing document, however dedicated and thorough, is a summary; it is reasonable evidence of no *headline* change to those provisions, but it is not the same evidentiary strength as reading the instrument's own text and confirming no amending clause touches them. A future reviewer relying on this package for a proposition about Article 2 or Article 50(4) should treat this as an open item, not a closed one.

### 2a.iv — Net effect on the completeness gate

**LATER GOVERNANCE INTERPRETATION:** Compared to the state at the end of the prior milestone, this pass converts the Digital Omnibus's effect on Article 50(2) from "known via one official source's description" to "known via two independent official institutional sources' descriptions, with full negotiating history and precise dates" — a meaningful strengthening. It does **not** convert the underlying gap (the enacted instrument's own operative text) from open to closed. See `MANIFEST.md` "What could not be captured" for the precise, current statement of that remaining gap.

---

## 2b. Enacted-instrument ingestion pass (2026-09-12, "Canonical Instrument Ingestion" milestone)

This section closes the gap §2a.iv named. The user manually captured the actual EUR-Lex-rendered text of Regulation (EU) 2026/1744 in a live browser (bypassing the AWS WAF challenge no automated tool in this project could pass) and supplied it for ingestion. See `MANIFEST.md`'s new row (`eur-lex-regulation-2026-1744-digital-omnibus_...pdf`, Class B) for full provenance. This is the enacted instrument's own operative text — every finding below was read directly from it, not inferred from the Commission Guidelines or the EPRS briefing.

### 2b.i — The exact amendment to Article 50 itself

**SOURCE-DERIVED FACT:** The enacted text's Article 1 (point 20) states, in full operative language: *"(20) in Article 50, paragraph 7 is replaced by the following: '7. The Commission shall encourage and facilitate the drawing up of codes of practice at Union level to facilitate the effective implementation of the obligations regarding the detection, marking and labelling of artificially generated or manipulated content. The Commission, taking utmost account of the opinion of the Board, shall assess whether adherence to those codes of practice is adequate to ensure compliance with the obligations laid down in paragraphs 2 and 4 of this Article, in accordance with the procedure laid down in Article 56(6). If it deems the code of practice to be inadequate, the Commission may adopt an implementing act specifying common rules for the implementation of those obligations in accordance with the examination procedure laid down in Article 98(2).'"* This is the **only** point in the enacted text's full point-(1)-through-(43) list of amendments to Regulation (EU) 2024/1689 that names Article 50 directly. No other point amends, replaces, or inserts anything into Article 50's paragraphs 1-6.

**LATER GOVERNANCE INTERPRETATION:** **Article 50(2) and Article 50(4) — the substantive marking and deepfake-disclosure obligations themselves — are NOT directly amended by this Regulation.** The only direct textual change to Article 50 is to paragraph 7, the codes-of-practice/Commission-oversight mechanism: responsibility shifts from "the AI Office" to "the Commission," "detection and labelling" becomes "detection, marking and labelling," and a new sentence requires the Commission to assess code-of-practice adequacy specifically against paragraphs 2 and 4 (implying those paragraphs' substance is the fixed reference point being assessed against, not itself being changed). This directly confirms and sharpens what §2a could only infer from the Guidelines/EPRS accounts: the marking and deepfake obligations' own wording is untouched; only the governance mechanism *around* them (paragraph 7) changed.

### 2b.ii — The Article 50(2) transitional provision — exact mechanism identified

**SOURCE-DERIVED FACT:** The enacted text's Article 1 (point 39(b)) states, in full: *"(39) Article 111 is amended as follows: ... (b) the following paragraph is added: '4. Providers of AI systems, including general-purpose AI systems, generating synthetic audio, image, video or text content, that have been placed on the market before 2 August 2026 shall take the necessary steps in order to comply with Article 50(2) by 2 December 2026.'"* This is a **new paragraph 4 inserted into Article 111** ("AI systems already placed on the market or put into service and general-purpose AI models already placed on the market" — the base Act's own transitional-provisions article), not an amendment to Article 50 itself.

**LATER GOVERNANCE INTERPRETATION:** §2a.ii's "SOURCE-DERIVED FACT" (from the Commission Guidelines and EPRS, describing a "targeted grandfathering rule"/"delayed to 2 December 2026") is now **CONFIRMED BY ENACTED TEXT**, word-for-word on the substance and date, with the added precision that the mechanism is specifically a new Article 111(4), addressed to *providers*, applying to systems *placed on the market before 2 August 2026*, giving them until *2 December 2026* to comply with *Article 50(2)* specifically (named by number, not paraphrased). This also resolves the milestone's own Step 4C verification request directly and completely: yes, the reported Article 111 transitional amendment exists, concerns exactly the described population (pre-2-August-2026 synthetic-content generators), and sets exactly the reported 2 December 2026 compliance date for Article 50(2).

### 2b.iii — Article 50(4) — now positively confirmed as NOT covered by any transitional provision

**SOURCE-DERIVED FACT:** Article 111(4)'s text (quoted in full at 2b.ii) names only "Article 50(2)." No other point in the enacted text's full amendment list mentions "Article 50(4)," "deep fake," or adds any comparable transitional paragraph for deployers under Article 50(4). The full point-(1)-through-(43) sequence was tracked article-by-article (confirmed continuous, no gap large enough to hide an unreviewed Article 50-adjacent insertion — see `MANIFEST.md`'s "Scope inspected" column for the specific pages read establishing this).

**LATER GOVERNANCE INTERPRETATION:** This **upgrades §2a.iii's finding from "absence of evidence" to a positive, source-confirmed fact**: Article 50(4) (the deployer deepfake-disclosure obligation) receives **no grandfathering/transitional treatment** under this Regulation. Deployers of deepfake-generating AI systems remain subject to the original 2 August 2026 application date with no carve-out for systems already deployed before that date — an asymmetry with Article 50(2)'s providers, who do get a transitional period to 2 December 2026. This is a materially significant, precisely-scoped finding for any future Article 50(4) governance work: the "audiovisual onboarding remains paused" caution in every milestone header to date turns out to correspond to a real asymmetry in the underlying law, not just an SI8-internal sequencing choice.

### 2b.iv — Article 2 — now positively confirmed as NOT amended in its territorial/application paragraph

**SOURCE-DERIVED FACT:** The enacted text's Article 1 (point 2) states in full: *"(2) Article 2 is amended as follows: (a) paragraph 2 is replaced by the following: [text concerning high-risk AI systems under Section B of Annex I product-safety legislation] ... (b) paragraph 7 is replaced by the following: [text concerning Union data-protection-law interplay, adding cross-references to new Articles 4a and 59]"* and point (3): *"(3) in Article 2, the following paragraph is added: '13. For high-risk AI systems referred to in Article 6(1), the application of specific requirements or obligations laid down in Articles 9 to 15 and 17 to 25 may be limited, where and to the extent that...' [a new delegated-act mechanism for limiting high-risk-system duplication with sectoral EU law]"*. Paragraph 1 of Article 2 — the provider/deployer/territorial-scope paragraph, including 2(1)(c)'s "output... used in the Union" trigger for third-country providers/deployers — is **not named or touched by either amendment**.

**LATER GOVERNANCE INTERPRETATION:** §2a.iii's "no evidence of amendment found" for Article 2 is now **CONFIRMED BY ENACTED TEXT** as to the specific paragraph that matters for the notebook's existing evidence package: **Article 2(1), including 2(1)(c), is unamended.** The Regulation does touch Article 2 (paragraphs 2, 7, and new paragraph 13), but none of those changes are territorial/application-scope changes — they are all about high-risk-system/sectoral-law interplay and data-protection cross-references. The territorial-relevance analysis already captured in the prior sessions' Article 2 evidence (paragraph 1, all seven sub-points, including 2(1)(c)) remains current and does not need revision for this Regulation's effect.

### 2b.v — Net effect on the completeness gate

**LATER GOVERNANCE INTERPRETATION:** This pass converts every remaining open item from §2a.iv from institutional-description-based to enacted-text-based:
- Article 50(2) transitional effect: institutional description → **enacted text, quoted in full, mechanism identified precisely (Article 111(4))**.
- Article 50(4): absence of evidence → **positive confirmation of no transitional treatment**.
- Article 2: absence of evidence → **positive confirmation that the territorial/application paragraph (2(1)) is unamended**.
- Article 50 itself: not previously examined at this resolution → **positive confirmation that only paragraph 7 (codes-of-practice mechanism) changed; paragraphs 1-6 are untouched**.

The one item that remains genuinely open is narrower than before: this session's reading was targeted (confirming the specific provisions relevant to Article 50/Article 2 of the base Act) rather than an exhaustive read of all 47 pages' every clause (e.g. the Article 5/Article 6 prohibited-practices and safety-component amendments, and the amendments to Regulation (EU) 2018/1139 and (EU) 2023/1230 in the Omnibus's own Articles 2-3, were not the target of this pass and were not read for their own sake). None of the unread material was found, in the process of sequentially tracking article numbers to locate Article 50/Article 2/Article 111, to contain any further reference to Article 50 or Article 2(1) — but this note does not claim an exhaustive line-by-line read of the full 47 pages, and says so plainly.

---

## 2c. Article 3 definitions pass (2026-09-11/12, "Article 3 Definition Evidence Completion" milestone)

This section closes the specific gap the Article 50(4) candidate package (`EU-AI-ACT-ARTICLE-50-4-AUDIOVISUAL-FGR-PACKAGE.md` §16.2) named: Article 3's "deployer" and "deep fake" definitions had never been independently captured. A previously-flagged-but-unverified Desktop artifact (`27 July 2026 consolidated Regulation (EU) 20241689.pdf`) was independently verified from its own content (not its filename) and ingested. See `MANIFEST.md`'s new row for full provenance.

### 2c.i — Source identity, verified from the artifact itself

**SOURCE-DERIVED FACT:** The ingested PDF's own page 1 states: "Consolidated text: Regulation (EU) 2024/1689 of the European Parliament and of the Council of 13 June 2024... (Artificial Intelligence Act)," with an "Access initial legal act" link, status "In force," and **ELI: `http://data.europa.eu/eli/reg/2024/1689/2026-07-27`** — EUR-Lex's own dated consolidated-version identifier, matching its own internal document header "`02024R1689 — EN — 27.07.2026 — 001.001`." The page also carries EUR-Lex's own standard disclaimer for every consolidated-text rendering: "This text is meant purely as a documentation tool and has no legal effect... The authentic versions... are those published in the Official Journal." The browser print footer confirms the source URL as `eur-lex.europa.eu/eli/reg/2024/1689/2026-07-27/eng...`.

**LATER GOVERNANCE INTERPRETATION:** This is a genuine, official EUR-Lex consolidated-text tool rendering of the base AI Act, dated exactly to 27 July 2026 — the same date the Digital Omnibus entered into force — meaning it is EUR-Lex's own attempt to show the base Act's current, post-Omnibus state. Per its own stated status, it is **not itself an authentic legal text** (only the Official Journal originals are); this package treats it accordingly, as strong official evidence of current content, not as a substitute for the enacted instruments already captured. This mirrors exactly how this notebook already treats the Commission Guidelines' non-binding status — a real, official, useful source that is nonetheless not itself "the law."

### 2c.ii — Canonical definitions captured

**SOURCE-DERIVED FACT — Article 3, point (4), "deployer":** *"'deployer' means a natural or legal person, public authority, agency or other body using an AI system under its authority except where the AI system is used in the course of a personal non-professional activity;"*

**SOURCE-DERIVED FACT — Article 3, point (60), "deep fake":** *"'deep fake' means AI-generated or manipulated image, audio or video content that resembles existing persons, objects, places, entities or events and would falsely appear to a person to be authentic or truthful;"*

**SOURCE-DERIVED FACT — Article 3, point (3), "provider" (captured for contrast, per the candidate package's own request):** *"'provider' means a natural or legal person, public authority, agency or other body that develops an AI system or a general-purpose AI model or that has an AI system or a general-purpose AI model developed and places it on the market or puts the AI system into service under its own name or trademark, whether for payment or free of charge;"*

**SOURCE-DERIVED FACT — Article 3, point (1), "AI system" (captured for contrast):** *"'AI system' means a machine-based system that is designed to operate with varying levels of autonomy and that may exhibit adaptiveness after deployment, and that, for explicit or implicit objectives, infers, from the input it receives, how to generate outputs such as predictions, content, recommendations, or decisions that can influence physical or virtual environments;"*

**LATER GOVERNANCE INTERPRETATION:** The "deep fake" definition is materially more precise than any assumption the candidate package could previously state without fabricating it. Two concrete consequences for the candidate package:
1. It does **not** require an identifiable *natural person* — it covers content resembling "existing persons, objects, places, entities or events." The candidate package's own §5/§9 discussion, drafted before this capture, correctly anticipated this possibility by explicitly not assuming an identifiable-natural-person requirement — that caution is now **CONFIRMED BY ENACTED TEXT**, not merely appropriately hedged.
2. It requires the content to "falsely appear to a person to be authentic or truthful" — a materially different, and narrower, test than "any synthetic content" or "any content generated by an AI system." A piece of obviously stylized/cartoonish/non-realistic synthetic content, even if AI-generated, would not on its face meet this test. The candidate package's §9 treatment of `content_constitutes_deep_fake` as a judgment-laden, evidence-only dependency (not a simple yes/no fact) is **CONFIRMED BY ENACTED TEXT** — the definition itself turns on a "would falsely appear... to be authentic" characterization, which is exactly the kind of judgment call this notebook's discipline says must not become a naive self-attestation question.

### 2c.iii — Digital Omnibus amendment status, cross-validated two independent ways

**SOURCE-DERIVED FACT (structural/consolidation-marker evidence):** The ingested consolidated PDF uses EUR-Lex's own standard consolidation markup: `▼B▼` marks base (originally-enacted, unamended) text; `▼M1▼` marks text introduced by the first consolidated amendment (the Digital Omnibus). Article 3 opens with a `▼B▼` marker immediately before its heading. Points (1) through (13) carry no interruption. Point (14) ("safety component") is preceded by a `▼M1▼` marker; the newly-inserted points (14a) ("SME") and (14b) ("SMC") are also under that same `▼M1▼` block. A `▼B▼` marker resumes immediately after point (14b), covering point (15) onward — including points (56) "AI literacy," (60) "deep fake," and (68) "downstream provider" (the article's last point) — with no further `▼M1▼` interruption anywhere in that range.

**SOURCE-DERIVED FACT (independent cross-check, from directly re-reading the enacted Digital Omnibus text already captured in `c5d9378`):** The Omnibus's own amendment list, point (4), reads: *"Article 3 is amended as follows: (a) point (14) is amended as follows: [safety component text]... (b) the following points are inserted: '(14a) "micro, small and medium-sized enterprise" or "SME" means...; (14b) "small mid-cap enterprise" or "SMC" means...'"* — and no other point in the Omnibus's full (1)-through-(43) amendment list names Article 3 again.

**LATER GOVERNANCE INTERPRETATION:** Two independently-obtained pieces of evidence — the consolidated document's own structural consolidation markup, and a direct re-read of the amending instrument's own operative text — agree exactly: **the Digital Omnibus's only effect on Article 3 is point (14) ("safety component") plus the newly inserted (14a)/(14b) (SME/SMC definitions)**, none of which are load-bearing for the Article 50(4) candidate package. Classification, per this milestone's own required format:
- **"AI system" (Art. 3(1)): UNCHANGED**
- **"provider" (Art. 3(3)): UNCHANGED**
- **"deployer" (Art. 3(4)): UNCHANGED**
- **"deep fake" (Art. 3(60)): UNCHANGED**
- ("safety component" (Art. 3(14)): AMENDED — replaced, plus two new points inserted — not load-bearing, noted only for completeness of the cross-check.)

No contradiction was found between the consolidated PDF and the amending instrument — both sources agree completely. No STOP condition was triggered.

### 2c.iv — Consequence for the Article 50(4) candidate package

**LATER GOVERNANCE INTERPRETATION:** None of the candidate package's substantive assumptions are contradicted. Both are confirmed, one qualified:
- **CONFIRMED:** "deployer" preserved exactly as the candidate package already used it (§5) — no redefinition, no surprise.
- **CONFIRMED, and strengthened:** the candidate package's deliberate refusal to assume an identifiable-natural-person requirement for "deep fake" (§5/§9) was the correct call — the actual definition indeed extends to "objects, places, entities or events," not only persons.
- **QUALIFIED:** the candidate package's `content_constitutes_deep_fake` dependency (§9) can now be stated more precisely — it is not merely "unresolved pending a definition," but unresolved against a *specific, now-known* two-part test (content-type gate + a "would falsely appear... authentic or truthful" characterization test) that is itself evidently judgment-laden, reinforcing (not merely maintaining) the candidate package's decision to keep it evidence-only rather than a self-attestation question.

No candidate proposition wording was rewritten to "make it pass" — per this milestone's own instruction. The candidate package's own text is updated only to point to this section for the now-resolved definitions (see its own revised §16 entry).

---

## 3. Reconciling the prior SI8 secondary research

### 3a. The "Recital 133 / provenance chain" quote — UNSUPPORTED

**SOURCE SAYS:** `01_Business/research/ASA-IAB-2026-AI-CONTENT-RESEARCH.md` §7 (added 2026-06-06) quotes, attributed to "Recital 133": *"Providers are not required to record or keep a full provenance chain."*

The actual captured text of Recital 133 (`ai-act-servicedesk-recital-133_*.html`) concerns providers' obligation to embed machine-readable marking/detection technical solutions (watermarks, metadata, cryptographic provenance methods, logging, fingerprints) into synthetic-content-generating AI systems, "as far as this is technically feasible" — it says nothing resembling "not required to record or keep a full provenance chain." This exact sentence also does not appear in Recitals 132, 134, 136, or 137 (all separately captured and checked as the neighboring recitals the Commission's own tool marks relevant to Article 50).

**SI8 INTERPRETATION FOR LATER REVIEW:** This specific quotation is **not supported by primary text** at the cited location, and was not found in a bounded check of the four neighboring recitals either. This does not necessarily mean the underlying point (that Article 50 does not itself mandate a full evidentiary provenance chain of the kind SI8's Commercial Assurance Assessment produces) is wrong — the actual Article 50(2) text captured here supports a version of that point on its own terms (it requires technical marking/detection solutions, not a chain-of-title-style documentary record). But the specific "Recital 133" citation and quotation should be treated as **unreliable and not re-cited** until a real source for it is found or the claim is restated without a false citation. A full survey of all ~180 AI Act recitals to find where (if anywhere) this sentence actually originates was not performed — out of scope for this bounded capture.

### 3b. Provider vs. deployer split for 50(2)/50(4) — SUPPORTED, with the underlying text now available

**SOURCE SAYS:** `SI8-POSITIONS.md` POS-002 states: "Article 50(2) is framed as the AI system provider's obligation (e.g. Runway, Kling); Article 50(4) is framed as the deployer's/platform's obligation" — while explicitly flagging that this had "not independently re-verified the current statutory text."

The captured Article 50 text confirms this framing directly: paragraph 2 ("**Providers** of AI systems... generating synthetic... content, shall ensure that the outputs... are marked...") and paragraph 4 ("**Deployers** of an AI system that generates or manipulates image, audio or video content constituting a deep fake, shall disclose...").

**SI8 INTERPRETATION FOR LATER REVIEW:** POS-002's provider/deployer framing is now supported by primary text (upgradeable from "not independently re-verified" to Class-A-backed), **for the pre-Omnibus text captured here**. POS-002's own hedge about not having independently re-verified the statutory text can now be revisited by a human reviewer, subject to the currentness caveat in §2 above (the Omnibus's other possible effects on Article 2/50 beyond the 50(2) transitional rule remain unconfirmed). **Update (§2b, enacted-text ingestion pass):** the Omnibus's *only* effect on Article 50 itself is paragraph 7 (the codes-of-practice mechanism) — paragraphs 2 and 4, which carry this provider/deployer split, are confirmed untouched. POS-002's framing is now fully current, not just pre-Omnibus-accurate.

### 3c. "EU Commission draft guidelines published May 8, 2026 (40 pages)" — STALE / SUPERSEDED

**SOURCE SAYS:** `ASA-IAB-2026-AI-CONTENT-RESEARCH.md` §7 cites, as its source, "EU Commission draft guidelines published May 8, 2026 (40 pages)."

The Guidelines document actually captured this session is dated **Brussels, 20.7.2026**, is **51 pages**, is explicitly the **final, adopted** version (Communication C(2026) 5054 final — not a draft), and its own text states it "was informed by input from a variety of stakeholders collected during a broad consultation... as well as stakeholder input on the draft guidelines that were published for consultation" — i.e. a draft-for-consultation stage did exist earlier in 2026, consistent with the research doc's reference to *something* existing around that time, but the object actually captured now is the later, final, adopted version, not that draft.

**SI8 INTERPRETATION FOR LATER REVIEW:** The June 2026 research's characterization was reasonable for what was known at the time (a draft-stage document existed) but is now **stale**. Any future governance work should cite the 20.7.2026 final Guidelines (C(2026) 5054 final) captured in this package, not the May 2026 draft reference.

### 3d. "Article 50 comes into force August 2, 2026" — SUPPORTED, but incomplete without the transitional-rule caveat

**SOURCE SAYS:** `ASA-IAB-2026-AI-CONTENT-RESEARCH.md` line 41 and line 164 both state the 2 August 2026 date; the Guidelines document confirms this is the correct base application date for the Article 50 transparency obligations generally.

**SI8 INTERPRETATION FOR LATER REVIEW:** Correct as a general statement, but now incomplete on its own: per §2 above, systems already placed on the market before 2 August 2026 get a transitional period to 2 December 2026 specifically for the Article 50(2) marking/detection obligation. A future governance proposition should state both dates and the distinction between them (new systems vs. already-placed systems), not just the single August date. **Update (§2b):** the exact mechanism is now known — a new Article 111(4), not a change to Article 50's own application date in Article 113. Article 50(4) (unlike 50(2)) has no such carve-out and remains on the plain 2 August 2026 date with no exception for pre-existing systems — see §2b.iii.

### 3e. The "Digital Omnibus" itself — new fact, not addressed by any prior SI8 research at all

**SOURCE SAYS:** The Digital Omnibus on AI (publicly cited, and confirmed via this session's own Class A capture of the Commission's own `href`, as `OJ:L_202601744`) was adopted and entered into force 27 July 2026 — after all prior SI8 Article 50 research (which dates to June 2026) was written.

**SI8 INTERPRETATION FOR LATER REVIEW:** None of SI8's prior Article 50 material (research doc, positioning entry, Rights Playbook v0.2 sales copy) could have accounted for this, since it postdates all of it. Any future governed proposition touching Article 50 must be authored against the Omnibus-aware picture in this package, not against the June 2026 research alone.

### 3f. Rights Playbook v0.2's compliance claim — flagged, not resolved here

**SOURCE SAYS:** `06_Operations/legal/rights-playbook/versions/v0.2.md` (a sales asset, Feb 2026) states: "Field #2 (Model Disclosure) satisfies EU transparency requirements" and "Field #9 (Version History) provides audit trail" under a section titled "SI8 compliance."

**SI8 INTERPRETATION FOR LATER REVIEW:** This appears to conflict with the later, more careful `SI8-POSITIONS.md` POS-002 ("Do not pitch SI8 as 'EU AI Act compliance'"). This note flags the conflict for a human's attention; **resolving, editing, or retiring the Rights Playbook language is outside the scope of an evidence-capture milestone** and is not done here.

---

## 4. Territorial/application evidence

**SOURCE SAYS:** Article 2(1) of the captured text lists seven categories of persons/entities the Regulation applies to, including (c): "providers and deployers of AI systems that have their place of establishment or are located in a third country, **where the output produced by the AI system is used in the Union**." Article 2(3)-2(12) then list a series of explicit carve-outs (national security, military/defence, research & development, personal/non-professional use, open-source release subject to conditions, etc.).

**SI8 INTERPRETATION FOR LATER REVIEW:** Article 2(1)(c)'s "output... used in the Union" language is the specific hook by which a non-EU SI8 client's AI-generated content could bring Article 50 into scope regardless of where the AI tool or the production company is based — this is the provision a later governance reviewer would need if drafting any territorial/geographic-relevance proposition. No `geographic_relevance_scope` value, candidate proposition, or TopicRelationship is proposed here; this paragraph only identifies which captured provision would be load-bearing for that future work. **Update (§2b.iv):** the enacted Digital Omnibus text has now been read directly and confirmed to leave Article 2 paragraph 1 (and therefore 2(1)(c)) completely untouched — it amends only paragraphs 2, 7, and adds a new paragraph 13, none of them territorial/scope provisions. This paragraph's analysis remains current with no caveat needed.

---

## 5. Explicit non-outcomes of this milestone

- No `CAND-*` candidate proposition was drafted.
- No `Lifecycle`, `CRC eligible`, or `geographic_relevance_scope` value was assigned to anything.
- No `TopicRelationship` was created.
- No entry in `GOVERNED-CLAIMS.md`, `PLATFORM-RIGHTS-MATRIX.md`, `SI8-POSITIONS.md`, `PENDING-QUESTIONS.md`, `EDGE-CASES.md`, or `TOPIC-RELATIONSHIPS.md` was added or modified.
- No claim that SI8 or any project is "EU AI Act compliant" is made anywhere in this package.
- No legal advice is given anywhere in this package; all quotations are presented as source material for a future named human governance reviewer, per this notebook's existing discipline.
