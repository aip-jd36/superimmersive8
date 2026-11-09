/**
 * CR-V2-SCHEMA8-PATH-1 — unit tests for the schema 8 path corrections not covered next to their own modules:
 *   E3 live versus replay examination wording; E4 the legal-policy gate on purchase and checkout; E5 the customer wording lock on
 *   governed strings; E7 consent and AI-permission identifiers bound to the approved policy versions.
 * E1 and E2 are tested in publication-authority.test.ts and customer-flow.test.ts; E6 on PostgreSQL in
 * __tests__/db/creator-record-v2-ai-permission.db.test.ts.
 */
import { readFileSync } from 'fs'
import path from 'path'
import { renderToStaticMarkup } from 'react-dom/server'

jest.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: {} }))

import { checkV2Checkout, startPurchase, type PurchaseDeps } from '@/lib/creator-record/customer-flow/purchase'
import { approvedCustomerRecordInputs } from '@/lib/creator-record/customer-flow/approved-inputs'
import { checkApprovedSources, type SourceRefusal } from '@/lib/creator-record/customer-record/sources'
import { CUSTOMER_RECORD_SCHEMA, CUSTOMER_RECORD_SCHEMA_VERSION } from '@/lib/creator-record/customer-record/record'
import { CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY } from '@/lib/creator-record/governed/synthetic-test-authority'
import { violatesCustomerWordingLock, violatesDependencyLabelLock } from '@/lib/creator-record/contract/wording-lock'
import { AI_EXAMINATION_PERMISSION_DRAFT_VERSION, AUTHORIZATION_VERSION_PATTERN, boundAuthorizationVersion, EVIDENCE_CONSENT_DRAFT_VERSION, sha256Bytes } from '@/lib/creator-record/evidence-intake/contract'
import { syntheticTextPdf } from '@/test-support/synthetic-pdf'
import { uploadEvidence, type EvidenceDeps, type EvidenceRow } from '@/lib/creator-record/evidence-intake/service'
import { aiExaminationPermissionVersion, AI_EXAMINATION_PERMISSION_APPROVED_WORDING, CONSENT_VERSION_UNBINDABLE, EVIDENCE_CONSENT_APPROVED_WORDING, evidenceConsentVersion } from '@/lib/creator-record-flow/authorization-versions'
import { customerWordingIdentity } from '@/lib/creator-record-flow/customer-wording'
import { approvedPolicyVersions, legalPoliciesApproved, type ApprovedLegalDocument } from '@/lib/legal/policies'
import { EXAM_LIVE_TEXT, EXAM_TEXT, examText } from '@/lib/creator-record-flow/examination-ui'
import { EVIDENCE_MESSAGES, V2_REVIEW_PAGE } from '@/lib/creator-record-flow/wording'
import { EvidencePanel } from '@/components/creator-record/EvidencePanel'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'

const APP = path.join(__dirname, '..', '..')
const src = (p: string) => readFileSync(path.join(APP, p), 'utf8')
const OWNER = 'aaaaaaaa-2222-4333-8444-555555555555'
const POLICIES = { privacy: 'privacy-2026-12-01', terms: 'terms-2026-12-01' }
// CR-V2-MVP-PROD-PREP-1: a stand-in for APPROVED consent and permission wording (the shipped slots are null).
const CONSENT_WORDING = { id: 'cr-v2-storage-consent-1', customer_wording_sha256: customerWordingIdentity().sha256 }
const PERMISSION_WORDING = { id: 'cr-v2-ai-permission-1', customer_wording_sha256: customerWordingIdentity().sha256 }
const doc = (version: string): ApprovedLegalDocument => ({ version, effective_date: '2026-12-01', approval_reference: 'GOV-LEGAL-1', title: 'T', paragraphs: ['p'] })

