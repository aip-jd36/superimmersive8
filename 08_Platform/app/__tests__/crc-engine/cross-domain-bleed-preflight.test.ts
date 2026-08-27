/**
 * Cross-Domain Bleed Preflight tests (2026-08-27). Proves the preflight
 * detects the real defect class FGR_007 found (a null-scope claim from one
 * domain becoming unintentionally reachable once a new provider from a
 * different domain registers), using the REAL exported mechanisms
 * (`providerScopeMatches`, `deriveDiscoveredTopicOccurrences`,
 * `normalizeCandidate`) against both synthetic fixtures (Cases 1-6) and
 * the actual, current, committed `TOPIC_CLAIMS_FIXTURE` (Case 7 --
 * regression proof that the real stock v1->v2 correction already resolved
 * the original bleed for Artlist specifically).
 */
import * as path from 'path'
import {
  findNullScopeExposure,
  findExplicitScopeEffects,
  findDiscoveredTopicExposure,
  findCollisions,
  scanForHardcodedProviderListDuplication,
  runCrossDomainBleedPreflight,
  renderPreflightReport,
} from '@/lib/crc-engine/cross-domain-bleed-preflight'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { ASSET_PROVIDER_IDS } from '@/types/interview-engine'
import type { TopicClaim } from '@/lib/retrieval-engine/types'

const APP_ROOT = path.resolve(__dirname, '..', '..')

/** Test-only claim factory, mirroring provider-scoped-retrieval.test.ts's own claim() shape. */
function claim(overrides: Partial<TopicClaim> & Pick<TopicClaim, 'claim_id' | 'topic'>): TopicClaim {
  return {
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope: 'Scope text.',
    crc_candidate_statement: 'Candidate statement.',
    applicability_requirements: [],
    unresolved_project_dependencies: [],
    provider_scope: null,
    last_verified: '2026-08-27',
    superseded_by: null,
    ...overrides,
  }
}

// ── Case 1: null-scope leak ─────────────────────────────────────────────────

describe('Case 1 -- null-scope leak', () => {
  test('a synthetic existing claim with provider_scope: null is reported when evaluating a new provider', () => {
    const claims = [claim({ claim_id: 'CLAIM-TEST-NULLSCOPE-001', topic: 'third_party_source_rights', provider_scope: null })]
    const exposure = findNullScopeExposure(claims)
    expect(exposure.map((e) => e.claim_id)).toContain('CLAIM-TEST-NULLSCOPE-001')
  })

  test('a superseded null-scope claim is correctly EXCLUDED -- mirrors the real candidate-computation filter exactly', () => {
    const claims = [claim({ claim_id: 'CLAIM-TEST-NULLSCOPE-SUPERSEDED', topic: 'third_party_source_rights', provider_scope: null, superseded_by: 'CLAIM-TEST-NULLSCOPE-SUPERSEDED-v2' })]
    const exposure = findNullScopeExposure(claims)
    expect(exposure.map((e) => e.claim_id)).not.toContain('CLAIM-TEST-NULLSCOPE-SUPERSEDED')
  })
})

// ── Case 2/3: explicit non-match / match ────────────────────────────────────

describe('Case 2/3 -- explicit provider-scope effects', () => {
  // TopicClaim.provider_scope is strictly typed to real AssetProviderId
  // values (a claim can never be legally authored with a fictional
  // provider in its own scope) -- so "Provider A"/"Provider B" here use
  // two real, already-registered ids ('getty'/'istock') standing in for
  // the abstract concept; the candidate provider passed to
  // findExplicitScopeEffects is untyped (matches providerScopeMatches's
  // own loosely-typed `assetProviders: string[]` parameter), so testing
  // the match/non-match LOGIC itself doesn't require inventing a new one.
  const claims = [claim({ claim_id: 'CLAIM-TEST-PROVIDER-A', topic: 'third_party_source_rights', provider_scope: ['getty'] })]

  test('Case 2: a claim scoped only to Provider A is not reported as matching candidate Provider B', () => {
    const { matches, nonMatches } = findExplicitScopeEffects(claims, 'istock')
    expect(matches.map((m) => m.claim_id)).not.toContain('CLAIM-TEST-PROVIDER-A')
    expect(nonMatches.map((m) => m.claim_id)).toContain('CLAIM-TEST-PROVIDER-A')
  })

  test('Case 3: a claim explicitly scoped to the candidate provider is correctly reported as a match', () => {
    const { matches, nonMatches } = findExplicitScopeEffects(claims, 'getty')
    expect(matches.map((m) => m.claim_id)).toContain('CLAIM-TEST-PROVIDER-A')
    expect(nonMatches.map((m) => m.claim_id)).not.toContain('CLAIM-TEST-PROVIDER-A')
  })
})

