# Chain of Title Template — Version History

This log tracks changes to the Chain of Title template structure and content standards over time.

---

## v1.0 — February 21, 2026

**Status:** Active template

**Created by:** SI8 Founding Team

**Trigger:** Initial Chain of Title example created for sales and filmmaker onboarding

**Template Structure:**
- 9-field schema (documented in `/06_Operations/rights-verified/RIGHTS-PACKAGE-SCHEMA.md`)
- Markdown format for flexibility and version control
- Comprehensive documentation style (12 pages for Example 001)

**9 Fields (v1.0):**
1. Tool Provenance Log
2. Model Disclosure
3. Rights Verified Sign-off
4. Commercial Use Authorization
5. Modification Rights Status
6. Category Conflict Log
7. Territory Log
8. Regeneration Rights Status
9. Version History

**Design Decisions:**
- Single document format (all fields in one file)
- Buyer-facing language (professional, legally rigorous, but accessible)
- Risk mitigation summary included (helps buyer legal counsel assess)
- Supporting documentation listed but not embedded (kept in separate SI8 files)
- Disclaimer included: "Not legal advice or warranty" (liability management)

**Examples Created:**
- Example 001: "Neon Dreams" (cyberpunk commercial/short, Runway Gen-3, Tier 1 + Tier 2)

**Known Limitations (v1.0):**
- No executive summary / quick reference page
- Version History table (Field 9) will grow unwieldy after 10+ entries — may need appendix
- Category Conflict Log formatting unclear for complex active restrictions
- PDF export format not yet defined (Markdown only)
- No "Chain of Title Lite" variant for low-risk use cases

**Feedback Needed:**
- Test with real buyers: Is 12 pages too long, or is comprehensiveness valued?
- Test with filmmakers: Is production brief format clear and achievable?
- Legal counsel review: Does Chain of Title provide sufficient documentation for buyer risk assessment?

---

## Planned Updates (Future Versions)

### v1.1 (Estimated: March 2026)
**Trigger:** After first 3 real catalog entries + buyer/filmmaker feedback

**Potential changes:**
- Add 1-page executive summary to Chain of Title (quick reference for buyers)
- Refine Category Conflict Log formatting based on real catalog complexity
- Clarify Risk Mitigation Summary based on buyer legal counsel questions
- Standardize PDF export format and styling

### v2.0 (Estimated: Month 3-4)
**Trigger:** Lawyer review + first paid deal closed

**Potential changes:**
- Legal counsel recommendations incorporated
- Additional fields if needed based on buyer contract requirements
- Platform-specific disclosure requirements (e.g., YouTube, Netflix AI content policies)
- Music rights documentation expansion (currently light in v1.0)
- E&O insurance integration (if applicable)

### v3.0 (Estimated: Month 6+)
**Trigger:** 20+ catalog entries + pattern recognition from real deals

**Potential changes:**
- Split into "Chain of Title Lite" (5 pages, low-risk) vs. "Chain of Title Comprehensive" (12+ pages, high-risk)
- Automation of certain fields (tool TOS verification, model disclosure updates)
- Database integration preparation (Year 3 platform vision)
- API export format for buyer systems integration

---

## Field-Level Change Log

### Field 1: Tool Provenance Log
- v1.0 (Feb 2026): Table format with 5 columns (tool, version, plan type, dates, receipt status)
- Future consideration: Add API links to tool provider documentation

### Field 2: Model Disclosure
- v1.0 (Feb 2026): Narrative format describing models and training data policies
- Future consideration: Link to tool provider model cards (if publicly available)

### Field 3: Rights Verified Sign-off
- v1.0 (Feb 2026): Reviewer name, date, risk tier, review duration, summary, No List compliance checklist
- Future consideration: Add numeric risk score (1-10 scale) for easier buyer assessment

### Field 4: Commercial Use Authorization
- v1.0 (Feb 2026): Table format with TOS verification dates
- Future consideration: Add direct links to tool ToS versions (archived)

### Field 5: Modification Rights Status
- v1.0 (Feb 2026): Authorization status, scope, Tier 2 eligibility, approval process
- Future consideration: Add pricing tier guidance (e.g., "Modification authorized: Premium pricing applies")

### Field 6: Category Conflict Log
- v1.0 (Feb 2026): Simple lists (eligible categories, restricted categories, exclusivity status)
- Future consideration: Needs better structure for complex active licenses (multiple exclusivities, regional variations)

### Field 7: Territory Log
- v1.0 (Feb 2026): Geographic licensing status (global vs. restricted)
- Future consideration: Add ISO country codes for precision; legal jurisdiction notes

### Field 8: Regeneration Rights Status
- v1.0 (Feb 2026): Detailed breakdown of authorized vs. protected elements, technical parameters
- Future consideration: Add sample images showing regeneration possibilities

### Field 9: Version History
- v1.0 (Feb 2026): Table format (version, date, event, reviewer, notes)
- Future consideration: Move to appendix after 10+ entries; add automated TOS monitoring log

---

## Supporting Documentation Standards

### What's Included in Chain of Title (v1.0):
- All 9 fields fully documented
- Risk Mitigation Summary for buyer legal counsel
- Usage notes and recommended use cases
- Contact information

### What's Referenced But Not Embedded:
- Filmmaker Shopping Agreement (on file with SI8)
- Tool plan receipts (on file with SI8)
- Human Authorship Declaration (on file with SI8)
- Production process screenshots (on file with SI8)
- Rights Verified review checklist (SI8 internal)
- Full prompt logs (available on request under NDA)

**Rationale:** Keep Chain of Title focused on essential buyer information. Full documentation available for qualified buyers or legal disputes.

---

## Template Evolution Principles

**When to update template (minor version):**
- Formatting improvements based on user feedback
- Clarifications that don't change structure
- Field content refinements
- New examples added

**When to create new major version:**
- Structural changes (adding/removing fields)
- Legal counsel recommendations requiring changes
- Platform policy shifts requiring new disclosures
- Regulatory changes (e.g., new AI content laws)

**Backwards compatibility:**
- Existing Chain of Titles (v1.0) remain valid even after template updates
- Major version changes trigger re-review consideration for active catalog entries
- Catalog ID remains permanent; Chain of Title version increments independently

---

## Open Questions (To Resolve in Future Versions)

1. **Format:** Should final buyer-facing Chain of Title be PDF, Markdown, or both?
2. **Length:** Is 12 pages appropriate, or should we create shorter variants?
3. **Automation:** Which fields can be auto-populated from structured data? (Year 3 platform consideration)
4. **Pricing:** Should Chain of Title version/tier affect licensing price? (e.g., Certified vs. Standard)
5. **Updates:** How to handle bulk Chain of Title updates when tool ToS change affects 100+ catalog entries?
6. **Internationalization:** Do non-English Chain of Titles need translation, or is English standard for legal docs?
7. **Interoperability:** Should Chain of Title schema align with C2PA Content Credentials format?

---

**Next Review:** March 2026 (after first 3 real catalog entries and initial buyer feedback)

**Maintained By:** SI8 Operations Team

**Questions/Feedback:** operations@superimmersive8.com