// ── E4 ──
describe('E4: no purchase and no checkout without both published legal policies (any schema)', () => {
  function deps(over: Partial<PurchaseDeps> = {}) {
    const calls: string[] = []
    const d: PurchaseDeps = {
      submissions: 'open', issuance: 'enabled',
      hasPilotAccess: async () => { calls.push('invited'); return true },
      getPrepared: async () => { calls.push('read'); return null },
      latestVersion: async () => null,
      boundTo: async () => { calls.push('bound'); return null },
      bind: async () => { calls.push('bind'); return { submissionId: null, reason: 'not_found' } },
      governance: () => { calls.push('governance'); throw new Error('not reached') },
      now: () => new Date('2026-11-08T00:00:00Z'),
      ...over,
    }
    return { d, calls }
  }
  const SUB = { id: '33333333-3333-4333-8333-333333333333', user_id: OWNER, tier: 'creator_record', creator_record_product: 'v2' }
  const ID = '00000000-0000-4000-8000-00000000abcd'

  test.each<[string, Partial<PurchaseDeps>]>([
    ['no policy port', {}],
    ['policies not published', { legalPoliciesApproved: () => false }],
    ['a non-boolean answer', { legalPoliciesApproved: () => 'yes' as unknown as boolean }],
    ['the port throws', { legalPoliciesApproved: () => { throw new Error('x') } }],
  ])('%s → both steps refuse as unavailable, before reading the invitation, the version or the binding', async (_l, over) => {
    const a = deps(over)
    expect(await startPurchase(a.d, OWNER, ID)).toEqual({ ok: false, status: 503, code: 'unavailable' })
    expect(await checkV2Checkout(a.d, OWNER, SUB)).toEqual({ ok: false, status: 503, code: 'unavailable' })
    expect(a.calls).toEqual([])
  })

  test('published policies: the checks continue as before (here: no such version)', async () => {
    const a = deps({ legalPoliciesApproved: () => true })
    expect(await startPurchase(a.d, OWNER, ID)).toEqual({ ok: false, status: 404, code: 'not_found' })
    expect(a.calls).toEqual(['invited', 'read'])
  })

  test('the stops still come first; the production wiring supplies the real check; the page shows payment only with policies', () => {
    expect(src('lib/creator-record/customer-flow/purchase.ts')).toMatch(/issuance_stopped[\s\S]*submissions_stopped[\s\S]*policiesPublished\(deps\)[\s\S]*not_invited/)
    expect(src('lib/creator-record-flow/production.ts')).toMatch(/legalPoliciesApproved: \(\) => legalPoliciesApproved\(\)/)
    expect(src('app/creator-record/page.tsx')).toContain("paymentOpen={CREATOR_RECORD_V2_ISSUANCE === 'enabled' && legalPoliciesApproved()}")
    expect(legalPoliciesApproved()).toBe(false)
  })
})

