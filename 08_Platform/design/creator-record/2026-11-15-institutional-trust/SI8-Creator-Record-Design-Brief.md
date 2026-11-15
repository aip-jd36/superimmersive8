# SI8 Creator Record — Design Brief (Institutional Trust direction)

**One direction, done well.** Not three explorations. Design the visual system and page concepts for the SI8 Creator Record PDF in a single direction — **Institutional Trust** — and deliver renderer-ready specs, not mood boards. The reason it's this direction and not a creative-keepsake or fintech-product one: the Record's job is to make a $29 creator *credible when they share it with an agency, brand, or producer*, and to be a trust on-ramp to SI8's paid human-reviewed assessment. That's institutional credibility, full stop.

---

## The central design problem (this is the actual job — solve THIS)

Read the current PDF as a paying customer. The dominant impression is **everything SI8 didn't do** — the document spends most of its words disclaiming itself ("no person checked," "not a clearance," "does not establish," "says nothing about"). Meanwhile the *one piece of real value* — the Runway commercial-use guidance in Section 2 — is buried in the machinery of disclaiming it.

**The redesign must invert this:** make the **published guidance the hero** of the document, and make the (still-prominent, still-complete) limitations read as **rigor and transparency**, not as retreat or apology. A reader should finish the first page thinking "this is careful and credible," not "this is a list of unverified things." If a design treatment doesn't move value toward the guidance and reframe limitations as institutional discipline, it has missed the brief — prettier typography alone is a failure.

---

## Hard governance constraint (non-negotiable — a legal boundary, not a style choice)

The document contains a creator declaration of **Runway Pro** and an automated document-reading of **Runway Standard**. These must **never be visually associated, compared, or reconciled.** No side-by-side table, no shared row, no proximity that reads as "two values of one field," no indicator that one is more authoritative.

Enforce this through **different visual registers**, not just different sections:
- **Creator declarations** = the creator's own voice — present as a clean project record (their statements).
- **Automated document readings** = a machine's observation — present in a visibly distinct, cooler, more clinical register that reads as "a tool reported this," clearly a different *kind* of information.

Every design instinct (alignment, proximity, shared tables) will try to associate these two values. Resisting that is a core requirement. The non-reconciliation is an intentional governance decision, not a defect to solve.

## Visual conclusions that are forbidden (meaning is communicated even without words)

No scores, risk ratings, traffic-light colors, pass/fail, verified/approved badges, rights-clearance checkmarks, completeness percentages, certification seals, or signatures implying human review. "0 open items" must not read as "no problems." An unsupported provider must not read as safe or unsafe. Build credibility through **typography, information hierarchy, transparency, and consistency** — never through symbols of certification.

---

## Content is fixed; design is open
Use the attached production PDF (CR-2026-7E82CA09) as the authoritative content. Preserve all wording, disclaimers, qualifications, provenance, and uncertainty exactly. You may restructure hierarchy, typography, numbering, pagination, and layout. If you believe wording or section order should change, list it **separately** as a proposed change for product/governance review — do not silently alter it in the concept.

---

## Deliverables (scoped to what's shippable)

This is a **variable-length, deterministically auto-generated PDF**, not a web page. So:

1. **Page concepts** (high-fidelity, using the real content) for:
   - **First page** — establishes project identity (title "Urban Futures" prominent), the Record's nature and number/date elegantly, and a clear at-a-glance entry point. The guidance is the hero; limitations present as rigor. No decorative full-page cover.
   - **The repeatable "consideration" block** — one elegant, repeatable pattern for a commercial-readiness consideration (subject / guidance / why selected / qualifications / limitations), that works for one consideration or many, any provider.
   - **Declaration pages** — Q&A that reads as a professional project record, not a questionnaire export.
   - **Document-reading + provenance pages** — the clinical "machine observed this" register, with reading / supporting text / basis / limitations / technical provenance clearly tiered, visually separated from guidance.

2. **Implementation spec** (so the production renderer can reproduce it deterministically): page size & grid, margins/spacing scale, typography system (families, sizes, weights — international distribution, accessibility/contrast), color tokens, the reusable component patterns, header/footer rules, **page-break behavior** (repeated headers, continuing sections, table overflow, orphan headings, long hashes/filenames/titles), and variable-content behavior (0 or many documents, 0 or many considerations, long answers, unsupported providers).

3. A short list, separate, of any recommendations that would require changes to approved wording, upstream data, or product semantics.

---

## Design character
Premium, contemporary, independent, precise, calm, editorially disciplined. References for *thinking* (not to copy): Stripe's hierarchy and making complex info approachable; professional-services assurance publications for how caveats/limitations are presented credibly (without borrowing audit authority); Swiss Re Institute's restrained analytical typography; Monocle's editorial discipline and whitespace; Swiss typographic grid precision. Avoid: generic SaaS report, AI-deck aesthetic, compliance checklist, government form, certificate-of-authenticity, decorative dashboards with fake metrics, futuristic AI branding.

## Success test
A commercial stakeholder who's never heard of SI8 receives this and finds it credible and carefully made; a creator is comfortable sharing it; the guidance is understood in 30 seconds; the limitations are equally clear but read as transparency, not apology — and the document makes **no stronger commercial or evidential claim than the current PDF.** Not a prettier export: a recognizable, trustworthy document product for the AI-video economy.

---
*Note on tool: use the design canvas to produce the visual concepts and system; the final shippable output is a PDF template spec the production generator implements, so keep every concept reproducible by deterministic automated generation — nothing that depends on hand-placement.*
