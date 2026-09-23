# Evidence Manifest — Taiwan Trademark Act, Article 68 Items 1–3 (Registered-Mark Infringement) (TW-TRADEMARK-1)

Captured 2026-09-23 during the "SI8 Living Knowledge — Taiwan Trademark: Primary Evidence Capture" milestone, following a prior pre-FGR governance resolution (not re-litigated here) that returned **GO — READY FOR EVIDENCE CAPTURE / FGR** for a Taiwan Trademark Living Knowledge candidate narrowly scoped to **Trademark Act Article 68 items 1–3**, with: registered-mark scope; Art. 5 trademark-use definition; Art. 35 supporting rights structure; Art. 36 statutory exceptions; zero project dependencies; explicit-goal-only; reuse of the existing `trademark` GoalCategory/KnowledgeTopic; a Taiwan `jurisdiction` request-scope gate; expected BI ceiling `directly_relevant`.

This milestone exists **only** to establish durable primary-source evidence and to close two remaining source-provenance gaps identified by that pre-FGR review: (1) a byte-level comparison of the pre-2022 vs. current Art. 68 chapeau wording (a prior secondary/AI-paraphrased source suggested a possible difference, never independently raw-verified), and (2) raw capture of the Executive Yuan order establishing the May 1, 2024 effective date for the *separate* May 24, 2023 Trademark Act amendment, to confirm Art. 68 is not among the articles that order touches. Per `EVIDENCE-CAPTURE-SOP.md` §12 — one file per source, checksums recorded here. Scope deliberately narrow: sufficient for exactly one candidate proposition (TW-TRADEMARK-1). No case-law survey, no confusion-examination-criteria doctrine, no well-known-mark (Art. 70) merger, no Fair Trade Act material — out of scope per this milestone's own boundary (evidence capture only, no reinterpretation, no broadening, no FGR).

