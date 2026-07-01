# Call Notes — Sofia Yan | Numbers Protocol / Capture | Jul 1, 2026

**P-ID:** P001
**Date:** 2026-07-01 (afternoon, Taipei)
**Duration:** ~45 minutes
**Format:** In-person, Taipei
**Participants:** JD Chang (SI8), Sofia Yan (Co-founder & CGO, Numbers Protocol)
**Raw transcript:** `C:\Users\User\Downloads\sofia_yan_transcript.txt` (Whisper, bilingual EN/ZH-TW)

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

## Next Steps

- [ ] Email Sofia with initial ideas / partnership framing (JD said he'd send this after call)
- [ ] Request API access via Sofia directly (she offered — just reach out)
- [ ] Run test sign on a real video via Capture API — document exact output (what shows in Adobe viewer, what the on-chain record looks like, what metadata is embedded)
- [ ] Send Sofia the follow-up question: "If SI8 submits a final edited MP4 via the Capture API today, will the C2PA signature appear as a trusted signer in Adobe Content Authenticity? Or is that limited to ProofSnap while the new architecture is in development?" — answers before making any product claims about Trust List status
- [ ] Revisit pilot pricing conversation on next call (not discussed today)
- [ ] Coffee meeting in Taipei — both said yes, follow up to schedule
- [ ] Track Capture's Trust List workaround progress — check again in Q4 2026
