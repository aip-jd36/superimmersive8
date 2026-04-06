# SI8 Sales CRM

**Purpose:** Single source of truth for all active leads — agency/brand buyers (LinkedIn) and creators (Instagram). Used for pattern analysis, ICP refinement, and messaging decisions. Pipeline operations will move to Airtable once ICP and messaging are validated.

**Last updated:** April 6, 2026

---

## PIPELINE — Machine Readable
*Maintained by Claude. Updated whenever JD reports an action. Read by daily digest script.*
*Urgency: HIGH=flag after 3 days, MEDIUM=5 days, LOW=14 days, MONITOR=never auto-flag*
*follow_up_by: explicit date overrides auto-calc. Use YYYY-MM-DD or — for auto.*

<!-- pipeline:start -->
| id | name | company | type | stage | last_action_date | last_action | next_action | follow_up_by | urgency |
|----|------|---------|------|-------|-----------------|-------------|-------------|-------------|---------|
| B001 | Leimi Zhou | WOMBO | buyer | Replied-Conditional | 2026-04-04 | Educational reply + offered sample | Send Urban Drift sample link | 2026-04-06 | HIGH |
| B002 | Theodor Sandu | McCann/Unilever @ Omnicom | buyer | Replied-Conditional | 2026-04-04 | Sample requested; he said sure anytime | Send Urban Drift sample link | 2026-04-06 | HIGH |
| B003 | Hossein Jafari | Wowspot Ltd | buyer | Followed Up | 2026-04-01 | Urban Drift PDF + Runway/Kling gap + asked for call | Await reply; book call | — | HIGH |
| B004 | Troy Macdonald | HyFi Corp | buyer | Followed Up | 2026-04-04 | Sample + Calendly sent; got thumbs up | Follow up to book call | 2026-04-06 | HIGH |
| B005 | Isaac Twidale | We Do Ads | buyer | Call Completed | 2026-03-15 | Discovery call done | Send 3-5 photorealistic portfolio examples | — | HIGH |
| B006 | Rawand Latif | ARUBA CREATIVE | buyer | Replied-Warm | 2026-04-03 | No action taken yet | Send v4 CaaS explanation + sample | 2026-04-06 | HIGH |
| B007 | Elaine Tan + Joseph Lee | The Media Shop | buyer | Call Completed | 2026-03-18 | Discovery call done | Send thank-you + 1-pager; request Germany intro from Joseph | — | HIGH |
| B008 | Barney O'Kelly | AlixPartners | buyer | Followed Up | 2026-04-01 | Urban Drift PDF sent | Await reply; book call | — | MEDIUM |
| B009 | Syed Tabish Hasan | Zedtronix | buyer | Followed Up | 2026-04-01 | v4 framing + Urban Drift + Calendly | Await reply; book call | — | MEDIUM |
| B010 | Bee Lin Ang | Stewardship Asia Centre | buyer | Followed Up | 2026-04-01 | Second follow-up + Urban Drift + Calendly | Await reply; book call | — | MEDIUM |
| B011 | Hugo Barbera | HumAIn | buyer | Followed Up | 2026-04-03 | Content-level doc vs contractual compliance reply | Await reply; see if IAB gap lands | — | MEDIUM |
| B012 | Ivan Ng | Bacon Creatives | buyer | Followed Up | 2026-04-03 | Pivot: SI8 as doc layer; asked about client stage | Await reply; Singapore use case | — | MEDIUM |
| B013 | Qaiser Mehmood | ECONROAD International | buyer | Followed Up | 2026-04-01 | Urban Drift PDF + Calendly | Await reply; book call | — | MEDIUM |
| B014 | Shahrman Nayan | onedash22 | buyer | Replied | 2026-04-03 | No action taken | Continue sequence msg 3 | — | MEDIUM |
| B015 | William Tan | Tareo Digital Advisory | buyer | Lukewarm | 2026-04-01 | No action taken | Follow-up: have you had a chance to evaluate? | — | MEDIUM |
| B016 | Mainul Islam | eSaviour Limited | buyer | Replied-Conditional | 2026-03-15 | No action | Re-engage once 2-3 sample works ready | — | LOW |
| B017 | James Byrne | BeyondWords | buyer | Replied-Conditional | 2026-03-15 | No action | Re-engage once samples ready | — | LOW |
| B018 | Carlos Cortiñas | Transmission | buyer | Replied | 2026-04-06 | Thumbs up only on msg 1 | Continue sequence or drop | — | LOW |
| B019 | Cory Warfield | Starchild Music | buyer | Nurture | 2026-04-04 | Graceful exit sent | Soft referral mention if opportunity arises | — | MONITOR |
| B020 | Salem Al-Kuwari | SAM Strategic Access | buyer | Nurture | 2026-04-04 | Polite acknowledgment; not scheduling now | Check in Q3 | 2026-07-01 | MONITOR |
| B021 | Vignesh Ilangovan | Triken Studios | buyer | Soft No | 2026-04-05 | No action | Mark for Q3 follow-up | 2026-09-01 | MONITOR |
| B022 | Mark Johnson | SwiftScale AI | buyer | Lukewarm | 2026-04-01 | No action | Monitor — possibly wrong side of market | — | MONITOR |
| B023 | Amr Hamad | Stackline | buyer | Lukewarm | 2026-04-01 | No action | Follow up after ASA/IAB research complete | — | MONITOR |
| C001 | keeper505 | — | creator | Interested | 2026-03-29 | v4 reply sent | Create COMP-KEEPER in Stripe; send v4 follow-up | 2026-04-06 | HIGH |
| C002 | @syntaxdiffusion | — | creator | Interested | 2026-03-29 | v4 reply sent | Send v4 follow-up | — | MEDIUM |
| C003 | @rodszera.ai | — | creator | Interested | 2026-03-29 | v4 reply sent | Send v4 follow-up explaining 2 films is enough | — | MEDIUM |
| C004 | @absolutely.ai | — | creator | Interested | 2026-03-29 | v4 reply sent | Send v4 follow-up | — | MEDIUM |
| C005 | shingo4987 | — | creator | Nurture | 2026-03-29 | v4 reply sent | Follow his work; reconnect on next release | — | MONITOR |
<!-- pipeline:end -->