// ── E5 ──
describe('E5: the customer wording lock applies to every governed customer string (a safety net, never an approval)', () => {
  const bundle = CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY!
  const base = approvedCustomerRecordInputs(bundle)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Mutable = any
  const run = (mutate: (s: Mutable, acks: Record<string, string>) => void) => {
    const sources = JSON.parse(JSON.stringify(base.sources)) as Mutable
    const acks = { ...(base.source_text!.acknowledgements as Record<string, string>) }
    mutate(sources, acks)
    const r = checkApprovedSources(sources, { approval: base.source_text!.approval, acknowledgements: acks }, TOPIC_CLAIMS_FIXTURE, '2026-11-08', { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_SCHEMA_VERSION })
    return r.ok ? [] : r.refusals
  }
  const locked = (refusals: SourceRefusal[]) => refusals.filter((r) => r.code === 'customer_wording_lock').map((r) => r.ref)

  test('the unchanged synthetic bundle passes', () => {
    expect(run(() => undefined)).toEqual([])
  })

  test.each<[string, (s: Mutable, acks: Record<string, string>) => void, string]>([
    ['question wording', (s) => { s.presentation.P1 = { ...s.presentation.P1, text: 'Is this video cleared for use?' } }, 'presentation.P1.text'],
    ['question help', (s) => { s.presentation.T1 = { ...s.presentation.T1, help: 'Pick the tool you are permitted to use.' } }, 'presentation.T1.help'],
    ['an option label', (s) => { s.presentation.L1 = { ...s.presentation.L1, option_labels: { ...s.presentation.L1.option_labels, yes: 'Yes, verified' } } }, 'presentation.L1.option_labels.yes'],
    ['an acknowledgement', (_s, acks) => { acks.A1 = 'I understand this record is certified.' }, 'acknowledgements.A1'],
    ['a caveat', (s) => { const k = Object.keys(s.caveats)[0]; s.caveats = { ...s.caveats, [k]: 'This guidance applies to you.' } }, `caveats.${Object.keys(base.sources.caveats)[0]}`],
    ['a dependency label (established)', (s) => { const k = Object.keys(s.dependency_labels)[0]; s.dependency_labels = { ...s.dependency_labels, [k]: 'Subscription confirmed' } }, `dependency_labels.${Object.keys(base.sources.dependency_labels)[0]}`],
    ['an eligible ledger explanation', (s) => { s.ledger = s.ledger.map((e: Mutable, i: number) => (i === 0 ? { ...e, explanation: 'Your output is compliant with the plan.' } : e)) }, `ledger.${base.sources.ledger[0].entry_id}.explanation`],
    ['an eligible ledger evidence note', (s) => { const e = s.ledger.find((x: Mutable) => Object.keys(x.evidence_notes).length > 0)!; s.ledger = s.ledger.map((x: Mutable) => (x === e ? { ...x, evidence_notes: { [Object.keys(e.evidence_notes)[0]]: 'Safe to rely on.' } } : x)) }, `ledger.${base.sources.ledger.find((x: Mutable) => Object.keys(x.evidence_notes).length > 0)!.entry_id}.evidence_notes.${Object.keys(base.sources.ledger.find((x: Mutable) => Object.keys(x.evidence_notes).length > 0)!.evidence_notes)[0]}`],
  ])('%s with locked wording is refused (named by field, not text)', (_l, mutate, ref) => {
    expect(locked(run(mutate))).toEqual([ref])
  })

  test('a negated clearance is allowed; a ledger entry that is not eligible is not read; the lock never approves clean but unapproved text', () => {
    expect(locked(run((s) => { const k = Object.keys(s.caveats)[0]; s.caveats = { ...s.caveats, [k]: 'This is not a clearance.' } }))).toEqual([])
    expect(locked(run((s) => { s.ledger = s.ledger.map((e: Mutable, i: number) => (i === 0 ? { ...e, creator_record_eligible: 'No', explanation: 'Cleared.' } : e)) }))).toEqual([])
    const unapproved = run((s) => { s.presentation.P1 = { ...s.presentation.P1, text: 'A perfectly ordinary but unapproved question.' } })
    expect(locked(unapproved)).toEqual([])
    expect(unapproved.map((r) => r.code)).toContain('source_text_digest_mismatch')
  })

  test('the shared lock is the same lock the PDF templates use', () => {
    expect(violatesCustomerWordingLock('not a clearance')).toBe(false)
    expect(violatesCustomerWordingLock('Approved for Creator Records')).toBe(false)
    for (const t of ['cleared', 'Certified', 'licensed to', 'safe to', 'does not apply', 'governed by', 'compliant']) expect(violatesCustomerWordingLock(t)).toBe(true)
    for (const t of ['met', 'Resolved', 'confirmed', 'satisfied']) expect(violatesDependencyLabelLock(t)).toBe(true)
    expect(src('lib/creator-record/customer-pdf/templates.ts')).toMatch(/from '\.\.\/contract\/wording-lock'/)
    expect(src('lib/creator-record/customer-pdf/templates.ts')).not.toMatch(/const BANNED =/)
  })
})

