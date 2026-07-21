# Call Notes — Sofia Yan | Numbers Protocol / Capture | Jul 1, 2026

**P-ID:** P001
**Date:** 2026-07-01 (afternoon, Taipei)
**Duration:** ~45 minutes
**Format:** In-person, Taipei
**Participants:** JD Chang (SI8), Sofia Yan (Co-founder & CGO, Numbers Protocol)
**Audio file:** `03_Sales/transcripts/Sofia Yan_070126.m4a` (local only — not committed to git)
**Raw transcript:** `03_Sales/transcripts/sofia-yan-070126-transcript.txt` (Whisper whisper-1, bilingual EN/ZH-TW, transcribed Jul 13, 2026)

---

## Outcome Summary

Both companies are infrastructure-adjacent, Taipei-based, early-stage. Strong complementarity confirmed. Sofia offered API access for testing. **Critical new finding: old Capture is NOT on the current C2PA Trust List — upload-based signing does not qualify under 2024-25 C2PA requirements.** Only their mobile camera app (Proof Snap) is certified. This changes the SI8 v4.1 integration assumption.

---

## ICP / Partner Verdict

**Partner fit: HIGH — with revised expectations**

Numbers Protocol is confirmed infra-only ("that's why it's called Numbers Protocol — we want to be infra"). No plans to move into legal review or compliance. The on-chain registration layer (ERC-7053) is still a valid durable proof mechanism for SI8. The C2PA Trust List angle is more complex than the pre-call prep assumed.

---

## Key Findings

### 1. C2PA Trust List situation — UNCONFIRMED, needs follow-up

C2PA tightened its requirements in 2024 Q3-Q4. Previously, anyone could upload content and attach a C2PA manifest after the fact. After criticism (how do you trust a manifest attached to an already-created asset?), C2PA now places much greater emphasis on verifying the source of the content.

What Sofia said clearly:
- Old Capture doesn't satisfy the new C2PA verification requirements — because it allows uploads, the source is unverifiable under the new model
- Proof Snap IS on the C2PA Trust List — camera-captured only, source is known at shutter press
- She explicitly acknowledged the practical problem: "PDFs, edited videos, commercial productions" can't all be raw camera captures
- They are actively working on workarounds for edited/uploaded content

What was NOT explicitly confirmed:
- Whether current Capture API signatures appear as "trusted" or "untrusted" in the Adobe Content Authenticity viewer
- Whether there's any C2PA Trust List signing path available today for edited commercial MP4s

**The gap:** "Old Capture doesn't satisfy the new verification requirements" ≠ "Capture API signatures are Trust List-uncertified." Those are related but not identical. The exact behavior of the current API for edited commercial video is unverified.

**Implication for SI8:** Pause any "C2PA Trust List certified signing" claims in marketing and product copy until the follow-up question is answered. The ERC-7053 on-chain layer is unaffected and is the stronger durability story regardless.

**Follow-up question to send Sofia:** "If SI8 submits a final edited MP4 via the Capture API today, will the resulting C2PA signature appear as a trusted signer in Adobe Content Authenticity? Or is that capability limited to ProofSnap while the newer Capture architecture is still in development?"

### 2. What Capture CAN still deliver for SI8

Even without C2PA Trust List certification:
- C2PA metadata embedded in file (shows in viewer, but as unverified signer)
- ERC-7053 on-chain hash registration (fully functional, immutable, durable)
- Content fingerprinting and verify engine (search by image hash)
- Decentralized storage backup (optional)

The on-chain layer is the stronger story anyway — C2PA metadata can be stripped; on-chain hash cannot.

### 3. Numbers Protocol is confirmed infra-only