---

## Pipeline Stages

### Agency / Brand Buyers
| Stage | Definition |
|-------|-----------|
| **Contacted** | Message sent, no reply yet |
| **Replied — Warm** | Expressed interest or acknowledged pain |
| **Replied — Conditional** | Interested but needs something first (samples, timing) |
| **Replied — Lukewarm** | Replied but minimal engagement or unclear fit |
| **Call Booked** | Meeting scheduled |
| **Call Completed** | Discovery call done, notes filed |
| **Proposal Sent** | Formal proposal or follow-up sent |
| **Negotiation** | Active back-and-forth on terms |
| **Won** | Deal closed |
| **Nurture** | Not now, but warm — worth revisiting |
| **Polite Pass** | Not interested, clean exit |
| **Not a Fit** | Wrong role, wrong use case, wrong geography |

### Creators (IG)
| Stage | Definition |
|-------|-----------|
| **Contacted** | DM sent, no reply |
| **Replied** | Any response received |
| **Interested** | Actively engaged, asking questions |
| **Comp Sent** | Free Creator Record code sent |
| **Submitted** | Paid or comp submission received |
| **Verified** | Chain of Title issued |
| **Nurture** | Not ready now, warm relationship |
| **Not a Fit** | Wrong profile, disengaged |

---

## SECTION 1 — Agency / Brand Buyers (LinkedIn)

### Pipeline Snapshot
| Stage | Count |
|-------|-------|
| Call Completed | 2 |
| Call Booked | 0 |
| Replied — Hot (follow-up urgent) | 1 |
| Replied — Warm | 5 |
| Replied — Conditional | 4 |
| Replied — Lukewarm | 7 |
| Nurture | 3 |
| Polite Pass | 19 |
| Not a Fit | 10 |
| **Total Named Responses** | 57 |
| **Total Leads Contacted** | ~1,000+ |

---

### 🔥 Hot — Follow Up Immediately

| Name | Company | Title | Location | Campaign | Stage | Their Response (Summary) | Next Step |
|------|---------|-------|----------|----------|-------|--------------------------|-----------|
| **Hossein Jafari** | Wowspot Ltd. | Managing Director | London | SI8_Legal Friction | Followed Up | 👍 then: *"You're right about the documentation; since the 2026 ASA and IAB updates, it's become a standard requirement for London projects. Having your team follow these disclosure rules is the best way to keep the campaign's copyright and IP safe under UK law."* | Apr 1 — conversational reply sent with Urban Drift PDF, Runway/Kling vs Firefly gap, asked for call | Await reply; book call |
| **Troy Macdonald** | HyFi Corp | Chairman of the Board & CEiR | Miami | SI8_Hitting a Wall | Replied — Conditional | "Hi Ivy, sure send a sample and then lets arrange a call." | Apr 3 — Urban Drift Chain of Title PDF sent (attached); Calendly link included | Await reply; book call |

**Why Hossein matters:** He's a London MD who unprompted validated SI8's entire premise — documentation is now standard in London due to ASA/IAB 2026 updates. This is the first contact who has confirmed a regulatory/industry driver without prompting. Highest signal response to date.

