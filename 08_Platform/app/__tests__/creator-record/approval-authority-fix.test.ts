/**
 * CR-V2-APPROVAL-AUTHORITY-FIX-1 — negative tests for the two demonstrated bypasses:
 *   B. storage consent: the intake boundary admits a real document only under a POSITIVELY approved, current identifier;
 *   A. customer wording: the production build refuses templates that differ from their pin, and inline wording.
 */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  approvedStorageConsentIdentifier, CONSENT_VERSION_UNBINDABLE, EVIDENCE_CONSENT_APPROVED_WORDING, EVIDENCE_CONSENT_DRAFT_VERSION, EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED,
  type ApprovedAuthorizationWording,
} from '@/lib/creator-record/evidence-intake/contract'
import { uploadEvidence, type EvidenceDeps } from '@/lib/creator-record/evidence-intake/service'
import { evidenceConsentVersion } from '@/lib/creator-record-flow/authorization-versions'
import { customerWordingIdentity } from '@/lib/creator-record-flow/customer-wording'

const APP = path.resolve(__dirname, '../..')
const OWNER = '00000000-0000-4000-8000-000000000001'
const POLICIES = { privacy: 'privacy-2026-12-01', terms: 'terms-2026-12-01' }
const APPROVED: ApprovedAuthorizationWording = { id: 'cr-v2-storage-consent-1', customer_wording_sha256: customerWordingIdentity().sha256 }
const CURRENT = `cr-v2-storage-consent-1__${POLICIES.privacy}__${POLICIES.terms}`
const PDF = new TextEncoder().encode('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 10 10]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF')

/** Real documents permitted; records whether the store was ever reached. */
function intake(over: Partial<EvidenceDeps>) {
  const reached: string[] = []
  const deps = {
    submissions: 'open', hasPilotAccess: async () => true, realDocumentsPermitted: true, isSyntheticTestDocument: () => false,
    store: { countLive: async () => 0, listStored: async () => [], insertPending: async () => { reached.push('insertPending'); throw new Error('stop after consent') } },
    objects: {}, newId: () => '11111111-2222-4333-8444-555555555555', now: () => new Date('2026-11-09T00:00:00Z'),
    ...over,
  } as unknown as EvidenceDeps
  const upload = (consent: unknown) => uploadEvidence(deps, OWNER, { bytes: PDF, file_name: 'invoice.pdf', consent }).catch((e: Error) => ({ thrown: e.message }))
  return { upload, reached }
}
const REFUSED = { ok: false, status: 400, code: 'consent_required' }

