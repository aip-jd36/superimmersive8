# Meeting Prep — Sofia Yan | Numbers Protocol (Capture) | Jun 2026

**P-ID:** P001
**Contact:** Sofia Yan — Co-founder & CGO, Numbers Protocol
**Email:** sofia@numbersprotocol.io
**Company:** Numbers Protocol — the company behind Capture (captureapp.xyz)
**Format:** In-person coffee, Taipei (location TBD — JD near Nanjing Sanmin / Small Taipei Arena)
**Proposed dates:** Friday Jun 27 afternoon OR next week
**Status:** JD reply sent Jun 25; awaiting Sofia's confirmation

---

## Why This Meeting Matters

Sofia is the Co-founder and CGO of Numbers Protocol — not a sales rep. This is a decision-maker who can set pricing, negotiate integration terms, and move fast. She reached out warmly and offered to meet in person. She's in Taipei. This is the highest-leverage conversation on the calendar right now.

Capture is SI8's planned Year 1 signing infrastructure for v4.1. The outcome of this meeting determines:
- Whether the Capture integration is the right path
- What the schema mapping looks like in practice
- What pricing and terms look like for a pilot
- Whether Numbers Protocol becomes a formal partner

---

## What Sofia Already Confirmed (Email, Jun 25, 2026)

1. **MP4/MOV/WebM video signing — confirmed.** "Our current compliance/signing pipeline supports formats such as MP4, MOV, and WebM."

2. **Custom C2PA assertions — confirmed.** "Mapping your review documentation into structured C2PA assertions or related metadata" — she named the exact use case.

3. **Sign-at-delivery workflow — confirmed.** "Generating a rights/review package and signing the final client output before delivery is something Capture can support."

4. **ERC-7053 on-chain included.** "Pair that with a Numbers / ERC-7053 on-chain record for durability and verification."

5. **Art. 50 framing — careful and correct.** She prefers "signing the final composited video supports Article 50-style transparency and auditability at delivery" over claiming it "automatically satisfies the full legal obligation." Source-generation disclosures should also be preserved where relevant. This is the right nuanced position — aligned with SI8's updated framing after peer review.

6. **Main things to align on (her words):** "The exact Chain of Title schema, where in your workflow signing happens, and how you want brand legal teams or reviewers to verify the final package."

---

## What to Bring

**Chain of Title schema** — the C2PA custom assertions SI8 plans to embed:

```json
{
  "SI8:clearance_status": "CLEARED",
  "SI8:chain_of_title_id": "SI8-2026-004921",
  "SI8:tools_verified": ["Runway Gen-3", "Kling 1.6"],
  "SI8:licensing_confirmed": true,
  "SI8:likeness_assessment": "no synthetic performers identified",
  "SI8:commercial_use_authorized": true,
  "SI8:disclosure_required": ["EU AI Act Art. 50"],
  "SI8:review_date": "2026-06-25",
  "SI8:reviewer": "SI8 certified human reviewer"
}
```

Print this or have it on phone. The entire technical conversation starts here.

---

## Meeting Agenda

### 1. Context (5 min)
Brief Sofia on what SI8 does in one sentence: "We're a B2B service that does human IP review of AI-generated video for commercial use — we produce a Chain of Title package proving the content is legally safe. We want to deliver that package as a signed, verifiable C2PA credential on the final video file, not just a PDF."

### 2. Schema mapping (15 min)
Walk through the Chain of Title schema field by field. For each field:
- Does it map cleanly to a standard C2PA assertion field, or does it go in a custom assertion?
- Is there a field format/type constraint we need to know about?
- Are there any fields that Capture's system won't accept or needs differently?

Key question: **"Is there anything in this schema that won't map cleanly to your API?"**

### 3. Workflow — where does signing happen? (10 min)
SI8's workflow:
1. Agency submits final MP4 to SI8 via the Creator Portal
2. SI8 reviewer spends 90 min on clearance review
3. Review complete → SI8 generates Chain of Title PDF
4. SI8 sends MP4 + schema JSON to Capture API → receives back signed MP4 + on-chain transaction
5. SI8 delivers signed MP4 + Chain of Title PDF + transaction hash to agency

Questions:
- **"Is that workflow — us sending you the final MP4 after review and getting back a signed file — exactly what your API supports?"**
- **"How does the verification URL work? What does a brand legal team see when they go to verify the credential?"**
- **"What does the signed file look like in Adobe's Content Authenticity viewer — what name shows as the signer?"**

### 4. Trust List and signer identity (5 min)
This is important for our buyers. Legal teams will check.
- **"When our signed files are verified, does the signer show as Numbers Protocol, or can it show as SI8?"**
- **"Is there a path for SI8 to eventually appear as a named signer on the Trust List in our own right?"** (Context: we're aware of the C2PA Conformance Program — is that the right path?)

### 5. Pilot pricing and terms (10 min)
SI8 is pre-revenue, doing first verifications now. We don't need enterprise volume yet.
- **"What does the pricing look like for a small pilot — say, 20–50 signs over the next 3 months?"**
- **"Is there a developer/trial account we can use to test the integration before committing?"**
- **"What do terms look like for a service like ours reselling or bundling your signing as part of a $499 package?"**

### 6. Partnership framing (5 min)
Float the idea of a formal partnership or co-marketing angle:
- SI8 is building the clearance layer; Numbers Protocol is building the signing infrastructure
- Together the pitch is: "Cleared by SI8 · Signed by Capture" — human judgment + machine verification
- Is there a partner program or co-marketing opportunity Numbers Protocol does with integration partners?

---

## Key Questions (Ranked)

1. Can you walk me through what the signed file looks like end-to-end — what does the brand legal team actually see when they verify it?
2. Does our schema map cleanly, or are there fields that need restructuring?
3. What does the signer name show as in the Adobe viewer — Numbers Protocol, or can it be SI8?
4. What's the path to a developer/trial account?
5. What's pilot pricing for 20–50 signs?
6. Is there a formal partner program?

---

## What a Good Outcome Looks Like

- Schema confirmed as mapping cleanly (or specific changes identified)
- Trial API account arranged
- Pilot pricing agreed in principle
- Clarity on signer identity in Adobe viewer
- Next step: SI8 builds integration, runs test sign on a real video, presents output to one warm lead

---

## Background on Numbers Protocol / Capture

- **Numbers Protocol:** Taipei-based Web3 media company. Founded ~2019. Focus on content provenance and digital asset authentication.
- **Capture:** Their C2PA signing product. REST API + SDKs. $0.001/sign pay-as-you-go. ISO 27001 certified. Named clients include Reuters, AP, Starling Lab, Rolling Stone (Ukraine edition).
- **ERC-7053:** Open Ethereum standard they authored. On-chain content registry — included with every Capture sign.
- **C2PA Trust List:** Numbers Protocol is a recognized member — their signatures show as named trusted signer in Adobe/Microsoft C2PA viewers.
- **Sofia's role:** Co-founder & CGO. Decision-maker on partnerships, pricing, and integration terms.

---

## After the Meeting

File notes at: `03_Sales/call-notes/CALL-2026-06-[DATE]-P001-SOFIA-YAN-NUMBERS-PROTOCOL.md`

Update CRM P001 with outcome.

Update discovery files with any schema corrections or new technical findings.

If pilot terms agreed: create a task for developer to build Capture API integration.
