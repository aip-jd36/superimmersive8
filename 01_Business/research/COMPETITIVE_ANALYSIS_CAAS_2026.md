# Competitive Analysis: CaaS Model (March 2026)
## AI Video Verification + Marketplace Landscape

**Version:** 4.0
**Date:** March 2026
**Context:** v4 business model (Compliance as a Service + Showcase Marketplace + Producer Track)

---

## Executive Summary

**SI8's market positioning:** The only B2B verification service providing Chain of Title documentation for non-Adobe AI video tools (Sora, Runway, Kling), with an opt-in marketplace for verified content.

**Direct competitors:** None identified offering this specific combination (verification service + marketplace).

**Indirect competitors:**
- Adobe/Firefly (verification built-in, but Firefly-only)
- Getty Images/Shutterstock (photography vetting model, not AI video yet)
- Escape.ai, Vimeo Stock (marketplaces without dedicated verification services)

**SI8's moat:**
1. Human judgment layer (subjective legal review) that cannot be automated
2. Coverage of creative AI tools legal teams currently block (Sora, Runway, Kling)
3. APAC/SEA geographic focus (no direct regional competitor)
4. Opt-in flywheel solving chicken-egg problem (verification customers become marketplace inventory)

---

## Competitive Landscape Map

### Quadrant 1: Verification Services (No Marketplace)

**Adobe Firefly Commercial Use**
- **What:** Built-in commercial indemnification for Firefly-generated content
- **Model:** Free (bundled with Adobe Creative Cloud subscription)
- **Coverage:** Firefly outputs only (image, video, design assets)
- **Indemnification:** Adobe covers up to $25K in legal defense costs if customer is sued for infringement
- **Target customer:** Adobe Creative Cloud users (brands, agencies, freelancers)

**Strengths:**
- Zero friction (no separate service to buy)
- Backed by Adobe brand trust
- Immediate availability (no approval process)
- Legal indemnification (actual financial coverage)

