# EU AI Act Article 50 — Evidence-Only Reconciliation Note

**Status:** ACTIVE — durable evidence-reconciliation record, not itself governed knowledge. Does not draft a candidate proposition, does not assign CRC eligibility, does not assign `geographic_relevance_scope`, does not create a `TopicRelationship`.
**Added:** 2026-09-12, during "EU AI Act Article 50 — Canonical Primary-Source Evidence Capture."
**Updated:** 2026-09-12, during the follow-up milestone "EU AI Act Article 50 — Digital Omnibus Canonical Evidence Completion" — added §2a below. That milestone used the labels **SOURCE-DERIVED FACT** / **LATER GOVERNANCE INTERPRETATION**; the original sections below still use this note's original **SOURCE SAYS** / **SI8 INTERPRETATION FOR LATER REVIEW** labels, left as originally written. The two label pairs mean the same thing; §2a uses the newer wording because that is what its own milestone specified.
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

## 3. Reconciling the prior SI8 secondary research

### 3a. The "Recital 133 / provenance chain" quote — UNSUPPORTED

**SOURCE SAYS:** `01_Business/research/ASA-IAB-2026-AI-CONTENT-RESEARCH.md` §7 (added 2026-06-06) quotes, attributed to "Recital 133": *"Providers are not required to record or keep a full provenance chain."*

The actual captured text of Recital 133 (`ai-act-servicedesk-recital-133_*.html`) concerns providers' obligation to embed machine-readable marking/detection technical solutions (watermarks, metadata, cryptographic provenance methods, logging, fingerprints) into synthetic-content-generating AI systems, "as far as this is technically feasible" — it says nothing resembling "not required to record or keep a full provenance chain." This exact sentence also does not appear in Recitals 132, 134, 136, or 137 (all separately captured and checked as the neighboring recitals the Commission's own tool marks relevant to Article 50).

