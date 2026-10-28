# Source Manifest — 116年度企業跨域研發補助 (Cross-Domain R&D Subsidy, ROC Year 116)

Created 2026-10-28. Lists every source behind `01_Business/research/TAIWAN-CROSSDOMAIN-RD-BRIEFING-2026-10-28.md`. The checksums are SHA-256 values computed 2026-10-28. Every repo copy is byte-identical to the file it was copied from: the checksums matched after copying.

## A. Briefing media (supplied by JD, 2026-10-28)

| # | Item | Repo location | Git status | Size | SHA-256 | Provenance / limitations |
|---|---|---|---|---|---|---|
| A1 | Original audio recording of the 2026-10-28 Taipei briefing (亮點案例交流分享暨116年度企業推廣說明會（臺北場）), attended online by JD | `03_Sales/transcripts/crossdomain-rd-briefing-taipei-102826.m4a` (copy of `C:\Users\User\Downloads\Taiwan Govt Subsidy.m4a`) | **Local only** — `*.m4a` is gitignored (`.gitignore` line 12), same convention as `Anchor Film_082126.m4a`. Not committed, not pushed, no LFS. | 68,880,306 bytes; duration 8,270.87 s (2:17:51, ffprobe) | `2658ad5132bee6ad12dffe342f884108337f089dd613170a5bd764746cfd8028` | Recorded by JD (his LINE message 2026-10-28 17:59: "我今天有錄說明會"). Recording method and device not documented. At the end of the session the organiser said the session would be converted to video and posted online (transcript [2:16:01]). Whether SI8 may redistribute the recording or its transcript was not assessed. The original in `Downloads` is untouched. If this machine's copy is lost, the recording is lost — there is no off-machine backup in the repo. **Not durably archived. UNRESOLVED ACTION (JD): make an off-machine backup and verify it against the SHA-256 above. Do not add the file to Git or LFS.** |
| A2 | Full Traditional Chinese automatic transcript (verbatim, unedited) | `03_Sales/transcripts/crossdomain-rd-briefing-taipei-102826-transcript-raw-zh.md` (copy of `C:\Users\User\Downloads\政府補助說明會_逐字稿_2026-10.md`) | Tracked (new) | 123,144 bytes; 279 lines | `76da77fcd0efe88d63f411aee9f8f90996936c5c818763247f3b88365152a56c` | The transcript's own header says it was made by local Whisper large-v3-turbo and not uploaded, and that 1:35–1:42 was re-transcribed. The header names the source as `~/Desktop/Taiwan Govt Subsidy.m4a`; that path no longer exists, and the audio was supplied from `Downloads`. The 2:17:51 duration in the header matches A1. Last timestamp [2:16:01]. **Known ASR errors**, some listed in its header: 飛行供應鏈 = 非紅供應鏈; 勞保清澈/清車 = 勞保清冊; 支撤會/製作會/知識會 = 資策會; 中氣署/中技術 = 中小及新創企業署; PayPal = 陪跑; 泵表 = BOM表 (inferred); 切解書 = 切結書 (inferred); 入資 = 陸資 (inferred; consistent with the official exclusion list). **The case-study speaker (中華徵信所, introduced as "Alex") is transcribed as "Alice" at [1:30:01] and [1:31:00]. That is NOT Alice Feng of Anchor Film.** The speaker names 穆懷/慕懷/木槐 (中衛中心) and 林肯宏/梗洪 (中華徵信所) are uncertain transcriptions. |

**Audio verification status: NOT PERFORMED.** No speech-recognition runtime is installed in this environment (no `whisper` or `faster_whisper` Python module; `ffmpeg` is present). No transcript passage has been checked against the audio by this task. Material Q&A points were instead checked against the official written documents in section B where possible. Points that only the transcript supports are marked BRIEFING PRESENTER STATEMENT, Q&A CLARIFICATION or UNVERIFIED in the briefing record.

## B. Official programme documents (retrieved 2026-10-28)

Retrieved from https://sbir.sme.gov.tw/cross/download through the WebFetch tool. Direct `curl` to the site returned 404 or "Request Rejected" (web application firewall), so files were saved from the WebFetch binary capture. Text was extracted locally with PyMuPDF 1.27.2. **Text extraction can garble tables and line order; the PDF is authoritative.**

| # | Document | Official URL path | Repo copy | SHA-256 (PDF) |
|---|---|---|---|---|
| B1 | 116年度深科技驅動中小企業跨域創新計畫 企業跨域研發補助 申請須知 — cover marked "115年10月14日核定版" (16 pp.) | `/download/home/116年度深科技驅動中小企業跨域創新計畫-申請須知WCenJV.pdf` | `116-application-guidelines-申請須知-2026-10-14.pdf` + `116-guidelines-extracted-text.txt` | `fcdc8915604332c510098699b6fb86fb3466552f1ba9fe9ca64964103fa20b78` |
| B2 | 企業跨域研發補助 申請常見問題（FAQ）, 116年度 (25 pp.) — states it summarises the 116 guidelines and defers to the official website on changes | `/download/home/企業跨域研發補助_FAQ7S4pI2.pdf` | `116-FAQ.pdf` + `116-faq-extracted-text.txt` | `754c6e11cf0416fa7ebbca78a1f485ba4fe88a9f8a03f3d03613888b53ac77e3` |
| B3 | 附件H：會計科目及編列原則 (9 pp.) | `/download/home/附件H：會計科目及編列原則XhWb2T.pdf` | `116-annex-H-accounting-principles-會計科目及編列原則.pdf` + `116-accounting-extracted-text.txt` | `48d6f4d829dd42564fcc7f6fccee66651c610719cb731237facfa83725db9975` |
| B4 | 116年度企業跨域徵案說明會簡報 (47 pp.) — the official slide deck for the briefings | `/download/home/116年度企業跨域徵案說明會簡報nquXLq.pdf` | **Extracted text only:** `116-slides-extracted-text.txt`. The 4.8 MB PDF was not added to Git; re-download from the URL. | `a14f0f18e496d5e216095ccce50d5af19df8e14589284afea299a0a5b0cde67f` |

Also consulted but not stored: https://sbir.sme.gov.tw/cross/info (program summary page) and https://sbir.sme.gov.tw/cross/notice. The notice index lists the 116 application-guidelines announcement dated 2026-10-14 (`notice_content?id=12468`), "115年度…通過補助19件計畫" (2026-02-09), "114年…通過補助20項計畫" (2025-02-18) and "113年…通過補助13項計畫" (2024-03-29).

Not retrieved: Annexes A–G and I–L (application form, proposal format, slides format, self-check, consent, consultant undertaking, **consortium agreement template (G)**, tax declarations, conflict-of-interest disclosure, **計畫切結書 incl. L-1/L-2 (L)**), and the contract/management manuals. They are listed at `/cross/download`.

## C. Related relationship sources (already in repo)

- `03_Sales/crm/raw/anchor-film/2026-10-19-line-alice-crossdomain-call-announced.txt` — the call announcement Alice forwarded.
- `03_Sales/crm/raw/anchor-film/2026-10-28-line-alice-briefing-followup-meeting-confirmed.txt` — the Oct 28 LINE exchange (new).
- Draft-stage slides from Sep 15–16: `03_Sales/crm/raw/anchor-film/2026-09-1*-crossdomain-grant-slide-*.jpg`.
