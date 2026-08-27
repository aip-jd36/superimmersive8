# Artlist Evidence Capture — Provenance Manifest

**Status:** ACTIVE — durable evidence record, not itself governed knowledge.
**Added:** 2026-08-27, Artlist primary-evidence ingestion milestone.
**Capture method:** human/manual, browser Print→PDF (same method as the existing Kling precedent referenced in `PLATFORM-RIGHTS-MATRIX.md`/`MATRIX-LEARNINGS.md`).
**Why this location, not `lk-automation/`:** `lk-automation/archive/` is explicitly scoped (see its own `README.md`) to automated output of `tools/lk-source-monitor/monitor.py`, currently configured for exactly two Copyright Office sources. It is not a general evidence store, and adding unrelated content there would corrupt that tool's own `state.json` hash-tracking assumptions. This directory mirrors its naming/immutability *pattern* (`<source-id>_<timestamp>_<hash-prefix>.<ext>`) for the human-capture case that pattern doesn't yet cover — see `EVIDENCE-CAPTURE-SOP.md` §12 for the generalized convention this instance follows.

---

## Source 1 — Artlist formal License page

| Field | Value |
|---|---|
| Provider | Artlist |
| Source title | "Artlist License: Get to Know Artlist's License Model" |
| Source type | First-party provider license (formal/controlling document) |
| Official URL | `https://artlist.io/help-center/privacy-terms/artlist-license/` (captured via a link carrying `?utm_source=chatgpt.com`, visible in the page footer of every captured page — noted for transparency, not evidence of anything substantive) |
| Capture method | Human/manual, browser Print→PDF |
| Capture date | 2026-08-27, 13:45:09 +08:00 (from PDF `/CreationDate` metadata: `D:20260827134509+08'00'`, `Producer: Microsoft: Print To PDF`) |
| Effective/update date (as stated on the source itself) | **February 15, 2026** — visible verbatim on the document's final page |
| Durable repo path | `06_Operations/institutional-knowledge/notebook/evidence-captures/artlist/artlist-formal-license_20260827T134509+0800_a18f3aa6.pdf` |
| SHA-256 | `a18f3aa69e64557fe599d6900578e87f89861c8ddbaaa85c4333147bb9ef426b` |
| Page count | 15 |
| Extractability | **No embedded text layer** — confirmed via two independent extraction attempts (`pypdf` and PyMuPDF/`fitz`, both returned 0 usable characters). This is a pure-image Print-to-PDF render. All content in this manifest was read via direct visual inspection of each rendered page, not automated text extraction. Sections span two columns per page; the right column is cut off at the page edge on most pages (a real capture/formatting limitation, not a content gap — the visible portion was sufficient to confirm every proposition below). |
| Evidence tier | Official platform authority — human-captured (Class B per `EVIDENCE-CAPTURE-SOP.md` §4), full-document visual read (not summary-only) |
| Completeness | Substantially complete — 15 of 15 pages rendered and available; 11 of 15 pages directly visually inspected this session (pp. 1-7, 10, 13-15), covering every section referenced in the candidate propositions below. Pages 8-9, 11-12 were rendered but not individually inspected in this pass (no candidate proposition depends on them; flagged, not silently assumed empty). |

**Sections directly confirmed by visual inspection:** license-type overview (Social vs. Pro/Business comparison table, incl. "Broadcast... permitted under the Pro/Business License... see section 11"); coverage list (platforms/formats); AI Output vs. Assets distinction; §1 "We cover everything"; §2 "Your Projects are yours to use Forever" (post-cancellation continuity + new-project restriction); §3 "Your clients are covered" (license remains with subscriber; collaborator/client must comply); §4 download limits ("reasonable" = 40 songs/100 SFX/100 clips per day); §5 "only use the Assets as a part of your creations" (no standalone exploitation); §6 "not owning" (IP retention); PRO/collecting-society royalty carve-out; §10 "How many seats do you want?" (Individual=1, Team/Max Business=7, Enterprise=custom); §11 "Max Business Plan & Enterprise license" (agency, broadcaster, or >50-employee company/group trigger the requirement; does not apply to AI-Services-only plans; special-case list incl. audio-to-audio Projects, standalone use, stage performance); §12 pointer to Terms of Use/Business Terms of Use; effective date footer.

## Source 2 — Artlist Help Center: "Understanding Artlist's license"

| Field | Value |
|---|---|
| Provider | Artlist |
| Source title | "Understanding Artlist's license" |
| Source type | Help Center explanatory article (non-controlling, summary-oriented) |
| Official URL | `https://help.artlist.io/hc/en-us/articles/29490991524253-Understanding-Artlist-s-license` (same `?utm_source=chatgpt.com` footer note as Source 1) |
| Capture method | Human/manual, browser Print→PDF |
| Capture date | 2026-08-27, 13:45:26 +08:00 (PDF `/CreationDate`: `D:20260827134526+08'00'`) |
| Effective/update date | **Not stated on the page itself** — no visible "last updated" date found (a known limitation type for Help Center articles, already anticipated in `EVIDENCE-CAPTURE-SOP.md`) |
| Durable repo path | `06_Operations/institutional-knowledge/notebook/evidence-captures/artlist/artlist-help-center-understanding-license_20260827T134526+0800_b4df3eaa.pdf` |
| SHA-256 | `b4df3eaac6a1fca67f06932d4b621712c4eb2ed928f86c62aacc665487b4fa79` |
| Page count | 4 |
| Extractability | Same limitation as Source 1 — no embedded text layer, visually inspected. |
| Evidence tier | Official platform authority — human-captured (Class B), narrower/summary-oriented than Source 1 |
| Completeness | 3 of 4 pages directly visually inspected (pp. 1-3); p.4 rendered but not inspected (contains further collapsed FAQ items per the visible table of contents on p.3 — none of the candidate propositions below depend on it). |

**Sections directly confirmed:** overview + "What is an Artlist license?"; Music/SFX/Footage/Templates continuity rule (same post-cancellation shape as Source 1, corroborating it independently: "If a project is completed and published while your subscription is active, you maintain the right to use the assets... even if you later cancel"); AI-Generated Content (Artlist's own AI tools — **out of Scenario A scope**, flagged not incorporated); eligibility/sanctions-compliance note; "What does the Social license cover?" (Clearlist mechanism, platform list); "What does the Pro license cover?"; monetization continuity; FAQ section headers (several collapsed, answer text not visible in this static capture).

## Reconciliation note (both sources)

The post-cancellation continuity rule (client-project/asset-license duration) is **corroborated independently by both sources**, in materially consistent language — Source 1: "you can keep using your Projects in the same media and monetize th[em]... any new projects will not be covered"; Source 2: "you retain the right to use them in that published project even after your subscription ends... once your subscription expires, these assets cannot be used in new projects." No conflict found between the two sources on any proposition drafted in `MUSIC-SCENARIO-A-FGR-PACKAGE.md`.
