# Evidence Manifest — Taiwan Copyrightability of AI-Generated/AI-Assisted Output (TW-COPY-1)

Captured 2026-09-21 during the "SI8 Living Knowledge — Taiwan Copyrightability: Primary Evidence Capture Gate" milestone, following the "Taiwan Copyrightability — Primary-Source Governance Deep Dive" milestone the same week, which established `TIPO official letter 1140522c (2025-05-22)` as the strongest currently-available primary interpretive anchor but had only obtained an AI-paraphrased (WebFetch-summarized) extraction of it, not a raw verbatim capture. Per `EVIDENCE-CAPTURE-SOP.md` §12 — one file per source, checksums recorded here. Scope deliberately narrow: sufficient for exactly one candidate proposition (TW-COPY-1, Taiwan copyrightability / human-creative-contribution standard). No third-party-infringement/training-data candidate, no ownership-dispute candidate, and no draft-Guidelines material was captured as governed evidence — out of scope per this milestone's own boundary (evidence capture only, no reinterpretation, no broadening).

**Retrieval context:** Both sources returned HTTP 200 on the first automated attempt — no retrieval barrier (WAF challenge, JS-rendering wall, cookie wall) was encountered for either URL. Raw HTML was preserved byte-for-byte via direct `curl` fetch (browser-like User-Agent); substantive text was extracted directly from the raw markup for verification purposes only (see Fidelity notes) — no LLM summarization or paraphrase was used to produce or verify the manifest's quoted text; every quotation below was read directly from the saved raw HTML.