**Research action:** Verify what the 2026 ASA and IAB updates specifically require. This may be a major content/marketing angle.

---

### 🔴 Priority: Active / Follow-Up Required

| Name | Company | Title | Location | Campaign | Stage | Their Response (Summary) | Last Action | Next Step |
|------|---------|-------|----------|----------|-------|--------------------------|-------------|-----------|
| **Barney O'Kelly** | AlixPartners | — (Global consulting) | London | Campaign A | Followed Up | "Hi Vanessa, I'd be interested in learning more." | Apr 1 — follow-up sent with v4 Urban Drift Chain of Title PDF | Await reply; book call |
| **Syed Tabish Hasan** | Zedtronix | CEO / Founder | London | Campaign A | Followed Up | "Sure" | Apr 1 — follow-up sent with v4 framing, Urban Drift PDF, Calendly link (Lilly persona) | Await reply; book call |
| **Bee Lin Ang** | Stewardship Asia Centre | Head of Digital Strategy & Comms | Singapore | Campaign A | Followed Up | "Thanks, where are u based? Yes, I would not mind learning more." | Apr 1 — second follow-up sent with Urban Drift PDF + Calendly (first Calendly sent Mar 12, no booking) | Await reply; book call |
| **Rawand Latif** | ARUBA CREATIVE L.L.C. | Co-Founder & Creative Director | Sulaymaniyah, Iraq | SI8_Hitting a Wall | Replied — Warm | "Hello Ivy, Sounds interesting, what's your services!" | None | Explain v4 CaaS — note: Iraq is off-target geography but creative director role is right |
| **Mainul Islam** | eSaviour Limited | — | London | Campaign A | Replied — Conditional | "ready 1-2 samples first then we will let you know" | None | Re-engage once 2-3 sample works ready |
| **James Byrne** | BeyondWords | — (ESG reporting) | London | Campaign A | Replied — Conditional | "Can you share some examples so I can understand" | None | Re-engage once samples ready |
| **Qaiser Mehmood** | ECONROAD International | Director of Business Development | Singapore | Campaign C | Followed Up | "Okay. Do u have any website?" | Apr 1 — follow-up sent with v4 Urban Drift PDF + Calendly (website + v3 PDF sent Mar 15, no reply) | Await reply; book call |
| **Hugo Barbera** | HumAIn | AI Director | Paris | SI8_Hitting a Wall | Followed Up | Reviews client legal T&Cs before taking projects. "We never got anything rejected in more than 3 years... we work with big agency networks and their legal teams." | Apr 3 — reply sent: distinguished contractual compliance from content-level documentation (IAB framework, EU AI Act, tool provenance inside the video) | Await reply; see if content-level documentation is a gap in their process |
| **Ivan Ng** | Bacon Creatives | Creative Consultant | Singapore | SI8_Hitting a Wall | Replied — Warm | "No this has not come up. But one of the creative agencies I consult with may be looking for a new AI partner to bring their AI influencer to life. Is this something you guys do?" | Apr 3 — pivot reply sent: clarified SI8 is documentation layer not production; if agency is building AI influencer, they'll need Chain of Title when it goes live; asked what stage they're at | Await reply — Singapore ICP, has a live client use case |
| **Leimi Zhou** | WOMBO | Digital Marketing Strategist & Video Artist | London | SI8_Legal Friction | Replied — Lukewarm | "I've never been asked for documentation on my process. Why do you ask? Just curious" | Apr 3 — educational reply: explained IAB January framework, ASA robot puppy ruling, EU AI Act August; offered to send sample | Await reply — WOMBO is an AI company; good market research data point regardless |
| **Aswini Ruidas** | MediaX | Sales Manager | Durgapur, India | SI8_Hitting a Wall | Replied — Lukewarm | Suggested Telegram; when declined, offered WhatsApp: +91 6296601182 | Ivy asked if on WhatsApp; he confirmed | Low priority — India off-target, FinTech PR off-target sector. Park. |

---

### 🟡 Calls Completed

| Name | Company | Title | Location | Call Date | Key Insight | Outcome | Next Step |
|------|---------|-------|----------|-----------|-------------|---------|-----------|
| **Isaac Twidale** | We Do Ads | Founder | London | Mar 2026 | Quality-first buyer. Rights = nice-to-have. Wants photorealistic portfolio (~£1,500/client, 10-20 clips, 3-month campaigns). | Warm — needs quality proof | Send 3-5 photorealistic portfolio examples (overdue) |
| **Elaine Tan + Joseph Lee** | The Media Shop Group | Media Director + Digital Lead | Singapore | Mar 18, 2026 | Wrong buyer type — media buying. Rights concern confirmed. Referral offered to MediaPlus Germany. Pricing intel: $3K SGD / 30-sec custom AI video. | Low (wrong type) — referral valuable | Send thank-you + 1-pager; request Germany intro from Joseph |

