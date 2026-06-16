# SI8 Sales CRM

**Purpose:** Single source of truth for all active leads — agency/brand buyers (LinkedIn) and creators (Instagram). Used for pattern analysis, ICP refinement, and messaging decisions. Pipeline operations will move to Airtable once ICP and messaging are validated.

**Logging rule (added April 10, 2026):** Every response must be logged — good, bad, or generic. A polite pass, a thumbs-up, a "not for me," a "we don't use AI" — all of it goes in. Campaign and alias must be recorded for every entry. This is the only way to run campaign-level analysis on the full response pool, not just on leads that showed signal. No response is too small to log.

**Last updated:** Jun 16, 2026 (B143 Simon Helm slot nudge sent; B130 Ivan Petruzzelli format probe sent; B087 follow_up_by extended to Jun 23; B152 + B153 still BLOCKED; B027 Marc De Guzman connection accepted + gate question sent; B095 Florent Delavous connection accepted + compare-notes sent; B096 Ankita Biswas final nudge sent; B100 Ramez Tabshi re-engagement sent)

---

## PIPELINE — Machine Readable
*Maintained by Claude. Updated whenever JD reports an action. Read by daily digest script.*
*Urgency: HIGH=flag after 3 days, MEDIUM=5 days, LOW=14 days, MONITOR=never auto-flag*
*follow_up_by: explicit date overrides auto-calc. Use YYYY-MM-DD or — for auto.*

