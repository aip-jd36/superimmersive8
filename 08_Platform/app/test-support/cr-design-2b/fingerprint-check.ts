/**
 * CR-DESIGN-2C — TEST ONLY. Recomputes the final v6/v7 template and presentation fingerprints from the code and prints them with the
 * committed proposal values, the base (approved v4/v5) fingerprints and the font hashes, for the acceptance record.
 * Usage: tsx test-support/cr-design-2b/fingerprint-check.ts
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { INSTITUTIONAL_TRUST_PRESENTATION, presentationFingerprint } from '@/lib/creator-record/customer-pdf/presentation/institutional-trust'
import { templateFingerprint } from '@/lib/creator-record/customer-pdf/templates'
import { CUTOVER_VERSIONS, registeredPdfTemplateSet } from '@/test-support/registered-template-sets'
import { proposalDiff, proposalFileContent, readProposal } from './proposed-sets'

const out: Record<string, unknown> = { presentation_recomputed: presentationFingerprint(INSTITUTIONAL_TRUST_PRESENTATION) }
for (const schema of [7, 8] as const) {
  const p = readProposal(schema)
  const base = registeredPdfTemplateSet(schema, CUTOVER_VERSIONS[schema])
  out[`schema${schema}`] = {
    proposal_version: p.templates.version, lifecycle: p.proposed_approval.lifecycle, authority: p.proposed_approval.authority,
    committed_pdf_fingerprint: p.fingerprints.pdf, recomputed_pdf_fingerprint: templateFingerprint(p.templates),
    builder_identical_to_committed: JSON.stringify(proposalFileContent(schema)) === JSON.stringify(p),
    presentation_reference: p.templates.presentation, differs_from_base_only_in: proposalDiff(schema),
    base_version: CUTOVER_VERSIONS[schema], base_fingerprint: templateFingerprint(base.templates),
  }
}
const dir = join(process.cwd(), 'lib', 'creator-record', 'customer-pdf', 'fonts')
const f = INSTITUTIONAL_TRUST_PRESENTATION.fonts
out.fonts = [...f.display.files, ...f.body.files, ...f.mono.files, f.fallback].map((x) => ({ file: x.file, pinned: x.sha256, actual: createHash('sha256').update(readFileSync(join(dir, x.file))).digest('hex') }))
process.stdout.write(JSON.stringify(out, null, 1))
