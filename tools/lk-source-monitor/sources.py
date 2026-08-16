# SI8 Living Knowledge — Source Monitor allowlist (LK Phase 1, 2026-08-16).
#
# Exactly two sources, per PM's Phase E approval. Adding a third source is a
# deliberate decision, not a config tweak -- edit this file and note the
# addition in 06_Operations/institutional-knowledge/lk-automation/README.md.

SOURCES = [
    {
        "id": "uscoai-ai-page",
        "name": "U.S. Copyright Office — AI Initiative page",
        "kind": "html",
        "url": "https://www.copyright.gov/ai/",
        "notes": "Landing page for the USCO AI and Copyright report series (Parts 1-3), registration guidance, and related materials. No structured feed exists for this page; monitored by content hash.",
    },
    {
        "id": "federal-register-copyright-office",
        "name": "Federal Register — U.S. Copyright Office documents",
        "kind": "json",
        "url": "https://www.federalregister.gov/api/v1/documents.json?conditions%5Bagencies%5D%5B%5D=copyright-office-library-of-congress&order=newest&per_page=10",
        "notes": "Official Federal Register API, no key required. Filtered to the Copyright Office / Library of Congress agency, newest first.",
    },
]
