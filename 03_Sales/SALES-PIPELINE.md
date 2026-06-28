# SI8 Sales Pipeline

**Purpose:** Stage-by-stage funnel view of all active sales leads. Modeled on a HubSpot/Pipedrive Kanban — each section is one pipeline stage. Updated via Step 7 of the `/dripify-report` wizard, or manually after any significant lead action.

**Source:** `03_Sales/CRM.md` is the flat activity log. This file is the stage view — what matters right now, organized by where each lead sits in the funnel.

**Lead reference:** Every row maps to a B-ID or C-ID in `03_Sales/CRM.md`. Nurture/MONITOR leads are excluded — they are not in the active funnel.

**Last updated:** 2026-06-16 (Jun 16 Dripify report; no stage changes; discovery pipeline updated to 256 signals)

---

## Stage Definitions

| # | Stage | What it means | Entry criteria |
|---|-------|---------------|----------------|
| 1 | **Lead Replied** | Substantive reply received — warm, lukewarm, or conditional | Lead responded to any outreach message |
| 2 | **Warm Lead** | Expressed clear interest or acknowledged the pain point directly | Reply shows genuine ICP signal or asks a follow-up question |
| 3 | **Call Requested** | JD or alias has explicitly offered a call and lead is open to it | Calendly sent, slots offered, or lead said "sure / let's talk" |
| 4 | **Call Scheduled** | Call has a confirmed date and time on calendar | Calendar event created, both parties confirmed |
| 5 | **Call Taken** | Discovery call completed, notes filed | Call happened |
| 6 | **Evaluating** | Lead is actively considering SI8 — sample reviewed, proposal digested, or internally circulating | Post-call or post-sample; lead is in a decision window |
| 7a | **Creator Submitted** | Creator Record ($29) or SI8 Certified ($499) submission received | Payment confirmed / submission in platform |
| 7b | **Rights Verified Submitted** | Agency/brand submitted on behalf of a client | B2B submission confirmed |

**Lost** (terminal): Explicitly declined, permanently off-ICP, or cold after 3+ follow-ups.

---

<!-- sales-pipeline:start -->

## 1. Lead Replied (62)

*Substantive reply received. Assessing fit and next move.*

