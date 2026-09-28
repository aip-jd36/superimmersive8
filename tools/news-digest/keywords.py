# SI8 News Intelligence — Keyword Clusters
# Each cluster has a name and a list of Google News search queries.
# Add/remove queries here to tune coverage without touching the main script.
#
# Taxonomy replaced 2026-09-28 per SI8-INTEL-NEWS-2A (PM-approved repair of
# SI8-INTEL-NEWS-2's design-only proposal) and implemented under
# SI8-INTEL-NEWS-3. 9 clusters / 43 queries, discovery-config-only change —
# see 06_Operations/DECISION-QUALITY-STANDARDS.md-style rigor in the design
# thread for the full rationale (litigation retrieval-quality repair via
# parenthetical OR-groups, provider/LK-signal clusters marked transitional).
# This file has no test suite; verify structurally after any edit (cluster
# count, query count, no duplicate queries, no stray hardcoded year).

KEYWORD_CLUSTERS = [
    {
        # Evergreen. Every query wraps a shared procedural-stage OR-group so a
        # single legal theory isn't missed just because an article says
        # "settlement" instead of "ruling" (SI8-INTEL-NEWS-2A retrieval-quality
        # repair; smoke-tested live 2026-09-28 against news.google.com/rss/search
        # before this taxonomy was made load-bearing).
        "name": "litigation_commercial_media_core",
        "queries": [
            "AI video copyright (lawsuit OR sues OR ruling OR settlement OR injunction OR appeal OR verdict OR judgment)",
            "generative AI training data (lawsuit OR sues OR ruling OR settlement OR appeal OR judgment)",
            "right of publicity AI (lawsuit OR sues OR ruling OR settlement OR judgment)",
            "AI deepfake false endorsement (lawsuit OR sues OR ruling OR judgment)",
            "AI voice clone (lawsuit OR sues OR ruling OR settlement OR judgment)",
            "AI video trademark (lawsuit OR sues OR ruling OR judgment)",
        ],
    },
    {
        # Explicitly a human-maintained rotating watchlist, not evergreen.
        # Adding/retiring a named case is a deliberate manual edit (quarterly
        # review) — no automatic promotion/removal logic exists or is proposed.
        "name": "litigation_named_case_tracker",
        "queries": [
            "Getty Images Stability AI (ruling OR appeal OR settlement OR judgment)",
            "GEMA OpenAI Munich (ruling OR appeal OR settlement OR judgment)",
        ],
    },
    {
        # Evergreen. No hardcoded year/jurisdiction — recency is governed by
        # digest.py's own --lookback parameter, not query text.
        "name": "regulation_policy_commercial_media",
        "queries": [
            "AI synthetic performer disclosure law",
            "state AI advertising disclosure law",
            "AI content disclosure law advertising",
            "EU AI Act Article 50 transparency requirement",
            "FTC AI advertising enforcement",
            "ASA UK AI advertising ruling",
        ],
    },
    {
        # TRANSITIONAL named-provider seed coverage, not a generic monitor.
        # Deliberately NOT derived from lib/tool-identity/registry.ts's
        # CANONICAL_TOOL_IDS in this milestone — that registry has no
        # display-name or GTM-relevance field yet (SI8-INTEL-NEWS-2A, Part O).
        # Query #10 is a generic catch-all, the one partial mitigation for
        # "the named list can't cover every provider."
        "name": "provider_commercial_terms",
        "queries": [
            "Runway AI commercial terms",
            "Kling AI commercial terms",
            "Pika AI commercial terms",
            "Google Veo commercial terms",
            "Adobe Firefly commercial terms indemnification",
            "ElevenLabs commercial terms voice cloning",
            "Synthesia commercial terms license",
            "Luma AI commercial terms license",
            "Stability AI commercial license terms",
            "AI video provider enterprise indemnification terms",
        ],
    },
    {
        # TRANSITIONAL discovery seeds bridging toward a future generic
        # governed-jurisdiction/domain registry that does not exist yet
        # (jurisdiction is plain free text today, by deliberate PM decision,
        # LK Phase 1 2026-08-16). This cluster NEVER creates or mutates
        # governed Living Knowledge — a discovered article is, at most, a
        # candidate signal for a human to route into the existing
        # tools/lk-source-monitor/ review-package workflow. The Taiwan query
        # runs through the current US-English Google News configuration
        # (hl=en-US&gl=US&ceid=US:en, unchanged by this milestone) and
        # therefore gives opportunistic English-language discovery only — it
        # is NOT comprehensive Taiwan-market monitoring.
        "name": "living_knowledge_domain_signals",
        "queries": [
            "US Copyright Office AI (guidance OR registration OR report)",
            "state right of publicity AI law",
            "Taiwan copyright AI generated content law",
        ],
    },
    {
        # Evergreen.
        "name": "buyer_risk_governance_signals",
        "queries": [
            "brand AI campaign approval process",
            "agency AI content policy governance",
            "holdco AI governance policy",
            "AI content errors omissions insurance exclusion",
            "media liability insurer AI generated content",
            "brand AI campaign withdrawn controversy",
        ],
    },
    {
        # Probationary / highest-noise-risk cluster (SI8-INTEL-NEWS-2A Part G).
        # Narrowed to 2 queries deliberately. Email priority is NOT set here —
        # that belongs to a later classification/composition milestone.
        "name": "commercial_adoption_validation",
        "queries": [
            "agency AI generated video campaign client",
            "brand AI video advertising campaign results",
        ],
    },
    {
        # Evergreen. New cluster — no prior coverage existed for this category.
        "name": "provenance_authenticity_infrastructure",
        "queries": [
            "C2PA content credentials adoption",
            "AI content provenance metadata standard",
            "synthetic content watermarking commercial",
            "content authenticity infrastructure platform adoption",
        ],
    },
    {
        # Evergreen. Narrowly scoped to named capability classes, not a
        # generic "new AI model" feed.
        "name": "material_capability_changes",
        "queries": [
            "AI digital human realistic commercial",
            "AI voice cloning commercial product launch",
            "AI performer replacement technology",
            "AI character consistency commercial video",
        ],
    },
]

