# Evidence Manifest — Higgsfield Terms of Use Agreement (Commercial-Use Claim Source Refresh)

Captured 2026-10-26 during LK-GOV-CORRECTION-1B and preserved in LK-GOV-CORRECTION-1C. Supports `FGR_031_HIGGSFIELD_COMMERCIAL_USE_ENTERPRISE_AGREEMENT_BOUNDARY_CORRECTION_2026-10-26.md` and `CPR_038_CLAIM-HIGGSFIELD-COMMERCIAL-USE-001-v2_2026-10-26.md`. Follows `EVIDENCE-CAPTURE-SOP.md` §12.

**Preservation status: committed locally in LK-GOV-INTEGRATION-PREP-1 (not pushed).** Before the commit, every raw and extracted-text SHA-256 below was re-verified against the on-disk files, and every quoted passage was re-checked against the extracted text. The governance reviews that cite this capture (FGR_031, CPR_038) remain uncommitted and PENDING.

## Files

The raw files are byte-for-byte what the server returned (`.gitattributes`: `-text`, binary). Capture method:
- automated CLI `curl -sL` with a browser-like User-Agent, HTTP 200;
- no model summarization;
- text extracted with the same method as `../runway/MANIFEST.md`.

| File | Source | Canonical URL | Capture (UTC) | Stated version | Evidence tier | Raw SHA-256 | Extracted-text SHA-256 | Inspected |
|---|---|---|---|---|---|---|---|---|
| `higgsfield-terms-of-use-agreement_20261026T055812Z_0cd496b9.html` | Higgsfield, Inc. — Terms of Use Agreement | `https://higgsfield.ai/terms-of-use-agreement` | 2026-10-26T05:58:12Z | "Last updated: October 23, 2026" | Class A (primary contractual text) | `0cd496b92d7726a99cc23f6083e98739fea34fdca41c69a36f18764ea0c44382` | `e62227343de38f47f0b77b2acbc67268099c83a4c85aacbe1ddc807ef08b879f` | §1.2, §1.3, §1.6, §2.5, §4.4, §8, §10.6, §13.2 |
| `higgsfield-enterprise-page_20261026T060030Z_9d086ef5.html` | Higgsfield — Enterprise page (marketing) | `https://higgsfield.ai/enterprise` | 2026-10-26T06:00:30Z | none stated | Class C (provider marketing; non-contractual) | `9d086ef5f9d8ff223c8b6f7b8e353696e723141da6d9016fe6b04d4512aefaf8` | `e353b37554ea8c3df81ea28b19b6b91c5362b16ef452e09e22f0e137d30d6f23` | FAQ and feature copy |
| `higgsfield-pricing-page_20261026T060031Z_81b890a1.html` | Higgsfield — Pricing page | `https://higgsfield.ai/pricing` | 2026-10-26T06:00:31Z | none stated | — | `81b890a166531e7dd44a0d8dec407e62045dfeda497b977b3a8cf33f7f983c96` | `a8c0433933dcdcc745802935d8c2e862542e85c0f86ff906c86d968f2d39d0b1` | Navigation only. **Plan content renders client-side; no plan names are present in the served HTML.** Preserved to document that limitation. |

**Stability re-check, 2026-10-26T07:14Z.** A second fetch of the Terms and the Enterprise page returned different raw bytes but identical extracted text. Raw SHA-256 is not a stable change detector for these pages; compare the extracted-text hash and the passages below.

## What the capture establishes (verbatim)

- Version: "Last updated: October 23, 2026".
- §1.2: the licence to use the Service is granted "solely for your own personal or internal business purposes or, where applicable, to build and operate applications for your end users in accordance with Section 11."
- §1.3 is headed "Supplemental Terms". It ends: "Enterprise, business, or organizational use of the Service may be governed by a separate written agreement between you and Company (an "Enterprise Agreement"). If an Enterprise Agreement applies, it controls over these Terms of Use to the extent of any conflict with respect to that use."
- §1.6: "Subscription tiers (Starter, Plus, and Ultra)" (Supercomputer agent product).
- §2.5, "Organizations and Workspaces": "The Service may allow multiple users to access a shared organization, team, or workspace (“Workspace”). The Workspace owner or administrator is responsible for the Workspace, including payment of all Fees for the Workspace and its members. …"
  - §2.5 is part of the Terms of Use and does not refer Workspaces to an Enterprise Agreement.
  - **It does not itself say that Workspace use is "governed by these Terms"**; that is how this review reads the section's placement.
- §4.4:
  - "Company does not claim ownership of any of your Inputs or Outputs, nor does it restrict your commercial use of Outputs."
  - "Your rights in Outputs you have generated and exported survive cancellation of your subscription or deletion or termination of your Account, and you may transfer or sublicense your rights in Outputs to your clients or other third parties."
  - "Company will not use your private content, or private content you create for or on behalf of a client, in its marketing without your consent."
  - "Different terms apply to enterprise and business customers who use the Service under an Enterprise Agreement (see Section 1.3); under those agreements, Company does not use the customer's content to train or improve its AI models, and that content is handled as confidential."
- §8: third-party model policies apply; "where those policies are more restrictive, the more restrictive terms govern your use of that feature or model."
- §10.6: "model usage under subscription tiers marketed as “Unlimited” is subject to Company's fair-use limits …"
- §13.2: "Company further makes no representation or warranty as to the originality, uniqueness, legality, accuracy, or fitness of any Output."

**Enterprise page (marketing; not contractual)**
- "Higgsfield Enterprise uses credit-based pricing on annual contracts with monthly payments, sized to your team's seats and generation volume."
- "After signing, your workspace goes live and a dedicated AI Educator runs hands-on onboarding …"
- "Enterprise agreements include full IP ownership of your outputs and contract-backed indemnification, so brands and agencies can publish AI-generated video with legal confidence."

## The Enterprise Agreement boundary: what is and is not established

- **Established by primary text.** An Enterprise Agreement is a "separate written agreement". It "may" govern enterprise, business or organizational use, and it controls over the Terms only "to the extent of any conflict".
- **Not established.**
  - Which customers have an Enterprise Agreement.
  - Whether any self-serve plan or Workspace carries one.
  - What an Enterprise Agreement says. It is not public, and the marketing statements above are not its terms.
- **The boundary is a contractual relationship, not a plan or tier name.** This remains an **unresolved representation question** (FGR_031). No structured exclusion is proposed in this milestone.

## Comparison with prior evidence, and its limits

- **No complete historical copy exists.** The prior governed evidence is the set of passages quoted in FGR_029 (2026-10-14), against the Terms dated July 26, 2026.
- **Compared passages:** the §4.4 sentences, the §1.3 Enterprise Agreement sentences, §8 and §13.2 match verbatim.
- **Not determinable:**
  - whether the "Supplemental Terms" heading, §1.2's wording, §1.6, §2.5 or §10.6 are new or were present but not examined in FGR_029;
  - any other July 26 → Oct 23 change. **This is not a full-document diff.**
- Higgsfield's self-serve plan names remain unverified (pricing renders client-side). FGR_029's "Team, Scale, Enterprise" is not confirmed by this capture.