---

### 🟡 Lukewarm — Nurture

| Name | Company | Title | Location | Campaign | Response (Summary) | Notes |
|------|---------|-------|----------|----------|--------------------|-------|
| **Mark Johnson** | SwiftScale AI | Founder & MD | London | SI8_Vetting Takes Weeks | "Thanks Ivy" → "Okay" after Msg 2 | Minimal engagement. SwiftScale AI is an AI company itself — possibly wrong side of market. Monitor. |
| **Amr Hamad** | Stackline | Director, Retail Media EU & APAC | London | SI8_Legal Friction | Confirmed labeling is main criteria; "Not to my knowledge" on IP/training data layer | Pain is at labeling layer, not Chain of Title layer yet. Not urgent pain. Downgrade from Warm to Lukewarm. Follow up after ASA/IAB research. |
| **Emmanuel Stralka** | Think Global Solutions | Co-Founder | London | Campaign A | "We will keep you in mind when it comes to video-based assets as your AI probably provides speed to market advantages." | Cultural intelligence / market entry platform. Not content production. Soft referral interest — if their brand clients run AI video in launch campaigns. Apr 3 — acknowledged; floated referral arrangement. |
| **William Tan** | Tareo Digital Advisory | — | Singapore | Campaign C | "Too many individuals have flooded my inbox... teams are evaluating" | Follow up early April — "have you had a chance to evaluate?" |
| **Quincy Yong** | Merandi Global Consulting | — | Singapore | Campaign C | "Okay" | Minimal — send Message #2 |
| **Ayesha Akhtar** | Arrangers Digital Media | Strategic Marketing Consultant | Gurugram, India | SI8_Legal Friction | "I'm not sure" (when asked if clients ask for documentation) | Market research data point: pain not felt yet at this level. Off-target geography (India). |
| **Karun Sbaram** | Singapore Kindness Movement | — | Singapore | Campaign A | "Sure" after Msg 3 | Nonprofit — not a commercial buyer. Wrong target. |

---

### ⚪ Polite Pass — Closed

| Name | Company | Title | Location | Response Summary |
|------|---------|-------|----------|-----------------|
| David O'Beirne | Quietly Good | Founder | London | "Not in a position to work with you at the moment, but hope this will change soon." — Nurture potential; warm tone |
| William Lim | SHEIN | Director, PR APAC | Singapore | "Interesting solution, but no current need" — PR role, not creative/production |
| George Arbid | Unreal Engine UAE / Ardor Ideas | Lead Organizer | Abu Dhabi | "Not interested right now" |
| Pauline Sayers | GPS Marketing & Distribution | Director | Woking | "Not for me thank you" |
| Iona Milne | Reg&Partners | Partnerships Manager | London | "This isn't relevant for me" |
| Benedict Chow | EFC International | — | Singapore | "Not looking to arrange a call, will keep in mind" |
| Kimberly Fravil | Mercer | — | Singapore | "No thank you" |
| Jeevan Thavasukannu | Flash Health | — | Singapore | "Will reach out if needed" |
| Muhammad Ishaq Khan | Somi Buzz | — | London | "Not in need at the moment" |
| Troy James Maclean | ASCENDEA | — | Sydney | "No thank you Lily" |
| Beng Huan Tey | Podium | — | Singapore | Wrong fit |
| Leopold Cox | Mahleon | — | London | "Not interested but happy to keep in touch" |
| Jenny Brett | First Brand Kit | — | London | "None of my clients are looking for AI videos right now" |
| Guy Azouri | Private Investment Group | CTO / Lead AI & Technology Architect | London | "Thanks but not interested" |
| Cory Warfield | Starchild Music | Chief Growth Officer | Chicago | "It hasn't" (re: legal rejection problem) — graceful exit sent |
| Barış Buhar | Freelance Motion Designer | Motion Designer | Ankara | "I don't have this problem right now, but I'll definitely write to you when I do" |

---

### ⛔ Not a Fit — Closed

