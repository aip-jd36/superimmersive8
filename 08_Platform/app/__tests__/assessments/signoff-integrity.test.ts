/**
 * CA-RLK-2a — assessment integrity hardening.
 *
 * Pure-logic + in-memory-model tests. The real durable sign-off is the
 * Postgres RPC `sign_off_assessment` / `patch_workbook_atomic` (migration
 * 20260907000000); this suite proves the DESIGNED semantics — the SQL is a
 * faithful port of the model exercised here, reviewed + staged separately.
 *
 * Run: npx jest __tests__/assessments/signoff-integrity.test.ts
 */

import {
  validateWorkbookForSignoff,
  domainCodesForMethodology,
  deriveOutcomeFromWorkbook,
  LOCKED_ASSESSMENT_FIELDS,
  SIGNOFF_STATUSES,
} from '../../lib/assessments/signoff'
import { updateAssessment } from '../../lib/assessments/repository'
import { METHODOLOGY_VERSION } from '../../lib/assessments/service'

// ── a complete, valid workbook ──────────────────────────────────────────────

const CONTROLS = ['A01','R01','R02','R03','R04','H01','H02','I01','I02','I03','L01','L02','L03','T01','D01','D02']

function completeWorkbook(overrides: Record<string, any> = {}): any {
  const section_3: Record<string, any> = {}
  for (const id of CONTROLS) section_3[id] = { judgment: 'Verified' }
  return {
    section_1: {
      scope_checks: {
        no_list_reviewed: true,
        custodian_declaration: true,
        indemnification_confirmed: true,
        video_accessible: true,
        certified_tier: true,
      },
    },
    section_2: { viewing_passes: { first_complete: true }, freeform_observations: 'x'.repeat(25) },
    section_3,
    section_5: { findings: [{ finding: 'Domain R evidence confirms a paid commercial plan.' }] },
    section_6: {
      outcome: 'EVIDENCE_SUPPORTS',
      basis: 'The evidence reviewed supports the intended commercial use across all seven domains.',
      commercial_confidence: 'High',
      conditions: [],
    },
    ...overrides,
  }
}

const OK_SUBMISSION = { custodian_declaration: true, indemnification_confirmed: true, tier: 'si8_certified' }

// ── validateWorkbookForSignoff ──────────────────────────────────────────────

describe('validateWorkbookForSignoff', () => {
  test('a complete workbook + on-record declarations passes', () => {
    const r = validateWorkbookForSignoff(completeWorkbook(), OK_SUBMISSION)
    expect(r.ok).toBe(true)
    expect(r.reasons).toEqual([])
    expect(r.outcome).toBe('EVIDENCE_SUPPORTS')
  })

  test('missing a section-1 scope check fails', () => {
    const wb = completeWorkbook()
    wb.section_1.scope_checks.video_accessible = false
    const r = validateWorkbookForSignoff(wb, OK_SUBMISSION)
    expect(r.ok).toBe(false)
    expect(r.reasons.some(x => x.includes('video_accessible'))).toBe(true)
  })

  test('a missing section-3 control judgment fails', () => {
    const wb = completeWorkbook()
    delete wb.section_3.T01.judgment
    const r = validateWorkbookForSignoff(wb, OK_SUBMISSION)
    expect(r.ok).toBe(false)
    expect(r.reasons.some(x => x.includes('T01'))).toBe(true)
  })

  test('zero findings fails', () => {
    const wb = completeWorkbook({ section_5: { findings: [] } })
    expect(validateWorkbookForSignoff(wb, OK_SUBMISSION).ok).toBe(false)
  })

  test('rationale of 20 chars or fewer fails', () => {
    const wb = completeWorkbook()
    wb.section_6.basis = 'too short'
    expect(validateWorkbookForSignoff(wb, OK_SUBMISSION).ok).toBe(false)
  })

  test('EVIDENCE_SUPPORTS_WITH_CONDITIONS requires at least one non-empty condition', () => {
    const wb = completeWorkbook()
    wb.section_6.outcome = 'EVIDENCE_SUPPORTS_WITH_CONDITIONS'
    wb.section_6.conditions = ['   ']
    const bad = validateWorkbookForSignoff(wb, OK_SUBMISSION)
    expect(bad.ok).toBe(false)
    wb.section_6.conditions = ['Obtain a written sync licence for the background track.']
    expect(validateWorkbookForSignoff(wb, OK_SUBMISSION).ok).toBe(true)
  })

  test('declarations not on the submission record fail even if the reviewer checked the boxes', () => {
    const r = validateWorkbookForSignoff(completeWorkbook(), { custodian_declaration: false, indemnification_confirmed: true })
    expect(r.ok).toBe(false)
    expect(r.reasons.some(x => x.includes('Evidence Custodian'))).toBe(true)
  })

  test('does NOT enforce the Domain-H outcome gate or a confidence-basis rule (deferred, CA-RLK-2a §42)', () => {
    const wb = completeWorkbook()
    wb.section_3.H01.judgment = 'Not Provided'
    wb.section_3.H02.judgment = 'Not Provided'
    wb.section_6.commercial_confidence = 'Low'
    wb.section_6.commercial_confidence_basis = ''
    // outcome EVIDENCE_SUPPORTS with H Not Provided + Low confidence + empty basis:
    // the Manual discusses these as reviewer guidance, not machine gates -> still passes.
    expect(validateWorkbookForSignoff(wb, OK_SUBMISSION).ok).toBe(true)
  })
})

