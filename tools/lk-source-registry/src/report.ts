/**
 * Coverage and consistency report (PRD FR-20 to FR-23, FR-21a, AC-5, AC-5a).
 * Pure: builds text from the registry, the evidence and the validation
 * result. It writes nothing.
 *
 * Every statement here is an observation about records. None says that a
 * claim is valid, current, stale or cleared.
 */

import type { Evidence, Registry, ValidationResult } from './model.ts'

export const MAPPING_LIMIT_NOTE = 'other dependencies may exist'
export const MATRIX_SECTION_TITLE = 'CRC-reachable, not monitored (Legacy Matrix)'
export const MATRIX_SECTION_NOTE =
  'Observation only. These Legacy Matrix claims are marked CRC-eligible in the Matrix runtime fixture and are outside source monitoring (OPEN-8). ' +
  'A change to a source behind one of them is not detected by this monitor. This list makes no statement about whether any claim is valid, current or stale, and is not a governance decision.'

export interface MatrixCoverageRow {
  claim_id: string
  row_id: string
  last_verified: string | null
}

/** FR-21a: exactly the Matrix claims marked CRC-eligible, read from the fixture on every run. */
export function matrixNotMonitored(ev: Evidence): MatrixCoverageRow[] {
  const out: MatrixCoverageRow[] = []
  for (const row of ev.matrix) {
    for (const c of row.claims) if (c.crc_eligible === 'Yes') out.push({ claim_id: c.claim_id, row_id: row.identifier, last_verified: row.last_verified })
  }
  return out.sort((a, b) => a.claim_id.localeCompare(b.claim_id))
}

/** FR-21: CRC-reachable governed claims that no registered source is related to. */
export function governedNotCovered(reg: Registry, ev: Evidence): string[] {
  const mapped = new Set(reg.relationships.map((r) => r.claim_ref))
  return ev.runtime
    .filter((c) => c.lifecycle === 'Adopted' && c.crc_eligible === 'Yes' && !mapped.has(c.claim_id))
    .map((c) => c.claim_id)
    .sort()
}

function confirmation(by: string | null, on: string | null): string {
  return by && on ? `confirmed by ${by} on ${on}; ${MAPPING_LIMIT_NOTE}` : `NOT CONFIRMED by a named human; ${MAPPING_LIMIT_NOTE}`
}

export function renderReport(reg: Registry | null, ev: Evidence, result: ValidationResult): string {
  const L: string[] = []
  L.push('# Living Knowledge source registry: validation and coverage report', '')
  L.push(`Verdict: ${result.verdict}`)
  L.push('Offline run. No source was retrieved, no baseline exists, and no governed file was read for anything but comparison.', '')

  const errors = result.issues.filter((i) => i.severity === 'error')
  const pending = result.issues.filter((i) => i.severity === 'pending')
  L.push(`## Validation errors (${errors.length})`, '')
  if (errors.length === 0) L.push('(none)')
  for (const i of errors) L.push(`- [${i.code}] ${i.where}: ${i.message}`)
  L.push('', `## Awaiting human confirmation (${pending.length})`, '')
  if (pending.length === 0) L.push('(none)')
  for (const i of pending) L.push(`- [${i.code}] ${i.where}: ${i.message}`)
  L.push('')

  if (reg && result.verdict !== 'INVALID') {
    const runtime = new Map(ev.runtime.map((c) => [c.claim_id, c]))
    L.push(`## Registered sources (${reg.sources.length})`, '')
    for (const s of reg.sources) {
      const scope = s.scope.kind === 'none' ? 'no tool or provider scope' : `${s.scope.kind} "${s.scope.id}"`
      L.push(`### ${s.source_id}`)
      L.push(`${s.name} | ${s.source_class} | ${s.retrieval_method} | ${scope} | baseline: ${s.baseline ? `accepted by ${s.baseline.accepted_by} on ${s.baseline.accepted_on}` : 'none accepted'}`)
      const rels = reg.relationships.filter((r) => r.source_id === s.source_id)
      if (rels.length === 0) L.push('- No dependent claim is on record for this source.')
      for (const r of rels) {
        const rt = runtime.get(r.claim_ref)
        const cr = ev.creatorRecord.filter((e) => e.claim_id === r.claim_ref)
        const crText = cr.length ? cr.map((e) => `${e.entry_id} (eligible: ${e.creator_record_eligible}, refresh by: ${e.refresh_by ?? 'not set'})`).join('; ') : 'none'
        L.push(`- ${r.claim_ref} | ledger lifecycle: ${ev.ledger.get(r.claim_ref) ?? 'not in ledger'} | CRC-eligible: ${rt ? rt.crc_eligible : 'no runtime representation'} | Creator Record ledger entries: ${crText}`)
        L.push(`  basis: ${r.basis_path} (${r.basis_note})`)
        L.push(`  ${confirmation(r.confirmed_by, r.confirmed_on)}`)
      }
      for (const x of reg.exclusions.filter((e) => e.source_id === s.source_id)) {
        L.push(`- excluded: ${x.claim_ref}${ev.ledger.has(x.claim_ref) ? '' : ' (not in the ledger)'} | reason: ${x.reason}`)
        L.push(`  ${confirmation(x.confirmed_by, x.confirmed_on)}`)
      }
      L.push('')
    }

    const uncovered = governedNotCovered(reg, ev)
    L.push(`## CRC-eligible governed claims with no registered source (${uncovered.length})`, '')
    L.push(`Information, not a failure. The mapping is confirmed only for the sources listed above; ${MAPPING_LIMIT_NOTE}.`, '')
    if (uncovered.length === 0) L.push('(none)')
    for (const id of uncovered) L.push(`- ${id}`)
    L.push('')
  }

  const matrix = matrixNotMonitored(ev)
  L.push(`## ${MATRIX_SECTION_TITLE} (${matrix.length})`, '')
  L.push(MATRIX_SECTION_NOTE, '')
  if (matrix.length === 0) L.push('(none: no Legacy Matrix claim is marked CRC-eligible)')
  for (const m of matrix) L.push(`- ${m.claim_id} | row: ${m.row_id} | row last verified: ${m.last_verified ?? 'not recorded'}`)
  L.push('')
  return L.join('\n')
}