| B-ID | Lead | Company | Geo | Reply Signal | Next Action | Follow Up By |
|------|------|---------|-----|--------------|-------------|--------------|
| B014 | Shahrman Nayan | onedash22 | — | Replied | Continue sequence msg 3 | — |
| B015 | William Tan | Tareo Digital Advisory | Singapore | Lukewarm | Follow-up: have you had a chance to evaluate? | — |
| B016 | Mainul Islam | eSaviour Limited | — | Conditional — needs samples | Re-engage once 2-3 samples ready | — |
| B017 | James Byrne | BeyondWords | — | Conditional — needs samples | Re-engage once samples ready | — |
| B025 | Aswini Ruidas | MediaX | India | Lukewarm — WhatsApp confirmed | Send v4 pitch via WhatsApp | 2026-04-10 |
| B046 | Kd Pascall | Bluvision Studios | London/UK | "Of recent yes, before it was never an issue" | Await reply | — |
| B049 | Ruth Teasdale | Motion World Ltd | London/UK | Describes licensing process | Await reply — validating her process | — |
| B050 | Julia N'Diamoi | T&P | London/UK | Vetted AI tool stack process | Await reply | — |
| B051 | Kiel Robinson | Ok let's play Studios | London/UK | Tracks raw materials + metadata | Await reply | — |
| B052 | Loewe Chung Nin Lee | — | London/UK | "Started seeing this more recently" | Await reply | — |
| B058 | Chun Man Chan | Dustinhill Productions | Singapore | Uses AI but hybrid output | Reply + explain regulatory trend | — |
| B059 | Alan Geoy | Antigravity Studio | Singapore | Approved-tool policy | Reply + probe which tools | — |
| B060 | Konstantin Dimitrov | Pathbind Games | Amsterdam | Asked for clarification | Reply with clearer description | — |
| B062 | Quim Español | Monks | Amsterdam | Holdco legal → agency filter Q asked | Await reply | — |
| B063 | Kees-Jan Husselman | — | Amsterdam | Docs spread across files | Await reply — book JD call if warm | — |
| B064 | Oscar Julius Marmelstein | The Shed Editing | Amsterdam | Informal logs → asked PDF or email | Await reply | — |
| B065 | Christiaan Compaan | — | Amsterdam | Validated pre-production moment | Await reply | — |
| B066 | Uli Redkina | — | London/UK | Contract-based informal rights management | Await reply | — |
| B067 | Alena Stepanova | Philip Morris | London/UK | Brand-side — probing if commissions AI from agencies | Await reply | — |
| B068 | Marchel De Haan | Palo Alto Networks | Amsterdam | "Some do and some don't" | Follow-up; educate on IAB framework | — |
| B069 | Shahrukh Kazmi | — | Amsterdam | "Some legal teams are starting to ask" | Reply; monitor | — |
| B070 | Marinus Bergsma | SocialNow | Amsterdam | "Always clear upfront" — explore if clients ask for docs | Reply + probe | — |
| B071 | Jenny Springett | Electric Violet TV | London/UK | "Required to broadcast in EU" — strong signal | Await reply | — |
| B072 | Nick Craske | Havas Lynx | London/UK | "Yes, and wider view of AI use cases" | Await reply | — |
| B073 | Alessio Garbin | Barilla Group | Amsterdam | Brand-side — potential agency referral | Await reply | — |
| B074 | Graeme Carr | OBSIDIAN | Amsterdam | Validated tracking | Await reply | — |
| B075 | Alexander Kraemer | AK/83 | Amsterdam | Open curiosity — answered | Await reply | — |
| B076 | Dagny Rozniak | Pencil | Amsterdam | "Not sure if legal teams ask anything specific" | Reply — educate on IAB framework | — |
| B078 | Daniel Simler | Samsung SDS Europe | London/UK | "Not at the moment but needs more regulations" | Await reply | — |
| B079 | Tunc Akyuz | Big Media & Technology | London/UK | Signs IP guarantee in contract — verbal only | Await reply | — |
| B080 | Kasra Mirzarezaie | Case Connect LLC | London/UK | MVA / CA standards — determining fit | Await reply | — |
| B081 | Dylan Guo | Independent | London/UK | "Make sure everything is traceable" | Await reply | — |
| B084 | Tahreem Khan | Xperia Labs | London/UK | "Copyright issues concern me" | Await reply | — |
| B086 | Daniel Fox-Evans | The Kitchen London | London/UK | Consumer backlash is main blocker | Await reply — is legal also coming up? | — |
| B092 | Lina De Groot | Stealth AI Startup | Amsterdam | Answered her Q on hardening areas | Await reply | — |
| B098 | Michelle Ponto | Blue Gecko Communications | Dubai/UAE | "Yes, asking about prompts and sequence" | Await reply | — |
| B103 | Ahmed Samy Amin | GTCFX | Dubai/UAE | "Would love to compare notes" — navigating finserv + brand client documentation a lot lately | Send compare-notes call invite Jun 17 [JD personal] | 2026-06-17 |
| B157 | Steve Bannerman | Prime Video & Amazon MGM Studios | LA / APAC | "Provenance of the video is HUGELY important" in feature film. Head of Post-production, International Originals APAC. Film/TV E&O track — Test 12 validation. | Send film-ICP pivot + compare-notes call invite Jun 17 [Vanessa] | 2026-06-17 |
| B104 | Ashraf Selo | MultiBank Group | Dubai/UAE | Connection accepted Jun 16; JD sent format-structure probe — "formal document or informal sign-off? how structured is the ask?" | Await reply | 2026-06-19 |
| B106 | Mohammed Magdy Alzahran | Dybaja AI Creative Studio | Dubai/UAE | NDA + Transfer of ownership rights | Await reply | — |
| B109 | Shahin Sha | Rafaz Properties | Dubai/UAE | Risk/ownership/disclosure framing | Await reply | — |
| B110 | Nikan Nazari | Freelance | Dubai/UAE | "Document every word in the contract" | Await reply | — |
| B111 | Anwar Al Amin | The Film Craft MENA | Dubai/UAE | "Depends on client requirement" | Await reply | — |
| B112 | Manoj Reddy | ALBAB Media LLC | Dubai/UAE | "Not yet but becoming a bigger topic" | Await reply | — |
| B113 | Mohanaselvan Jeyapalan | Expo City Dubai | Dubai/UAE | Dubai Future Academy AI labeling | Await reply — research signal | — |
| B114 | Debjani Mukherjee | GEMS World Academy | Dubai/UAE | "Increasingly so… what are you seeing?" | Await reply — research signal | — |
| B115 | Anuj Gunasena | Al Tayer / Bloomingdale's | Dubai/UAE | "What are you seeing?" | Await reply — research signal | — |
| B123 | Gulzar Junaid | Kling AI | Germany | "Usually driven by legal or brand safety, not technical curiosity" — pre-validated B2B2B before probe sent | Test 6 v6-A probe sent Jun 9; await reply | — |
| B146 | Alex Jenkins | Nexus Studios | England | "One client wants us to document AI usage. May I ask why?" | Test 6 v6-A probe sent Jun 9: explained SI8 + legal/creative source probe | — |
| B147 | Cris Cerqueira | Cris Cerqueira Studio | England | Packaging/branding; keeps records; future-aware ("legal teams will ask") | Test 6 v6-B pitch sent Jun 9: showed formalised sample | — |
| B131 | Natalia Zablotska | Agro-Bondarivka | London/UK | "Seeing more of this lately" | Reply + send sample | — |
| B134 | Joachim Klatt | one.GLOBAL-VISION | Germany | "More relevant especially for larger brands" | Test 6 v6-B pitch + sample link sent Jun 9; await reply | — |
| B135 | Ehsan Aliabadi | Loudestudio | Germany | "Documentation more important for larger campaigns" | Test 6 v6-A probe sent Jun 9: legal or creative source? | — |
| B136 | Tom Freeman | Freeman Studio | Germany | "Clients tell me which AI models are ok" | Test 6 v6-A probe sent Jun 9: is that a legal gate or creative brief? | — |
| B006 | Rawand Latif | ARUBA CREATIVE | — | v4 sample + Calendly sent — no reply | Send follow-up | — |
| B008 | Barney O'Kelly | AlixPartners | — | Nudge sent — no reply to call offer | Send follow-up | — |
| B010 | Bee Lin Ang | Stewardship Asia Centre | Singapore | Nudge sent — no reply to call offer | Send follow-up | — |
| B013 | Qaiser Mehmood | ECONROAD International | — | Sample + Calendly sent — no reply | Send follow-up | — |
| B024 | Chitra J | GrapheneAI | — | Msg 2 with Calendly — no reply | Send follow-up | — |
| B031 | Steve Mcpartland | Visually Sonic | — | 2nd nudge — no reply | Send follow-up | — |
| B044 | Shaun Yeo | Reel Loco Productions | Singapore | Calendly sent — no reply | Send follow-up | — |
| B048 | Piotr Nierobisz | Munchingsquare | Amsterdam | 2nd nudge with call offer — no reply | Send follow-up | — |
| B061 | Jay Pirabakaran | JAYPRINTS Studio | London/UK | 2nd nudge — no reply | Send follow-up | — |
| B162 | Devin Curry | New York Life | New York | Replied Msg#2: "I don't have direct experience but I'm sure some colleagues have!" — referral implicit; wrong title (financial rep, not CD) but right company | Referral ask sent — identify the creative/marketing team | 2026-07-05 |
| C001 | keeper505 | — | — | Creator follow-up — no reply | Chase on IG | — |
| C006 | Essa | — | Hong Kong | v4 WhatsApp re-pitch — no reply | Chase on WhatsApp | — |