Sofia: *"才叫protocol 就是才叫protocol 所以我们其实是想做infra的东西"* (It's called protocol because we want to be infra.)

No plans to enter legal review, compliance judgment, or commercial clearance. Infra only. SI8's "technical trust vs. commercial trust" framing holds:
- Numbers Protocol / Capture → technical trust (provenance exists, on-chain proof)
- SI8 → commercial trust (provenance independently evaluated for commercial use)

### 4. SI8's concept landed clearly

JD described SI8 to Sofia mid-call: independent commercial clearance for AI video, low/medium/high risk assessment, evidence package delivered alongside C2PA signing. Sofia's response:

*"有一点像evidence package"* (a bit like an evidence package)

*"有一点像insurance 或 sock2"* (a bit like insurance or SOC2)

*"我们会做一个audit"* (we would do an audit)

She understood the concept without needing extensive explanation. The framing worked.

### 5. Jurisdiction-dependent prompt collection confirmed

Sofia validated JD's prompt question: *"I need to know what country first."* Whether prompts are required documentation depends on jurisdiction. She saw this as part of SI8's value — knowing the regulatory landscape per-country and adapting what's required.

### 6. Current Numbers Protocol focus: Omni (Company AI)

Their main product right now is "Omni" — a collaborative AI platform for teams:
- Multiple agents (planner + evaluator) working in same conversation
- Supports Claude, GPT-4, Gemini, Grok, DeepSeek, their own open-source model
- $20/month individual, $200/month corporate (with consulting/implementation)
- "Loop" feature: alternating planner/evaluator rounds until a plan scores 5/5
- Currently has one corporate client using it

Capture is in "background maintenance" mode — functional, no active development unless new users/requirements emerge. This means Capture won't evolve quickly.

### 7. Numbers Protocol's X4 / Marketplace (Getty on-chain)

Separate product: image licensing marketplace. Photographer registers images → page with rights info → buyers license directly via smart contracts. Working with a Taiwan news agency (台灣通訊社) and 13行博物馆 (Shisan Hang Museum). Stripe for payment + on-chain for rights tracking.

Not directly relevant to SI8's B2B video clearance focus, but confirms their "infra for creator licensing" vision.

### 8. API access offered

Sofia offered API access directly: *"你就是先用给我 OK"* (just reach out to me if you want to try the API). No sales process needed — direct partner track.

---

## Questions from Meeting Prep — Answers

| Prep question | Answer |
|---------------|--------|
| Can SI8 appear as named signer in Adobe viewer? | UNCONFIRMED — old Capture doesn't satisfy new C2PA verification requirements; whether API signatures show as trusted/untrusted in Adobe viewer not explicitly stated. Follow-up email needed. |
| Is there a trial API account? | Yes — Sofia offered directly. |
| What's pilot pricing for 20–50 signs? | Not discussed. TBD on follow-up. |
| Does schema map cleanly? | Not tested yet — need to run actual API call. |
| Where does Numbers intend to stay (infra only)? | CONFIRMED: infra only. |
| Does Numbers plan to enter compliance? | NO signals. Infra only. |
| Are they thinking about provenance at delivery vs. throughout production? | Both — their marketplace registers at creation; Capture signs at upload/delivery. |
| Video storage / retention? | On-chain hash only by default; optional decentralized storage backup. |
| Custom C2PA assertions? | Not confirmed in this call — was in Sofia's pre-call email. Needs API test to verify. |

---

## Product Implications for SI8

### Immediate (affects v4.1 architecture)

1. **Pause C2PA Trust List claims — pending one follow-up email to Sofia.** Don't remove the language yet; verify first. The question: *"If SI8 submits a final edited MP4 via the Capture API today, will the resulting C2PA signature appear as a trusted signer in Adobe Content Authenticity? Or is that capability limited to ProofSnap while the newer Capture architecture is still in development?"* Answer determines what SI8 can claim.

2. **On-chain is the stronger durability story regardless.** C2PA metadata gets stripped at re-export or platform re-upload. ERC-7053 on-chain hash cannot be stripped. For legal teams doing due diligence months later, the on-chain record is more defensible. Lead with on-chain in B2B positioning; treat C2PA as an added layer, not the headline.

3. **Test the API.** Sofia offered access directly — reach out, get credentials, sign a real test video, open the output in Adobe Content Authenticity viewer. That one test answers the Trust List question conclusively.

4. **"Commercial Assurance" vs "clearance" reframe.** Both Sofia ("SOC 2 audit") and the overall meeting architecture point toward assurance engagement framing rather than binary clearance. Experiment with "Independent Commercial Assurance for AI Media" in next few agency conversations. See which lands better.

### Medium-term

5. **Proof Snap workaround?** If a future workflow involves capturing reference frames or B-roll on mobile during production, those captures would qualify for Trust List certification via Proof Snap. Not practical for composed AI video, but may be relevant for hybrid live/AI workflows.

6. **Keep watching C2PA Trust List workarounds.** Sofia said they're "working on workarounds" for upload-based content. If they crack this (their own interest, not just SI8's), Capture could become fully Trust List compatible for uploaded content. Ask again in 3-6 months.