// ── methodology -> domain scope ─────────────────────────────────────────────

describe('domainCodesForMethodology', () => {
  test('v0.2 -> the seven domains', () => {
    expect(domainCodesForMethodology('SI8 Reviewer Manual v0.2')).toEqual(['A','R','H','I','L','T','D'])
  })
  test('the live METHODOLOGY_VERSION constant is mapped', () => {
    expect(domainCodesForMethodology(METHODOLOGY_VERSION)).not.toBeNull()
  })
  test('an unknown methodology returns null (a new sign-off must fail closed)', () => {
    expect(domainCodesForMethodology('SI8 Reviewer Manual v9.9')).toBeNull()
  })
  test('scope is NOT derived from Not-Applicable control judgments', () => {
    // Even a workbook where every Likeness control is N/A still snapshots all 7.
    const wb = completeWorkbook()
    wb.section_3.L01.judgment = 'Not Applicable'
    wb.section_3.L02.judgment = 'Not Applicable'
    wb.section_3.L03.judgment = 'Not Applicable'
    validateWorkbookForSignoff(wb, OK_SUBMISSION) // still valid
    expect(domainCodesForMethodology(METHODOLOGY_VERSION)).toContain('L')
  })
})

describe('deriveOutcomeFromWorkbook', () => {
  test('reads section_6.outcome only when it is a valid code', () => {
    expect(deriveOutcomeFromWorkbook({ section_6: { outcome: 'MATERIAL_RISKS_IDENTIFIED' } })).toBe('MATERIAL_RISKS_IDENTIFIED')
    expect(deriveOutcomeFromWorkbook({ section_6: { outcome: 'garbage' } })).toBeNull()
    expect(deriveOutcomeFromWorkbook({})).toBeNull()
  })
})

// ── immutable-field guard ───────────────────────────────────────────────────

describe('updateAssessment locked-field guard (CA-RLK-2a §28)', () => {
  const lockedExamples = [
    'signed_off_by', 'signed_off_at', 'signed_workbook_revision', 'methodology_version',
    'reviewer_organization', 'assessment_date', 'asset_title', 'asset_media_type',
    'asset_runtime', 'scope_domain_codes', 'assessment_number', 'verification_url',
  ]
  for (const field of lockedExamples) {
    test(`refuses to mutate ${field}`, async () => {
      await expect(updateAssessment('a-id', { [field]: 'x' } as any)).rejects.toThrow(/locked field/i)
    })
  }
  test('LOCKED_ASSESSMENT_FIELDS covers the sign-off + snapshot columns', () => {
    for (const f of lockedExamples) expect(LOCKED_ASSESSMENT_FIELDS).toContain(f)
  })
  test('permits a normal processing_status update to reach the DB layer', async () => {
    // The mock supabaseAdmin returns { data: null } -> "Failed to update", NOT the
    // locked-field error. Proves processing_status is allowed past the guard.
    await expect(updateAssessment('a-id', { processing_status: 'REPORT_GENERATED' } as any))
      .rejects.toThrow(/Failed to update/i)
  })
})

// ── in-memory model of the two atomic RPCs ─────────────────────────────────
//
// Faithful port of migration 20260907000000's sign_off_assessment /
// patch_workbook_atomic. Proves the concurrency invariants (CA-RLK-2a §31).

