/**
 * CR-PUBLIC-1 — Terms and AI-permission versioning facts the public-launch sequence depends on.
 *
 * The published Terms are unchanged (invitation-only §2); the public-access revision is a draft for founder review
 * (08_Platform/implementation/cr-public-1/CR-PUBLIC-1-TERMS-REVISION-DRAFT.md) and is not in the application. Any new Terms
 * version changes both authorization identifiers, so every earlier AI-reading grant stops permitting examination until the
 * operator replaces the authority row and the creator gives the current permission again.
 */
import { readFileSync } from 'fs'
import path from 'path'
import { TERMS_OF_SERVICE, PRIVACY_NOTICE, approvedPolicyVersions } from '@/lib/legal/policies'
import { aiExaminationPermissionVersion, evidenceConsentVersion } from '@/lib/creator-record-flow/authorization-versions'
import { revertExt8b } from '@/test-support/legal-candidates-ext-8b'

const DRAFT = path.join(__dirname, '..', '..', '..', 'implementation', 'cr-public-1', 'CR-PUBLIC-1-TERMS-REVISION-DRAFT.md')
const INVITATION = 'Creator Record is currently available by invitation only.'

describe('the published Terms (CR-PUBLIC-LAUNCH)', () => {
  // CR-DOC-READER-EXT-8D: the current versions are terms-2026-11-19 / privacy-2026-11-19 (Terms §5 and Privacy §§1, 2, 4, 5); §2 unchanged.
  test('the current Terms keep the approved public §2; versions privacy-2026-11-19 / terms-2026-11-19', () => {
    expect(TERMS_OF_SERVICE?.version).toBe('terms-2026-11-19')
    expect(TERMS_OF_SERVICE?.paragraphs[4]).toBe('2. Who can use Creator Record')
    expect(TERMS_OF_SERVICE?.paragraphs[5].startsWith('Creator Record is available to registered SI8 users, subject to these Terms and applicable eligibility, payment, and service requirements.')).toBe(true)
    expect(TERMS_OF_SERVICE?.paragraphs.join('\n')).not.toContain(INVITATION)
    expect(PRIVACY_NOTICE?.version).toBe('privacy-2026-11-19')
    expect(approvedPolicyVersions()).toEqual({ privacy: 'privacy-2026-11-19', terms: 'terms-2026-11-19' })
  })

  test('the current identifiers embed the published versions (the authority row must name this AI-permission identifier)', () => {
    expect(aiExaminationPermissionVersion()).toBe('cr-v2-ai-permission-1__privacy-2026-11-19__terms-2026-11-19')
    expect(evidenceConsentVersion()).toBe('cr-v2-storage-consent-1__privacy-2026-11-19__terms-2026-11-19')
  })
})

describe('a new Terms version rotates both identifiers (why the authority row must be replaced)', () => {
  test('a hypothetical public-access Terms version yields different identifiers; old grants no longer match', () => {
    const next = { privacy: 'privacy-2026-11-09', terms: 'terms-2099-01-01' }
    const aiNext = aiExaminationPermissionVersion(next)
    expect(aiNext).toBe('cr-v2-ai-permission-1__privacy-2026-11-09__terms-2099-01-01')
    expect(aiNext).not.toBe(aiExaminationPermissionVersion())
    expect(evidenceConsentVersion(next)).toBe('cr-v2-storage-consent-1__privacy-2026-11-09__terms-2099-01-01')
  })

  test('without both policies approved, no AI permission is offered (fail closed)', () => {
    expect(aiExaminationPermissionVersion(null)).toBeNull()
  })
})

describe('the founder-review draft', () => {
  test('exists, changes only the §2 availability sentence, and is marked unpublished, with the approved §2 sentence', () => {
    const d = readFileSync(DRAFT, 'utf8')
    expect(d).toContain('**Status: DRAFT — NOT APPROVED — NOT PUBLISHED.**')
    expect(d).toContain(`~~${INVITATION}~~`)
    // CR-PUBLIC-2A: the founder-approved §2 sentence, verbatim
    expect(d).toContain('Creator Record is available to registered SI8 users, subject to these Terms and applicable eligibility, payment, and service requirements.')
    // every other published paragraph is carried over verbatim
    // ... as published at terms-2026-11-18 (the draft predates the CR-DOC-READER-EXT-8D §5 change).
    for (const [i, p] of revertExt8b('terms', TERMS_OF_SERVICE?.paragraphs ?? []).entries()) {
      if (i === 5) continue
      for (const line of p.split('\n')) expect({ i, found: d.includes(line) }).toEqual({ i, found: true })
    }
  })
})