---

## Their Business Model (for context)

- **Omni:** $200/month corporate, consulting on top. 1 active client currently.
- **Capture:** API-based, likely $0.001/sign (pre-call research). No new development without new users.
- **X4/Marketplace:** Licensing commissions (like Getty on-chain). Early stage.
- **Funding:** Angel → 國發基金 (National Development Fund) → VC. Team: 6 people, mostly engineers. Sofia + 1 other BD.

---

## Follow-up Email — Sofia Reply Received (6 July 2026)

**Subject:** Re: [original SI8 follow-up]

**Key confirmations from Sofia's email:**

1. **Partnership framing confirmed (FACT):** "Numbers / Capture provides the provenance and verification infrastructure, while SI8 can build the independent commercial clearance layer on top." — Confirmed in writing by the infra partner.

2. **Adobe Trust List status — CONFIRMED NOT YET:** "please think of the output primarily as embedded C2PA metadata plus an ERC-7053 / Numbers provenance record, **not yet as an Adobe Trust List-recognized signer claim**." Before SI8 uses any Trust List language in product messaging, Sofia says: "we should verify the display behavior with a real signed sample and confirm the certificate / product scope." **Implication: strip Trust List language from the Disclosure Gap Analysis and any product copy until a real test confirms it.**

3. **MP4/MOV confirmed as right starting point (FACT).**

4. **Workflow architecture confirmed (FACT):** C2PA Content Credentials on final delivery file + selected Chain of Title fields as C2PA assertions or linked evidence + Capture/Numbers verification URL + optionally ERC-7053/Numbers provenance record.

5. **Pricing confirmed (FACT):** $0.001 per managed sign (public). Enterprise pricing by volume and SLA.

6. **Sandbox credentials pending:** She's finding the right internal access path — specifically to avoid pointing SI8 at the camera-capture (ProofSnap) flow and causing confusion. Not yet received.

7. **Proposed next step:** JD sends a non-confidential MP4/MOV sample + Chain of Title fields he wants represented → Sofia maps what goes into the manifest, what stays external/private, and what customer-facing wording is accurate.

**Public resources she provided:**
- Capture docs: https://docs.captureapp.xyz/
- Numbers docs: https://docs.numbersprotocol.io/
- numbers-c2pa examples: https://github.com/numbersprotocol/numbers-c2pa

---

## Raw Email Thread

