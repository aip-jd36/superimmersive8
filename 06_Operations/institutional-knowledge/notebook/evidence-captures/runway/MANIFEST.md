# Evidence Manifest — Runway Terms of Use and Enterprise Services Terms (Commercial-Use Claim Correction)

Captured 2026-10-26 during LK-GOV-CORRECTION-1B and preserved in LK-GOV-CORRECTION-1C. Supports `FGR_030_RUNWAY_COMMERCIAL_USE_ENTERPRISE_EXCLUSION_CORRECTION_2026-10-26.md` and `CPR_037_CLAIM-RUNWAY-COMMERCIAL-USE-001-v2_2026-10-26.md`. Follows `EVIDENCE-CAPTURE-SOP.md` §12: one file per source, raw bytes, checksums recorded here.

**Preservation status: committed locally in LK-GOV-INTEGRATION-PREP-1 (not pushed).** Before the commit, every raw and extracted-text SHA-256 below was re-verified against the on-disk files, and every quoted passage was re-checked against the extracted text. The governance reviews that cite this capture (FGR_030, CPR_037) remain uncommitted and PENDING.

## Files

The raw files are byte-for-byte what the server returned, preserved by `.gitattributes` (`-text`, binary). Capture method for all files:
- automated CLI `curl -sL` with a browser-like User-Agent, HTTP 200;
- `runwayml.com/...` redirects to `runway.com/...`;
- no model summarization;
- text extracted locally by HTML-tag stripping (method below).

| File | Source | Canonical URL | Capture (UTC) | Stated version | Evidence tier | Raw SHA-256 | Extracted-text SHA-256 | Inspected |
|---|---|---|---|---|---|---|---|---|
| `runway-terms-of-use_20261026T055811Z_23927383.html` | Runway AI, Inc. — Terms of Use | `https://runway.com/terms-of-use` | 2026-10-26T05:58:11Z | "Last updated October 23, 2026" | Class A (primary contractual text) | `239273832b4a812616643b04476009c43621c7d772ee56e4a383c429e1fabcf3` | `e8c96e6143811eb4a271844ae5fe8a4c50263e30f227e684258d038df7939c9a` | Preamble; §4.4; §5 (all prohibited uses incl. (viii)); searched for tier/plan differentiation |
| `runway-enterprise-services-terms_20261026T055838Z_4f975de9.html` | Runway AI, Inc. — Enterprise Services Terms | `https://runway.com/enterprise-terms` | 2026-10-26T05:58:38Z | "Last updated June 1, 2026" | Class A (primary contractual text) | `4f975de94d4f7a20e682f6622bbc64f2dc6b4793af180003f20c624b4f3b448c` | `0fdb5a6eca70ff631e292410e97f9cf42feb3a021ea0bbcdc5effff8dd5c9993` | Scope paragraph; "Order" definition; Customer Content ownership; training-data clause; Indemnification headings |
| `runway-team-plan-page_20261026T055838Z_bb525826.html` | Runway — Team Plan page (marketing) | `https://runway.com/team-plan` | 2026-10-26T05:58:38Z | none stated | Class C (provider marketing; non-contractual) | `bb525826c889226a36be9298c84b91461ec31f48657fb6c3772f23f513b60122` | `ba09cc19bec9f712855edd5a72d20872b675b0e04365e224f64ee3c8f885a1e7` | Price, upgrade path, FAQ "When should we consider Enterprise instead?" |
| `runway-pricing-page_20261026T055839Z_06f796eb.html` | Runway — Pricing page (marketing) | `https://runway.com/pricing` | 2026-10-26T05:58:39Z | none stated | Class C (provider marketing; non-contractual) | `06f796ebdcbb882b98be26a63a9be4923cb6c036fc96e02b469dae3c0a96c808` | `9eae1235aaf4b48f07892de5a27740c47ae78c9e75f33dc921f9fa0e8a90c9d6` | Plan names only |

**Text-extraction method** (for the extracted-text hashes). Python 3 standard library only; the exact steps, in order (corrected in LK-GOV-INTEGRATION-PREP-1: an earlier prose description said elements and tags were "removed", but they are replaced by a space, and a reimplementation from that description does not reproduce the hashes):

```python
t = raw.decode('utf-8', 'replace')
t = re.sub(r'(?is)<(script|style|noscript)[^>]*>.*?</\1>', ' ', t)
t = re.sub(r'(?i)<br\s*/?>|</(p|div|li|h[1-6]|tr|section)>', '\n', t)
t = re.sub(r'<[^>]+>', ' ', t)
t = html.unescape(t)
t = re.sub(r'[ \t\r\f\v]+', ' ', t)
t = re.sub(r'\n\s*\n+', '\n', t)
text_sha256 = hashlib.sha256(t.encode('utf-8')).hexdigest()
```

Steps 5–6 collapse ASCII whitespace only; non-breaking and other Unicode spaces are left as they are. Trailing spaces on a line are not stripped.