// ── E7 ──
describe('E7: consent and AI-permission identifiers are bound to the approved privacy notice and terms', () => {
  test('bound only with both policies; different policies give different identifiers; anything too long is null', () => {
    expect(boundAuthorizationVersion('w-1', null)).toBeNull()
    expect(boundAuthorizationVersion('w-1', POLICIES)).toBe('w-1__privacy-2026-12-01__terms-2026-12-01')
    expect(boundAuthorizationVersion('w-1', { ...POLICIES, privacy: 'privacy-2027-01-01' })).not.toBe(boundAuthorizationVersion('w-1', POLICIES))
    expect(boundAuthorizationVersion('w-1', { ...POLICIES, terms: 'terms-2027-01-01' })).not.toBe(boundAuthorizationVersion('w-1', POLICIES))
    expect(boundAuthorizationVersion('w'.repeat(100), POLICIES)).toBeNull()
    expect(boundAuthorizationVersion('bad wording!', POLICIES)).toBeNull()
  })

  test('the longest policy versions still fit both identifiers inside the permission column', () => {
    const longest = { privacy: 'p'.repeat(32), terms: 't'.repeat(32) }
    for (const w of [AI_EXAMINATION_PERMISSION_DRAFT_VERSION, EVIDENCE_CONSENT_DRAFT_VERSION]) expect(AUTHORIZATION_VERSION_PATTERN.test(boundAuthorizationVersion(w, longest) as string)).toBe(true)
    expect(approvedPolicyVersions({ privacy: doc('p'.repeat(33)), terms: doc('terms-1') })).toBeNull()
    expect(approvedPolicyVersions({ privacy: doc('privacy-1'), terms: doc('terms-1') })).toEqual({ privacy: 'privacy-1', terms: 'terms-1' })
    expect(approvedPolicyVersions()).toBeNull()
  })

  test('storage consent: the draft identifier until the policies are approved, then only the bound APPROVED wording', () => {
    expect(evidenceConsentVersion(null)).toBe(EVIDENCE_CONSENT_DRAFT_VERSION)
    expect(evidenceConsentVersion()).toBe(EVIDENCE_CONSENT_DRAFT_VERSION)
    expect(evidenceConsentVersion(POLICIES, CONSENT_WORDING)).toBe('cr-v2-storage-consent-1__privacy-2026-12-01__terms-2026-12-01')
    expect(evidenceConsentVersion({ privacy: 'p'.repeat(32), terms: 't'.repeat(32) }, CONSENT_WORDING)).not.toBe(CONSENT_VERSION_UNBINDABLE)
  })

  // CR-V2-MVP-PROD-PREP-1: publishing the policies alone never binds the DRAFT wording.
  test('storage consent: policies published but no approved wording, draft-marked wording, or wording approved for another customer wording set → unbindable', () => {
    expect(EVIDENCE_CONSENT_APPROVED_WORDING).toBeNull()
    expect(evidenceConsentVersion(POLICIES)).toBe(CONSENT_VERSION_UNBINDABLE)
    expect(evidenceConsentVersion(POLICIES, null)).toBe(CONSENT_VERSION_UNBINDABLE)
    expect(evidenceConsentVersion(POLICIES, { id: EVIDENCE_CONSENT_DRAFT_VERSION.toLowerCase(), customer_wording_sha256: customerWordingIdentity().sha256 })).toBe(CONSENT_VERSION_UNBINDABLE)
    expect(evidenceConsentVersion(POLICIES, { id: 'cr-v2-draft-consent', customer_wording_sha256: customerWordingIdentity().sha256 })).toBe(CONSENT_VERSION_UNBINDABLE)
    expect(evidenceConsentVersion(POLICIES, { ...CONSENT_WORDING, customer_wording_sha256: 'f'.repeat(64) })).toBe(CONSENT_VERSION_UNBINDABLE)
  })

  test('AI permission: none until both the policies and the approved wording exist', () => {
    expect(aiExaminationPermissionVersion(null)).toBeNull()
    expect(aiExaminationPermissionVersion()).toBeNull()
    expect(AI_EXAMINATION_PERMISSION_APPROVED_WORDING).toBeNull()
    expect(aiExaminationPermissionVersion(POLICIES)).toBeNull()
    expect(aiExaminationPermissionVersion(null, PERMISSION_WORDING)).toBeNull()
    expect(aiExaminationPermissionVersion(POLICIES, { ...PERMISSION_WORDING, customer_wording_sha256: 'f'.repeat(64) })).toBeNull()
    expect(aiExaminationPermissionVersion(POLICIES, { id: 'unapproved-permission', customer_wording_sha256: customerWordingIdentity().sha256 })).toBeNull()
    expect(aiExaminationPermissionVersion(POLICIES, PERMISSION_WORDING)).toBe('cr-v2-ai-permission-1__privacy-2026-12-01__terms-2026-12-01')
    // 20261113000000: CHECK (permission_version !~* '(draft|unapproved)') — a draft wording stays unusable in the database too.
    expect(/(draft|unapproved)/i.test(boundAuthorizationVersion(AI_EXAMINATION_PERMISSION_DRAFT_VERSION, POLICIES) as string)).toBe(true)
    expect(src('supabase/migrations/20261113000000_creator_record_v2_ai_permission_current_version.sql')).toContain("CHECK (permission_version !~* '(draft|unapproved)')")
  })

  describe('the upload accepts and records only the current consent identifier', () => {
    const inserted: { consent_version: string }[] = []
    const deps = (over: Partial<EvidenceDeps>): EvidenceDeps => ({
      submissions: 'open', hasPilotAccess: async () => true, realDocumentsPermitted: false, isSyntheticTestDocument: () => true,
      store: { countLive: async () => 0, listStored: async () => [], insertPending: async (row: { consent_version: string }) => { inserted.push(row); throw new Error('stop after recording') } } as unknown as EvidenceDeps['store'],
      objects: {} as EvidenceDeps['objects'], newId: () => '11111111-2222-4333-8444-555555555555', now: () => new Date(),
      ...over,
    })
    const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const upload = (d: EvidenceDeps, consent: unknown) => uploadEvidence(d, OWNER, { bytes: PNG, file_name: 'r.png', consent }).catch((e: Error) => ({ thrown: e.message }))

    test('a stale identifier is refused once the policies are bound', async () => {
      const bound = evidenceConsentVersion(POLICIES, CONSENT_WORDING)
      expect(await upload(deps({ consentVersion: bound }), EVIDENCE_CONSENT_DRAFT_VERSION)).toEqual({ ok: false, status: 400, code: 'consent_required' })
      expect(await upload(deps({ consentVersion: bound }), evidenceConsentVersion({ ...POLICIES, terms: 'terms-2025-01-01' }, CONSENT_WORDING))).toEqual({ ok: false, status: 400, code: 'consent_required' })
    })

    test('the current identifier passes the consent step (the request then fails on its synthetic bytes, before any recording here)', async () => {
      const bound = evidenceConsentVersion(POLICIES, CONSENT_WORDING)
      const r = await upload(deps({ consentVersion: bound }), bound)
      expect(r).not.toEqual({ ok: false, status: 400, code: 'consent_required' })
    })

    test('real documents are never stored under the unbound draft identifier, even if a wiring omitted the bound one', async () => {
      expect(await upload(deps({ realDocumentsPermitted: true }), EVIDENCE_CONSENT_DRAFT_VERSION)).toEqual({ ok: false, status: 400, code: 'consent_required' })
    })

    test('the production evidence wiring supplies the bound identifier; pages send it', () => {
      expect(src('lib/creator-record-flow/evidence-production.ts')).toMatch(/consentVersion: evidenceConsentVersion\(\)/)
      expect(src('app/creator-record/page.tsx')).toContain('consentVersion: evidenceConsentVersion()')
      expect(src('app/admin/creator-record-v2/uat/page.tsx')).toContain('consentVersion: evidenceConsentVersion()')
      expect(src('lib/creator-record/evidence-intake/service.ts')).toMatch(/consent_version: consentVersion,/)
    })
  })
})