| Name | Company | Title | Location | Reason |
|------|---------|-------|----------|--------|
| Mikhail Rakov | Self-Employed | Audiodrama Director | London | Audio, not video |
| Mubarak Ali | Human Intelligence Movement / FinTech Academy | Board Advisor | Singapore | Academic/policy, not a buyer |
| Cove Overley Emba | Toy Exploder | Chief Explosive Agent | Hong Kong | "No plans to incorporate AI video" |
| David Aston | Clubworld Travel | Social Media Coordinator | London | AR software, not AI video |
| Richard Clark | boodsta | — | London | Pushback on assumptive opener |
| Charlie Mcneill Love | afoofa.io | — | London | Pushback on assumptive opener |
| Starcom / Gavin | Stellantis | — | London | Authenticity concern ("are you a real person?") |
| Uma Rudd Chia | OH MY STRAWBERRY | — | Singapore | AI creator, not buyer — wrong side of market |
| Vanesse Ang | VAN Consultancy | — | Singapore | Not in business |
| Roman Zincenko | IC Publications | Commercial Director | UK | "I don't do AI videos for clients" |
| Daniel Kwintner | ShowTex Asia | Branch Manager | Tokyo | Prefers organic content; clients share that preference — no AI video use case |
| Giulia Willcox | Instituto de Tecnologia e Sociedade (ITS Rio) | Professor | Rio de Janeiro | Academic/researcher — not a buyer; educational reply sent; Brazil off-target geography |

---

## SECTION 2 — Creators (Instagram)

### Pipeline Snapshot
| Stage | Count |
|-------|-------|
| Interested / Hot — needs v4 follow-up | 4 |
| Nurture | 1 |
| Replied — Awaiting (v4) | 4 |
| **Total Contacted** | 11 |

---

### ⚠️ Important: v3 vs v4 Pitch
The four leads below (keeper505, Chris Vespaziani, Rodolfo Roth, Absolutely Ai) all replied to the **v3 streaming platform pitch** ("licensing to a leading streaming platform in Asia — 20% royalty"). They said yes to a different offer. All need a v4 follow-up to convert to the current model (Creator Record / SI8 Certified documentation + optional Showcase listing).

---

### 🔴 Priority: Active

| Handle | Name | Location | Stage | Exchange Summary | Pitch Version | Next Step |
|--------|------|----------|-------|-----------------|---------------|-----------|
| **keeper505** | — | — | Interested | Detailed questions about platform, documentation, licensing. Film "Abyssal Gaze" — festival recognized. Asked about territories, duration, which streaming platform. | v3 streaming pitch | Create COMP-KEEPER in Stripe; send v4 follow-up explaining current model |
| **@syntaxdiffusion** | Chris Vespaziani | — | Interested | Replied "Yes" to streaming platform pitch | v3 streaming pitch | Send v4 follow-up — explain Creator Record / Showcase model |
| **@rodszera.ai** | Rodolfo Roth | — | Interested | "I just have two short films, how would this work?" | v3 streaming pitch | Send v4 follow-up + explain 2 films is enough to start |
| **@absolutely.ai** | Absolutely Ai | — | Interested | "Sure - always happy to hear more" | v3 streaming pitch | Send v4 follow-up |
| **shingo4987.film** | Shingo | Japan | Nurture | Award-winning AI filmmaker (OMNI Silver Award). Said "not ready" despite finished film. Key market research: WAIFF requires tool disclosure; creator readiness = creative confidence + platform trust. | v4 | Follow his work; reconnect when he releases new project |

---

### 🟡 Replied — Awaiting Response (v4)

| Handle | Location | v4 Reply Sent | Status |
|--------|----------|---------------|--------|
| Vishal | — | Mar 29 | Awaiting |
| Lê Công Thoại | Vietnam (est.) | Mar 29 | Awaiting |
| Aditya | — | Mar 29 | Awaiting |
| Ferry | — | Mar 29 | Awaiting |

---

### 🔄 Reclassify — Consider Moving to Creator Pipeline

| Handle | Name | Company | Current CRM Status | Why Reconsider |
|--------|------|---------|-------------------|----------------|
| Uma Rudd Chia | — | OH MY STRAWBERRY | Buyer — Not a Fit | She's an AI video creator (early OpenAI tester, API access, creates content) — wrong side of market as a buyer, but right profile as a creator |

---

## SECTION 3 — ICP Analysis

*Living analysis layer — updated as patterns emerge. This is the working thinking, not a static summary.*

---

### Buyer ICP (Agency / Brand)

**Last updated: April 4, 2026 — based on 57 named responses across ~1,000+ contacts**

---

#### Geography Analysis

| Location | Warm/Hot/Conditional | Polite Pass | Not a Fit | Signal Quality |
|----------|---------------------|-------------|-----------|----------------|
| **London** | 8 | 7 | 4 | **High** — when they respond, they mean it; Leimi Zhou (WOMBO) adds AI company signal |
| **Singapore** | 3 (Ivan Ng = warm pivot; others wrong type) | 5 | 2 | Rising — Ivan Ng is first Singapore lead with a live client use case |
| **Paris / EU** | 1 (Hugo Barbera — warm) | 0 | 0 | New signal — EU AI Act August deadline opening EU as secondary geography |
| Miami / US | 1 (Troy Macdonald — conditional) | 0 | 0 | Isolated — US off-strategy Year 1, but responds when pain is real |
| India | 1 (off-target) | 0 | 1 | Off-target — pause |
| Hong Kong | 0 | 0 | 1 | Too small sample |
| Abu Dhabi | 0 | 1 | 0 | Off-target — pause |
| Sydney | 0 | 1 | 0 | Off-target — pause |

