# Presentation Script — June 4, 2026
**Event:** Build Your AI-Native B2B Go-to-Market System
**Venue:** FutureWard Central, Taipei
**Slot:** 15:00–15:25 (25 minutes)
**Speaker:** JD Chang — CEO, Standing Encore
**Topic:** AI-Powered ICP Design & LinkedIn Outbound Testing

---

## Timing Overview

| Segment | Time | Duration |
|---------|------|----------|
| Personal intro + SI8 story | 15:00 | 3 min |
| The system (slides) | 15:03 | 4 min |
| Live demo setup | 15:07 | 1 min |
| Live demo — 5 prompts | 15:08 | 14 min |
| Takeaways + CTA | 15:22 | 3 min |
| Buffer / audience questions | 15:25 | — |

---

## Cost Calculations (Standing Encore Pricing)

*Use these numbers on slides — verified against actual campaign data.*

| Metric | Value | Source |
|--------|-------|--------|
| Cost per message thread | $0.38 | Standing Encore 1,000-credit tier |
| Early response rate (wrong ICP + sequence) | 1.5% | Documented Provenance campaigns, London Mgr+Mktg |
| Early cost per response | **$25.33** | $0.38 ÷ 1.5% |
| Best response rate (right ICP + sequence) | 16.4% | Legal Friction, France campaign |
| Best cost per response | **$2.32** | $0.38 ÷ 16.4% |
| Improvement ratio | **11x** | $25.33 ÷ $2.32 |
| Cost per discovery call (Dubai, best geo) | **$36.86** | 388 leads × $0.38 ÷ 4 verified calls |
| Cost per discovery call (UK) | **$53.09** | 978 leads × $0.38 ÷ 7 verified calls |
| Total campaigns run | 26 | — |
| Total leads messaged | 7,025 | — |
| Total responses received | 531 | — |

---

## Slide Deck (4 slides before demo)

---

### SLIDE 1 — Who I Am and What I'm Building *(say while slide is up)*

**Slide content:**
```
JD Chang
CEO, Standing Encore
───────────────────────────────────────
Side project: SuperImmersive 8 (SI8)
AI video compliance for agencies

10 hours/week. No sales team. No budget for mistakes.
```

**Speaker notes — what to say (3 min):**

> "I have a day job. I work at Calyx, an AI company here in Taipei. I do B2B sales consulting for a living. But about six months ago I started building a side project — SuperImmersive 8, or SI8.
>
> The short version: I have a background in film production. Twenty years ago I was a line producer in LA. My family is in film and TV post-production, still. So when I saw AI video explode — Runway, Kling, tools that let you generate commercial-quality video in minutes — I thought there had to be a business here.
>
> Here's the problem I found: brands and agencies are terrified to actually use this content in campaigns. Not because it looks bad. Because nobody can prove it's legally clean. Which AI tools were used? Do those tools have commercial licenses? Whose faces are in that video? Was the training data licensed?
>
> The EU AI Act comes into full enforcement on August 2nd — eight weeks from now. Legal teams are already asking for documentation. The market is moving fast.
>
> So SI8 is a compliance service for AI video. Agencies submit a video, we run a 90-minute review, and they get back a Chain of Title document — one PDF that a brand's legal team can file and approve a campaign against. $499 per video.
>
> Now here's the part I want to tell you about. I started this company with a completely different model. I've actually pivoted this business four times in three months.
>
> Version 1: I tried to build a filmmaker catalog — sign creators, then sell their work to brands. I hit the classic chicken-egg problem immediately. Filmmakers said: 'show me buyers first.' Buyers said: 'show me the catalog first.' Nobody moved.
>
> Version 2. Version 3. Both failed for similar structural reasons — I was selling something that didn't exist yet on both sides.
>
> Version 4 — the current one — I figured out only through LinkedIn outreach. Not from a business school framework. From actually reading what 531 people wrote back to me.
>
> And that's what this talk is about. How I used Standing Encore — which is my own tool — to run the outreach, and Claude Code to figure out what the replies were telling me. And how those two things together let a solo founder with 10 hours a week find product-market fit faster than I had any right to."

---

### SLIDE 2 — The Old Way *(30 seconds)*

**Slide content:**
```
The Old Way

26 campaigns.  7,025 messages.  Early results:

Sequence: "Documented Provenance"
Target: Marketing Managers, London

Response rate:   1.5%
Cost per reply:  $25.33
Calls booked:    0
```

**Speaker notes:**

> "When I started, I was guessing. Wrong titles, wrong message, wrong framing. This is what that looked like. One in sixty-seven messages got a reply. Zero calls. $26 a response, and none of those responses were actually useful."

---

### SLIDE 3 — The System *(1 min)*