---

## 2. Warm Lead (27)

*Clear ICP signal or acknowledged pain. Moving toward a call or sample.*

| B-ID | Lead | Company | Geo | Signal Summary | Sample Sent? | Next Action | Follow Up By |
|------|------|---------|-----|----------------|-------------|-------------|--------------|
| B100 | Ramez Tabshi | — | Dubai/UAE | **T1 + PRODUCT FIT CONFIRMED.** Jun 26 reply: "once legal teams get involved, conversation immediately shifts to IP ownership and copyright risks… That IP and commercial licensing document is exactly what they are looking for." Clients = finserv, healthcare, public sector. Current output = technical/security PDF only — explicit gap to SI8 Chain of Title. | No | Send sample (superimmersive8.com/sample) + 20-min call offer by Jul 5 | 2026-07-05 |
| B145 | Daniele Zennaro | AiYR4 | England | "Request via commercial/rights side — legal/compliance probably behind it." Partial B2B2B confirmation. Chain: legal→commercial/rights→agency. Case-by-case but trending structured. Test 6 v6-A. | No | Pitch + send sample (superimmersive8.com/sample) — position as what the commercial/rights clearance request formalises | — |
| B002 | Theodor (Teddy) Sandu | MullenLowe Singapore (IPG) | Singapore | "They are asking for both" — disclosure + Chain of Title. CD at holdco. T1 same-day reply. | No | Send Part 2 gate: what are you sending them and does it satisfy their legal team? | 2026-06-18 |
| B036 | David Tamayo | Prose on Pixels | — | "Big network with legal team dedicated to AI" | No | Await reply (EU AI Act angle sent) | — |
| B040 | Hasan Sarwar | — | — | "I'd love to see the Example Rights Package" | No | Send sample Chain of Title | — |
| B041 | Nourhan Mostafa | Ai Studio | Egypt | "Creative Director – AI Content" — described compliance process in detail | No | 4th follow-up sent Jun 8; await reply (off-geo but strong ICP signal) | — |
| B053 | Graham Vincent | grigio:london | London/UK | 👍 reaction to full pitch — no verbal reply | No | Drop sample directly in message | — |
| B056 | Michael Christodoulou | MOI Global | — | "Sure" — accepted sample offer | No | Send sample Chain of Title | — |
| B107 | Keegan Desouza | Shaerp Next | Dubai/UAE | "Legal side isn't mature yet — how does it work?" | No | Reply + explain SI8 briefly | — |
| B121 | Gabriel Preston | Imagine This Creative Studio | London/UK | Approved platform lists, prompt sheets, likeness rights focus | No | Position SI8 as structured output; likeness angle | — |
| B122 | Mhd Ali | Monks | Dubai/UAE | "Most of the time" — Monks holdco signal | No | Reply + probe Monks client format | — |
| B127 | Ulrike Kerber | Viva Design Inc. | Germany | "Legal teams asking with increasing frequency" | No | Reply + send sample | — |
| B128 | Christopher Neitzert | Creative Mayhem | Germany | "Yeah I have a solution. Do you?" — probe competitor/complementary | No | Reply + probe what his solution is | — |
| B129 | Kelly Hogan | ELITE STORI LND | London/UK | "What do you do?" — asking to understand product | No | Reply + explain SI8 | — |
| B138 | Tunç Topçuoglu | HOOD Studio | Amsterdam | "Checked your product — very interesting. Would love to hear more." | Yes (product reviewed) | Reply + send sample + book JD call | — |
| B139 | James Hilditch | BearJam | London/UK | "Yes, sometimes. Important part of the process." | No | Reply + send sample | — |
| C002 | @syntaxdiffusion | — | — | Interested — v4 reply sent | No | Send v4 follow-up | — |
| B009 | Syed Tabish Hasan | Zedtronix | — | Previously showed interest; Calendly nudge sent — gone cold | Send follow-up | — |
| B057 | Rheea Aranha | Vincent Studios | London/UK | Asked for sample by email — we asked for her email address | Await email address | — |
| B087 | Ibrahim Badi | IKM Marketing | London/UK | "Yes especially in regulated sectors" — answered 9 intake Qs inline; Creator Record makes sense as next step | COMP-B2 code sent Jun 8; await reply or form fill | — |
| B088 | Matthew Sergison-Main | OLIVER / Brandtech | London/UK | "Yes I am being asked this 100%" — strongest pain signal; works at OLIVER (Brandtech holdco) | B2B2B probe sent Jun 8: is requirement from brand legal or creative? If legal confirmed → Test 8 | — |
| B090 | Saira Macleod | Magnific | London/UK | Asked what the checker looks for — product question | Await reply — confirm JD call | — |
| B158 | Dan Lantry | Sonova Group | USA | "Would like to better understand the issue." VP Legal Affairs (North America), regulated healthcare brand. ICP 3 — brand legal officer whose requirement cascades to agencies. | Brief NY Law education + call ask Jun 18 [JD alias] | 2026-06-18 |
| B094 | Justin Lufair Brown | Amazon | LA | "Contract language tightened a lot in last 12 months... happy to go deeper if useful." Creative Producer AI Video Production. | Send call invite Jun 17 [Vanessa]: "Still open to that deeper conversation — would a 20-min call this week or next work?" | 2026-06-17 |
| B095 | Florent Delavous | Xtendency | Dubai/UAE | "Already working on something in this space" — CEO | Probe collab/competitor + book call | — |
| B099 | Sultan Alsuwaidi | Video tube | Dubai/UAE | "Yes — becoming standard now" — sample sent | Await reply | — |
| B126 | Phil Langer | Jung von Matt SPREE | Germany | Major holdco (JvM) — pitch + sample sent | Await reply | — |

