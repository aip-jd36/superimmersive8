# SI8 Strategic OS — Migration Policy
**Effective date:** July 2, 2026
**Status:** ACTIVE

---

## Strategic OS Effective Date

The SI8 Strategic OS — including the Decision Quality Standards framework, Chief of Staff operating model, and all forward-looking institutional knowledge practices — is effective **July 2, 2026**.

The framework applies forward from this date. It does not apply retroactively to documents created before this date.

---

## What This Means for Historical Documents

Documents, business plans, research, and product work created before July 2, 2026 are historical context. They are preserved as institutional memory and remain accessible in the repository.

They are not subject to the Decision Quality Standards framework.

When referencing pre-Strategic OS material, note:

> *Pre-Strategic OS source — Decision Quality classifications were not applied at time of creation.*

---

## Migration Principles

**Institutional memory should be preserved, not rewritten.**
Historical documents record the reasoning behind decisions that were made. That record has permanent value — for understanding pivots, onboarding advisors, and avoiding repeated mistakes. Rewriting or reorganizing history destroys that record.

**Forward consistency is more valuable than historical consistency.**
Energy spent retrofitting old documents into a new framework is wasted. The framework governs new work. Old work stays as-is.

**Do not reorganize, rename, or retrofit archived or superseded documents.**
Files stay where they are. No new `/archive` folder. No file moves. Git history is the authoritative record of what changed and when — not folder structure.

**Historical content is migrated only when it becomes active again.**
A historical document or concept becomes active only when it is directly cited in current operational work, sales motion, methodology, product development, or an accepted Architecture Decision Record (ADR).

When that happens, migrate only the relevant content — not the entire document.

---

## Document Status Definitions

The CLAUDE.md Key Documents table uses three statuses:

| Status | Meaning |
|--------|---------|
| **ACTIVE** | Currently operational. Used in ongoing work, read regularly, drives decisions. |
| **SUPERSEDED** | Replaced by a newer version or a strategic pivot. Preserved as historical context. Do not treat as current direction. |
| **ARCHIVED** | Served a one-time purpose (e.g., a filing guide, a completed sprint plan). Preserved for reference. Not expected to become active again without explicit reactivation. |

---

## What Is Not Changed

- `01_Business/plans/BUSINESS_PLAN_v1.md` through `v3.md` — stay in place, labeled ARCHIVED or SUPERSEDED in CLAUDE.md
- Any other historical document, research file, or draft — stays where it is
- Git history — not modified

---

## When to Trigger Migration

If you are working with a historical document and find that content needs to become operational again:

1. Extract only the relevant content — do not reactivate the entire document
2. Create a new document in the current structure following Strategic OS conventions
3. Note in the new document: "Migrated from [original path] on [date]. Original created pre-Strategic OS."
4. Update CLAUDE.md Key Documents table to add the new document as ACTIVE
5. Update the original document's status in CLAUDE.md to reflect that the content has been migrated (if appropriate)

---

## Governance

This policy is owned by the Chief of Staff role. Changes require JD approval.