```
Subject: Re: C2PA signing for AI-generated commercial video

---

Sofia Yan — Jun 25, 2026, 3:03 PM

Hi JD,

Thanks for reaching out and for the clear description of what SuperImmersive 8 is building. The Chain of Title + final delivery signing workflow is very relevant to what we do with Capture.

On your first question: yes, Capture is designed to support media beyond still images. For video workflows, our current compliance/signing pipeline supports formats such as MP4, MOV, and WebM, alongside image, audio, and PDF formats. In practical terms, we can help sign the final media file with C2PA Content Credentials and pair that with a Numbers / ERC-7053 on-chain record for durability and verification.

For your Chain of Title workflow, the part that sounds especially aligned is mapping your review documentation into structured C2PA assertions or related metadata. We would want to look at the exact fields you are planning to use, but conceptually the workflow you described, generating a rights / review package and signing the final client output before delivery, is something Capture can support.

On the EU AI Act Article 50(2) question: Capture can help provide machine-readable content provenance and audit evidence through C2PA credentials, with ERC-7053 as an additional durability layer if metadata is stripped or the file is re-uploaded. That said, I would be careful about saying that post-production re-signing alone automatically satisfies the full legal obligation in every case. My preferred framing would be that signing the final composited video supports Article 50-style transparency and auditability at delivery, while any source-generation disclosures or intermediate provenance records should also be preserved when they are relevant to the final work.

So in short: we can likely help with the MP4/video signing layer, C2PA manifest / custom assertion mapping, verification URL, and optional on-chain provenance record. The main thing to align on would be the exact Chain of Title schema, where in your workflow signing happens, and how you want brand legal teams or reviewers to verify the final package.

If useful, I'd be happy to set up a call and understand more about your workflow and where cooperation might make sense. We are also based in Taipei, so if it is convenient, I'd also be happy to meet in person for coffee and talk through this.

Cheers,
Sofia.

---

JD Chang — Jun 25, 2026, 3:15 PM

Hi Sofia,

Nice to meet you, and thanks for the reply.

Yes, would love to talk through the schema and integration.

Where are you located in Taipei? I'm near Small Taipei Arena / Nanjing Sanmin.

Happy to meet you wherever for coffee. I do have some availability tomorrow afternoon (Friday) or we can look at a time next week.

Thanks,
JD

---

Sofia Yan — Thu, Jun 25, 7:35 PM

Hi JD,

Would next Wednesday afternoon work for you?

We're based at the Taipei Tech Arena (TTA), also near Small Taipei Arena, so that might be a convenient spot if you're nearby, but I'm open to other suggestions as well.

Cheers,
Sofia Yan | Co-founder & CGO

---

JD Chang — Thu, Jun 25, 9:10 PM

Hi Sophia,

Sure, next Wed. afternoon is good. How about 1pm, 2pm or 4:30pm?

We can meet at TTA. I used to hold a bi-monthly B2B sales workshop there in the evenings! small world, lol.

Are you a Sparklabs company then?

Best Regards,
JD

---

Sofia Yan — Fri, Jun 26, 12:03 PM

Hi JD,
Awesome, let's do 2 pm then.
Cool! Maybe we've met at some startup events lol
Talk to you more on Wed. :)

Cheers,
Sofia Yan | Co-founder & CGO

---

JD Chang — Fri, Jun 26, 12:37 PM

Haha, maybe! See you on Wednesday ~

---

Sofia Yan — Wed, Jul 1, 1:14 PM

Hi JD,
Let's meet at the TTA 3F pantry later.
See you soon!

Cheers,
Sofia Yan | Co-founder & CGO

---

JD Chang — Wed, Jul 1, 1:22 PM

Sounds great! See you then!
JD

---

JD Chang — Wed, Jul 1, 10:33 PM

Hi Sofia,

Thanks again for taking the time to meet today. I really enjoyed our conversation and learning more about where Numbers Protocol is headed.

One of my biggest takeaways was the distinction between technical provenance and commercial interpretation. It reinforced our thinking that Numbers provides the provenance infrastructure, while SI8 can focus on the independent commercial clearance layer built on top of that. I think the two are highly complementary.

As discussed, we'd love to start experimenting with the Capture API. Whenever you have a chance, could you point me toward:

- API documentation
- Sandbox/API credentials (or the best way to get started)
- Current pricing information
- Any sample code or examples for signing MP4 files

I also wanted to clarify one technical point from our discussion, just to make sure I understood correctly.

If SI8 submits a final edited campaign video through the current Capture API today, how should we think about the resulting C2PA output? Specifically, would the signed file appear as a Trust List-recognized signer in Adobe Content Authenticity, or should we think of the current implementation primarily as embedded C2PA metadata together with the ERC-7053 / Numbers provenance record?

I'm asking because we want to make sure our product messaging accurately reflects what the integration delivers.

Thanks again, and I'm looking forward to experimenting with the API. I think there are some exciting opportunities for us to work together.

PS: Also, here is the recording to our chat today in case you would like it for review/notes.
[Attached: Sofia Yan_070126.m4a]

Best Regards,
JD Chang
CEO | SuperImmersive 8

---

JD Chang — Fri, Jul 3, 5:11 PM

Hi Sophia,

Hope your week is going well. Just wanted to check in and see again on getting started with Capture API.

Thanks!
JD

---

Sofia Yan — Jul 6, 2026, 3:00 PM

Hi JD,

Sorry for the late reply, been hectic the last week. Thanks again for the great talk and for sharing the recording.

I also found the distinction between technical provenance and commercial interpretation useful. Your framing is right: Numbers / Capture provides the provenance and verification infrastructure, while SI8 can build the independent commercial clearance layer on top.

Here are the public starting points:
- Capture docs: https://docs.captureapp.xyz/
- Numbers docs: https://docs.numbersprotocol.io/
- numbers-c2pa examples: https://github.com/numbersprotocol/numbers-c2pa

For sandbox / API credentials, let me first confirm the right access path internally and then send you the best way to start. The currently documented signing flow is oriented around our Capture / ProofSnap products, so for SI8's final-edited campaign video workflow, I want to avoid having you test against a camera-capture flow and draw the wrong conclusions.

For MP4 / MOV, that is the right starting point. At this stage, I would think of the workflow as C2PA Content Credentials on the final delivery file, selected Chain of Title fields represented as C2PA assertions or linked evidence, a Capture / Numbers verification URL, and optionally an ERC-7053 / Numbers provenance record. Public pricing starts at USD 0.001 per managed sign; enterprise pricing depends on volume and SLA needs.

On your Adobe Content Authenticity question: for now, please think of the output primarily as embedded C2PA metadata plus an ERC-7053 / Numbers provenance record, not yet as an Adobe Trust List-recognized signer claim. Adobe's Trust List is separate, so before SI8 uses that wording in product messaging, we should verify the display behavior with a real signed sample and confirm the certificate / product scope.

A useful next step would be for you to send a non-confidential MP4 / MOV sample and the Chain of Title fields you want represented. We can use that to map what should go into the manifest, what should stay external or private, and what customer-facing wording would be accurate.

Cheers,
Sofia Yan | Co-founder & CGO
```