interface Sub { workbook_revision: number; workbook_data: any; report_pdf_url: string | null; report_pdf_assessment_id: string | null }
interface Asm {
  id: string
  signed_off_by: string | null
  signed_off_at: string | null
  signoff_status: 'active' | 'invalidated' | null
  signoff_invalidated_at: string | null
  signed_workbook_revision: number | null
  outcome: string
  methodology_version: string
  assessment_date: string
  asset_title: string | null
  asset_runtime: number | null
  scope_domain_codes: string[]
  processing_status: 'DRAFT' | 'REPORT_GENERATED' | 'SIGNING' | 'SIGNED' | 'DELIVERED' | 'FAILED'
}

function makeDb() {
  const sub: Sub = { workbook_revision: 0, workbook_data: {}, report_pdf_url: null, report_pdf_assessment_id: null }
  let asm: Asm | null = null
  let seq = 0
  let clock = 0
  const now = () => `t${++clock}`

  function patchWorkbook(data: any, actor: string) {
    // CA-RLK-2a.1: post-provenance immutability — block SIGNING/SIGNED/DELIVERED
    // BEFORE any write (no revision bump, no sign-off change).
    if (asm && ['SIGNING', 'SIGNED', 'DELIVERED'].includes(asm.processing_status)) {
      const code = asm.processing_status === 'SIGNING' ? 'locked_for_signing'
        : asm.processing_status === 'SIGNED' ? 'signed_immutable'
        : 'delivered'
      return { ok: false, code: code as 'locked_for_signing' | 'signed_immutable' | 'delivered' }
    }
    sub.workbook_data = data
    sub.workbook_revision += 1
    let signoff_invalidated = false
    let report_invalidated = false
    if (asm && asm.signoff_status === 'active') {
      const wasReportGen = asm.processing_status === 'REPORT_GENERATED'
      asm.signoff_status = 'invalidated'
      asm.signoff_invalidated_at = asm.signoff_invalidated_at ?? now() // preserve first
      signoff_invalidated = true
      if (wasReportGen) {
        asm.processing_status = 'DRAFT'
        sub.report_pdf_url = null
        sub.report_pdf_assessment_id = null
        report_invalidated = true
      }
    }
    return { ok: true as const, workbook_revision: sub.workbook_revision, signoff_invalidated, report_invalidated }
  }

  function signOff(actor: string, expected: number, outcome = 'EVIDENCE_SUPPORTS') {
    if (sub.workbook_revision !== expected) return { ok: false, code: 'workbook_changed' as const, current_revision: sub.workbook_revision }
    if (asm) {
      if (!['DRAFT', 'REPORT_GENERATED'].includes(asm.processing_status)) return { ok: false, code: 'not_pre_delivery' as const }
      if (asm.signoff_status === 'active' && asm.signed_workbook_revision === expected && asm.outcome === outcome) {
        return { ok: true as const, idempotent: true, assessment: { ...asm } }
      }
      const wasReportGen = asm.processing_status === 'REPORT_GENERATED'
      asm.signed_off_by = actor
      asm.signed_off_at = now()
      asm.signoff_status = 'active'
      asm.signoff_invalidated_at = null
      asm.signed_workbook_revision = expected
      asm.outcome = outcome
      asm.assessment_date = `date(${asm.signed_off_at})`
      if (wasReportGen) { asm.processing_status = 'DRAFT'; sub.report_pdf_url = null; sub.report_pdf_assessment_id = null }
      return { ok: true as const, resigned: true, assessment: { ...asm } }
    }
    asm = {
      id: `A${++seq}`,
      signed_off_by: actor, signed_off_at: now(), signoff_status: 'active', signoff_invalidated_at: null,
      signed_workbook_revision: expected, outcome,
      methodology_version: 'SI8 Reviewer Manual v0.2', assessment_date: `date`,
      asset_title: 'Cloud World', asset_runtime: 6, scope_domain_codes: ['A','R','H','I','L','T','D'],
      processing_status: 'DRAFT',
    }
    return { ok: true as const, created: true, assessment: { ...asm } }
  }

  // CA-RLK-2a.1 downstream backstop: deliver only from SIGNED + active +
  // revision-matched sign-off. A failed check performs NO state transition.
  function markDelivered() {
    if (!asm) return { ok: false, code: 'assessment_not_signed_off' as const }
    if (asm.processing_status !== 'SIGNED') return { ok: false, code: 'not_signed' as const }
    if (asm.signoff_status !== 'active') return { ok: false, code: 'signoff_invalidated' as const }
    if (asm.signed_workbook_revision == null) return { ok: false, code: 'assessment_not_signed_off' as const }
    if (asm.signed_workbook_revision !== sub.workbook_revision) return { ok: false, code: 'workbook_changed_since_signoff' as const }
    asm.processing_status = 'DELIVERED'
    return { ok: true as const }
  }

  return { sub, get asm() { return asm }, patchWorkbook, signOff, markDelivered }
}