// ── Case 4: discovered-topic exposure ───────────────────────────────────────

describe('Case 4 -- discovered-topic exposure', () => {
  test('a candidate provider that would make a topic discoverable causes that topic to appear in the report, without fabricating a real UserGoal', () => {
    // Uses the REAL committed fixture: third_party_source_rights already has
    // Adopted + CRC-eligible claims (the corrected stock v2 claims), so the
    // topic-level gate (hasGovernedClaimForTopic, exercised indirectly via
    // deriveDiscoveredTopicOccurrences) is satisfied regardless of THIS
    // candidate's own provider_scope -- exactly the mechanism FGR_007 found.
    const exposure = findDiscoveredTopicExposure(TOPIC_CLAIMS_FIXTURE, 'brand-new-unregistered-provider-xyz')
    expect(exposure.map((e) => e.topic)).toContain('third_party_source_rights')
    // The probe's own synthetic goal is clearly marked and never persisted --
    // confirmed structurally: this function returns a plain array, takes no
    // session/store argument, and cannot write to any session.
  })

  test('a topic with zero Adopted+CRC-eligible claims produces zero discovered exposure for that topic', () => {
    const claims: TopicClaim[] = [claim({ claim_id: 'CLAIM-TEST-CANDIDATE-ONLY', topic: 'likeness', lifecycle: 'Candidate', crc_eligible: 'No' })]
    const exposure = findDiscoveredTopicExposure(claims, 'some-provider')
    expect(exposure.map((e) => e.topic)).not.toContain('likeness')
  })
})

// ── Case 5: alias collision ─────────────────────────────────────────────────

describe('Case 5 -- alias collision', () => {
  test('a candidate alias that normalizes/collides with an existing provider is reported', () => {
    const result = findCollisions('some-new-provider', ['istock', 'Getty Images'])
    expect(result.alias_collisions.map((c) => c.candidate_alias)).toEqual(expect.arrayContaining(['istock', 'Getty Images']))
    expect(result.alias_collisions.find((c) => c.candidate_alias === 'istock')?.collides_with_provider).toBe('istock')
    expect(result.alias_collisions.find((c) => c.candidate_alias === 'Getty Images')?.collides_with_provider).toBe('getty')
  })

  test('candidate ID itself colliding with an existing registered ID is detected', () => {
    const result = findCollisions('getty', [])
    expect(result.candidate_id_collides_with_registry).toBe(true)
  })

  test('candidate aliases colliding with EACH OTHER (case/whitespace-insensitive) are reported separately from registry collisions', () => {
    const result = findCollisions('brand-new-provider', ['NewProvider', 'newprovider', ' newprovider '])
    expect(result.alias_self_collisions.length).toBeGreaterThan(0)
  })
})

// ── Case 6: clean provider ──────────────────────────────────────────────────

describe('Case 6 -- clean provider produces no false positives', () => {
  test('a genuinely non-colliding candidate provider produces a clean collision report', () => {
    const result = findCollisions('genuinely-novel-provider-id-2026', ['GenuinelyNovel', 'genuinely-novel.example'])
    expect(result.candidate_id_collides_with_registry).toBe(false)
    expect(result.candidate_id_collides_with_existing_alias).toBeNull()
    expect(result.alias_collisions).toEqual([])
    expect(result.alias_self_collisions).toEqual([])
  })

  test('a claim scoped to unrelated providers produces no explicit match for a clean candidate', () => {
    const claims = [claim({ claim_id: 'CLAIM-TEST-UNRELATED', topic: 'third_party_source_rights', provider_scope: ['getty', 'istock'] })]
    const { matches } = findExplicitScopeEffects(claims, 'genuinely-novel-provider-id-2026')
    expect(matches).toEqual([])
  })
})

// ── Case 7: current Artlist state -- regression proof ───────────────────────