// ── E3 ──
describe('E3: live examination wording is separate from the synthetic replay wording', () => {
  test('replay stays exactly the synthetic wording; live replaces only the mode-specific strings', () => {
    expect(examText('replay')).toBe(EXAM_TEXT)
    const live = examText('live')
    for (const [k, v] of Object.entries(EXAM_LIVE_TEXT)) expect(live[k as keyof typeof live]).toBe(v)
    for (const k of Object.keys(EXAM_TEXT).filter((k) => !(k in EXAM_LIVE_TEXT))) expect(live[k as keyof typeof live]).toBe(EXAM_TEXT[k as keyof typeof EXAM_TEXT])
  })

  test('the live wording describes the live product: no synthetic, replay or "cannot be paid" claim, and it passes the wording lock', () => {
    for (const v of Object.values(EXAM_LIVE_TEXT)) {
      expect(v).not.toMatch(/synthetic|recorded test data|no AI model reads|cannot be paid|testing only/i)
      expect(violatesCustomerWordingLock(v)).toBe(false)
    }
    for (const v of Object.values(V2_REVIEW_PAGE)) expect(violatesCustomerWordingLock(v)).toBe(false)
    expect(Object.values(V2_REVIEW_PAGE).join(' ')).not.toMatch(/nothing was changed/i)
  })

  test('the panel shows the live wording only when a live examination is offered', () => {
    const panel = (aiPermissionVersion?: string) => renderToStaticMarkup(
      <EvidencePanel consentVersion={EVIDENCE_CONSENT_DRAFT_VERSION} maxTools={1} attachments={[]} onAttachmentsChange={() => undefined}
        includeExaminations={false} onIncludeExaminationsChange={() => undefined} initialDocuments={[]} {...(aiPermissionVersion ? { aiPermissionVersion } : {})} />,
    )
    const live = panel('v-1__privacy-1__terms-1')
    expect(live).toContain(EXAM_LIVE_TEXT.evidence_title)
    expect(live).toContain(EXAM_LIVE_TEXT.consent_label)
    expect(live).not.toContain(EXAM_TEXT.evidence_title)
    const replay = panel()
    expect(replay).toContain(EXAM_TEXT.evidence_title)
    expect(replay).not.toContain(EXAM_LIVE_TEXT.evidence_title)
  })

  test('the review page and the findings use the same choice; no review-page string is hard-coded in the client any more', () => {
    const client = src('app/creator-record/CreatorRecordV2Client.tsx')
    expect(client).toContain("textMode={props.examination?.aiPermissionVersion ? 'live' : 'replay'}")
    for (const literal of ['>Check your declarations<', '>Your answers<', '>What you acknowledged<', '>Correct my answers<', "'Confirm these declarations'", 'Nothing was changed']) expect(client).not.toContain(literal)
  })
})