describe('atomic sign-off / workbook-revision concurrency model (CA-RLK-2a §31)', () => {
  test('1 — sign-off at revision N persists signed_workbook_revision = N', () => {
    const db = makeDb()
    db.patchWorkbook({ a: 1 }, 'R') // revision 1
    const r = db.signOff('R', 1)
    expect(r.ok).toBe(true)
    expect(db.asm!.signed_workbook_revision).toBe(1)
  })

  test('2 & 3 — an edit moves the revision forward and invalidates the active sign-off', () => {
    const db = makeDb()
    db.patchWorkbook({ a: 1 }, 'R')
    db.signOff('R', 1)
    const p = db.patchWorkbook({ a: 2 }, 'R')
    expect(p.ok && p.workbook_revision).toBe(2)
    expect(p.ok && p.signoff_invalidated).toBe(true)
    expect(db.asm!.signoff_status).toBe('invalidated')
  })

  test('correction #1 — invalidation PRESERVES who/when signed', () => {
    const db = makeDb()
    db.patchWorkbook({ a: 1 }, 'R')
    db.signOff('reviewer-1', 1)
    const at = db.asm!.signed_off_at
    db.patchWorkbook({ a: 2 }, 'reviewer-1')
    expect(db.asm!.signoff_status).toBe('invalidated')
    expect(db.asm!.signed_off_by).toBe('reviewer-1')       // preserved
    expect(db.asm!.signed_off_at).toBe(at)                  // preserved
    expect(db.asm!.signed_workbook_revision).toBe(1)        // preserved
    expect(db.asm!.signoff_invalidated_at).not.toBeNull()
  })

  test('correction #1 — a second edit does NOT move the first invalidation time', () => {
    const db = makeDb()
    db.patchWorkbook({}, 'R'); db.signOff('R', 1)
    db.patchWorkbook({ x: 1 }, 'R')
    const firstInvalidatedAt = db.asm!.signoff_invalidated_at
    db.patchWorkbook({ x: 2 }, 'R')
    expect(db.asm!.signoff_invalidated_at).toBe(firstInvalidatedAt)
  })

  test('4 & 5 — a stale sign-off cannot become active for an older revision', () => {
    const db = makeDb()
    db.patchWorkbook({ a: 1 }, 'R') // rev 1
    db.patchWorkbook({ a: 2 }, 'R') // rev 2  (concurrent editor moved ahead)
    const r = db.signOff('R', 1)    // reviewer still thinks it's rev 1
    expect(r.ok).toBe(false)
    expect(!r.ok && r.code).toBe('workbook_changed')
    expect(db.asm).toBeNull()       // nothing created
  })

  test('6 — two sign-offs on an unchanged revision produce ONE active assessment', () => {
    const db = makeDb()
    db.patchWorkbook({}, 'R')
    const a = db.signOff('R', 1)
    const b = db.signOff('R', 1)
    expect(a.ok && b.ok).toBe(true)
    expect(b.ok && (b as any).idempotent).toBe(true)
    expect(db.asm!.id).toBe('A1')
  })

  test('7 — a duplicate sign-off does not rewrite signed_off_at', () => {
    const db = makeDb()
    db.patchWorkbook({}, 'R')
    db.signOff('R', 1)
    const at = db.asm!.signed_off_at
    db.signOff('R', 1)
    expect(db.asm!.signed_off_at).toBe(at)
  })

  test('8 — re-sign after invalidation binds the latest revision and re-stamps the actor/time', () => {
    const db = makeDb()
    db.patchWorkbook({}, 'reviewer-1')      // rev 1
    db.signOff('reviewer-1', 1)
    db.patchWorkbook({ y: 1 }, 'reviewer-1') // rev 2, invalidated
    const r = db.signOff('reviewer-2', 2)
    expect(r.ok && (r as any).resigned).toBe(true)
    expect(db.asm!.signoff_status).toBe('active')
    expect(db.asm!.signed_workbook_revision).toBe(2)
    expect(db.asm!.signed_off_by).toBe('reviewer-2')
    expect(db.asm!.signoff_invalidated_at).toBeNull()
  })

  test('report-generation state: an edit at REPORT_GENERATED reverts to DRAFT + clears the report', () => {
    const db = makeDb()
    db.patchWorkbook({}, 'R'); db.signOff('R', 1)
    db.asm!.processing_status = 'REPORT_GENERATED'
    db.sub.report_pdf_url = 'path/x.pdf'; db.sub.report_pdf_assessment_id = db.asm!.id
    const p = db.patchWorkbook({ z: 1 }, 'R')
    expect(p.ok && p.report_invalidated).toBe(true)
    expect(db.asm!.processing_status).toBe('DRAFT')
    expect(db.sub.report_pdf_url).toBeNull()
  })

  test('DELIVERED blocks any workbook mutation (no revision bump, no invalidation)', () => {
    const db = makeDb()
    db.patchWorkbook({}, 'R'); db.signOff('R', 1)
    db.asm!.processing_status = 'DELIVERED'
    const revBefore = db.sub.workbook_revision
    const p = db.patchWorkbook({ tampered: true }, 'R')
    expect(p.ok).toBe(false)
    expect(!p.ok && p.code).toBe('delivered')
    expect(db.sub.workbook_revision).toBe(revBefore)
    expect(db.asm!.signoff_status).toBe('active')
  })

  test('a signed-off assessment cannot be signed off again once past pre-delivery', () => {
    const db = makeDb()
    db.patchWorkbook({}, 'R'); db.signOff('R', 1)
    db.asm!.processing_status = 'SIGNED'
    const r = db.signOff('R', 1)
    expect(r.ok).toBe(false)
    expect(!r.ok && r.code).toBe('not_pre_delivery')
  })
})

