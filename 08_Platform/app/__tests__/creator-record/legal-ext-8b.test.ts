/**
 * CR-DOC-READER-EXT-8B — the candidate Privacy Notice and Terms revisions, and what publishing them would do. Nothing is published.
 */
import { approvedPolicyVersions, legalPoliciesApproved, LEGAL_VERSION_PATTERN, PRIVACY_NOTICE, TERMS_OF_SERVICE } from '@/lib/legal/policies'
import { AI_EXAMINATION_PERMISSION_APPROVED_WORDING, aiExaminationPermissionVersion, EVIDENCE_CONSENT_APPROVED_WORDING, evidenceConsentVersion } from '@/lib/creator-record-flow/authorization-versions'
import { customerWordingIdentity } from '@/lib/creator-record-flow/customer-wording'
import { candidatePrivacyNotice, candidateTerms, CANDIDATE_PRIVACY_VERSION, CANDIDATE_TERMS_VERSION, PRIVACY_INSERTIONS, PRIVACY_REPLACEMENTS, TERMS_REPLACEMENTS } from '@/test-support/legal-candidates-ext-8b'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const APP = path.join(__dirname, '../..')
const LIVE_AI = 'cr-v2-ai-permission-1__privacy-2026-11-09__terms-2026-11-18'
const LIVE_STORAGE = 'cr-v2-storage-consent-1__privacy-2026-11-09__terms-2026-11-18'

describe('nothing is published', () => {
  test('the live documents and identifiers are unchanged', () => {
    expect([PRIVACY_NOTICE?.version, TERMS_OF_SERVICE?.version]).toEqual(['privacy-2026-11-09', 'terms-2026-11-18'])
    expect([aiExaminationPermissionVersion(), evidenceConsentVersion()]).toEqual([LIVE_AI, LIVE_STORAGE])
  })
  test('no application module imports the candidate', () => {
    const walk = (d: string): string[] => require('node:fs').readdirSync(d, { withFileTypes: true }).flatMap((e: { name: string; isDirectory(): boolean }) => (e.isDirectory() ? (['node_modules', '.next'].includes(e.name) ? [] : walk(path.join(d, e.name))) : /\.(ts|tsx)$/.test(e.name) ? [path.join(d, e.name)] : []))
    for (const f of [...walk(path.join(APP, 'lib')), ...walk(path.join(APP, 'app')), ...walk(path.join(APP, 'components'))]) expect(readFileSync(f, 'utf8')).not.toMatch(/legal-candidates-ext-8b/)
  })
})

describe('the candidate documents', () => {
  const P = candidatePrivacyNotice()
  const T = candidateTerms()
  test('complete and well-formed (a build with them would publish both)', () => {
    expect(LEGAL_VERSION_PATTERN.test(P.version) && LEGAL_VERSION_PATTERN.test(T.version)).toBe(true)
    expect(legalPoliciesApproved({ privacy: P, terms: T })).toBe(true)
    expect(approvedPolicyVersions({ privacy: P, terms: T })).toEqual({ privacy: CANDIDATE_PRIVACY_VERSION, terms: CANDIDATE_TERMS_VERSION })
  })
  test('Privacy Notice: exactly the three replacements and two new paragraphs; nothing else changed', () => {
    const live = PRIVACY_NOTICE!.paragraphs
    expect(P.paragraphs.length).toBe(live.length + PRIVACY_INSERTIONS.length)
    const inserted = new Set(PRIVACY_INSERTIONS.map((i) => i.text))
    const kept = P.paragraphs.filter((p) => !inserted.has(p))
    expect(kept.length).toBe(live.length)
    const changed = kept.flatMap((p, i) => (p !== live[i] ? [i] : []))
    expect(changed.length).toBe(PRIVACY_REPLACEMENTS.length)
    for (const r of PRIVACY_REPLACEMENTS) expect(kept.some((p) => p.includes(r.to))).toBe(true)
    for (const i of PRIVACY_INSERTIONS) expect(P.paragraphs[P.paragraphs.findIndex((p) => p.startsWith(i.after)) + 1]).toBe(i.text)
  })
  test('Terms: only the §5 coverage paragraph changes, and it names no provider', () => {
    const live = TERMS_OF_SERVICE!.paragraphs
    const changed = T.paragraphs.flatMap((p, i) => (p !== live[i] ? [i] : []))
    expect(changed.length).toBe(1)
    const para = T.paragraphs[changed[0]]
    for (const r of TERMS_REPLACEMENTS) expect(para).toContain(r.to)
    expect(para).not.toMatch(/Runway|Higgsfield|Artlist|Epidemic|Getty|iStock|Shutterstock|Adobe|Pond5|Kling|Pika/)
  })
  test('accuracy: the new wording states what the code does (whole file sent; no redaction; text not reproduced; emails/phones rejected)', () => {
    const t = P.paragraphs.join('\n')
    expect(t).toContain('sends the whole document, as you added it')
    expect(t).toContain('SI8 does not remove or redact anything from the file you add.')
    expect(t).toContain('your record does not reproduce text from the document')
    expect(t).toContain('SI8 rejects any reading that contains an email address or phone number')
    // Unchanged statements the behaviour still matches: retention, deletion, Anthropic as provider.
    expect(t).toContain('we delete each original file 90 days after you add it')
    expect(t).toContain('Anthropic: automated reading of documents you give permission for.')
  })
})

