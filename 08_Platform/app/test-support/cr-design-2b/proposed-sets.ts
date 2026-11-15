/**
 * CR-DESIGN-2B — TEST ONLY (never imported by application code). The PROPOSED v6 (schema 7) and v7 (schema 8) PDF template sets:
 * the registered v4 / v5 sets, carried VERBATIM, plus exactly three additions (founder FD-1, FD-6, FD-9):
 *   - `presentation`: the Institutional Trust presentation, by contract, version and fingerprint;
 *   - `navigation.contents_heading`: C-1 "What this record contains";
 *   - `navigation.caveats_pointer`: C-3 "See 'Please note' below.";
 * and `version` 6 / 7. Nothing else differs (`proposalDiff` proves it).
 *
 * The proposals are written to `lib/creator-record/governed/proposals/CR-PDF-TEMPLATES-v{6,7}-*.proposal.json` with lifecycle
 * `pending` and no authority. They are registered NOWHERE: `governed/sources.ts` does not read them, so `approvedPdfTemplates`
 * cannot select them and no Production path can render with them. Tests render them only under the synthetic approval below.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { templateFingerprint, type PdfTemplateApproval } from '@/lib/creator-record/customer-pdf/templates'
import { INSTITUTIONAL_TRUST_PRESENTATION, presentationFingerprint } from '@/lib/creator-record/customer-pdf/presentation/institutional-trust'
import { registeredPdfTemplateSet, CUTOVER_FINGERPRINTS, CUTOVER_VERSIONS } from '@/test-support/registered-template-sets'

export const PROPOSED_2B_VERSIONS = { 7: 6, 8: 7 } as const
export const CONTENTS_HEADING = 'What this record contains'
export const CAVEATS_POINTER = "See 'Please note' below."
export const PROPOSAL_STATUS = 'PROPOSED — NOT APPROVED (CR-DESIGN-2B). Pending. Registered nowhere. Carries the approved v4/v5 wording verbatim plus the presentation reference and the two navigational strings approved in principle by founder decision FD-6 (CR-DESIGN-2A). Requires founder approval of this exact set and fingerprint, and a separate release decision (CR-DESIGN-2C), before registration.'
export const SYNTHETIC_2B_AUTHORITY = 'SYNTHETIC TEST APPROVAL — CR-DESIGN-2B review render — NOT A RELEASE APPROVAL'

const PROPOSALS_DIR = join(__dirname, '../../lib/creator-record/governed/proposals')
export const proposalFile = (schema: 7 | 8) => join(PROPOSALS_DIR, `CR-PDF-TEMPLATES-v${PROPOSED_2B_VERSIONS[schema]}-schema${schema}.proposal.json`)

/** Builds the proposed set from the registered base (deterministic). */
export function buildProposedSet(schema: 7 | 8): Record<string, unknown> {
  const base = registeredPdfTemplateSet(schema, CUTOVER_VERSIONS[schema])
  if (templateFingerprint(base.templates) !== CUTOVER_FINGERPRINTS[schema]) throw new Error('base set changed')
  return {
    ...(JSON.parse(JSON.stringify(base.templates)) as Record<string, unknown>),
    version: PROPOSED_2B_VERSIONS[schema],
    presentation: { contract: INSTITUTIONAL_TRUST_PRESENTATION.contract, version: INSTITUTIONAL_TRUST_PRESENTATION.version, fingerprint: presentationFingerprint(INSTITUTIONAL_TRUST_PRESENTATION) },
    navigation: { contents_heading: CONTENTS_HEADING, caveats_pointer: CAVEATS_POINTER },
  }
}

export interface ProposalFile {
  status: string
  schema: 7 | 8
  base: { template_id: string; version: number; fingerprint: string }
  presentation_fingerprint: string
  fingerprints: { pdf: string }
  proposed_approval: Omit<PdfTemplateApproval, 'authority' | 'decision_date'> & { authority: null; decision_date: null }
  templates: Record<string, unknown>
}

export function proposalFileContent(schema: 7 | 8): ProposalFile {
  const templates = buildProposedSet(schema)
  const fingerprint = templateFingerprint(templates)
  return {
    status: PROPOSAL_STATUS,
    schema,
    base: { template_id: 'si8/creator-record-v2-pdf-templates', version: CUTOVER_VERSIONS[schema], fingerprint: CUTOVER_FINGERPRINTS[schema] },
    presentation_fingerprint: presentationFingerprint(INSTITUTIONAL_TRUST_PRESENTATION),
    fingerprints: { pdf: fingerprint },
    proposed_approval: { template_id: 'si8/creator-record-v2-pdf-templates', version: PROPOSED_2B_VERSIONS[schema], fingerprint, record_schema: { id: 'si8/creator-record-v2-record', version: schema }, lifecycle: 'pending', authority: null, decision_date: null, review_ref: null },
    templates,
  }
}

/** The proposal as committed (read from disk). */
export const readProposal = (schema: 7 | 8): ProposalFile => JSON.parse(readFileSync(proposalFile(schema), 'utf8')) as ProposalFile

/** TEST ONLY: the committed proposal under a synthetic approval, to render review PDFs. Never registered. */
export function syntheticallyApproved2B(schema: 7 | 8): { templates: Record<string, unknown>; approval: PdfTemplateApproval } {
  const p = readProposal(schema)
  return { templates: p.templates, approval: { ...p.proposed_approval, lifecycle: 'approved', authority: SYNTHETIC_2B_AUTHORITY, decision_date: '2026-11-15', review_ref: 'CR-DESIGN-2B-REVIEW' } }
}

/** Every path at which the proposed set differs from its registered base. */
export function proposalDiff(schema: 7 | 8): string[] {
  const base = registeredPdfTemplateSet(schema, CUTOVER_VERSIONS[schema]).templates
  const next = readProposal(schema).templates
  const out: string[] = []
  const walk = (a: unknown, b: unknown, p: string) => {
    if (JSON.stringify(a) === JSON.stringify(b)) return
    if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) walk((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], p ? `${p}.${k}` : k)
    } else out.push(p)
  }
  walk(base, next, '')
  return out.sort()
}
