---
company: "Anchor Film (錨點影音股份有限公司)"
contacts:
  - name: "Alice Feng (馮鈺婷)"
    role: "Co-founder"
slug: anchor-film
stage: evaluating
source: event
next_action: "Awaiting Alice's reply with the full/current October cross-domain grant RFP (slides remain 草案/draft even in the Sept 16 'latest' version). Before any application design: (1) run SI8's non-PRC AI-model/API/dependency + SBOM-readiness audit against the newly-surfaced supply-chain requirement — see `01_Business/research/TAIWAN-CROSSDOMAIN-AI-GRANT-2026-SMEA.md` §7; (2) reconcile JD's 'US/Europe primary market since the start' framing against claude.md's own Geographic Strategy section (active geos = UK/Netherlands/Dubai/Singapore — no US line); (3) confirm whether the Sept MODA grant (九月標案) is still live or superseded — still unanswered by Alice; (4) identify who 'Kay' is (source of the Sept 16 materials, unconfirmed identity/relationship)."
next_action_date: 2026-09-22
last_contacted: 2026-09-16
blocked: false
blocked_reason: null
review_date: null
billing_summary: null
created: 2026-08-15
---

# Anchor Film

Graduated from `03_Sales/CRM.md` (row B164) on 2026-08-15 — an active, developing strategic-partnership discovery conversation, well past a reply-only signal.

## Interaction log (reverse-chronological)

### 2026-09-16 — JD pitches a role split; Alice agrees on the international angle and sends newer draft slides (non-PRC supply-chain requirement surfaces)

**13:20, LINE:** JD replied to Alice's Sept 15 slides with a substantive pitch, not just acknowledgment. Key claims made (his own words, summarized):

- The October Agentic AI track's listed elements (Agentic AI, domain knowledge base/RAG, trustworthiness & evaluation) line up with work SI8 has already built: the Commercial Assurance domain knowledge base, RAG/AI decision workflow, CRC (Commercial Readiness Check), and AI-video commercial-risk assessment + traceable record-keeping.
- Framed SI8's target market as "originally US and Europe," not newly added for this grant — cited existing EU AI Act-specific domain knowledge as evidence, and stated the plan is to have customer revenue by end of 2026, scaling in 2027.
- Proposed the story: Anchor does Taiwan field validation (場域驗證), SI8 does US/Europe commercialization (國際出海) — pitched as a complete narrative for the program's stated 場域驗證→國內落地→國際出海 arc and its overseas-revenue emphasis.
- Asked Alice to send the complete RFP/program materials so he can review in detail before scheduling a joint-proposal discussion.

**Accuracy flags on JD's own claims (for internal tracking, not corrections sent to Alice):**
- "US and Europe" as SI8's original primary target market is a stronger/broader claim than what's currently documented in `claude.md`'s Geographic Strategy section, which lists active geos as UK, Netherlands, Dubai, and Singapore (Europe is represented via UK/Netherlands; no explicit US line exists there). Worth reconciling before this framing goes into a written proposal — either the docs are stale or the claim overstates current geographic focus.
- "Plan to start customer revenue before end of 2026" understates current state — SI8 already has at least one completed paid SI8 Certified assessment (Cloud World, `ASSESS-005-2026-07-12`) per the platform's live-mode launch (claude.md §3k, Mar 27, 2026). Not a misstatement of direction, but the message reads as pre-revenue when SI8 has already closed a live paying transaction.

**13:39, LINE:** Alice responded: "對呀 海外那塊您這邊現成有 非常有利" (exactly — the overseas piece is something you already have on your side, very advantageous). This confirms Alice's read of JD's pitch but is Alice's own characterization, not new evidence of existing overseas revenue — do not convert "現成有" into a claim that SI8 has closed overseas business (SI8's actual overseas activity is outreach/pipeline, per `03_Sales/CRM.md`, not signed revenue).

She then noted the material came from a third party — "這也Kay 貼給我的" (Kay posted this to me too) — the first mention of "Kay" as a source; identity/role unconfirmed, not yet in SI8's records. Alice then sent an image and immediately retracted it (已收回訊息, "message recalled") — content unknown, not recoverable, no further mention of it in the thread. At 13:40 she sent 2 replacement images captioned "最新草案～～" (latest draft).

**New draft content (slides described as newer/更新 versions of the Sept 15 deck, still 草案/draft):**

