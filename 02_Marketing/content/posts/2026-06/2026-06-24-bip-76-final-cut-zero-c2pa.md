# LinkedIn Post — #76: The Final Cut Has Zero C2PA. No Tool Fixes This.

**Date:** 2026-06-24
**Platform:** LinkedIn (JD personal page — build in public)
**Type:** Build in Public / Product insight
**Status:** Draft
**Source:** `01_Business/product-discovery/insights/2026-06-24-disclosure-gap.md`
**BIP entry:** #76

---

## LinkedIn Post

We've been watching how C2PA gets discussed in the context of AI video compliance. The narrative goes: model providers embed C2PA at generation, platforms read it on upload and surface a disclosure label to viewers. The chain is complete.

What the narrative skips: what happens to the file in between.

An agency assembles a campaign from four Runway clips and two Kling clips. Premiere Pro. Color grade. Export to MP4. Compress for delivery.

Final file: zero C2PA assertions remaining.

Post-production export strips the metadata. This is not a bug. It's how every production pipeline works. Tools that don't specifically implement Content Credential preservation strip them on export.

We researched the full landscape of C2PA tooling — signing services, audit tools, provenance platforms. Nobody is positioned at the agency delivery step. Signing services target model providers. Audit tools read what's already there.

Model providers close the left side of the chain. Platforms handle the right side.

The agency delivery step — where the final video moves from production to brand to platform — has nothing.

That's the gap. We're building into it.

---

## Notes

- Plain text, no bullets in post body
- No SI8 mention by name — insight stands alone
- Post from JD personal page
- Pairs well with #77 (competitor map) as a two-post sequence this week
