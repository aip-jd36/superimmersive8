# SI8 ICP Definitions

**Last updated:** 2026-06-28 (v4.1 messaging layer added; ICP 3 upgraded to 4 confirming leads; finserv campaign structural problem documented; regulatory framing section added)
**Source:** Pipeline analysis + verbatim reply review across 626 Supabase conversations
**Status:** Two confirmed ICPs with supporting pipeline data. ICP 3 confirmed — campaign launch recommended. Updated each report cycle as new data comes in.

---

## ICP 1a: Agency Creative / Production at Finserv-Exposed Clients

**The mechanism:** Financial services brands have existing legal compliance infrastructure. When they commission AI video, their legal team adds a documentation requirement to the agency brief or contract — the same way they'd add brand safety requirements. The agency's Creative Director or Production Specialist becomes the person who has to produce that documentation for every AI campaign they deliver.

```
Title:        Creative Director, Senior Production Specialist,
              Creative Producer, Gen AI Specialist
Company:      Mid-size agency or large network arm (Brandtech, IPG, S4 Capital)
              whose client roster includes financial services brands —
              banks, fintechs, insurers, trading platforms.
              Company industry in Sales Navigator = Advertising Services /
              Marketing & Advertising — NOT Financial Services.
Geo:          UK/England (strongest signal), Dubai/UAE (finserv-heavy market),
              Singapore (MAS-regulated environment)
Trigger:      Client legal team adds AI documentation to campaign approval
              or contract — requirement flows from brand legal to agency
Pain:         Informal handling (email, verbal, tool list) is not satisfying
              the formal requirement; each campaign requires something new
Buyer:        The CD or production person, not the CMO or legal team
Price point:  $499/video likely self-authorizable at agency level
```

**Confirming leads (verified 2026-06-22 / updated 2026-06-28):**

| Lead | B-ID | Signal |
|------|------|--------|
| Matthew Sergison-Main | B088 | "Yes I am being asked this 100%" — Senior Production Specialist, OLIVER/Brandtech, embedded at enterprise brands. Formal procurement documentation requirement, not disclosure. |
| Ibrahim Badi | B087 | "Yes especially in regulated sectors. I document: AI models used, commercial licensing, editing workflow, IP ownership." — MD, IKM Marketing. Confirmed finserv/pharma/holdco client base. B2B2B pattern described. |
| Jian Yi Lay | B152 | "Before starting work, AI usage and which platform must be cleared by both agency and clients legal team first." — Group CD, VaynerMedia APAC. Formal pre-project legal gate confirmed. |
| Nikolay Kolev | B155 | Unprompted checklist: "which AI tools were used / commercial usage/licensing confirmation / disclosure of synthetic voices/faces / copyright and consent assurances / basic AI provenance/workflow documentation." — VR Designer, XR Future LTD, enterprise/regulated brand clients confirmed. |
| Daniele Zennaro | B145 | "Request via commercial/rights side — legal/compliance probably behind it." CEO, AiYR4, England. Described B2B2B chain independently: legal → commercial/rights → agency. T1. |
| James Hilditch | B139 | "Yes, sometimes. Important part of the process." BearJam, London. Unprompted framing of documentation as operational, not exceptional. T1. |
| Ramez Tabshi | B100 | Jun 26 email: "once their legal teams get involved, conversation immediately shifts to IP ownership and copyright risks… That IP and commercial licensing document is exactly what they are looking for." Enterprise clients: finserv, healthcare, public sector. Independent CD delivering to regulated brands. Product fit confirmed verbatim. |

**Leads removed from ICP 1a (2026-06-22 audit):**
- Ramez Tabshi (B100): luxury CGI art director, mostly spec/concept work (Lamborghini, Dior, Takis). No confirmed finserv client exposure. Reclassified: T2, wrong profile.
- Gabriel Preston (B121): Director's Rep at Imagine This Creative Studio — talent representation side, not agency production. Wrong profile entirely.
- Ahmed Samy Amin (B103): In-house at GTCFX (financial trading platform), not agency-side. Reclassified: ICP 1b.
- Marc De Guzman (B027): UnaFinancial — in-house buyer-side, not agency. Reclassified: ICP 1b.