1. **Updated Agentic AI slide (主軸一：代理式AI與領域應用)** — adds detail beyond the Sept 15 version: explicitly covers discriminative, generative, and agentic AI, and states plainly "不以具備完整代理能力為申請門檻" (full agentic capability is NOT an application threshold) — lowers the bar for what counts as qualifying technology. Lists the same architecture blocks as before (multimodal sensing, domain knowledge base/RAG, agentic framework, tool interoperability via MCP/A2A, edge/cloud deployment, trustworthiness & evaluation) plus a 12-item numbered scenario list across primary/secondary/tertiary industry (農林漁牧 / 製造與營建 / 服務流通與醫療). **Scenario #12 — "專業服務文件審閱與法遵作業" (professional-services document review and regulatory/compliance work) — is the closest direct-language match yet to SI8's actual Commercial Assurance use case.** Scenarios are stated as illustrative, not exhaustive ("不以此為限").
2. **New slide — 非紅供應鏈說明 (non-PRC supply-chain requirement), page 7 of the deck.** This is new information not present in the Sept 15 slides. Establishes mandatory non-mainland-China sourcing rules split by R&D target category (AI software/services / unmanned vehicles / robotics). For AI software/services specifically: **mandatory exclusion of mainland-China-origin AI models, APIs, and services — explicitly including open-source, open-weight, fine-tuned, and distilled models built on a mainland-China-origin base.** Non-AI open-source packages must be disclosed (name, version, source, SBOM). Taiwan-domestic models/services/cloud/compute are "encouraged" (not mandatory). Verification stated as occurring at application, review, execution, and closeout stages — a final BOM (bill of materials) is required at closeout; false statements or use of prohibited components can result in expense disallowance and subsidy clawback.

**Why the non-PRC slide matters beyond BD tracking:** this is a real engineering-relevant compliance requirement, not just a BD data point — SI8 has not audited its own model/API/dependency supply chain against a "no mainland-China-origin AI model or component, including fine-tuned/distilled derivatives" standard, and does not currently have SBOM-generation capability confirmed. Flagged as an action item below; do not assume compliance without checking.

**Status:** JD has now made a one-sided pitch; Alice has responded positively on the international-fit framing specifically ("現成有，非常有利") and continued supplying materials, but no side has committed to lead applicant, workshare, budget, scope, or IP. Full analysis (updated FACTS/HYPOTHESES/OPEN QUESTIONS, technical-fit table, non-PRC compliance audit action item): `01_Business/research/TAIWAN-CROSSDOMAIN-AI-GRANT-2026-SMEA.md`. Raw images: `03_Sales/crm/raw/anchor-film/2026-09-16-crossdomain-grant-slide-7-non-prc-supply-chain.jpg`, `...-slide-3-agentic-ai-updated.jpg`.

### 2026-09-14/15 — LINE thread: October cross-domain SME co-creation grant surfaced, September grant status left unanswered

**Sep 14 (Mon), 17:01:** JD followed up: "Hi Alice! 想問看妳還計劃申請九月標案？" (still planning to apply for the September grant?).

**Sep 15 (Tue), 20:47-20:48:** Alice did not answer the September question directly. Instead she sent 2 slides from a different, draft-stage government program — a cross-domain SME co-creation AI grant issued by 中小及新創企業署 (SME & Startup Administration, MOEA; a different agency from the MODA program tracked in September) — with the message: "10月跨域這個 很重海外營收～～ 看要不要提這個～～" (this October cross-domain one weighs overseas revenue heavily — see if we want to propose this instead).

**What the slides show (draft/草案 marked, not a finalized RFP):** 3 proposal tracks (Agentic AI 與領域應用 / Sustainable AI 與災防管理 / Physical AI 技術與服務); required commercialization arc 場域驗證→國內落地→國際出海; eligibility requires 2+ SMEs applying jointly with an SME lead; subsidy capped at NT$9M, ≤50% of total project cost, with 補助款≤自籌款≤實收資本額; execution window through 2027-10-31 (~9 months); bonus points for startup alliance members, verified carbon reduction, and international market expansion. The Agentic AI track's named sub-technologies (agentic frameworks, domain knowledge base/RAG, MCP/A2A tool interoperability, "trustworthiness and evaluation" / decision traceability) map plausibly onto SI8's current architecture (Living Knowledge, the Decision Engine hypothesis, CRC, Commercial Assurance, assessment audit trails) without requiring SI8 to build a production/capture platform — see full analysis for the complete FACTS/HYPOTHESES/OPEN QUESTIONS breakdown.