**Retrieval context:** All three sources returned HTTP 200 on automated retrieval — no retrieval barrier (WAF challenge, JS-rendering wall, cookie wall) was encountered for any URL. Raw HTML was preserved byte-for-byte via direct `curl` fetch (browser-like User-Agent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36`); substantive text was extracted directly from the raw markup for verification purposes only — no LLM summarization or paraphrase was used to produce or verify this manifest's quoted Traditional Chinese text; every quotation below was read directly from the saved raw HTML. Each of the three files was independently re-fetched a second time (~29 minutes after the first fetch) and diffed byte-for-byte against the first fetch; the only differences found across all three files were per-request Content-Security-Policy `nonce` attribute values (random per HTTP response, not substantive content) — the second, header-documented fetch of each file is the one preserved and manifested below, giving each file both a confirmed-stable content body and a precisely recorded retrieval timestamp from its own response headers.

| File | Provider/source | Source type | Canonical URL | Capture method | Capture date (UTC) | Evidence tier | SHA-256 | Scope inspected | Completeness |
|---|---|---|---|---|---|---|---|---|---|
| `moj-trademark-act-current_20260923T073620Z_fc7518e5.html` | Ministry of Justice (法務部) — Laws & Regulations Database of the Republic of China (全國法規資料庫) | **Primary legal/official authority** (the canonical, current, government-published statute database) | `https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=J0070001` | Automated CLI fetch (curl, browser-like User-Agent), raw HTML preserved byte-for-byte, no summarization at any point | 2026-09-23T07:36:20Z | **Class A** (independently retrieved primary evidence — raw HTML, no model processing) | `fc7518e5e95063281b9b19d41f2b6b58ab48ee273ff9782625f1a7cb6be113c4` | Full Trademark Act (商標法) text, all articles. Relied upon for TW-TRADEMARK-1: Art. 2, Art. 5, Art. 35, Art. 36, Art. 68 (**currently promulgated, NOT yet effective** — see Finding G/J below), Art. 70 (boundary only). Also contains the page's own official "生效狀態" (effective-status) banner. | Complete — the full Act, not merely the relevant articles |
| `moj-trademark-act-oldlaw-arts68-70-95-97_20260923T073622Z_57f094ba.html` | Ministry of Justice (法務部) — Laws & Regulations Database, "舊法規內容" (old-law content) view, reached via the current page's own official `連結舊法規內容` link | **Primary legal/official authority** (the same canonical statute database's own historical-version display, generated specifically because the 2022 amendment to Arts. 68/70/95–97 is promulgated but not yet in force) | `https://law.moj.gov.tw/LawClass/LawOldVer.aspx?pcode=J0070001` | Automated CLI fetch, same method | 2026-09-23T07:36:22Z | **Class A** | `57f094bac633ad743bdbc1e42718479356ef2659fbd3ef82e5a0d641bc6a529d` | Full pre-2022-amendment (i.e. **currently effective**) text of Arts. 68, 69, 70, and 95–97 — the actually-operative law today, since the 2022 amendment to these same articles has not commenced. Relied upon for TW-TRADEMARK-1's byte-level chapeau comparison (Finding H/I below). | Complete for the load-bearing question — full old-law text of Art. 68 (and neighboring Arts. 69/70) present and read in full |
| `moj-trademark-act-history_20260923T073623Z_efe93aab.html` | Ministry of Justice (法務部) — Laws & Regulations Database, "沿革" (legislative history) view | **Primary legal/official authority** (the same canonical statute database's own amendment-history record, listing every promulgation order verbatim by number and date) | `https://law.moj.gov.tw/LawClass/LawHistory.aspx?pcode=J0070001` | Automated CLI fetch, same method | 2026-09-23T07:36:23Z | **Class A** | `efe93aab462ce9497f2c373044a46d202360a6f30871afb2d3949cea43ad50a7` | Full 17-entry amendment history of the Trademark Act from 1930 (民國19年) to 2023 (民國112年), including the exact presidential promulgation order number/date and (where applicable) the exact Executive Yuan effective-date order number/date, for every amendment. Relied upon for Finding J (2022 amendment status) and Finding K (May 2024 Executive Yuan order). | Complete — full history table read in full; entries 16 and 17 (the two load-bearing entries) quoted verbatim below |

## Verbatim text — load-bearing articles, read directly from the raw HTML captures

All Traditional Chinese text below is quoted verbatim from the raw HTML files listed above. English renderings are **non-authoritative, for SI8 working purposes only** — the Traditional Chinese text controls.

### Art. 2 (registration-based acquisition) — `moj-trademark-act-current...html`

> 欲取得商標權、證明標章權、團體標章權或團體商標權者，應依本法申請註冊。

*("A person who wishes to acquire trademark rights, certification mark rights, collective membership mark rights, or collective trademark rights shall apply for registration pursuant to this Act.")*

### Art. 5 (statutory definition of trademark use) — `moj-trademark-act-current...html`

> 商標之使用，指為行銷之目的，而有下列情形之一，並足以使相關消費者認識其為商標：
> 一、將商標用於商品或其包裝容器。
> 二、持有、陳列、販賣、輸出或輸入前款之商品。
> 三、將商標用於與提供服務有關之物品。
> 四、將商標用於與商品或服務有關之商業文書或廣告。
> 前項各款情形，以數位影音、電子媒體、網路或其他媒介物方式為之者，亦同。

*("Use of a trademark means, for a marketing purpose ('為行銷之目的'), any of the following, sufficient to allow relevant consumers to recognize it as a trademark: (1) affixing the mark to goods or their packaging/containers; (2) possessing, displaying, selling, exporting or importing goods under item 1; (3) using the mark on articles related to the provision of services; (4) using the mark on commercial documents or advertisements related to goods or services. The foregoing applies equally when done via digital audiovisual, electronic media, the internet, or other media.")*

### Art. 35 (rights conferred by registration — structure mirrored by Art. 68 items 1–3) — `moj-trademark-act-current...html`

> 商標權人於經註冊指定之商品或服務，取得商標權。
> 除本法第三十六條另有規定外，下列情形，應經商標權人之同意：
> 一、於同一商品或服務，使用相同於註冊商標之商標者。
> 二、於類似之商品或服務，使用相同於註冊商標之商標，有致相關消費者混淆誤認之虞者。
> 三、於同一或類似之商品或服務，使用近似於註冊商標之商標，有致相關消費者混淆誤認之虞者。
> 商標經註冊者，得標明註冊商標或國際通用註冊符號。

*("A trademark owner acquires trademark rights for the goods/services designated in the registration. Except as otherwise provided in Article 36, the trademark owner's consent is required for: (1) use of a mark identical to the registered mark on identical goods/services; (2) use of a mark identical to the registered mark on similar goods/services, where there is a likelihood of consumer confusion; (3) use of a mark similar to the registered mark on identical or similar goods/services, where there is a likelihood of consumer confusion. A registrant may mark the registration or the internationally recognized registration symbol.")*

**Confirmed structural correspondence:** Art. 35's items 1–3 (the affirmative consent-requiring acts) are **word-for-word identical** to Art. 68's items 1–3 (the infringement-defining acts, i.e. the same three acts done *without* consent) in both the current-promulgated and the old-law texts. This directly confirms the pre-FGR review's premise that Art. 35 supplies the "supporting rights structure" for Art. 68 items 1–3.

### Art. 36 (statutory exceptions) — `moj-trademark-act-current...html`

> 下列情形，不受他人商標權之效力所拘束：
> 一、以符合商業交易習慣之誠實信用方法，表示自己之姓名、名稱，或其商品或服務之名稱、形狀、品質、性質、特性、用途、產地或其他有關商品或服務本身之說明，非作為商標使用者。
> 二、以符合商業交易習慣之誠實信用方法，表示商品或服務之使用目的，而有使用他人之商標用以指示該他人之商品或服務之必要者。但其使用結果有致相關消費者混淆誤認之虞者，不適用之。
> 三、為發揮商品或服務功能所必要者。
> 四、在他人商標註冊申請日前，善意使用相同或近似之商標於同一或類似之商品或服務者。但以原使用之範圍為限；商標權人並得要求其附加適當之區別標示。
> 附有註冊商標之商品，係由商標權人或經其同意之人於國內外市場上交易流通者，商標權人不得就該商品主張商標權。但為防止商品流通於市場後，發生變質、受損或經他人擅自加工、改造，或有其他正當事由者，不在此限。

*(Nominative/descriptive fair use in good faith; necessary indication of purpose (referential fair use), subject to a confusion carve-back; functional necessity; prior good-faith use grandfathering; and the exhaustion/first-sale doctrine, subject to a material-alteration carve-back.)*

### Art. 68 — CURRENT PROMULGATED TEXT (NOT YET EFFECTIVE — see Finding G/J) — `moj-trademark-act-current...html`

> 未得商標權人同意，有下列情形之一，為侵害商標權：
> 一、於同一商品或服務，使用相同於註冊商標之商標者。
> 二、於類似之商品或服務，使用相同於註冊商標之商標，有致相關消費者混淆誤認之虞者。
> 三、於同一或類似之商品或服務，使用近似於註冊商標之商標，有致相關消費者混淆誤認之虞者。
> 為供自己或他人用於與註冊商標同一或類似之商品或服務，未得商標權人同意，為行銷目的而製造、販賣、持有、陳列、輸出或輸入附有相同或近似於註冊商標之標籤、吊牌、包裝容器或與服務有關之物品者，亦為侵害商標權。

*("Without the trademark owner's consent ('未得商標權人同意'), any of the following constitutes infringement of trademark rights: (1)-(3) [identical to Art. 35 items 1-3, as consent-lacking infringing acts]. Manufacturing, selling, possessing, displaying, exporting or importing, for one's own or another's use in connection with goods/services identical or similar to those of the registered mark, without the trademark owner's consent, for a marketing purpose ('為行銷目的'), labels, tags, packaging/containers, or service-related articles bearing marks identical or similar to a registered trademark, for oneself or another's use in connection with goods or services identical or similar to the registered mark, also constitutes trademark infringement.")*

### Art. 68 — OLD-LAW TEXT, CURRENTLY EFFECTIVE (pre-2022 amendment) — `moj-trademark-act-oldlaw...html`

> 未經商標權人同意，為行銷目的而有下列情形之一，為侵害商標權：
> 一、於同一商品或服務，使用相同於註冊商標之商標者。
> 二、於類似之商品或服務，使用相同於註冊商標之商標，有致相關消費者混淆誤認之虞者。
> 三、於同一或類似之商品或服務，使用近似於註冊商標之商標，有致相關消費者混淆誤認之虞者。

*("Without the trademark owner's consent ('未經商標權人同意'), for a marketing purpose ('為行銷目的而'), any of the following constitutes infringement of trademark rights: (1)-(3) [identical enumerated acts].")* This is the version **currently in force** — see Finding F/G/J.

### Art. 70 — current text, boundary confirmation only — `moj-trademark-act-current...html`

> 未得商標權人同意，有下列情形之一，視為侵害商標權：
> 一、明知為他人著名之註冊商標，而使用相同或近似之商標，有致減損該商標之識別性或信譽之虞者。
> 二、明知為他人著名之註冊商標，而以該著名商標中之文字作為自己公司、商號、團體、網域或其他表彰營業主體之名稱，有致相關消費者混淆誤認之虞或減損該商標之識別性或信譽之虞者。

*(Deemed infringement for dilution of a **famous/well-known** registered mark, expressly conditioned on the actor's actual knowledge — "明知" — of the mark's fame; a materially different scienter element and a materially different subject matter (fame/dilution, not ordinary confusion) from Art. 68 items 1-3, which carry no knowledge requirement and apply to any registered mark, famous or not.)* Confirmed as a separate regime; not merged into TW-TRADEMARK-1's proposition, consistent with the pre-FGR scope.

## Finding G — current promulgated Art. 68 text

Confirmed above. The `moj-trademark-act-current...html` page shows the **latest promulgated** text of Art. 68, which includes the 2022-05-04 amendment's wording (chapeau change + new second paragraph on labels/tags/packaging). This is the text that will eventually control **once it takes effect** — see Finding J for why it has not yet done so.

## Finding F — current effective Art. 68 text

Because the 2022-05-04 amendment to Arts. 68/70/95–97 has **not yet commenced** (Finding J), the text **actually in force today** is the **old-law** version captured in `moj-trademark-act-oldlaw...html` — i.e. the chapeau reading "未經商標權人同意，為行銷目的而有下列情形之一" and **without** the labels/tags/packaging second paragraph. This distinction (currently-effective old-law text vs. currently-promulgated-but-not-yet-effective new text) is the central fact this manifest exists to record precisely and unambiguously — see the "Effective vs. Promulgated" callout below.

## Finding H — historical/chapeau byte-level comparison

**Achieved.** Direct byte-level text comparison between the two captured raw-HTML sources:

| | Old law (currently effective) | Current promulgated (2022 amendment, not yet effective) |
|---|---|---|
| Chapeau | 未經商標權人同意，**為行銷目的而**有下列情形之一，為侵害商標權： | 未得商標權人同意，有下列情形之一，為侵害商標權： |
| Items 1–3 | Byte-identical to the promulgated version (see Finding I) | Byte-identical to the old-law version |
| Second paragraph (labels/tags/packaging) | **Absent entirely** | **Newly added** — its own internal "為行銷目的而" qualifier appears here instead |

**The chapeau difference is real, confirmed by primary evidence, and consists of two changes:** (1) a non-substantive synonym swap, "未經...同意" → "未得...同意" (both mean "without the ... owner's consent"; no substantive difference); and (2) the **removal of the "為行銷目的而" (for a marketing purpose) qualifier from the chapeau governing items 1–3**, with that same phrase relocated to qualify only the newly added labels/tags/packaging paragraph. This resolves the open provenance question the pre-FGR review flagged — the "possible difference" a prior secondary/AI-paraphrased source suggested is now independently, byte-level confirmed to be real, and its exact scope is now precisely known (a chapeau-qualifier relocation plus a genuinely new second paragraph — not a change to items 1–3's own wording).

## Finding I — Art. 68 items 1–3 stability

**Items 1–3 themselves did not change.** The three enumerated infringing acts are byte-identical, character-for-character, between the old-law (currently effective) and current-promulgated (not yet effective) texts:
一、於同一商品或服務，使用相同於註冊商標之商標者。
二、於類似之商品或服務，使用相同於註冊商標之商標，有致相關消費者混淆誤認之虞者。
三、於同一或類似之商品或服務，使用近似於註冊商標之商標，有致相關消費者混淆誤認之虞者。

This is the operative substance of TW-TRADEMARK-1's candidate proposition. The chapeau's "為行銷目的" qualifier is present in the text currently in force (old law) and is fully consistent with, and directly reinforced by, Art. 5's own "為行銷之目的" trademark-use definition — the pre-FGR review's anchoring of the candidate in Art. 5 is corroborated, not undermined, by this finding: under the law actually in force today, marketing-purpose use of an identical/similar mark on identical/similar goods, causing (for items 2–3) a likelihood of confusion, is what items 1–3 govern — exactly the Art. 5-anchored framing the pre-FGR review adopted.

## Finding J — 2022 amendment status (re-verified fresh, not assumed)

**Re-confirmed fresh from current primary sources, not merely cited from the prior finding.** `moj-trademark-act-current...html` (the live, current-as-of-2026-09-23 statute page) displays, in its own official "生效狀態" (effective-status) banner:

> ※本法規部分或全部條文尚未生效，最後生效日期：未定
> [連結舊法規內容]
> 一百十一年五月四日修正之第 68、70、95～97 條條文，施行日期由行政院定之。

*("Some or all provisions of this Act have not yet taken effect; final effective date: undetermined. [Link: old law content] The provisions of Articles 68, 70, and 95–97 as amended on the 4th day of the 5th month of the 111th year of the Republic of China [2022-05-04] — their effective date is to be determined by the Executive Yuan.")*

Independently corroborated by `moj-trademark-act-history...html`, amendment entry 16:

> 16. 中華民國一百十一年五月四日總統華總一經字第 11100037481 號令修正公布第 68、70、95～97 條條文；施行日期，由行政院定之

*("Republic of China 2022-05-04, Presidential Order No. 華總一經字第11100037481號, amending and promulgating Arts. 68, 70, 95–97; effective date to be determined by the Executive Yuan.")* — **No subsequent Executive Yuan effective-date order is recorded for this entry** (contrast with entry 17, Finding K below, which does have one) — confirming, from two independent sections of the same primary source, that this amendment remains **not in force** as of this capture.

**The pre-FGR finding that this amendment remains NOT in force is confirmed fresh, from current live primary sources, not merely re-cited.**

## Finding K — May 2024 Executive Yuan order (separate 2023 amendment)

`moj-trademark-act-history...html`, amendment entry 17 (the most recent entry, matching the page's own "修正日期：民國112年05月24日"):

> 17. 中華民國一百十二年五月二十四日總統華總一經字第 11200043251 號令修正公布第 6、12、13、19、30、36、75、94、99、104、106、107 條條文；增訂第 98-1、109-1 條條文；施行日期，由行政院定之
> 中華民國一百十三年三月二十九日行政院院臺經字第 1131006860 號令發布定自一百十三年五月一日施行

*("Republic of China 2023-05-24, Presidential Order No. 華總一經字第11200043251號, amending and promulgating Arts. 6, 12, 13, 19, 30, 36, 75, 94, 99, 104, 106, 107; adding Arts. 98-1, 109-1; effective date to be determined by the Executive Yuan. Republic of China 2024-03-29, Executive Yuan Order No. 院臺經字第1131006860號, issued, fixing the effective date as 2024-05-01.")*

**This independently confirms, byte-for-byte, the citation given in this milestone's own brief** (Executive Yuan Order 院臺經字第1131006860號, dated 2024-03-29, effective 2024-05-01) — issuing authority: Executive Yuan (行政院); order number: 院臺經字第1131006860號; date: 2024-03-29; applies to: the 2023-05-24 amendment (Arts. 6, 12, 13, 19, 30, 36 [note: Art. 36's *procedural/administrative* provisions elsewhere in that amendment list — not the Art. 36 exceptions text quoted above, which is unchanged; this milestone did not further investigate which specific paragraph of Art. 36 the 2023 amendment touched, as it is outside TW-TRADEMARK-1's scope and does not affect the captured current Art. 36 exceptions text quoted above], 75, 94, 99, 104, 106, 107, plus new Arts. 98-1, 109-1); effective date: 2024-05-01.

**Art. 68 is confirmed, directly from this same primary-source entry, to be outside the 2023 amendment's article list** — entry 17 does not mention Art. 68 anywhere. The May 2024 effective date belongs exclusively to the 2023 amendment's own article list; it has no bearing on the separate, still-not-in-force 2022 amendment to Art. 68 (entry 16, Finding J). One bounded independent-corroboration attempt was made against the national gazette site (`gazette.nat.gov.tw`) for the order number `1131006860`; it returned HTTP 404 on the first attempt and was not retried further (consistent with this SOP's existing precedent of one bounded attempt before relying on the strongest available primary evidence — see `EVIDENCE-CAPTURE-SOP.md`'s domain-onboarding discipline and the TW-COPY-1 manifest's own Task F precedent for the same one-attempt-then-stop pattern). This does not weaken the finding: MOJ's own official statute-history database directly quoting the order number, date, and effective date verbatim is itself Class A primary legal/official authority — the same tier already relied upon throughout this corpus for MOJ-sourced material (see TW-COPY-1 MANIFEST.md, both entries).

## Finding L — Art. 70 boundary confirmation

Confirmed above (see verbatim Art. 70 text). Art. 70 remains a **structurally distinct regime** from Art. 68 items 1–3: it protects only **famous/well-known** registered marks against **dilution** (identifier-blurring/tarnishment, not ordinary confusion), and requires the actor's **actual knowledge** ("明知") of the mark's fame — an element wholly absent from Art. 68 items 1–3. No further Art. 70 doctrine (its own 2022 amendment content, its historical old-law text beyond what appears incidentally in the same capture, well-known-mark examination criteria, or any other Art. 70-adjacent doctrine) was investigated, consistent with this milestone's explicit boundary.

## Effective vs. Promulgated — explicit disambiguation (for refresh-safety)

**For Art. 68 specifically, as of this capture (2026-09-23):**
- **CURRENTLY EFFECTIVE (the law actually in force today):** the **old-law** text in `moj-trademark-act-oldlaw-arts68-70-95-97_20260923T073622Z_57f094ba.html` — chapeau "未經商標權人同意，為行銷目的而有下列情形之一，為侵害商標權", items 1–3, **no** labels/tags/packaging paragraph.
- **CURRENTLY PROMULGATED BUT NOT YET EFFECTIVE:** the text in `moj-trademark-act-current_20260923T073620Z_fc7518e5.html` — chapeau "未得商標權人同意，有下列情形之一，為侵害商標權", items 1–3 (identical wording to the effective version), **plus** a new labels/tags/packaging second paragraph. This text will become law only once the Executive Yuan issues an effective-date order for the 2022-05-04 amendment — which, as of this capture, it has not done.
- **Art. 2, Art. 5, Art. 35, and Art. 36** are unaffected by this pending/not-yet-effective distinction — the text captured in `moj-trademark-act-current...html` for these four articles is both currently promulgated **and** currently effective (no pending amendment applies to them per this capture).
- **Art. 70** IS also subject to a pending 2022 amendment (entry 16 covers Arts. 68, 70, 95–97 together) — the current-promulgated Art. 70 text quoted above is therefore **also not yet effective**; its own currently-effective (old-law) text is present in the same `moj-trademark-act-oldlaw...html` capture but was not extracted/compared in this manifest beyond what is quoted in this document's own working notes, consistent with the Art. 70 boundary-only scope (Finding L). A future session extending into Art. 70 substantively must re-derive its own effective-vs-promulgated distinction from this same captured file; it should not assume the current-promulgated Art. 70 text quoted above is in force.

A future automated or human refresh pass should treat these three files, together, as the disambiguation source: `moj-trademark-act-current...html`'s own banner text is the authoritative signal for whether *any* article's promulgated text has entered into force, and `moj-trademark-act-history...html` is the authoritative signal for exactly which promulgation/effective-date orders apply to which articles.

## Refresh-readiness (per Finding O)

- Source identity, canonical URL, issuing authority are recorded above for all three files.
- A future refresh should re-fetch all three URLs and compare SHA-256 against the values recorded here. A change in `moj-trademark-act-current...html`'s hash could reflect either (a) a cosmetic/non-substantive change (as observed twice in this very capture session, where only the CSP nonce differed across two fetches 29 minutes apart) or (b) an actual new amendment/effective-date change — a future pass must re-diff the substantive legal text, not treat a hash mismatch alone as a proposition-level change (mirrors `EVIDENCE-CAPTURE-SOP.md` §7's SOURCE CHANGED vs. GOVERNED PROPOSITION CHANGED distinction).
- Specifically for the 2022 amendment (Finding J): a future refresh should re-check `moj-trademark-act-current...html`'s own "生效狀態" banner. If that banner no longer names Arts. 68/70/95–97 as pending, or disappears entirely, this signals the amendment has finally taken effect — at which point the **new, currently-promulgated** Art. 68 text (already captured here) becomes the currently-effective text, and any governed proposition anchored to the old-law chapeau wording would need re-evaluation (a genuine GOVERNED PROPOSITION CHANGED event, not merely a SOURCE CHANGED one).
- No `source_changed`, `stale`, `refresh_due`, or `next_check` field was created — none is authorized or needed; the existing checksum-comparison mechanism, plus this manifest's own explicit prose disambiguation, is the complete mechanism, matching TW-COPY-1's own precedent.

## Contradictions with the pre-FGR report

**None.** Every load-bearing pre-FGR finding is confirmed, not contradicted:
- Art. 68 items 1–3 (the substantive infringement-defining acts) are unchanged — confirmed byte-identical (Finding I).
- The 2022 amendment remains not in force — re-confirmed fresh from live primary sources (Finding J).
- The May 2024 Executive Yuan order applies to the separate 2023 amendment, not to Art. 68 — confirmed (Finding K).
- Art. 5's trademark-use definition ("為行銷之目的") is directly corroborated by, and consistent with, the currently-effective Art. 68 chapeau's own "為行銷目的而" qualifier (Finding I).
- Art. 35's items 1–3 supply the affirmative-rights structure mirrored by Art. 68's items 1–3 — confirmed word-for-word identical (see Art. 35 quotation above).

The chapeau difference (Finding H) is **not** a contradiction of any pre-FGR finding — it is the precise, primary-evidence-based resolution of an open provenance question the pre-FGR review itself flagged as unresolved ("a prior secondary/AI-paraphrased source suggested a possible difference — never independently raw-verified"). The pre-FGR review did not assert the chapeau was unchanged; it flagged the question as open. This capture closes it: yes, a real chapeau difference exists, its exact scope is now known precisely, and it does not touch items 1–3's own substantive wording.

## Remaining evidence limitations

- The Executive Yuan order 院臺經字第1131006860號 was corroborated via MOJ's own official statute-history database (Class A primary legal/official authority) quoting the order number, date, and effective date verbatim, but was not independently retrieved as a standalone Executive Yuan gazette document — one bounded attempt against `gazette.nat.gov.tw` returned HTTP 404 and was not retried further, per this SOP's established one-bounded-attempt precedent (see Finding K).
- Art. 70's own currently-effective (old-law) text was captured in the same file as Art. 68's, but was not separately extracted, quoted, or compared against its current-promulgated text in this manifest — Art. 70 was deliberately treated as boundary-confirmation-only, per this milestone's explicit scope (Finding L).
- Which specific paragraph(s) of Art. 36 the 2023 amendment (entry 17) actually modified was not investigated — Art. 36's current text is captured and quoted in full above and is unaffected by the not-yet-effective status (it is not one of Arts. 68/70/95–97), but this manifest does not assert Art. 36 was untouched by *any* historical amendment, only that its currently-promulgated text (quoted above) is also its currently-effective text.
- No English-language official translation of any captured provision was sought or relied upon; all English renderings in this manifest are SI8 working glosses only, explicitly marked non-authoritative.

## Relationship to prior SI8 research

No prior SI8 governed claim, FGR, or CPR exists for Taiwan trademark infringement under Art. 68 (confirmed by this milestone's own instructions, which describe the pre-FGR resolution as the first governance step for this candidate). The existing `CLAIM-TRADEMARK-US-LANHAM-CONFUSION-001-v1` claim (FGR_021/CPR_027) is a structurally analogous, separately-governed jurisdiction's claim (U.S. Lanham Act confusion-based infringement) and is not evidence for, nor superseded by, this Taiwan capture.