**Verdict: London remains primary. Singapore is showing its first genuine use-case lead (Ivan Ng). EU/Paris is opening via the August 2026 EU AI Act deadline — worth a small test batch targeting EU-facing production studios. US responds but is off-strategy for Year 1.**

---

#### Role / Title Analysis

| Role Type | Outcome | Examples |
|-----------|---------|---------|
| **MD / Founder** | Best — hot or warm | Hossein (MD/hot), Isaac (Founder/call), David O'B (Founder/nurture), Mark Johnson (Founder/lukewarm) |
| **Director-level creative/digital** | Conditional or warm | Barney, Amr, Mainul |
| **AI Director / AI Practitioner** | Warm — distinct persona | Hugo Barbera (HumAIn): sophisticated, has informal process, thinks he's covered. Needs different pitch — not "do you have a problem" but "is your process producing documentation that travels with the file?" |
| **Creative Consultant** | Warm if client use case present | Ivan Ng (Singapore): no personal pain, but active client use case (AI influencer). Qualification depends on whether their client is real and imminent. |
| **Digital Marketing / Video Artist at AI company** | Lukewarm — market research value | Leimi Zhou (WOMBO): no pain yet, genuinely curious. AI companies are early indicators — they'll feel documentation pressure before agencies do. |
| **Media Director / Planner** | Wrong buyer type | Elaine Tan |
| **PR Director** | Wrong role | William Lim (SHEIN) |
| **Partnerships / Consultants** | Not a fit | Iona, Andrzej, Ketan |
| **Solo / self-employed** | Not a fit | Mikhail, Vanesse |

**Verdict: MD and Founder remain the sweet spot. A new persona has emerged: the sophisticated AI practitioner (Hugo Barbera type) who has an informal process and believes they're compliant. These are real prospects but require a different entry point — position around the IAB framework's content-level documentation requirement, not the "do you have a problem" question they'll answer no to.**

---

#### Company Type Analysis

| Type | Outcome | Examples |
|------|---------|---------|
| **Creative / digital agency (small-mid)** | Best | Wowspot (hot), We Do Ads (call), eSaviour (conditional) |
| **AI-specialist agency** | Warm — new data point | HumAIn (Hugo): AI training + advertising for Fortune 500. Has a process but it's relationship-based, not document-based. Likely a common profile among established AI practitioners. |
| **AI company (tool/product side)** | Lukewarm — early indicator | WOMBO (Leimi): AI video tool company. No current pain but ahead of the curve. Worth educating — they will feel pressure before agencies do. |
| **Creative consultant (with active client use case)** | Warm — depends on client reality | Bacon Creatives / Ivan Ng (Singapore): value depends entirely on whether the client's AI influencer project is real. |
| **Consulting / advisory** | Untested | AlixPartners (Barney — call not yet booked) |
| **Media buying agency** | Wrong buyer type | The Media Shop |
| **PR agency** | Wrong role | SHEIN PR, GPS Marketing |
| **Nonprofit / NGO** | Not a fit | Singapore Kindness Movement |
| **FinTech / Blockchain PR** | Not a fit | MediaX |
| **Investment / VC / finance** | Not a fit | Guy Azouri (Private Investment Group): CTO at investment firm — no content production use case |

**Verdict: Creative and digital agencies with production responsibilities remain the core. AI-specialist agencies are a new qualified segment — they produce AI video at scale for major clients but rely on informal compliance processes that the IAB framework now makes insufficient. AI companies (tool side) are early-indicator contacts worth warming up for when the documentation requirement hits their clients.**

---

#### Pain Awareness Level — Most Predictive Dimension

| Awareness Level | Response Quality | Examples |
|----------------|-----------------|---------|
| **Already aware of regulatory requirement** | HOT | Hossein: "since the 2026 ASA/IAB updates, it's standard" |
| **Has an informal process, believes they're covered** | Warm — different pitch required | Hugo Barbera: "we've never been rejected in 3 years, we work with big agency networks." Contractual compliance ≠ content-level documentation. This persona needs to understand the IAB framework creates a new, specific requirement. |
| **Aware of labeling, not IP/Chain of Title layer** | Lukewarm | Amr: "main criteria is brand guidelines / labeling" |
| **Unaware but curious** | Lukewarm — educational | Leimi Zhou: "I've never been asked. Why do you ask?" WOMBO is an AI company — her curiosity is genuine. |
| **Unaware / not sure** | Polite pass or low signal | Ayesha: "I'm not sure", Mikhail: "I don't know" |
| **Pain real but not urgent** | Conditional | Isaac: "it's interesting… but not a buying driver" |