---

## JD → Sofia: Jul 13, 2026 (sent)

**Subject:** Re: C2PA signing for AI-generated commercial video

Hi Sofia,

Thanks again for the thoughtful reply, and no worries at all about the delay. I really appreciate you taking the time to think through how SI8 fits with Capture.

Your clarification around Adobe's Trust List was especially helpful. We've updated both our architecture and our product messaging to reflect exactly what you described. We now treat the output as embedded C2PA metadata together with the Numbers / ERC-7053 provenance record, and we've been careful not to make any Trust List claims until we've verified the behavior with a real signed sample.

Since we spoke, we've made a lot of progress on the SI8 side. We now have a working Assessment Service that clearly separates the commercial assurance layer from the provenance layer. A completed Commercial Assurance Assessment now produces:

- An Assessment Report (private)
- A Public Assessment Record
- A provenance-signing step implemented behind a provider abstraction, with Numbers as our first provenance provider

As you suggested, I've attached a non-confidential MP4 sample for us to work through together.

You can also view the corresponding Public Assessment Record here:

https://app.superimmersive8.com/assessment/ASSESS-005-2026-07-12

One area I'd especially appreciate your feedback on is the C2PA payload itself.

Our current thinking is to keep the embedded manifest intentionally minimal and use it primarily as a durable pointer back to the SI8 assessment, rather than embedding reviewer reasoning or commercial conclusions.

At the moment, we're thinking of including:

- Assessment Number
- Assessment Date
- Reviewer Organization
- Methodology Version
- Outcome Code (machine-readable assessment outcome)
- Verification URL (Public Assessment Record)
- `digitalSourceType` (standard IPTC value in the provenance layer)

Reviewer findings, confidence, evidence, residual risks, and the Assessment Report itself would remain outside the manifest.

Does that separation generally align with how you would recommend structuring it? Are there any fields you would move into or out of the C2PA manifest based on how Capture is designed?

As we've been implementing the integration, a few technical questions also came up that we'd appreciate your guidance on:

- Does Capture support custom assertion namespaces (for example, `si8.commercial-assurance/v1`) with arbitrary JSON payloads, and are there practical size limits we should be aware of?
- If we'd like the Numbers provenance record to reference the SI8 Assessment Number, what would you recommend as the best approach? Is that something you'd represent through ERC-7053 metadata or another mechanism?
- Is there an established convention you would recommend for a third-party commercial assessment namespace, or is a custom namespace such as `si8.commercial-assurance/v1` the appropriate approach?

Whenever you've confirmed the appropriate internal access path, we'd also love to get started with the Capture API. Our integration is ready to move from a mock provider to the real implementation as soon as we have API credentials and the confirmed API contract.

Thanks again. I think there's a really nice complement between Numbers providing technical provenance and SI8 providing independent commercial assurance. I'm looking forward to getting our first signed assessment working together, and I'd love any feedback you or your engineering team have on the approach.

Best Regards,
JD Chang
CEO | SuperImmersive 8

[Attached: Cloud World Pan from Baby to Auntie Guard.mp4]

---

## Follow-up Email — Sofia Reply Received (20 July 2026)

**Subject:** Re: C2PA signing for AI-generated commercial video

**Key points from Sofia's email:**