describe('Case 7 -- current Artlist state (regression proof against the real, committed fixture)', () => {
  test('the corrected stock v2 provider scopes do NOT reproduce the original stock/Artlist bleed -- Artlist is already registered, so this proves the fix holds, not merely that a hypothetical candidate is clean', () => {
    const report = runCrossDomainBleedPreflight('artlist', ['artlist.io'], TOPIC_CLAIMS_FIXTURE, APP_ROOT)
    // The ORIGINAL bleed (pre-FGR_007) would have shown CLAIM-STOCK-EDITORIAL-
    // 001-v1/-002-v1 as null-scope matches. Both v1 predecessors are
    // Deprecated (superseded_by non-null) in the real fixture -- confirming
    // findNullScopeExposure's own supersession filter, exercised here
    // against real data, not just the synthetic Case 1 above.
    expect(report.null_scope_exposure.map((e) => e.claim_id)).not.toContain('CLAIM-STOCK-EDITORIAL-001-v1')
    expect(report.null_scope_exposure.map((e) => e.claim_id)).not.toContain('CLAIM-STOCK-EDITORIAL-002-v1')
    // The corrected v2 successors are explicit-scope claims that legitimately
    // (and intentionally, per governance) DO include Artlist -- wait, they do
    // NOT include artlist; confirm they correctly appear in explicit_non_matches.
    expect(report.explicit_non_matches.map((e) => e.claim_id)).toEqual(expect.arrayContaining(['CLAIM-STOCK-EDITORIAL-001-v2', 'CLAIM-STOCK-EDITORIAL-002-v2']))
    expect(report.explicit_matches.map((e) => e.claim_id)).not.toContain('CLAIM-STOCK-EDITORIAL-001-v2')
    expect(report.explicit_matches.map((e) => e.claim_id)).not.toContain('CLAIM-STOCK-EDITORIAL-002-v2')
    // A-3 itself IS explicitly scoped to artlist -- correctly a match.
    expect(report.explicit_matches.map((e) => e.claim_id)).toContain('CLAIM-MUSIC-ARTLIST-PROJECT-LICENSE-DURATION-001-v1')
    // Discovered-relevance: third_party_source_rights is topic-level
    // reachable (real stock v2 + A-3 claims are Adopted+CRC-eligible) --
    // this is EXPECTED and matches production reality (already proven live
    // in the A-3 production UAT), not a new leak.
    expect(report.discovered_topic_exposure.map((e) => e.topic)).toContain('third_party_source_rights')
    // Collisions: artlist is already registered, so the collision check
    // correctly reports it -- this is expected/informational for an
    // ALREADY-registered provider, not a defect the preflight is meant to
    // catch (the preflight's real use case is pre-registration).
    expect(report.collisions.candidate_id_collides_with_registry).toBe(true)
  })

  test('report is complete (fail-closed check passes) against the real fixture', () => {
    const report = runCrossDomainBleedPreflight('artlist', [], TOPIC_CLAIMS_FIXTURE, APP_ROOT)
    expect(report.complete).toBe(true)
    expect(report.incomplete_reasons).toEqual([])
  })

  test('renderPreflightReport produces a report clearly separating FACTS from HUMAN GOVERNANCE QUESTIONS', () => {
    const report = runCrossDomainBleedPreflight('artlist', [], TOPIC_CLAIMS_FIXTURE, APP_ROOT)
    const text = renderPreflightReport(report)
    expect(text).toContain('=== FACTS FOUND BY THE PREFLIGHT ===')
    expect(text).toContain('=== HUMAN GOVERNANCE QUESTIONS (never answered by this tool) ===')
  })
})

// ── §6: fail-closed behavior ─────────────────────────────────────────────────

describe('fail-closed behavior', () => {
  test('an unreadable app root produces complete: false with an explicit reason, never a silent "no conflicts"', () => {
    const result = scanForHardcodedProviderListDuplication('C:\\this\\path\\does\\not\\exist\\at\\all\\2026', ASSET_PROVIDER_IDS)
    expect(result.scanned).toBe(false)
    expect(result.scan_error).not.toBeNull()
    expect(result.matches).toEqual([])
  })

  test('a full runCrossDomainBleedPreflight call surfaces the incomplete scan as complete: false, not swallowed', () => {
    const report = runCrossDomainBleedPreflight('artlist', [], TOPIC_CLAIMS_FIXTURE, 'C:\\this\\path\\does\\not\\exist\\at\\all\\2026')
    expect(report.complete).toBe(false)
    expect(report.incomplete_reasons.length).toBeGreaterThan(0)
  })
})

// ── Real hardcoded-list scan against the real repo (best-effort, narrow) ────

describe('hardcoded full-provider-list scan, real repo', () => {
  test('scanning the real 08_Platform/app tree completes and finds no remaining full-list duplicate (VALID_PROVIDER_IDS was already fixed to derive from ASSET_PROVIDER_IDS)', () => {
    const result = scanForHardcodedProviderListDuplication(APP_ROOT, ASSET_PROVIDER_IDS)
    expect(result.scanned).toBe(true)
    expect(result.matches).toEqual([])
  })
})
