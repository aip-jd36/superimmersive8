# Evidence Manifest Addendum — FGR-CHINA-AI-ASSISTED-COPYRIGHTABILITY-1 (2026-10-08)

Captured during the FGR-CHINA-AI-ASSISTED-COPYRIGHTABILITY-1 milestone, following the PM's own "primary-source refresh" instruction. This addendum does NOT supersede or re-verify `MANIFEST.md` (2026-09-30) — it adds two new, independently raw-captured Class A sources and records two WebFetch-only corroborating fetches at a lower, explicitly-flagged evidence tier, plus one inaccessible URL. See the FGR document itself (`governance-reviews/FGR_028_...md`) for analysis; this file is provenance only.

## New raw-captured sources (Class A)

| File | Provider/source | Source type | Canonical URL | Capture method | Capture date (UTC) | Evidence tier | SHA-256 |
|---|---|---|---|---|---|---|---|
| `spc-ipc-implementation-plan-2026-2030_20261008T052559Z.html` | Supreme People's Court Intellectual Property Court (最高人民法院知识产权法庭), official website | **Primary official policy/planning document** (SPC IP Court's own official publication of the *People's Courts IP Judicial Protection Implementation Plan (2026–2030)*, published 2026-04-20) | `https://ipc.court.gov.cn/zh-cn/news/view-5626.html` | Automated CLI fetch (curl, browser-like User-Agent), raw HTML preserved byte-for-byte, quoted text confirmed via direct `grep` against the raw file (not WebFetch paraphrase) | 2026-10-08T05:25:59Z | **Class A** | `3dc82a6f4502398ab6d7a004e0ab7e1d92b555431514573e75ff9df602fa1515` |
| `spc-ipc-tribunal-explainer-2026-09-09_20261008T052559Z.html` | Supreme People's Court Intellectual Property Tribunal (最高人民法院知识产权法庭), official website | **Primary legal/official authority** (the SPC IP Tribunal's own explanatory article on the September 2026 AI-disputes Opinion, published 2026-09-09) | `https://ipc.court.gov.cn/zh-cn/news/view-6039.html` | Automated CLI fetch (curl, browser-like User-Agent), raw HTML preserved byte-for-byte, quoted text confirmed via direct `grep` against the raw file (not WebFetch paraphrase) | 2026-10-08T05:25:59Z | **Class A** | `10d5887f2d3bc05240382f26e04d2ba74ea8e7ec2e170ed88de56d43f3f4ded7` |

### Load-bearing quotations (verified via direct `grep` against the raw captured bytes, not model summarization)

**Implementation Plan, §(九)** (`spc-ipc-implementation-plan-2026-2030_...html`):

> 综合考量自然人输入指令的具体内容、选定和修改的具体过程等因素，判断生成内容是否体现自然人独创性的选择和表达，依法准确认定人工智能生成内容的法律属性。坚持促进发展和规范管理相统筹，稳妥审理大模型训练语料使用及涉人工智能生成内容侵权等新类型案件。探索研究人工智能生成物权属认定等司法规则...

Gloss: "Comprehensively consider factors including the specific content of natural-person input instructions and the concrete process of selection and modification, to determine whether the generated content reflects the natural person's original creative choices and expression, and accurately determine the legal nature of AI-generated content in accordance with law... **Explore and study** judicial rules for determining the attribution of rights in AI-generated output..." — Note the Plan's own verb choice ("探索研究" / "explore and study") for the broader rights-attribution question: this is a forward-looking research mandate, not a statement that the rule already exists. The factors-test language is a methodology for courts to apply case-by-case, not a national holding that AI-assisted output IS copyrightable.

**IP Tribunal explainer, 2026-09-09** (`spc-ipc-tribunal-explainer-2026-09-09_...html`):

> 理论界和实务界对人工智能生成内容可版权性问题远未达成共识，全球范围内也尚无规定人工智能生成内容可版权性的先例，《意见》对此问题暂未作规定。

Gloss: "The theoretical and practical/professional communities are far from reaching consensus on the question of copyrightability of AI-generated content, and there is as yet no global precedent establishing rules on the copyrightability of AI-generated content; the Opinion therefore does not make provisions on this issue at this time." — This is a SEPARATE official SPC statement (2026-09-09, IP Tribunal's own explainer) from the one already captured in `MANIFEST.md` (2026-09-07, SPC news office's press-conference Q&A). Both independently confirm the same non-decision in different wording, from two different SPC offices — this is corroboration, not a single source repeated.

## WebFetch-only corroborating fetches (lower evidence tier — explicitly flagged)

These two were retrieved via the `WebFetch` tool (which processes content through a summarization model before returning it) rather than raw `curl`. Per this repository's own evidence-capture discipline, this tier is **not equivalent to Class A** — quoted passages below are the WebFetch tool's own rendering, not independently `grep`-verified against raw bytes, and are NOT durably preserved as files in this evidence-captures directory. They are recorded here as discovery-grade corroboration only, consistent with this FGR's own evidence-limitations disclosure (see FGR §L).

- `https://ipc.court.gov.cn/zh-cn/news/view-5662.html` — an academic commentary article (by Prof. Dong Huijuan, Xiamen University IP Research Institute), published in *Digital Rule of Law Magazine* (2026-04-24), discussing the Wuhan East Lake case's "limited control" (有限控制) reasoning — a secondary academic analysis of the case, not the court's own judgment text, and not the SPC's own statement (the SPC IP Court's site merely hosts/republishes it).
- `https://www.ccct.net.cn/html/bqzx/2026/0921/7014.html` — did not resolve (connection refused). Not captured. The equivalent Jiang'an case facts were independently corroborated instead via WebFetch against a different outlet, Hubei Daily (湖北日报), 2026-09-21 — consistent in all material facts with the already-captured People's Daily/Hubei-channel report in `MANIFEST.md` (same 47-episode drama, same three-phase production description, same "AI as tool" framing, same RMB 20,000 damages figure, same no-appeal/effective-judgment status). This is useful as a second-outlet corroboration of facts already Class-D-adjacent-captured, not new substantive information.

## Unresolved from this addendum

- `https://www.sdcourt.gov.cn/dyzy/372897/372899/37816091/index.html` (user-supplied as an "official Chinese court-system publication concerning the Wuhan East Lake case") — fetch failed (`connect ECONNREFUSED`). Not retried further, consistent with this SOP's one-bounded-attempt-then-stop precedent. No case-number/docket evidence for either Wuhan case was located through this addendum's efforts either — the gap already disclosed in `MANIFEST.md` remains open.
- No National Copyright Administration of China primary document was sought in this addendum; the gap already disclosed in `MANIFEST.md` remains open and is not re-investigated here.
