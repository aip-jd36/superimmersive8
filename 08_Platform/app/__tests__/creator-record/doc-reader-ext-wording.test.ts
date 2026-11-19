/**
 * CR-DOC-READER-EXT-1 (D) — the draft v2 wording candidate and draft candidates pass the existing customer wording lock, label
 * every v2 code exactly, and are not registered anywhere. Existing approved template sets are unchanged.
 */
import { violatesCustomerWordingLock, violatesDependencyLabelLock } from '@/lib/creator-record/contract/wording-lock'
import { V2_WORDING_CANDIDATE, V2_WORDING_CANDIDATE_STATUS } from '@/lib/creator-record/integrated-assessment/v2-wording-candidate'
import { DEPENDENCY_DOCUMENT_REASONS, DEPENDENCY_DOCUMENT_STATUSES } from '@/lib/creator-record/integrated-assessment/vocabulary-v2'
import { CANDIDATE_DEPENDENCY_LABELS, CANDIDATE_LEDGER_ENTRIES } from '@/lib/creator-record/governed/candidates/cr-doc-reader-ext-1'
import { approvedPdfTemplates } from '@/lib/creator-record/customer-flow/approved-inputs'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const strings = (v: unknown): string[] => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [])

describe('draft v2 wording candidate', () => {
  test('draft status; labels exactly every v2 status and reason', () => {
    expect(V2_WORDING_CANDIDATE_STATUS).toMatch(/NOT APPROVED, NOT REGISTERED/)
    expect(Object.keys(V2_WORDING_CANDIDATE.status_labels).sort()).toEqual([...DEPENDENCY_DOCUMENT_STATUSES].sort())
    expect(Object.keys(V2_WORDING_CANDIDATE.reason_labels).sort()).toEqual([...DEPENDENCY_DOCUMENT_REASONS].sort())
  })
  test('passes the customer wording lock and never claims satisfaction, sufficiency or a check', () => {
    for (const s of strings(V2_WORDING_CANDIDATE)) {
      expect(violatesCustomerWordingLock(s)).toBe(false)
      expect(s).not.toMatch(/\b(satisfied|sufficient|confirms|proves|valid licence|you hold the licence)\b/i)
    }
    expect(V2_WORDING_CANDIDATE.intro).toMatch(/No person at SI8 checked it/)
    expect(V2_WORDING_CANDIDATE.association).toMatch(/because of the document type you chose/)
    expect(V2_WORDING_CANDIDATE.open_dependency).toMatch(/remains open/)
  })
  test('the candidate ledger text and dependency labels pass the lock', () => {
    for (const e of CANDIDATE_LEDGER_ENTRIES) for (const s of [e.explanation as string, ...Object.values(e.evidence_notes)]) expect(violatesCustomerWordingLock(s)).toBe(false)
    for (const l of Object.values(CANDIDATE_DEPENDENCY_LABELS)) {
      expect(violatesCustomerWordingLock(l)).toBe(false)
      expect(violatesDependencyLabelLock(l)).toBe(false)
    }
  })
  test('not registered: no template set or production module references the candidate or method v2', () => {
    const sets = JSON.stringify(approvedPdfTemplates())
    expect(sets).not.toMatch(/"version":2.*integrated-assessment|How your documents relate/)
    const sources = readFileSync(path.join(__dirname, '../../lib/creator-record/governed/sources.ts'), 'utf8')
    // CR-DOC-READER-EXT-6E: the published ledger names its source drafts in a comment; nothing is imported from them.
    expect(sources).not.toMatch(/^import[^\n]*(v2-wording-candidate|assess-v2|cr-doc-reader-ext-1)/m)
  })
})