**SI8 INTERPRETATION FOR LATER REVIEW:** This specific quotation is **not supported by primary text** at the cited location, and was not found in a bounded check of the four neighboring recitals either. This does not necessarily mean the underlying point (that Article 50 does not itself mandate a full evidentiary provenance chain of the kind SI8's Commercial Assurance Assessment produces) is wrong — the actual Article 50(2) text captured here supports a version of that point on its own terms (it requires technical marking/detection solutions, not a chain-of-title-style documentary record). But the specific "Recital 133" citation and quotation should be treated as **unreliable and not re-cited** until a real source for it is found or the claim is restated without a false citation. A full survey of all ~180 AI Act recitals to find where (if anywhere) this sentence actually originates was not performed — out of scope for this bounded capture.

### 3b. Provider vs. deployer split for 50(2)/50(4) — SUPPORTED, with the underlying text now available

**SOURCE SAYS:** `SI8-POSITIONS.md` POS-002 states: "Article 50(2) is framed as the AI system provider's obligation (e.g. Runway, Kling); Article 50(4) is framed as the deployer's/platform's obligation" — while explicitly flagging that this had "not independently re-verified the current statutory text."

The captured Article 50 text confirms this framing directly: paragraph 2 ("**Providers** of AI systems... generating synthetic... content, shall ensure that the outputs... are marked...") and paragraph 4 ("**Deployers** of an AI system that generates or manipulates image, audio or video content constituting a deep fake, shall disclose...").

**SI8 INTERPRETATION FOR LATER REVIEW:** POS-002's provider/deployer framing is now supported by primary text (upgradeable from "not independently re-verified" to Class-A-backed), **for the pre-Omnibus text captured here**. POS-002's own hedge about not having independently re-verified the statutory text can now be revisited by a human reviewer, subject to the currentness caveat in §2 above (the Omnibus's other possible effects on Article 2/50 beyond the 50(2) transitional rule remain unconfirmed).

### 3c. "EU Commission draft guidelines published May 8, 2026 (40 pages)" — STALE / SUPERSEDED

**SOURCE SAYS:** `ASA-IAB-2026-AI-CONTENT-RESEARCH.md` §7 cites, as its source, "EU Commission draft guidelines published May 8, 2026 (40 pages)."

The Guidelines document actually captured this session is dated **Brussels, 20.7.2026**, is **51 pages**, is explicitly the **final, adopted** version (Communication C(2026) 5054 final — not a draft), and its own text states it "was informed by input from a variety of stakeholders collected during a broad consultation... as well as stakeholder input on the draft guidelines that were published for consultation" — i.e. a draft-for-consultation stage did exist earlier in 2026, consistent with the research doc's reference to *something* existing around that time, but the object actually captured now is the later, final, adopted version, not that draft.

**SI8 INTERPRETATION FOR LATER REVIEW:** The June 2026 research's characterization was reasonable for what was known at the time (a draft-stage document existed) but is now **stale**. Any future governance work should cite the 20.7.2026 final Guidelines (C(2026) 5054 final) captured in this package, not the May 2026 draft reference.

### 3d. "Article 50 comes into force August 2, 2026" — SUPPORTED, but incomplete without the transitional-rule caveat

**SOURCE SAYS:** `ASA-IAB-2026-AI-CONTENT-RESEARCH.md` line 41 and line 164 both state the 2 August 2026 date; the Guidelines document confirms this is the correct base application date for the Article 50 transparency obligations generally.

**SI8 INTERPRETATION FOR LATER REVIEW:** Correct as a general statement, but now incomplete on its own: per §2 above, systems already placed on the market before 2 August 2026 get a transitional period to 2 December 2026 specifically for the Article 50(2) marking/detection obligation. A future governance proposition should state both dates and the distinction between them (new systems vs. already-placed systems), not just the single August date.

### 3e. The "Digital Omnibus" itself — new fact, not addressed by any prior SI8 research at all

**SOURCE SAYS:** The Digital Omnibus on AI (publicly cited, and confirmed via this session's own Class A capture of the Commission's own `href`, as `OJ:L_202601744`) was adopted and entered into force 27 July 2026 — after all prior SI8 Article 50 research (which dates to June 2026) was written.

**SI8 INTERPRETATION FOR LATER REVIEW:** None of SI8's prior Article 50 material (research doc, positioning entry, Rights Playbook v0.2 sales copy) could have accounted for this, since it postdates all of it. Any future governed proposition touching Article 50 must be authored against the Omnibus-aware picture in this package, not against the June 2026 research alone.

### 3f. Rights Playbook v0.2's compliance claim — flagged, not resolved here

**SOURCE SAYS:** `06_Operations/legal/rights-playbook/versions/v0.2.md` (a sales asset, Feb 2026) states: "Field #2 (Model Disclosure) satisfies EU transparency requirements" and "Field #9 (Version History) provides audit trail" under a section titled "SI8 compliance."

**SI8 INTERPRETATION FOR LATER REVIEW:** This appears to conflict with the later, more careful `SI8-POSITIONS.md` POS-002 ("Do not pitch SI8 as 'EU AI Act compliance'"). This note flags the conflict for a human's attention; **resolving, editing, or retiring the Rights Playbook language is outside the scope of an evidence-capture milestone** and is not done here.

---

## 4. Territorial/application evidence

**SOURCE SAYS:** Article 2(1) of the captured text lists seven categories of persons/entities the Regulation applies to, including (c): "providers and deployers of AI systems that have their place of establishment or are located in a third country, **where the output produced by the AI system is used in the Union**." Article 2(3)-2(12) then list a series of explicit carve-outs (national security, military/defence, research & development, personal/non-professional use, open-source release subject to conditions, etc.).

**SI8 INTERPRETATION FOR LATER REVIEW:** Article 2(1)(c)'s "output... used in the Union" language is the specific hook by which a non-EU SI8 client's AI-generated content could bring Article 50 into scope regardless of where the AI tool or the production company is based — this is the provision a later governance reviewer would need if drafting any territorial/geographic-relevance proposition. No `geographic_relevance_scope` value, candidate proposition, or TopicRelationship is proposed here; this paragraph only identifies which captured provision would be load-bearing for that future work.

---

## 5. Explicit non-outcomes of this milestone

- No `CAND-*` candidate proposition was drafted.
- No `Lifecycle`, `CRC eligible`, or `geographic_relevance_scope` value was assigned to anything.
- No `TopicRelationship` was created.
- No entry in `GOVERNED-CLAIMS.md`, `PLATFORM-RIGHTS-MATRIX.md`, `SI8-POSITIONS.md`, `PENDING-QUESTIONS.md`, `EDGE-CASES.md`, or `TOPIC-RELATIONSHIPS.md` was added or modified.
- No claim that SI8 or any project is "EU AI Act compliant" is made anywhere in this package.
- No legal advice is given anywhere in this package; all quotations are presented as source material for a future named human governance reviewer, per this notebook's existing discipline.