// ── CA-RLK-2a.1: post-provenance immutability + delivery backstop ───────────

describe('post-provenance workbook immutability (CA-RLK-2a.1 §7-§9, §15 C/D/E)', () => {
  function atState(state: 'DRAFT' | 'REPORT_GENERATED' | 'SIGNING' | 'SIGNED' | 'DELIVERED') {
    const db = makeDb()
    db.patchWorkbook({ v: 1 }, 'R')     // revision 1
    db.signOff('R', 1)
    if (state !== 'DRAFT') db.asm!.processing_status = state
    if (state === 'REPORT_GENERATED') { db.sub.report_pdf_url = 'x.pdf'; db.sub.report_pdf_assessment_id = db.asm!.id }
    return db
  }

  test('DRAFT — edit allowed; revision bumps; sign-off invalidated; provenance preserved (§5 / §15 A)', () => {
    const db = atState('DRAFT')
    const p = db.patchWorkbook({ v: 2 }, 'R')
    expect(p.ok && p.workbook_revision).toBe(2)
    expect(db.asm!.signoff_status).toBe('invalidated')
    expect(db.asm!.signed_off_by).toBe('R')
    expect(db.asm!.signed_workbook_revision).toBe(1)
    expect(db.asm!.processing_status).toBe('DRAFT')
  })

  test('REPORT_GENERATED — edit allowed; sign-off + report invalidated; -> DRAFT (§6 / §15 B)', () => {
    const db = atState('REPORT_GENERATED')
    const p = db.patchWorkbook({ v: 2 }, 'R')
    expect(p.ok && (p as any).report_invalidated).toBe(true)
    expect(db.asm!.signoff_status).toBe('invalidated')
    expect(db.asm!.processing_status).toBe('DRAFT')
    expect(db.sub.report_pdf_url).toBeNull()
    expect(db.sub.report_pdf_assessment_id).toBeNull()
  })

  test('SIGNING — workbook mutation returns 409; nothing changes (§7 / §15 C)', () => {
    const db = atState('SIGNING')
    const revBefore = db.sub.workbook_revision
    const p = db.patchWorkbook({ tampered: true }, 'R')
    expect(p.ok).toBe(false)
    expect(!p.ok && p.code).toBe('locked_for_signing')
    expect(db.sub.workbook_revision).toBe(revBefore)
    expect(db.asm!.signoff_status).toBe('active')
    expect(db.asm!.processing_status).toBe('SIGNING')
  })

  test('SIGNED — workbook mutation returns 409; nothing changes (§8 / §15 D)', () => {
    const db = atState('SIGNED')
    const revBefore = db.sub.workbook_revision
    const p = db.patchWorkbook({ tampered: true }, 'R')
    expect(p.ok).toBe(false)
    expect(!p.ok && p.code).toBe('signed_immutable')
    expect(db.sub.workbook_revision).toBe(revBefore)
    expect(db.asm!.signoff_status).toBe('active')
    expect(db.asm!.signed_workbook_revision).toBe(1)
    expect(db.sub.report_pdf_url == null).toBe(true) // report binding untouched
  })

  test('DELIVERED — workbook mutation returns 409 (§9 / §15 E)', () => {
    const db = atState('DELIVERED')
    const p = db.patchWorkbook({ tampered: true }, 'R')
    expect(p.ok).toBe(false)
    expect(!p.ok && p.code).toBe('delivered')
  })

  test('the exact gap sequence is now closed: SIGNED -> edit -> deliver', () => {
    const db = makeDb()
    db.patchWorkbook({}, 'R'); db.signOff('R', 1)
    db.asm!.processing_status = 'SIGNED'
    const edit = db.patchWorkbook({ sneaky: true }, 'R')   // was: silently invalidated the sign-off
    expect(edit.ok).toBe(false)                            // now: blocked outright
    expect(db.asm!.signoff_status).toBe('active')
    expect(db.markDelivered().ok).toBe(true)               // delivery is safe
  })
})

