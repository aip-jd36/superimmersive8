/**
 * CA-RLK-2d — System-Test Signing Isolation.
 *
 * Execution-safety invariant:
 *   An assessment with is_system_test = true MUST NEVER be signed through a
 *   production external provenance provider (Numbers Protocol), regardless of
 *   NUMBERS_API_KEY, UI state, operator action, or request input.
 *
 * These tests prove the invariant at the server-owned policy seam
 * (`selectSigningProvider`) — not merely by a returned class name, but by:
 *   - `kind` / `systemTestIsolated` decision fields;
 *   - `instanceof` on the concrete provider;
 *   - actually invoking `.sign()` and observing the Mock's deterministic,
 *     no-I/O contract (which the Numbers provider cannot produce);
 *   - a source guard on the /sign route (provider choice is server-derived,
 *     request input can never influence it).
 *
 * Run: npx jest __tests__/assessments/signing-provider-policy.test.ts
 */

import fs from 'fs'
import path from 'path'
import {
  selectSigningProvider,
  type SigningProviderPolicyInput,
} from '@/lib/assessments/signing-provider-policy'
import { MockProvenanceProvider } from '@/lib/assessments/providers/mock'
import { NumbersProvenanceProvider } from '@/lib/assessments/providers/numbers'
import type { AssessmentMetadata, ProvenanceMetadata } from '@/types/assessment'

const KEY = 'nk_test_key_value_should_never_be_used_for_a_system_test'

const META: AssessmentMetadata = {
  assessmentNumber: 'ASSESS-TEST-2026-09-08',
  assessmentDate: '2026-09-08',
  reviewerOrganization: 'PMF Strategy Inc. d/b/a SuperImmersive 8',
  methodologyVersion: 'SI8 Reviewer Manual v0.2',
  outcomeCode: 'INSUFFICIENT_EVIDENCE',
  verificationUrl: 'https://app.superimmersive8.com/assessment/ASSESS-TEST-2026-09-08',
}
const PROV: ProvenanceMetadata = { digitalSourceType: 'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia' as any }

// ── T1 / T2 — system-test is always isolated to the safe provider ───────────

describe('system-test isolation', () => {
  it('T1: is_system_test=true + NUMBERS_API_KEY present → Mock, isolated, Numbers NOT selected', () => {
    const d = selectSigningProvider({ isSystemTest: true, numbersApiKey: KEY })
    expect(d.kind).toBe('mock')
    expect(d.systemTestIsolated).toBe(true)
    expect(d.provider).toBeInstanceOf(MockProvenanceProvider)
    expect(d.provider).not.toBeInstanceOf(NumbersProvenanceProvider)
  })

  it('T2: is_system_test=true + NUMBERS_API_KEY absent → Mock, isolated', () => {
    const d = selectSigningProvider({ isSystemTest: true, numbersApiKey: undefined })
    expect(d.kind).toBe('mock')
    expect(d.systemTestIsolated).toBe(true)
    expect(d.provider).toBeInstanceOf(MockProvenanceProvider)
  })

  it('T9: a system-test decision, when .sign() is actually invoked, uses the Mock no-I/O contract (never a network call)', async () => {
    const d = selectSigningProvider({ isSystemTest: true, numbersApiKey: KEY })
    const asset = Buffer.from('fake-video-bytes')
    const result = await d.provider.sign(asset, META, PROV)
    // Mock's contract: empty CID + the original buffer echoed back, no URL.
    expect(result.provenanceAssetId).toBe('')
    expect(result.signedAssetBuffer).toBeInstanceOf(Buffer)
    expect(result.signedAssetBuffer!.equals(asset)).toBe(true)
    // Numbers would have neither a signedAssetBuffer nor an empty CID and would
    // attempt an outbound fetch — impossible here.
  })
})

// ── T3 / T4 — real assessments keep the pre-CA-RLK-2d production policy ──────