1. **Manifest design validated (FACT):** the six proposed public fields (Assessment Number, Assessment Date, Reviewer Organization, Methodology Version, Outcome Code, Verification URL) confirmed as the right level of public information. Findings/confidence/evidence/residual risks/Assessment Report correctly stay private, outside the manifest.
2. **`digitalSourceType` correction:** should sit in the content-origin layer, reflecting how the asset was actually generated/edited — independent of SI8's assessment outcome. Matches SI8's own existing framing (digitalSourceType = interoperability, not compliance).
3. **Walk-back on scope (material change):** her earlier description of "Content Credentials applied to the final delivery file" was too generic. C2PA conformance is getting stricter — a real manifest has to reflect the actual production workflow (how the file was created, what editing happened, which assertions are true for that flow), not a one-size-fits-all signing step. Cited their own experience refining the manifest for ProofSnap (a simpler, fully-controlled capture workflow) as the reason they're now cautious about applying a generic flow to SI8's (review happens after the fact, from a third party).
4. **No self-serve sandbox — this is now a paid annual partnership decision:**
   - **Numbers Verification path:** NT$100,000–200,000/yr. Faster. Public claims limited to "Numbers/ERC-7053 verified," **not** C2PA conformance. Her recommended starting point if either path is pursued.
   - **Full C2PA Conformance path:** NT$300,000/yr. Heavier workstream, external review, timeline not fully controlled by either side.
   - Either path requires a scoping session before a formal proposal with exact terms.
5. **Technical answers:** custom assertions are possible at the standard level, but the real gate is whether the assertion/signing path honestly represents the workflow, not JSON support per se. Recommended namespace: `com.superimmersive8.assessment.v1` (domain-controlled, versioned) instead of `si8.commercial-assurance/v1` (path-like). Size limits depend on integration path chosen — declined to quote numbers yet. Assessment Number should be a stable public pointer bound by hash/reference, not the full payload embedded. Current framing (C2PA + Numbers/ERC-7053, no Trust List claims) confirmed still correct.
6. Reiterated the offer to keep the design conversation going even if SI8 doesn't take either paid path right now.

**Raw email (Sofia → JD, Jul 20, 2026, 1:14 PM):**

```
Hi JD,

Sorry for taking a while to get back to you, and thanks for the nudge this morning.
I wanted to get everything aligned internally before writing back, so this one covers both your technical questions and the sandbox question.

First off, congrats on the progress with the Assessment Service. I went through the MP4 sample and the Public Assessment Record, and the way you separated the commercial assurance layer from the provenance layer is exactly the right structure.

On the manifest design, I agree with keeping it minimal and using it as a durable pointer back to the SI8 assessment. Once we define the signing workflow together, the fields you listed (Assessment Number, Assessment Date, Reviewer Organization, Methodology Version, Outcome Code, and the Verification URL pointing to your Public Assessment Record) are the right level of public, machine-readable information. Reviewer findings, confidence, evidence, residual risks and the private Assessment Report should stay outside the manifest, in your own system. One small note: I would treat digitalSourceType as part of the content-origin layer rather than the SI8 assurance layer. Its value should reflect how the asset was actually generated and edited, independent of the assessment outcome.

I also want to update something from my last email. I previously described the workflow as Content Credentials applied to the final delivery file. After a deeper review with our engineering team, I want to be more precise about that. C2PA conformance is getting stricter, and a proper manifest needs to reflect the real workflow: how the file was created, what meaningful processing or editing happened, and which actions and assertions are accurate for that flow. It cannot just be a generic post-production step where a final MP4 goes in and a signed file comes out. We learned this firsthand with ProofSnap. Even though it is a controlled capture workflow, we still had to refine the manifest to represent things like watermark editing and the right created assertions. That experience made us careful about applying a generic signing flow to a different workflow like yours.

Which is also my honest answer to the sandbox question. I know your integration is already sitting behind a provider abstraction and ready to switch off the mock provider, and that is solid engineering on your side. But instead of a self-serve sandbox, the way we support a workflow like SI8's is through an annual partnership program, because the integration has to be scoped around your real workflow before credentials make sense. We have now worked out how to support this commercially, and there are two paths:

Numbers Verification path. Signing goes through Numbers' infrastructure, with the Numbers verification URL and the ERC-7053 provenance record as the public verification surface. The indicative annual program fee is NT$100,000 to 200,000. This is the faster way to get to a working signed assessment, and the one I would recommend starting with. One thing to be clear about for messaging: under this path, SI8's public claims would reference Numbers/ERC-7053 verification, not formal C2PA conformance.

Official C2PA conformance path. This works toward formal C2PA conformance for the SI8 workflow. The indicative annual program fee is NT$300,000. As I mentioned before, this is a much heavier workstream, with external review and timelines that nobody fully controls.

For either path, the exact scope and what is included would be confirmed in a formal proposal after a scoping session. And to be equally honest, if neither fits where SI8 is right now, that is completely fine. I would be glad to keep the design conversation going and revisit when the timing is right.

Quick answers to your remaining technical questions. Custom third-party assertions are possible at the C2PA standard level, but the real question for Capture is not arbitrary JSON support, it is whether the assertion and signing path accurately represent the workflow. For the namespace, I would go with a domain-controlled, versioned label like com.superimmersive8.assessment.v1 instead of a path-like string like si8.commercial-assurance/v1. On size limits, the practical limits depend on the integration path, so I would rather not quote numbers before that is defined. For referencing the Assessment Number in the Numbers provenance record, my suggestion is to keep it as a stable public identifier tied to the Verification URL, and bind to the public record or evidence package by hash or reference instead of embedding the full assessment payload. And your current framing of embedded C2PA metadata plus the Numbers/ERC-7053 record, with no Trust List claims, is still exactly right.

If either path sounds workable, let's set up a scoping session. Happy to do a video call, or meet in person since we are both in Taipei. We can use the sample you sent to map the actual workflow: how the asset is generated, what editing happens in between, when SI8 does the assessment, what gets publicly attested versus kept private, and what C2PA should truthfully represent. From there we can put together the formal proposal with the exact scope.

I still see a strong fit here. Numbers/Capture handles the technical provenance and verification infrastructure, and SI8 provides the independent commercial assurance layer. The annual program is really just how we make sure the C2PA layer reflects your real workflow, which is what will make SI8's messaging defensible with brands and agencies.

Cheers,
Sofia Yan | Co-founder & CGO
```