**Phil Langer (B126) note:** Gen AI Specialist, Jung von Matt SPREE. Reply: *"no not yet but yes it is something that will become the norm this year I think. We might have to also document each prompt for each generated asset."* This is T2 (forward-looking awareness, not current pain). Not ICP 1a at this time.

**What the genuine T1 buyer looks like:**
A client's legal team has already reviewed their informal documentation (email, Google doc, tool list, verbal conversation) and come back with more specific questions — or the formal contract now specifies a documentation requirement that an informal email cannot satisfy. They don't say "yes, of course" and go quiet. They describe the gap.

**What this ICP is NOT:**
Creative Directors who say "I tell clients which tools I used." That is disclosure — a sentence in an email, not Chain of Title. The qualifying gate is Part 2: *"What did you send them — and did that satisfy the legal team, or did they come back asking for more?"*

---

**v4.1 pitch for ICP 1a (use at Msg 2 / later-stage conversations):**

> "You get three things back: the Chain of Title PDF for your legal team, your final video re-signed with our clearance data embedded inside the file, and a timestamped audit record proving you cleared it before deployment. When your client's legal team drops the file into Adobe's Content Authenticity viewer, they can verify the clearance themselves — without asking you to send a separate document. One submission. Your platform upload, your legal team, and your compliance audit — all covered."

**Why this lands for ICP 1a:** The CD's pain is the back-and-forth — informal documentation goes to brand legal, brand legal comes back with more questions. The C2PA-signed file reduces that loop because the clearance data travels with the video. Legal can check it without chasing the agency for attachments.

**Competitive framing (v4.1):** *"Adobe Premiere signs the file at export. We clear it. Premiere's credential says 'exported by [your account].' Ours says what AI tools were used, whether they were commercially licensed, and whether the output is cleared for use. Same technical layer, completely different data inside it."*

**Pre-production timing note (confirmed D1, Jun 2026):** Four independent leads across four geos described documentation as a pre-production gate — tool approval before the work starts, not a document assembled after delivery. Update later-stage pitch to reflect this: *"Some clients are using SI8 before production starts — getting tool approval, logging prompts, clearing the rights plan — so the Chain of Title is complete at delivery, not assembled afterward."*

---

**How to find more of this ICP:**

- **Sales Navigator company industry filter: Advertising Services / Marketing & Advertising** — this is the critical filter. Financial Services industry catches in-house finserv CDs (ICP 1b), not agency CDs serving finserv clients. These are different segments with different buying dynamics.
- **Target known finserv agency networks directly:** Filter by company, not just title. Agencies with known finserv client rosters: MullenLowe, McCann, FCB, Havas, TBWA, Wunderman Thompson, VCCP, OLIVER/Brandtech. Search for CD / Production Specialist / Gen AI Specialist at those specific networks in UK, Dubai, Singapore.
- **Geographic proxy:** Dubai and Singapore have disproportionate finserv client exposure per agency CD — the geo does the client-roster filtering automatically.
- **Apollo keyword search:** Search "financial services" + "AI video" in bio or job description to surface people who explicitly mention both.
- **Referrals from current warm leads:** One intro from Matthew Sergison-Main or Ibrahim Badi is worth 50 cold outreach attempts.

---

## ICP 1b: In-House Finserv Creative

**The mechanism:** Creative Directors and production leads employed directly inside financial services companies (banks, insurers, asset managers, fintechs) produce AI video for their own brand. Their compliance or legal team is internal — not an external client — but the documentation requirement is real. They are their own client, and their legal team is two floors up.

