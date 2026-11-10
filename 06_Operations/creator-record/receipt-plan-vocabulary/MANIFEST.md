# Receipt Plan-Name Vocabulary — Source Captures (CR-V2-RECEIPT-GATE-1B)

Factual product data for the G-R2 receipt text-layer cross-check (`08_Platform/app/lib/creator-record/receipt-examination/provider-plan-vocabulary.ts`).

**This is not Living Knowledge.** These captures support plan *names* only. They make no claim about what any plan permits, and they feed no governed claim, applicability, Bounded Interpretation, guidance or publication ledger.

- **Owner:** SI8 Product/Operations.
- **Approval authority:** JD.
- **Review date for every entry:** 2027-02-10. After that date the entry fails closed until it is re-reviewed.

## Capture method

Same as `06_Operations/institutional-knowledge/notebook/evidence-captures/runway/MANIFEST.md`:
- automated `curl -sL` with a browser-like User-Agent, HTTP 200;
- raw bytes preserved as received (see `.gitattributes`);
- no model summarization;
- text extracted with that manifest's Python method.

The extracted-text SHA-256 is the stable change detector. Raw bytes vary with page-build markup.

**Stability re-check, 2026-11-10 (same day, later fetch):** the extracted-text hash was identical for all three files.

## Files

| File | Canonical URL | Capture (UTC) | Raw SHA-256 | Extracted-text SHA-256 |
|---|---|---|---|---|
| `pika/pika-pricing_20261110T140456Z.html` | `https://pika.art/pricing` | 2026-11-10T14:04:56Z | `f8a8760bf55e65e4d7e4a5d4c8b9f0510e343eaee66e144f94dec6e506ce6123` | `6d00011a5b3ccb221d9a2a093ab3e13bc10ff3b2bc1db958624e9f8c1f576b01` |
| `higgsfield/higgsfield-help-team-and-business_20261110T140733Z.html` | `https://higgsfield.ai/creator-hub/help-center/business/team-and-business-higgsfield` | 2026-11-10T14:07:33Z | `5cba1b9b66e9008e7c29f536c93b1f8aea87c922a38a4effde3864eeee1930a9` | `fcc7a852b820930aabe2c41ad427b2f1dd86f39972e913786377c5b6a6d78f40` |
| `higgsfield/higgsfield-help-how-plans-work_20261110T140658Z.html` | `https://higgsfield.ai/creator-hub/help-center/plans/how-do-higgsfield-plans-work` | 2026-11-10T14:06:58Z | `f42fbf42a77d114c9116f11101cb07f38181760ad49b5ccabce871246d7ffd8f` | `35da56422f8d26096f9260b6e5c7d2867cf34ad5802ad0705cbdc7d5c43a31fa` |

## What each capture establishes (verbatim from the extracted text)

### Pika (coverage: complete, as stated by the provider)

> "Basic, Standard, Pro and Unlimited are legacy individual plan names. Current individual plans are Free, Starter, Creator and Fancy; Enterprise has custom pricing."

**Plan names:** Free, Starter, Creator, Fancy, Enterprise, Basic, Standard, Pro, Unlimited.

The page itself names both the current plans and the legacy plans. "Complete" means only that the provider's own page names these as its current and legacy plans; it is not an independent historical verification.

### Higgsfield (coverage: PARTIAL; team plans only)

> "Higgsfield has three team-focused plans: Team, Scale, and Enterprise." (help article dated Aug 2, 2026)

> "Higgsfield offers two types of plans: individual and business (Team, Scale, and Enterprise)."

**Plan names:** Team, Scale, Enterprise.

Individual plan names appear in no served official text: the pricing page renders them client-side. Individual-plan coverage is therefore not inferred, and the entry can never support "no other plan names found".

### Runway (NOT in the vocabulary)

The current pricing page (`https://runway.com/pricing`, captured 2026-11-10T14:04:55Z):
- raw SHA-256 `8052753c628a67ef9ec727028692c63b8ac14db9d53334128e259ae167a767c1`;
- text SHA-256 `d070088d8a21c8579ccc311b438d9c3e666045007800e9ae6ac6cc302708321e`.

It shows Free, Standard, Pro, Max, Team and Enterprise. These are retained as **current-plan candidates only**, pending the D-1 decision: historical coverage is not established by a current capture. The capture is held in the session review package, not here.