**Verdict: Pain awareness is still the strongest predictor. A new level has emerged — "has an informal process and thinks they're covered." These contacts don't respond to "do you have this problem?" They respond to "is your current process producing documentation that satisfies the IAB framework?" The pitch is about the gap between what they do today and what the industry now requires.**

---

#### ICP Profile (Updated April 4, 2026 — N=57)

**Primary ICP (unchanged):**
> **Managing Director or Creative Director at a small-to-mid creative or digital agency (10–50 employees) in London, already aware of AI content documentation requirements from regulatory pressure (ASA/IAB 2026) or client legal teams pushing back — and directly responsible for delivering AI video campaigns.**

**Secondary ICP — new (April 2026):**
> **AI Director or senior practitioner at an established AI-specialist agency, working with Fortune 500 clients or holding group agency networks. Has an informal compliance process (reviewing client T&Cs, relationship with legal teams) but has not produced structured content-level documentation. EU-facing agencies within 4 months of the EU AI Act August 2026 deadline are particularly qualified.**

**High-value use case to target explicitly — new (April 2026):**
> **Any agency or studio building AI influencer campaigns (synthetic avatars for ongoing brand use).** This is an IAB mandatory disclosure trigger. Documentation complexity is higher (persona ownership, likeness, ongoing use rights), deal value is higher, and urgency is clearer than a one-off campaign video.

**Positive signals (qualify in):**
- London-based (primary) or EU-facing (secondary, especially Paris/Amsterdam/Hamburg)
- MD, Founder, Creative Director, Head of Production, or AI Director title
- Creative/digital/production agency or AI-specialist agency (not media buying, not PR)
- 10–100 employees
- Already producing or commissioning AI video
- Mentions legal, compliance, or documentation unprompted
- Working with brand clients or holding group agency networks
- Building or pitching AI influencer / synthetic avatar content

**Disqualifiers (filter out fast):**
- No AI video in workflow — the single most common reason for a polite pass
- Media buying, PR, nonprofit, investment/finance, market intelligence company type
- Media Director, Planner, PR Director, Partnerships Manager titles
- Geography outside London/EU/Singapore (for now)
- Needs full education on why compliance matters before engaging (conversion too slow)

---

#### Targeting Changes for Next Dripify Batch (Updated April 4, 2026)

**LinkedIn filter changes:**

| Remove | Add |
|--------|-----|
| Media Director | Managing Director |
| Media Planner | Creative Director |
| Media Strategist | Head of Production |
| PR Director | Executive Producer |
| Partnerships Manager | Founder (filter: agency/production) |
| — | AI Director (new: targets Hugo-type persona) |

**Company industry filter:**
- Keep: Advertising Services, Marketing Services, Video Production, Digital Media
- Add: AI and Machine Learning (catches HumAIn-type AI-specialist agencies)
- Remove: Media Buying, Public Relations, Management Consulting, Nonprofit, Investment Management, Market Research

**Geography:**
- Primary: Greater London
- Secondary test batch: Paris, Amsterdam, Hamburg (EU AI Act deadline = August 2, 2026 — 4 months out; use deadline as hook)
- Resume carefully: Singapore (Ivan Ng signal — one live use case; test small batch with AI influencer angle)
- Pause: Sydney, Abu Dhabi, India, US

**Campaign to scale:**
- Scale: SI8_Legal Friction — best self-qualifier; opener requires them to already be delivering AI video
- Test new angle: EU AI Act deadline campaign for Paris/Amsterdam batch (hook: "August 2 deadline")
- Test new angle: AI influencer documentation campaign (hook: IAB mandatory disclosure for synthetic avatars)
- Fix or retire: SI8_Vetting Takes Weeks / Campaign A (assumptive opener produces polite passes and pushback; people connect through 4 messages then decline — worst pre-qualification of all campaigns)
- Monitor: SI8_Hitting a Wall — good volume but needs better targeting to avoid non-AI-video contacts getting through

---

### Creator ICP (Instagram)

**What we know (N=7 contacted, 2 substantive exchanges):**
- Festival participation = already in documentation/disclosure mindset (WAIFF requires tool disclosure)
- "Readiness" = creative confidence + platform trust — not commercial intent or film completion
- Detailed questions = genuine interest; "okay" / silence = disinterest
- Comp code removes friction for first engagement; conversation itself is what qualifies

