# LinkedIn Outbound Campaigns — Clearance Pro (Business Affairs / EP / LP)
**Written:** June 10, 2026
**Model:** Direct sales — peer-to-peer, operational frame
**Tool:** Dripify
**Status:** Draft — ready to load into Dripify

---

## Purpose

Target the operational clearance function at advertising agencies and commercial production companies — the people who already manage rights clearances (music, talent, usage windows, stock) and would treat SI8 as a new line item in an existing workflow.

**This ICP differs from Creative Directors in one critical way:** they do not need to be educated on why documentation matters. They need to know how SI8 fits their existing process.

**Source of insight:** Daniele Zennaro (B145, AiYR4) reply Jun 10, 2026 — identified the "commercial or local production side — people who manage rights, clearances and usage with the client" as the function that actually receives AI documentation requirements. B2B2B chain: brand legal → commercial/rights clearance team → production. See `03_Sales/pipeline-analysis/PIPELINE-ICP-ANALYSIS-2026-06-05.md` Addendum and `01_Business/research/CUSTOMER-DISCOVERY-LOG.md` Jun 10 entry.

---

## What We're Validating

**Primary hypothesis:** The Business Affairs / Broadcast Affairs / EP / Line Producer / HoP function at agencies and production companies is beginning to receive AI video documentation requirements from brand clients — the same way they receive music clearance or talent usage requirements. If true, SI8 is a natural supplier to a workflow they already own.

**What we want them to respond with:**
> "Yes, clients have started asking — we've been handling it informally but nothing standardised yet."

**Response matrix:**

| Response | Classification | Next step |
|----------|---------------|-----------|
| "Yes, clients asking — handling ad hoc / informally" | Warm — highest priority | Show sample; position SI8 as formalised version of what they're already doing |
| "Not yet formally but I can see it coming" | Warm | Aug 2 deadline hook + "get ahead of it" pitch |
| "What does the document look like?" | Warm | Send sample immediately |
| "We have a process — we do X" | Probe | Ask if clients accept it or want something more formal |
| "Enterprise license / indemnification / tool policy / we already vet tools" | **Trigger 3** | "You've covered the tool licensing layer — we cover the deliverable documentation clients actually receive" — do NOT re-educate; position as complementary layer |
| "We clear tools before production starts / client's legal team approves tools upfront" | **Pre-production variant** | Acknowledge the pre-production gate; send sample; "this is the documentation layer you attach at delivery, after the tools are cleared" |
| "We're not producing AI video yet" | NAF | Nurture Q4 |
| "Not relevant / not for us" | Pass | Close |

---

## ICP Definition

**Titles (all variants):**
- Head of Business Affairs / Business Affairs Director / Business Affairs Manager
- Broadcast Affairs / Broadcast Business Affairs
- Executive Producer (at production company)
- Line Producer (at production company)
- Head of Production / Director of Production

**Company type:**
- Advertising agencies (mid-size to large — any agency that produces video deliverables for brand clients)
- Commercial production companies (produces TV/digital commercial spots)

**NOT this ICP:**
- Business Affairs at entertainment studios, sports leagues, music companies — different workflow
- Talent agencies (CAA, WME) — brand licensing context, not commercial production
- IP lawyers — legal counsel, not operational clearance

**Market size:**
- UK: ~800–1,500 total / ~200–400 currently active in AI video
- EU (top 6 markets): ~2,000–4,000 total / ~500–1,200 active
- Global: ~15,000–30,000 total

**Trade body clusters (UK):**
- IPA Business Affairs Group
- APA (Advertising Producers Association) — ~400 member companies
- PACT

---

## Personas

| Geo | Alias |
|-----|-------|
| UK / England | Ivy |
| Netherlands / Amsterdam | Vanessa |
| Germany / Berlin | Angel |
| Dubai / UAE | Lilly (if restored) |

---

## Sequence: SI8_Clearance-Pro-v1 (4 Messages)

**Tone:** Peer-to-peer, operational. No problem education. Assumes shared context around clearances.

---

### Message 1 — Connection Note (Probe)
*Sent with connection request*