**Read on this exchange:** stronger collaboration signal than Alice simply agreeing to ideas JD proposes — she independently surfaced a second funding vehicle and suggested pursuing it. It does NOT resolve whether the September grant (九月標案) is still active, abandoned, or superseded by this October option; JD's direct question about it went unanswered. Do not assume October replaces September — that is an open question, not a fact.

**Full analysis (FACTS/HYPOTHESES/OPEN QUESTIONS format, per Decision Quality Standards):** `01_Business/research/TAIWAN-CROSSDOMAIN-AI-GRANT-2026-SMEA.md`. Raw slide images: `03_Sales/crm/raw/anchor-film/2026-09-15-crossdomain-grant-slide-1-overview.jpg`, `...-slide-2-agentic-ai.jpg`. Note logged in that analysis file: the Sept MODA program's own research doc (`01_Business/research/TAIWAN-AI-SUBSIDY-PROGRAM-2026-MODA.md`) was found to be missing from current `main` during cross-referencing — flagged there, not yet investigated.

**Next commercial milestone (unchanged priority order from the analysis doc):** obtain full October program materials → confirm SI8/Anchor formal eligibility → resolve September-vs-October status → define project scope aligned to SI8's existing strategy → decide lead applicant → establish workshare/budget/IP → then decide whether to submit.

### 2026-09-01 — Commercial Readiness discovery prompt prepared for next direct conversation (not a message to send)

**Context:** part of a batch Commercial Readiness discovery pass across 10 warm leads, testing whether evidence/documentation feeds into a distinct interpretation + commercial-use decision layer (`evidence/documentation → interpretation or review → commercial-use decision/sign-off`) or whether documentation alone is sufficient. Alice is the one relationship in this batch treated as a live discussion, not outbound messaging — stage and next_action above are **unchanged** by this entry; the existing "schedule call next week" action remains authoritative.

**Why this matters:** Alice's own 創作履歷 (creation-record) prototype is a direct test case for the hypothesis — does producing a structured creation record itself solve the commercial-readiness question, or does it merely supply evidence to a later decision-maker (at Chunghwa Telecom, Uni-President, or another client)?

**Discussion prompt (to raise live, at the rescheduled call — not a LinkedIn/outbound send):**
> Once your prototype produces the record, is there another step where someone at Chunghwa Telecom or Uni-President actually reviews it and says the project is okay to use commercially? Or does producing the record itself effectively count as the approval?

**Analytical discipline reminder (applies once she answers):** classify her response as CURRENT FACT before drawing any WORKING HYPOTHESIS about the Commercial Readiness layer generally — Alice's own workflow, however informative, is one data point, not a market-wide conclusion.

**Tags:** Commercial Readiness Discovery · Warm Lead · Prior Response · Qualitative Evidence · Relationship/Live Discussion (not a batch-priority tier)

### 2026-08-28 / 2026-09-01 — LINE thread: Creation Rights reference shared; Living Lab event skipped, grant discussion re-scheduled

**Aug 28 (Fri), 17:52-18:01:** JD shared `https://creationrights.com/solutions/studios` via LINE, noting it resembles the production-capture platform concept they'd discussed ("蠻像我們討論的platform，可以參考"). Alice responded positively ("哇好！") within minutes. No further detail exchanged on this thread — a reference/FYI share, not a structured discussion.

**Sep 1 (Tue), 15:10-15:15:** JD messaged apologizing for being unable to attend the Living Lab (內湖) event this Friday (Sept 4) — a children's activity conflict — wished Alice well on her talks, and asked to reschedule the September grant-proposal (九月標案) discussion for next week. Alice replied it's fine, noting there will be another session in October ("10月還會再辦一場"). JD acknowledged.

**Implications:** the Aug 25 Zoom request (to discuss the grant proposal + lead-applicant/capital structure) never happened — JD is now re-proposing to talk next week instead. JD will not attend the Sept 3-4 Living Lab event, so the face-to-face intro to the AI film director Alice had offered (per the Aug 21 call notes) did not happen this cycle; Alice's mention of an October session leaves that door open, not closed. Separately: Sept 1 (today) is the DIDA subsidy program's own official-announcement date per the Aug 25 deck summary (`01_Business/research/TAIWAN-AI-SUBSIDY-PROGRAM-2026-MODA.md`) — relevant context for the rescheduled call, not something this LINE thread itself discussed.

