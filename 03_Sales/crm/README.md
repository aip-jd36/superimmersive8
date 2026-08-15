# SI8 CRM data

One markdown file per account/prospect (`{slug}.md`), managed via `pmf-crm-core`
(`tools/crm-core/`). Schema and operational reference:
`tools/crm-core/docs/README.md` and `tools/crm-core/docs/CRM_SPEC.md`.

Separate from `03_Sales/CRM.md`, which is SI8's existing raw campaign-response tracker — a lead
graduates from there into a `{slug}.md` record here only once it reaches a real
booked/requested-type outcome, not on any reply alone. See `pmf-crm-core`'s docs for the
graduation pattern SE uses as a worked example.

This file exists only so git tracks this otherwise-empty directory; delete it once the first
real record is added.