// ── CR-V2-SCHEMA8-PATH-1-DEDUP-CORRECTION ──
describe('deduplication never reports a document stored under another consent as covered by the current one', () => {
  const PDF = syntheticTextPdf('dedup consent regression')
  const SHA = sha256Bytes(PDF)
  const CURRENT = evidenceConsentVersion({ privacy: 'privacy-2', terms: 'terms-1' }, CONSENT_WORDING)
  const EARLIER = evidenceConsentVersion({ privacy: 'privacy-1', terms: 'terms-1' }, CONSENT_WORDING)
  const held = (consent_version: string): EvidenceRow => Object.freeze({
    id: '99999999-2222-4333-8444-555555555555', user_id: OWNER, sha256: SHA, media_type: 'application/pdf', byte_size: PDF.length, file_name: 'receipt.pdf',
    storage_path: `${OWNER}/99999999-2222-4333-8444-555555555555`, consent_version, state: 'stored', created_at: '2026-11-01T00:00:00.000Z', stored_at: '2026-11-01T00:00:01.000Z',
    deleted_at: null, object_removed_at: null,
  }) as unknown as EvidenceRow
  type Branch = 'at_limit' | 'quota_exceeded' | 'unique_violation'
  function deps(branch: Branch, row: EvidenceRow) {
    const writes: string[] = []
    const store = {
      countLive: async () => (branch === 'at_limit' ? 24 : 0),
      listStored: async () => [row],
      insertPending: async () => { writes.push('insertPending'); return branch === 'quota_exceeded' ? { inserted: false, existing: null, quota_exceeded: true } : { inserted: false, existing: row } },
      markStored: async () => { writes.push('markStored'); return null },
      removePending: async () => { writes.push('removePending'); return true },
    }
    const objects = { put: async () => { writes.push('put') }, remove: async () => { writes.push('remove') } }
    const d: EvidenceDeps = {
      submissions: 'open', hasPilotAccess: async () => true, realDocumentsPermitted: true, isSyntheticTestDocument: () => false,
      store: store as unknown as EvidenceDeps['store'], objects: objects as unknown as EvidenceDeps['objects'],
      newId: () => '11111111-2222-4333-8444-555555555555', now: () => new Date('2026-11-08T00:00:00Z'), consentVersion: CURRENT,
      // CR-V2-APPROVAL-AUTHORITY-FIX-1: real documents need the approved storage-consent wording; this stands in for it.
      approvedStorageConsent: CONSENT_WORDING,
    }
    return { d, writes }
  }
  const upload = (d: EvidenceDeps) => uploadEvidence(d, OWNER, { bytes: PDF, file_name: 'receipt.pdf', consent: CURRENT })
  // Only the attempted pending insert itself may happen on the insert branches (that is how the collision is found).
  const expectedWrites: Record<Branch, string[]> = { at_limit: [], quota_exceeded: ['insertPending'], unique_violation: ['insertPending'] }

  test.each<Branch>(['at_limit', 'quota_exceeded', 'unique_violation'])('%s: a document held under an earlier consent → 409 consent_outdated, nothing written or changed', async (branch) => {
    const row = held(EARLIER)
    const { d, writes } = deps(branch, row)
    expect(await upload(d)).toEqual({ ok: false, status: 409, code: 'consent_outdated' })
    expect(writes).toEqual(expectedWrites[branch])
    expect(row.consent_version).toBe(EARLIER)
  })

  test.each<Branch>(['at_limit', 'quota_exceeded', 'unique_violation'])('%s: the same consent → the unchanged deduplicated result (control)', async (branch) => {
    const row = held(CURRENT)
    const { d, writes } = deps(branch, row)
    const r = await upload(d)
    expect(r).toMatchObject({ ok: true, deduplicated: true, document: { id: row.id, sha256: SHA } })
    expect(writes).toEqual(expectedWrites[branch])
  })

  test('a stored row with no recorded consent is never treated as covered (fail closed)', async () => {
    const row = { ...held(CURRENT), consent_version: null } as unknown as EvidenceRow
    expect(await upload(deps('unique_violation', row).d)).toEqual({ ok: false, status: 409, code: 'consent_outdated' })
  })

  test('the customer message is a draft that directs to support and promises no deletion or re-upload', () => {
    // CR-V2-MVP-PROD-PREP-1: the message now lives in the customer wording set (still DRAFT, pending M0).
    const line = EVIDENCE_MESSAGES.consent_outdated
    expect(line).toMatch(/jd@superimmersive8\.com/)
    expect(line).not.toMatch(/delet|re-?upload|add it again/i)
    expect(src('lib/creator-record-flow/wording.ts')).toMatch(/DRAFT — PENDING M0 WORDING APPROVAL/)
    expect(src('lib/creator-record-flow/evidence-http.ts')).toMatch(/= EVIDENCE_MESSAGES/)
  })
})
