# LinkedIn Reply Templates — Split Test Tracker

**Purpose:** Track manual reply messages and logline variants sent to warm leads. Used to identify which framing generates the best reply rates and conversation depth.

**Logging rule:** Every manual reply sent to a warm lead gets logged here. Record the lead ID, logline variant used, and eventual outcome (replied / no reply / call booked / not interested).

**Data flow:** This file → LINKEDIN-CAMPAIGN-ANALYSIS.md when patterns emerge across N≥5 per variant.

---

## LOGLINE VARIANTS

Loglines are the closing line(s) that describe what SI8 does. We split test these across warm leads to see which framing generates the most replies.

---

### Logline-UK-v1 (active — May 1, 2026)

For UK contacts. Uses HPI Check analogy (UK's dominant used-car history check brand).

we've built an online platform to run a 90-min Chain of Title review for AI video — kind of like a "HPI Check", but for clearing AI videos. Submit a video and get back a clearance report: green light means you've got all the necessary documentation, red flags tell you exactly what's blocking approval and why -- before it ever hits the client's legal team.

**Sent to:** B088 Matthew Sergison-Main (OLIVER / Brandtech), May 1, 2026
**Outcome:** Waiting

---

### Logline-Global-v1 (not yet deployed)

For non-UK contacts (US, APAC, Global). Uses CarFax analogy.

we've built an online platform to run a 90-min Chain of Title review for AI video — kind of like a "CarFax", but for clearing AI videos. Submit a video and get back a clearance report: green light means you've got all the necessary documentation, red flags tell you exactly what's blocking approval and why -- before it ever hits the client's legal team.

**Sent to:** —
**Outcome:** —

---

### Logline-Short-v1 (not yet deployed)

Shorter version — no analogy, just the mechanism. For contacts who already understand the space.

we run a 90-min Chain of Title review for AI video — submit and get back a clearance report with a green light or specific red flags on what's blocking approval.

**Sent to:** —
**Outcome:** —

---

## REPLY TEMPLATE LOG

Each row = one manual reply sent to a warm lead outside the drip sequence.

| Date | Lead ID | Name | Company | Alias | Question Used | Logline Used | Send Time TPE | Send Time Local | Outcome |
|------|---------|------|---------|-------|---------------|--------------|---------------|-----------------|---------|
| 2026-05-01 | B088 | Matthew Sergison-Main | OLIVER / The Brandtech Group | Ivy | Q-Gate-v1: legal team vs procurement — formal gate or box in the brief? | Logline-UK-v1 | ~11:00 TPE | ~04:00 BST | Waiting |
| 2026-05-01 | B087 | Ibrahim Badi | IKM Marketing | Ivy | Q-Process-v1: PDF with deliverable or separate email chain? | Logline-UK-v1 | 11:30 TPE | 04:30 BST | Waiting |
| 2026-05-01 | B079 | Tunc Akyuz | Big Media & Technology | Ivy | Q-Process-v1: documentation to back up IP guarantee, or verbal only? | Logline-UK-v1 | 11:30 TPE | 04:30 BST | Waiting |
| 2026-05-01 | B071 | Jenny Springett | Electric Violet TV | Ivy | Q-Origin-v1: broadcasters directly or brand/rights holder before clearance? | Logline-UK-v1 | 11:30 TPE | 04:30 BST | Waiting |
| 2026-05-01 | B072 | Nick Craske | Havas Lynx | Ivy | Q-Gate-v1: specific campaign type or standard across the board? | Logline-UK-v1 | 11:30 TPE | 04:30 BST | Waiting |
| 2026-05-01 | B089 | Oliyah Joseph | Visual Vibe | Ivy | Q-Gate-v1: paid media vs organic — different doc levels or consistent? | Logline-UK-v1 | 11:30 TPE | 04:30 BST | Waiting |
| 2026-05-01 | B090 | Saira Macleod | Magnific (formerly Freepik) | Ivy | Q-Process-v1: client files it formally or just confirms to proceed? | Logline-UK-v1 | 11:30 TPE | 04:30 BST | Waiting |
| 2026-05-01 | B091 | Abi Tomasiewicz | DEPT® | Ivy | Q-Process-v1: source images or generation step? | Logline-UK-v1 + URL | 22:00 TPE | 15:00 BST | Waiting |
| 2026-05-01 | B052 | Loewe Chung Nin Lee | — | Ivy | Q-Origin-v1: legal team directly or agency account team? | Logline-UK-v1 + URL | 22:00 TPE | 15:00 BST | Waiting |
| 2026-05-01 | B051 | Kiel Robinson | Ok let's play Studios | Ivy | Q-Process-v1: hand to client or internal working doc? | Logline-UK-v1 + URL | 22:00 TPE | 15:00 BST | Waiting |
| 2026-05-01 | B050 | Julia N'Diamoi | T&P | Ivy | Q-Process-v1: tool list only or also training data/IP chain? | Logline-UK-v1 + URL | 22:00 TPE | 15:00 BST | Waiting |
| 2026-05-01 | B049 | Ruth Teasdale | Motion World Ltd | Ivy | Q-Validate-v1: validated process, asked time + PDF format | Logline-UK-v1 + URL | 22:00 TPE | 15:00 BST | Waiting |
| 2026-05-01 | B046 | Kd Pascall | Bluvision Studios | Lilly | Q-Origin-v1: specific client or campaign type that triggered it? | Logline-UK-v1 + URL | 22:00 TPE | 15:00 BST | Waiting |
| 2026-05-01 | B057 | Rheea Aranha | Vincent Studios | Ivy | Email-Request-v1: asked for best email to send sample | None | 22:00 TPE | 15:00 BST | Waiting |
| 2026-05-04 | B053 | Graham Vincent | grigio:london | Ivy | Q-Format-v1: PDF with deliverable, email trail, or something more structured? | Logline-UK-v1 ("For us, we've built...") | 18:20 TPE | 11:20 BST | Waiting |
| 2026-05-04 | B066 | Uli Redkina | — | Ivy | Q-Process-v1: PDF with deliverable or separate email chain? | Logline-UK-v1 ("For us, we've built...") | 18:20 TPE | 11:20 BST | Waiting |
| 2026-05-04 | B078 | Daniel Simler | Samsung SDS Europe | Ivy | Traceability → formal docs framing (NOTE: message opened "Hi Dylan" — name error) | Logline-UK-v1 ("For us, we've built...") | 18:46 TPE | 11:46 BST | Waiting |
| 2026-05-04 | B081 | Dylan Guo | Independent | Ivy | Traceability → formal docs framing | Logline-UK-v1 ("For us, we've built...") | 18:46 TPE | 11:46 BST | Waiting |
| 2026-05-04 | B084 | Tahreem Khan | Xperia Labs | Ivy | Copyright angle — training data/tool licensing; probe internal vs client-driven | Logline-UK-v1 ("For us, we've built...") | 18:46 TPE | 11:46 BST | Waiting |
| 2026-05-04 | B086 | Daniel Fox-Evans | The Kitchen London | Vanessa | Q-Sentiment-v1: sentiment is separate; legal clearance running in parallel — is legal also coming up? | None | 19:05 TPE | 12:05 BST | Waiting |
| 2026-05-04 | B067 | Alena Stepanova | Philip Morris | Ivy | Explained agency-side model; probed if PM commissions AI video from agencies | Logline-UK-v1 ("For us, we've built...") | 19:07 TPE | 12:07 BST | Waiting |
| 2026-05-08 | B087 | Ibrahim Badi | IKM Marketing | Ivy | Round 2: "platform live at www.superimmersive8.com; I can give you a discount code to try out for free; 15-min JD call?" — Best Regards sign-off. NOTE: www not app; "to try out for free" language | None | 12:30 TPE | 05:30 BST | Waiting |
| 2026-05-08 | B089 | Oliyah Joseph | Visual Vibe | Ivy | Round 2: confirmed agency/brand focus; went DIRECT to call ask ("Would you have 20-30 min to talk with my manager JD next week? I'm sure he'd love to share and compare notes") — no follow-up Q. NOTE: dropped diagnostic Q, went straight to conversion | None | 12:32 TPE | 05:32 BST | Waiting |
| 2026-05-08 | B090 | Saira Macleod | Magnific | Ivy | Round 2: 4-area checklist (tool licensing, training data TOS, likeness/voice, prompt provenance) + www.superimmersive8.com/sample + JD call offer. "Thanks!" sign-off | None | 12:33 TPE | 05:33 BST | Waiting |
| 2026-05-08 | B091 | Abi Tomasiewicz | DEPT® | Ivy | Round 2: not a legal opinion — checklist + flagging; HPI analogy; text-to-video vs image-to-video risk; JD call offer. "Thanks!" sign-off | None | 12:34 TPE | 05:34 BST | Waiting |
| 2026-05-04 | B080 | Kasra Mirzarezaie | Case Connect LLC | Ivy | Asked what MVA stands for — determining fit | None | 19:20 TPE | 12:20 BST | Waiting |
| 2026-05-08 | B095 | Florent Delavous | Xtendency™ | Lilly | Probe: what are you building? | Logline-Global-v1 (CarFax) — FIRST DEPLOY | 11:25 TPE | 07:25 GST | Waiting |
| 2026-05-08 | B096 | Ankita Biswas | HTCreaTec | Lilly | JD calendar coming; proposed Thu May 14 or Fri May 15 AM Dubai | Logline-Global-v1 (CarFax) — FIRST DEPLOY | 11:25 TPE | 07:25 GST | Waiting |
| 2026-05-08 | B099 | Sultan Alsuwaidi | Video tube | Lilly | Informal → formal doc framing; sample offer | Logline-Global-v1 | 11:56 TPE | 07:56 GST | Waiting |
| 2026-05-08 | B103 | Ahmed Samy Amin | GTCFX | Lilly | Answered his Q (tool licensing/TOS/likeness); probed financial client requirements | Logline-Global-v1 | 11:56 TPE | 07:56 GST | Waiting |
| 2026-05-08 | B098 | Michelle Ponto | Blue Gecko Communications | Lilly | Q-Process-v1: PDF with deliverable or separate email chain? | Logline-Global-v1 | 11:59 TPE | 07:59 GST | Waiting |
| 2026-05-08 | B100 | Ramez Tabshi | — | Lilly | Answered his Q (tool licensing/TOS/likeness); probe delivery format | Logline-Global-v1 | 12:00 TPE | 08:00 GST | Waiting |
| 2026-05-08 | B101 | Anas Bakal | Monoud Trading | Lilly | Validated existing process; positioned SI8 as structured output; sample offer | Logline-Global-v1 | 12:02 TPE | 08:02 GST | Waiting |
| 2026-05-08 | B104 | Ashraf Selo | MultiBank Group | Lilly | Probe: legal team directly or procurement/brief? | Logline-Global-v1 | 12:03 TPE | 08:03 GST | Waiting |
| 2026-05-08 | B105 | Ayman Hussein | AI-Driven Motion | Lilly | Probe: what does "breaking it down" look like — call, PDF, something else? | Logline-Global-v1 | 12:04 TPE | 08:04 GST | Waiting |
| 2026-05-08 | B106 | Mohammed Magdy Alzahran | Dybaja AI Creative Studio | Lilly | NDA/ownership = starting point; probe production process documentation | Logline-Global-v1 | 12:05 TPE | 08:05 GST | Waiting |
| 2026-05-08 | B108 | Balendu Sharma Dadhich | AILGO | Lilly | Probe: format of the compliance guarantee | Logline-Global-v1 | 12:06 TPE | 08:06 GST | Waiting |
| 2026-05-08 | B102 | Amr Tahtawi | Arizona State University | Lilly | Probe delivery format; point production clients toward SI8 | Logline-Global-v1 | 12:07 TPE | 08:07 GST | Waiting |
| 2026-05-08 | B109 | Shahin Sha | Rafaz Properties | Lilly | Probe: legal team vs procurement/brief? | Logline-Global-v1 | 12:13 TPE | 08:13 GST | Waiting |
| 2026-05-08 | B110 | Nikan Nazari | Freelance | Lilly | Probe: contract scope vs ad hoc? | Logline-Global-v1 | 12:14 TPE | 08:14 GST | Waiting |
| 2026-05-08 | B111 | Anwar Al Amin | The Film Craft MENA | Lilly | Probe: what format do clients ask for in region? | Logline-Global-v1 | 12:15 TPE | 08:15 GST | Waiting |
| 2026-05-08 | B112 | Manoj Reddy | ALBAB Media LLC | Lilly | EU AI Act Aug 2026 hook | Logline-Global-v1 | 12:16 TPE | 08:16 GST | Waiting |
| 2026-05-08 | B113 | Mohanaselvan Jeyapalan | Expo City Dubai | Lilly | Framework vs commercial deliverable; probe if filtering into commercial requirements | None | 12:17 TPE | 08:17 GST | Waiting |
| 2026-05-08 | B114 | Debjani Mukherjee | GEMS World Academy | Lilly | Answered her Q (training data TOS, likeness); probe source of interest | None | 12:18 TPE | 08:18 GST | Waiting |
| 2026-05-08 | B115 | Anuj Gunasena | Al Tayer Insignia | Lilly | Financial services + large brand campaigns as primary drivers | Logline-Global-v1 | 12:19 TPE | 08:19 GST | Waiting |
| 2026-05-08 | B116 | Artemio Mani | Freelance | Lilly | Overview + sample link | Logline-Global-v1 | 12:20 TPE | 08:20 GST | Waiting |

---

## REPLY QUESTION VARIANTS

The opening question before the logline. Also being split tested informally.

**Q-Gate-v1** — "is it coming from their legal teams directly, or more from procurement and brand stakeholders? Trying to understand whether it's a formal approval gate or more of a box in the brief."
Used for: contacts who confirmed clients ask (want to understand the mechanism)

**Q-Process-v1** — "when you put that together for a client, does it travel as a PDF with the deliverable, or more of a separate email chain?"
Used for: contacts who already have an informal process (Hugo Barbera type)

**Q-Timing-v1** — "when a client does ask, is it typically before delivery or earlier in the production process?"
Used for: contacts who said 'when we need it we'll be in touch'

**Q-Origin-v1** — "when it comes up for you, is it at the pitch stage or after production wraps?"
Used for: contacts who confirmed rising frequency but no detail

**Q-Format-v1** — "when they ask, what format do they actually want it in — a PDF, an email trail, or something more structured?"
Used for: contacts who confirmed clients ask, didn't describe format

**Q-Sentiment-v1** — "is the legal review also coming up, or is it purely the public perception piece right now?"
Used for: B086 Daniel Fox-Evans (consumer sentiment objection)

**Q-Validate-v1** — validate their existing process first ("That's great [name]! More agencies and productions need to do this."), then ask how long it takes + what format they deliver in.
Used for: contacts who already have an informal process and described it positively. Warmer opener — leads with praise before the question.

**Email-Request-v1** — skip the logline entirely; just ask for their email to send the sample.
Used for: contacts who explicitly asked for a sample. Gets straight to the action they already said yes to.

---

## ROUND 2 PATTERNS (observed May 8, 2026)

Applies when lead has already received the logline and replied with a substantive question or engagement signal.

**Round 2 — Direct Call Ask**
Skip diagnostic questions. Go straight to: "Would you have 20-30 minutes to talk with my manager JD next week? I'm sure he would love to share and compare notes."
Used for: leads who engaged substantively with the logline reply — answer their question if they asked one, then close with the call ask directly. Don't ask another diagnostic Q.
First used: B089 Oliyah Joseph (May 8)

**Round 2 — Platform + Free Code**
"The platform is live at www.superimmersive8.com. I can give you a discount code to try out for free. Would it be useful to get my manager JD on a quick 15-min call first to walk you through the submission and what to expect?"
Used for: leads who explicitly asked to beta test or try the platform.
First used: B087 Ibrahim Badi (May 8)

**Round 2 — Checklist Explanation**
Explain the 4 review areas (tool licensing, training data TOS, likeness/voice rights, prompt/asset provenance) + sample link + call offer.
Used for: leads asking "what does the checker look for?" or "how does it work?"
First used: B090 Saira Macleod (May 8)

**Round 2 — Accuracy/Scope Defence**
"We're not issuing a legal opinion — we're reviewing documentation against a defined checklist and flagging what's missing. The output tells a legal team exactly what's on file and what isn't, rather than making a judgment call on liability." + HPI analogy + call offer.
Used for: leads pushing back on accuracy or scope ("how do you know you're right?")
First used: B091 Abi Tomasiewicz (May 8)

**URL rule (observed):** Always use www.superimmersive8.com in outreach — not app.superimmersive8.com.
**Sign-off pattern:** "Thanks! / Best Regards," + alias name.

---

## SPLIT TEST RESULTS (update as replies come in)

| Logline | Sent | Replied | Reply Rate | Notes |
|---------|------|---------|------------|-------|
| Logline-UK-v1 | 16 | 0 | — | May 1 batch (14) + May 4 B053+B066 (2); note: user added "For us," prefix on May 4 sends |
| Email-Request-v1 (no logline) | 1 | 0 | — | Rheea Aranha — asked for email to send sample |
| Logline-Global-v1 | 20 | 0 | — | First deployed May 8 — 20 Dubai leads; 07:25–08:20 GST |
| Logline-Short-v1 | 0 | — | — | Not deployed |

**Send Time Tracking:**

Batch 1 (B088, B087, B079, B071, B072, B089, B090) — 11:00–11:30 TPE = 04:00–04:30 BST — early morning UK
Batch 2 (B091, B052, B051, B050, B049, B046, B057) — 22:00 TPE = 15:00 BST — mid-afternoon UK
Batch 3 (B053, B066) — 18:20 TPE May 4 = 11:20 BST — mid-morning UK Monday

These two batches are a natural A/B test on send time. Track time-to-first-reply for each batch. Hypothesis: 15:00 BST (active workday) may get faster replies; 04:30 BST (wake-up notification) may get higher open rate but slower reply. Next data point to collect: which batch gets its first reply first, and which has a higher reply rate by May 8.