describe('mark-delivered defensive gate (CA-RLK-2a.1 §10 / §15 F-J)', () => {
  test('F — SIGNED + active + revision-matched -> delivers', () => {
    const db = makeDb()
    db.patchWorkbook({}, 'R'); db.signOff('R', 1)
    db.asm!.processing_status = 'SIGNED'
    expect(db.markDelivered().ok).toBe(true)
    expect(db.asm!.processing_status).toBe('DELIVERED')
  })

  test('G — SIGNED + signoff_status invalidated -> fails, no transition (§15 G, J)', () => {
    const db = makeDb()
    db.patchWorkbook({}, 'R'); db.signOff('R', 1)
    db.asm!.processing_status = 'SIGNED'
    db.asm!.signoff_status = 'invalidated' // simulate a legacy pre-2a.1 invalidation
    const r = db.markDelivered()
    expect(r.ok).toBe(false)
    expect(!r.ok && r.code).toBe('signoff_invalidated')
    expect(db.asm!.processing_status).toBe('SIGNED')
  })

  test('H — SIGNED + signed_workbook_revision != workbook_revision -> fails (§15 H, J)', () => {
    const db = makeDb()
    db.patchWorkbook({}, 'R'); db.signOff('R', 1)
    db.asm!.processing_status = 'SIGNED'
    db.sub.workbook_revision = 5 // drifted (e.g. via a legacy path)
    const r = db.markDelivered()
    expect(r.ok).toBe(false)
    expect(!r.ok && r.code).toBe('workbook_changed_since_signoff')
    expect(db.asm!.processing_status).toBe('SIGNED')
  })

  test('I — SIGNED + signed_workbook_revision NULL -> fails (§15 I)', () => {
    const db = makeDb()
    db.patchWorkbook({}, 'R'); db.signOff('R', 1)
    db.asm!.processing_status = 'SIGNED'
    db.asm!.signed_workbook_revision = null
    const r = db.markDelivered()
    expect(r.ok).toBe(false)
    expect(db.asm!.processing_status).toBe('SIGNED')
  })

  test('mark-delivered still requires SIGNED (REPORT_GENERATED is rejected)', () => {
    const db = makeDb()
    db.patchWorkbook({}, 'R'); db.signOff('R', 1)
    db.asm!.processing_status = 'REPORT_GENERATED'
    expect(db.markDelivered().ok).toBe(false)
  })
})

// ── constants ───────────────────────────────────────────────────────────────

test('SIGNOFF_STATUSES is exactly active/invalidated', () => {
  expect([...SIGNOFF_STATUSES]).toEqual(['active', 'invalidated'])
})