### 2026-08-25 — chat exchange: subsidy deck shared, lead-applicant/capital math worked out

JD messaged Alice (14:04, chat) following up on the Aug 21 call, asking about the September grant opportunity she'd mentioned and requesting a Zoom this week to discuss the plan/strategy. Alice replied within minutes (14:06) by sending `AI 領航推動提案草案.pptx` directly — a 10-slide proposal-drafting briefing/template for DIDA's 開發產業AI便利工具及補助計畫, noting the program isn't officially announced until September but that ITRI (工研院) gave her early access to this briefing deck. **Provenance confirmed** (corrects the earlier "not confirmed" note logged the same day, before this chat was reviewed).

Extracted and summarized the deck: corroborates and quantifies the grant mechanics Alice described on the Aug 21 call, with real numbers — **NT$6.7M subsidy cap, capped at 50% of a total project (so ≥NT$13.4M total to draw the full amount)**, announcement expected **2026-09-01**, deadline **2026-09-30**, and the same foreign-entity/PRC-capital exclusion rule she illustrated with the "Hearst" example. Timing confirms this is the specific Ministry of Digital Affairs program she referenced.

JD then proposed (14:08) that Anchor write the proposal with SI8 folded in as a partner/sub-scope, rather than SI8 leading, noting SI8's own Taiwan-entity capital is "about 1.5 million" (NT$1.55M / ~US$48,600 @ 31.89, 2026-08-25 spot rate). Alice immediately asked (14:10) to confirm the exact figure; JD confirmed NT$1.55M (14:12) — **exactly the capital-linked lead-applicant calculation from the Aug 21 call**: applying "registered capital ≥ subsidy amount," SI8 as lead would be capped near NT$1.55M (~$48,600) subsidy on a ~NT$3.1M (~$97,200) total project, versus ~NT$6M (~$188,200) subsidy on a ~NT$12M (~$376,400) total project if Anchor leads instead (Anchor's own capital, ~NT$6M, per the Aug 21 call) — roughly a 4x difference in what the whole proposal could be sized at, in either currency. Alice's response pattern (asking to confirm the number right after JD's structure proposal) suggests she was independently running the same math. No commitment reached yet on lead-applicant structure or the requested Zoom call — both still open.

Full summary + updated provenance: `01_Business/research/TAIWAN-AI-SUBSIDY-PROGRAM-2026-MODA.md`. Raw source: `03_Sales/crm/raw/anchor-film/2026-08-25-ai-subsidy-proposal-draft-moda.pptx` (gitignored, local only) + `...-extracted-text.txt` (tracked).

### 2026-08-21 — follow-up demo call (~91 min, recorded, transcribed + translated)

First substantive follow-up since the Jul 30 panel conversation. Alice walked JD through her own in-progress prototype for the "creation record" (創作履歷) system — still pre-product, self-funded only by her own time, actively targeting at least 3 more 2026 Taiwan government grant programs (Ministry of Digital Affairs ~Sept, Economic Affairs SME cross-agency ~Oct) in addition to the still-pending Taipei Dept. of Cultural Affairs proposal. Hard grant mechanics disclosed: subsidy capped at ≤ registered capital (Anchor's NT$6M caps any project near NT$12M total, 50/50 self-funded split), foreign-registered entities categorically ineligible (cited a client, "Hearst," rejected on exactly this). JD live-demoed SI8's actual free-tier CRC-style lead-gen concept; Alice reacted very positively (called the incomplete-answer/email-gate mechanic "clever marketing"). Surfaced substantial new operational detail: named enterprise clients' prompt self-check requirements (Chunghwa Telecom, Uni-President Group — enterprise-tier tool licenses, no named-artist/celebrity references), a real anecdote (a Yahoo client asking how to guarantee generated faces don't resemble a wanted criminal), confirmation no dedicated AI-film insurance product exists in Taiwan, a named competitor ("Liquid Engine," spelling unverified via Whisper), and a second Anchor business line (AI footage-recognition/tagging + conversational editing, built by a named HKUST-trained technical partner, already used operationally on real footage). Concrete near-term item: Alice invited JD to a Sept 3-4 "Living Lab" (內湖) event — Sept 3 an AI film director presents an AI feature-film sizzle reel (prior traditional film "拔河"/Tug of War; now applying for Ministry of Culture funding + a Golden Horse Award submission) with a possible face-to-face intro to SI8; Sept 4, 2:00-2:45pm, is Alice's own session. Two partnership offers from Alice: (1) include SI8 in her Sept-cycle grant budget if awarded; (2) introduce JD to the director and to two Taiwanese-American AI-filmmaking investor contacts (Patrick Lee, Kevin). No commitment made by either side — exploratory/relationship-building call.

