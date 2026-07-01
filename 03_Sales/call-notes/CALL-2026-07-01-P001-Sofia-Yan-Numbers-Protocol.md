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

### 1. C2PA Trust List situation — CRITICAL

Old Capture (REST API, upload-based signing) **cannot** get on the new C2PA Trust List under updated C2PA requirements.

C2PA changed requirements in 2024 Q3-Q4: sources must now be device-verified. Upload-based signing → no Trust List certification. Only Proof Snap (mobile camera, captures at shutter press) qualifies.

Sofia's exact words: *"旧版的Capture 是没有办法支援 C2PA的 认证的"* (old Capture cannot support C2PA certification). They're working on workarounds for upload-based content but currently have none.

**Implication for SI8:** SI8's v4.1 plan assumed Capture API would deliver Trust List-certified signing for AI video (which is upload-based, not camera-captured). That assumption is wrong. The integration still delivers on-chain registration (ERC-7053) but cannot promise "trusted signer" status in the Adobe Content Authenticity viewer.

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
| Can SI8 appear as named signer in Adobe viewer? | No — old Capture isn't on Trust List for uploads. Shows as unsigned/unverified C2PA. |
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

1. **Drop the C2PA Trust List signing claim.** SI8 cannot deliver Trust List-certified C2PA via Capture for AI video. Remove this from product claims and marketing copy until a viable path exists.

2. **Reframe the signing deliverable.** What SI8 DOES deliver via Capture:
   - ERC-7053 on-chain registration (permanent, tamper-proof hash)
   - C2PA metadata embedded in file (verifiable, but signer = Numbers Protocol, not Trust List member for uploads)
   
   Framing: *"Cleared by SI8 · Registered on Numbers Protocol"* — anchor on the on-chain record, not C2PA Trust List.

3. **On-chain is actually the stronger story.** C2PA can be stripped at re-export. On-chain hash cannot be stripped. For legal teams doing due diligence 12 months later, the on-chain record is more durable. Lead with on-chain in B2B positioning.

4. **Test the API.** Contact Sofia → get API access → sign a test video → see actual output in Adobe viewer. What does the signer look like? What metadata shows? This determines what the deliverable actually is.

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
- [ ] Revise SI8 v4.1 integration claims: remove "C2PA Trust List certified" language; replace with "registered on Numbers Protocol / ERC-7053"
- [ ] Revisit pilot pricing conversation on next call (not discussed today)
- [ ] Coffee meeting in Taipei — both said yes, follow up to schedule
- [ ] Track Capture's Trust List workaround progress — check again in Q4 2026
