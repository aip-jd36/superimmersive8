/**
 * CR-DOC-READER-EXT-8D — the published Privacy Notice and Terms are exactly the EXT-8B/8C-approved wording
 * (JD-CR-DOC-READER-EXT-8C-20261119), and what the publication does to consent.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { approvedPolicyVersions, legalPoliciesApproved, PRIVACY_NOTICE, TERMS_OF_SERVICE } from '@/lib/legal/policies'
import { AI_EXAMINATION_PERMISSION_APPROVED_WORDING, aiExaminationPermissionVersion, EVIDENCE_CONSENT_APPROVED_WORDING, evidenceConsentVersion } from '@/lib/creator-record-flow/authorization-versions'
import { customerWordingIdentity } from '@/lib/creator-record-flow/customer-wording'
import { APPROVED_CANDIDATE_WORDING_SHA256, PRIVACY_INSERTIONS, PRIVACY_REPLACEMENTS, TERMS_REPLACEMENTS, withPolicyVersion } from '@/test-support/legal-candidates-ext-8b'

const APP = path.join(__dirname, '../..')
const PREVIOUS_AI = 'cr-v2-ai-permission-1__privacy-2026-11-09__terms-2026-11-18'
const PREVIOUS_STORAGE = 'cr-v2-storage-consent-1__privacy-2026-11-09__terms-2026-11-18'
const P = PRIVACY_NOTICE!
const T = TERMS_OF_SERVICE!

describe('the published documents', () => {
  test('versions, effective date and approval reference', () => {
    expect(P).toMatchObject({ version: 'privacy-2026-11-19', effective_date: '2026-11-19', approval_reference: 'JD-CR-DOC-READER-EXT-8C-20261119 privacy' })
    expect(T).toMatchObject({ version: 'terms-2026-11-19', effective_date: '2026-11-19', approval_reference: 'JD-CR-DOC-READER-EXT-8C-20261119 terms' })
    expect(legalPoliciesApproved()).toBe(true)
  })
  test('the paragraphs are exactly the founder-approved wording (digest)', () => {
    const digest = createHash('sha256').update(JSON.stringify({ privacy: P.paragraphs, terms: T.paragraphs })).digest('hex')
    expect(digest).toBe(APPROVED_CANDIDATE_WORDING_SHA256)
    expect(digest).toBe('0a6fa5dd56da9e0611518727464ba7e1e98d66acd386e905c29c7e1e9f103e89')
  })
  test('each approved change is present; inserted paragraphs follow their anchors', () => {
    for (const r of PRIVACY_REPLACEMENTS) expect(P.paragraphs.filter((p) => p.includes(r.to))).toHaveLength(1)
    for (const i of PRIVACY_INSERTIONS) expect(P.paragraphs[P.paragraphs.findIndex((p) => p.startsWith(i.after)) + 1]).toBe(i.text)
    for (const r of TERMS_REPLACEMENTS) expect(T.paragraphs.filter((p) => p.includes(r.to))).toHaveLength(1)
  })
  test('the Terms coverage paragraph names no provider; the reading statements stay scoped to licences and permissions', () => {
    const coverage = T.paragraphs.find((p) => p.startsWith('Guidance is available only for some AI tools'))!
    expect(coverage).not.toMatch(/Runway|Higgsfield|Artlist|Epidemic|Getty|iStock|Shutterstock|Adobe|Pond5|Kling|Pika/)
    const t = P.paragraphs.join('\n')
    expect(t).toContain('For licences and permissions, the reading is instructed not to copy')
    expect(t).not.toMatch(/SI8 rejects any reading that/) // the receipt reader has no such check
  })
  test('the candidate module is test-support only', () => {
    const walk = (d: string): string[] => require('node:fs').readdirSync(d, { withFileTypes: true }).flatMap((e: { name: string; isDirectory(): boolean }) => (e.isDirectory() ? (['node_modules', '.next'].includes(e.name) ? [] : walk(path.join(d, e.name))) : /\.(ts|tsx)$/.test(e.name) ? [path.join(d, e.name)] : []))
    for (const f of [...walk(path.join(APP, 'lib')), ...walk(path.join(APP, 'app')), ...walk(path.join(APP, 'components'))]) expect(readFileSync(f, 'utf8')).not.toMatch(/legal-candidates-ext-8b/)
  })
})

describe('what the publication does to consent', () => {
  test('new permissions and consents name the new versions; the previous identifiers (receipts included) no longer match', () => {
    expect(approvedPolicyVersions()).toEqual({ privacy: 'privacy-2026-11-19', terms: 'terms-2026-11-19' })
    expect(aiExaminationPermissionVersion()).toBe('cr-v2-ai-permission-1__privacy-2026-11-19__terms-2026-11-19')
    expect(evidenceConsentVersion()).toBe('cr-v2-storage-consent-1__privacy-2026-11-19__terms-2026-11-19')
    expect(aiExaminationPermissionVersion()).not.toBe(PREVIOUS_AI)
    expect(evidenceConsentVersion()).not.toBe(PREVIOUS_STORAGE)
  })
  test('the unchanged checkbox wording keeps its approved fingerprint', () => {
    expect(AI_EXAMINATION_PERMISSION_APPROVED_WORDING?.id).toBe('cr-v2-ai-permission-1')
    expect(EVIDENCE_CONSENT_APPROVED_WORDING?.id).toBe('cr-v2-storage-consent-1')
    expect(customerWordingIdentity().sha256).toBe(AI_EXAMINATION_PERMISSION_APPROVED_WORDING?.customer_wording_sha256)
    expect(customerWordingIdentity().sha256).toBe('d9ab1ccb43e8e983c997d9a80e12aae208f90123a4c3ea02b9cc780c1b2ff070')
  })
  test('prepared versions are not made stale by a legal-version change alone: governance checks pass unchanged under a later version', () => {
    const docs = { privacy: withPolicyVersion(PRIVACY_NOTICE, 'privacy-2026-12-01'), terms: withPolicyVersion(TERMS_OF_SERVICE, 'terms-2026-12-01') }
    jest.isolateModules(() => {
      jest.doMock('@/lib/legal/policies', () => {
        const actual = jest.requireActual('@/lib/legal/policies')
        return { ...actual, PRIVACY_NOTICE: docs.privacy, TERMS_OF_SERVICE: docs.terms, legalPoliciesApproved: () => actual.legalPoliciesApproved(docs), approvedPolicyVersions: () => actual.approvedPolicyVersions(docs) }
      })
      const { approvedCustomerRecordInputs } = require('@/lib/creator-record/customer-flow/approved-inputs')
      const { checkApprovedSources } = require('@/lib/creator-record/customer-record/sources')
      const { CREATOR_RECORD_GOVERNANCE_AUTHORITY: GOV, CREATOR_RECORD_SOURCE_TEXT_SHA256, CREATOR_RECORD_QUESTIONNAIRE_CONTRACT_SHA256 } = require('@/lib/creator-record/governed/sources')
      const { TOPIC_CLAIMS_FIXTURE } = require('@/lib/retrieval-engine/topic-claims-fixture')
      const { aiExaminationPermissionVersion: ai } = require('@/lib/creator-record-flow/authorization-versions')
      const { customerWordingIdentity: cwi } = require('@/lib/creator-record-flow/customer-wording')
      expect(ai()).toBe('cr-v2-ai-permission-1__privacy-2026-12-01__terms-2026-12-01')
      const inputs = approvedCustomerRecordInputs(GOV)
      for (const [v, st] of [[7, inputs.source_text], [8, inputs.source_text_examination]] as const) {
        const r = checkApprovedSources(inputs.sources, st ?? null, TOPIC_CLAIMS_FIXTURE, '2026-12-01', { id: 'si8/creator-record-v2-record', version: v })
        expect(r.ok).toBe(true)
        expect(JSON.stringify(r)).toContain(CREATOR_RECORD_QUESTIONNAIRE_CONTRACT_SHA256)
      }
      expect(JSON.stringify(checkApprovedSources(inputs.sources, inputs.source_text, TOPIC_CLAIMS_FIXTURE, '2026-12-01', { id: 'si8/creator-record-v2-record', version: 7 }))).toContain(CREATOR_RECORD_SOURCE_TEXT_SHA256)
      expect(cwi().sha256).toBe('d9ab1ccb43e8e983c997d9a80e12aae208f90123a4c3ea02b9cc780c1b2ff070')
    })
  })
})