**Weaknesses:**
- Firefly-only (does not cover Sora, Runway, Kling, Pika outputs)
- Creative limitations (Adobe's licensed training data is conservative)
- Cannot verify external AI video tools

**SI8 differentiation:**
- Covers Sora/Runway/Kling (the tools Adobe won't indemnify)
- Judgment layer (human review, not just automated provenance)
- Fills the gap: "Adobe gives you safe. We give you capable—and make it safe."

**Threat level:** Medium (Adobe is default answer for risk-averse brands, but structurally limited to Firefly)

---

**Getty Images (Photography Vetting Model)**
- **What:** Curated stock photography/video with documented model releases, property releases, and commercial licenses
- **Model:** Marketplace with built-in vetting (photographers submit, Getty reviews, buyers license)
- **Coverage:** Traditional photography, stock video (live-action), editorial content
- **Take rate:** 80-85% (Getty keeps majority, contributor gets 15-20%)
- **Target customer:** Brands, agencies, publishers needing commercially licensed visual content

**Strengths:**
- Established trust (40+ years, publicly traded)
- Deep vetting process (legal team, model releases, property rights)
- Brand synonymous with "commercially safe images"
- Global reach, enterprise contracts

**Weaknesses:**
- Not AI-specific (doesn't cover AI tool provenance, training data risk)
- Live-action only (video library is traditional stock footage)
- No AI video verification service offered yet

**SI8 differentiation:**
- AI video focus (Getty is photography/live-action stock)
- Verification as standalone B2B service (not just marketplace bundled)
- Covers AI-specific risks (tool provenance, training data, synthetic likeness)

**Threat level:** High (if Getty launches AI video verification, they could dominate). **Monitor quarterly.**

**Strategic response if Getty enters:**
- Emphasize speed and flexibility (boutique vs. enterprise bureaucracy)
- APAC/SEA focus (local relationships, language, market knowledge)
- Judgment layer depth (Getty may rely on automation, SI8 offers human review)

---

**C2PA / Content Credentials (Provenance Standard)**
- **What:** Open technical standard for cryptographically binding metadata to content (who made it, which tools were used, edit history)
- **Backers:** Adobe, Microsoft, BBC, Nikon, Sony, OpenAI, others
- **Model:** Free / open standard (not a commercial service)
- **Coverage:** Any digital content (images, video, audio, documents)
- **What it proves:** Provenance (origin, toolchain, edit history)
- **What it does NOT prove:** Commercial safety, IP clearance, brand safety, legal defensibility

**Strengths:**
- Industry-backed standard (will become widespread)
- Cryptographic verification (tamper-proof metadata)
- Free to implement (no service fee)

**Weaknesses:**
- Metadata only (does not assess content for legal/IP risk)
- Does not cover: likeness infringement, training data liability, brand safety
- Requires adopter implementation (tools must support C2PA)

**SI8 differentiation:**
- **"Provenance tells you who made it. We tell you whether it's safe to use."**
- C2PA proves the toolchain; SI8 reviews the output
- Judgment layer: Human assessment of IP risk, likeness, training data implications
- C2PA commoditizes documentation; SI8's moat is interpretation

**Threat level:** Low (complementary, not competitive). C2PA will make SI8's documentation easier (auto-capture tool metadata), but won't replace human judgment.

**Strategic position:** Embrace C2PA as input to SI8's review process. "We verify C2PA-documented content for commercial safety."

---

### Quadrant 2: Marketplaces (No Dedicated Verification)

**Escape.ai**
- **What:** AI creator platform for showcasing and monetizing AI-generated content
- **Model:** Portfolio hosting + project marketplace + direct monetization
- **Coverage:** AI-generated images, video, interactive experiences
- **Verification:** Unknown (likely minimal—portfolio showcase, not rights vetting)
- **Target customer:** AI creators (artists, filmmakers, developers)

**Strengths:**
- AI-native platform (built for AI creators specifically)
- Portfolio + monetization in one place
- Community features (networking, collaboration)

**Weaknesses:**
- Creator-centric (not B2B agency/brand focus)
- No evidence of dedicated rights verification service
- Portfolio showcase ≠ commercial licensing guarantees

**SI8 differentiation:**
- B2B verification service (not just creator portfolio)
- Rights Verified process as core competency
- Buyer-side value prop: "Browse verified content" (not just creator self-promotion)

**Threat level:** Medium (if they add rights vetting layer, becomes direct competitor)

**Monitor:** Escape.ai product announcements, pricing model updates

---

**Vimeo Stock**
- **What:** Stock video licensing marketplace (live-action footage, some motion graphics)
- **Model:** Marketplace (contributors upload, buyers license)
- **Coverage:** Live-action stock video, motion graphics
- **Verification:** Standard stock terms (contributor warrants ownership, no deep vetting)
- **Take rate:** ~60% (Vimeo keeps), 40% to contributor
- **Target customer:** Video editors, agencies, brands needing stock footage

**Strengths:**
- Established marketplace (integrated with Vimeo platform)
- Large library (millions of clips)
- Known brand in video hosting/licensing

**Weaknesses:**
- Not AI-specific (mostly live-action stock)
- Minimal rights vetting (contributor warrants, no deep review)
- Standard stock model (no Chain of Title documentation)

**SI8 differentiation:**
- AI video focus (Vimeo is live-action dominant)
- Rights Verified process (deep vetting vs. standard stock warranty)
- B2B verification service separate from marketplace

**Threat level:** Low (different market focus—stock footage vs. AI video)

---

**Adobe Stock**
- **What:** Stock content marketplace (photos, video, templates, music)
- **Model:** Marketplace (contributors upload, buyers license)
- **Coverage:** Stock photography, stock video (live-action), templates, audio
- **Verification:** Standard stock terms + Firefly integration (indemnified AI content)
- **Take rate:** 66-85% (Adobe keeps), 15-34% to contributor
- **Target customer:** Adobe Creative Cloud users (tight integration with Photoshop, Premiere, etc.)

**Strengths:**
- Massive marketplace (200M+ assets)
- Adobe ecosystem integration (seamless workflow)
- Firefly AI content indemnified (if generated via Adobe tools)

**Weaknesses:**
- Firefly-only for AI indemnification (does not cover external AI tools)
- Standard stock vetting (contributor warrants, no deep Chain of Title review for non-Adobe AI content)
- Cannot verify Sora/Runway/Kling outputs

**SI8 differentiation:**
- Covers Sora/Runway/Kling (Adobe Stock doesn't verify these)
- Deep vetting (Chain of Title vs. standard stock warranty)
- B2B verification service (not just marketplace submission)

**Threat level:** High (if Adobe adds external AI tool verification to Stock, could dominate)

**Monitor:** Adobe MAX conference announcements, Stock policy updates

**Strategic response if Adobe enters:**
- "Adobe verifies Adobe tools. We verify everything else."
- Emphasize judgment layer (not just automated metadata)
- APAC focus + speed (boutique vs. enterprise)

---

### Quadrant 3: AI Tools with Built-In Commercial Terms (Not Verification Services)

**Runway Pro / Runway Enterprise**
- **What:** AI video generation tool (Gen-3 Alpha, image-to-video, text-to-video)
- **Model:** SaaS subscription ($12-$95/month for Pro, custom for Enterprise)
- **Commercial terms:** Pro plan allows commercial use; users retain copyright
- **Verification:** None (users must self-certify their inputs are licensed)
- **Target customer:** Filmmakers, agencies, brands creating AI video content

**Strengths:**
- Leading AI video generation tool (high quality, fast iteration)
- Clear commercial terms (Pro plan allows commercial use)
- Copyright retained by user

**Weaknesses:**
- No verification service (users must prove their inputs were licensed)
- Training data risk unclear (Runway trained on internet data, not fully licensed)
- No Chain of Title documentation provided to users

**SI8 relationship:** Complementary (Runway is the tool, SI8 is the verification layer)

**Positioning:** "You create with Runway. We verify it's safe to use commercially."

---

**OpenAI Sora**
- **What:** AI video generation tool (text-to-video, image-to-video)
- **Model:** ChatGPT Plus subscription ($20/month) or API access
- **Commercial terms:** ChatGPT Plus users can use outputs commercially; retain copyright
- **Verification:** None (users must ensure inputs are licensed)
- **Target customer:** Creators, agencies, brands

**Strengths:**
- Best-in-class video quality (as of March 2026)
- Clear commercial terms (Plus users own outputs)

**Weaknesses:**
- No verification service
- Training data risk (Sora trained on internet video, licensing unclear)
- No Chain of Title provided

**SI8 relationship:** Complementary (Sora is the tool, SI8 is the verification layer)

---

**Kling AI (Kuaishou)**
- **What:** Chinese AI video generation tool (text-to-video, image-to-video)
- **Model:** Subscription (~$7/month, commercial plans ~$30/month)
- **Commercial terms:** Unclear / evolving (commercial use requires specific plan)
- **Verification:** None
- **Risk factor:** Chinese company, training data provenance unknown, legal standing in US/EU unclear

**SI8 relationship:** Complementary but flagged as "Caution tier" in Rights Playbook

**Positioning:** "We verify Kling outputs for commercial use and flag risk tier in Rights Package."

---

### Quadrant 4: Full-Stack Competitors (Verification + Marketplace + Production)

**None identified as of March 2026.**

**Potential future competitor:** If Adobe Stock adds:
1. External AI tool verification service (Sora/Runway/Kling review)
2. Deep vetting (Chain of Title, not just contributor warranty)
3. AI-specific marketplace (Rights Verified filter)

**Then Adobe becomes full-stack competitor.**

**SI8's response:**
- "Adobe is enterprise/global. We're boutique/APAC."
- Speed and flexibility (weeks vs. days for verification)
- Human judgment layer (Adobe may automate, SI8 offers deep review)

---

## SI8's Competitive Advantages (Moat Analysis)

### 1. Judgment Layer (Cannot Be Automated)

**What competitors offer:**
- Adobe: Automated provenance (C2PA metadata)
- Getty: Standardized checklist vetting
- Stock platforms: Contributor warranties

**What SI8 offers:**
- Subjective legal review: Does this output infringe third-party IP?
- Visual assessment: Is there an unintended real-person likeness?
- Context-dependent brand safety: Is this suitable for mainstream brands?
- Training data risk interpretation: Emerging law, requires human judgment

**Why this matters:**
- Software can capture metadata (C2PA), but cannot assess legal/IP risk
- As provenance documentation commoditizes, judgment layer becomes MORE valuable
- This is the same moat Getty has (human reviewers assess model releases, property rights)

**Defensibility:** High (cannot be easily replicated by adding a feature)

---

### 2. Coverage Gap: Sora / Runway / Kling

**Market need:** Brands want to use Sora/Runway/Kling (best creative tools), but legal teams block them due to lack of commercial verification.

**Adobe's structural limitation:** Will never indemnify non-Adobe tools (not trained on Adobe's licensed library).

**SI8's positioning:** "We give you the creative power of Sora/Runway/Kling with the commercial safety Adobe provides for Firefly."

**Market size:** Every brand/agency using or evaluating Sora/Runway/Kling for commercial projects = SI8's addressable market.

**Defensibility:** Medium-High (requires deep understanding of each tool's terms, training data, output risks—barrier to entry for casual competitors)

---

### 3. Geographic Focus: APAC / SEA

**Competitor footprint:**
- Adobe: Global, but US/EU-centric
- Getty: Global, but US/EU-centric
- Escape.ai: US-based

**SI8's focus:**
- Singapore, Taiwan, Bangkok, KL, Manila (SEA + East Asia)
- Bilingual (EN + ZH-TW)
- Local relationships, local market knowledge, local timezone

**Market gap:** No direct competitor offering B2B AI video verification service in APAC/SEA.

**Defensibility:** Medium (geographic advantage, but not a permanent moat—large competitor could enter)

---

### 4. Opt-In Flywheel (Solves Chicken-Egg)

**Competitor marketplace models:**
- Require recruiting creators separately from buyers
- Chicken-egg: Need creators to attract buyers, need buyers to attract creators

**SI8's model:**
- Verification customers (paying) become marketplace inventory (opt-in)
- No need to recruit creators for marketplace separately
- Catalog builds organically as byproduct of verification service

**Competitive advantage:** Structural (built into business model, not a feature)

**Defensibility:** High (requires specific model architecture, not easy to bolt onto existing stock marketplace)

---

### 5. Data Accumulation (Future Moat)

**Year 1-2:** SI8 builds largest dataset of "AI video content that passed/failed commercial review"

**Year 3+:** This becomes training data for:
- Semi-automated pre-screening (flag obvious rejections)
- Risk scoring (predict approval likelihood)
- Buyer insights (which content types license most)

**Competitive advantage:** First-mover data advantage (like how Stripe learned fraud patterns before competitors)

**Defensibility:** Very high (proprietary dataset, cannot be replicated without years of operations)

---

## Competitive Threats & Monitoring Plan

### Threat 1: Adobe Expands Verification to External Tools

**What would happen:**
- Adobe Stock adds "External AI Verification" service
- Submit Sora/Runway outputs → Adobe reviews → Issues certificate
- Bundled with Creative Cloud or Stock subscription

**Impact on SI8:**
- Adobe's brand trust > SI8's brand trust
- Enterprise buyers default to Adobe
- SI8's "Sora/Runway verification" differentiation erodes

**Likelihood:** Medium (Adobe has incentive to capture this market, but conflicts with Firefly strategy)

**Timeline:** 12-24 months (if it happens)

**SI8 response:**
- Emphasize judgment layer ("Adobe automates, we offer deep human review")
- APAC market focus (local speed, relationships)
- Maintain boutique positioning (high-touch vs. self-serve)

**Monitor:** Adobe MAX conference, Stock policy updates, Adobe blog announcements

---

### Threat 2: Getty Images Enters AI Video Verification

**What would happen:**
- Getty launches "Getty AI Video Verification" service
- $299-$499 per video, similar to SI8 model
- Leverages Getty brand trust + existing legal team

**Impact on SI8:**
- Getty's brand > SI8's brand for enterprise buyers
- Getty could bundle verification with existing Stock subscriptions
- SI8's "vetting infrastructure" differentiation erodes

**Likelihood:** Medium-High (Getty has infrastructure, incentive, and market position)

**Timeline:** 6-18 months (if they see demand signal)

**SI8 response:**
- Speed and flexibility (boutique vs. enterprise bureaucracy)
- APAC focus (Getty is US/EU-centric)
- Tool coverage (ensure SI8 covers tools Getty doesn't, like Kling)

**Monitor:** Getty Images press releases, Getty blog, investor calls (Getty is publicly traded—quarterly earnings)

---

### Threat 2b: FADEL Builds AI Video Provenance Module

**Who they are:** Enterprise IP licensing and royalty management platform. ~$14.5M revenue, 101-200 employees, founded 2003. Clients: Disney, Marvel, Hasbro, Warner Bros., Pearson. Products cover contract/deal management, royalty processing, brand compliance monitoring, and product approval for physical goods licensees. See `COMPETITOR-FADEL-ANALYSIS.md` for full breakdown.

**What would happen:**
- FADEL adds a "Generative AI Clearance" module to their IPM Suite or Brand Vision product
- Sells it into their existing Fortune 500 client base (studios, publishers, consumer goods companies)
- Positions as "upstream clearance layer before rights management"

**Impact on SI8:**
- FADEL has existing enterprise trust and relationships SI8 lacks in Year 1
- If they capture the enterprise buyer (studios, large brands), SI8 is squeezed into SMB/agency tier
- Their brand compliance monitoring (Brand Vision) already scans video for logos — adding AI provenance checks is a plausible extension

**Likelihood:** Low-Medium. FADEL's entire product assumes rights are already structured and known. AI-generated content breaks that assumption at a fundamental level. They'd need significant reorientation, not just a feature add.

**Timeline:** 18-36 months (if they see market signal)

**SI8 response:**
- Own the creator/agency tier (FADEL is enterprise-only, min 6-figure contracts)
- Build brand trust with agencies before FADEL moves downstream
- Transactional speed ($499, same-week turnaround) vs. enterprise sales cycle (6-12 months)
- "FADEL manages rights after they exist. We determine whether rights exist in the first place."

**Monitor:** FADEL product announcements, particularly anything mentioning AI-generated content, generative AI, or chain of title for synthetic media

**Strategic note:** More likely partner/acquirer than direct competitor in Years 1-2. If SI8 builds the AI clearance category, FADEL is a natural acquirer — they have the enterprise distribution, SI8 has the AI-native clearance product they can't build quickly.

---

### Threat 3: Escape.ai Adds Rights Verification Layer

**What would happen:**
- Escape.ai adds "Rights Verified" badge to portfolio uploads
- Creators pay $99-$199 for verification
- Builds marketplace on top of verified content

**Impact on SI8:**
- Direct competitor (verification + marketplace)
- Escape.ai has existing creator community, network effects
- SI8's CaaS model faces competition

**Likelihood:** Medium (logical next step for Escape.ai, but requires legal expertise and process build)

**Timeline:** 12-24 months

**SI8 response:**
- B2B focus (agencies/production houses vs. individual creators)
- Depth of review (Chain of Title documentation vs. badge/checkbox)
- Buyer-side value prop (SI8 is trusted by brands, not just creators)

**Monitor:** Escape.ai product announcements, pricing changes, blog posts

---

### Threat 4: C2PA Becomes "Good Enough" for Buyers

**What would happen:**
- C2PA adoption becomes widespread (Adobe, Microsoft, OpenAI all support)
- Brands start accepting C2PA metadata as "sufficient" for commercial use
- "If it has Content Credentials, it's safe to use" becomes market belief

**Impact on SI8:**
- Verification service is perceived as unnecessary
- Provenance documentation commoditizes ("it's built into the tools now")
- SI8's value prop weakens

**Likelihood:** Low-Medium (C2PA solves provenance, not safety—but market may not understand difference)

**Timeline:** 24-36 months (C2PA is early, awareness is low)

**SI8 response:**
- Educate buyers: "C2PA tells you WHO made it and HOW. It doesn't tell you if it's SAFE to use."
- Emphasize judgment layer: "We review C2PA-documented content for IP risk, likeness, brand safety—things metadata can't capture."
- Position as complementary: "We verify C2PA-documented content" (not "We replace C2PA")

**Monitor:** C2PA adoption announcements, brand case studies, legal blog posts

---

## Market Opportunity Sizing

### Total Addressable Market (TAM)

**Global AI video production market (2026-2030):**
- AI video tools democratizing creation (Runway, Sora, Kling, Pika, Veo)
- Every brand producing AI video for commercial use = potential customer
- Analogous to photography market when digital cameras democratized creation (early 2000s)

**TAM proxy:** Global stock video market = ~$5B annually (2025)
- If AI video becomes as ubiquitous as stock video, TAM = $5B
- Verification service = 10% of licensing value (per Getty model) = $500M TAM

---

### Serviceable Addressable Market (SAM)

**Year 1-3 focus: APAC/SEA production agencies + brands**

**APAC production agency market:**
- Singapore: ~500 creative/production agencies
- Thailand: ~300 agencies
- Malaysia: ~200 agencies
- Philippines: ~150 agencies
- Taiwan: ~400 agencies
- **Total: ~1,550 agencies**

**Assumptions:**
- 20% will adopt AI video by 2027 = 310 agencies
- Each agency: 5 verifications/year on average = 1,550 verifications/year
- $499/verification × 1,550 = **$773K annual SAM (CaaS only)**

**Add marketplace (Gear B):**
- 1,550 verifications × 50% opt-in = 775 films in catalog
- 775 films × 33% licensing rate = 256 licensing deals/year
- $3K average deal × 256 deals = $768K GMV
- SI8 commission (20%) = **$154K annual SAM (Showcase)**

**Total APAC/SEA SAM: ~$927K/year** (CaaS + Showcase, excluding Producer track)

---

### Serviceable Obtainable Market (SOM — Year 1 Target)

**SI8 Year 1 target: $80K-$100K**
- % of SAM: ~9-11% (achievable for first-year startup)
- Requires: 60-70 verifications + 10 licensing deals + 3-4 Producer deals

**Year 3 target: $500K-$1M**
- % of SAM: 50-100% (market leader in APAC/SEA)
- Requires: Platform scale, self-serve, 100+ verifications/month

---

## Positioning Strategy by Competitor

| Competitor | SI8's Counter-Positioning |
|------------|--------------------------|
| **Adobe Firefly** | "Adobe gives you safe. We give you capable—and we make it safe." |
| **Getty Images** | "Getty for AI video—except we can also verify content Getty can't (Sora, Runway, Kling)." |
| **C2PA / Content Credentials** | "Provenance tells you who made it. We tell you whether it's safe to use." |
| **Escape.ai** | "Escape is for creator portfolios. SI8 is for commercial verification—built for buyers and agencies." |
| **Adobe Stock / Vimeo Stock** | "Stock platforms require contributor warranties. We provide independent third-party verification." |
| **Runway / Sora (tools)** | "You create with Runway/Sora. We verify it's safe for commercial use." |

---

## Competitive Summary Table

| Competitor | Type | Verification Service? | Marketplace? | AI Video Focus? | Threat Level |
|------------|------|----------------------|-------------|----------------|-------------|
| **Adobe Firefly** | Tool + indemnification | Yes (Firefly only) | No | Partial | Medium |
| **Getty Images** | Stock marketplace | Yes (photography) | Yes | No (not yet) | High |
| **Adobe Stock** | Stock marketplace | Minimal | Yes | Partial (Firefly only) | High |
| **Escape.ai** | Creator platform | Unknown (likely minimal) | Yes | Yes | Medium |
| **Vimeo Stock** | Stock marketplace | Minimal | Yes | No | Low |
| **C2PA** | Provenance standard | No (metadata only) | No | N/A | Low |
| **Runway / Sora** | AI tools | No | No | Yes (tool) | N/A (complementary) |
| **FADEL** | Enterprise IP/royalty mgmt | No (traditional IP only) | No | No | Low (today) / Medium (long-term) |

**SI8 is the only player offering:** B2B verification service (CaaS) for non-Adobe AI video tools + opt-in marketplace + producer curation track.

**Adjacent players to monitor (not direct competitors today):**
- **FADEL** — Enterprise rights/royalty management for traditional IP (Disney/Marvel-tier). Validates the category. Not solving AI-generated content clearance. Possible future acquirer or partner. Full analysis: `COMPETITOR-FADEL-ANALYSIS.md`
- **ClearStory** — Chain of Title tracking software for traditional film/TV. No AI layer, no clearance execution.
- **Rightsline** — Enterprise rights management platform. No SMB/indie tier, no AI content focus.

---

## Key Takeaways

1. **No direct competitor exists** offering SI8's specific combination (CaaS verification + marketplace + producer track).

2. **Biggest threats:**
   - Getty Images adds AI video verification (likely within 12-18 months if market demand is proven)
   - Adobe expands verification to external tools (conflicts with Firefly strategy, but possible)

3. **Strongest moat:**
   - Judgment layer (human review of subjective legal/IP risk) cannot be automated
   - As C2PA commoditizes provenance metadata, judgment becomes MORE valuable

4. **Geographic advantage:**
   - APAC/SEA focus with no direct regional competitor
   - Bilingual (EN + ZH-TW), local relationships, local market knowledge

5. **Structural advantage:**
   - Opt-in flywheel (verification customers → marketplace inventory) solves chicken-egg problem competitors face

**Strategic priority:** Prove the model works (Year 1) before Getty or Adobe enter. Once validated, SI8 has first-mover advantage and can scale aggressively.

---

**Next steps:**
1. Monitor Getty Images and Adobe announcements quarterly
2. Track C2PA adoption and market perception
3. Build deep vetting process documentation (defensible expertise)
4. Focus on APAC market penetration (geographic moat)
5. Accumulate verification data (future moat via proprietary dataset)

---

**Files to reference:**
- `BUSINESS_PLAN_v4.md` — Full strategy
- `REVENUE_MODEL_v4.md` — Economics and unit economics
- `PEER_REVIEW_SUMMARY_CAAS.md` — Strategic validation
- `06_Operations/legal/rights-playbook/versions/v0.1.md` — SI8's vetting process (moat documentation)