describe('real-assessment provider policy is preserved', () => {
  it('T3: is_system_test=false + NUMBERS_API_KEY present → Numbers', () => {
    const d = selectSigningProvider({ isSystemTest: false, numbersApiKey: KEY })
    expect(d.kind).toBe('numbers')
    expect(d.systemTestIsolated).toBe(false)
    expect(d.provider).toBeInstanceOf(NumbersProvenanceProvider)
  })

  it('T4: is_system_test=false + NUMBERS_API_KEY absent → Mock (existing fallback)', () => {
    const d = selectSigningProvider({ isSystemTest: false, numbersApiKey: undefined })
    expect(d.kind).toBe('mock')
    expect(d.systemTestIsolated).toBe(false)
    expect(d.provider).toBeInstanceOf(MockProvenanceProvider)
  })

  it('T4: empty-string NUMBERS_API_KEY is treated as absent (unchanged behaviour)', () => {
    const d = selectSigningProvider({ isSystemTest: false, numbersApiKey: '' })
    expect(d.kind).toBe('mock')
  })
})

// ── T5 — fail closed: unknown / non-false is_system_test → safe provider ────

describe('fail-closed for indeterminate is_system_test', () => {
  it('T5: is_system_test = undefined (should never occur — column is NOT NULL) → Mock, isolated', () => {
    const d = selectSigningProvider({ isSystemTest: undefined as any, numbersApiKey: KEY })
    expect(d.kind).toBe('mock')
    expect(d.systemTestIsolated).toBe(true)
  })

  it('T5: is_system_test = null → Mock, isolated', () => {
    const d = selectSigningProvider({ isSystemTest: null as any, numbersApiKey: KEY })
    expect(d.kind).toBe('mock')
    expect(d.systemTestIsolated).toBe(true)
  })

  it('T5: production provider is selected ONLY on an exact `false`', () => {
    // Any non-false value with a key present must NOT reach Numbers.
    for (const v of [true, undefined, null, 0, '', 'false', {}] as any[]) {
      expect(selectSigningProvider({ isSystemTest: v, numbersApiKey: KEY }).kind).toBe('mock')
    }
    expect(selectSigningProvider({ isSystemTest: false, numbersApiKey: KEY }).kind).toBe('numbers')
  })
})

// ── T6 / T8 — the policy seam cannot bypass or weaken any integrity gate ────

describe('policy seam is provider-choice only (no integrity surface)', () => {
  it('T6/T8: SigningProviderPolicyInput carries no assessment identity, sign-off, revision, PDF, or status', () => {
    // Compile-time + runtime shape check: the only inputs are the two scalars.
    const input: SigningProviderPolicyInput = { isSystemTest: false, numbersApiKey: undefined }
    expect(Object.keys(input).sort()).toEqual(['isSystemTest', 'numbersApiKey'])
    // The function is pure: same inputs → same decision kind.
    expect(selectSigningProvider(input).kind).toBe(
      selectSigningProvider({ ...input }).kind,
    )
  })
})

// ── T5 (route) — provider choice is server-derived; request input cannot set it ─

describe('/sign route: provider selection is server-owned', () => {
  const routeSrc = fs.readFileSync(
    path.join(__dirname, '..', '..', 'app', 'api', 'admin', 'submissions', '[id]', 'sign', 'route.ts'),
    'utf8',
  )

  it('T5: the route derives isSystemTest from the assessment record, not the request', () => {
    expect(routeSrc).toContain('selectSigningProvider({')
    expect(routeSrc).toContain('isSystemTest: assessment.is_system_test')
    // Request body is never read for provider choice — POST ignores it.
    expect(routeSrc).toContain('export async function POST(_request: NextRequest')
    expect(routeSrc).not.toContain('_request.json()')
    expect(routeSrc).not.toContain('request.json()')
  })

  it('T9: the raw NUMBERS_API_KEY ternary that bypassed is_system_test is gone', () => {
    expect(routeSrc).not.toContain('process.env.NUMBERS_API_KEY\n      ? new NumbersProvenanceProvider')
    expect(routeSrc).not.toMatch(/\?\s*new NumbersProvenanceProvider/)
    // NUMBERS_API_KEY still reaches the policy — but only through it.
    expect(routeSrc).toContain('numbersApiKey: process.env.NUMBERS_API_KEY')
  })
})