```
Title:        Creative Director, Head of Creative, Art Director,
              VP Creative, Head of Content, Design Lead
Company:      Financial services institutions: banks, insurance,
              asset management, fintech, trading platforms.
              Company industry in Sales Navigator = Financial Services /
              Banking / Insurance / Capital Markets.
Geo:          New York (primary for JD campaign), London (UK finserv
              concentration), Singapore, Dubai
Trigger:      Internal compliance or legal team requires AI documentation
              before content goes out — "your compliance team asking"
              not "your client's legal team asking"
Pain:         No standard internal process for AI content documentation;
              each campaign is handled ad hoc
Buyer:        In-house CD — but procurement is internal (slower),
              may require PO or vendor approval process
Price point:  $499 may not be self-authorizable; internal vendor approval
              adds cycle time vs. agency CD who passes cost through to client
```

**Distinguishing from ICP 1a:**

| | ICP 1a (Agency finserv) | ICP 1b (In-house finserv) |
|--|------------------------|--------------------------|
| Who their legal team is | External client's legal team | Their own company's compliance/legal |
| Framing that lands | "When your client's legal team asks for documentation" | "When your compliance team reviews AI video before it goes out" |
| Purchase speed | Faster — passes cost through to client | Slower — internal procurement, PO process |
| Price sensitivity | Lower | Higher — cost center, no client to pass through |
| Sales Navigator filter | Advertising Services / Marketing & Advertising | Financial Services / Banking / Insurance |

**Early signals:**

| Lead | Signal |
|------|--------|
| Ahmed Samy Amin (B103) | "I've been navigating this a lot lately in video production for financial and brand clients." In-house at GTCFX (financial trading platform). |
| Ashraf Selo (B104) | "Becoming standard with bigger campaigns." In-house at MultiBank Group (Dubai). Follow-up probe pending. |
| Ivan Petruzzelli (B130) | State Street Investment Management — described two-layer provenance standard for agencies they commission. ICP 3 / B2B2B cascade candidate. |

**Current campaigns targeting ICP 1b:**
- `SI8_RV_R4LI_CreaDir_Finserv_England_0626A_IL` (Ivy, UK, launched Jun 21) — 143 leads, 10 accepted (7%), 1 reply (0.7%) as of Jun 27. **Below baseline** (regular Legal Friction UK: 24–26% acceptance). Do not expand.
- `SI8_RV_R4LI_CreaDir_Finserv_NY_0626A_JC` (JD, New York, launched Jun 21) — 298 leads, 8 accepted (2.7%), 3 replies (1.0%) as of Jun 27. Worst acceptance rate across all campaigns.

**⚠️ Structural problem with both campaigns (confirmed Jun 27):**
The "Financial Services" industry filter on LinkedIn pulls two wrong populations:
1. **Financial advisors and analysts** with "AD" or "Associate" in their title — not Art Directors or Creative Directors
2. **Fake/bot accounts** and clearly off-target profiles

5 of 5 replies received were wrong ICP. The filter structurally cannot surface ICP 1a. Recommendation: **do not launch another finserv campaign using Financial Services industry filter.** Let both campaigns exhaust without further investment.

ICP 1a (agency CDs with finserv client exposure) cannot be filtered by company industry on LinkedIn. Their company is Advertising Services. The finserv client signal lives in their profile bio — not accessible via Sales Navigator filter. Use Apollo keyword search or manual bio screening instead.

**⚠️ Sequence framing note:** The Legal Friction — FinServ sequence uses agency-side language ("when you deliver AI video to a client for campaign approval, are their legal teams asking for documentation?"). ICP 1b leads don't deliver to external clients — they are the client. If a dedicated ICP 1b sequence is built, Msg 1 hook: *"When your compliance or legal team reviews AI-generated video before it goes out, are they asking for documentation on how it was made?"*

