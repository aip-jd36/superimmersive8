# SI8 ICP Analysis — 2026-06-22

**Date:** 2026-06-22
**Format:** Working session notes (not full report cycle — no new Supabase export)
**Focus:** ICP 1 sub-segment audit, JD NY campaign list analysis, sequence framing correction
**Previous analysis:** [PIPELINE-ICP-ANALYSIS-2026-06-16.md](PIPELINE-ICP-ANALYSIS-2026-06-16.md)

---

## 1. ICP 1 Split: 1a vs 1b

**Decision:** ICP 1 is now formally split into two sub-segments with distinct targeting, sequence framing, and buying dynamics.

### ICP 1a — Agency Creative / Production at Finserv-Exposed Clients
The original ICP 1 definition. Agency-side CDs whose *external clients* include finserv brands. The documentation requirement flows from client legal team → agency CD. They deliver a Chain of Title PDF to satisfy an external gatekeeper.

**Sales Navigator filter:** Company industry = Advertising Services / Marketing & Advertising

### ICP 1b — In-House Finserv Creative
CDs and creative leads employed *inside* financial services institutions (banks, insurers, asset managers, fintechs). Their compliance/legal team is internal — two floors up, not an external client. Documentation requirement is internal risk management.

**Sales Navigator filter:** Company industry = Financial Services / Banking / Insurance / Capital Markets

**Key difference in sequence framing:**
- ICP 1a hook: *"When your client's legal team asks for documentation on an AI video you delivered..."*
- ICP 1b hook: *"When your compliance or legal team reviews AI-generated video before it goes out, are they asking for documentation on how it was made?"*

Sending ICP 1a language to ICP 1b leads is the framing mismatch we've been running. ICP 1b leads don't have external clients — they ARE the client.

---

## 2. ICP 1a Confirming Leads — Audit and Correction

Full audit of all leads previously claimed as ICP 1 (agency finserv). Corrected count: **4 confirmed** (down from 7 claimed).

**Confirmed ICP 1a:**

| Lead | B-ID | Title | Company | Verbatim signal |
|------|------|-------|---------|----------------|
| Matthew Sergison-Main | B088 | Senior Video Production Specialist | OLIVER / Brandtech | "Yes I am being asked this 100%" — formal procurement requirement, holdco context |
| Ibrahim Badi | B087 | Managing Director | IKM Marketing (UK) | "Yes especially in regulated sectors. I document: AI models used, commercial licensing, editing workflow, IP ownership." Confirmed finserv/pharma/holdco client base. |
| Jian Yi Lay | B152 | Group Creative Director | VaynerMedia APAC (Singapore) | "Before starting work, AI usage and which platform must be cleared by both agency and clients legal team first." Formal pre-project legal gate. |
| Nikolay Kolev | B155 | VR Designer | XR Future LTD (London) | Unprompted checklist matching SI8 spec exactly: tools used, commercial licensing, synthetic voices/faces, copyright, provenance/workflow. Enterprise/regulated brand exposure confirmed. |

**Removed from ICP 1a:**

| Lead | B-ID | Reason for removal |
|------|------|--------------------|
| Ramez Tabshi | B100 | Luxury CGI art director — spec/concept work (Lamborghini, Dior, Takis). No confirmed finserv client exposure. Reclassified: T2, wrong profile. |
| Gabriel Preston | B121 | Director's Rep at Imagine This Creative Studio — talent representation side, not agency production. Wrong profile. |
| Ahmed Samy Amin | B103 | In-house at GTCFX (financial trading platform), not agency-side. Reclassified: ICP 1b. |
| Marc De Guzman | B027 | In-house at UnaFinancial, buyer-side. Reclassified: ICP 1b. |

**Phil Langer (B126) — T2, not T1:**
Gen AI Specialist, Jung von Matt SPREE (Germany). Full reply to Legal Friction msg#1:
*"Hey, no not yet but yes it is something that will become the norm this year I think. We might have to also document each prompt for each generated asset. Not sure how this will be done."*
"Not yet" is the tell. No client is asking him now — he's extrapolating. T2 awareness, not current pain. JD's msg#2 follow-up was strong; if he replies substantively, revisit classification.