**Creator ICP hypothesis:**
- Original AI filmmaker with finished work
- Active on festival circuit OR has distribution ambition in bio/posts
- Uses paid tools (Runway Standard/Pro, Kling Pro)
- Audience signal: 5K+ followers or festival credits
- NOT: hobbyists, reposters, free-tier-only, works at tool companies

---

### Messaging Analysis

| Campaign | Response Rate | Pushback | Best Outcome | Verdict |
|----------|--------------|----------|--------------|---------|
| Campaign A — Vetting Takes Weeks | 1.2% | High (2 explicit) | Barney O'Kelly (warm) | Retire or fix — assumptive opener produces polite passes after 4 messages (Guy Azouri: 4 msgs then "not interested"). Worst pre-qualifier. |
| Campaign B — Documented Provenance | 1% (N=1) | 0 | Elaine Tan (call booked) | Unproven — scale to 400 leads |
| Campaign C — Trusted AI Supplier | 2.75% ⭐ | Low | Isaac Twidale (call completed) | Best performer — scale this |
| SI8_Legal Friction | TBD | 0 | Hossein Jafari (hot), Leimi Zhou (lukewarm/educational) | Best pre-qualifier — opener requires person to be delivering AI video; self-selects in or out on message 1 |
| SI8_Hitting a Wall | TBD | Low | Troy Macdonald (conditional), Ivan Ng (warm pivot) | Volume good, quality mixed — non-AI-video contacts get through; tighten ICP filter |
| SI8_Early Days | TBD | 0 | — | Polite passes only so far |
| IG v4 Template | ~28% (2/7) | 0 | Shingo (research), keeper505 (hot) | Strong — comp code reduces friction |

**Key patterns:**
- Question-based openers (Legal Friction, Campaign C) outperform assertion-based openers (Campaign A) in quality and pushback rate
- SI8_Legal Friction is the strongest pre-qualifier because the opener requires active AI video delivery — people who aren't doing it don't answer; people who are give you substantive market research
- SI8_Hitting a Wall's assertion opener ("more and more production houses are hitting a wall") lets non-qualified contacts through all 4 messages before declining
- The single most useful filter missing from all campaigns: explicitly requires the person to currently be delivering AI video for clients

---

### Open Questions — To Answer Through Conversations

1. What specifically did the 2026 ASA and IAB updates require? → **Research immediately — potential major content angle**
2. Do London MDs at creative/digital agencies consistently feel this pain? → **Book Hossein Jafari call to test**
3. Do large consulting firms (Barney O'Kelly / AlixPartners) care about rights differently? → **Book Barney call**
4. Does the MediaPlus Germany referral open a production house segment? → **Follow up with Joseph Lee**
5. What makes a creator trust a platform enough to list? → **Shingo gave partial answer — probe with others**
6. Are other AI film festivals besides WAIFF requiring tool disclosure? → **Research**
7. Does keeper505 convert? → **Awaiting reply**
8. Is "labeling" (Amr's concern) a gateway to Chain of Title, or a separate/simpler need? → **Needs clarification**

---

## SECTION 4 — Campaign / Source Log

| Campaign | Channel | Persona | Approx. Leads | Responses | Period |
|----------|---------|---------|---------------|-----------|--------|
| Campaign A — Vetting Takes Weeks | LinkedIn | Lilly, Vanessa | ~993 | 12 | Mar 2026 |
| Campaign B — Documented Provenance | LinkedIn | Lilly | ~101 | 1 | Mar 2026 |
| Campaign C — Trusted AI Supplier | LinkedIn | Vanessa, Ivy | ~400 | 11 | Mar 2026 |
| SI8_Legal Friction (v4) | LinkedIn (Dripify) | Vanessa | — | 4 (Amr, David A, Hossein, Ayesha, Iona) | Mar–Apr 2026 |
| SI8_Hitting a Wall (v4) | LinkedIn (Dripify) | Ivy | — | 2 (George, Aswini) | Mar 2026 |
| SI8_Early Days (v4) | LinkedIn (Dripify) | Lilly | — | 2 (Cove, William Lim) | Mar 2026 |
| SI8_Vetting Takes Weeks (v4) | LinkedIn (Dripify) | Ivy/Lilly | — | 2 (Mark Johnson, Emmanuel) | Mar 2026 |
| SI8_Documented Provenance (v4) | LinkedIn (Dripify) | Vanessa | — | 1 (David O'Beirne) | Mar 2026 |
| SI8_Trusted AI Supplier (v4) | LinkedIn (Dripify) | Vanessa | — | 1 (Mubarak Ali) | Mar 2026 |
| IG Creator Outreach v4 | Instagram | JD (Standing Encore) | 7 | 2 substantive | Mar 29–30, 2026 |

---

*Next update: when new LinkedIn or IG responses arrive, or after next discovery call.*