---

## 3. Call Requested (6)

*The lead has expressed interest in a call, or confirmed a booking that didn't happen.*

| B-ID | Lead | Company | Geo | How They Requested | Last Action | Follow Up By |
|------|------|---------|-----|--------------------|-------------|--------------|
| B130 | Ivan Petruzzelli | State Street Investment Mgmt | London/UK | "We require a structured campaign brief with human summary + machine-readable payload (spreadsheet or JSON) for auditability across AI workflows." ICP 3 signal — State Street defining agency requirements. Format may differ from SI8 PDF output — needs clarification. | JD to draft reply before sending — probe whether requirement is IP provenance or campaign workflow data | 2026-06-17 |
| B143 | Simon Helm | — | England | "Feels very relevant, advising clients already. Can we chat?" | Ivy asked for Tue/Wed/Thu 9:30–10am UK slot Jun 8; await slot reply | 2026-06-12 |
| B011 | Hugo Barbera | HumAIn | — | Expressed interest — 2nd nudge sent | Sample or call offered | — |
| B043 | Luke Brady | Sublime Animations Ltd | London/UK | Confirmed calls 4x — all missed | 4th reschedule attempt sent Jun 8; move to Nurture if no reply by Jun 13 | 2026-06-13 |
| B045 | Mike Harris | Seenit | London/UK | "Thanks, booked!" via Calendly — no-show | Follow-up sent Jun 8; await reply | 2026-06-13 |
| B096 | Ankita Biswas | HTCreaTec | Dubai/UAE | "I'd love to know more and talk over a chat!" | Follow-up sent Jun 8; await reply | 2026-06-13 |