> Hi %%first_name%%,
>
> As AI video becomes more common in commercial production, are you seeing brand clients start adding documentation requirements to clearance sign-off — alongside music and talent? Curious what you're running into on your end.
>
> Would love to connect!

**Logic:** Short. Peer-level question. No product mention — pure signal extraction. "Would love to connect!" as the closer keeps it warm without being salesy.

---

### Message 2 — Urgency + Product Name
*Sent after connection accepted*

> Hi %%first_name%%, thanks for connecting!
>
> Following up — EU AI Act enforcement starts August 2, and brand legal teams are starting to formalise the AI documentation requirement ahead of that deadline.
>
> We produce Chain of Title documentation for AI-generated commercial content — same concept as a music clearance report, but covering the AI layer: tools used, training data, IP ownership, usage rights.
>
> Happy to send a sample if useful.
>
> Ivy
> www.superimmersive8.com

**Logic:** Names the product for the first time. Frames it as a clearance report analogy — not a new concept. August 2 creates urgency without being alarmist.

---

### Message 3 — Drop the Sample
*Sent if no reply to Message 2*

> Dropping the sample directly — this is what a Chain of Title for an AI video commercial looks like:
> http://www.superimmersive8.com/sample
>
> $499 per video, 90-minute human review, delivered as a PDF you can pass to the client or attach to the deliverable package.
>
> If this is coming up in your clearance workflow, happy to talk.
>
> Ivy
> www.superimmersive8.com

**Logic:** Price and turnaround included — BA/EP/LP people evaluate suppliers on practical terms immediately. No greeting — keeps it direct.

**Note:** 4th message (soft close) deliberately omitted. 3-message sequence keeps the outreach professional and avoids over-pitching an operationally-minded ICP.

---

## Split Test

**Test 9 (see SPLIT-TEST-LOG.md):** DRAFT — not yet assigned leads.
- v9-A: Connection note as written above (pure probe, no product mention)
- v9-B: Probe + one-line product hint: "We've built what amounts to a music clearance report for AI video — happy to explain."
- v9-C: Pre-production framing — for leads at agencies/production cos where the clearance gate happens before production starts, not at delivery:

> Hi %%first_name%%,
>
> Before committing to AI tools on a client brief, are you being asked to verify which ones are cleared for that client — or does the documentation requirement only show up at delivery? Curious what you're running into on your end.
>
> Would love to connect!

**v9-C rationale:** Three independent leads (Hugo Faustino/Canon EMEA, Jean Delaunay/Mathematic Studio, Jian Yi Lay/VaynerMedia APAC) described a pre-project legal gate where AI tool choices are reviewed before creative work begins. This is a distinct customer job from post-delivery documentation. v9-C surfaces this pattern explicitly — if the lead confirms pre-production clearance, the next message frames SI8 as the documentation layer that goes to the client *after* the tools are cleared.

**Load order:** v9-A and v9-B first (UK BA list, when built). v9-C as third variant or second wave once v9-A/B results known.

Test 9 is the first campaign targeting this ICP directly. Primary goal: confirm whether the clearance workflow framing resonates before optimising the sequence.

---

## Classifier Notes

**Message 2** ends with `www.superimmersive8.com` — matches existing `extract_reply()` pattern in `classify.py`. ✅
**Message 3** ends with `www.superimmersive8.com` — same. ✅
**Message 1 (connection note)** ends with "Would love to connect!" — ✅ **Added to `extract_reply()` pattern in `classify.py` (Jun 10, 2026).** Replies to the connection note before Message 2 is sent will now extract cleanly.

Expected warm pattern additions once results arrive:
- "handling it informally" / "ad hoc"
- "clearance" / "sign-off" / "deliverable package"
- "what does it look like" / "send the sample"

---

## Performance Benchmarks (targets — no prior data for this ICP)

| Metric | Target | Basis |
|--------|--------|-------|
| Reply rate (any) | 15–25% | Legal Friction ran 18–22% in UK |
| Warm reply rate | 8–12% | Higher than CD campaigns expected — no education needed |
| Sample requests | 30%+ of warm replies | Clearance professionals evaluate by seeing the product |
| Call requests | 10–15% of warm replies | Lower barrier — operational decision, not committee |