| File | Provider/source | Source type | Canonical URL | Capture method | Capture date (UTC) | Evidence tier | SHA-256 | Scope inspected | Completeness |
|---|---|---|---|---|---|---|---|---|---|
| `tipo-1140522c_20260921T031630Z.html` | Taiwan Intellectual Property Office (TIPO, 智慧財產局) — 著作權主題網解釋資料檢索 (Copyright Interpretation Retrieval System) | **Primary legal/official authority** (an official agency interpretive letter, published on TIPO's own site) | `https://www.tipo.gov.tw/tw/copyright/692-34252.html` | Automated CLI fetch (curl, browser-like User-Agent), raw HTML preserved byte-for-byte, no summarization at any point | 2026-09-21T03:16:30Z | **Class A** (independently retrieved primary evidence — raw HTML, no model processing) | `c69ece034aa6da5856598d3729c4c45fc7f2e8feebc8bfa6996fbb1f0d7317c6` | Full letter text: 令函案號 (letter number) 電子郵件1140522c; 令函日期 (letter date) 114-05-22 (2025-05-22); 發布日期 (publish date) 114-05-22; 更新日期 (update date) 114-07-02 (2025-07-02) — a real post-publication update to the page, date recorded, substance not independently diffed against an earlier version (none captured). Full four-paragraph substantive text (令函要旨) read and verified directly against the raw HTML, quoted below. Also embedded on the same page, under 相關法條 (Related Legal Provisions): the complete, current verbatim text of Copyright Act 第3條 (all 19 definitional items), 第10條, 第11條, 第12條 — reproduced by TIPO itself as the statutory basis for the letter. | Complete for the load-bearing question — the full interpretive letter and its own cited statutory provisions were both present in one single-page capture and read in full |
| `moj-copyright-act-J0070017_20260921T031630Z.html` | Ministry of Justice (法務部) — Laws & Regulations Database of the Republic of China (全國法規資料庫) | **Primary legal/official authority** (the canonical, current, government-published statute database) | `https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=J0070017` | Automated CLI fetch, same method | 2026-09-21T03:16:30Z | **Class A** | `1b7e5f5891aa069035e27055b4fa16077235e431f3da59a6de4464edea50be85` | Full Copyright Act (著作權法) text, all articles — captured as the independent, canonical cross-check against TIPO's own embedded statutory quotations, confirming Articles 3/10/11/12's exact current text via the primary statute database directly, not solely via a citing regulatory letter | Complete — the full Act, not merely the four relevant articles; only Articles 3/10/11/12 were relied upon for TW-COPY-1, consistent with this milestone's own bounded scope |

## Verbatim substantive text — TIPO letter 1140522c (令函要旨), read directly from the raw HTML capture

> 一、依我國著作權法第3條第1項第2款及第10條規定，著作人指創作著作之人，著作人於著作完成時享有著作權。換言之，著作必須係以自然人或法人為權利義務主體的情形下，由自然人所為的創作，方可能受到著作權的保護。故AI生成之圖畫是否享有著作權，應視創作過程中有無人類實際的創意投入而定，合先說明。
>
> 二、所詢利用ChatGPT輸入指令後生成的圖畫是否享有著作權，可能情形如下:
> (一)若只是把AI當作輔助工具(例如:繪圖軟體)來使用，而有人類實際的創意投入，則完成的創作成果仍可受著作權保護，該圖畫之著作權歸屬，除有著作權法第11條(僱傭關係)及第12條(出資聘用關係)之情形外，原則上由該實際創作之人(即投入實際創意的自然人)享有。
> (二)反之，若創作過程中完全是由AI的演算功能獨立進行完成，並無人類精神文明之投入，則該AI生成的圖畫無法享有著作權。
>
> 三、所詢將AI生成圖畫作為商業使用是否侵權一節，如AI生成圖畫與用於AI訓練資料中之原始著作有構成實質近似之情境，後續將該AI生成圖畫作為商業用途，可能會因該圖案與原始著作構成實質近似而有侵權之問題。為避免產生著作權糾紛，建議先向AI模型之開發或管理者釐清有無取得著作財產權人之授權及得否轉授權第三人商業利用，並應遵循生成式AI提供者所訂定之使用規範。
>
> 四、上述說明，可一併參考本局 電子郵件1111031 、 電子郵件1120317 之說明。由於著作權係屬私權，個案中利用AI生成之圖畫是否受著作權保護？是否侵害他人著作權？如有爭議，仍應由司法機關就個案具體事實調查證據認定之。

**Non-authoritative English rendering for SI8 working purposes only (Traditional Chinese text above controls):**

> 1. Per Copyright Act Article 3, Paragraph 1, Item 2, and Article 10, "author" means the person who creates a work, and the author enjoys copyright upon completion of the work. In other words, a work must be a creation by a natural person (in circumstances where a natural or juridical person is the subject of rights and obligations) to possibly receive copyright protection. Accordingly, whether an AI-generated image enjoys copyright depends on whether there was actual human creative input during the creative process.
>
> 2. Regarding whether an image generated by entering prompts into ChatGPT enjoys copyright, possible scenarios are as follows:
> (1) If AI is merely used as an auxiliary tool (e.g., drawing software) and there is actual human creative input, the completed creative result may still be protected by copyright. Ownership of that image's copyright, except where Copyright Act Article 11 (employment relationship) or Article 12 (commissioned relationship) applies, in principle belongs to the person who actually created it (the natural person who contributed the actual creativity).
> (2) Conversely, if the creative process is completed entirely and independently by AI's computational function, with no human intellectual/creative input, the AI-generated image cannot enjoy copyright.
>
> 3. Regarding whether commercial use of an AI-generated image constitutes infringement: if the AI-generated image and an original work used in the AI's training data are substantially similar, subsequent commercial use of the AI-generated image may raise infringement concerns due to that substantial similarity. To avoid copyright disputes, it is recommended to first clarify with the AI model's developer/operator whether authorization from the copyright economic-rights holder has been obtained, and whether sublicensing to third parties for commercial use is permitted, and to comply with the usage terms set by the generative-AI provider.
>
> 4. The foregoing may also be read together with this Office's letters 1111031 and 1120317. Because copyright is a private right, whether an AI-generated image in a specific case is protected by copyright, and whether it infringes another's copyright, if disputed, must still be determined by the judicial authorities based on the specific facts and evidence of that individual case.

## Evidence-consistency check against the prior deep dive (Task G)

All five governance inputs proposed by the prior deep-dive milestone are **directly and specifically confirmed** by the verbatim text above, with no contradiction or narrowing found:

1. *"AI-assisted output involving actual human creative input may be capable of copyright protection"* — confirmed verbatim by paragraph 2(1).
2. *"Output completed entirely through AI without human creative contribution does not receive copyright protection"* — confirmed verbatim by paragraph 2(2).
3. *"Ownership/authorship allocation is not reducible to the copyrightability proposition and may depend on Articles 11/12 and agreements"* — confirmed verbatim by paragraph 2(1)'s own "除有著作權法第11條...及第12條...之情形外" clause.
4. *"TIPO does not resolve concrete project disputes through this general interpretation"* — confirmed verbatim, and more explicitly than expected, by paragraph 4's express reservation to judicial determination on case-specific facts.
5. *"Third-party infringement/training-data issues remain separate from copyrightability"* — confirmed structurally: paragraph 3 is a separate, independently-numbered item addressing commercial-use/training-data infringement, distinct from paragraphs 1–2's copyrightability analysis.

**No STOP condition was triggered.** No prior conclusion required adjustment.

## Task E — statutory-source capture result

Copyright Act Articles 3, 10, 11, and 12 are present in **two independent official sources** in this capture set: (a) embedded verbatim within TIPO's own letter page (`tipo-1140522c...html`, under 相關法條), and (b) independently captured in full from the canonical government statute database (`moj-copyright-act-J0070017...html`). Both were read directly; the article text is identical between the two sources (TIPO's own reproduction matches the canonical database verbatim for all four articles). Per `EVIDENCE-CAPTURE-SOP.md`'s existing precedent (an official source's own embedded/cited statutory text may satisfy part of an evidence requirement without independent duplication being strictly mandatory), either source alone would arguably suffice — both were captured here for the strongest possible cross-validation, mirroring the two-way cross-validation discipline already used for the US Third-Party Copyright and Trademark captures.

