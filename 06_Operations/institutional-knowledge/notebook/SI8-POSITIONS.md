# SI8 Positions

Settled stances SI8 has taken and is prepared to repeat consistently — written down so they don't get re-derived fresh in every sales call or partner conversation.

**Schema (revised 2026-08-01, after external review — see note at bottom):** every entry separates three things that were previously blended together — **Source fact** (what's externally verifiable: statute text, platform documentation, a direct quote), **SI8 interpretation** (our reading of what that fact means), and **SI8 position/policy** (what we actually say or do as a result). Collapsing these into one "Statement" field made it too easy for a policy choice to read like settled law. This split is applied to every entry below without exception, including the ones (like POS-006) that mostly just point to an external spec — consistency of structure matters more than brevity here.

Entries also now carry a **Source type** and, where applicable, a **Status: Codified in [X]** marker when the underlying rule has been formally adopted elsewhere (the Reviewer Manual, a technical spec). **Every entry marked `Codified in [X]` carries this exact sentence, verbatim, in its Status line: "This entry is an index and practical summary. The cited Manual or Specification controls if the wording differs."** Use it word-for-word, not a paraphrase — a future editor (human or agent) tightening the prose on a Codified entry should not be able to accidentally soften or shift that boundary without also visibly breaking a recognizable, repeated sentence.

Full schema and promotion rules: `08_Platform/prds/PRD_LIVING_NOTEBOOK.md` § SI8 Positions / § Promotion Rules.

---

### POS-001 — Uncorroborated self-attestation caps assessment confidence, regardless of narrative detail

**Status:** Active — **Codified in Reviewer Manual v0.2** (Part 4/5, Domain H). This entry is an index and practical summary. The cited Manual or Specification controls if the wording differs.
**Domain(s):** H (Human Creative Contribution)
**Source type:** Direct evidence (SI8's own issued assessment) + first-party account (independent partner conversation)
**Adopted:** 2026-07-20
**Last reviewed:** 2026-08-01
**Source fact:** Cloud World (ASSESS-005-2026-07-12) scored the top outcome / High confidence on a detailed but uncorroborated self-attested authorship account — root cause traced and fixed in Reviewer Manual v0.2 (see [[EC-001]]). Separately, in an unrelated conversation, Alice Feng (Anchor Film) disclosed that her company has reconstructed prompts after the fact for past projects, and independently recognized, unprompted, that a reconstructed account isn't reliable provenance (`03_Sales/call-notes/CALL-2026-07-30-B164-Alice-Feng-Anchor-Film.md`). This second data point required no SI8 judgment call — it's an external, real-world confirmation of the same pattern, not a separate ruling.
**SI8 interpretation:** A detailed, internally consistent narrative is not distinguishable from a well-constructed but inaccurate one without an independent artifact. Narrative quality is not evidence of narrative accuracy.
**SI8 position/policy:** Domain H requires a corroborating artifact (prompt log, project file, storyboard, brief) to reach "Verified." An uncorroborated narrative caps at "Partially Verified," and Domain H being Verified is a required gate for the top outcome and High confidence.
**Related:** [[EC-001]]

---

### POS-002 — SI8 does not position its assessment as satisfying EU AI Act Article 50 compliance directly

**Status:** Active
**Domain(s):** Commercial/Positioning
**Source type:** Primary source (statutory text, not independently re-verified in this entry) + internal policy choice
**Adopted:** carried forward from earlier EU Act framing work
**Last reviewed:** 2026-08-01
**Source fact:** Per `01_Business/research/ASA-IAB-2026-AI-CONTENT-RESEARCH.md`, Article 50(2) is framed as the AI system provider's obligation (e.g. Runway, Kling); Article 50(4) is framed as the deployer's/platform's obligation. **This entry has not independently re-verified the current statutory text** — treat the research doc, not this summary, as the primary reference before citing this externally.
**SI8 interpretation:** Neither role (provider nor deployer) describes SI8. SI8's assessment can serve as supporting evidence for a party that does carry one of these obligations, but does not itself discharge either obligation.
**SI8 position/policy:** Do not pitch SI8 as "EU AI Act compliance." Use the narrower, defensible framing: SI8 restores the provenance/evidence signal typically stripped out during production and distribution compositing — useful context for a party with an Article 50 obligation, but SI8 is not that party.
**Related:** [[POS-003]]

---

### POS-003 — SI8 does not position its assessment as satisfying NY Synthetic Performer Law compliance directly

**Status:** Active
**Domain(s):** Commercial/Positioning, H, L (Likeness)
**Source type:** Primary source (statutory text, not independently re-verified in this entry) + internal policy choice
**Adopted:** carried forward from NY law research (Jun 14, 2026)
**Last reviewed:** 2026-08-01
**Source fact:** Per `01_Business/research/NY-SYNTHETIC-PERFORMER-LAW-2026.md`, S.8420-A creates an "actual knowledge" compliance obligation for the entity using synthetic performers. **This entry has not independently re-verified the current statutory text** — treat the research doc as primary.
**SI8 interpretation:** That obligation sits with the production-side entity, not with a third-party assessor. Applies specifically to production-side buyers (agencies, studios) — not entertainment-side entities (talent agencies, unions), which is a different ICP.
**SI8 position/policy:** Same structure as [[POS-002]]: SI8's assessment is evidence a production-side client can use to inform their own compliance posture, not a substitute for that determination.
**Related:** [[POS-002]]

---

### POS-004 — Issued assessments are not retroactively re-scored when methodology updates

**Status:** Active — **Codified in Reviewer Manual v0.2** (Part 7, Governance). This entry is an index and practical summary. The cited Manual or Specification controls if the wording differs.
**Domain(s):** Governance (all domains)
**Source type:** Internal policy choice
**Adopted:** 2026-07-20
**Last reviewed:** 2026-08-01
**Source fact:** Cloud World was assessed and issued under Manual v0.1 before the Domain H gap ([[EC-001]]) was identified and fixed in v0.2.
**SI8 interpretation:** n/a — this is a governance policy, not an interpretation of external fact.
**SI8 position/policy:** When the Reviewer Manual version-bumps, every assessment already issued keeps the `methodology_version` it was actually assessed under. SI8 does not retroactively re-score or reissue past assessments in light of later methodology improvements. **Scope limit, added on review:** this governs *reissuance/re-scoring* specifically. It does not mean a later-discovered fact suggesting an issued assessment relied on materially wrong information should go unexamined — that is a distinct quality/incident question, to be evaluated deliberately on its own facts if it ever arises, not something this policy forecloses by default.
**Related:** [[EC-001]]

---

### POS-005 — First-party evidence-capture and SI8's independent assessment are architecturally separate functions

**Status:** Active
**Domain(s):** Commercial/Positioning
**Source type:** Internal policy choice (architectural fact) + commercial hypothesis (market thesis, unvalidated)
**Adopted:** 2026-07-30
**Last reviewed:** 2026-08-01
**Source fact:** In-person conversation with Alice Feng (Anchor Film), who is independently building a first-party production-evidence-capture platform and proposed a complementary rather than competitive relationship. `03_Sales/call-notes/CALL-2026-07-30-B164-Alice-Feng-Anchor-Film.md`. One data point.
**SI8 interpretation — settled architectural fact:** SI8's current product does not build or sell evidence-capture tooling (prompt logging, C2PA embedding, on-chain notarization). That is treated as a separate function from SI8's independent assessment, done by other parties (e.g. Numbers Protocol, Anchor Film's proposed platform) if at all.
**SI8 interpretation — unvalidated commercial hypothesis, kept explicitly separate from the fact above:** more/better evidence-capture tooling in the market makes SI8's judgment more valuable rather than redundant. This is plausible but **not yet established** — a single positive partner conversation does not validate a market-wide thesis, and there are real disconfirming paths (e.g. better tooling could let insurers or agencies standardize enough decisions internally that specialist review becomes a narrow exception path rather than a default need). See the companion Vision document's falsification conditions.
**SI8 position/policy:** Describe the architectural separation as fact. Describe the "this makes us more valuable" claim as a working hypothesis when talking to partners or investors — not as settled reasoning.
**Related:** —

---

### POS-006 — `digitalSourceType` / content-origin metadata does not substitute for SI8's assessment outcome

**Status:** Active — **Codified in Provenance Manifest Specification v0.2**. This entry is an index and practical summary. The cited Manual or Specification controls if the wording differs.
**Domain(s):** Commercial/Positioning, technical architecture
**Source type:** Internal technical specification
**Adopted:** carried forward from Provenance Manifest Specification v0.2 (Jul 12, 2026)
**Last reviewed:** 2026-08-01
**Source fact:** `06_Operations/provenance/SI8-Provenance-Manifest-Specification-v0.2.md` defines `digitalSourceType` as a content-origin metadata field, distinct from SI8's own confidence/outcome fields — clarified following the Jul 6 Sofia Yan correspondence on C2PA Trust List status.
**SI8 interpretation:** A file carrying correct `digitalSourceType` metadata describes how the content-origin layer classifies the asset technically. It does not indicate SI8 has reviewed and stands behind the commercial-clearance judgment for that asset. Same file/carrier-vs-trust-layer distinction as Principle P6.
**SI8 position/policy:** Never conflate the two in customer-facing material — `digitalSourceType` and SI8's assessment outcome must be presented as separate, non-substitutable facts about an asset. See the Specification itself for the full technical definition; this entry is a summary, not the source of truth.
**Related:** [[POS-005]]

---

## Editorial note (2026-08-01)

This file was restructured after an external critical review flagged that the original single-field "Statement" made it too easy for a policy choice (what SI8 chooses to say) to read as though it were settled external fact (what the law or a platform actually requires). POS-002, POS-003, and POS-005 in particular were rewritten to make that boundary explicit. POS-001 and POS-006 were marked as codified elsewhere to avoid two documents silently drifting apart as separate sources of truth for the same rule. Original single-field text remains in git history.
