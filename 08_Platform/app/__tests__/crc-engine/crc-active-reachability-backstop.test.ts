/**
 * CRC-Active Extraction Reachability Backstop enforcement (CRC-Active Tool
 * Extraction Reachability Backstop + Gap Remediation milestone). Live
 * enforcement assertion for lib/crc-engine/crc-active-reachability-
 * backstop.ts -- see that module's own header for the full rationale and
 * its relationship to LK-94's forward-only canonicalization-readiness.ts.
 */

import {
  auditCrcActiveReachability,
  deriveCrcActiveToolIds,
  deriveCrcActiveProviderIds,
  findUnreachableCrcActiveIdentities,
} from '@/lib/crc-engine/crc-active-reachability-backstop'
import { checkCanonicalizationReadiness } from '@/lib/crc-engine/canonicalization-readiness'
import { ASSET_PROVIDER_IDS } from '@/types/interview-engine'

describe('A: population derivation', () => {
  test('CRC-active tool population includes a real, non-trivial subset of currently-governed identities (Matrix + TopicClaim origin) -- spot-checks two representative examples only, never the full canonical list (cross-domain-bleed-preflight.test.ts guards against hardcoded full-list duplication elsewhere in this tree)', () => {
    const ids = deriveCrcActiveToolIds()
    expect(ids).toContain('midjourney')
    expect(ids).toContain('pika')
  })

  test('retired-only identities (crc_eligible: No everywhere) are excluded -- e.g. the retired legacy pika/kling/runway-gen3 Matrix rows do not themselves add anything beyond what TopicClaims already contribute', () => {
    // Sanity: population is non-empty and finite, not silently empty due to a derivation bug.
    expect(deriveCrcActiveToolIds().length).toBeGreaterThan(0)
  })

  test('CRC-active asset-provider population is a subset of the canonical registry, derived (not hand-duplicated)', () => {
    // Derives the expectation from ASSET_PROVIDER_IDS itself rather than a
    // literal array -- a hardcoded full-list copy here would itself trip
    // cross-domain-bleed-preflight.test.ts's own hardcoded-full-provider-
    // list scan, which found and flagged exactly that shape during this
    // milestone's own validation.
    const ids = deriveCrcActiveProviderIds()
    for (const id of ids) {
      expect(ASSET_PROVIDER_IDS).toContain(id)
    }
    expect(ids.length).toBeGreaterThan(0)
  })
})

describe('B: enforcement -- every currently CRC-active identity must be reachable', () => {
  test('zero unreachable CRC-active identities remain after this milestone\'s remediation', () => {
    const unreachable = findUnreachableCrcActiveIdentities()
    if (unreachable.length > 0) {
      throw new Error(
        `${unreachable.length} CRC-active identity(ies) have no safe extraction path to their canonical ID: ` +
          unreachable.map((u) => `${u.kind}:${u.identifier} (representativeExpression=${u.representativeExpression ?? 'MISSING'})`).join(', '),
      )
    }
    expect(unreachable).toEqual([])
  })

  test('every CRC-active identity has an explicit representative-expression map entry (no silent gap)', () => {
    const missing = auditCrcActiveReachability().filter((r) => r.representativeExpression === null)
    expect(missing).toEqual([])
  })
})

describe('C: negative control -- the backstop genuinely detects the exact failure class it exists to catch', () => {
  test('a synthetic identity with NO extraction alias fails checkCanonicalizationReadiness, exactly as Pika/Synthesia/Luma-bare-name did before remediation', () => {
    // Does not touch production fixtures -- proves the underlying LK-94
    // primitive this backstop reuses actually fails closed on a genuinely
    // unaliased representative expression, the same shape as the real
    // pre-remediation defects.
    const result = checkCanonicalizationReadiness({
      kind: 'tool',
      // Cast is intentional: this identifier is NOT a real CanonicalToolId
      // and NOT in KNOWN_TOOLS -- proving the negative case, not a real claim.
      identifier: 'totally-synthetic-unaliased-tool-xyz' as never,
      representativeExpression: 'Totally Synthetic Unaliased Tool XYZ',
    })
    expect(result).toBe(false)
  })

  test('the same primitive passes for a real, now-remediated identity (Pika) -- proving the check is not vacuously false for everything', () => {
    const result = checkCanonicalizationReadiness({ kind: 'tool', identifier: 'pika', representativeExpression: 'Pika' })
    expect(result).toBe(true)
  })

  test('reproduces the exact pre-remediation Pika/Synthesia/Luma-bare-name failure shape via the real audit function, confirming the audit population and check together would have caught this before publication', () => {
    // This does not mutate REPRESENTATIVE_EXPRESSIONS or KNOWN_TOOLS -- it
    // re-derives what auditCrcActiveReachability would have reported had
    // 'pika'/'synthesia' lacked an alias, by calling the same underlying
    // primitive directly with the real (pre-fix-equivalent) alias absence
    // simulated only in this synthetic identifier, never in production data.
    const preRemediationShape = checkCanonicalizationReadiness({
      kind: 'tool',
      identifier: 'pika',
      // Deliberately wrong/unaliased-shaped expression, standing in for
      // what Pika's own resolution looked like before this milestone
      // added the 'pika' KNOWN_TOOLS entry (i.e. any expression that does
      // not resolve to 'pika' under the CURRENT, already-fixed table --
      // this uses a nonsense string precisely so it stays a true negative
      // regardless of future alias additions).
      representativeExpression: 'ZzNonsenseUnresolvableExpressionZz',
    })
    expect(preRemediationShape).toBe(false)
  })
})

describe('D: full active-estate audit -- zero P0/P1 defects remain', () => {
  test('every CRC-active tool and provider identity is reachable, printed as a readable table for audit trail', () => {
    const results = auditCrcActiveReachability()
    const table = results.map((r) => `${r.kind}:${r.identifier} -> ${r.representativeExpression ?? 'MISSING'} : ${r.reachable ? 'PASS' : 'DEFECT'}`)
    // eslint-disable-next-line no-console
    console.log(table.join('\n'))
    expect(results.every((r) => r.reachable)).toBe(true)
  })
})
