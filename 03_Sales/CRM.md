# SI8 Sales CRM

**Purpose:** Single source of truth for all active leads — agency/brand buyers (LinkedIn) and creators (Instagram). Used for pattern analysis, ICP refinement, and messaging decisions. Pipeline operations will move to Airtable once ICP and messaging are validated.

**Logging rule (added April 10, 2026):** Every response must be logged — good, bad, or generic. A polite pass, a thumbs-up, a "not for me," a "we don't use AI" — all of it goes in. Campaign and alias must be recorded for every entry. This is the only way to run campaign-level analysis on the full response pool, not just on leads that showed signal. No response is too small to log.

**Last updated:** April 24, 2026

---

## PIPELINE — Machine Readable
*Maintained by Claude. Updated whenever JD reports an action. Read by daily digest script.*
*Urgency: HIGH=flag after 3 days, MEDIUM=5 days, LOW=14 days, MONITOR=never auto-flag*
*follow_up_by: explicit date overrides auto-calc. Use YYYY-MM-DD or — for auto.*

<!-- pipeline:start -->
| id | name | company | type | stage | last_action_datetime | last_action | next_action | follow_up_by | urgency | status |
|----|------|---------|------|-------|---------------------|-------------|-------------|-------------|---------|--------|
| B001 | Leimi Zhou | WOMBO | buyer | Followed Up | 2026-04-24 | Nudge sent: documentation hits agencies first but creators next; relevant to WOMBO's direction [Vanessa] | Await reply | — | MEDIUM | waiting |
| B002 | Theodor Sandu | McCann/Unilever @ Omnicom | buyer | Followed Up | 2026-04-24 | Nudge sent: any initial thoughts on sample? offered JD call [Lilly] | Await reply; book call | — | MEDIUM | waiting |
| B003 | Hossein Jafari | Wowspot Ltd | buyer | Followed Up | 2026-04-24 | Nudge sent: referenced sample + ASA enforcement moving fast + offered quick call | Await reply; book call | — | HIGH | waiting |
| B004 | Troy Macdonald | HyFi Corp | buyer | Nurture | 2026-04-07 | Replied: "I don't think it's for me at this time. Happy to stay in touch." [Ivy] | Check in Q3 | 2026-07-01 | MONITOR | — |
| B005 | Isaac Twidale | We Do Ads | buyer | Nurture | 2026-03-15 | Discovery call done — asked for photorealistic portfolio examples | Re-engage as Gear B catalog buyer when Showcase has 5+ films | — | MONITOR | — |
| B006 | Rawand Latif | ARUBA CREATIVE | buyer | Followed Up | 2026-04-07 18:00 | v4 CaaS explanation + sample attached + Calendly | Await reply; book call | — | MEDIUM | waiting |
| B007 | Elaine Tan + Joseph Lee | The Media Shop | buyer | Nurture | 2026-03-18 | Discovery call done — media buying agency, Gear B/C profile not Gear A | Re-engage as catalog/licensing buyer when Showcase has 5+ films; Joseph Germany intro for expansion | — | MONITOR | — |
| B008 | Barney O'Kelly | AlixPartners | buyer | Followed Up | 2026-04-24 | Nudge sent: did you see the Chain of Title doc? offered 15-min JD call [Vanessa] | Await reply; book call | — | MEDIUM | waiting |
| B009 | Syed Tabish Hasan | Zedtronix | buyer | Followed Up | 2026-04-24 | Nudge sent: did you see the Chain of Title sample? offered JD call [Lilly] | Await reply; book call | — | MEDIUM | waiting |
| B010 | Bee Lin Ang | Stewardship Asia Centre | buyer | Followed Up | 2026-04-24 | Nudge sent: did you get a chance to look at the sample? offered JD call [Lilly] | Await reply; book call | — | MEDIUM | waiting |
| B011 | Hugo Barbera | HumAIn | buyer | Followed Up | 2026-04-24 | Nudge sent: are you back from Paris? offered slot next week with JD [Ivy] | Await reply; book call | — | HIGH | waiting |
| B012 | Ivan Ng | Bacon Creatives | buyer | Followed Up | 2026-04-03 | Pivot: SI8 as doc layer; asked about client stage | Await reply; Singapore use case | — | MEDIUM | waiting |
| B013 | Qaiser Mehmood | ECONROAD International | buyer | Followed Up | 2026-04-01 | Urban Drift PDF + Calendly | Await reply; book call | — | MEDIUM | waiting |
| B014 | Shahrman Nayan | onedash22 | buyer | Replied | 2026-04-03 | No action taken | Continue sequence msg 3 | — | MEDIUM | pending |
| B015 | William Tan | Tareo Digital Advisory | buyer | Lukewarm | 2026-04-01 | No action taken | Follow-up: have you had a chance to evaluate? | — | MEDIUM | pending |
| B016 | Mainul Islam | eSaviour Limited | buyer | Replied-Conditional | 2026-03-15 | No action | Re-engage once 2-3 sample works ready | — | LOW | pending |
| B017 | James Byrne | BeyondWords | buyer | Replied-Conditional | 2026-03-15 | No action | Re-engage once samples ready | — | LOW | pending |
| B018 | Carlos Cortiñas | Transmission | buyer | Polite Pass | 2026-04-06 | Replied "No thanks Vanessa" — closed | — | — | — | done |
| B019 | Cory Warfield | Starchild Music | buyer | Nurture | 2026-04-04 | Graceful exit sent | Soft referral mention if opportunity arises | — | MONITOR | — |
| B020 | Salem Al-Kuwari | SAM Strategic Access | buyer | Nurture | 2026-04-04 | Polite acknowledgment; not scheduling now | Check in Q3 | 2026-07-01 | MONITOR | — |
| B021 | Vignesh Ilangovan | Triken Studios | buyer | Soft No | 2026-04-05 | No action | Mark for Q3 follow-up | 2026-09-01 | MONITOR | — |
| B022 | Mark Johnson | SwiftScale AI | buyer | Lukewarm | 2026-04-01 | No action | Monitor — possibly wrong side of market | — | MONITOR | — |
| B023 | Amr Hamad | Stackline | buyer | Lukewarm | 2026-04-01 | No action | Follow up after ASA/IAB research complete | — | MONITOR | — |
| B024 | Chitra J | GrapheneAI | buyer | Followed Up | 2026-04-07 18:00 | Message 2: $499/90-min review + Chain of Title description + Calendly sent | Await reply; book call | — | MEDIUM | waiting |
| B025 | Aswini Ruidas | MediaX | buyer | Replied-Lukewarm | 2026-04-03 | Ivy confirmed on WhatsApp (+91 6296601182) | India market discovery — send v4 pitch via WhatsApp | 2026-04-10 | HIGH | pending |
| B026 | Dominic Ho | SYS.Studio | buyer | Nurture | 2026-04-07 | Replied: "I will let you know when we do need this service." [Lilly] | Check in Q3 | 2026-07-01 | MONITOR | — |
| B027 | Marc Danielle De Guzman | UnaFinancial | buyer | Followed Up | 2026-04-09 | Sample attached + asked for 15-20 min call with JD for product feedback [Lilly] | Await reply; book call with JD | — | MEDIUM | waiting |
| B028 | Keir Finlow-Bates | Artema LABS | buyer | Not a Fit | 2026-04-07 | Responded with book promotion — CTO, wrong profile for CaaS. [Ivy] | — | — | — | done |
| B029 | Ron David Ben Ishay | Liquidity Group | buyer | Polite Pass | 2026-04-07 | Replied "Uhno thnx" [Lilly — note: Msg 2 was signed Ivy, persona mismatch] | — | — | — | done |
| B030 | Matthieu Fernandes | Sensai | buyer | Not a Fit | 2026-04-07 | "No needs atm" + counter-pitched AI automation services. CMO, wrong buyer side. [Vanessa] | — | — | — | done |
| B031 | Steve Mcpartland | Visually Sonic | buyer | Followed Up | 2026-04-24 | Nudge sent: circled back + offered to send sample Chain of Title [Vanessa] | Await reply | — | HIGH | waiting |
| B032 | Simon Lee | Vantage Branding | buyer | Not Interested | 2026-04-10 | "no thanks" after msg 3 [Lilly] | — | — | — | done |
| B033 | Tunde Olowo-Ake | Ingenium Communications | buyer | Not a Fit | 2026-04-10 | 👍 reaction only — Lagos, off-geo [Lilly] | — | — | — | done |
| B034 | Paul L | Excelsior-Studios | buyer | Not a Fit | 2026-04-10 | "We don't use AI to create anything" [Lilly] | — | — | — | done |
| B035 | Jorge Enueve | ex1t.one | buyer | Polite Pass | 2026-04-10 | "Not for me at the moment" after msg 2 [Ivy] | Revisit Q3 if still active | 2026-09-01 | MONITOR | — |
| B036 | David Tamayo | Prose on Pixels | buyer | Replied-Warm | 2026-04-10 | "Big network with Legal team dedicated to AI" — aware of US vs global law differences; EU AI Act angle sent [Ivy] | Await reply | — | MEDIUM | waiting |
| B037 | Mitch Turnbull | University of Bristol | buyer | Not a Fit | 2026-04-10 | Academic researcher — hasn't produced AI for clients [Ivy] | — | — | — | done |
| B038 | Raúl Pineda Rojas | Monks | buyer | Polite Pass | 2026-04-10 | "Gracias por la información" — Mexico City, off-geo [Vanessa] | — | — | — | done |
| B039 | Chee Wong | Opus Artz Ltd | buyer | Not a Fit | 2026-04-10 | "Not within our remit" after msg 1 [Vanessa] | — | — | — | done |
| B040 | Hasan Sarwar | — | buyer | Replied-Warm | 2026-04-10 | "I'd love to see the Example Rights Package" — Vetting Takes Weeks msg 1 [Vanessa] | Send sample Chain of Title | — | MEDIUM | pending |
| B041 | Nourhan Mostafa | Ai Studio | buyer | Replied-Warm | 2026-04-13 | Described compliance process in detail + asked question back — "Creative Director – AI Content" title, strong signal; Egypt off-geo [Vanessa, Blocks AI msg#1] | Reply + explore use case; off-geo but high ICP signal | — | MEDIUM | pending |
| B042 | Shray Vaidya | Creative Chimps | buyer | Nurture | 2026-04-13 | "It might be in the future. Let's keep in touch." — soft nurture [Blocks AI msg#1, London] | Check in Q3 | 2026-07-01 | MONITOR | — |
| B043 | Luke Brady | Sublime Animations Ltd | buyer | Meeting Confirmed | 2026-04-24 | JD confirmed Fri Apr 24 10am UK — asked Zoom or WhatsApp | Await format reply; join call | 2026-04-24 | HIGH | confirmed |
| B044 | Shaun Yeo | Reel Loco Productions | buyer | Followed Up | 2026-04-18 | Sent Calendly link for JD call [Lilly] | Await booking | — | HIGH | waiting |
| B045 | Mike Harris | Seenit | buyer | Followed Up | 2026-04-24 | Nudge sent: offered to rebook if Monday didn't work; JD available next week [Ivy] | Await reply; book call | — | HIGH | waiting |
| B046 | Kd Pascall | Bluvision Studios | buyer | Replied-Warm | 2026-04-13 | "Of recent yes, before it was never an issue" — Legal Friction msg#1 [London] | Reply + explore current use case | — | MEDIUM | pending |
| B047 | Hugo Faustino | Canon EMEA | buyer | Nurture | 2026-04-23 | Declined call: "Thank you for feedback Vanessa, but no need for a meeting." [Vanessa] | Check in Q3 | 2026-07-01 | MONITOR | — |
| B048 | Piotr Nierobisz | Munchingsquare | buyer | Followed Up | 2026-04-18 | Positioned Chain of Title as the legal clearance doc; sent sample + offered JD call [Vanessa] | Await reply; book call | — | HIGH | waiting |
| B049 | Ruth Teasdale | Motion World Ltd | buyer | Replied-Warm | 2026-04-13 | P2: described licensed package process — Legal Friction [UK] | Reply + position SI8 as structured version of their informal process | — | MEDIUM | pending |
| B050 | Julia N'Diamoi | T&P | buyer | Replied-Warm | 2026-04-13 | P2: vetted AI tool stack process — Legal Friction msg#1 [UK] | Reply + position SI8 as documentation layer | — | MEDIUM | pending |
| B051 | Kiel Robinson | Ok let's play Studios | buyer | Replied-Warm | 2026-04-13 | P2: raw materials + metadata tracking — Legal Friction msg#1 [London] | Reply + send sample | — | MEDIUM | pending |
| B052 | Loewe Chung Nin Lee | — | buyer | Replied-Warm | 2026-04-13 | "started seeing this come up more recently" — Legal Friction msg#1 [UK] | Reply + send sample | — | MEDIUM | pending |
| B053 | Graham Vincent | grigio:london | buyer | Replied-Warm | 2026-04-13 | "Yes, of course" — confirms legal teams ask — Legal Friction msg#1 [London] | Reply + send sample | — | MEDIUM | pending |
| B054 | Steve Cholerton | Sentient Pictures | buyer | Nurture | 2026-04-13 | "one client has asked for metadata" — Hitting a Wall msg#1 | Monitor; re-engage when more clients ask | — | MONITOR | — |
| B055 | Owen Bryant | — | buyer | Nurture | 2026-04-13 | CD, not creating AI videos now but open to future | Check in Q3 | 2026-07-01 | MONITOR | — |
| B056 | Michael Christodoulou | MOI Global | buyer | Replied-Warm | 2026-04-19 | "Sure" — replied to sample offer (msg#3) [Vanessa] | Send sample Chain of Title | — | MEDIUM | pending |
| B057 | Rheea Aranha | Vincent Studios | buyer | Replied-Warm | 2026-04-19 | "Will be in touch at the time this is required. A sample of Chain of title via email would be helpful." (msg#4) [Ivy] | Send sample Chain of Title via email | — | MEDIUM | pending |
| B058 | Chun Man Chan | Dustinhill Productions | buyer | Replied-Lukewarm | 2026-04-21 | "As of now no... Why do you ask?" — uses AI in production pipeline but not 100% AI final output; Singapore [Lilly] | Reply + explain regulatory trend; nurture for Q3 | — | LOW | pending |
| B059 | Alan Geoy | Antigravity Studio | buyer | Replied-Lukewarm | 2026-04-17 | "limited to certain ai tools that are approved by agencies/clients" — tool approval gate; Singapore [Lilly] | Reply + probe which tools; client-dictated approved-tool policy = secondary ICP signal | — | LOW | pending |
| B060 | Konstantin Dimitrov | Pathbind Games | buyer | Replied-Lukewarm | 2026-04-06 | "Do you mind rephrasing the question to elaborate?" — asked for clarification [Vanessa] | Reply with clearer description | — | LOW | pending |
| B061 | Jay Pirabakaran | JAYPRINTS Studio | buyer | Followed Up | 2026-04-24 | Msg#2 sent: echoed rights/likeness/usage, introduced Chain of Title, offered sample or 15-min JD call [Ivy] | Await reply — sample or call | — | HIGH | waiting |
| B062 | Quim Español | Monks | buyer | Replied-Warm | 2026-04-22 | "bigger companies have more questions about tooling, gen AI models" — CD, Amsterdam [SI8_Legal Friction] | Reply + send sample | — | MEDIUM | pending |
| B063 | Kees-Jan Husselman | — | buyer | Replied-Warm | 2026-04-22 | ACTIVE AI avatar project; legal team involved in every step — Director/editor, Amsterdam [SI8_Legal Friction] | Reply + position as structured doc layer | — | HIGH | pending |
| B064 | Oscar Julius Marmelstein | The Shed Editing | buyer | Replied-Warm | 2026-04-22 | Informal logs, "flying over the Atlantic soon" — Founder, Amsterdam [SI8_Legal Friction] | Reply + send sample | — | MEDIUM | pending |
| B065 | Christiaan Compaan | — | buyer | Replied-Warm | 2026-04-22 | Pre-production sourcing, informal process — Freelance GenAI, Amsterdam [SI8_Legal Friction] | Reply + position as structured Chain of Title | — | MEDIUM | pending |
| B066 | Uli Redkina | — | buyer | Replied-Warm | 2026-04-22 | Contract-based, informal rights management — Creative AI Producer, London [SI8_Legal Friction] | Reply + position SI8 as formalized version | — | MEDIUM | pending |
| B067 | Alena Stepanova | Philip Morris | buyer | Replied-Lukewarm | 2026-04-22 | Manager Content Intelligence & Gen AI — client-side (brand), wrong role but asked follow-up question [SI8_Legal Friction, London] | Reply — probe if they commission AI video from agencies | — | LOW | pending |
| B068 | Marchel De Haan | Palo Alto Networks | buyer | Replied-Lukewarm | 2026-04-22 | "some do and some don't" — Associate CD EMEA & LATAM, Amsterdam [SI8_Legal Friction] | Follow up; not urgent yet | — | LOW | pending |
| B069 | Shahrukh Kazmi | — | buyer | Replied-Lukewarm | 2026-04-22 | "some legal teams are starting to ask" — Freelance AI design Specialist, Amsterdam [SI8_Legal Friction] | Reply; monitor | — | LOW | pending |
| B070 | Marinus Bergsma | SocialNow | buyer | Replied-Lukewarm | 2026-04-22 | Makes everything in AI; "always clear" upfront — Founder & Creative Art Director, Amsterdam [SI8_Legal Friction] | Reply; explore if clients ask for docs | — | LOW | pending |
| C006 | Essa | — (Hong Kong) | creator | Followed Up | 2026-04-07 20:00 | v4 re-pitch sent via WhatsApp — docs model, revised commission, comp CR codes offered, MyVideo still active | Await reply | — | MEDIUM | waiting |
| C001 | keeper505 | — | creator | Followed Up | 2026-04-09 | Follow-up message sent — no reply yet | Await reply; create COMP-KEEPER in Stripe only when she confirms interest | — | MEDIUM | waiting |
| C002 | @syntaxdiffusion | — | creator | Interested | 2026-03-29 | v4 reply sent | Send v4 follow-up | — | MEDIUM | pending |
| C003 | @rodszera.ai | — | creator | Interested | 2026-03-29 | v4 reply sent | Send v4 follow-up explaining 2 films is enough | — | MEDIUM | pending |
| C004 | @absolutely.ai | — | creator | Interested | 2026-03-29 | v4 reply sent | Send v4 follow-up | — | MEDIUM | pending |
| C005 | shingo4987 | — | creator | Nurture | 2026-03-29 | v4 reply sent | Follow his work; reconnect on next release | — | MONITOR | — |
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
| Replied — Hot (follow-up urgent) | 3 |
| Replied — Warm | 23 |
| Replied — Conditional | 4 |
| Replied — Lukewarm | 14 |
| Nurture | 6 |
| Polite Pass | 39 |
| Not a Fit | 25 |
| **Total Named Responses** | 122 |
| **Total Leads Contacted** | ~1,100+ |

---

### 🔥 Hot — Follow Up Immediately

| Name | Company | Title | Location | Campaign | Stage | Their Response (Summary) | Next Step |
|------|---------|-------|----------|----------|-------|--------------------------|-----------|
| **Jay Pirabakaran** | JAYPRINTS Studio | Founder & AI Creative Director | London | SI8_Legal Friction | Followed Up | Msg#2 sent Apr 24 — echoed rights/likeness/usage, introduced Chain of Title, offered sample or 15-min JD call [Ivy] | Await reply — sample or call | 2026-04-28 | HIGH | waiting |
| **Hossein Jafari** | Wowspot Ltd. | Managing Director | London | SI8_Legal Friction | Followed Up | 👍 then: *"You're right about the documentation; since the 2026 ASA and IAB updates, it's become a standard requirement for London projects. Having your team follow these disclosure rules is the best way to keep the campaign's copyright and IP safe under UK law."* | Apr 1 — conversational reply sent with Urban Drift PDF, Runway/Kling vs Firefly gap, asked for call | Await reply; book call |
| **Troy Macdonald** | HyFi Corp | Chairman of the Board & CEiR | Miami | SI8_Hitting a Wall | Replied — Conditional | "Hi Ivy, sure send a sample and then lets arrange a call." | Apr 3 — Urban Drift Chain of Title PDF sent (attached); Calendly link included | Await reply; book call |
| **Luke Brady** | Sublime Animations Ltd | Founder | UK | SI8_Legal Friction | Meeting Rescheduled | Apr 21 call missed — "had some issues crop up"; rescheduled to Fri Apr 24 | JD calls Fri Apr 24 | 2026-04-24 | — |

**Why Jay matters:** Founder & AI Creative Director — he's on the production side AND the decision maker. Response named three specific liability types (rights, likeness, usage) unprompted and confirmed it's now a campaign approval gate. Highest P2 signal from msg#1 to date — exceeds Hossein's response level.

**Why Hossein matters:** He's a London MD who unprompted validated SI8's entire premise — documentation is now standard in London due to ASA/IAB 2026 updates. This is the first contact who has confirmed a regulatory/industry driver without prompting.

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
| **Hugo Barbera** | HumAIn | AI Director | Paris | SI8_Hitting a Wall | Meeting Requested | Fully engaged: "if you can do that report for me, it's interesting with the higher price — we only do it when clients ask and it's time-consuming." Wants to meet week of Apr 21 after Paris trip. | Apr 10 — meeting confirmation reply sent [Ivy] | Confirm week of Apr 21; book call |
| **Ivan Ng** | Bacon Creatives | Creative Consultant | Singapore | SI8_Hitting a Wall | Replied — Warm | "No this has not come up. But one of the creative agencies I consult with may be looking for a new AI partner to bring their AI influencer to life. Is this something you guys do?" | Apr 3 — pivot reply sent: clarified SI8 is documentation layer not production; if agency is building AI influencer, they'll need Chain of Title when it goes live; asked what stage they're at | Await reply — Singapore ICP, has a live client use case |
| **Leimi Zhou** | WOMBO | Digital Marketing Strategist & Video Artist | London | SI8_Legal Friction | Replied — Lukewarm | "I've never been asked for documentation on my process. Why do you ask? Just curious" | Apr 3 — educational reply: explained IAB January framework, ASA robot puppy ruling, EU AI Act August; offered to send sample | Await reply — WOMBO is an AI company; good market research data point regardless |
| **Chitra J** | GrapheneAI | Creative Head | Bengaluru, India | SI8_Hitting a Wall | Replied — Warm | "This is exactly what we need! We've been struggling to get our AI-generated content approved by clients." Described exact SI8 pain point unprompted. | None yet | Send Message 2: 90-min review, $499, Chain of Title deliverable, offer 15-min call |
| **Aswini Ruidas** | MediaX | Sales Manager | Durgapur, India | SI8_Hitting a Wall | Replied — Lukewarm | Suggested Telegram; when declined, offered WhatsApp: +91 6296601182 | Ivy confirmed on WhatsApp | India market discovery test — elevated to HIGH. Send v4 pitch via WhatsApp. Note: MediaX/FinTech PR is off-sector but contact is live on WhatsApp and India is being tested. |
| **Shaun Yeo** | Reel Loco Productions | Creative Business Director | Singapore | SI8_Hitting a Wall | Replied-Warm | Wants 15-min call next week (msg#2) | None | Book 15-min call |
| **Mike Harris** | Seenit | Product Manager | London | SI8_Legal Friction | Replied-Warm | "open to finding out more and a short call" (msg#2) | None | Book short call |
| **Piotr Nierobisz** | Munchingsquare | CD & Founder | UK | SI8_Blocks AI | Replied-Warm | "would not pitch AI campaign without clearing with client legal" — self-imposed gate (msg#1) | None | Reply + send sample |
| **Kd Pascall** | Bluvision Studios | Creative Director | London | SI8_Legal Friction | Replied-Warm | "Of recent yes, before it was never an issue" — pain is recent + growing (msg#1) | None | Reply + probe current use case |
| **Ruth Teasdale** | Motion World Ltd | Director & Client Lead | UK | SI8_Legal Friction | Replied-Warm | P2 informal process: "we use licensed packages" — has workaround, doesn't have structured docs | None | Reply + position SI8 as the structured version |
| **Julia N'Diamoi** | T&P | Creative Technologist | UK | SI8_Legal Friction | Replied-Warm | P2 informal process: vetted AI tool stack; knows which tools are "brand safe" (msg#1) | None | Reply + position SI8 as documentation layer on top of their existing process |
| **Kiel Robinson** | Ok let's play Studios | Filmmaker | London | SI8_Legal Friction | Replied-Warm | P2 informal process: tracks raw materials + metadata per project (msg#1) | None | Reply + send sample — already does the work, SI8 formalizes it |
| **Loewe Chung Nin Lee** | — | AI Video & Digital Content Producer | UK | SI8_Legal Friction | Replied-Warm | "started seeing this come up more recently" — early mover signal (msg#1) | None | Reply + send sample |
| **Graham Vincent** | grigio:london | Creative Director | London | SI8_Legal Friction | Replied-Warm | "Yes, of course" — confirms legal teams routinely ask; London CD (msg#1) | None | Reply + send sample |
| **Michael Christodoulou** | MOI Global | Creative Director EMEA & NAM | London | SI8_Blocks AI Campaign | Replied-Warm | "Sure" — replied to sample offer on msg#3 | None | Send sample Chain of Title |
| **Rheea Aranha** | Vincent Studios | Creative Director | London | SI8_Hitting a Wall | Replied-Warm | "We will be in touch at the time this is required. A sample of Chain of title via email would be helpful." — msg#4; explicitly asked for sample | None | Send sample Chain of Title via email |
| **Kees-Jan Husselman** | — | Director / Editor | Amsterdam | SI8_Legal Friction | Replied-Warm | ACTIVE AI avatar project; legal team involved at every step — "we keep records of what was used" (msg#1) | None | Reply + position SI8 as the structured doc layer for their existing process |
| **Quim Español** | Monks | Creative Director | Amsterdam | SI8_Legal Friction | Replied-Warm | "bigger companies have more questions about tooling, gen AI models" — Monks CD means scale + holdco clients (msg#1) | None | Reply + send sample |
| **Oscar Julius Marmelstein** | The Shed Editing | Founder | Amsterdam | SI8_Legal Friction | Replied-Warm | Informal logs; "flying over the Atlantic soon" — keeps informal records but not structured docs (msg#1) | None | Reply + send sample; offer to connect when he's in transit |
| **Christiaan Compaan** | — | Freelance GenAI | Amsterdam | SI8_Legal Friction | Replied-Warm | Pre-production sourcing; informal process — Hugo Barbera-type: does the work but no Chain of Title output (msg#1) | None | Reply + position as structured Chain of Title |
| **Uli Redkina** | — | Creative AI Producer | London | SI8_Legal Friction | Replied-Warm | Contract-based, informal rights management — tracks rights per project but no formal documentation output (msg#1) | None | Reply + position SI8 as formalized version of their current process |

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
| **Steve Cholerton** | Sentient Pictures | Owner | UK | SI8_Hitting a Wall | "one client has asked for metadata" (msg#1) | Early signal — one client asking. Not ready yet. Re-engage when volume increases. |
| **Owen Bryant** | — | Creative Director | UK | — | Not currently creating AI videos but open to future | Check in Q3 when they may have started. |
| **Chun Man Chan** | Dustinhill Productions | Creative Director | Singapore | SI8_Hitting a Wall | "As of now no... Why do you ask?" — uses AI only to speed up pipeline; final output is 3D/Film capture not 100% AI (msg#1) | Not ready. Singapore. Check in Q3 when they start full AI output. |
| **Alan Geoy** | Antigravity Studio | Lead Motion Designer & GenAI Specialist | Singapore | SI8_Hitting a Wall | "It hasn't come up to me, but we are limited to certain ai tools that are approved by agencies/clients." (msg#1) | Singapore signal — client-dictated tool approval policy is an ICP signal. They're inside the compliance gate already; SI8 documents the output. Reply + probe which tools are on their approved list. |
| **Konstantin Dimitrov** | Pathbind Games | Creative Director | Ware, UK | SI8_Blocks AI Campaign | "Do you mind rephrasing the question to elaborate?" — asked for clarification (msg#1) | Low signal — curiosity or genuine confusion. Send clearer description of service. |
| **Marchel De Haan** | Palo Alto Networks | Associate CD EMEA & LATAM | Amsterdam | SI8_Legal Friction | "some do and some don't" (msg#1) | Pain is partial — some clients ask, some don't. Not urgent yet. Amsterdam batch. |
| **Shahrukh Kazmi** | — | Freelance AI Design Specialist | Amsterdam | SI8_Legal Friction | "some legal teams are starting to ask" (msg#1) | Early signal — awareness is growing but not at a gate yet. Amsterdam batch. |
| **Marinus Bergsma** | SocialNow | Founder & Creative Art Director | Amsterdam | SI8_Legal Friction | Makes everything in AI; "always clear" upfront with clients (msg#1) | Interesting: proactively discloses AI use but without structured docs. Explore if clients need a Chain of Title. Amsterdam batch. |
| **Alena Stepanova** | Philip Morris | Manager Content Intelligence & Gen AI | London | SI8_Legal Friction | Client-side (brand) — asked follow-up question after msg#1 | Wrong role (brand-side, not agency/production). But senior AI content role at a major brand — may commission AI video from agencies. Probe if they set documentation requirements for their agencies. |

---

### ⚪ Polite Pass — Closed

| Name | Company | Title | Location | Campaign | Alias | Response Summary |
|------|---------|-------|----------|----------|-------|-----------------|
| David O'Beirne | Quietly Good | Founder | London | — | — | "Not in a position to work with you at the moment, but hope this will change soon." — Nurture potential; warm tone |
| William Lim | SHEIN | Director, PR APAC | Singapore | — | — | "Interesting solution, but no current need" — PR role, not creative/production |
| George Arbid | Unreal Engine UAE / Ardor Ideas | Lead Organizer | Abu Dhabi | — | — | "Not interested right now" |
| Pauline Sayers | GPS Marketing & Distribution | Director | Woking | — | — | "Not for me thank you" |
| Iona Milne | Reg&Partners | Partnerships Manager | London | — | — | "This isn't relevant for me" |
| Benedict Chow | EFC International | — | Singapore | — | — | "Not looking to arrange a call, will keep in mind" |
| Kimberly Fravil | Mercer | — | Singapore | — | — | "No thank you" |
| Jeevan Thavasukannu | Flash Health | — | Singapore | — | — | "Will reach out if needed" |
| Muhammad Ishaq Khan | Somi Buzz | — | London | — | — | "Not in need at the moment" |
| Troy James Maclean | ASCENDEA | — | Sydney | — | — | "No thank you Lily" |
| Beng Huan Tey | Podium | — | Singapore | — | — | Wrong fit |
| Leopold Cox | Mahleon | — | London | — | — | "Not interested but happy to keep in touch" |
| Jenny Brett | First Brand Kit | — | London | — | — | "None of my clients are looking for AI videos right now" |
| Guy Azouri | Private Investment Group | CTO / Lead AI & Technology Architect | London | — | — | "Thanks but not interested" |
| Cory Warfield | Starchild Music | Chief Growth Officer | Chicago | Hitting a Wall | Ivy | "It hasn't" (re: legal rejection problem) — graceful exit sent |
| Barış Buhar | Freelance Motion Designer | Motion Designer | Ankara | — | — | "I don't have this problem right now, but I'll definitely write to you when I do" |
| Carlos Cortiñas | Transmission | — | London | Hitting a Wall | Vanessa | "No thanks Vanessa" — closed Apr 6, 2026 |
| Simon Lee | Vantage Branding | Managing & Creative Director | Singapore | Hitting a Wall | Lilly | "no thanks" — after msg 3 |
| Jorge Enueve | ex1t.one | Creative Director | UK | Hitting a Wall | Ivy | "Thank you, Ivy. However, it's not for me at the moment." — after msg 2 |
| Raúl Pineda Rojas | Monks | VP Creativo | Mexico City | Blocks AI Campaign | Vanessa | "Gracias por la información Vanessa" — after msg 2 |
| Ali Thompson | RARE 80 | Director | — | Legal Friction | — | Polite pass — untracked response found in CSV export |
| Cathy Bracher | Active Planning Leads | Managing Director | — | Legal Friction | — | Polite pass — untracked response found in CSV export |
| Helen Niland | Made In England Creative | Creative Director | London | Hitting a Wall | Ivy | "Not at the moment but I'll bear you in mind." — msg#3 |
| Richard Smith | MiddleSmith | Creative Director | London | Blocks AI Campaign | Lilly | "Should that be subject to change I'll let you know." — msg#2 |
| Joseph Clark | Oh Studio | Creative Director | London | Blocks AI Campaign | — | "Not a scenario I've encountered I'm afraid! Lovely to connect." — msg#1 |
| Mar Vin Foo | iMerv Digital | Founder & Principal | Singapore | Trusted AI Supplier | Vanessa | "Hi Vanessa" — minimal reply to msg#3, no signal |
| Katalin Marton | — | — | — | — | — | Polite pass — Apr 13 CSV |
| Fatima Isse | River Lake Studios | Creative Director | London | SI8_Hitting a Wall | Ivy | "I don't currently work with AI-generated video content, so it hasn't come up in my work directly." — not a fit; moved to Not a Fit section |
| Sara Orfali | — | — | — | — | — | Polite pass — Apr 13 CSV |
| Dan Ablan | Association of International Certified Professional Accountants | Creative Director | Greater Chicago Area | SI8_Blocks AI Campaign | Vanessa | "We're all set internally for now but if it changes I'll reach out." — US, off-geo |
| Rory Woodbridge | — | — | — | — | — | Polite pass — Apr 13 CSV |
| Elliott Prompts | — | — | — | — | — | Polite pass — Apr 13 CSV |
| Margarita Repina | Atelier Catalyst | Founder & Creative Director | UK | SI8_Hitting a Wall | Ivy | "it's my basic rule to have a contract always 😊" — contract-minded but no AI video use case confirmed |
| Derek Bender | — | — | — | — | — | Polite pass — Apr 13 CSV |
| Stuart Parker | Ted Experience | Client Development Director | London | SI8_Documented Provenance | Vanessa | "Thanks Vanessa - I'll keep yiu in mind 🙏" (msg#4) |
| Ajibola Olayiwola | — | — | — | — | — | Polite pass — Apr 13 CSV |
| Kamal Chugh | StepOut | Creative Director | Gurgaon, India | SI8_Hitting a Wall | Lilly | "We have an inhouse team" — India off-geo |
| Joey Johnson | Mother | Creative Director | Los Angeles | SI8_Blocks AI Campaign | Vanessa | "not relevant to our working process at this time" (msg#2) — US, off-geo |
| Robert Nyquist | Wootly | Co-Founder | Bristol | SI8_Blocks AI Campaign | Vanessa | "Not something we would use but thanks" (msg#3) |
| Andy Vasey | Channel 4 | Creative Director | London | SI8_Hitting a Wall | Ivy | "Not something for me right now" (msg#4) |
| Richard Silbermann | Brand Remedy | Creative Director | Brentford | SI8_Hitting a Wall | Ivy | "Not something we need right now, but thanks for the info" (msg#2) |
| Kat Buckley | Good Yolk | Director & Co-Founder | London | SI8_Documented Provenance | Vanessa | "Not what I'm looking for right now, but I'll keep you guys in mind" (msg#1) |
| Mos . | intent.ly | Global Partnerships Director | UK | SI8_Documented Provenance | Lilly | "Not for us thank you!" (msg#2) |
| Rejoice Bhila | Careconnectshow | Director | Epping, UK | SI8_Documented Provenance | Lilly | "Thanks Lilly. Will be in touch." (msg#2) — healthcare/community, wrong profile |
| Michael Sandiford | 7video Ltd | Production Manager | UK | SI8_Legal Friction | — | "No they're not" — clients don't ask for documentation; production manager (not CD/decision maker) |

---

### ⛔ Not a Fit — Closed

| Name | Company | Title | Location | Campaign | Alias | Reason / Response |
|------|---------|-------|----------|----------|-------|------------------|
| Mikhail Rakov | Self-Employed | Audiodrama Director | London | — | — | Audio, not video |
| Mubarak Ali | Human Intelligence Movement / FinTech Academy | Board Advisor | Singapore | — | — | Academic/policy, not a buyer |
| Cove Overley Emba | Toy Exploder | Chief Explosive Agent | Hong Kong | — | — | "No plans to incorporate AI video" |
| David Aston | Clubworld Travel | Social Media Coordinator | London | — | — | AR software, not AI video |
| Richard Clark | boodsta | — | London | — | — | Pushback on assumptive opener |
| Charlie Mcneill Love | afoofa.io | — | London | — | — | Pushback on assumptive opener |
| Starcom / Gavin | Stellantis | — | London | — | — | Authenticity concern ("are you a real person?") |
| Uma Rudd Chia | OH MY STRAWBERRY | — | Singapore | — | — | AI creator, not buyer — wrong side of market |
| Vanesse Ang | VAN Consultancy | — | Singapore | — | — | Not in business |
| Roman Zincenko | IC Publications | Commercial Director | UK | — | — | "I don't do AI videos for clients" |
| Daniel Kwintner | ShowTex Asia | Branch Manager | Tokyo | — | — | Prefers organic content; clients share that preference — no AI video use case |
| Giulia Willcox | Instituto de Tecnologia e Sociedade (ITS Rio) | Professor | Rio de Janeiro | — | — | Academic/researcher — not a buyer; educational reply sent; Brazil off-target geography |
| Paul L | Excelsior-Studios | Co-Founder | London | Blocks AI Campaign | Lilly | "We don't have one because we don't use AI to create anything really." |
| Tunde Olowo-Ake | Ingenium Communications | Creative Director | Lagos | Blocks AI Campaign | Lilly | 👍 reaction only — Lagos, off-geo |
| Mitch Turnbull | University of Bristol | Senior Research Associate | Bristol | Hitting a Wall | Ivy | "I've not produced AI generated image content for clients — I would also make sure that I generate an AI disclosure document if I did." |
| Keir Finlow-Bates | Artema LABS | CTO | — | Hitting a Wall | Ivy | Responded with book promotion — wrong profile for CaaS |
| Ron David Ben Ishay | Liquidity Group | — | — | Hitting a Wall | Lilly | "Uhno thnx" |
| Matthieu Fernandes | Sensai | CMO | — | Blocks AI Campaign | Vanessa | "No needs atm" — counter-pitched AI automation services |
| Chee Wong | Opus Artz Ltd | Creative Director & CEO | London | Blocks AI Campaign | Vanessa | "Hi. not sure, it's not something we encountered or is within our remit" |
| Samuel Levesley-Turner | Point8 | Creative Director | London | Hitting a Wall | Ivy | "We don't produce AI content at all and never will." — msg#2 |
| Vijendra Kunwar Mmc | Fitter Circle | Founder | London | Documented Provenance | Vanessa | "We don't recommend any AI videos" — fitness vertical, wrong fit |
| Vigneshwaran Velusamy | Octupus.ai | Co-Founder | London | Trusted AI Supplier | Ivy | Counter-pitched SEO/web dev services — wrong side of market |
| Anas Nasir | Magentus | Training Lead (Pathology) | London | Blocks AI Campaign | Lilly | "Not something I'd be interested in" — healthcare training, wrong role |
| Nuray Dal Ulualan | — | — | — | — | — | Counter-pitched AI presales tool — wrong side of market |
| Jaron Goh | BitCyber | Channel Account Exec | Singapore | SI8_Hitting a Wall | Lilly | "I'm not focusing on my production business right now" — cybersecurity firm, no AI video use case |
| Lev Myskin | Fame | Content Strategy Consultant | Wolverhampton | SI8_Blocks AI Campaign | Vanessa | "I abhor AI videos, campaigns, and anything that takes employment away from highly trained real people." — strong anti-AI; do not re-engage |
| Francis Oldfield | Cheddar Media | Creative Director | Hong Kong SAR | SI8_Hitting a Wall | Lilly | "I'm not in video production. More in the brand strategy and identity space." (msg#1) |
| Hans Olof Karlsson | Mimir LLC VR/3D Creative Agency | CTO & Co-Founder | Gifu, Japan | SI8_Hitting a Wall | Ivy | "We are not making AI video. We make VR and 3D models :)" (msg#1) |
| Tom Readdy | Yes Please Productions | Creative Director | London | SI8_Hitting a Wall | Ivy | "we don't use any AI" (msg#2) |
| Fatima Isse | River Lake Studios | Creative Director | London | SI8_Hitting a Wall | Ivy | "I don't currently work with AI-generated video content, so it hasn't come up in my work directly." (msg#1) |
| Rogier De Leeuw | Qogni | Frontend Developer | Amsterdam | SI8_Legal Friction | — | "Nope" — wrong role; tech/dev, not creative (msg#1) |
| Niloufar Davoudianfar | WPP/Dyson | Creative Designer | Netherlands | SI8_Legal Friction | — | "I'm not doing this" — designer role, not CD/decision maker; doesn't deliver AI video to clients (msg#1) |
| Joshua Wood | Booking.com | Director Business Travel | Amsterdam | SI8_Legal Friction | — | Wrong role and use case — travel operations, no AI video production (msg#1) |
| Richard De Veer | Bolt | Sales Operations | Amsterdam | SI8_Legal Friction | — | "only does AI for himself" — wrong role; sales ops, not content/creative (msg#1) |
| Ilias Chatzatoglou | — | Freelance Cloud Engineer | Amsterdam | SI8_Legal Friction | — | Wrong role — cloud engineering, no AI video production (msg#1) |
| Kevin Rooi | Joe Public Amsterdam | Graphic Designer | Amsterdam | SI8_Legal Friction | — | "I'm a designer" — wrong role; no AI video delivery to clients (msg#1) |
| Tjaša Lea Kosmatin | — | Social Media Designer | Amsterdam | SI8_Legal Friction | — | "i dont deliver ai generated videos" — wrong role; social media content, not campaign AI video (msg#1) |
| Neil Hanratty | Reddit | Creative Strategist | Amsterdam | SI8_Legal Friction | — | Anti-AI content policy at Reddit level — platform constraint blocks use case entirely (msg#1) |
| Efe Anidi | Framecoda | Developer | London | SI8_Legal Friction | — | Wrong role — developer, not creative/production (msg#1) |

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

**⚠️ Source of truth:** This section is derived from `03_Sales/outreach/LINKEDIN-CAMPAIGN-ANALYSIS.md`. When updating the ICP thesis, read that file first — do not define the ICP here and backfill it into the campaign analysis. Data flows one way: LinkedIn responses → campaign analysis → this section. See `03_Sales/SALES-INTELLIGENCE-ARCHITECTURE.md` for the full hierarchy.

---

### Buyer ICP (Agency / Brand)

**Last updated: April 10, 2026 — based on ~65 named responses across ~1,000+ contacts**

---

#### Geography Analysis

| Location | Warm/Hot/Conditional | Polite Pass | Not a Fit | Signal Quality |
|----------|---------------------|-------------|-----------|----------------|
| **London** | 8 | 9 | 6 | **High** — when they respond, they mean it; Leimi Zhou (WOMBO) adds AI company signal; April batch added Paul L (no AI), Jorge Enueve (soft pass), Chee Wong (not in remit) |
| **Singapore** | 3 (Ivan Ng = warm pivot; others wrong type) | 6 | 2 | Rising — Ivan Ng is first Singapore lead with a live client use case; Simon Lee (Vantage Branding, MD) hard passed Apr 10 — doesn't change verdict |
| **Paris / EU** | 2 (Hugo Barbera — meeting requested; David Tamayo — probe sent) | 0 | 0 | Growing signal — EU AI Act August deadline; Hugo confirmed interest Apr 10; David Tamayo (Prose on Pixels, Creative AI Director) engaged with EU law awareness; await his reply |
| Miami / US | 1 (Troy Macdonald — conditional) | 0 | 0 | Isolated — US off-strategy Year 1, but responds when pain is real |
| India | 2 (Chitra J = warm; Aswini = off-sector) | 0 | 1 | Emerging signal — Chitra unprompted described exact SI8 pain. Future discovery test flagged. Not Year 1 primary. |
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

**3rd conversion pathway — confirmed April 10, 2026 (Hugo Barbera signal):**
> **AI Director or practitioner at an AI-specialist agency who already produces Chain of Title type reports themselves but finds it costly or time-consuming.** These contacts answer "no" to "do you have this problem?" because they've solved it informally. The entry point is not the compliance gap — it's workflow efficiency. "We only do it when clients ask and it's time-consuming" = the outsource signal. Different opener needed: focus on whether their current process produces documentation that travels with the file and satisfies the IAB framework's specific requirements, not whether they have a compliance problem.

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
