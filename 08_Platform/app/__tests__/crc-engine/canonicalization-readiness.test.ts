/**
 * Canonicalization Readiness Gate tests (LK-94, 2026-09-01). Validates the
 * module at lib/crc-engine/canonicalization-readiness.ts per LK-94 §15 A-H.
 */

import * as fs from 'fs'
import * as path from 'path'
import {
  checkCanonicalizationReadiness,
  findIdentitiesMissingCanonicalizationReadiness,
  PRE_LK94_GRANDFATHERED_TOOL_IDS,
  PRE_LK94_GRANDFATHERED_PROVIDER_IDS,
  NEW_IDENTITY_CANONICALIZATION_READINESS,
  LIVE_CANONICAL_TOOL_IDS,
  LIVE_ASSET_PROVIDER_IDS,
} from '@/lib/crc-engine/canonicalization-readiness'

// ── A/B: known-good identity/expression resolves correctly ─────────────────

describe('A: known-good tool identity/expression resolves correctly', () => {
  test('kling + "kling ai" (existing real alias) passes', () => {
    expect(checkCanonicalizationReadiness({ kind: 'tool', identifier: 'kling', representativeExpression: 'kling ai' })).toBe(true)
  })

  test('luma + the exact LK-89-remediated expression passes', () => {
    expect(
      checkCanonicalizationReadiness({ kind: 'tool', identifier: 'luma', representativeExpression: "luma ai's dream machine" }),
    ).toBe(true)
  })
})

describe('B: known-good provider identity/expression resolves correctly', () => {
  test('storyblocks + "storyblocks" (existing real alias) passes', () => {
    expect(checkCanonicalizationReadiness({ kind: 'provider', identifier: 'storyblocks', representativeExpression: 'storyblocks' })).toBe(
      true,
    )
  })

  test('pond5 + "pond5" (existing real alias) passes', () => {
    expect(checkCanonicalizationReadiness({ kind: 'provider', identifier: 'pond5', representativeExpression: 'pond5' })).toBe(true)
  })
})

// ── C: intentionally unresolved expression fails readiness ─────────────────

describe('C: intentionally unresolved/mismatched expressions fail readiness', () => {
  test('a made-up tool name fails', () => {
    expect(
      checkCanonicalizationReadiness({ kind: 'tool', identifier: 'kling', representativeExpression: 'Some Brand New Tool Nobody Made' }),
    ).toBe(false)
  })

  test('a made-up provider name fails', () => {
    expect(
      checkCanonicalizationReadiness({ kind: 'provider', identifier: 'storyblocks', representativeExpression: 'NotARealProviderXYZ' }),
    ).toBe(false)
  })

  test('an expression that resolves, but to a DIFFERENT identity than claimed, fails (never a partial-credit pass)', () => {
    expect(checkCanonicalizationReadiness({ kind: 'tool', identifier: 'runway-gen3', representativeExpression: 'kling ai' })).toBe(false)
  })

  test('an ambiguous expression (known_ambiguous, not resolved) fails -- readiness requires a deterministic resolution, not merely recognition', () => {
    expect(
      checkCanonicalizationReadiness({ kind: 'tool', identifier: 'gemini-api', representativeExpression: 'Nano Banana' }),
    ).toBe(false)
  })
})

// ── D: future/new identity enforcement cannot silently pass ────────────────

describe('D: enforcement cannot be silently bypassed by a new, uncovered identity', () => {
  test('an identifier present in neither the grandfather list nor the readiness-evidence list is correctly flagged as missing', () => {
    const missing = findIdentitiesMissingCanonicalizationReadiness([...LIVE_CANONICAL_TOOL_IDS, 'hypothetical-future-tool'], LIVE_ASSET_PROVIDER_IDS)
    expect(missing).toEqual([{ kind: 'tool', identifier: 'hypothetical-future-tool' }])
  })

  test('same proof for a hypothetical new provider', () => {
    const missing = findIdentitiesMissingCanonicalizationReadiness(LIVE_CANONICAL_TOOL_IDS, [...LIVE_ASSET_PROVIDER_IDS, 'hypothetical-future-provider'])
    expect(missing).toEqual([{ kind: 'provider', identifier: 'hypothetical-future-provider' }])
  })

  test('the live, current registries produce zero missing entries today (every currently-registered identity is either grandfathered or has passing evidence)', () => {
    expect(findIdentitiesMissingCanonicalizationReadiness(LIVE_CANONICAL_TOOL_IDS, LIVE_ASSET_PROVIDER_IDS)).toEqual([])
  })

  test('every declared NEW_IDENTITY_CANONICALIZATION_READINESS entry (none exist yet) actually passes checkCanonicalizationReadiness -- guards against a future entry being added but not actually resolving', () => {
    for (const entry of NEW_IDENTITY_CANONICALIZATION_READINESS) {
      expect(checkCanonicalizationReadiness(entry)).toBe(true)
    }
  })
})

// ── E: grandfathered pre-policy identities do not become false failures ────

describe('E: grandfathering is real and accurate, not accidental', () => {
  test('every currently-registered tool identity is covered by the frozen pre-LK-94 snapshot', () => {
    for (const id of LIVE_CANONICAL_TOOL_IDS) {
      expect(PRE_LK94_GRANDFATHERED_TOOL_IDS).toContain(id)
    }
  })

  test('every currently-registered provider identity is covered by the frozen pre-LK-94 snapshot', () => {
    for (const id of LIVE_ASSET_PROVIDER_IDS) {
      expect(PRE_LK94_GRANDFATHERED_PROVIDER_IDS).toContain(id)
    }
  })

  test('the frozen snapshots contain nothing beyond what is currently live (no phantom grandfathering of identities that never existed)', () => {
    for (const id of PRE_LK94_GRANDFATHERED_TOOL_IDS) {
      expect(LIVE_CANONICAL_TOOL_IDS).toContain(id)
    }
    for (const id of PRE_LK94_GRANDFATHERED_PROVIDER_IDS) {
      expect(LIVE_ASSET_PROVIDER_IDS).toContain(id)
    }
  })

  test('a grandfathered identity absent from NEW_IDENTITY_CANONICALIZATION_READINESS is never reported missing -- grandfathering does not require evidence', () => {
    // Synthesia carries zero extraction alias (confirmed elsewhere in this
    // repository) and zero NEW_IDENTITY_CANONICALIZATION_READINESS entry --
    // it must still be absent from the missing-list, because it is
    // grandfathered, not because it happens to pass a check.
    const missing = findIdentitiesMissingCanonicalizationReadiness(['synthesia'], [])
    expect(missing).toEqual([])
  })
})

// ── F: subsystem boundary -- identity-level only, never touches governed knowledge ──

describe('F: canonicalization-readiness.ts touches only identity/canonicalization concerns', () => {
  test('imports no Retrieval Engine, Projection Layer, or Bounded Interpretation logic -- identity-level check only, never governed-knowledge-aware', () => {
    const filePath = path.join(__dirname, '..', '..', 'lib', 'crc-engine', 'canonicalization-readiness.ts')
    const source = fs.readFileSync(filePath, 'utf-8')
    const importText = (source.match(/^import .+$/gm) ?? []).join('\n')
    expect(importText).not.toMatch(/retrieval-engine/i)
    expect(importText).not.toMatch(/projection-layer/i)
    expect(importText).not.toMatch(/bounded-interpretation/i)
    expect(importText).not.toMatch(/platform-rights-matrix/i)
    expect(importText).not.toMatch(/living-notebook/i)
  })
})