Full call notes (FACTS/HYPOTHESES/OPEN QUESTIONS format): `03_Sales/call-notes/CALL-2026-08-21-B164-Alice-Feng-Anchor-Film.md`. Transcripts (ZH + EN, readable + raw): `03_Sales/transcripts/anchor-film-alice-feng-082126-transcript*.md`. External strategic analysis (ChatGPT review of this call, with Claude's corrections layered in — see that file for a correction to an initial misattribution around SI8's own "CRC" product name, which is unrelated to anything Alice called her own platform): `03_Sales/call-notes/CALL-2026-08-21-B164-Anchor-Film-ChatGPT-Analysis.md`. Headline framing from that analysis, worth carrying forward: Alice is strong evidence of a real, operational Commercial Assurance problem and a credible design-partner/referral channel, but not yet evidence of ordinary SaaS willingness-to-pay — her funding path remains grant-contingent, not an operating-budget purchase. Recommended next step (not yet actioned): a bounded pilot on one real Anchor project, not a broader discovery conversation and not building a full capture platform first.

### 2026-08-13 — Alice's public open-mic remarks (same panel, separately transcribed)

A complete-session professional recording of the AI Wave 微醺夜 panel surfaced and was transcribed in full. Alice independently cited a real Taiwan copyright case (蔡阿嘎's wife) turning on complete-creative-record evidence, disclosed that named enterprise clients (Chunghwa Telecom, Taiwan Mobile) already issue her team a prompt self-check list, detailed 3 design requirements for her creation-dossier system, and raised a Taiwan-specific "mainland-capital tool" screening requirement for public-sector clients not previously captured anywhere in SI8's research. Actioned same day: extended POS-001's evidence trail with the new corroboration, logged the public-sector tool-sourcing angle as PQ-007 (open) in the Living Notebook.

### 2026-08-01/02 — incorporated into SI8's Living Notebook

Conversation cited as source evidence for POS-001 (Domain H corroboration rule — independently confirmed by Alice's own admission that she's had to reconstruct prompts/logs after the fact on past projects) and POS-005 (evidence-capture vs. independent-assessment as complementary, not competitive, framing). The grant-funded-engagement possibility she raised is logged as open question PQ-006 (conflict-of-interest disclosure scope), to be resolved before any paid engagement is structured that way.

### 2026-07-30 — in-person, AI Wave 微醺夜 panel, unrecorded post-panel conversation (notes logged after the fact)

Co-founder of Anchor Film — an established Taiwan AI video production company with real clients (Sinyi Realty, CTBC Investments) and multiple 2025 government AI R&D grants. Alice described a real pain point matching SI8's thesis directly: Taiwan enterprise clients hesitant to approve AI ads over commercial-safety uncertainty. She self-disclosed a genuine evidence gap — Anchor has had to "recreate" prompts/logs after the fact on past projects, and she recognizes reconstructed prompts aren't reliable provenance (unprompted alignment with SI8's own Domain H corroboration rule). Her "AI Creation Dossier Platform" concept (deck pp.24-25, names Numbers Protocol as an intended provenance partner) traces to seeing "Liquid Engine" at NAB — a specific, checkable origin story; her claim that it's still grant-proposal-stage, not yet built, is not independently confirmed either way by the deck text itself. Her own framing: complementary, not competitive — Anchor captures first-party production evidence, SI8 provides independent third-party assessment on top. She offered Taiwan referrals, speaking invitations to Taiwan panels/associations, and potential inclusion of paid SI8 assessments in her grant budget as an external consultant/provider. Full notes: `03_Sales/call-notes/CALL-2026-07-30-B164-Alice-Feng-Anchor-Film.md`.
