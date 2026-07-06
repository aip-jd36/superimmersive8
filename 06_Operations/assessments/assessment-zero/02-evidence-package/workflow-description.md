# Meridian Creative — Production Workflow Description

**Project:** Clarity — Harborne Financial App Campaign
**Prepared by:** Sarah Chen, Creative Director
**Date:** 4 July 2026

*This document describes the production workflow for the Clarity campaign. It was prepared in response to SI8's Evidence Preparation Guide and is provided to support the Domain H (Human Creative Contribution) and Domain T (Technical Provenance) review.*

---

## Project Brief

Harborne Financial engaged Meridian Creative to produce a 30-second social media campaign promoting the launch of their "Clarity" investment app for retail investors.

**Client brief summary:**
- Tone: confident, modern, trustworthy
- Target audience: working professionals aged 28–45
- No talent: client preference for abstract/environmental visuals only
- Key message: "Clarity gives you a clear view of your finances"
- CTA: Download on App Store / Google Play

---

## Step 1: Script (14–15 June 2026)

I used ChatGPT-4 (GPT Plus) to draft four candidate scripts based on the client brief. I pasted the brief into ChatGPT and asked for four 30-second voiceover scripts.

ChatGPT produced four generic drafts. None were usable directly — too corporate in tone, and one included a reference to specific financial products that would have required regulatory sign-off.

I selected elements from drafts 2 and 4, rewrote them substantially, and produced the final script. Harborne's marketing team reviewed and approved the final script on 16 June 2026.

**Final voiceover script (as approved):**
> "Every financial decision you make is a step toward something. Clarity gives you the view to see where those steps are taking you. Your investments, your goals, your progress — all in one place. Download Clarity. Start seeing clearly."

This is entirely my own language; none of it is verbatim from any ChatGPT output.

---

## Step 2: Visual Generation — Runway Gen-3 Alpha (14–16 June 2026)

All visual content was generated using Runway Gen-3 Alpha on my Standard plan account.

**Sessions and what I prompted for:**

| Session | Date | What I was trying to achieve | Prompt summary | Selected? |
|---------|------|------------------------------|----------------|-----------|
| 1 | 14 Jun | Open-plan office, morning light, clean | "Modern open-plan office, morning light through floor-to-ceiling windows, empty desks, clean contemporary design, cinematic, no people" | No — too empty/cold |
| 2 | 14 Jun | Same scene, warmer | Same prompt + "warm natural light, plants, slight motion blur on background" | No — motion blur too heavy |
| 3 | 14 Jun | Third attempt, warmer still | Revised: "Contemporary open-plan office, soft morning light, warm neutral tones, clean minimal design, subtle camera drift, cinematic 4K" | ✅ Yes — used as Scene 1 |
| 4 | 15 Jun | Person reviewing financial data on screen | "Close-up of professional hands typing on laptop, financial data on screen, shallow depth of field, warm ambient light, no face visible" | No — hands looked AI-generated obviously |
| 5 | 15 Jun | Same scene, different angle | "Over-shoulder view of person working at desk, laptop with data dashboard on screen, soft background blur, natural office lighting, cinematic" | ✅ Yes — used as Scene 2 |
| 6 | 15 Jun | Abstract data visualisation | "Abstract financial data visualisation, flowing lines and nodes, deep blue to teal gradient, 3D render aesthetic, smooth animation, 4K" | No — too blue, wrong brand colour |
| 7 | 15 Jun | Same, brand colours | Same prompt + "amber and navy colour palette, premium feel" | ✅ Yes — used as Scene 3 |
| 8 | 15 Jun | Urban streetscape — professional context | "London street, working professionals walking, morning, glass office buildings, cinematic, warm light, no faces visible" | No — motion too fast |
| 9 | 16 Jun | Same, slower motion | Same prompt + "slow-motion feel, deliberate pace" | ✅ Yes — used as Scene 4 |
| 10 | 16 Jun | App interaction abstract | "Smartphone in hand, abstract app interface glowing, fingers scrolling, close-up, shallow depth of field, dark premium background" | No — too generic |
| 11 | 16 Jun | Same, different angle | "Aerial view of hands holding phone, clean white marble surface, app interface visible, premium product feel" | ✅ Yes — used as Scene 5 |
| 12 | 16 Jun | Closing shot — confident, aspirational | "Business professional standing at window, city view, back to camera, morning light, aspirational, cinematic, no face visible" | ✅ Yes — used as Scene 6 |

**Total sessions:** 12
**Selected:** 6 (Sessions 3, 5, 7, 9, 11, 12)
**Decision criteria for selection:** Does it match the brief tone? Does it look like AI-generated content obviously? Does it fit the colour palette? Does the camera motion suit a 30-second edit?

*Note: I did not export the prompt history from Runway before ending the sessions. I've reconstructed this table from my project notes and memory. The prompts above are accurate representations of what I used — I always document my prompts in a project notes file while working.*

---

## Step 3: Voice Synthesis — ElevenLabs (17 June 2026)

I used ElevenLabs (Starter plan) with the "Rachel" voice model to synthesise the approved voiceover script.

I ran three takes with slightly different stability/similarity settings:
- Take 1: Stability 0.65, Similarity 0.75 — slightly robotic
- Take 2: Stability 0.55, Similarity 0.80 — more natural, selected
- Take 3: Stability 0.50, Similarity 0.85 — slightly too breathy

**Selected:** Take 2 (Stability 0.55, Similarity 0.80)

"Rachel" is ElevenLabs' own professionally licensed voice model — not a synthetic clone of any real person without consent. I confirmed this in ElevenLabs' documentation before selecting it.

---

## Step 4: Post-Production — Adobe Premiere Pro (18–20 June 2026)

Assembly, grading, and mixing performed in Adobe Premiere Pro by Sarah Chen (direction) and a freelance editor.

Key editorial decisions made by me:
- Scene order: cold open → office → data → street → app → aspirational closing
- Music timing: track starts at 0:03 (after opening silence)
- Voiceover timing: begins at 0:05, narration paced to allow visual breathing room
- Colour grade: warm neutral consistent across all six scenes (Runway outputs varied; grading unified them)
- Title card: Harborne Financial logo on clean white background, appears at 0:24–0:30

No AI tools were used in post-production. Adobe's AI features (Premiere's text-based editing, etc.) were not used for this project.

---

## Final Deliverables

- Clarity_16x9_MASTER_v3.mp4 (landscape, 30s)
- Clarity_1x1_MASTER_v3.mp4 (square, 30s)
- Both approved by client on 28 June 2026

---

*Sarah Chen, Creative Director, Meridian Creative Ltd — 4 July 2026*