**Adjacent sector opportunity (flagged 2026-06-22):**
Beyond finserv, three regulated sectors with similar documentation dynamics are worth a dedicated TAM analysis:
- **Pharma/healthcare:** MLR review (medical-legal-regulatory) for promotional material is already a legal requirement in UK/US. AI video adds a new undocumented layer that existing MLR workflows don't cover.
- **Government/public sector:** Procurement transparency rules and public accountability for AI-generated communications content. Myron Stapleton (R&M Geoscience, UK) — strongest emotional endorsement in pipeline — operates in this space.
- **Legal sector:** Law firm brand marketing is growing; law firms' own clients won't tolerate unverified AI content. Paul Garcia (Cleary Gottlieb, NY) is the only legal-sector creative lead visible in the JD NY list.

TAM analysis on these sectors: pending.

---

## ICP 2: Business Affairs / Broadcast Affairs / Line Producer (Clearance Gate + E&O Insurance)

**The mechanism:** Two distinct but related pain points under one ICP:

**Pain A — Clearance gate:** BA/Broadcast Affairs titles at agencies and production companies making long-form or broadcast-destined AI content — brand films, documentaries, streaming-adjacent content — require formal clearance before broadcast placement or platform delivery. BA/Broadcast Affairs people own this process operationally and already handle it for music, talent, and locations. AI-generated content is a new category they don't yet have a standard process for.

**Pain B — E&O insurance:** Line Producers and Executive Producers need E&O (Errors & Omissions) insurance for AI content, but insurers are adding AI exclusions or requiring documentation before issuing full coverage. Chain of Title documentation is what closes the gap between "AI content" and "insurable AI content."