**Mhd Ali (Monks) — T2, wrong trigger:**
Full conversation retrieved (Jun 22). Alias Lilly sent Legal Friction Dubai. Reply:
*"Hi, Lilly / most of the time yes they want to know what platform/tools were used but that's mostly when it has a propriety product which has not yet been released"*
The trigger is **proprietary unreleased product / NDA** — not legal compliance or Chain of Title. A brand asking "what tools did you use" to protect an unannounced product brief is a different requirement entirely. This is T2 at best, different pain. Not ICP 1a.
Note: Campaign alias Lilly sent the sequence but messages were signed "Vanessa" — alias error in this campaign.

---

## 3. JD NY Campaign List Analysis — 299 Leads

**File:** `C:\Users\User\Downloads\export (1).csv` — 299 leads
**Campaign:** `SI8_RV_R4LI_CreaDir_Finserv_NY_0626A_JC` (JD, New York, launched Jun 21 2026)
**Sequence:** Legal Friction — FinServ (NY) — NY Synthetic Performer Law hook

**Full breakdown:**

| Segment | Count | % |
|---------|-------|---|
| ICP 1b — in-house finserv creative (confirmed) | ~70 | 23% |
| ICP 1a — agency/freelance serving finserv | ~5 | 2% |
| ICP 3 — legal/compliance/governance | 0 | 0% |
| Banker ADs (financial analysts — NOT Art Directors) | ~38 | 13% |
| Wrong title (admin, portfolio managers, underwriters, ops) | ~28 | 9% |
| Wrong sector / sparse / fake accounts | ~90 | 30% |
| Borderline ICP 1b (fintech-adjacent, needs verification) | ~30 | 10% |
| Other borderline / freelance unclear | ~38 | 13% |

**This confirms the list is ICP 1b dominant.** The Financial Services company industry filter pulled in-house finserv creatives, not agency-side. Zero confirmed ICP 3 leads.

### Strongest ICP 1b leads in the list:
Major investment/PE: Michael Craig (Goldman Sachs VP CD), Andrew Kay + Ariella Lustberg + Lindsey Klemens (Blackstone), Sarah Anderson + Ariella Lustberg (KKR), Ana Mak (Cerberus Capital VP AD), Farhad Sepahbodi (Apollo Global), Carol King (Carlyle Group)

Insurance: Atoussa Stone (MetLife CD Global Comms), Melissa Mallis (PURE Insurance VP CD), Boriana Neilson (Aetna AD), Philip Paczkowski (Chubb AD), Thomas Branco (Guy Carpenter CD), Art Hinckley (Knights of Columbus AD)

Large finserv brands: John Renz (Prudential VP Head of Creative), Michael Di Iorio + Ryan Mcnany + Alex Odell + Juan Bazan (Prudential CDs/ADs), Lauren Moses (Amex CD), Christine Golub (Visa Head of Lifecycle Marketing Creative), Donna Nicholson + Hakarl Bee + Brendan Dowling (Citi CDs), Joanna Thompson (TD Ameritrade CD)

Fintech: Cassandra Aaron (Brex CD Brand), Allison Supron Friel (Cash App CD), Briana Lynch (Fireblocks CD), Chris Phillips (Block CD), Greer Freshwater Burton (Marqeta CD), Colin Forsyth (Republic VP CD)

Professional services: Shawn Tong (EY CD), Sylvia Yoon Chang (Deloitte Insights CD), Russell Solomon (Armanino ECD), Glenn Markarian (Fitch Ratings CD)

### Only ICP 1a lead confirmed:
**Katherine Hill — Art Director, Morgan Stanley/Oliver**
OLIVER is the embedded agency; Morgan Stanley is the client. Same setup as Matthew Sergison-Main (B088, ICP 1a confirmed). This is the only confirmed agency-side finserv creative in 299 leads. Flag for priority outreach.