**Slide content:**
```
Standing Encore          Claude Code
────────────────         ──────────────────────
Verified profiles   →    Reads every reply
Sends at scale      →    Finds ICP patterns
4-message sequences →    Tells you what's wrong
Unified inbox       →    Decides what to run next

One loop. Runs every two weeks.
```

**Speaker notes:**

> "Standing Encore is the execution layer — it sends the messages from verified LinkedIn profiles at scale. Claude Code is the intelligence layer — it reads the replies, finds patterns, and tells me what to change.
>
> Together they run a feedback loop. Every two weeks, I review what's working, update the targeting and messaging, and relaunch. It's not automation. It's structured experimentation.
>
> And here's the important thing: I also used Claude Code to build the SI8 website, the creator portal, the Stripe payment integration, the PDF generation system. Everything you'd normally need a dev team for. Same tool, different use case."

---

### SLIDE 4 — The Result *(30 seconds)*

**Slide content:**
```
Same $0.40/message. New ICP. New message.

Response rate:    1.5%  →  16.4%
Cost per reply:   $25.33 →  $2.32

11x cheaper.

Cost per discovery call: ~$37 (Dubai), ~$53 (UK)

26 warm leads.  5 calls requested.  1 call taken.  0 closed.

(The system is still running.)
```

**Speaker notes:**

> "Same tool. Same price per message. Different target, different sequence — and eleven times cheaper per response. Cost per actual discovery call: $39. That's not a typo.
>
> And I'll be honest: zero closed deals yet. The system is still running. I'm showing you a work in progress, not a success story — because I think that's more useful. The point isn't that I won. The point is I stopped wasting money on the wrong people, and I figured that out in two months instead of two years.
>
> Let me show you how this actually works. I'm going to switch over to Claude Code and ask it questions I ask every week."

---

## Live Demo Script

*Switch to desktop. Open Claude Code terminal in the SI8 project directory.*

**Setup line to say before typing:**
> "This is Claude Code running locally against SI8's actual CRM data, campaign logs, and pipeline. Everything it shows you is real — not a demo environment, not sample data."

---

### PROMPT 1 — ICP *(3 min)*

**Type exactly:**
```
Who is our ICP right now based on our warm leads? Give me title clusters, geo breakdown, and which leads are showing the strongest buying signal.
```

**What Claude will show:** Pipeline ICP analysis — Germany 100% current-pain signal, holdco execution layer (OLIVER, Monks, JvM), title clusters (Founder > CD > Sr Production Specialist), Trigger 1/2/3 classification.

**While Claude responds, say:**
> "Watch what happens. It's reading the pipeline file, the CRM, and the analysis we ran last week. It's not searching the internet — it knows our leads."

**After response, say:**
> "This took me four weeks to figure out on my own with spreadsheets. It takes Claude about ten seconds. And the insight that matters here — Germany is punching way above its weight. Tiny campaign volume, 100% pain signal. That's where we're running next."

---

### PROMPT 2 — Campaign Performance *(3 min)*

**Type exactly:**
```
Which campaigns worked and which didn't, and why? Show me the response rate comparison between our early campaigns and our best campaigns.
```

**What Claude will show:** Sequence comparison — Documented Provenance 1.5% vs Legal Friction 16.4%, the AI keyword filter effect (9.9–16.4% with AI filter vs 2–4.3% without), geo rankings.

**After response, say:**
> "One sequence change. That's it. Same profiles, same geos, same price per message — just a different opening question. 'Worried about recommending AI video without verified rights?' versus 'Quick question: when you deliver AI video to a client, is their legal team asking for documentation?'
>
> The second one sounds like a research question, not a sales pitch. It's non-threatening. It invites a real answer. And the real answer tells me whether this person is in pain today or not.
>
> That insight — which I would have taken months to find alone — I found in two weeks because Claude was reading the patterns across hundreds of replies I couldn't have read manually."

---

### PROMPT 3 — Split Test Learnings *(3 min)*

**Type exactly:**
```
What did we learn from our split tests? Specifically what we learned about EU Act messaging and about the process-first approach with warm leads.
```

**What Claude will show:** SPLIT-TEST-LOG summary — EU Act client-pull outperforms regulatory push for UK/FinServ (Ivan Petruzzelli, State Street VP replied within 24hrs), process-first questions can repel leads who've already formalized their own solution.

**After response, say:**
> "This is the part that blew my mind when I found it. I was testing two versions of an EU AI Act message. One led with the hard deadline and penalty. The other said 'your clients are already reacting to August 2nd.'
>
> The second one got a reply within 24 hours from a VP at State Street Investment Management — one of the biggest asset managers in the world. He said 'yes we are' in two words. That's the whole message.
>
> The regulatory framing wasn't wrong. But for financial services, client pressure lands harder than regulatory abstraction. I wouldn't have known that without testing it. I wouldn't have tested it systematically without this setup."