# SI8 business context — injected into the Claude relevance scoring prompt
SI8_CONTEXT = """
SuperImmersive 8 (SI8) is a B2B compliance infrastructure provider for AI-generated video content, based in Taipei with operations in London, Amsterdam, Dubai, and Singapore.

## Core Product

Chain of Title (CoT) verification for AI video — an IP provenance document covering three legal theories:
- Copyright: which AI tools were used, what training data sources, whether the tool's commercial license covers the intended use
- Right of Publicity: whether any human likenesses or synthetic performers appear in the output
- Trademark: whether recognizable logos, brand elements, or copyrighted characters appear

Two tiers:
- Creator Record ($29): self-attested documentation for individual creators
- SI8 Certified ($499): human-reviewed, 90-minute review, "SI8 VERIFIED · COMMERCIAL AUDIT PASSED" stamp

## The Problem SI8 Solves

Brand legal teams at major advertisers block AI video campaigns because agencies cannot answer four questions: (1) Which AI tools were used? (2) What training data was used — is it cleared for commercial use? (3) Are there any real human likenesses in the output? (4) Does the tool's commercial license cover this use case?

Without a structured answer to those four questions, brand legal teams reject campaigns. Chain of Title is the document that answers them. It is an IP provenance document for brand approval workflows, E&O underwriting, and litigation defense.

IMPORTANT: Chain of Title is NOT an AI disclosure label. Laws like NY S.8420-A, EU Art. 50, and platform policies require a disclosure label IN the ad. Those are separate obligations. CoT is a backend IP document — it proves due diligence on copyright, likeness, and commercial licensing. These are distinct compliance obligations that often get confused.

## Three Target ICPs

1. **Creative Directors / Senior Production Specialists at agencies with finserv-exposed clients** — they submit AI video for brand client approval and get blocked when the client's legal team adds a documentation requirement to the brief or contract. Pain: campaign stuck, client relationship at risk, deadline missed. Trigger: informal handling (email, tool list) no longer satisfies what the legal team is formally requiring. Best geo: Dubai (finserv market), Singapore, UK/England. LinkedIn angle: speak to the practical reality of getting a campaign through approval.

2. **BA/Broadcast Affairs / Line Producers / Executive Producers at agencies and production companies making broadcast-destined AI content** — two distinct pain points: (a) clearance gate before broadcast/platform delivery — same process as music/talent/location clearance, no standard format for AI content; (b) E&O insurance — standard policies are adding AI exclusions or requiring documentation riders; can't get full coverage without Chain of Title. Pain: content cannot be distributed or insured without documentation. Geo: LA (primary), UK. LinkedIn angle: speak to the clearance stack gap (AI is the missing category) or the insurance coverage gap.

3. **Brand Legal / IP Counsel / Agency GC at major advertisers and holdcos** — they SET the documentation requirement that flows down to ICP 1. B2B2B cascade: one ICP 3 conversion multiplies into many ICP 1 buyers as the requirement flows through agency contracts. Pain: no standard format exists for what they should require from agencies; every submission is ad hoc, takes longer to review, creates liability exposure. Trigger: regulatory pressure (NY Synthetic Performer Law, EU Article 50, UAE AI Act, ASA enforcement) pushing them to formalize. LinkedIn angle: speak to the emerging standard they're being asked to enforce.

## Geography (priority order)

UK/England (primary), Dubai/UAE (strong finserv signal — disproportionate agency CD exposure to regulated clients), LA (ICP 2 test), Amsterdam/Netherlands, Singapore, Germany/EU.
US developments matter for legal precedent (NY Synthetic Performer Law) and ICP 3 awareness but active sales targets are UK/EU/UAE/Singapore/LA.

## Key Legal Cases and Regulatory Events — Always High Relevance

These stories score 8–10 whenever they appear in new coverage:
- **ASA Robot Puppy ruling (March 2026)**: ASA banned first AI ad under existing CAP code — direct precedent for UK brand legal teams
- **NY Synthetic Performer Disclosure Law (S.8420-A, effective June 9, 2026)**: first US law creating direct advertiser liability for AI synthetic performers in ads ($1K first violation, $5K subsequent); applies to any ad reaching NY audiences regardless of advertiser location
- **EU AI Act Article 50 enforcement (August 2, 2026)**: labeling requirements take effect; €15M fines; deadline is a hard urgency hook for EU/Amsterdam market
- **UAE AI Act (grace period ends September 2026)**: AED 1,000,000 fines for non-compliant AI advertising; active regulatory environment in Dubai
- **Getty v. Stability AI (UK High Court, Nov 2025)**: UK court allowed trademark claim alongside copyright claim — establishes trademark as a third legal theory for AI content liability
- **GEMA v. OpenAI (Munich district court, Nov 2025)**: German courts treating AI training data as licensable — direct precedent for training data clearance requirement in EU
- **FTC dedicated AI enforcement unit (Jan 2026)**: $53,088/violation; active enforcement signal

## B2B2B Distribution Model

SI8's strategic play: get brand legal teams to pre-approve SI8's Chain of Title format → they push the requirement to agencies → agencies must use SI8. Analogous to PCI DSS, E&O insurance requirements, or UL certification — the gatekeeper sets the standard, the market adopts it.

## Doc-Targeting Rules for "update_docs" Action

When an article warrants a doc update, use this mapping — be specific, not generic:
- Regulatory news (new laws, enforcement actions, court rulings, fines, regulatory guidance): `ASA-IAB-2026-AI-CONTENT-RESEARCH.md`
- Competitor activity (Adobe Firefly, FADEL, ClearStory, Rightsline, Getty, new entrants, funding): `COMPETITIVE_ANALYSIS_CAAS_2026.md`
- Legal doctrine / copyright theory / IP liability frameworks / volitional conduct / right of publicity cases: `ASA-IAB-2026-AI-CONTENT-RESEARCH.md`
- E&O insurance market signals (new exclusions, policy changes, underwriter guidance): `COMPETITIVE_ANALYSIS_CAAS_2026.md`
- Performer rights / SAG-AFTRA / synthetic performer precedents / right of publicity: `ASA-IAB-2026-AI-CONTENT-RESEARCH.md`
- Buyer behavior / market signals / agency AI adoption: `BUYER-ANALYSIS-2026-06.md`

Do NOT suggest: `BUSINESS_PLAN_v4.md` (strategy doc, not a news log), `LEGAL_PRECEDENT_TRACKER_2026.md` (does not exist). If no specific file is a clear match, return null rather than guessing.

## Performer Rights & SAG-AFTRA Scoring

Stories about SAG-AFTRA AI agreements, performer consent requirements, right of publicity cases, AI likeness use, or synthetic performer legal precedents should score 7–9 regardless of publication source. These validate SI8's right of publicity liability layer — Chain of Title's second legal theory covering real human likenesses in AI output. Do not downgrade these stories because they appear in entertainment trade press rather than legal publications. Brand legal teams follow SAG-AFTRA precedents closely.

## NOT Relevant to SI8

AI music/audio (unless tied to video production), AI image tools only (Midjourney, DALL-E, Stable Diffusion without video), AI text tools (ChatGPT, Claude), political deepfakes, consumer/personal AI use, AI hardware/chips, AI coding tools. US-only developments with no international applicability score lower.
"""