---

## 4. Call Scheduled (1)

*Call confirmed on calendar.*

| B-ID | Lead | Company | Geo | Call Date | Format | Prep Notes |
|------|------|---------|-----|-----------|--------|------------|
| B101 | Anas Bakal | Monoud Trading | Dubai/UAE | TBD (Calendly self-scheduled) | Calendly (JD leads) | 3-point structured reply Jun 22: (1) licensing AI tools for specific commercial use; (2) prompt logs/generation settings for provenance; (3) digital labeling/signature requirements from platform regulations. Title: AI Creative Director | Luxury Brand Experience Architect. Gate Qs: is documentation requirement written/contractual or conversational? AI campaign volume per month? Direct brand relationships or through agency? |

---

## 5. Call Taken (2)

*Discovery call completed. Notes filed in CRM.*

| B-ID | Lead | Company | Geo | Call Date | Key Signal | Next Action |
|------|------|---------|-----|-----------|------------|-------------|
| B089 | Oliyah Joseph + Paul (husband) | Visual Vibe | London/UK | May 25, 2026 | **Wrong ICP — AI images only, SMB/e-commerce clients, no legal friction.** Paul: "Never been asked for any documentation — just privacy NDAs." But validated thesis: "You are playing ahead — matter of time, give it 6 months." → [Call notes](call-notes/CALL-2026-05-25-B089-Oliyah-Joseph.md) | Nurture Q4 2026 when EU AI Act enforcement heats up. |
| B125 | Tim Deussen | XRBB | Germany | Jun 24, 2026 | **Advisory/partner call.** Gap validated: *"That is actually the chance — there's no company for front-to-back rights management in generative workflows."* Art. 50 framing confirmed correct. GTM rec: pilots at AI film festivals first, then panel talks on provenance. Acquisition mentioned unprompted ("they might just buy the company"). Advisor door open. → [Call notes](call-notes/CALL-2026-06-24-B125-TIM-DEUSSEN-XRBB.md) | Check in Jul 15 with a pilot result or new campaign signal. Track Fraunhofer FOKUS (EU C2PA broadcast research). |

---

## 6. Evaluating (0)

*Lead is in a decision window — sample reviewed, proposal received, or internally circulating.*

| B-ID | Lead | Company | Geo | Evaluating Since | What They Need | Follow Up By |
|------|------|---------|-----|------------------|----------------|--------------|
| — | — | — | — | — | — | — |

---

## 7a. Creator Submitted — Closed Won (0)

