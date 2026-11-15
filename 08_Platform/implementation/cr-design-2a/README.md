# CR-DESIGN-2A — Institutional Trust wording reconciliation and presentation contract

**Status: PROPOSED — NOT APPROVED.** Prepared 2026-11-15 for founder and PM/Architecture review. Nothing here changes Production, templates, approvals or application behaviour. The approved v4/v5 template sets, the Creator Record v2 MVP contracts and Build B `0bec2dee` remain authoritative.

| Document | Content |
|---|---|
| [`01-WORDING-RECONCILIATION.md`](01-WORDING-RECONCILIATION.md) | Every Round 2 design slot mapped to approved wording (A), existing data (B), proposed navigation (C), proposed explanatory text (D) or rejected (E) |
| [`02-EVIDENCE-LOCATION-FINDING.md`](02-EVIDENCE-LOCATION-FINDING.md) | "Where it appears" is the approved label for the observation qualifier: legitimate data; the CR-DESIGN-1 finding is withdrawn |
| [`03-CONSIDERATION-PRESENTATION-CONTRACT.md`](03-CONSIDERATION-PRESENTATION-CONTRACT.md) | How the consideration block and index map onto the existing placement tree; shared-caveat placement without duplication |
| [`04-PRESENTATION-IDENTITY-AND-VERSIONING.md`](04-PRESENTATION-IDENTITY-AND-VERSIONING.md) | Presentation-configuration fingerprint, v6/v7, generator v4; checked effects on issuance, retry, consent, Terms, AI permission and eligibility |
| [`05-CR-DESIGN-2B-ACCEPTANCE-CRITERIA.md`](05-CR-DESIGN-2B-ACCEPTANCE-CRITERIA.md) | Required generated PDFs, automated tests and visual review for the implementation milestone |
| [`06-FOUNDER-DECISION-SHEET.md`](06-FOUNDER-DECISION-SHEET.md) | The remaining founder decisions, with recommendations |

Design source (reference only): [`08_Platform/design/creator-record/2026-11-15-institutional-trust/round-2/`](../../design/creator-record/2026-11-15-institutional-trust/round-2/README.md).

## PM/Architecture basis (recommendations, not release authorisation)

These are the PM/Architecture recommendations, subject to founder approval:
- **Stack and inputs:** keep `@react-pdf/renderer`, A4, the record builder and governed render inputs, ordering and applicability semantics, and D10.
- **Wording:** keep approved wording; review navigational labels separately; keep the complete stamp and footer, in a quieter presentation with a conspicuous first-page disclosure.
- **Fonts:** embed Fraunces, Inter and IBM Plex Mono with a CJK fallback.
- **Exclusions and deferrals:** no "8" mark; page cross-references and tagged PDF deferred; dynamic page counts kept.
- **Placement and versioning:** keep caveat-consolidation invariants; new template versions; keep historical artifacts and retry protections.