### Notable cuts required before campaign runs:
1. **~38 banker ADs** — UBS, Bear Stearns, JPM, Barclays Capital, Macquarie "AD" titles = financial analysts, not Art Directors. Must be removed.
2. **Fake/troll accounts:** Kanye West-Rothschild-Goldstein (Theranos), Blank Blank (Capture Casper LLC), three "NY Media" bots (Shandra Reynolds, Kate Terina, Kate Richards — near-identical profiles, no company info).
3. **Wrong roles:** Yalena Santillan (JPM executive admin), Diandra Nims (QBE underwriter), Amanda Bates (HSBC engagement advisor), Toby Shwartz (MetLife IT Director — "IT AD" ≠ Art Director), Heather Cleary (Voya "Financial Ad" = financial advisor).

### Sequence framing problem:
The Legal Friction — FinServ (NY) sequence hook assumes the lead delivers to an external client:
*"When you deliver AI-generated video to a client for campaign approval, are their legal teams asking for documentation?"*

~70 of the 299 confirmed leads are in-house at their finserv company — they don't deliver to external clients, they are the client. This hook will miss or confuse them.

**Recommendation:** Revise msg#1 before Ivy UK campaign launches (TBD). JD NY campaign is already live (Jun 21) — 0 leads sent as of last data, so revision may still be possible. Revised hook: *"When your compliance or legal team reviews AI-generated video before it goes out, are they asking for documentation on how it was made?"*

---

## 4. Adjacent Sector TAM Opportunity

Flagged for future analysis. Three regulated sectors adjacent to finserv with similar documentation dynamics:

**Pharma/Healthcare (highest priority):**
MLR (medical-legal-regulatory) review for promotional material is already a legal requirement in UK/US. Every piece of pharma advertising must have an approval trail. AI video is a new undocumented category that existing MLR workflows don't cover. The vocabulary is different ("MLR submission" not "legal approval") but the product fit is identical.
LinkedIn filter: Company industry = Pharmaceuticals / Medical Devices / Biotechnology + CD/Content Producer titles

**Government/Public Sector:**
Procurement transparency rules and public accountability for AI-generated comms. Myron Stapleton (R&M Geoscience, UK — verbatim: "worth its weight in gold") operates in this space delivering to health boards and national bodies. Strongest emotional endorsement in the pipeline.
LinkedIn filter: Government Administration / Defense & Space + creative/comms titles

**Legal Sector:**
Law firm brand marketing growing. Law firms' own clients won't accept unverified AI content from their law firm. Paul Garcia (Head of Creative Services, Cleary Gottlieb, NY) is the only legal-sector creative lead visible in the JD NY 299-lead list.
LinkedIn filter: Law Practice / Legal Services + creative titles

TAM analysis: not yet run. Pharma is the most immediately actionable (MLR infrastructure already exists, documentation mindset established).

---

## 5. Open Questions Carried Forward

- [x] ~~Revise Legal Friction — FinServ (NY) msg#1 hook~~ — Decision Jun 22: run both campaigns with current agency-side hook. Treating as unplanned split test — ICP 1b responses under agency-side framing may surface unexpected language or signal. Review replies before next report cycle.
- [ ] Decide: run JD NY list as-is (ICP 1b framing, knowing mismatch) or re-build list with Advertising Services filter for ICP 1a?
- [ ] Katherine Hill (Morgan Stanley/Oliver) — flag for priority outreach as only confirmed ICP 1a in NY list
- [ ] TAM analysis: adjacent regulated sectors (pharma, govt, legal)
- [ ] Does Mhd Ali (Monks) deserve a follow-up with corrected framing? His role is Gen AI Specialist at Monks (major agency) — if contacted again, ask about agency client requirements rather than product confidentiality
- [ ] ICP 1b sales motion design: what does the right sequence look like for internal compliance framing? (separate from ICP 1a sequence)

---

*Next full report: after next Dripify export + Supabase export cycle.*
