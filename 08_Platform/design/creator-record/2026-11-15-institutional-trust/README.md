# CR-DESIGN-1 — Creator Record: Document Design Exploration

| | |
|---|---|
| Milestone | `CR-DESIGN-1` |
| Date | 2026-11-15 |
| Design direction | Institutional Trust |
| Origin | Claude Design (founder-led exploration) |
| **Status** | **DESIGN PROPOSAL — NOT APPROVED FOR IMPLEMENTATION** |
| Next step | Founder and PM/Architecture review (not yet scheduled) |

This folder archives design material for discussion only. It is **not** an implementation specification, a template, approved wording or a release record. Production templates, renderer code and approved source wording live elsewhere (see [Authoritative documents](#authoritative-documents)) and are unchanged by this folder.

## Later rounds

- **Round 2 export package** (2026-11-15): [`round-2/`](round-2/README.md). PM/Architecture names Institutional Trust as the preferred visual direction; its wording, change register and synthetic examples are **not approved**.
- **CR-DESIGN-2A** wording reconciliation and presentation contract (PROPOSED — NOT APPROVED): [`08_Platform/implementation/cr-design-2a/`](../../../implementation/cr-design-2a/README.md).

## Why this exploration exists

The Creator Record v2 MVP is released and closed (Build B `0bec2dee`; rollback floor Build A `60b1d84d`). Before marketing the Creator Record actively, the founder started a separate design workstream. Its aims are to improve:

- the perceived customer value of the $29 deliverable;
- visual credibility and professionalism;
- information hierarchy and readability;
- shareability with agencies, brands, producers and other commercial stakeholders;
- SI8's distinctive document design identity;
- the presentation of governed guidance as a principal source of customer value.

This workstream does not reopen the closed MVP engineering milestone.

## Reference Production artifact

The concepts use the content of the issued Production Creator Record **`CR-2026-7E82CA09`** (the operator's Production UAT purchase, 2026-11-14; synthetic project and synthetic receipt). See PRD §12 for its release context.

## Principal concepts of the direction

- A first page that leads with guidance: the published guidance is the hero.
- Prominent project identity (the project title leads the first page).
- Premium, institutional, editorial design.
- A repeatable block for each commercial-readiness consideration (subject, why selected, guidance, qualifications, open items).
- Creator declarations presented as a professional project record.
- Automated document readings in a distinct, cooler, "clinical" visual register.
- Limitations presented as transparency and institutional rigor.

The PDF is a **set of four representative page concepts**, not a complete redesigned record. Its "Page N of 6" labels refer to the reference record's length. The brief asked for renderer-ready specifications. These materials are **not** a renderer-ready specification, and they have not been checked against the approved content and governance requirements.

## Files

All files are stored byte-for-byte as supplied. Only the filenames were normalized (no spaces or em dashes).

| Stored filename | Original filename | Bytes | SHA-256 | Purpose |
|---|---|---|---|---|
| `SI8-Creator-Record-Design-Brief.md` | `SI8-Creator-Record-Design-Brief (1).md` (saved locally as `SI8-Creator-Record-Design-Brief.md`) | 6,760 | `f6375ad78f3ce94056919216f3767414f94337bd0bbc030b72d4da4f20d0b96b` | The brief given to Claude Design: the design problem, the governance constraints and the requested deliverables |
| `SI8-Creator-Record-Design-Concepts.pdf` | `SI8 Creator Record — Design Concepts.pdf` | 2,302,068 | `ad700d3a5fc081d7587234662701e2e617022e16d4572af75affd66c6a865975` | Four page concepts (4 PDF pages) |
| `SI8-Creator-Record-Design-Concepts-png.zip` | `SI8 Creator Record — Design Concepts-png.zip` | 1,780,559 | `90ba33039b2f30fc28cd463f2fb13ca2aeea7af81bb18ac75051ebfd5e15265e` | PNG renders of the same four concepts |

**ZIP inventory.** The ZIP holds 4 PNGs, each 1632 × 2112 px, 1,779,935 bytes uncompressed in total. The PNGs are kept only inside the original ZIP and are not extracted into the repository, so no binary is stored twice.

| Entry in ZIP | Bytes | SHA-256 |
|---|---|---|
| `Page 1 — Guidance as hero.png` | 502,957 | `eb898f79b74f45db17a26a9ce219b1ae7f596ae10be091d3e47362fcd5cab273` |
| `Consideration block (repeatable).png` | 466,121 | `69fb843ac2f283677e4f1ca5508dbd334fc09d6b84390a0ba02f26a6e496a85b` |
| `Declarations — the creator's voice.png` | 378,110 | `40105889d7c6aa9338ff9ad497ed7df16b002a6a55ed5db7157ec67a64032a57` |
| `Document reading — clinical register.png` | 432,747 | `a1e0c35cc12ac54538f6ac2496a33cd137237e2b28d7893a7ccdeea5b77468ec` |

The repository is public. Before committing, the PDF text, its metadata and the PNG metadata were checked: they contain only the synthetic UAT content of the reference record, with no personal contact details or secrets.

## Governing boundaries for any future review

These are constraints the concepts must be reviewed against later. They are **not** findings that the concepts already satisfy them.

- The Creator Record is a self-declared educational record. It is not a clearance, certification, legal opinion or human-reviewed Commercial Assurance Assessment.
- D10 remains authoritative.
- Creator declarations, published SI8 guidance and automated document readings remain independent information sources. They are never compared, reconciled or used to select or qualify one another.
- The PDF rendering layer may not invent, strengthen or reinterpret upstream conclusions.
- Approved wording, evidence boundaries and the governed template contracts remain authoritative.
- Any proposed change to wording, semantic hierarchy, data requirements or governance-sensitive presentation needs separate review and approval.
- A Production redesign would need a new, approved template version and must leave historical issued artifacts unchanged.

## Authoritative documents

- Product scope and release state: [`08_Platform/prds/PRD_CREATOR_RECORD_v2_MVP_SCOPE.md`](../../../prds/PRD_CREATOR_RECORD_v2_MVP_SCOPE.md) (§12)
- Release approvals and exceptions: [`08_Platform/implementation/CR-V2-MVP-RELEASE-AUTHORIZATION-1-APPROVAL-RECORD.md`](../../../implementation/CR-V2-MVP-RELEASE-AUTHORIZATION-1-APPROVAL-RECORD.md)
- Engineering entry point (templates, renderer, D10): [`08_Platform/app/lib/creator-record/README.md`](../../../app/lib/creator-record/README.md), "Current state"
- Project index: `claude.md` §3t (MVP, closed) and §3u (this exploration)
