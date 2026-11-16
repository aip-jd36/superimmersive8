/**
 * CR-DESIGN-2D — release identity verification. Recomputes, from the REGISTERED Production governance bundle (what
 * `approvedPdfTemplates` selects at issuance), every identity the founder authorised, and exits 1 on any mismatch.
 * Usage: tsx test-support/cr-design-2b/verify-release-identities.ts [--before]
 *   --before: expects today's release (v4/v5 approved, -pdf-v3); default expects the CR-DESIGN-2D release.
 */
import { approvedPdfTemplates } from '@/lib/creator-record/customer-flow/approved-inputs'
import { INSTITUTIONAL_TRUST_PRESENTATION, presentationFingerprint } from '@/lib/creator-record/customer-pdf/presentation/institutional-trust'
import { templateFingerprint } from '@/lib/creator-record/customer-pdf/templates'
import { CREATOR_RECORD_PDF_TEMPLATE_SETS } from '@/lib/creator-record/governed/sources'
import { CREATOR_RECORD_V2_GENERATOR_VERSION } from '@/lib/creator-record-artifacts/renderers'

const before = process.argv.includes('--before')
const AUTHORISED = {
  7: { version: 6, fingerprint: 'a0cd0c248ce270d2826712910aa606579ce429f7923b051d68a0502c5305f476' },
  8: { version: 7, fingerprint: '5d7ccfc8ce824e57f6e904d51f1027b59e43ab250a7f4895b0f804debe1761ab' },
} as const
const CURRENT = {
  7: { version: 4, fingerprint: 'd4ecf3f39487ed43ce6c5e621d988d6525b638c952a8c5ead01e0cc9b8504f7e' },
  8: { version: 5, fingerprint: 'a27e23cdbc1b12c16330b9518bba210b218bb0e8807e53ac164d6673ec873408' },
} as const
const PRESENTATION = 'aa50507b4f76e8168744d88645220735e8b7820577e7be72e19c83dbedc017db'
const GENERATOR = before ? 'creator-record-v2-pdf-v3' : 'creator-record-v2-pdf-v4'

const problems: string[] = []
const out: Record<string, unknown> = { expecting: before ? 'current release (v4/v5, -pdf-v3)' : 'CR-DESIGN-2D (v6/v7, -pdf-v4)' }
const pres = presentationFingerprint(INSTITUTIONAL_TRUST_PRESENTATION)
out.presentation = pres
if (pres !== PRESENTATION) problems.push(`presentation fingerprint ${pres}`)
for (const schema of [7, 8] as const) {
  const want = before ? CURRENT[schema] : AUTHORISED[schema]
  const sel = approvedPdfTemplates(undefined, { id: 'si8/creator-record-v2-record', version: schema })
  const t = sel.templates as Record<string, any> | null
  const fp = t ? templateFingerprint(t) : null
  out[`schema${schema}`] = { selected_version: sel.approval?.version, recomputed: fp, approval_fingerprint: sel.approval?.fingerprint, lifecycle: sel.approval?.lifecycle, authority: sel.approval?.authority, decision_date: sel.approval?.decision_date, review_ref: sel.approval?.review_ref, presentation_ref: t?.presentation ?? null }
  if (sel.approval?.version !== want.version || fp !== want.fingerprint || sel.approval?.fingerprint !== want.fingerprint || sel.approval?.lifecycle !== 'approved') problems.push(`schema ${schema}: selected v${sel.approval?.version} ${fp}`)
  if (!before && t?.presentation?.fingerprint !== PRESENTATION) problems.push(`schema ${schema}: presentation reference`)
  // Exactly one approved set per schema; the previous sets stay registered (superseded), unchanged.
  const forSchema = CREATOR_RECORD_PDF_TEMPLATE_SETS.filter((s) => (s.approval as { record_schema: { version: number } }).record_schema.version === schema)
  const approved = forSchema.filter((s) => (s.approval as { lifecycle: string }).lifecycle === 'approved')
  if (approved.length !== 1) problems.push(`schema ${schema}: ${approved.length} approved sets`)
  if (!before) {
    const prev = forSchema.find((s) => (s.approval as { version: number }).version === CURRENT[schema].version)
    if (!prev || (prev.approval as { lifecycle: string }).lifecycle !== 'superseded' || templateFingerprint(prev.templates) !== CURRENT[schema].fingerprint) problems.push(`schema ${schema}: v${CURRENT[schema].version} not preserved as superseded`)
  }
}
out.generator = CREATOR_RECORD_V2_GENERATOR_VERSION
if (CREATOR_RECORD_V2_GENERATOR_VERSION !== GENERATOR) problems.push(`generator ${CREATOR_RECORD_V2_GENERATOR_VERSION}`)
out.problems = problems
process.stdout.write(JSON.stringify(out, null, 1) + '\n')
process.exit(problems.length ? 1 : 0)
