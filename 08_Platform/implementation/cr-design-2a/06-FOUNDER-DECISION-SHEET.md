# CR-DESIGN-2A — Founder decision sheet

**Status: PROPOSED — NOT APPROVED. No decision below has been made.** Each line records PM/Architecture's recommendation for the founder to accept, amend or reject. Approving these authorises CR-DESIGN-2B (local, inert implementation) only, not a release.

| # | Decision | PM/Architecture recommendation | Options |
|---|---|---|---|
| FD-1 | Adopt the Institutional Trust presentation as a **new** governed presentation (v6/v7 + presentation contract v1), superseding F3 at a future release; v4/v5 never edited | Adopt | Adopt / Reject |
| FD-2 | Wording basis: carry every v4/v5 string verbatim; reject the mockup rewrites listed in `01-WORDING-RECONCILIATION.md` §8 | Adopt | Adopt / Amend |
| FD-3 | Disclaimer prominence: full `t.stamp` and `t.footer` on every page in a quieter running position (at least v5 size and 4.5:1 contrast), **plus** the full stamp shown prominently on page 1 | Adopt | Adopt / Keep today's header banner |
| FD-4 | Project title: a full, verbatim copy of the declared title as the page-1 hero (no splitting) | Adopt | Adopt / Omit hero |
| FD-5 | Shared caveats: one panel, moved from the overview to the end of the provider group it applies to (or after the guidance section when it spans groups), with "Applies to considerations N"; no duplication | Adopt | Adopt / Keep in overview |
| FD-6 | Optional new strings: C-1 "What this record contains"; C-3 "See 'Please note' below."; FP-9 "Listed in the order of your answers. Not ranked or compared."; C-2 "Why this was selected" (not recommended) | C-1 and C-3 optional; FP-9 optional (needs LK-G); C-2 no | Approve each / none |
| FD-7 | Page size A4; no "8" mark; no printed page cross-references; no tagged PDF/UA at launch (deferred) | Adopt | Adopt / Amend |
| FD-8 | Fonts: static Fraunces, Inter, IBM Plex Mono (OFL 1.1) embedded and hash-pinned, Noto Sans CJK TC fallback | Adopt | Adopt / Amend |
| FD-9 | Presentation identity: bind a presentation-configuration fingerprint into v6/v7 (a declared, not proven, layout identity); generator `creator-record-v2-pdf-v4` | Adopt | Adopt / Generator only |
| FD-10 | Acknowledge: an order paid before cutover and issued after it is rendered with the new design (content identical; Terms unaffected) | Acknowledge | Acknowledge / Require a different approach |
| FD-11 | Acknowledge: the existing "Where it appears" vs "does not say where" wording tension stays as approved (deferred wording maintenance) | Acknowledge | Acknowledge / Open a wording review |
| FD-12 | Authorise CR-DESIGN-2B under `05-CR-DESIGN-2B-ACCEPTANCE-CRITERIA.md` | Authorise | Authorise / Defer |

Not requested here: release, approval of v6/v7, cutover or deployment (CR-DESIGN-2C).
