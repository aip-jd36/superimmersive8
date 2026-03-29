# SI8 News Intelligence — Keyword Clusters
# Each cluster has a name and a list of Google News search queries.
# Add/remove queries here to tune coverage without touching the main script.

KEYWORD_CLUSTERS = [
    {
        "name": "AI Video Rights & Clearance",
        "queries": [
            "AI video rights clearance commercial use",
            "AI generated video copyright commercial",
            "generative AI video indemnification",
            "AI video chain of title",
            "AI content rights documentation",
        ],
    },
    {
        "name": "AI Lawsuits & Legal",
        "queries": [
            "generative AI copyright lawsuit 2026",
            "AI video copyright infringement lawsuit",
            "AI training data lawsuit settlement",
            "AI content legal liability commercial",
            "AI generated content intellectual property",
        ],
    },
    {
        "name": "E&O Insurance & Brand Approval",
        "queries": [
            "AI content errors omissions insurance",
            "brand AI content approval policy",
            "AI video advertising compliance rejected",
            "AI generated content commercial campaign blocked",
            "agency AI video legal review",
        ],
    },
    {
        "name": "AI Tool Commercial Terms",
        "queries": [
            "Runway AI commercial license",
            "Kling AI commercial use rights",
            "Pika AI terms of service commercial",
            "Veo AI commercial content rights",
            "AI video tool terms commercial production",
        ],
    },
    {
        "name": "Regulation & Policy",
        "queries": [
            "EU AI Act video content labeling",
            "AI content disclosure law regulation 2026",
            "AI generated video copyright law",
            "AI content platform policy brand safety",
            "AI labeling requirement advertising",
        ],
    },
    {
        "name": "Market & Competitor Intelligence",
        "queries": [
            "Adobe Firefly commercial indemnification",
            "AI content rights management platform",
            "AI video verification compliance service",
            "Getty Images AI video licensing",
            "AI media rights startup funding",
        ],
    },
]

# SI8 business context — used in the Claude relevance scoring prompt
SI8_CONTEXT = """
SuperImmersive 8 (SI8) is a B2B compliance infrastructure provider for AI-generated video content, based in Taipei/Singapore.

Core product: Chain of Title verification for AI video.
- Creator Record ($29): self-attested documentation for individual creators
- SI8 Certified ($499): human-reviewed, 90-minute review, "SI8 VERIFIED · COMMERCIAL AUDIT PASSED" stamp

The problem SI8 solves: Brands and agencies can't safely deploy AI-generated video in commercial campaigns because legal teams block tools like Runway, Kling, and Pika. Adobe only covers its own Firefly outputs. SI8 provides the Chain of Title documentation + Risk Assessment PDF that unlocks commercial deployment and satisfies E&O insurers.

Target customers: Production agencies, brand marketing teams, AI filmmakers, production houses — primarily in APAC/SEA (Singapore, Taiwan, Hong Kong) and London.

Secondary product: Showcase marketplace where verified films can be licensed to brands (20% SI8 commission on brokered deals).

Key angles relevant to SI8:
1. AI video copyright, indemnification, and commercial use rights
2. E&O insurance for AI-generated content (insurers adding AI exclusions = validates pain point)
3. Brand/agency AI content policies (brands blocking AI = validates pain point)
4. Regulations requiring AI content disclosure or labeling (EU AI Act, etc.)
5. Lawsuits involving generative AI video tools (Runway, Kling, Pika, Sora, Veo)
6. Training data lawsuits and implications for commercial use of AI outputs
7. Competitor activity: Adobe Firefly, FADEL, ClearStory, Rightsline, Getty Images
8. AI content being rejected by platforms, brands, insurers — direct validation of SI8's product
9. Any court ruling or regulatory guidance on who bears liability for AI video outputs (creator vs. tool vendor vs. brand)
10. Chain of title concepts applied to AI/generative media

Geographic focus: UK, EU, Singapore, Hong Kong, Taiwan, Australia — news from these markets is more relevant than US-only developments (though US developments matter for legal precedent).

NOT relevant: AI music/audio, AI image tools (Midjourney, DALL-E, Stable Diffusion), AI text tools (ChatGPT), political deepfakes (different regulatory framing), consumer/personal AI use.
"""