---

### PROMPT 4 — Live Lead Response *(3 min)*

**Type exactly:**
```
A Creative Director at a Berlin studio just replied to our connection request. They said: "Yes, clients are starting to ask about this more, especially the larger brands." What stage is this lead and what should I send them next?
```

**What Claude will show:** Signal classification (Trigger 1 — already being asked), appropriate next action (pain-mirror + send sample or offer call depending on company size), reference to Germany ICP pattern.

**After response, say:**
> "This is what replaces a junior SDR for me. Someone replied. I don't have to think about what it means or what to say — I paste it in, I get back a classification and a suggested response. I review it, I edit it if needed, I send it.
>
> At 7,025 messages and 531 replies, I can't carry all of that in my head. But I can review and approve Claude's judgment calls. That's the workflow."

---

### PROMPT 5 — Next Campaigns *(2 min)*

**Type exactly:**
```
What campaigns should Standing Encore run next for SI8?
```

**What Claude will show:** CAMPAIGN-QUEUE — the prioritized list: Angel Berlin Metro EU AI Act, Ivy Singapore batch 2, Vanessa Stockholm EU AI Act, JD London FinServ, and the reasoning for each.

**After response, say:**
> "Every two weeks, this is what I look at. A prioritized list of what to run next, why, how many leads, what sequence. It took about two hours to build the system that generates this. It saves me three hours of manual analysis every two weeks.
>
> And more importantly — it means I don't make gut decisions. I make data decisions. Every campaign is traceable back to what a prior reply told us."

---

## Takeaways Slide (Slide 5)

**Slide content:**
```
Three things you can do this week

1.  Your first 200 messages are a research project.
    Let replies tell you who your ICP actually is.

2.  One sequence change = 11x cheaper per response.
    Test the message before you scale the volume.

3.  Standing Encore sends.
    Claude Code thinks.
    You close.

─────────────────────────────────────
Standing Encore: www.standingencore.com
14-day free trial + 100 credits
```

**Speaker notes:**

> "The thing I want you to walk away with is this: outbound LinkedIn isn't just a sales tool. It's a market research tool. Every reply is a data point about who has the problem, how they think about it, how they talk about it.
>
> Most founders scale outreach before they've figured out the message. I did too — that's where the $26/response number came from. The system I'm showing you is what makes sure you don't do that.
>
> Standing Encore runs the messages. Claude Code reads the patterns. You focus on the calls that actually matter.
>
> Try it for free — 14-day trial, 100 credits included, no credit card. Link on the slide. And if you want to talk about setting up a campaign for your company, come find me at the networking session."

---

## Demo Backup Plan

*If WiFi fails or Claude Code hangs, use these screenshots instead:*

**Before presenting, run all 5 prompts and screenshot the outputs. Save as:**
- `backup-01-icp.png`
- `backup-02-campaigns.png`
- `backup-03-splittests.png`
- `backup-04-leadresponse.png`
- `backup-05-nextcampaigns.png`

**If demo fails, say:**
> "Let me show you what this looks like — I ran through this earlier this morning."
*(Switch to screenshots and walk through them at the same pace.)*

---

## Pre-Presentation Checklist

- [ ] Run all 5 prompts in Claude Code, confirm outputs load correctly
- [ ] Screenshot all 5 outputs as backup
- [ ] Slides exported as PDF (backup if Canva/PowerPoint fails)
- [ ] Terminal font size: 18pt minimum (readable from back of room)
- [ ] Dark theme in terminal (easier to read projected)
- [ ] Claude Code working directory: `C:\Users\User\Desktop\superimmersive8`
- [ ] Close Slack, email, notifications before going live
- [ ] Confirmed: slide deck → Claude Code terminal (no other windows open)

---

## Key Stats Reference Card

*Quick reference if audience asks follow-up questions during panel:*

| Question | Answer |
|----------|--------|
| How many messages total? | 7,025 across 26 campaigns |
| Best response rate? | 16.4% (France, Legal Friction sequence) |
| Worst response rate? | 1.0% (Sydney, Vetting Takes Weeks) |
| Cost per message (Standing Encore)? | $0.38 (1,000-credit tier) |
| Best cost per call? | ~$37 (Dubai, 4 verified calls) |
| How long to build this system? | About 2 months of active iteration |
| What sequence works best? | Legal Friction — conversational question, not a pitch |
| What ICP works best? | Creative Director / Founder at AI video studio, 10–50 people, UK or Germany |
| Is SI8 profitable yet? | No — 0 closed deals, 26 warm leads, 5 calls requested. Still validating. |
| What's the EU AI Act deadline? | August 2, 2026 — enforcement starts for AI-generated content |

---

*File location: `03_Sales/PRESENTATION-JUN4.md`*
*Last updated: 2026-06-02*
