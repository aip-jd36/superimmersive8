/**
 * CR-V2-MVP-APPROVAL-AND-RELEASE-1 — test fixtures only (never imported by application code). The PDF template sets AS REGISTERED,
 * found by schema and version, whichever of them `approvedPdfTemplates` selects now.
 *
 * Before the cutover the live sets are schema 7 v1 and schema 8 v3; the cutover marks both `superseded` (content and fingerprint
 * unchanged) and registers v4 / v5. Tests that pin the historical layout (legacy byte identity, the proposed-set builder's base,
 * the 14-case baseline) read the historical set here instead of "whatever is approved today".
 */
import { type PdfTemplateApproval } from '@/lib/creator-record/customer-pdf/templates'
import { CREATOR_RECORD_PDF_TEMPLATE_APPROVAL, CREATOR_RECORD_PDF_TEMPLATES, CREATOR_RECORD_PDF_TEMPLATE_SETS } from '@/lib/creator-record/governed/sources'

/** The sets that were live before the cutover. */
export const PRE_CUTOVER_VERSIONS = { 7: 1, 8: 3 } as const
export const PRE_CUTOVER_FINGERPRINTS = { 7: 'c5fe2a21ec8a096c6abf7eccf0bd55f3103401e10a26512052e5d2ee15a11c6c', 8: '287de01d8dc365e4e7c62ab0ea25fdce0b824b26e31367560b85b2f9e779c1b5' } as const
/** The reading-layout sets the cutover registers (frozen by CR-PDF-RELEASE-FIX-1). */
export const CUTOVER_VERSIONS = { 7: 4, 8: 5 } as const
export const CUTOVER_FINGERPRINTS = { 7: 'd4ecf3f39487ed43ce6c5e621d988d6525b638c952a8c5ead01e0cc9b8504f7e', 8: 'a27e23cdbc1b12c16330b9518bba210b218bb0e8807e53ac164d6673ec873408' } as const

type TemplateSet = { templates: Record<string, unknown>; approval: PdfTemplateApproval }

/** Exactly one registered set for this schema and version (throws otherwise). */
export function registeredPdfTemplateSet(schema: 7 | 8, version: number): TemplateSet {
  const all = [{ templates: CREATOR_RECORD_PDF_TEMPLATES, approval: CREATOR_RECORD_PDF_TEMPLATE_APPROVAL }, ...CREATOR_RECORD_PDF_TEMPLATE_SETS]
  const m = all.filter((s) => s.approval?.record_schema?.version === schema && s.approval.version === version)
  if (m.length !== 1) throw new Error(`registered template set schema ${schema} v${version}: ${m.length} found`)
  return m[0] as TemplateSet
}

/**
 * The pre-cutover live set (schema 7 v1 / schema 8 v3), as it rendered while it was the approved set: its registered templates and
 * approval, with the lifecycle it had then. Used only to prove historical rendering is unchanged.
 */
export function preCutoverLiveSet(schema: 7 | 8): TemplateSet {
  const s = registeredPdfTemplateSet(schema, PRE_CUTOVER_VERSIONS[schema])
  return { templates: s.templates, approval: { ...s.approval, lifecycle: 'approved' } }
}