<!-- pipeline:start -->
| id | name | company | type | stage | last_action_datetime | last_action | next_action | follow_up_by | urgency | status |
|----|------|---------|------|-------|---------------------|-------------|-------------|-------------|---------|--------|
| B001 | Leimi Zhou | WOMBO | buyer | Nurture | 2026-04-24 | Sample sent Apr 7 (Urban Drift PDF) + asked "does this match what you'd expect?" — no reply. Nudge sent Apr 24 (WOMBO angle) — no reply. [Vanessa] | Q3 check-in — EU AI Act August deadline is natural re-engage hook | 2026-07-01 | MONITOR | — |
| B002 | Theodor Sandu | McCann/Unilever @ Omnicom | buyer | Followed Up | 2026-06-16 | Lilly handoff 5/24; connection accepted Jun 16; JD sent gate question: "at McCann, when AI video goes through for approval, are clients or their legal teams asking for documentation on the tools and assets used? Curious whether it's showing up at holdco level yet." [JD personal] | Await reply | 2026-06-19 | HIGH | waiting |
| B003 | Hossein Jafari | Wowspot Ltd | buyer | Nurture | 2026-04-27 | Replied to nudge: "fully booked with high-stakes launches, can't jump on call — looks like you've done the heavy lifting, just get final legal tick from specialist" | Check in Q3 | 2026-07-01 | MONITOR | — |
| B004 | Troy Macdonald | HyFi Corp | buyer | Nurture | 2026-04-07 | Replied: "I don't think it's for me at this time. Happy to stay in touch." [Ivy] | Check in Q3 | 2026-07-01 | MONITOR | — |
| B005 | Isaac Twidale | We Do Ads | buyer | Nurture | 2026-03-15 | Discovery call done — asked for photorealistic portfolio examples | Re-engage as Gear B catalog buyer when Showcase has 5+ films | — | MONITOR | — |
| B006 | Rawand Latif | ARUBA CREATIVE | buyer | Followed Up | 2026-04-07 18:00 | v4 CaaS explanation + sample attached + Calendly | Await reply; book call | — | MEDIUM | waiting |
| B007 | Elaine Tan + Joseph Lee | The Media Shop | buyer | Nurture | 2026-03-18 | Discovery call done — media buying agency, Gear B/C profile not Gear A | Re-engage as catalog/licensing buyer when Showcase has 5+ films; Joseph Germany intro for expansion | — | MONITOR | — |
| B008 | Barney O'Kelly | AlixPartners | buyer | Followed Up | 2026-04-24 | Nudge sent: did you see the Chain of Title doc? offered 15-min JD call [Vanessa] | Await reply; book call | — | MEDIUM | waiting |
| B009 | Syed Tabish Hasan | Zedtronix | buyer | JD Outreach | 2026-05-26 | Lilly handoff 5/24; JD sent LinkedIn connection request 5/26 mentioning Lilly | Await acceptance; follow up with Calendly once connected | 2026-05-31 | HIGH | waiting |
| B010 | Bee Lin Ang | Stewardship Asia Centre | buyer | Followed Up | 2026-04-24 | Nudge sent: did you get a chance to look at the sample? offered JD call [Lilly] | Await reply; book call | — | MEDIUM | waiting |
| B011 | Hugo Barbera | HumAIn | buyer | Followed Up | 2026-05-08 13:35 TPE | Second nudge: offered sample Chain of Title as lower-friction alternative to call [Ivy] | Await reply | — | HIGH | waiting |
| B012 | Ivan Ng | Bacon Creatives | buyer | Followed Up | 2026-04-03 | Pivot: SI8 as doc layer; asked about client stage | Await reply; Singapore use case | — | MEDIUM | waiting |
| B013 | Qaiser Mehmood | ECONROAD International | buyer | Followed Up | 2026-04-01 | Urban Drift PDF + Calendly | Await reply; book call | — | MEDIUM | waiting |
| B014 | Shahrman Nayan | onedash22 | buyer | Replied | 2026-04-03 | No action taken | Continue sequence msg 3 | — | MEDIUM | pending |
| B015 | William Tan | Tareo Digital Advisory | buyer | Lukewarm | 2026-04-01 | No action taken | Follow-up: have you had a chance to evaluate? | — | MEDIUM | pending |
| B016 | Mainul Islam | eSaviour Limited | buyer | Replied-Conditional | 2026-03-15 | No action | Re-engage once 2-3 sample works ready | — | LOW | pending |
| B017 | James Byrne | BeyondWords | buyer | JD Outreach | 2026-05-26 | Lilly warm-close handoff 5/24; JD sent LinkedIn connection request 5/26 mentioning Lilly | Await acceptance; low-pressure "staying connected" follow-up once connected | 2026-06-30 | LOW | waiting |
| B018 | Carlos Cortiñas | Transmission | buyer | Polite Pass | 2026-04-06 | Replied "No thanks Vanessa" — closed | — | — | — | done |
| B019 | Cory Warfield | Starchild Music | buyer | Nurture | 2026-04-04 | Graceful exit sent | Soft referral mention if opportunity arises | — | MONITOR | — |
| B020 | Salem Al-Kuwari | SAM Strategic Access | buyer | Nurture | 2026-04-04 | Polite acknowledgment; not scheduling now | Check in Q3 | 2026-07-01 | MONITOR | — |
| B021 | Vignesh Ilangovan | Triken Studios | buyer | Soft No | 2026-04-05 | No action | Mark for Q3 follow-up | 2026-09-01 | MONITOR | — |
| B022 | Mark Johnson | SwiftScale AI | buyer | Lukewarm | 2026-04-01 | No action | Monitor — possibly wrong side of market | — | MONITOR | — |
| B023 | Amr Hamad | Stackline | buyer | Lukewarm | 2026-04-01 | No action | Follow up after ASA/IAB research complete | — | MONITOR | — |
| B024 | Chitra J | GrapheneAI | buyer | JD Outreach | 2026-05-26 | "Compliance clarity becoming part of production pipeline" [Lilly]; JD sent LinkedIn connection request 5/26 mentioning Lilly | Await acceptance; follow up with Calendly once connected | 2026-05-31 | MEDIUM | waiting |
| B025 | Aswini Ruidas | MediaX | buyer | Replied-Lukewarm | 2026-04-03 | Ivy confirmed on WhatsApp (+91 6296601182) | India market discovery — send v4 pitch via WhatsApp | 2026-04-10 | HIGH | pending |
| B026 | Dominic Ho | SYS.Studio | buyer | Nurture | 2026-04-07 | Replied: "I will let you know when we do need this service." [Lilly] | Check in Q3 | 2026-07-01 | MONITOR | — |
| B027 | Marc Danielle De Guzman | UnaFinancial | buyer | Call Requested | 2026-06-16 | Gate Q reply Jun 16: "most requests stopped at AI disclosure. A few clients asked for: source asset/licensing docs, production workflow/generation logs, human review records, ownership/rights representations from creators/vendors. Haven't seen a standardized provenance requirement yet — part of why what you're building is interesting." JD replied: acknowledged disclosure→Chain of Title pattern, asked for call (Manila/Taipei same timezone). Metro Manila. [Lilly/JD, SI8_Blocks AI Campaign] | Await call slot confirmation — book 30-min discovery call | 2026-06-19 | HIGH | waiting |
| B028 | Keir Finlow-Bates | Artema LABS | buyer | Not a Fit | 2026-04-07 | Responded with book promotion — CTO, wrong profile for CaaS. [Ivy] | — | — | — | done |
| B029 | Ron David Ben Ishay | Liquidity Group | buyer | Polite Pass | 2026-04-07 | Replied "Uhno thnx" [Lilly — note: Msg 2 was signed Ivy, persona mismatch] | — | — | — | done |
| B030 | Matthieu Fernandes | Sensai | buyer | Not a Fit | 2026-04-07 | "No needs atm" + counter-pitched AI automation services. CMO, wrong buyer side. [Vanessa] | — | — | — | done |
| B031 | Steve Mcpartland | Visually Sonic | buyer | Followed Up | 2026-05-08 13:36 TPE | Second nudge: offered to drop sample Chain of Title directly in message [Vanessa] | Await reply | — | HIGH | waiting |
| B032 | Simon Lee | Vantage Branding | buyer | Not Interested | 2026-04-10 | "no thanks" after msg 3 [Lilly] | — | — | — | done |
| B033 | Tunde Olowo-Ake | Ingenium Communications | buyer | Not a Fit | 2026-04-10 | 👍 reaction only — Lagos, off-geo [Lilly] | — | — | — | done |
| B034 | Paul L | Excelsior-Studios | buyer | Not a Fit | 2026-04-10 | "We don't use AI to create anything" [Lilly] | — | — | — | done |
| B035 | Jorge Enueve | ex1t.one | buyer | Polite Pass | 2026-04-10 | "Not for me at the moment" after msg 2 [Ivy] | Revisit Q3 if still active | 2026-09-01 | MONITOR | — |
| B036 | David Tamayo | Prose on Pixels | buyer | Replied-Warm | 2026-04-10 | "Big network with Legal team dedicated to AI" — aware of US vs global law differences; EU AI Act angle sent [Ivy] | Await reply | — | MEDIUM | waiting |
| B037 | Mitch Turnbull | University of Bristol | buyer | Not a Fit | 2026-04-10 | Academic researcher — hasn't produced AI for clients [Ivy] | — | — | — | done |
| B038 | Raúl Pineda Rojas | Monks | buyer | Polite Pass | 2026-04-10 | "Gracias por la información" — Mexico City, off-geo [Vanessa] | — | — | — | done |
| B039 | Chee Wong | Opus Artz Ltd | buyer | Not a Fit | 2026-04-10 | "Not within our remit" after msg 1 [Vanessa] | — | — | — | done |
| B040 | Hasan Sarwar | — | buyer | Followed Up | 2026-05-29 TPE | Sample Chain of Title PDF sent directly + "does this cover what your clients are asking for?" [Vanessa] — Test 3 v3-A | Await reply | — | HIGH | waiting |
| B041 | Nourhan Mostafa | Ai Studio | buyer | Followed Up | 2026-06-08 | Replied (delayed — Jun 8): apologised for delay; probed whether requirement comes from client legal teams specifically or internal process; explained B2B2B pattern [Vanessa] | Await reply | — | MEDIUM | waiting |
| B042 | Shray Vaidya | Creative Chimps | buyer | Nurture | 2026-04-13 | "It might be in the future. Let's keep in touch." — soft nurture [Blocks AI msg#1, London] | Check in Q3 | 2026-07-01 | MONITOR | — |
| B043 | Luke Brady | Sublime Animations Ltd | buyer | Meeting Rescheduled | 2026-06-08 | 4th nudge Jun 8: asked for any 10am UK slot this week; Zoom link re-shared (email bounced twice — corrected to sublimeanimations333@gmail.com) [Ivy] | Await reply; send Zoom invite when he confirms a slot | — | MEDIUM | waiting |
| B044 | Shaun Yeo | Reel Loco Productions | buyer | Followed Up | 2026-04-18 | Sent Calendly link for JD call [Lilly] | Await booking | — | HIGH | waiting |
| B045 | Mike Harris | Seenit | buyer | Call Booked | 2026-05-17 TPE | "Thanks, - booked!" — confirmed via Calendly [Ivy] | Prepare for call; confirm date/time | — | HIGH | waiting |
| B046 | Kd Pascall | Bluvision Studios | buyer | Followed Up | 2026-05-01 | "Of recent yes, before it was never an issue" — Legal Friction msg#1 [London]; reply sent: specific client or campaign type that triggered it? + Logline-UK-v1 + URL [Lilly] | Await reply | — | MEDIUM | waiting |
| B047 | Hugo Faustino | Canon EMEA | buyer | Nurture | 2026-04-23 | Declined call: "Thank you for feedback Vanessa, but no need for a meeting." [Vanessa] | Check in Q3 | 2026-07-01 | MONITOR | — |
| B048 | Piotr Nierobisz | Munchingsquare | buyer | Followed Up | 2026-05-08 13:37 TPE | Second nudge: checked if he reviewed sample; re-offered JD call [Vanessa] | Await reply | — | HIGH | waiting |
| B049 | Ruth Teasdale | Motion World Ltd | buyer | Followed Up | 2026-05-01 | P2: described licensed package process — Legal Friction [UK]; reply sent: Q-Validate-v1 (validated her process, asked how long it takes + PDF format) + Logline-UK-v1 + URL | Await reply | — | MEDIUM | waiting |
| B050 | Julia N'Diamoi | T&P | buyer | Followed Up | 2026-05-28 14:25 TPE | Bucket-2-v1-A sent: mirrored "legal teams want to see the plumbing"; 9-question list; two-tier description; free code offer (COMP-B2); asked "Is this close to what legal teams are asking you for?" [Ivy] | Await reply | 2026-06-02 | MEDIUM | waiting |
| B051 | Kiel Robinson | Ok let's play Studios | buyer | Followed Up | 2026-05-28 14:27 TPE | Bucket-2-v1-A sent: mirrored "raw materials with extensive metadata"; 9-question list; two-tier description; free code offer (COMP-B2); asked "Is this close to what legal teams are asking you for?" [Ivy] | Await reply | 2026-06-02 | MEDIUM | waiting |
| B052 | Loewe Chung Nin Lee | — | buyer | Followed Up | 2026-05-28 14:30 TPE | Bucket-2-v1-A sent: answered his industries Q (financial services + large brands); mirrored "content sourcing, usage rights, AI involvement"; 9-question list; two-tier description; free code offer (COMP-B2) [Ivy] | Await reply | 2026-06-02 | MEDIUM | waiting |
| B053 | Graham Vincent | grigio:london | buyer | Nurture | 2026-05-29 | "Yes, of course" → 👍 → "Thanks Ivy" — three passive responses, no verbal engagement with questions or product. Pattern: reads but won't type. [Ivy] | Q3 re-engage — EU Act enforcement or new campaign prompt | 2026-08-01 | MONITOR | — |
| B054 | Steve Cholerton | Sentient Pictures | buyer | Nurture | 2026-04-13 | "one client has asked for metadata" — Hitting a Wall msg#1 | Monitor; re-engage when more clients ask | — | MONITOR | — |
| B055 | Owen Bryant | — | buyer | Nurture | 2026-04-13 | CD, not creating AI videos now but open to future | Check in Q3 | 2026-07-01 | MONITOR | — |
| B056 | Michael Christodoulou | MOI Global | buyer | Followed Up | 2026-05-29 TPE | Sample Chain of Title sent + "does this cover what your clients are asking for?" [Vanessa] — Test 3 v3-A | Await reply | — | HIGH | waiting |
| B057 | Rheea Aranha | Vincent Studios | buyer | Followed Up | 2026-05-01 | "Will be in touch at the time this is required. A sample of Chain of title via email would be helpful." (msg#4) [Ivy]; reply sent: Email-Request-v1 (asked for best email to send sample — no logline) | Await email; send sample on receipt | — | MEDIUM | waiting |
| B058 | Chun Man Chan | Dustinhill Productions | buyer | Replied-Lukewarm | 2026-04-21 | "As of now no... Why do you ask?" — uses AI in production pipeline but not 100% AI final output; Singapore [Lilly] | Reply + explain regulatory trend; nurture for Q3 | — | LOW | pending |
| B059 | Alan Geoy | Antigravity Studio | buyer | Replied-Lukewarm | 2026-04-17 | "limited to certain ai tools that are approved by agencies/clients" — tool approval gate; Singapore [Lilly] | Reply + probe which tools; client-dictated approved-tool policy = secondary ICP signal | — | LOW | pending |
| B060 | Konstantin Dimitrov | Pathbind Games | buyer | Replied-Lukewarm | 2026-04-06 | "Do you mind rephrasing the question to elaborate?" — asked for clarification [Vanessa] | Reply with clearer description | — | LOW | pending |
| B061 | Jay Pirabakaran | JAYPRINTS Studio | buyer | Followed Up | 2026-05-08 13:38 TPE | Second nudge: re-offered sample doc or 15-min JD call [Ivy] | Await reply | — | HIGH | waiting |
| B062 | Quim Español | Monks | buyer | Followed Up | 2026-05-19 23:00 TPE | Reply sent: holdco legal → agency filter Q + Q-Format (checklist or informal?) + CarFax logline + sample offer [Vanessa] | Await reply | — | MEDIUM | waiting |
| B063 | Kees-Jan Husselman | — | buyer | Followed Up | 2026-05-19 23:00 TPE | Reply sent: validated doc-spread-across-files pattern; Q-Format (client handover or internal audit trail?) + Chain of Title platform pitch + sample/JD call offer [Vanessa] | Await reply — book JD call if warm | — | HIGH | waiting |
| B064 | Oscar Julius Marmelstein | The Shed Editing | buyer | Followed Up | 2026-05-19 23:00 TPE | Reply sent: informal logs → client format Q (PDF or email?) + Chain of Title platform pitch + sample offer [Vanessa] | Await reply | — | MEDIUM | waiting |
| B065 | Christiaan Compaan | — | buyer | Followed Up | 2026-05-19 23:00 TPE | Reply sent: validated pre-production moment; Q-Format (hand over or stays internal?) + Chain of Title platform pitch + sample offer [Vanessa] | Await reply | — | MEDIUM | waiting |
| B066 | Uli Redkina | — | buyer | Followed Up | 2026-05-28 14:44 TPE | Bucket-2-v1-A sent (no mirror opener — went straight to list): 9-question list; two-tier description; free code offer (COMP-B2); asked "Is this close to what legal teams are asking you for?" [Ivy] | Await reply | 2026-06-03 | MEDIUM | waiting |
| B067 | Alena Stepanova | Philip Morris | buyer | Followed Up | 2026-05-04 19:07 TPE | Manager Content Intelligence & Gen AI — brand-side [Ivy, SI8_Legal Friction, London]; reply sent: explained agency-side model, probed if PM commissions AI video from agencies + Logline-UK-v1 | Await reply | — | LOW | waiting |
| B068 | Marchel De Haan | Palo Alto Networks | buyer | Followed Up | 2026-05-29 TPE | EU Act client-pull message sent — "some don't ask are starting to ask"; Calendly + sample offer [Vanessa] — Test 2 v2-B | Await reply | — | MEDIUM | waiting |
| B069 | Shahrukh Kazmi | — | buyer | Followed Up | 2026-05-28 15:40 TPE | "I usually just share what tools were used, my process overall of making the video and provide license links for royalty-free background music. Nothing too heavy, just basic transparency." Bucket-2-v1-A sent: mirrored "tools used, process, license links — basic transparency" + 9-question list + two-tier description + free code offer (COMP-B2) [Vanessa] | Await reply | 2026-06-03 | MEDIUM | waiting |
| B070 | Marinus Bergsma | SocialNow | buyer | Followed Up | 2026-05-28 15:46 TPE | "i make almost everything with ai so it's always clear before i start working for a client." Bucket-2-v1-A sent: mirrored "'always clear' before you start — that upfront clarity is exactly what we turn into a permanent filed document" + 9-question list + two-tier description + free code offer (COMP-B2) [Vanessa] | Await reply | 2026-06-03 | MEDIUM | waiting |
| B071 | Jenny Springett | Electric Violet TV | buyer | Followed Up | 2026-05-01 11:30 TPE | "Yes absolutely. It's required to broadcast anywhere in the EU so smart to be compliant even outside." — Development Executive, London [Ivy, SI8_Legal Friction]; reply sent: broadcaster vs brand/rights holder question + Logline-UK-v1 | Await reply | — | MEDIUM | waiting |
| B072 | Nick Craske | Havas Lynx | buyer | Followed Up | 2026-05-01 11:30 TPE | "Yes, and a wider view of the application and use cases of Gen AI." — Creative Director & AI Technologist, Manchester [Ivy, SI8_Legal Friction]; reply sent: specific campaign type vs standard across the board question + Logline-UK-v1 | Await reply | — | MEDIUM | waiting |
| B073 | Alessio Garbin | Barilla Group | buyer | Followed Up | 2026-05-19 23:00 TPE | Reply sent: brand-side legal → agency framing; Q-Format (PDF, email, or more formal?) + Chain of Title platform pitch + sample offer; probe if Barilla format matches [Vanessa] | Await reply — brand-side; potential referral source for agencies | — | MEDIUM | waiting |
| B074 | Graeme Carr | OBSIDIAN | buyer | Followed Up | 2026-05-19 23:00 TPE | Reply sent: validated tracking; Q-Format (document to client or covered in conversation?) + Chain of Title platform pitch + sample offer [Vanessa] | Await reply | — | MEDIUM | waiting |
| B075 | Alexander Kraemer | AK/83 | buyer | Followed Up | 2026-05-19 23:00 TPE | Reply sent: answered curiosity (CarFax for AI video) + Chain of Title platform pitch + sample offer [Vanessa] | Await reply | — | MEDIUM | waiting |
| B076 | Dagny Rozniak | Pencil | buyer | Followed Up | 2026-05-29 TPE | EU Act client-pull message sent — legal teams getting specific by August 2; sample offer [Vanessa] — Test 2 v2-B | Await reply | — | MEDIUM | waiting |
| B077 | Ricardo Barchan | Joolz Jewellery | buyer | Replied-Lukewarm | 2026-04-22 | Confirmed yes but wrong role (retoucher); asked about collaboration [Ivy, SI8_Legal Friction] | Close — wrong role | — | — | done |
| B078 | Daniel Simler | Samsung SDS Europe | buyer | Followed Up | 2026-05-28 22:48 TPE | "Not at the moment but there need to be more regulations" — London [Ivy, SI8_Legal Friction]; May 4: EU AI Act Aug deadline + HPI Check pitch (name error corrected); May 28: 9 survey questions inline, "if Samsung SDS projects went through this today — which questions would have gaps?" | Await reply | — | LOW | waiting |
| B079 | Tunc Akyuz | Big Media & Technology | buyer | Followed Up | 2026-05-01 11:30 TPE | "hasn't been asked yet, but a contract is being signed stating that I am responsible for the IP of all content" — Production Director, London [Ivy, SI8_Legal Friction England 0426B]; reply sent: does he have documentation to back up the IP guarantee, or verbal only? + Logline-UK-v1 | Await reply | — | MEDIUM | waiting |
| B080 | Kasra Mirzarezaie | Case Connect LLC | buyer | Followed Up | 2026-05-04 19:20 TPE | "Depends on the state. We do MVA — CA strict standards; outside CA no approval needed." [Ivy, SI8_Legal Friction England 0426A]; reply sent: asked what MVA stands for | Await reply — determine if fit or not-a-fit | — | LOW | waiting |
| B081 | Dylan Guo | Independent | buyer | Followed Up | 2026-05-04 18:46 TPE | "haven't run into it yet, but I make sure everything is traceable" — London [Ivy, SI8_Legal Friction England 0426A]; reply sent: traceability → formal docs framing + Logline-UK-v1 | Await reply | — | LOW | waiting |
| B082 | Josh Guillaume | Blue Dog VFX | buyer | Replied-Lukewarm | 2026-04-27 | Described NDA + data security in VFX; asked "how has it been looking on your end?" — CD, Los Angeles [Vanessa, SI8_Legal Friction LA 0426A] | Monitor — off-geo (LA); strong ICP engagement but Year 1 geography out of scope | — | MONITOR | — |
| B083 | Igor Gutierrez | electrozooer | buyer | Replied-Lukewarm | 2026-04-27 | "Definitely they do. Many agencies now provide AI manifestos" — Multimodal Artist, Los Angeles [Vanessa, SI8_Legal Friction LA 0426A] | Monitor — off-geo (LA); strongest ICP validation signal from US contacts | — | MONITOR | — |
| B084 | Tahreem Khan | Xperia Labs | buyer | Followed Up | 2026-05-04 18:46 TPE | "Generally not. But u do wanna look into potential copyright issues" — London [Ivy, SI8_Legal Friction England 0426A]; reply sent: training data/tool licensing angle + probe internal vs client-driven + Logline-UK-v1 | Await reply | — | LOW | waiting |
| B085 | Alex Futcher | Audiomovers | buyer | Replied-Lukewarm | 2026-03-27 | "don't have a direct need currently; however, I think this could be very useful when the requirement arises" — Head of Commercial, London [Vanessa, SI8_Vetting Takes Weeks] | Nurture — Q3 check-in when they may be commissioning AI video | 2026-07-01 | MONITOR | — |
| B086 | Daniel Fox-Evans | The Kitchen London | buyer | Followed Up | 2026-05-04 19:05 TPE | "Our main blocker is consumer backlash and sentiment at the moment on AI" — Creative Director, London [Vanessa, SI8_Blocks AI msg#3]; reply sent: sentiment is separate problem; legal clearance running in parallel — is legal also coming up? (no logline) | Await reply | — | MEDIUM | waiting |
| B087 | Ibrahim Badi | IKM Marketing | buyer | Warm Lead | 2026-06-08 | Answered brand vertical Q (finserv/pharma/holdco); explained B2B2B pattern (requirement starts at brand legal, filters to agency); sent free COMP-B2 code with "no rush, no expiry" framing [Ivy] | Await reply — if no response by Jun 23, send format probe: "when those regulated clients push the requirement down, do they specify the format they want?" | 2026-06-23 | MEDIUM | waiting |
| B088 | Matthew Sergison-Main | OLIVER / The Brandtech Group | buyer | Followed Up | 2026-06-08 | Break-up style follow-up Jun 8: "won't send more unless you reply" + B2B2B probe (is request from brand legal team directly, or procurement/brand guidelines/brief?) + deliverables format check [Ivy] | Await reply — if answers B2B2B Q, seek brand legal team intro | — | HIGH | waiting |
| B089 | Oliyah Joseph | Visual Vibe | buyer | Nurture | 2026-05-25 | Call taken 5/25 with Oliyah + husband Paul. Primarily AI images (fashion/e-commerce), not video. SMB clients — no legal teams, not being asked for documentation. Paul: "You're playing ahead — matter of time, give it 6 months." Not a fit now. Call notes: 03_Sales/call-notes/CALL-2026-05-25-B089-Oliyah-Joseph.md | Thank-you email sent 5/25. TODO: add Oliyah + Paul on LinkedIn; then re-engage Q4 2026 | 2026-10-01 | MONITOR | waiting |
| B090 | Saira Macleod | Magnific (formerly Freepik) | buyer | Followed Up | 2026-05-08 12:33 TPE | Round 2: asked what the checker looks for [Ivy]; reply sent: 4-area checklist (tool licensing, training data TOS, likeness/voice, prompt provenance) + sample link + JD call offer | Await reply — confirm call | — | HIGH | waiting |
| B091 | Abi Tomasiewicz | DEPT® | buyer | Nurture | 2026-05-17 TPE | "I don't think it's needed to dig deep. But please consider me for any content video you need to help promote this service." — declined as buyer; offered to promote SI8 content [Ivy] | Re-engage as creator/promoter if Showcase needs content | 2026-07-01 | MONITOR | — |
| B092 | Lina De Groot | Stealth AI Startup | buyer | Followed Up | 2026-05-19 23:00 TPE | Reply sent: answered her Q (hardening areas: TOS, likeness, tool licensing) + Chain of Title platform pitch + sample offer + asked if startup is production or advisory side [Vanessa] | Await reply | — | MEDIUM | waiting |
| B093 | Jr Horsting | IPS Studios | buyer | Nurture | 2026-04-30 | Sent own Calendly: "doing a great deal of AI production, IP deals... We can always talk and compare notes." — CCO, El Monte CA (off-geo) [Vanessa, SI8_Legal Friction msg#2] | Monitor — off-geo (LA); if Year 2 US expansion, strong pipeline signal | 2026-07-01 | MONITOR | — |
| B094 | Justin Lufair Brown | Amazon | buyer | Followed Up | 2026-06-10 | "Contract language has tightened significantly — likeness rights, training data provenance, indemnification. SAG-AFTRA AI clauses pulled this forward. Happy to go deeper if useful." Creative Producer AI Video Production, LA. Jun 10 signal scan: second Amazon producer (B150 Maziarski) found in same dataset. Jun 10: Vanessa reply sent — acknowledged SAG-AFTRA pull, introduced SI8 as output documentation layer (Chain of Title), sent sample link. Closed with "do you think this is something people can use right now?" [Vanessa, SI8_Legal Friction LA 0426A] | Await reply | — | HIGH | waiting |
| B095 | Florent Delavous | Xtendency™ AI Video Production Consulting House | buyer | Followed Up | 2026-06-16 | "Already working with legal team on documentation" [Lilly]; Connection accepted Jun 16; JD sent: "building internally or with an external service? happy to compare notes — building the same thing from the agency side" [JD personal] | Await reply — probe format/scope of what they're building; position SI8 as complementary or identify as T3 | 2026-06-19 | MEDIUM | waiting |
| B096 | Ankita Biswas | F5 DIGITAL (fmr HTCreaTec) | buyer | Followed Up | 2026-06-16 | Accepted connection 5/26; replied "It's nice to hear from you" 5/27; JD sent pain + call request 5/27; Jun 8 follow-up sent; Final nudge Jun 16: "are client documentation requests coming up at F5 Digital right now? if not, no worries" [JD personal] | If no reply by Jun 21, archive to Nurture | 2026-06-21 | LOW | waiting |
| B097 | James Larkin | Saatchi & Saatchi | buyer | Replied-Lukewarm | 2026-04-28 | "i can't say i have an NDA" — Associate Design Director, Dubai [Lilly, SI8_Legal Friction msg#1] | VOID — Lilly alias inaccessible; cannot reply | — | — | done |
| B098 | Michelle Ponto | Blue Gecko Communications | buyer | JD Outreach | 2026-05-26 | "Clients asking to see prompts — uncomfortable position" [Lilly]; JD sent LinkedIn connection request 5/26 mentioning Lilly | Await acceptance; follow up with Calendly + Chain of Title framing once connected | 2026-05-31 | MEDIUM | waiting |
| B099 | Sultan Alsuwaidi | Video tube | buyer | JD Outreach | 2026-05-26 | "Clients now approve the process, not just the video" [Lilly]; JD sent LinkedIn connection request 5/26 mentioning Lilly | Await acceptance; follow up with Calendly once connected | 2026-05-31 | HIGH | waiting |
| B100 | Ramez Tabshi | — | buyer | Call Scheduled | 2026-06-16 | "IP provenance and training data transparency is absolutely escalating with clients" (strong unprompted validation). Jun 1 fell through (holiday). Re-engaged Jun 16; confirmed Mon Jun 22 1pm UAE / 5pm TPE. Calendar invite sent. [JD personal] | Prepare for call — review his signal, prep discovery questions, no product pitch until he confirms his gap | 2026-06-22 | HIGH | confirmed |
| B101 | Anas Bakal | Monoud Trading | buyer | JD Outreach | 2026-05-26 | "Tool ownership, prompt logs" — articulated product back [Lilly]; JD sent LinkedIn connection request 5/26 mentioning Lilly; Email: Anasbakal1994@gmail.com · Phone: +971552787780 | Await acceptance; also available via WhatsApp | 2026-05-31 | MEDIUM | waiting |
| B102 | Amr Tahtawi | Arizona State University | buyer | Not a Fit | 2026-05-10 TPE | Responded by trying to charge Lilly $150 for a consultancy call (PayPal link sent); gave availability May 9/10 (passed). He's a consultant/educator, not a buyer. [Lilly] | Close — wrong role | — | — | done |
| B103 | Ahmed Samy Amin | GTCFX | buyer | Followed Up | 2026-05-27 | Connected 5/26; replied "Hello JD, happy to connect!"; JD sent JD-FollowUp-v1 5/27 — pain (brand legal blocking AI video) + have clients asked? + survey review ask [JD personal] | Await reply | 2026-05-31 | HIGH | waiting |
| B104 | Ashraf Selo | MultiBank Group | buyer | Followed Up | 2026-06-16 | "Becoming standard with bigger campaigns" [Lilly]; connection accepted Jun 16; JD sent: "when clients ask for documentation on bigger campaigns, is that a formal document or more of an informal sign-off? trying to understand how structured the ask is." [JD personal]; Phone: +971 55 344 1707 | Await reply | 2026-06-19 | MEDIUM | waiting |
| B105 | Ayman Hussein | — (AI-Driven Motion & Visual Content) | buyer | Followed Up | 2026-05-08 12:04 TPE | "Smaller campaigns don't ask. Larger campaigns break it down..." — Dubai [Lilly, SI8_Legal Friction msg#1]; reply sent: probe what "breaking it down" looks like + Logline-Global-v1 | Await reply | — | MEDIUM | waiting |
| B106 | Mohammed Magdy Alzahran | Dybaja AI Creative Studio | buyer | Followed Up | 2026-05-27 | Connected 5/26; replied "Hi, JD"; JD sent JD-FollowUp-v1 5/27 — pain (documented chain of ownership beyond NDA) + have clients asked? + survey review ask [JD personal] | Await reply | 2026-05-31 | MEDIUM | waiting |
| B107 | Keegan Desouza | Shaerp Next | buyer | JD Outreach | 2026-05-26 | "Legal side about to become a big deal" [Lilly]; JD sent LinkedIn connection request 5/26 mentioning Lilly; alt: +971585372649 | Await acceptance; also WhatsApp available | 2026-05-31 | MEDIUM | waiting |
| B108 | Balendu Sharma Dadhich | AILGO | buyer | Followed Up | 2026-05-08 12:06 TPE | "Selective info shared. We give a guarantee the process doesn't violate any laws, rules or ethics." — Dubai [Lilly, SI8_Legal Friction msg#1]; reply sent: probe format of the guarantee + Logline-Global-v1 | Await reply | — | MEDIUM | waiting |
| B109 | Shahin Sha | Rafaz Properties | buyer | Followed Up | 2026-05-08 12:13 TPE | "Risk, ownership, disclosure" framing — Dubai [Lilly, SI8_Legal Friction msg#1]; reply sent: probe legal team vs procurement/brief + Logline-Global-v1 | Await reply | — | LOW | waiting |
| B110 | Nikan Nazari | Freelance | buyer | Followed Up | 2026-05-08 12:14 TPE | "Document every word in the contract" — Dubai [Lilly, SI8_Legal Friction msg#1]; reply sent: probe contract scope vs ad hoc + Logline-Global-v1 | Await reply | — | LOW | waiting |
| B111 | Anwar Al Amin | The Film Craft MENA | buyer | Followed Up | 2026-05-08 12:15 TPE | "Depends on client requirement" — Filmmaker, Dubai [Lilly, SI8_Legal Friction msg#1]; reply sent: probe format clients ask for in region + Logline-Global-v1 | Await reply | — | LOW | waiting |
| B112 | Manoj Reddy | ALBAB Media LLC | buyer | Followed Up | 2026-05-08 12:16 TPE | "Not yet but becoming bigger topic" — Dubai [Lilly, SI8_Legal Friction msg#1]; reply sent: EU AI Act Aug 2026 hook + Logline-Global-v1 | Await reply | — | LOW | waiting |
| B113 | Mohanaselvan Jeyapalan | Expo City Dubai | buyer | Followed Up | 2026-05-08 12:17 TPE | Dubai Future Academy AI labeling framework — SVP PMO, Dubai [Lilly, SI8_Legal Friction msg#1]; reply sent: framework vs commercial deliverable distinction; probe if filtering into commercial requirements | Await reply | — | RESEARCH | waiting |
| B114 | Debjani Mukherjee | GEMS World Academy | buyer | Followed Up | 2026-05-08 12:18 TPE | "Increasingly so... what are you seeing?" — Dubai [Lilly, SI8_Legal Friction msg#1]; reply sent: answered (training data TOS, likeness rights); probe source of interest | Await reply | — | RESEARCH | waiting |
| B115 | Anuj Gunasena | Al Tayer Insignia / Bloomingdale's | buyer | Followed Up | 2026-05-08 12:19 TPE | "What are you seeing?" — Dubai [Lilly, SI8_Legal Friction msg#1]; reply sent: financial services + large brand campaigns as primary drivers + Logline-Global-v1 | Await reply | — | RESEARCH | waiting |
| B116 | Artemio Mani | Freelance | buyer | Nurture | 2026-05-18 TPE | "When I need this, I'll use your platform. We will contact each other soon." — Dubai [Lilly] | Check in Q3 | 2026-07-01 | MONITOR | — |
| B117 | Duc-Minh Nguyen | Meta / TEKsystems | buyer | Replied-Warm | 2026-04-30 | "Yes, legal teams often ask to look at the prompts to make sure everything is clean, especially larger organizations" — Gen AI Artist, Los Angeles [Vanessa, SI8_Legal Friction msg#1] | Monitor — LA, Year 2 target; confirm procurement tightening | — | MONITOR | — |
| B118 | Carl Seibert | Conduit Collective | buyer | Replied-Warm | 2026-04-30 | "Yes" — EP / AI Transformation, Los Angeles [Vanessa, SI8_Legal Friction msg#1] | Monitor — LA, Year 2 target | — | MONITOR | — |
| B119 | Jason Teng | AI Creative | buyer | Replied-Warm | 2026-04-30 | "Yes, they do." — AI Creative, Los Angeles [Vanessa, SI8_Legal Friction msg#1] | Monitor — LA, Year 2 target | — | MONITOR | — |
| B120 | Fred M Davis | AIEntertainment | buyer | Replied-Lukewarm | 2026-04-30 | "Some do and some don't... We should come up with a generic agreement they can use" — Account Executive, Los Angeles [Vanessa, SI8_Legal Friction msg#1] | Monitor — LA, Year 2 target; open to the concept but no urgency | — | MONITOR | — |
| B121 | Gabriel Preston | Imagine This Creative Studio | buyer | Followed Up | 2026-05-29 TPE | Sent full 9 intake questions (tools, TOS ownership, stock footage, faces/likeness, logos, audio, territories, commercial use, generation logs) + "does your process cover most of these or are there things you handle that we're not capturing?" — Test 3 v3-B [Ivy] | Await reply — any gap he names validates intake form; likeness angle likely to surface in his answer | — | HIGH | waiting |
| B122 | Mhd Ali | Monks | buyer | Followed Up | 2026-05-27 | Replied "yeah sure" to questionnaire review ask; JD sent full 9-question list (tools, training data, authorship, prompt custody, likeness, IP, audio, intended use, territory) + asked if Monks legal teams ask for anything not on list + offered live platform link | Await reply — any gap he names is direct agency intelligence | 2026-05-31 | HIGH | waiting |
| B123 | Gulzar Junaid | Kling AI | buyer | Followed Up | 2026-06-09 | Test 6 v6-A probe sent Jun 9 ("is that from legal/brand safety or creative?"). NOTE: May 17 reply already answered — "usually driven by legal or brand safety concerns, not technical curiosity" — B2B2B pre-validated before probe sent. Await explicit confirmation. [Angel, SI8_Legal Friction, Berlin] | Await reply — if he confirms legal source, route to Test 8 | — | MEDIUM | waiting |
| B124 | Sven Bliedung Von Der Heide | Volucap | buyer | Not a Fit | 2026-05-28 | Volucap is a volumetric video capture studio — proprietary camera rigs + trained models on real people/objects. His EU compliance question is about his own internal AI tech stack, not third-party tool documentation for brand deliverables. Does not use Runway/Kling/Kling etc. Wrong ICP. [Angel] | — | — | — | done |
| B125 | Tim Deussen | XRBB - Extended Reality Berlin-Brandenburg | partner/advisor | Call Scheduled | 2026-06-11 | Jun 6: corrected Art. 50 (labeling/disclosure, not Chain of Title); validated SI8 for IP compliance; flagged "disconnected from technical process." Jun 8: advisory call ask sent. Jun 11: Tim confirmed — available from Jun 22; Angel proposed Tue Jun 23 9am or 10am Berlin time, awaiting his slot confirmation. Context: at Studio Babelsberg meetings this week, media conference, MoCap recordings next week. | Confirm Jun 23 time slot. JD leads call — advisory framing: (1) where does Chain of Title fit in technical compliance stack? (2) what does "connected to the technical process" actually require? (3) partnership/advisor role? NOT a sales call. | 2026-06-23 | HIGH | awaiting slot confirmation |
| B126 | Phil Langer | Jung von Matt SPREE | buyer | Followed Up | 2026-05-20 09:45 TPE | Reply sent: confirmed prompt documentation is exactly what's coming + Chain of Title platform pitch + sample offer [Angel] | Await reply | — | HIGH | waiting |
| B127 | Ulrike Kerber | Viva Design Inc. | buyer | Followed Up | 2026-05-29 TPE | EU Act client-pull message sent — "asking with increasing frequency" mirror + Aug 2 deadline + sample offer [Angel] — Test 2 v2-B | Await reply | — | HIGH | waiting |
| B128 | Christopher Neitzert | Creative Mayhem | buyer | Followed Up | 2026-05-29 TPE | Described SI8 platform; asked "production side or legal/compliance side? would be good to compare notes" [Angel] — Test 4 | Await reply — classify as competitor, partner, or buyer depending on his answer | — | MEDIUM | waiting |
| B129 | Kelly Hogan | ELITE STORI LND | buyer | Followed Up | 2026-05-28 14:43 TPE | Also replied: "It can pop up however you always deliver the terms and conditions etc that outline exactly what you're delivering prior to delivery/ signing a project." Bucket-2-v1-A sent: "Thanks for the message! This is exactly what we're working on ~" + mirrored T&C framing as AI-specific version + 9-question list + two-tier description + free code offer (COMP-B2) [Ivy] | Await reply | 2026-06-03 | MEDIUM | waiting |
| B130 | Ivan Petruzzelli | State Street Investment Management | buyer | Followed Up | 2026-06-16 | "Yes we are" — confirmed State Street moving toward structured documentation; May 29: 9 questions + two-tier breakdown + free code offer [Ivy]. Jun 16: format probe sent — "is there a format already defined that you'd require agencies to submit?" [Ivy] | Await reply — if engages, offer 15-min call (no manager framing) | 2026-06-23 | HIGH | waiting |
| B131 | Natalia Zablotska | Agro-Bondarivka Ukraine | buyer | Followed Up | 2026-05-28 14:40 TPE | "Yes, I'm definitely seeing more of this lately. Legal teams are increasingly asking for transparency around how AI-generated content is produced, especially regarding tools used, training data." Bucket-2-v1-A sent: mirrored "tools used and training data — those are the first two things our Chain of Title covers" + 9-question list + two-tier description + free code offer (COMP-B2) [Ivy] | Await reply | 2026-06-03 | MEDIUM | waiting |
| B132 | Mikhail Gulkov | Volna vision | buyer | Replied-Lukewarm | 2026-05-16 TPE | Uses own proprietary AI workflow + custom pipeline — "everything is perfectly clean from the start." Creative Director, Dubai [Lilly, SI8_Legal Friction msg#1] | VOID — Lilly alias inaccessible; cannot reply | — | — | done |
| B133 | Mohamed Samir | Emerald Group | buyer | Replied-Lukewarm | 2026-05-08 TPE | "Some insist on that of course" — VP Business Development MENA, Dubai [Lilly, SI8_Legal Friction msg#1] | Reply + probe which clients insist + what format they request | — | LOW | pending |
| B134 | Joachim Klatt | one.GLOBAL-VISION.world | buyer | Followed Up | 2026-06-09 | Test 6 v6-B pitch sent Jun 9: product + sample link (www.superimmersive8.com) + 15-min call offer [Angel, SI8_Legal Friction, Berlin] | Await reply | — | LOW | waiting |
| B135 | Ehsan Aliabadi | Loudestudio | buyer | Followed Up | 2026-06-09 | Test 6 v6-A probe sent Jun 9: is documentation requirement coming from client's legal team or creative/production side? [Angel, SI8_Legal Friction, Berlin] | Await reply | — | MEDIUM | waiting |
| B136 | Tom Freeman | Freeman Studio | buyer | Followed Up | 2026-06-09 | Test 6 v6-A probe sent Jun 9: is approved-model list coming from client's legal/compliance team or creative/brand preference? [Angel, SI8_Legal Friction, Berlin] | Await reply | — | MEDIUM | waiting |
| B137 | Akbar Shaikh | Department of Culture and Tourism – Abu Dhabi | buyer | Replied-Lukewarm | 2026-05-16 TPE | "No one has asked me about this yet. But they asked me about which tool is used to create the video." — Motion Graphics Animator, Abu Dhabi [Lilly, SI8_Legal Friction msg#1] | VOID — Lilly alias inaccessible; cannot reply | — | — | done |
| B138 | Tunç Topçuoglu | HOOD Studio | buyer | Followed Up | 2026-05-29 TPE | Sent JD Calendly link + COMP-B2 free code for Creator Record — "either way works" [Vanessa] | Await booking or form fill; if no action in 5 days nudge | 2026-06-03 | HIGH | waiting |
| B139 | James Hilditch | BearJam - Video Production | buyer | Followed Up | 2026-05-28 14:41 TPE | "Yes, sometimes. It's an important part of the process in my opinion. 😊" Bucket-2-v1-A sent: "Completely agree — and more clients are starting to require it formally" + 9-question list + two-tier description + free code offer (COMP-B2) [Ivy] | Await reply | 2026-06-03 | MEDIUM | waiting |
| B140 | Stephane Jacob | Atlantic Venture Group | buyer | Replied-Lukewarm | 2026-05-17 TPE | "Yes, but I usually don't go above 30% AI in the final version — I consider it stock footage" — Dubai [Lilly, SI8_Legal Friction msg#1] | VOID — Lilly alias inaccessible; cannot reply | — | — | done |
| B141 | Abbas Saleem | Llama & Griffin | buyer | JD Outreach | 2026-05-26 | "Disclose upfront, not later" + shared own Calendly [Lilly]; JD sent LinkedIn connection request 5/26 mentioning Lilly | Await acceptance; book call via his Calendly this week once connected | 2026-05-29 | HIGH | waiting |
| B142 | Asif N | Fundfloat Academy | buyer | Followed Up | 2026-05-29 | "Sure" reply to survey ask; JD sent 9 questions + two-tier breakdown inline + "is this close to what legal teams are asking you for?" + free code offer [JD personal] | Await reply | 2026-05-31 | MEDIUM | waiting |
| B143 | Simon Helm | — | buyer | Call Requested | 2026-06-16 | EU AI Act msg#2 reply (Jun 2): "feels very relevant, advising clients already. Can we chat?" Ivy replied Jun 8: asked for Tue/Wed/Thu 9:30–10am UK availability. Jun 16: nudge sent — "Did any of those times work for you, or would another slot be easier?" [Ivy, SI8_EU AI Act, England] | Await slot reply; send Zoom invite when confirmed; JD leads call | 2026-06-19 | HIGH | waiting |
| B144 | Laurence Quinn | Ai4ADS | buyer | Nurture | 2026-06-09 | Test 6 v6-B: "Thanks Ivy" — polite close, no product engagement. Soft pass, not NAF. Is logging already; not ready yet. [Ivy, SI8_EU AI Act, England] | Re-engage Aug 2 (EU AI Act enforcement) — "clients are asking now" hook | 2026-08-02 | MONITOR | — |
| B145 | Daniele Zennaro | AiYR4 | buyer | Warm Lead | 2026-06-10 | Test 6 v6-A reply Jun 10: "request comes via commercial/rights side — legal/compliance is probably behind it, especially larger projects." Partial B2B2B confirmation. Chain: legal→commercial/rights→agency. Replied Jun 10: fun opener ("you could front-run our pitch deck") + title probe: "do you mean Business Affairs? Broadcast Producer? Commercial Affairs Manager?" [Ivy, SI8_EU AI Act, England] | Await reply — confirm whether commercial/rights role is Business Affairs; if confirmed, route to pitch + sample | — | HIGH | waiting |
| B146 | Alex Jenkins | Nexus Studios | buyer | Followed Up | 2026-06-09 | Test 6 v6-A sent Jun 9: explained SI8 (Chain of Title, brand legal reference doc) + probed whether that client's doc requirement is from legal/compliance or creative/brand marketing [Ivy, SI8_EU AI Act, England] | Await reply — Nexus Studios is a large agency; HIGH value if confirms legal source | — | HIGH | waiting |
| B147 | Cris Cerqueira | Cris Cerqueira Studio | buyer | Followed Up | 2026-06-09 | Test 6 v6-B pitch sent Jun 9: acknowledged existing record-keeping; showed formalised sample (superimmersive8.com/sample); noted applies to AI-assisted content broadly [Ivy, SI8_EU AI Act, England] | Await reply — partial fit (packaging/branding, not AI video); low conversion probability | — | LOW | waiting |
| B148 | Myron Stapleton | R&M Geoscience Ltd | buyer | Followed Up | 2026-06-10 | "Perfect solution to this exact headache... worth its weight in gold... first person I reach out to when we start ramping up content." Founder & Executive Director, Newbury UK. Sovereign-grade infrastructure developer — UK, Caribbean, West Africa. Delivers to governments, health boards, national bodies with strict legal/procurement. Uses AI constantly for content + stakeholder materials. Jun 10: Ivy replied — acknowledged EU AI Act timing, attached Urban Drift sample, introduced JD, requested 15-20 min Zoom call, mentioned discount codes for when ready. [Ivy, SI8_Legal Friction, UK] | Await reply — confirm call slot; JD leads call; prepare discount code before call | — | HIGH | waiting |
| B149 | Spencer Stander | STANDER PRODUCTIONS INC | buyer | Followed Up | 2026-06-10 | "Less about creative process, more about clearance — model releases, music/image rights, platforms and territories." Detailed BA-language reply to msg 1. Jun 10: Vanessa replied — mirrored clearance framing; introduced Chain of Title as equivalent of music clearance report for AI layer; quoted both tiers ($29/$499). Closed with "would this slot into your existing clearance workflow?" [Vanessa, SI8_Legal Friction LA 0426A] | Await reply | — | HIGH | waiting |
| B150 | Joe Maziarski | Amazon | buyer | Replied-Warm | 2026-05-17 | "They should be — it's a grey area. Firefly is built on cleared assets while others were trained on copyrighted material." Senior Creative AI Producer, LA. Second Amazon signal (see B094). [Vanessa, SI8_Legal Friction LA] | Monitor — LA/Year 2; note: institutional signal alongside B094; flag for US campaign planning | 2026-07-01 | MONITOR | — |
| B151 | Jean Delaunay | Mathematic Studio | buyer | Replied-Warm | 2026-05-17 | "Initial conversation about tools before production — client/agency runs it through legal so we know limitations very early." Pre-production vetting described independently. CD / Designer, LA. High-end commercial production co. [Vanessa, SI8_Legal Friction LA] | Monitor — LA/Year 2; pre-production framing validates BA/EP messaging angle | 2026-07-01 | MONITOR | — |
| B152 | Jian Yi Lay | VaynerMedia APAC | buyer | Warm Lead | 2026-05-29 | "Before starting work, AI usage and which platform must be cleared by both agency and clients legal team first." Formal pre-project legal gate already in place. Group Creative Director, Singapore. Holdco = compliance structure. [Lilly/JD, SI8_Legal Friction Singapore] | BLOCKED — JD connection request still not accepted as of Jun 16. When accepted: probe what formal pre-project process looks like; send sample; position SI8 as deliverable documentation layer for what they already clear | 2026-06-24 | HIGH | waiting |
| B153 | Ali Loveday-Herzinger | YouTube | buyer | Warm Lead | 2026-05-29 | Executive Producer title at YouTube Singapore. Warm signal — msg 2 (pitch) sent. No response documented after msg 2. EP profile = Clearance-Pro ICP. [SI8_Legal Friction Singapore] | BLOCKED — JD connection request still not accepted as of Jun 16. When accepted: send sample; Clearance-Pro EP framing ("same concept as music sync clearance report, but for the AI layer") | 2026-06-24 | MEDIUM | waiting |
| B154 | Billy Boman | Billy Boman AI Productions | buyer | Followed Up | 2026-06-10 | "Enterprise license with No Training policy on client assets + legal indemnification up to 3M EUR." Trigger 3 — sophisticated tool-level compliance already built. Jun 10: Vanessa sent probe — acknowledged tool layer is covered; asked "what about the delivered documentation — the Chain of Title clients actually receive alongside the video? Do you think that's necessary?" Deliberately kept short to surface his view. [Vanessa, SI8_Legal Friction Stockholm] | Await reply — probe will reveal whether deliverable documentation is on his radar or not | — | HIGH | waiting |
| B155 | Nikolay Kolev | XR Future LTD | buyer | Followed Up | 2026-06-10 | "Enterprise and regulated brands: legal teams asking for AI tools used, commercial licensing confirmation, synthetic voice/face disclosure, copyright assurances, AI provenance/workflow documentation." Unprompted checklist matches SI8 product spec exactly. VR Designer, London. Jun 10: Ivy replied — confirmed checklist maps to SI8 product; sent sample link; closed with probe: "is it a formal written requirement from legal team or more ad hoc?" [Ivy, SI8_Legal Friction UK] | Await reply — probe will confirm whether requirement is formal or ad hoc; determines next pitch step | — | HIGH | waiting |
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
| Replied — Hot (follow-up urgent) | 2 |
| Replied — Warm | 36 |
| Replied — Conditional | 4 |
| Replied — Lukewarm | 23 |
| Nurture | 12 |
| Polite Pass | 54 |
| Not a Fit | 60 |
| **Total Named Responses** | 198 |
| **Total Leads Contacted** | ~1,200+ |

---

### 🔥 Hot — Follow Up Immediately

| Name | Company | Title | Location | Campaign | Stage | Their Response (Summary) | Next Step |
|------|---------|-------|----------|----------|-------|--------------------------|-----------|
| **Jay Pirabakaran** | JAYPRINTS Studio | Founder & AI Creative Director | London | SI8_Legal Friction | Followed Up | Msg#2 sent Apr 24 — echoed rights/likeness/usage, introduced Chain of Title, offered sample or 15-min JD call [Ivy] | Await reply — sample or call | 2026-04-28 | HIGH | waiting |
| **Syed Tabish Hasan** | Zedtronix | CEO / Founder | London | SI8_Legal Friction | Calendly Sent | Replied "Let's have a call?" Apr 27 → Lilly sent Calendly | Watch for booking — follow up if no booking by Apr 30 | 2026-04-30 | HIGH | waiting |
| **Mike Harris** | Seenit | Product Manager | London | SI8_Legal Friction | Calendly Sent | Replied "please send a calendar link" Apr 27 → Ivy sent Calendly | Watch for booking — follow up if no booking by Apr 30 | 2026-04-30 | HIGH | waiting |
| **Troy Macdonald** | HyFi Corp | Chairman of the Board & CEiR | Miami | SI8_Hitting a Wall | Replied — Conditional | "Hi Ivy, sure send a sample and then lets arrange a call." | Apr 3 — Urban Drift Chain of Title PDF sent (attached); Calendly link included | Await reply; book call |
| **Luke Brady** | Sublime Animations Ltd | Founder | UK | SI8_Legal Friction | Meeting Rescheduled | Apr 21 missed, Apr 24 missed — "dealing with a lot of high priority issues"; Ivy proposed Mon May 4 10am UK (3rd reschedule) | Confirm May 4 slot; this is reschedule #3 | 2026-05-04 | HIGH | pending |

**Why Jay matters:** Founder & AI Creative Director — he's on the production side AND the decision maker. Response named three specific liability types (rights, likeness, usage) unprompted and confirmed it's now a campaign approval gate. Highest P2 signal from msg#1 to date.

**Hossein Jafari — moved to Nurture (Apr 27):** Declined call ("fully booked with high-stakes launches") but warm exit — "looks like you've done the heavy lifting, just get final legal tick from specialist." Validates SI8's premise. Check in Q3.

**Research action:** Verify what the 2026 ASA and IAB updates specifically require. This may be a major content/marketing angle.

---

### 🔴 Priority: Active / Follow-Up Required

| Name | Company | Title | Location | Campaign | Stage | Their Response (Summary) | Last Action | Next Step |
|------|---------|-------|----------|----------|-------|--------------------------|-------------|-----------|
| **Barney O'Kelly** | AlixPartners | — (Global consulting) | London | Campaign A | Followed Up | "Hi Vanessa, I'd be interested in learning more." | Apr 1 — follow-up sent with v4 Urban Drift Chain of Title PDF | Await reply; book call |
| **Syed Tabish Hasan** | Zedtronix | CEO / Founder | London | Campaign A | Calendly Sent | "Let's have a call?" (Apr 27) → Lilly sent Calendly link | Watch for booking by Apr 30 |
| **Bee Lin Ang** | Stewardship Asia Centre | Head of Digital Strategy & Comms | Singapore | Campaign A | Followed Up | "Thanks, where are u based? Yes, I would not mind learning more." | Apr 1 — second follow-up sent with Urban Drift PDF + Calendly (first Calendly sent Mar 12, no booking) | Await reply; book call |
| **Rawand Latif** | ARUBA CREATIVE L.L.C. | Co-Founder & Creative Director | Sulaymaniyah, Iraq | SI8_Hitting a Wall | Replied — Warm | "Hello Ivy, Sounds interesting, what's your services!" | None | Explain v4 CaaS — note: Iraq is off-target geography but creative director role is right |
| **Mainul Islam** | eSaviour Limited | — | London | Campaign A | Replied — Conditional | "ready 1-2 samples first then we will let you know" | None | Re-engage once 2-3 sample works ready |
| **James Byrne** | BeyondWords | — (ESG reporting) | London | Campaign A | Replied — Conditional | "Can you share some examples so I can understand" | None | Re-engage once samples ready |
| **Qaiser Mehmood** | ECONROAD International | Director of Business Development | Singapore | Campaign C | Followed Up | "Okay. Do u have any website?" | Apr 1 — follow-up sent with v4 Urban Drift PDF + Calendly (website + v3 PDF sent Mar 15, no reply) | Await reply; book call |
| **Hugo Barbera** | HumAIn | AI Director | Paris | SI8_Hitting a Wall | Meeting Requested | Fully engaged: "if you can do that report for me, it's interesting with the higher price — we only do it when clients ask and it's time-consuming." Wants to meet week of Apr 21 after Paris trip. | Apr 10 — meeting confirmation reply sent [Ivy] | Confirm week of Apr 21; book call |
| **Ivan Ng** | Bacon Creatives | Creative Consultant | Singapore | SI8_Hitting a Wall | Replied — Warm | "No this has not come up. But one of the creative agencies I consult with may be looking for a new AI partner to bring their AI influencer to life. Is this something you guys do?" | Apr 3 — pivot reply sent: clarified SI8 is documentation layer not production; if agency is building AI influencer, they'll need Chain of Title when it goes live; asked what stage they're at | Await reply — Singapore ICP, has a live client use case |
| **Leimi Zhou** | WOMBO | Digital Marketing Strategist & Video Artist | London | SI8_Legal Friction | Replied — Warm | "Sure, i'd love to see a sample" (Apr 27 reply to nudge) | Send sample Chain of Title |
| **Chitra J** | GrapheneAI | Creative Head | Bengaluru, India | SI8_Hitting a Wall | Replied — Warm | "This is exactly what we need! We've been struggling to get our AI-generated content approved by clients." Described exact SI8 pain point unprompted. | None yet | Send Message 2: 90-min review, $499, Chain of Title deliverable, offer 15-min call |
| **Aswini Ruidas** | MediaX | Sales Manager | Durgapur, India | SI8_Hitting a Wall | Replied — Lukewarm | Suggested Telegram; when declined, offered WhatsApp: +91 6296601182 | Ivy confirmed on WhatsApp | India market discovery test — elevated to HIGH. Send v4 pitch via WhatsApp. Note: MediaX/FinTech PR is off-sector but contact is live on WhatsApp and India is being tested. |
| **Shaun Yeo** | Reel Loco Productions | Creative Business Director | Singapore | SI8_Hitting a Wall | Replied-Warm | Wants 15-min call next week (msg#2) | None | Book 15-min call |
| **Mike Harris** | Seenit | Product Manager | London | SI8_Legal Friction | Calendly Sent | "please send a calendar link" (Apr 27) → Ivy sent Calendly | Watch for booking by Apr 30 |
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
| **Jenny Springett** | Electric Violet TV | Development Executive | London | SI8_Legal Friction | Replied-Warm | "Yes absolutely. It's required to broadcast anywhere in the EU so smart to be compliant even outside." — EU broadcast compliance confirmed unprompted (msg#1) | None | Reply + position SI8 as formal Chain of Title for EU broadcast compliance |
| **Nick Craske** | Havas Lynx | Creative Director & AI Technologist | Manchester | SI8_Legal Friction | Replied-Warm | "Yes, and a wider view of the application and use cases of Gen AI." — signals GenAI compliance awareness (msg#1) | None | Reply + position SI8 as compliance layer for broader GenAI use cases |
| **Alessio Garbin** | Barilla Group | Global Digital Experience Director | Amsterdam | SI8_Legal Friction | Replied-Warm | "They always ask 😉" — confirmed clients ask for documentation (msg#1) | None | Reply + probe which clients ask + send sample |
| **Graeme Carr** | OBSIDIAN | VFX & AI Artist | Amsterdam | SI8_Legal Friction | Replied-Warm | "we do keep record of what was uploaded where... we disclose which tools we use" — informal process; Hugo Barbera profile (msg#1) | None | Reply + position SI8 as formalized version of their existing process |
| **Alexander Kraemer** | AK/83 | Experience Architect / Digital Creative | Amsterdam | SI8_Legal Friction | Replied-Warm | "yes, it's coming up more frequently... curious what you're working on?" — rising frequency confirmed + proactive curiosity (msg#1) | None | Reply + send sample + answer curiosity question |
| **Tunc Akyuz** | Big Media & Technology | Production Director | London | SI8_Legal Friction England 0426B | Replied-Warm | "It hasn't been asked yet, but a contract is being signed stating that I am responsible for the IP of all content, therefore I am responsible for ensuring everything is accurate." — takes personal IP responsibility; no Chain of Title yet (msg#1) | None | Reply + position SI8 as the doc that protects him when legal teams do ask |
| **Leimi Zhou** | WOMBO | Digital Marketing Strategist & Video Artist | London | SI8_Legal Friction | Replied-Warm | Replied to Apr 24 nudge: "Sure, i'd love to see a sample" | Send sample Chain of Title | — |
| **Theodor Sandu** | McCann/Unilever @ Omnicom | Creative Director | Singapore | SI8_Hitting a Wall | Replied-Warm | Replied to Apr 24 nudge: "Hi, sure. Anytime :)" | Send sample Chain of Title | — |
| **Matthew Sergison-Main** | OLIVER / The Brandtech Group | Senior Video Production Specialist | Winchester | SI8_Legal Friction | Replied-Warm | "Yes I am being asked this 100%" — Brandtech holdco (OLIVER works embedded with major brands) | Reply + send sample Chain of Title immediately | — |
| **Ibrahim Badi** | IKM Marketing | Managing Director | UK | SI8_Legal Friction | Replied-Warm | "Yes especially in regulated sectors. I document: AI models used, commercial licensing, editing workflow, IP ownership." — already has informal process; asks if JD is dealing with a current campaign | Reply + position SI8 as the formal structured output; send sample | — |
| **Daniel Fox-Evans** | The Kitchen London | Creative Director | London | SI8_Blocks AI Campaign | Replied-Warm | "Our main blocker is consumer backlash and sentiment at the moment on AI" — different objection (not legal blocking, but consumer sentiment); still engaged after msg#3 | Reply + clarify: Chain of Title addresses the legal/documentation side; consumer sentiment is a separate creative concern | — |
| **Oliyah Joseph** | Visual Vibe | AI Creative Director | London | SI8_Legal Friction | Replied-Warm | Detailed: "clean, accountable workflow behind the scenes, sometimes simple disclosure depending on how content is used" — AI Creative Director in fashion/beauty | Reply + position SI8 as the formal output for that accountability workflow | — |
| **Saira Macleod** | Magnific (formerly Freepik) | AI Creative Consultant Lead | Reading | SI8_Legal Friction | Replied-Warm | "yes it is common place to supply all the pro[venance]..." — AI Creative Consultant Lead at major AI image/video tool company | Reply + send sample | — |
| **Abi Tomasiewicz** | DEPT® | Ai Designer | London | SI8_Legal Friction | Replied-Warm | Text-to-video = legal issue when you can't control scene; image-to-video gets approval when motion is controlled — DEPT is a major global digital agency | Reply + position Chain of Title as the formal doc that covers the image-to-video path | — |
| **Lina De Groot** | Stealth AI Startup | Advisor / Artist Collective Partnership | Amsterdam | SI8_Legal Friction | Replied-Warm | "I've had it a few times, mostly from larger brands. Rights and where things come from (faces, data, etc.)... Curious what you're seeing — is it becoming more structured on your side?" | Reply + answer her question + send sample | — |

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
| **Dagny Rozniak** | Pencil | Gen AI Creative Director | Amsterdam | SI8_Legal Friction | "not sure if legal teams ask anything specific" (msg#1) | Pain not fully formed yet. Gen AI CD at AI-native production co — good role, wrong timing. Re-engage when EU AI Act August deadline is closer. |
| **Ricardo Barchan** | Joolz Jewellery | Beauty & Jewellery Retoucher | UK | SI8_Legal Friction | Confirmed yes but wrong role (retoucher, not CD/decision maker); asked about collaboration (msg#1) | Close — wrong role; no follow-up needed. |
| **Daniel Simler** | Samsung SDS Europe | Creative Content Production PM | London | SI8_Legal Friction | "Not at the moment but there need to be more regulations" — forward-looking, no current pain (msg#1) | Samsung SDS = tech-side; PM role not decision maker. Monitor; re-engage Q3. |
| **Kasra Mirzarezaie** | Case Connect LLC | Creative Director / AI Video | South Croydon | SI8_Legal Friction England 0426A | Described CA advertising compliance standards — has compliance mindset but geo focus is California campaigns (msg#1) | Reply; probe if they run UK/EU campaigns for clients — could qualify if they do. |
| **Dylan Guo** | Independent | Creative Technologist | London | SI8_Legal Friction England 0426A | "haven't run into it yet, but if asked I'd provide workflow notes. I make sure everything is traceable." (msg#1) | No current pain. Traceable-minded. Reply + position SI8 as the formal output that legal teams accept. |
| **Tahreem Khan** | Xperia Labs | Creative Technologist/AI | London | SI8_Legal Friction England 0426A | "Generally not. But u do wanna look into potential copyright issues" (msg#1) | Cryptic but engaged — London, AI title. Reply + probe what copyright issues they see in their work. |
| **Alex Futcher** | Audiomovers | Head of Commercial | London | SI8_Vetting Takes Weeks | "don't have a direct need currently; however, I think this could be very useful when the requirement arises." — warm exit (msg#2) | Nurture. Audiomovers = audio tools; when they commission AI video it will trigger. Q3 check-in. |
| **Josh Guillaume** | Blue Dog VFX | Creative Director | Los Angeles | SI8_Legal Friction LA 0426A | Described NDAs + data security in VFX AI; asked "how has it been looking on your end?" — proactively engaged (msg#1) | Off-geo (LA). Strong ICP signal — VFX/AI CD who thinks about data rights. Monitor for Year 2. |
| **Igor Gutierrez** | electrozooer | Multimodal Artist | Los Angeles | SI8_Legal Friction LA 0426A | "Definitely they do. Many agencies are now providing AI manifestos, showcasing all aspects and details of how the videos were generated to the clients legal teams." (msg#1) | Off-geo (LA). Strongest US ICP validation to date. Creator-side role but knows agency side well. Monitor for Year 2. |

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
| Dave Waldman | Apple | Senior Producer | London | SI8_Legal Friction | — | "haven't had to do any of this yet" — Apple internal production; not there yet |
| Lucy Batley | Welcome to MOTHER | — | Newcastle | SI8_Legal Friction | — | Polite pass — Newcastle off-primary-target |
| Christian Iachini | Xponential7 | — | London | SI8_Legal Friction | — | "not interested" |
| Ben Mills | The Subthread | Creative Director | London | SI8_Blocks AI Campaign | Lilly | "Thanks Lilly" after msg#2 — minimal; polite exit |
| Mark Aaron Grundland | adidas | Creative Director | Amsterdam | SI8_Legal Friction Amsterdam 0426A | Vanessa | "Thanks Vanessa" after msg#2 — polite exit (notable company; no active AI video need) |
| Cj Cheung | Orange Fever | Executive Producer | Amsterdam | SI8_Legal Friction Amsterdam 0426A | Vanessa | "we aren't doing much with AI right now" — polite pass (msg#1) |
| Anaïs Bresle | Firefinch Marketing | Marketing Director / Founder | London | SI8_Vetting Takes Weeks | Vanessa | "I Am ok for now thanks" after msg#3 |
| Kelvin Loon | Growth Catalyst | General Manager | Singapore | SI8_Trusted AI Supplier | Vanessa | Replied during family bereavement — not a buyer context; close thread (msg#4) |
| Nic Chamberlain | Hey Juno | Head of Experience & Relationships | Newport, Australia | SI8_Vetting Takes Weeks | Lilly | "Thanks, we are all fine in this area. No requirement" — Australia off-geo (msg#4) |
| Rajeev Aggarwal | That Fig Tree | Partner & Chief Growth Officer | Singapore | SI8_RV_Mgr+_Adv_SPG | Lilly | "i wouldnt be keen" (msg#3) |
| Paul Fu | Ubisoft Singapore | Creative Director | Singapore | SI8_Hitting a Wall | Lilly | "I have no need for an AI vetting service, thank you :)" — gaming company (msg#4) |
| Helen Stock | YardWise | Co-Founder | London | SI8_Legal Friction | Vanessa | "No thanks" — wrong sector (landscaping/yard industry events, msg#4) |
| Natalie Leroy | Accenture UK & Ireland | Design Lead - Research | London | SI8_Legal Friction | Ivy | "Hi not interested thank you" — wrong role (research/design, not video production) |
| Martin Venter | Al Khaleej Investment PSC | CCO | Dubai | SI8_Legal Friction | Lilly | "No thanks" — investment firm, wrong sector; Dubai off-geo (msg#2) |
| Sanar Najim | ALZAEEM GROUP | — | Dubai | SI8_Legal Friction | Lilly | "No, no client has made such a requirement" — Dubai off-geo (msg#1) |

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
| Peter Darrell | 4Ax Technologies | Data Scientist | London | SI8_Legal Friction | — | Wrong role — data scientist, not creative/production (msg#1) |
| Adam Ridges | OneAdvanced | Project Manager | Birmingham | SI8_Legal Friction | — | Wrong role — PM at software co; no AI video use case (msg#1) |
| Eudonni Moricom | Aspargo Laboratories | Project Manager | London | SI8_Legal Friction | — | Wrong role — pharma PM, no AI video use case (msg#1) |
| Chris Ogunsalu | Putitonline Tech Services | Project Manager | London | SI8_Legal Friction | — | Wrong role — tech PM, no AI video use case (msg#1) |
| Jasper Klimbie | CDI Services | Conversational AI Consultant | Amsterdam | SI8_Legal Friction | — | Wrong role — AI consultant (chatbots/conversational), not video production (msg#1) |
| Gianni Lieuw-A-Soe | Internationaal Theater Amsterdam | Supervisory Board Member | Amsterdam | SI8_Legal Friction | — | Wrong role — theater governance, not AI video production (msg#1) |
| Noah Makmel | AI for Detail | AI Creative | Amsterdam | SI8_Legal Friction | — | Creator, not buyer — wrong side of market; AI creative makes content, doesn't commission it (msg#1) |
| Ketan Shah | Parity UK | Lead Web Developer | UK | SI8_Legal Friction | — | Counter-pitched web development services — wrong side of market (msg#1) |
| Dan Tapper | Antidisciplinary Studio | Creative Director & Digital Strategist | Toronto | SI8_Legal Friction England 0426A | Ivy | Off-geo (Canada); uses custom/bespoke AI models, not commercial tools — no Chain of Title need (msg#1) |
| Derek Bender | Uber | Staff Product Designer | Amsterdam | SI8_Legal Friction Amsterdam 0426A | Vanessa | Wrong role — product design, not video/content production (msg#1) |
| Saravanan Ramalingam | dubizzle | Senior Multimedia Graphic Designer | Dubai | SI8_Legal Friction Dubai 0426A | Lilly | Wrong role — graphic designer; Dubai off-geo (msg#1) |
| Karim Mostafa Ragab | Freelancer.com | Video Editor | Dubai | SI8_Legal Friction Dubai 0426A | Lilly | Wrong role — video editor; Freelancer.com platform; Dubai off-geo (msg#1) |
| Ismail Ahmed | UNHCR | Visual Storyteller / Creative Strategist | Dubai | SI8_Legal Friction Dubai 0426A | Lilly | Wrong org — UN nonprofit, no commercial AI video production; Dubai off-geo (msg#1) |
| Ashar K | Gro | Brand & Visual Designer – SaaS | Jamshedpur, India | SI8_Hitting a Wall | Lilly | Wrong role/geo — designer at SaaS company, India; no AI video delivery to clients (msg#1) |
| Beatriz Politi | Brighton & Hove City Council | Marketing & Recruitment Consultant | Brighton | SI8_Legal Friction | Ivy | Wrong role — council recruiter; "I don't deliver AI generated videos" (msg#1) |
| Drausio Tronolone | dentsu | Content Director | London | SI8_Legal Friction | Ivy | "I don't deal with video deliverables" — Content Director without video production scope (msg#1) |
| Sara Nunnington | Rho Zeta AI | Creative Technologist | London | SI8_Legal Friction | Ivy | "I haven't yet generated AI generated video. I make a[nimations]..." — no AI video use case (msg#1) |
| Isadora Bucher | — | Private English Teacher | — | SI8_Legal Friction | Ivy | Wrong profile entirely — "haven't used any AI-generated videos for clients, only myself" (msg#1) |
| Joanna Bennington | Trafalgar Entertainment | Creative Learning Manager | Southsea | SI8_Legal Friction | Ivy | Wrong sector — theater/entertainment education (msg#3) |
| Iryna Kostyrko | KUMA | Creative Product Designer | Cheshire | SI8_Legal Friction | Ivy | Wrong sector — children's IP; "I haven't encountered this" (msg#1) |
| Misha George | Meesh-AI | Owner / Creative Director | Santa Monica | SI8_Legal Friction | Vanessa | "I have not. But I haven't had many clients for AI videos just yet. Looking for more opportunities" — early stage, no clients; off-geo (LA) (msg#1) |
| Terry Proto | Virtual Reality Marketing | Co-Founder + CEO | Beverly Hills | SI8_Legal Friction | Vanessa | "We don't" — off-geo (LA) (msg#1) |
| Shamus Halkowich | xAI | AI IMAGE AND VIDEO EXPERT | Los Angeles | SI8_Legal Friction | Vanessa | Substantive response on provenance/training data risk — off-geo (LA); works at AI tool company (wrong side of market for CaaS) (msg#1) |
| Guillermo Cummings | Warner Bros. Discovery / DC Comics | Director Social Programming | Los Angeles | SI8_Legal Friction | Vanessa | "We don't use Gen AI video at DC. Gen AI sucks. Please don't message me again." — HOSTILE; flag for suppression (msg#1) |
| Mason Tompkins | Stan (Stanley AI Innovation Team) | Content Systems Manager | Los Angeles | SI8_Legal Friction | Vanessa | "I don't deliver AI generated content to clients" — uses AI for own anime-style B-roll only; wrong use case (msg#1) |
| Guillermo Otero | The Livewell Media | Marketing Director | Dana Point, CA | SI8_Legal Friction | Vanessa | "we do not make full length videos only AI" — hybrid only, not full AI video pipeline (msg#1) |
| Mark Craig Itskowitch | HeyGen | Ambassador | Los Angeles | SI8_Legal Friction | Vanessa | "Not yet... probably wouldn't want to! That would take the fun away!" — anti-documentation mindset; works at AI tool company (msg#1) |
| Leo Rosa Borges | — | Executive Creative Director | Los Angeles | SI8_Legal Friction | Vanessa | Asked if Vanessa can help HIM find AI directing work — misread the outreach entirely (msg#1) |
| Evan Mathis | Prime Video / Amazon MGM Studios | Senior Creative Director | Los Angeles | SI8_Legal Friction | Vanessa | "Cannot legally put any AI produced assets into deliverables due to NIL and league rights agreements. Use AI for internal ideation only." — banned from using AI in client deliverables (msg#1) |
| Irfan Merchant | XR / Virtual Production | — | Los Angeles | SI8_Legal Friction | Vanessa | Uses real talent + location images + live video in AI pipeline — no AI IP documentation gap; wrong workflow (msg#1) |
| Manoj Joseph | SuperQ Quantum | — | Dubai | SI8_Legal Friction | Lilly | Confused by message — "Can you share more on the 'We Build your A...'" — Dubai off-geo (msg#1) |
| Michael Fayek | Ahyan Real Estate | — | Dubai | SI8_Legal Friction | Lilly | Real estate company — wrong sector; Dubai off-geo (msg#1) |
| Mustafa Mahmoud | Legend Motors | — | Dubai | SI8_Legal Friction | Lilly | Car dealership — wrong sector; "all they care [about is] the final outcome" — Dubai off-geo (msg#1) |
| Henna Mohiyuddeen | Zamania | Social Media Manager | Dubai | SI8_Legal Friction | Lilly | Wrong role — social media manager; "they do not ask" — Dubai off-geo (msg#1) |
| Vincent Drevet | — | Head of Creative / Creative Consultant | Dubai | SI8_Legal Friction | Lilly | "I'm only using AI for pitches right now" — not ready; Dubai off-geo (msg#1) |
| Lucy Aziz | Burson | — | Dubai | SI8_Legal Friction | Lilly | PR firm — wrong agency type; "Not really"; Dubai off-geo (msg#1) |
| André Teow | 500 Global | Entrepreneur in Residence | Dubai | SI8_Legal Friction | Lilly | VC/entrepreneur role — wrong profile; "No Lilly"; Dubai off-geo (msg#1) |
| Abdul Hadi Raza | Olive Green Holding | — | Dubai | SI8_Legal Friction | Lilly | Holding company — wrong sector; no AI video use case; Dubai off-geo (msg#1) |
| Joe Fletcher | Publicis Sapient | VP of UX / Experience | Dubai | SI8_Legal Friction | Lilly | "we don't do campaign work" — UX/experience role at tech consultancy; wrong profile; Dubai off-geo (msg#1) |
| Debjani Mukherjee | GEMS World Academy | Visual Arts Teacher | Dubai | SI8_Legal Friction | Lilly | School teacher — wrong profile; Dubai off-geo (msg#1) |
| Anuj Gunasena | Al Tayer Insignia / Bloomingdale's | Photographer | Dubai | SI8_Legal Friction | Lilly | Wrong role — product photographer; "I haven't had clients request detailed documentation"; Dubai off-geo (msg#1) |
| Artemio Mani | Freelance | Digital Designer | Dubai | SI8_Legal Friction | Lilly | Freelance designer — "clients interested in result only"; Dubai off-geo (msg#1) |

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
| SI8_Legal Friction Dubai 0426 | LinkedIn (Dripify) | Lilly | ~30 | 30 (high response rate) | Apr 30, 2026 |
| SI8_Legal Friction LA 0426 | LinkedIn (Dripify) | Vanessa | ~20 | ~10 | Apr 30, 2026 |

**Dubai Batch — April 30, 2026 — Now Active Target Geo (May 1, 2026)**
~30 Dubai responses logged. Response rate and signal quality exceeded expectations — added as active target geo May 1. Active pipeline entries:
- **Florent Delavous** (Xtendency™, CEO, AI video production consulting house) — "already working on something in this space" — B095 — HIGH
- **Ankita Biswas** (HTCreaTec, Art Director) — "I'd love to know more and talk over a chat" — B096 — MEDIUM
- **Sultan Alsuwaidi** (Video tube) — "Yes — becoming standard now. Where assets came from, licensed, AI vs human-made, any risks" — B099 — HIGH
- **Michelle Ponto** (Blue Gecko Communications) — "Yes, asking about copyright, deepfake concerns, IP. Some even ask to see your prompts" — B098 — MEDIUM
- **Ramez Tabshi** — "Becoming standard practice. I've started including a short technical summary with my deliveries." — B100 — MEDIUM
- **Anas Bakal** (Monoud Trading) — detailed: tool licensing, prompt logs, no celebrity/trademark use, metadata verification — B101 — MEDIUM
- **Amr Tahtawi** — "20% of clients ask, I charge extra fees. I teach at Spotify and gov trainings." — B102 — LOW
- **James Larkin** (Saatchi & Saatchi, Associate Design Director) — "i can't say i have an NDA" — B097 — LOW
Dubai note: 38 total responses, 22 warm/research leads active in pipeline (B095–B116). Response rate and signal quality exceeds London. Market is aware of the problem and many already have informal processes. Alias = Lilly across all Dubai contacts. Logline = Logline-Global-v1 (CarFax analogy). New pipeline segments: Replied-Research = wrong role for sales but high intelligence value — reply to extract market data.

**LA Batch — April 30, 2026 — Market Research Note:**
- **Justin Lufair Brown** (Amazon, Creative Producer AI Video Production) — most sophisticated signal to date: "contract language around this has tightened a lot in the last 12 months... clients are responsible for inputs, we're responsible for outputs being clear of third-party rights claims. Happy to go deeper if it's useful." — B094
- **Jr Horsting** (IPS Studios, CCO) — sent his own Calendly link mid-conversation; "doing a great deal of AI production, IP deals" — B093
- **Eric Vandruff** (VanDruff Productions, Creative Director) — detailed response on workflow transparency for commercial campaigns; CA
- **Carl Seibert** (Conduit Collective, Executive Producer/AI Transformation Consultant) — "Yes"; LA
- **Jason Teng** (AI Creative) — "Yes, they do."; LA
LA verdict: US market is clearly aware of and experiencing the problem. Strong Year 2 pipeline. Not Year 1 primary focus.

---

*Next update: when new LinkedIn or IG responses arrive, or after next discovery call.*