**Stability re-check, 2026-10-26T07:14Z.** A second fetch of the ToU, Enterprise Services Terms, Team page, and the Higgsfield documents (see `../higgsfield/MANIFEST.md`) returned **different raw bytes** but **identical extracted text** for the ToU and Enterprise Services Terms. The raw difference is page-build and nonce markup. The Team page text differed only by one trailing space; after stripping trailing whitespace from each line, the text was identical. **Raw SHA-256 is therefore not a stable change detector for these pages.** A future refresh should compare the extracted-text hash, then the quoted passages below.

## What the capture establishes (verbatim, extracted from the files above)

**Terms of Use, Oct 23, 2026**
- Preamble: "If your organization would like to use, or has signed up for, Runway Enterprise Services, check out the Runway Enterprise Services Terms , which govern the use of Runway Enterprise Services."
- §4.4: "The Company does not claim ownership of any of your Inputs or Outputs."
- §4.4: "Subject to your compliance with the Agreement, the Company does not restrict your commercial use of your Outputs."
- §5(viii): "directly or indirectly uses the Services (including, but not limited to, Outputs) to create, train, develop, or improve similar or competitive products or services."
- No passage differentiates commercial-use rights by plan or tier. This rests on a search of the extracted text; it is a confirmed absence within this capture.

**Enterprise Services Terms, June 1, 2026**
- Scope: "These Enterprise Services Terms apply to organizations purchasing a subscription to Runway Enterprise Services. If you are an individual not acting on behalf of an organization, or on an organizational plan that is not an Enterprise Services Plan, our Terms of Use will apply to your use of our consumer offerings."
- "Enterprise Services Plan" occurs exactly once in the document's rendered text, in that sentence. (The raw file contains the string twice; the second is the same scope sentence repeated inside the page's embedded script data, not a separate passage.) **The document does not enumerate which plans are, or are not, Enterprise Services Plans.**
- "Order": "“ Order ” means an order form identifying the Services that Runway will make available under the Agreement and the fees that Customer will pay, whether a document signed by both Parties or the Runway webpage that Customer uses to purchase a subscription to the Services."
- "As between the parties, Customer owns all rights, title, and interest in Customer Content."
- "Runway may not use Customer Content as training data for the Services."
- Indemnification section headed "Runway Indemnification" / "Customer Indemnification". It was not analysed further, and no claim is made about it.

**Team Plan page (marketing; not contractual)**
- "$69 per seat per month" / "or $55 per seat per month billed yearly, 20% off".
- "Upgrade to Team from your plan settings and invite your team."
- "Enterprise is the next step once you outgrow nine seats or one workspace, or need security and admin controls like SSO, roles and permissions, …"

**Pricing page (marketing; not contractual)**
- Plan names shown: Free, Standard, Pro, Max; a separate "Team & Enterprise" tab. "Unlimited" appears only as a feature label (e.g. "Unlimited 4K video upscaling"), not as a plan name.

## The contractual boundary vs. plan names

| Kind of statement | Source | Status |
|---|---|---|
| **Contractual boundary.** The Terms of Use apply unless the customer is an organization on an *Enterprise Services Plan*, i.e. "purchasing a subscription to Runway Enterprise Services". | Enterprise Services Terms scope sentence (Class A) | Established by primary text |
| **Plan names currently on offer:** Free, Standard, Pro, Max, Team, Enterprise. | Pricing and Team pages (Class C) | Observed in marketing on the capture date. Not contractual, and changes without notice. |
| **"Team is not an Enterprise Services Plan."** | Inferred from the Team page (self-serve per-seat upgrade from plan settings; Enterprise described as the separate "next step") read with the scope sentence | **Inference**, not a primary statement. No document says in terms "Team is not an Enterprise Services Plan". |

## Comparison with prior evidence, and its limits

- **No complete historical copy of any of these documents exists** in the repository or in SI8's records. The prior governed evidence consists of verbatim passages only: `PLATFORM-RIGHTS-MATRIX.md` (Runway row, verified 2026-08-05, ToU dated May 11, 2026) and FGR_015 (2026-09-03).
- **What can be compared:** each quoted prior passage against this capture. The §4.4 ownership and commercial-use sentences and §5(viii) match verbatim.
- **What cannot be compared:** anything else in the May 11 → Oct 23 ToU change. **This is not a full-document diff,** and changes outside the compared passages cannot be ruled out.
- **Enterprise Services Terms.** FGR_015 recorded the Enterprise terms as not published as a single public document. This capture shows a public document dated June 1, 2026, earlier than FGR_015's review date. This is recorded as an error in the prior evidence record. It is not a provider change: no earlier copy exists to establish that the document was ever non-public.

## Known limitations

- Customer-specific Orders can supplement or vary the Enterprise Services Terms. They are not public and were not examined.
- The Indemnification, liability and other Enterprise Services Terms sections were only located, not analysed.
- The pricing and Team pages are marketing. Their plan names and descriptions are not governed evidence of contractual scope.
- The Terms of Use and Enterprise Services Terms pages carry no `<link rel="canonical">`. Their source URL is the fetched URL after the redirect. Each page's `<title>` ("Terms of Use | Runway", "Runway Enterprise Services Terms") matches the document, and each page links to the other at the URL recorded above. The pricing and Team pages declare canonical URLs that match the table.