*Creator Record ($29) or SI8 Certified ($499) submission received. Revenue captured.*

| B-ID | Lead | Company | Geo | Tier | Submitted | Revenue |
|------|------|---------|-----|------|-----------|---------|
| — | — | — | — | — | — | — |

---

## 7b. Rights Verified Submitted — Closed Won (0)

*Agency or brand submitted on behalf of a client. B2B account active.*

| B-ID | Lead | Company | Geo | Client/Campaign | Tier | Submitted | Revenue |
|------|------|---------|-----|-----------------|------|-----------|---------|
| — | — | — | — | — | — | — | — |

---

## Lost (23)

*Explicitly declined, wrong ICP, or permanently closed.*

| B-ID | Lead | Company | Geo | Lost Date | Reason | Reactivate? |
|------|------|---------|-----|-----------|--------|-------------|
| B005 | Isaac Twidale | We Do Ads | — | 2026-03-15 | Call done — wrong ICP; asked for photorealistic portfolio (Gear B buyer, not Gear A) | Yes — when Showcase has 5+ films |
| B007 | Elaine Tan + Joseph Lee | The Media Shop | — | 2026-03-18 | Call done — media buying agency; Gear B/C profile, not Gear A | Yes — when Showcase has 5+ films |
| B018 | Carlos Cortiñas | Transmission | — | 2026-04-06 | "No thanks Vanessa" | No |
| B021 | Vignesh Ilangovan | Triken Studios | — | 2026-04-05 | Soft no | Q3 2026 |
| B028 | Keir Finlow-Bates | Artema LABS | — | 2026-04-07 | Wrong profile — CTO promoting own book | No |
| B029 | Ron David Ben Ishay | Liquidity Group | — | 2026-04-07 | "Uhno thnx" | No |
| B030 | Matthieu Fernandes | Sensai | — | 2026-04-07 | "No needs atm" — counter-pitched | No |
| B032 | Simon Lee | Vantage Branding | — | 2026-04-10 | "No thanks" after msg 3 | No |
| B033 | Tunde Olowo-Ake | Ingenium Communications | Lagos | 2026-04-10 | Off-geo — Lagos | No |
| B034 | Paul L | Excelsior-Studios | — | 2026-04-10 | "We don't use AI to create anything" | No |
| B037 | Mitch Turnbull | University of Bristol | — | 2026-04-10 | Academic researcher — wrong profile | No |
| B038 | Raúl Pineda Rojas | Monks | Mexico City | 2026-04-10 | Off-geo + "Gracias, no thanks" | No |
| B039 | Chee Wong | Opus Artz Ltd | — | 2026-04-07 | "Not within our remit" | No |
| B077 | Ricardo Barchan | Joolz Jewellery | — | 2026-04-22 | Wrong role — retoucher | No |
| B102 | Amr Tahtawi | Arizona State University | — | 2026-05-10 | Tried to charge SI8 $150 — consultant/educator | No |
| B097 | James Larkin | Saatchi & Saatchi | Dubai/UAE | 2026-06-09 | VOID — Lilly alias inaccessible; reply never sent | No |
| B105 | Ayman Hussein | — | Dubai/UAE | 2026-06-09 | VOID — Lilly alias inaccessible; reply never sent | No |
| B108 | Balendu Sharma Dadhich | AILGO | Dubai/UAE | 2026-06-09 | VOID — Lilly alias inaccessible; reply never sent | No |
| B124 | Sven Bliedung Von Der Heide | Volucap | Germany | 2026-06-09 | Wrong ICP — volumetric camera capture studio; proprietary AI stack, not Runway/Kling/Sora; does not produce AI video for clients | No |
| B132 | Mikhail Gulkov | Volna vision | Dubai/UAE | 2026-06-09 | VOID — Lilly alias inaccessible; reply never sent | No |
| B133 | Mohamed Samir | Emerald Group | Dubai/UAE | 2026-06-09 | VOID — Lilly alias inaccessible; reply never sent | No |
| B137 | Akbar Shaikh | Dept of Culture – Abu Dhabi | Dubai/UAE | 2026-06-09 | VOID — Lilly alias inaccessible; reply never sent | No |
| B140 | Stephane Jacob | Atlantic Venture Group | Dubai/UAE | 2026-06-09 | VOID — Lilly alias inaccessible; reply never sent | No |

<!-- sales-pipeline:end -->
