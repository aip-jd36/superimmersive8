# Research: AI Tool Terms of Service — IP Ownership & Commercial Use

**Status:** Complete (February 2026)
**Sources:** Runway Help Center, OpenAI Policies, Kling/Kuaishou, Google Cloud, Pika, Minimax

---

## Bottom Line for SI8

**Most paid-tier tools grant commercial use rights to creators.** However, several have complications that matter for distribution licensing — particularly exclusivity deals and training data licenses. Veo (consumer) is commercially prohibited. Kling complicates exclusivity. Hailuo just got sued for video generation specifically.

Always require filmmakers to disclose which tools they used — the answer materially affects what SI8 can license.

---

## Tool-by-Tool Summary

### Runway
- **IP ownership:** User owns output
- **Commercial use:** YES on Standard ($12-15/mo) and above. NO on free tier.
- **Key terms:** "Worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and distribute Outputs for any lawful purpose, including commercial purposes."
- **Training data:** Runway retains non-exclusive license to use content for service improvement
- **Risk level:** LOW — widely used, clear commercial terms, no active litigation
- **Sources:** [Runway Usage Rights](https://help.runwayml.com/hc/en-us/articles/18927776141715-Usage-rights)

---

### Sora (OpenAI)
- **IP ownership:** User owns output; OpenAI assigns all right, title, and interest to user
- **Commercial use:** YES on paid plans (Pro, Team, Enterprise). Includes film, advertising, social media, YouTube monetization.
- **Notable:** Disney partnership as of early 2026 — 200+ Disney/Marvel/Pixar/Star Wars characters available with licensed use. Other studios may follow.
- **Restrictions:** No unauthorized copyrighted characters (must be opted-in); no copying existing movies/shows/music videos; explicit permission required for real person's likeness (opt-in only)
- **Training data:** Opt-in IP policy means unauthorized IP not trainable — more controlled than most
- **Risk level:** MEDIUM — legal pushback from CAA/MPA (Oct 2025), lawsuits likely in 2026. But clearest IP assignment to user of any tool.
- **Sources:** [Sora Commercial License Guide](https://skywork.ai/blog/sora-2-commercial-license-guide/)

---

### Kling (Kuaishou)
- **IP ownership:** User owns copyright on paid plans
- **Commercial use:** YES on paid plans (Standard, Pro, Premier, Ultra). Advertising, marketing, commercial distribution permitted.
- **⚠️ Critical issue — training data:** Kling retains permanent, worldwide, royalty-free, **sublicensable** license to use outputs to train future AI models. This is the most aggressive training data clause of any tool reviewed.
- **Impact on exclusivity:** If Kling can sublicense your content for training, exclusive licensing deals may be compromised. Discuss with lawyer before using Kling-generated content in exclusive distribution agreements.
- **Risk level:** MEDIUM — no current litigation, but aggressive training data terms + strong market position = likely future target. Popular in Asia.
- **Sources:** [Kling Commercial Use Guide 2026](https://www.glbgpt.com/hub/can-i-use-kling-ai-for-commercial-use/)

---

### Veo (Google)
- **IP ownership:** User retains rights (subject to compliance)
- **Commercial use:**
  - **Consumer (Gemini Ultra, $249.99/mo): PROHIBITED** — Pre-GA status means commercial use requires explicit written permission from Google (not automatically granted)
  - **Enterprise (Vertex AI / Google Cloud): YES** — commercial use permitted for subscribed enterprise customers
- **Watermarking:** All outputs include SynthID digital watermark (mandatory)
- **Risk level:** LOW on enterprise, HIGH RISK on consumer (commercial use prohibited even on paid plans)
- **Watch:** Pre-GA status may change in 2026. Monitor Google Cloud docs.
- **Sources:** [Veo 3.1 Commercial Use Guide](https://www.glbgpt.com/hub/can-i-use-veo-3-1-for-commercial-use/)

---

### Pika
- **IP ownership:** User owns output
- **Commercial use:** YES on all plans including free (watermark restrictions on lower tiers)
- **Training data:** Pika retains non-exclusive license for service improvement (standard clause)
- **Risk level:** LOW — no active litigation, straightforward terms, permissive commercial use
- **Sources:** [Pika Pricing Guide 2025](https://www.eesel.ai/blog/pika-ai-pricing)

---

### Hailuo / Minimax
- **IP ownership:** User owns all IP on paid plans; Minimax does NOT claim ownership
- **Commercial use:** YES on paid plans. Marketing, advertising, commercial distribution permitted.
- **Training data:** Non-exclusive license for service improvement (standard clause)
- **⚠️ Critical issue — litigation:** Disney and Warner Bros. jointly sued Minimax/Hailuo specifically for video generation (November 2025). Active litigation — higher risk for commercially licensed content.
- **Risk level:** HIGH — active lawsuit from major studios targeting this tool specifically for video generation
- **Sources:** [Minimax Review 2026](https://www.allaboutai.com/ai-reviews/minimax-ai/)

---

## Master Risk Table

| Tool | Commercial Use | IP to User | Training Data Concern | Litigation Risk | Recommended for Distribution? |
|------|---------------|-----------|----------------------|-----------------|-------------------------------|
| **Adobe Firefly** | YES (paid) | YES | None — licensed training data | None | ✅ Safest overall |
| **Runway** | YES (paid) | YES | Standard improvement clause | None active | ✅ Recommended |
| **Pika** | YES (all plans) | YES | Standard improvement clause | None active | ✅ Recommended |
| **Sora** | YES (paid) | YES | Controlled opt-in policy | Pushback, suits likely | ⚠️ Monitor — best IP terms |
| **Kling** | YES (paid) | YES | ⚠️ Aggressive — sublicensable | None active | ⚠️ Avoid for exclusive deals |
| **Veo (consumer)** | ❌ PROHIBITED | YES | SynthID watermark | None active | ❌ Not usable commercially |
| **Veo (enterprise)** | YES | YES | SynthID watermark | None active | ✅ Enterprise only |
| **Hailuo/Minimax** | YES (paid) | YES | Standard improvement clause | ⚠️ Active (Disney/WB, Nov 2025) | ⚠️ High risk currently |
| **Midjourney** | YES (paid) | Contested | Training concerns | ⚠️ Active (Disney/Universal, WB) | ❌ Avoid for commercial work |
| **Stability AI** | YES | Contested | Training concerns | ⚠️ Active (Andersen class action) | ❌ Avoid for commercial work |

---

## SI8 Policy Recommendations

**Preferred tools for commercially licensed work:**
1. Adobe Firefly (safest — licensed training data, no litigation)
2. Runway (paid tier — clear commercial terms, widely used)
3. Pika (simplest terms, permissive commercial use)

**Proceed with caution:**
- Sora (paid) — best IP assignment, but legal pushback building
- Kling (paid) — popular in Asia, but aggressive training data clause complicates exclusivity

**Avoid for distribution/licensing:**
- Veo consumer — commercial use prohibited
- Hailuo — active Disney/WB lawsuit for video generation specifically
- Midjourney, Stability AI — active litigation from major studios

**For filmmaker disclosure in agreement:**
- Require disclosure of all AI tools used in production
- Require confirmation filmmaker was on a paid plan at time of production
- Flag Kling-generated content before entering exclusive licensing deals
- Reject content made primarily with Veo consumer (commercially prohibited)

---

## Sources

- [Runway Terms of Use](https://runwayml.com/terms-of-use)
- [Sora Commercial License — Skywork AI](https://skywork.ai/blog/sora-2-commercial-license-guide/)
- [Kling Commercial Use 2026](https://www.glbgpt.com/hub/can-i-use-kling-ai-for-commercial-use/)
- [Veo 3.1 Commercial Use 2026](https://www.glbgpt.com/hub/can-i-use-veo-3-1-for-commercial-use/)
- [AI Commercial Rights by Platform 2026](https://vidpros.com/ai-platforms-rights/)
- [Minimax/Hailuo Review 2026](https://www.allaboutai.com/ai-reviews/minimax-ai/)