---

## JD → Sofia: Jul 20, 2026 (sent) — declining both paths for now

**Reasoning (internal, not stated to Sofia in these terms):** Beyond budget timing, confirmed separately that neither path would have solved a live product gap anyway — C2PA/Numbers signing does not satisfy the deployer's EU AI Act Art. 50(4) disclosure obligation (that requires an actual visible label, not embedded metadata) and doesn't touch Art. 50(2) either (that's the AI tool provider's statutory obligation, not something downstream signing discharges). Consistent with SI8's own existing position of never pitching itself as an Art. 50 compliance solution.

```
Hi Sofia,

Also getting back to you on this. Thanks for the detailed response and explanation. That makes sense that C2PA standards are getting stricter.

Right now, I'm still trying to build up the client base for SI8 so I don't think either partner track is a fit for the next quarter.

However, I do see us doing this in the (near) future. I just need to justify the demand and budget first.

I would love to keep the conversation going, though. So, perhaps we can meet up for coffee again at TTA; or discuss further at the 7/30 event.

Thanks!

JD
```

---

## AI Wave Panel Invitation — Separate Thread (Jul 21, 2026)

Unrelated to the C2PA/partnership track — a speaking invitation, explicitly framed by Sofia as "no strings attached" regardless of where the Numbers partnership conversation lands.

**Event:** "AI Wave 微醺夜: Trustworthy AI Starry Salon" — private after-hours salon, first evening of the AI Wave Show exhibition. Numbers-hosted, GumGum Beer & Wings (Xinyi flagship), ~30-40 guests (SME owners + media partners). Thu, **July 30, 2026**.

**Format:** 3-person panel on a sofa, Sofia moderating, no slides/no jargon, ~90 sec per answer. Co-panelists: James (Business Next / 數位時代), Astro (Blocktrend / 區塊勢). Runs mostly in Mandarin.

**Proposed discussion topics:** a real story of AI content nearly causing legal trouble; JD's "rule #1" for brands using AI in marketing; whether SI8 clients are paying for AI's efficiency or the risk mitigation.

**JD's reply (sent):** confirmed interest, pending a calendar-conflict check to be resolved "by this evening." Comfortable with Mandarin format (may mix in English technical terms). Set an explicit boundary: will discuss market landscape / value proposition / general AI-creator-and-agency pain points, but **not** specific SI8 client stories, since the client base is still being built. Also flagged the event as a possible informal touchpoint for the C2PA scoping conversation, per the note above.

**Raw email (Sofia → JD, Jul 21, 2026, 2:04 PM):**