describe('what publishing would do to consent', () => {
  const versions = { privacy: CANDIDATE_PRIVACY_VERSION, terms: CANDIDATE_TERMS_VERSION }
  test('new permissions and consents name the new versions; every earlier identifier (receipts included) stops matching', () => {
    const ai = aiExaminationPermissionVersion(versions)
    const storage = evidenceConsentVersion(versions)
    expect(ai).toBe('cr-v2-ai-permission-1__privacy-2026-11-20__terms-2026-11-20')
    expect(storage).toBe('cr-v2-storage-consent-1__privacy-2026-11-20__terms-2026-11-20')
    expect((ai as string).length).toBeLessThanOrEqual(120)
    expect(ai).not.toBe(LIVE_AI)
    expect(storage).not.toBe(LIVE_STORAGE)
  })
  test('the unchanged checkbox wording keeps its approved fingerprint (the wording ids and their digest are untouched)', () => {
    expect(AI_EXAMINATION_PERMISSION_APPROVED_WORDING?.id).toBe('cr-v2-ai-permission-1')
    expect(EVIDENCE_CONSENT_APPROVED_WORDING?.id).toBe('cr-v2-storage-consent-1')
    expect(customerWordingIdentity().sha256).toBe(AI_EXAMINATION_PERMISSION_APPROVED_WORDING?.customer_wording_sha256)
    expect(customerWordingIdentity().sha256).toBe('d9ab1ccb43e8e983c997d9a80e12aae208f90123a4c3ea02b9cc780c1b2ff070')
  })
  test('prepared versions are not made stale by the policy change alone: governance checks pass unchanged with the candidates published', () => {
    const docs = { privacy: candidatePrivacyNotice(), terms: candidateTerms() }
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
      expect(ai()).toBe('cr-v2-ai-permission-1__privacy-2026-11-20__terms-2026-11-20')
      const inputs = approvedCustomerRecordInputs(GOV)
      for (const [v, st] of [[7, inputs.source_text], [8, inputs.source_text_examination]] as const) {
        const r = checkApprovedSources(inputs.sources, st ?? null, TOPIC_CLAIMS_FIXTURE, '2026-11-20', { id: 'si8/creator-record-v2-record', version: v })
        expect(r.ok).toBe(true)
        expect(JSON.stringify(r)).toContain(CREATOR_RECORD_QUESTIONNAIRE_CONTRACT_SHA256)
      }
      expect(JSON.stringify(checkApprovedSources(inputs.sources, inputs.source_text, TOPIC_CLAIMS_FIXTURE, '2026-11-20', { id: 'si8/creator-record-v2-record', version: 7 }))).toContain(CREATOR_RECORD_SOURCE_TEXT_SHA256)
      expect(cwi().sha256).toBe('d9ab1ccb43e8e983c997d9a80e12aae208f90123a4c3ea02b9cc780c1b2ff070')
    })
  })
})