Both pain points lead to the same purchase: a structured IP provenance document that satisfies a formal gate. The clearance gate is binary (content cannot be distributed without it); the E&O gate is financial (can't close production without coverage). Both are stronger purchase triggers than ICP 1.

```
Title:        Business Affairs Manager, Broadcast Affairs,
              Clearance Coordinator, Head of Legal & Business Affairs,
              Line Producer, Executive Producer
Company:      Agencies producing long-form or broadcast-destined content,
              independent production companies with broadcast/streaming clients,
              studio arms with branded content divisions
Geo:          LA (primary), UK (BBC/Channel 4/ITV commissioned content),
              APAC (streaming platform originals — Netflix, Amazon)
Trigger:      (A) Broadcaster, streaming platform, or brand requires clearance
              documentation before accepting AI content — same gate as
              music/talent clearance. (B) E&O insurer requires AI documentation
              or adds AI exclusion to standard media liability policy.
Pain:         (A) No standard process or format for AI content clearance.
              Already owns music/talent/location clearance — AI is a new
              category with no established workflow.
              (B) Can't get full E&O coverage without Chain of Title; insurer
              either excludes AI content or asks for provenance documentation.
Buyer:        BA/Broadcast Affairs person or LP who manages clearance stack
              or production insurance; $499 absorbed as a line item
Price point:  $499 trivial vs. clearance costs (music sync: $500–$5K/track)
              and E&O premiums ($3K–$15K/year)
```

**Confirming leads:**

| Lead | B-ID | Signal |
|------|------|--------|
| Steve Bannerman | B157 | "In the feature film space, provenance of the video is HUGELY important. You will indeed see it coming up more and more." Head of Post-production, International Originals APAC, Amazon MGM Studios — confirms mechanism, validates direction |
| Justin Lufair Brown | B094 | "Contract language has tightened significantly — clients responsible for inputs, we responsible for outputs being clear of third-party rights claims" — Creative Producer AI Video Production, Amazon LA |
| Joe Maziarski | B150 | "They should be — it's a grey area. Firefly built on cleared assets, others trained on copyrighted material" — Senior Creative AI Producer, Amazon LA |
| Spencer Stander | B149 | "Questions are usually about clearance: tools used, whether any real person's likeness involved" — Producer, LA |
| Bernie Su | B156 | Network contact — AI cinema creator, potential BA/clearance connector in LA (Test 12 pipeline) |

**Scope note — LP/EP:**
LP/EP for AI feature film alone is too narrow — AI features in active production with genuine distribution potential are rare, and that pool is hard to find on LinkedIn. The addressable LP/EP segment is broader: any LP or EP producing AI content for a platform, brand, or broadcaster where E&O insurance is required. The BA/Broadcast Affairs title cluster is the operational complement — larger, findable, and already owns the clearance workflow. Both belong in ICP 2.

**Key difference from ICP 1:**
ICP 1's pain is contractual — a client can reject a campaign. ICP 2's pain is operational and binary — content cannot be broadcast, placed, or distributed without clearance. BA/Broadcast Affairs people already have a clearance budget and workflow. SI8 is a new line item in a process they already run, not a new concept to explain.

The sales motion: pitch SI8 as the AI clearance layer alongside music, talent, and location clearance — not as a compliance product. "You already clear music and talent. AI-generated content is the gap in your clearance stack."

**v4.1 pitch for ICP 2:**

The **timestamped audit record** (ERC-7053 on-chain or RFC 3161) is specifically what E&O underwriters and insurers need: immutable proof that the file was reviewed and cleared *before* it was deployed. This is a stronger insurance artifact than a PDF alone — it proves the clearance happened at a specific moment, not assembled retroactively.

> "You get the Chain of Title PDF for the E&O underwriter, plus the cleared video file with our review data embedded, plus a timestamped audit record proving clearance happened before the content went out. That's the full documentation stack an insurer or broadcaster needs."

The C2PA-signed file is also directly relevant for broadcast/streaming platform acceptance — platforms increasingly read C2PA manifests and may require them for AI content submissions. This is emerging (not yet standard) but positions SI8 ahead of where broadcast clearance requirements are going.

**Active test:** Test 9 (LA BA/Clearance titles, "Clearance Pro" sequence) — launched June 14, 122 leads, monitoring for first substantive replies.

---

## The Distinction Between ICPs

| | ICP 1a (Agency / Finserv) | ICP 1b (In-House Finserv) | ICP 2 (BA / Broadcast Clearance) |
|---|---|---|---|
| **Pain urgency** | Campaign can be delayed or rejected | Internal compliance gate — timing varies | Content cannot be broadcast or placed without clearance |
| **Financial stakes** | Campaign fee at risk | Internal risk / brand liability | Clearance budget already exists — SI8 is a new line item |
| **Chain of Title familiarity** | Low — mostly handles disclosure informally | Low to medium | High — already owns music/talent/location clearance workflow |
| **Decision speed** | Moderate — self-authorize at $499 | Slow — internal procurement, PO process | Fast — $499 trivial vs. existing clearance spend |
| **Geo** | UK, Dubai, Singapore | New York, London, Singapore | LA, UK, APAC |
| **Sales Navigator filter** | Advertising Services / Marketing & Advertising | Financial Services / Banking / Insurance | Production / Entertainment / Advertising |
| **Sequence framing** | "When your client's legal team asks" | "When your compliance team asks" | "AI is the gap in your clearance stack" |
| **Current pipeline depth** | 4 confirmed leads (Jun 2026) | Early — campaigns launched Jun 2026 | Early — Test 9 just launched |
| **Sales motion** | Educate on disclosure vs. Chain of Title gap | Internal risk framing — "before your legal team mandates it" | "AI is the gap in your clearance stack" — alongside music and talent |

---

## ICP 3 (Emerging / In Testing): B2B2B — Brand Legal / Agency GC (Demand Creator)

**The mechanism:** Brand IP/Legal Counsel, Agency General Counsel, and Holdco AI Governance leads are the people who *create* the requirement that flows down to ICP 1. They sit one level above the agency CD or production person and write the contract language or internal policy that makes Chain of Title documentation mandatory. If one brand legal team pre-approves SI8's format and requires it from their agencies, it cascades to every agency on their roster — without SI8 having to sell each one individually.

```
Title:        Brand IP/Legal Counsel, Agency General Counsel,
              Holdco AI Governance, EVP Business & Legal Affairs,
              Head of Legal & Business Affairs
Company:      Major brands (financial services, pharma, luxury),
              holdco legal/compliance teams, streaming platforms
Geo:          UK, USA, Singapore (where regulated-sector brands concentrate)
Trigger:      Internal AI governance policy or legal team review of AI
              content risk — they're building requirements, not responding to them
Pain:         No standardized format exists for what they should require
              from agencies. SI8's Chain of Title fills that gap.
Buyer:        Legal/compliance team, not creative — different budget and
              decision process from ICP 1 and 2
Sales motion: Research frame, not pitch. "We're getting evaluated by brand
              legal teams — does our format match what you'd require?"
              Goal: get them to pre-approve SI8 format → they push requirement
              to agencies → agencies become ICP 1 buyers.
```

**Confirming leads (updated 2026-06-28):**

| Lead | B-ID | Signal |
|------|------|--------|
| William Finkel | B160 | EVP Business & Legal Affairs, Hello Sunshine — described B2B2B chain verbatim: "compliance requirement will be passed down the line to agency and then production co… legal should be the last level of confirmation and responsibility." Most operationally precise description of how the requirement travels. |
| Ivan Petruzzelli | B130 | Head of Creative, State Street Investment Mgmt — asked for "structured campaign brief with human summary + machine-readable payload (spreadsheet or JSON) for auditability across AI workflows." ICP 3 defining the format requirement. SI8's C2PA custom assertions ARE a machine-readable payload. |
| Dan Lantry | B158 | VP Legal Affairs Americas, Sonova Group (hearing healthcare, regulated medtech) — replied to NY Law outreach: "we aren't tracking it but would like to better understand the issue." Brand legal officer at regulated healthcare brand. NY Synthetic Performer Law triggered interest. |
| James T | B161 | Head of Legal Affairs, Connect Management (London) — talent-side legal: "certain AI tools are prohibited altogether… required to verify that tools used do not train on, learn from, or retain creator or client content." Different pain (training data consent vs. Chain of Title) but confirms legal-side interest. T2. |

**Status:** 4 confirming signals — upgrade from hypothesis. ICP 3 LinkedIn campaign designed and ready: `03_Sales/outreach/LINKEDIN-CAMPAIGNS-LEGAL-TEAMS-V1.md`. **Recommended: launch in next cycle** (100–150 profiles, London/UK, "Who's Asking" research frame, Angel or Ivy alias).

**v4.1 pitch for ICP 3 — the biggest messaging shift:**

v4.0 to brand legal: *"Here's a PDF document that says the video was reviewed."*

v4.1 to brand legal:
> "When your agency delivers an AI video, they hand you a file where you can verify the clearance yourself — drop it into Adobe's Content Authenticity viewer and it shows exactly what AI tools were used, what was commercially licensed, and who cleared it. You don't have to ask the agency to send anything. The record is in the file."

This directly answers Ivan Petruzzelli's "machine-readable payload for auditability" requirement. A C2PA-signed file with SI8's clearance assertions embedded IS a machine-readable audit record. Legal teams can verify it without trusting the agency's word or chasing attachments.

**The cascade math:** One ICP 3 legal team pre-approves SI8 format → specifies it in agency contracts → every agency on their roster becomes an ICP 1 buyer without additional SI8 outreach. One ICP 3 conversion → estimated 5–10 ICP 1a certifications/year at minimum. This is the multiplier that makes ICP 3 the highest-leverage target despite the smallest immediate pool.

**Sales motion:** Research frame throughout. *"We're getting evaluated by brand legal teams — does our format match what you'd require from agencies you commission?"* Goal is not to sell them $499. Goal is to get them to specify SI8 in their agency contracts.

**Why it's strategically distinct:** ICPs 1 and 2 are direct buyers — SI8 sells $499 to them individually. ICP 3 is a demand amplifier — one conversion multiplies into many ICP 1 buyers without additional outreach. The sales motion and message frame are completely different.

---

## What Is Not an ICP (Common False Positives)

- **Disclosure buyers:** Say "yes" to the gate question but mean "I tell clients which tools I used." Self-exclude when shown the Chain of Title sample.
- **EU Act labeling leads:** Reply mentioning EU AI Act but describe a *labeling/disclosure* need — "we need to tag content as AI-generated" or "we need to comply with August 2 disclosure requirements." This is Art. 50(4) / platform toggle territory — SI8 v4.1's C2PA layer helps, but these leads are primarily interested in disclosure, not IP clearance. They will not pay $499 unless they also have a clearance problem. Confirmed false positive pattern: France/Paris campaign (Jun 2026) — 6 signals, 0 Chain of Title descriptions, all labeling/disclosure language.
- **T3 builders:** Already building their own internal documentation process. Hear SI8's pitch and conclude they don't need it. Require a differentiation frame: "does what you're building produce a format a client's legal team will formally accept — and does it embed that clearance data into the video file itself?"
- **Boutique founders (general):** High reply rate, high T3 and T2 noise, low T1 rate (29% per pipeline analysis). Not the beachhead — need finserv client exposure specifically to qualify.
- **Off-geo production (India, LatAm, SEA without regulated clients):** Aware of the topic, not facing formal documentation requirements yet.
- **Financial advisors and analysts:** LinkedIn titles containing "AD" (Analyst/Advisor) or "Associate" in financial services companies — not Art Directors or Creative Directors. Systematically identified in JD NY FinServ campaign (Jun 2026): ~38 of 299 leads were financial professionals, not creatives.

---

## Regulatory Framing — What SI8 Does and Doesn't Do

**Use this section for call prep and to prevent messaging drift in campaigns.**

### EU AI Act Art. 50

| Sub-article | Who it applies to | What it requires | SI8 v4.1 position |
|-------------|------------------|-----------------|-------------------|
| Art. 50(2) — machine-readable marking | **Providers** (Runway, Kling, Veo) | C2PA or equivalent embedded at generation | SI8 restores what gets stripped in post-production assembly — fills a practical gap but the statutory obligation is on the provider, not the agency |
| Art. 50(4) — visible disclosure | **Deployers** (agencies, brands) | Human-recognisable labelling of AI content | SI8's C2PA-signed file enables platform auto-labelling (YouTube, Meta, TikTok read C2PA → auto-label) — this is a genuine compliance support |

**What SI8 does NOT do:** Guarantee Art. 50 compliance. The correct pitch: *"SI8 de-risks compliance — the documentation and C2PA-signed file give you the evidentiary record to show you took the right steps."*

**Do not pitch as:** "Use SI8 to comply with the EU AI Act." Any legal team that has read the Act will reject this. Art. 50(4) platform obligations are substantially addressed by platform toggles (Meta/YouTube Ads Manager). SI8 is the IP clearance layer on top — not the disclosure mechanism.

### NY Synthetic Performer Law (S.8420-A, effective Jun 9, 2026)

What the law requires: conspicuous disclosure when AI is used to create a synthetic replica of an identifiable person's likeness or voice in an advertisement.

SI8's position:
- SI8's clearance review specifically checks for synthetic performers and documents whether consent/rights exist — directly relevant to the law's requirements
- The C2PA assertions flag the disclosure requirement in the file
- **The agency still has to add conspicuous disclosure to the ad** — SI8 identifies what needs to be disclosed and creates the evidentiary record, but does not itself constitute the required disclosure

**Do not pitch as:** "SI8 satisfies NY Performer Law." The law requires advertiser action (adding disclosure to the ad). SI8 provides the documentation that supports compliance — not the compliance act itself.

### The correct regulatory hook for outbound

The laws create awareness that AI content carries legal risk. They do not directly mandate the specific clearance documentation SI8 produces. What mandates it in practice is **brand legal teams** demanding commercial proof before approving AI campaigns.

> *"Your client's legal team is asking for proof the content is commercially safe — not just that it's labeled as AI. The regulations are why they started asking. SI8 is the answer to what they're asking for."*

This hook is accurate for all regulatory environments (EU Act, NY Law, ASA/CAP Code) and does not overclaim statutory compliance.