describe('B. storage consent at the intake boundary', () => {
  test('the reproduced bypass: policies published, no approved consent wording, the placeholder sent as consent → refused before storage', async () => {
    const consentVersion = evidenceConsentVersion(POLICIES, null) // no approved consent wording
    expect(consentVersion).toBe(CONSENT_VERSION_UNBINDABLE)
    const i = intake({ consentVersion })
    expect(await i.upload(CONSENT_VERSION_UNBINDABLE)).toEqual(REFUSED)
    expect(i.reached).toEqual([])
  })

  test('the placeholder is refused in every mode, including synthetic-only intake', async () => {
    const i = intake({ consentVersion: CONSENT_VERSION_UNBINDABLE, realDocumentsPermitted: false, isSyntheticTestDocument: () => true })
    expect(await i.upload(CONSENT_VERSION_UNBINDABLE)).toEqual(REFUSED)
    expect(i.reached).toEqual([])
  })

  test.each([
    ['missing', undefined],
    ['empty', ''],
    ['draft', EVIDENCE_CONSENT_DRAFT_VERSION],
    ['draft bound to the policies', `${EVIDENCE_CONSENT_DRAFT_VERSION}__${POLICIES.privacy}__${POLICIES.terms}`],
    ['outdated (earlier terms)', `cr-v2-storage-consent-1__${POLICIES.privacy}__terms-2025-01-01`],
    ['unrecognised wording', `cr-v2-storage-consent-9__${POLICIES.privacy}__${POLICIES.terms}`],
    ['malformed', 'not a consent'],
  ])('%s consent sent by the client → refused, nothing stored', async (_n, consent) => {
    const i = intake({ consentVersion: CURRENT, approvedStorageConsent: APPROVED })
    expect(await i.upload(consent)).toEqual(REFUSED)
    expect(i.reached).toEqual([])
  })

  test.each([
    ['no approved wording at all (the shipped state), even if a wiring supplied an identifier', CURRENT, null],
    ['a draft identifier supplied by a wiring', EVIDENCE_CONSENT_DRAFT_VERSION, APPROVED],
    ['a wiring identifier for wording other than the approved one', `cr-v2-storage-consent-0__${POLICIES.privacy}__${POLICIES.terms}`, APPROVED],
    ['an approval whose own id carries a draft marker', 'cr-v2-draft-consent__privacy-1__terms-1', { id: 'cr-v2-draft-consent', customer_wording_sha256: APPROVED.customer_wording_sha256 }],
  ] as [string, string, ApprovedAuthorizationWording | null][])('server-side refusal whatever the wiring says: %s', async (_n, consentVersion, approved) => {
    const i = intake({ consentVersion, approvedStorageConsent: approved })
    expect(await i.upload(consentVersion)).toEqual(REFUSED)
    expect(i.reached).toEqual([])
  })

  test('withdrawn approval: once the approved wording is withdrawn (slot cleared or replaced), new real documents are refused under it', async () => {
    const withdrawn = intake({ consentVersion: CURRENT, approvedStorageConsent: null })
    expect(await withdrawn.upload(CURRENT)).toEqual(REFUSED)
    const replaced = intake({ consentVersion: CURRENT, approvedStorageConsent: { id: 'cr-v2-storage-consent-2', customer_wording_sha256: APPROVED.customer_wording_sha256 } })
    expect(await replaced.upload(CURRENT)).toEqual(REFUSED)
    expect([...withdrawn.reached, ...replaced.reached]).toEqual([])
  })

  test('consent text changed after approval: the flow no longer binds it, so the intake receives the placeholder and refuses', async () => {
    const stale = { ...APPROVED, customer_wording_sha256: 'f'.repeat(64) }
    const consentVersion = evidenceConsentVersion(POLICIES, stale)
    expect(consentVersion).toBe(CONSENT_VERSION_UNBINDABLE)
    expect(await intake({ consentVersion, approvedStorageConsent: stale }).upload(consentVersion)).toEqual(REFUSED)
  })

  test('control: the current, positively approved identifier passes the consent step (and reaches storage)', async () => {
    expect(evidenceConsentVersion(POLICIES, APPROVED)).toBe(CURRENT)
    const i = intake({ consentVersion: CURRENT, approvedStorageConsent: APPROVED })
    expect(await i.upload(CURRENT)).toEqual({ thrown: 'stop after consent' })
    expect(i.reached).toEqual(['insertPending'])
  })

  test('the shipped state: the founder-approved wording names the current customer wording set, and the production wiring still admits no real document', () => {
    // CR-V2-MVP-LEGAL-CONTENT-6: approved (JD-CR-V2-MVP-LEGAL-CONTENT-5-20261109). Real documents stay behind the separate code lock.
    expect(EVIDENCE_CONSENT_APPROVED_WORDING).toEqual({ id: 'cr-v2-storage-consent-1', customer_wording_sha256: customerWordingIdentity().sha256 })
    expect(EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED).toBe(false)
    expect(approvedStorageConsentIdentifier('DRAFT-UNAPPROVED-cr-v2-evidence-storage-consent-0__privacy-2026-12-01__terms-2026-12-01')).toBe(false)
    const wiring = readFileSync(path.join(APP, 'lib/creator-record-flow/evidence-production.ts'), 'utf8')
    expect(wiring).toMatch(/realDocumentsPermitted: EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED && legalPoliciesApproved\(\) && approvedStorageConsentIdentifier\(evidenceConsentVersion\(\)\)/)
  })
})

describe('A. the production build refuses wording the approved identity does not describe', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const check = require('../../scripts/customer-wording-check.js') as { GUARDED: { file: string }[]; TEMPLATE_SOURCES: string[]; checkCustomerWording(root: string): string[] }
  const copy = () => {
    const root = mkdtempSync(path.join(tmpdir(), 'cw-check-'))
    for (const f of [...check.TEMPLATE_SOURCES, 'lib/creator-record-flow/customer-wording.ts', ...check.GUARDED.map((g) => g.file)]) cpSync(path.join(APP, f), path.join(root, f))
    return root
  }

  test('a copy of the shipped source passes', () => {
    const root = copy()
    try { expect(check.checkCustomerWording(root)).toEqual([]) } finally { rmSync(root, { recursive: true, force: true }) }
  })

  test('an edited template function fails the build until re-pinned (and re-pinning changes the identity, voiding approvals)', () => {
    const root = copy()
    try {
      const f = path.join(root, 'lib/creator-record/presentation/templates.ts')
      writeFileSync(f, readFileSync(f, 'utf8').replace('SI8 has not checked this.', 'SI8 has confirmed this.'))
      expect(check.checkCustomerWording(root).join('\n')).toMatch(/presentation templates changed/)
    } finally { rmSync(root, { recursive: true, force: true }) }
  })

  test('customer wording typed into a guarded surface fails the build', () => {
    const root = copy()
    try {
      const f = path.join(root, 'app/creator-record/CreatorRecordV2Client.tsx')
      writeFileSync(f, readFileSync(f, 'utf8').replace('{PAGE_TEXT.intro}', 'Cleared for commercial use.'))
      expect(check.checkCustomerWording(root).join('\n')).toMatch(/inline customer wording outside the wording set: Cleared for commercial use\./)
    } finally { rmSync(root, { recursive: true, force: true }) }
  })
})