```
Hi JD,

Taking a quick detour from our C2PA thread, this one is an invitation, not more manifest homework. :)

On July 30 (Thursday), the first evening of AI Wave Show exhibition, Numbers is hosting a private after-hours salon "AI Wave 微醺夜: Trustworthy AI Starry Salon" at GumGum Beer & Wings (Xinyi flagship), booked out for the night. Around 30-40 guests, mostly SME owners and media partners, craft beer and chicken wings in hand. The theme: how AI actually lands in business — safety and monetization, strictly no slides, no jargon.

I'd love to have you join a panel conversation. Three speakers on a sofa, drinks in hand, and I'll moderate. The other two are James from Business Next (數位時代) and Astro from Blocktrend (區塊勢).

Here's why I thought of you: "independent commercial assurance for AI video" is exactly the question this room is quietly worrying about — can I use AI content without getting into trouble? What we may share on stage:
- A real story where AI-generated content almost got a client into legal trouble, and what happened
- Your rule #1 for brands that want to use AI for marketing content
- When clients pay SI8, are they buying AI's efficiency or the risk you help them avoid?

The format is genuinely relaxed: no slides, no script, ~90 seconds per answer (I'll keep time), just real stories. And frankly, the room will be full of exactly the kind of companies SI8 serves — a much better intro than any pitch deck. One practical note: the panel will run mostly in Mandarin, but I'm guessing that's no problem given your TTA workshop days, but tell me if not.

To be clear, this invite stands on its own, completely separate from wherever we land on the integration paths in the other thread, no strings attached. Though if you're coming anyway, we could also use that week to grab the scoping session we talked about, or you can just corner me at the bar. Event page (in Chinese, but you'll get the vibe): https://edge.omniai.one/aiwave/

Would this work for you? If yes, I'll send over the full run-of-show :)

Cheers,
Sofia
```

**Raw email (JD → Sofia, Jul 21, 2026, 4:21 PM, sent):**

```
Hi Sofia,

Thanks for thinking of me! I would love to attend this --- I just need to make sure I'm not needed at another commitment (I'm currently confirming).

But, the format sounds great. Mandarin is fine, although I may sprinkle some english keywords in there (like C2PA, lol).

Also, just want to be up front that SI8 is still in product discovery mode and I can definitely share stories from the current AI/agency market landscape. But, I won't be sharing any specific SI8 client stories (as we are still building our client base :-), but I can definitely discuss the value proposition and the market pain that AI creators / agencies / enterprises are facing when thinking about AI content commercial usage and provenance.

If that's good with you, I'd love to join (and will confirm availability by this evening).

Thanks!

JD
```

---

## Next Steps

- [x] Email Sofia with initial ideas / partnership framing
- [x] Send follow-up question on Trust List / API credentials — **answered in her July 6 reply**
- [x] Send sample MP4 + Chain of Title fields to Sofia for manifest mapping — **sent Jul 13, 2026**
- [x] Await Sofia's feedback on manifest field structure + technical questions — **answered in her July 20 reply**; manifest design validated, `digitalSourceType` correction noted, namespace renamed to `com.superimmersive8.assessment.v1`
- [x] Sandbox credentials question resolved — **no self-serve sandbox exists; replaced by a paid annual partnership decision (NT$100-200K Numbers Verification path, or NT$300K full C2PA Conformance path)**
- [x] Decision: **declined both partnership tracks for this quarter (Jul 20)** — reasoning: still building client base, need to justify budget/demand first; separately confirmed neither path would satisfy the deployer's EU Act Art. 50(4) disclosure requirement anyway, so there's no urgent product gap being left unsolved by waiting
- [ ] Confirm final availability for the Jul 30 AI Wave panel invite — JD said he'd confirm "by this evening" (Jul 21); verify this was actually sent
- [ ] If attending Jul 30: use the week as an informal touchpoint to keep the C2PA scoping conversation warm, per JD's own suggestion in his Jul 20 reply
- [ ] Revisit the Numbers partnership decision next quarter once SI8's client base and budget can justify it
- [x] Audio file filed: `03_Sales/transcripts/Sofia Yan_070126.m4a` (local only, not in git)
- [x] Transcript filed: `03_Sales/transcripts/sofia-yan-070126-transcript.txt` (Whisper whisper-1, bilingual EN/ZH-TW, Jul 13, 2026)
- [ ] Revisit pilot pricing conversation on next call (not discussed — moot for now given partnership tracks declined)
- [ ] Track Capture's Trust List workaround progress — check again in Q4 2026