## Task F — 2023 letter (經授智字第11252800520號) retrieval result

**Not retrieved.** One bounded search attempt (a targeted site-restricted search for the exact document number on `tipo.gov.tw`) did not surface a direct URL. No further retry was performed, consistent with this milestone's own instruction not to block on this source or expend excessive effort, given that `1140522c` already provides sufficient, directly-verified primary evidence for TW-COPY-1 on its own. Recorded honestly as not found — not reconstructed from secondary summaries. Note for a future session: the letter number series differs (經授智字 vs. 電子郵件 for `1140522c`/`1111031`/`1120317`) — these appear to be genuinely different TIPO document series/numbering conventions, not the same letter under two names; this was not investigated further, per this milestone's bounded scope.

## Refresh-readiness notes (Task H)

- Source identity, canonical URL, issuing authority, and document/reference number are all recorded above for both files.
- `tipo-1140522c...html` itself discloses a **publish date (114-05-22) distinct from a later update date (114-07-02)** — direct evidence that TIPO's own page can be revised post-publication; a future refresh pass re-fetching this same URL and comparing SHA-256 against `c69ece034aa6da5856598d3729c4c45fc7f2e8feebc8bfa6996fbb1f0d7317c6` would mechanically detect any further change, per the existing SOURCE CHANGED vs. GOVERNED PROPOSITION CHANGED distinction (`EVIDENCE-CAPTURE-SOP.md` §7) — no new field was added to represent this; the existing checksum mechanism is sufficient exactly as designed.
- `moj-copyright-act-J0070017...html` is the canonical, continuously-current statute database entry — a future refresh would re-fetch the same URL and diff against `1b7e5f5891aa069035e27055b4fa16077235e431f3da59a6de4464edea50be85`.
- No `source_changed`, `stale`, `refresh_due`, or `next_check` field was created — none is authorized or needed; the SOP's existing checksum-comparison mechanism is the complete mechanism, exactly as it already is for every other domain in this corpus.

## Relationship to prior SI8 research

No prior SI8 governed claim, FGR, or CPR exists for Taiwan copyrightability (confirmed by the preceding jurisdiction-first-discovery and governance-deep-dive milestones this same week) — this is the first evidence capture for this specific candidate. The existing US `copyrightability`/`copyright_ownership` claims (`CLAIM-COPY-001/002/003/004-v1`) are a structurally analogous, separately-governed jurisdiction's claims and are not evidence for, nor superseded by, this Taiwan capture.
