/**
 * Fixture/markdown consistency guard (CRC Living Knowledge Phase 1,
 * 2026-08-16, PM-approved §13: "the smallest useful consistency guard...
 * do NOT build the full markdown->runtime compiler/index yet"). Same
 * class of change as subsystem-boundaries.test.ts -- a structural,
 * file-scanning test, not a real markdown parser (no markdown-parsing
 * precedent exists anywhere in this repo; matrix-fixture.ts's own header
 * already gives the reasoning for staying manual).
 *
 * Deliberately regex-based over the raw file, not a markdown AST parser --
 * only extracts what this check needs: claim IDs, and each claim's
 * Lifecycle/Publication scope lines, skipping the "## Entry template"
 * section's own fenced code-block example so it is never mistaken for a
 * real claim.
 */

import * as fs from 'fs'
import * as path from 'path'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { GOAL_CATEGORIES, ASSET_PROVIDER_IDS } from '@/types/interview-engine'
import { providerScopeMatches } from '@/lib/retrieval-engine/lookup-topic-claims'

const GOVERNED_CLAIMS_PATH = path.join(__dirname, '..', '..', '..', '..', '06_Operations', 'institutional-knowledge', 'notebook', 'GOVERNED-CLAIMS.md')

/**
 * Claims that are real, Adopted governed knowledge in GOVERNED-CLAIMS.md but
 * have NO entry in TOPIC_CLAIMS_FIXTURE. This is a deliberate, reviewed,
 * documented exception, not a sync gap -- never add an ID here to silence a
 * failing test; only add one when a real governance/architecture decision
 * has been recorded for it. Remove an ID once its claim gains a real
 * runtime representation -- this set should shrink over time, not grow
 * casually.
 *
 * Was EMPTY from M3 (Living Knowledge — Third-Party Source Rights,
 * 2026-08-18) until 2026-08-27: the five stock-media claims that previously
 * lived here (CLAIM-STOCK-EDITORIAL-001-v1/-002-v1, CLAIM-STOCK-
 * GETTY-EDITORIAL-001-v1, CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1,
 * CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1) now have real TOPIC_CLAIMS_FIXTURE
 * entries (M1 GoalCategory + M2 AssetProviderMention + M3 provider-scoped
 * retrieval together closed every architecture blocker that previously made
 * them unrepresentable). They remain excluded from CRC output for a
 * SEPARATE reason -- `crc_eligible: 'Pending'` -- which is a governance gate
 * `lookupTopicClaims()` already enforces for every claim in this fixture,
 * not a fixture-representation exception; see the dedicated tests below for
 * each of the five.
 *
 * Populated again 2026-08-27 with the ten Music Scenario A claims (Wave 3,
 * Third-Party Source Assets / Music Licensing) Adopted this date following
 * Formal Governance Review #6 (`governance-reviews/FGR_006_MUSIC_SCENARIO_A
 * _PACKAGE_2026-08-27.md`) and explicit human Adoption approval (Adoption
 * Approver: JD (PM)) -- a real, recorded governance decision, per this
 * comment's own standing requirement.
 *
 * Split reason as of 2026-08-27 (Music Scenario A -- Artlist A-3 synthetic
 * runtime canary; `governance-reviews/CPR_007_MUSIC_SCENARIO_A_PACKAGE_
 * 2026-08-27.md`), same day, later same session -- do not conflate the two:
 *   - A1, A2 (`CLAIM-MUSIC-ENVATO-*`) and EP1 (`CLAIM-MUSIC-EPIDEMIC-
 *     TIER-ADVERTISING-001-v1`) remain unrepresentable for the ORIGINAL
 *     architectural reason: `envato-elements`/`epidemic-sound` are still not
 *     registered in `ASSET_PROVIDER_IDS` -- this milestone's own one-
 *     provider scope deliberately left them unregistered.
 *   - The remaining six `CLAIM-MUSIC-ARTLIST-*` claims (A-1, A-2, A-4, A-5,
 *     A-6, A-7a) are a DIFFERENT case: `artlist` WAS registered in
 *     `ASSET_PROVIDER_IDS` (a generic registry extension, confirmed no
 *     Music-specific mechanism added -- see `types/interview-engine.ts`),
 *     so the registry blocker is gone for these six specifically. They
 *     remain in this set for the SAME kind of reason the five stock claims
 *     above are excluded from CRC output -- CRC eligibility, not
 *     fixture-representability. `CPR_007` recommends WITHHOLD for all of
 *     them (PM decision on that combined review: PENDING; each one's own
 *     `CRC Approver` field in GOVERNED-CLAIMS.md remains `PENDING`).
 *
 * REMOVED 2026-08-27 (later same session, A-3 CRC Publication Recording
 * task): `CLAIM-MUSIC-ARTLIST-PROJECT-LICENSE-DURATION-001-v1` (A-3) --
 * this claim ONLY. CRC Publication was explicitly approved for A-3
 * specifically (CRC Approver: JD (PM), CRC Decision Date: 2026-08-27, see
 * GOVERNED-CLAIMS.md's own "CRC PUBLICATION APPROVED" note), following the
 * Artlist A-3 Synthetic Runtime Canary and Artlist Provider Registration
 * Canary Integration Review clearing the runtime-verification prerequisite
 * CPR_007 §3 identified as the sole blocker. A-3 now has a real
 * `TOPIC_CLAIMS_FIXTURE` entry (`crc_eligible: 'Yes'`) -- see the dedicated
 * tests below. The other 9 Music Scenario A claims are UNAFFECTED by this
 * removal and remain exactly as before, per the split above.
 */
const CLAIMS_WITHOUT_FIXTURE_REPRESENTATION = new Set<string>([
  'CLAIM-MUSIC-ENVATO-SYNC-001-v1',
  'CLAIM-MUSIC-ENVATO-CANCELLATION-001-v1',
  'CLAIM-MUSIC-EPIDEMIC-TIER-ADVERTISING-001-v1',
  'CLAIM-MUSIC-ARTLIST-SOCIAL-VS-PRO-001-v1',
  'CLAIM-MUSIC-ARTLIST-CLIENT-LICENSE-RETENTION-001-v1',
  'CLAIM-MUSIC-ARTLIST-STANDALONE-EXPLOITATION-001-v1',
  'CLAIM-MUSIC-ARTLIST-AI-TRAINING-EXCLUSION-001-v1',
  'CLAIM-MUSIC-ARTLIST-PRO-ROYALTIES-001-v1',
  'CLAIM-MUSIC-ARTLIST-ENTERPRISE-THRESHOLD-001-v1',
  // Pre-existing gap found during the Assessment-Jurisdiction Mention Model
  // implementation (2026-08-28) -- Adopted in a prior milestone (Wave 4,
  // 2026-08-28) with zero runtime fixture representation by explicit design
  // (same "Adoption is pure governance documentation, zero runtime effect"
  // discipline as every Music-domain claim above); never added to this set
  // at Adoption time.
  'CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1',
])

/** Strips fenced code blocks (```...```) before scanning -- the entry template lives inside one and must never be counted as a real claim. */
function stripFencedCodeBlocks(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, '')
}

/** Extracts every real `### CLAIM-...` heading (outside code fences) and its own Topic/Lifecycle/Publication scope/CRC Approver lines. */
function extractMarkdownClaims(markdown: string): { claim_id: string; topic: string | null; lifecycle: string | null; publication_scope: string | null; crc_approver: string | null }[] {
  const outsideFences = stripFencedCodeBlocks(markdown)
  const sections = outsideFences.split(/(?=^### CLAIM-)/m).filter((s) => s.startsWith('### CLAIM-'))
  return sections.map((section) => {
    const idMatch = section.match(/^### (CLAIM-[A-Za-z0-9-]+)/)
    const topicMatch = section.match(/^Topic:\s*(.+)$/m)
    const lifecycleMatch = section.match(/^Lifecycle:\s*(.+)$/m)
    const scopeMatch = section.match(/^Publication scope:\s*(.+)$/m)
    const crcApproverMatch = section.match(/^CRC Approver:\s*(.+)$/m)
    return {
      claim_id: idMatch ? idMatch[1].trim() : '',
      topic: topicMatch ? topicMatch[1].trim() : null,
      lifecycle: lifecycleMatch ? lifecycleMatch[1].trim() : null,
      publication_scope: scopeMatch ? scopeMatch[1].trim() : null,
      crc_approver: crcApproverMatch ? crcApproverMatch[1].trim() : null,
    }
  })
}

describe('GOVERNED-CLAIMS.md <-> topic-claims-fixture.ts consistency', () => {
  test('the markdown file exists and is readable', () => {
    expect(fs.existsSync(GOVERNED_CLAIMS_PATH)).toBe(true)
  })

  test('the entry template inside the fenced code block is never counted as a real claim', () => {
    const markdown = fs.readFileSync(GOVERNED_CLAIMS_PATH, 'utf-8')
    const claims = extractMarkdownClaims(markdown)
    expect(claims.find((c) => c.claim_id.startsWith('CLAIM-XXX-NNN'))).toBeUndefined()
  })

  test('every real claim ID in the markdown has a matching entry in the runtime fixture, except claims explicitly documented as unrepresentable (CLAIMS_WITHOUT_FIXTURE_REPRESENTATION)', () => {
    const markdown = fs.readFileSync(GOVERNED_CLAIMS_PATH, 'utf-8')
    const markdownIds = new Set(extractMarkdownClaims(markdown).map((c) => c.claim_id))
    const fixtureIds = new Set(TOPIC_CLAIMS_FIXTURE.map((c) => c.claim_id))
    const missingFromFixture = [...markdownIds].filter((id) => !fixtureIds.has(id) && !CLAIMS_WITHOUT_FIXTURE_REPRESENTATION.has(id))
    expect(missingFromFixture).toEqual([])
  })

  describe.each([
    // [claimId, expectedProviderScope, expectedCrcEligible] -- CLAIM-STOCK-
    // GETTY-EDITORIAL-001-v1 updated to 'Yes' 2026-08-18 -- the first
    // provider-specific claim in the domain to reach CRC -- following a
    // bounded CRC-Publication Review #3 (recommendation A -- PASS/GO AS-IS,
    // no text change) and PM approval; see
    // governance-reviews/CPR_003_CLAIM-STOCK-GETTY-EDITORIAL-001-v1
    // _2026-08-18.md. CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1 ALSO updated to
    // 'Yes' 2026-08-18 -- the second provider-specific claim to reach CRC,
    // its own negative-finding framing ("no evidence found," never
    // "confirmed absence") independently load-bearing-tested -- following a
    // bounded CRC-Publication Review #4 (recommendation A -- PASS/GO AS-IS,
    // no text change) and PM approval; see
    // governance-reviews/CPR_004_CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1
    // _2026-08-18.md. CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1 ALSO
    // updated to 'Yes' 2026-08-18 -- the third and, to date, final
    // provider-specific claim to reach CRC, its own intentionally mixed
    // evidence-tier disclosure (Tier 1 functional distinction, Official
    // Secondary Rights and Clearance description) independently
    // load-bearing-tested to confirm it is not flattened into Getty-level
    // certainty -- following a bounded CRC-Publication Review #5
    // (recommendation A -- PASS/GO AS-IS, no text change) and PM approval;
    // see governance-reviews/CPR_005_CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001
    // -v1_2026-08-18.md.
    //
    // CLAIM-STOCK-EDITORIAL-001-v1/-002-v1 REPLACED in this table 2026-08-27
    // (Governance Correction Review, governance-reviews/FGR_007_STOCK_
    // EDITORIAL_PROVIDER_SCOPE_CORRECTION_2026-08-27.md) by their corrected
    // -v2 successors -- provider_scope: null was found broader than each
    // claim's own evidenced scope. -001-v2 -> the four providers -001-v1's
    // own evidence already named ("independently-researched providers").
    // -002-v2 -> only three providers -- Adobe Stock deliberately excluded,
    // matching -002's own text, which already named only "Getty, iStock, or
    // Shutterstock." crc_eligible: 'Yes' on both v2 rows is a bounded
    // reaffirmation (FGR_007 §6), not a new substantive CRC Publication
    // Review. See the dedicated "v1 superseded" test block below this one
    // for explicit verification that the v1 predecessors no longer count as
    // live/CRC-eligible.
    ['CLAIM-STOCK-EDITORIAL-001-v2', ['getty', 'istock', 'shutterstock', 'adobe-stock'], 'Yes'],
    ['CLAIM-STOCK-EDITORIAL-002-v2', ['getty', 'istock', 'shutterstock'], 'Yes'],
    ['CLAIM-STOCK-GETTY-EDITORIAL-001-v1', ['getty'], 'Yes'],
    ['CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1', ['shutterstock'], 'Yes'],
    ['CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1', ['istock'], 'Yes'],
  ] as const)('%s -- real runtime representation as of M3 (Living Knowledge — Third-Party Source Rights, 2026-08-18) / provider-scope correction (2026-08-27)', (claimId, expectedProviderScope, expectedCrcEligible) => {
    test('exists in the markdown as real, Adopted governed knowledge', () => {
      const markdown = fs.readFileSync(GOVERNED_CLAIMS_PATH, 'utf-8')
      const claim = extractMarkdownClaims(markdown).find((c) => c.claim_id === claimId)
      expect(claim).toBeDefined()
      expect(claim?.lifecycle?.toLowerCase()).toContain('adopted')
      expect(claim?.publication_scope?.toLowerCase()).toContain('reviewer/commercial assurance')
    })

    test('now HAS a real entry in TOPIC_CLAIMS_FIXTURE -- M1 (GoalCategory) + M2 (AssetProviderMention) + M3 (provider-scoped retrieval) together closed every architecture blocker', () => {
      const claim = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === claimId)
      expect(claim).toBeDefined()
      expect(claim?.topic).toBe('third_party_source_rights')
    })

    test('provider_scope matches the exact governed scope for this claim -- generic claims null, provider-specific claims exactly one canonical id, never multiple, never drifted from the M2 registry', () => {
      const claim = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === claimId)
      expect(claim?.provider_scope).toEqual(expectedProviderScope)
    })

    test('crc_eligible matches the real, per-claim governance decision -- M3 (provider-scoped retrieval) is infrastructure only and never itself authorizes publication; each claim reaches CRC eligibility (or not) via its own separate M4 decision', () => {
      const claim = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === claimId)
      expect(claim?.lifecycle).toBe('Adopted')
      expect(claim?.crc_eligible).toBe(expectedCrcEligible)
    })

    test("'third_party_source_rights' is an implemented GoalCategory value (M1, 2026-08-18)", () => {
      expect((GOAL_CATEGORIES as readonly string[]).includes('third_party_source_rights')).toBe(true)
    })
  })

  /**
   * Provider-scope correction / supersession verification (2026-08-27,
   * Governance Correction Review, governance-reviews/FGR_007_STOCK_EDITORIAL
   * _PROVIDER_SCOPE_CORRECTION_2026-08-27.md). Explicit, dedicated
   * verification that CLAIM-STOCK-EDITORIAL-001-v1/-002-v1 -- preserved in
   * the fixture as historical records, never deleted -- no longer count as
   * live/CRC-eligible after being marked superseded, and that their -v2
   * successors correctly do. This is the first real exercise of the
   * `superseded_by` mechanism in this fixture (present in the schema since
   * Wave 1, never previously non-null).
   */
  describe('provider-scope correction: v1 -> v2 supersession (2026-08-27)', () => {
    test('v1 predecessors are present in the fixture (preserved, not deleted) but marked superseded_by their v2 successor', () => {
      const v1_001 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-STOCK-EDITORIAL-001-v1')
      const v1_002 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-STOCK-EDITORIAL-002-v1')
      expect(v1_001).toBeDefined()
      expect(v1_002).toBeDefined()
      expect(v1_001?.superseded_by).toBe('CLAIM-STOCK-EDITORIAL-001-v2')
      expect(v1_002?.superseded_by).toBe('CLAIM-STOCK-EDITORIAL-002-v2')
    })

    test('v1 predecessors carry Lifecycle: Deprecated, matching the corrected markdown record', () => {
      const v1_001 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-STOCK-EDITORIAL-001-v1')
      const v1_002 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-STOCK-EDITORIAL-002-v1')
      expect(v1_001?.lifecycle).toBe('Deprecated')
      expect(v1_002?.lifecycle).toBe('Deprecated')
    })

    test('v1 predecessors retain their ORIGINAL provider_scope: null and original crc_eligible/CRC text as an unmodified historical record -- correction is via supersession, never retroactive edit', () => {
      const v1_001 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-STOCK-EDITORIAL-001-v1')
      const v1_002 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-STOCK-EDITORIAL-002-v1')
      expect(v1_001?.provider_scope).toBeNull()
      expect(v1_002?.provider_scope).toBeNull()
      expect(v1_001?.crc_eligible).toBe('Yes')
      expect(v1_002?.crc_eligible).toBe('Yes')
    })

    test('v2 successors carry the corrected, evidence-differentiated provider_scope -- -001-v2 four providers, -002-v2 three (Adobe Stock excluded)', () => {
      const v2_001 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-STOCK-EDITORIAL-001-v2')
      const v2_002 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-STOCK-EDITORIAL-002-v2')
      expect(v2_001?.provider_scope).toEqual(['getty', 'istock', 'shutterstock', 'adobe-stock'])
      expect(v2_002?.provider_scope).toEqual(['getty', 'istock', 'shutterstock'])
      expect(v2_001?.superseded_by).toBeNull()
      expect(v2_002?.superseded_by).toBeNull()
    })

    test('exactly one of each {v1, v2} pair is a live Retrieval candidate (superseded_by === null AND lifecycle === Adopted AND crc_eligible === Yes) -- v1 excluded by supersession, v2 the sole live representative', () => {
      const isLiveCandidate = (c: (typeof TOPIC_CLAIMS_FIXTURE)[number]) => c.superseded_by === null && c.lifecycle === 'Adopted' && c.crc_eligible === 'Yes'
      const v1_001 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-STOCK-EDITORIAL-001-v1')!
      const v2_001 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-STOCK-EDITORIAL-001-v2')!
      const v1_002 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-STOCK-EDITORIAL-002-v1')!
      const v2_002 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-STOCK-EDITORIAL-002-v2')!
      expect(isLiveCandidate(v1_001)).toBe(false)
      expect(isLiveCandidate(v2_001)).toBe(true)
      expect(isLiveCandidate(v1_002)).toBe(false)
      expect(isLiveCandidate(v2_002)).toBe(true)
    })

    test('providerScopeMatches: an Artlist-only asset-provider context matches neither v2 successor -- confirms the correction alone resolves the confirmed cross-domain candidacy defect without any provider registration', () => {
      const v2_001 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-STOCK-EDITORIAL-001-v2')!
      const v2_002 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-STOCK-EDITORIAL-002-v2')!
      expect(providerScopeMatches(v2_001, ['artlist'])).toBe(false)
      expect(providerScopeMatches(v2_002, ['artlist'])).toBe(false)
      expect(providerScopeMatches(v2_001, ['envato-elements'])).toBe(false)
      expect(providerScopeMatches(v2_002, ['envato-elements'])).toBe(false)
      expect(providerScopeMatches(v2_001, ['epidemic-sound'])).toBe(false)
      expect(providerScopeMatches(v2_002, ['epidemic-sound'])).toBe(false)
    })

    test('providerScopeMatches: every legitimately in-scope stock provider still matches its evidenced claim(s), and the Adobe Stock asymmetry between -001-v2 and -002-v2 is preserved', () => {
      const v2_001 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-STOCK-EDITORIAL-001-v2')!
      const v2_002 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-STOCK-EDITORIAL-002-v2')!
      for (const provider of ['getty', 'istock', 'shutterstock']) {
        expect(providerScopeMatches(v2_001, [provider])).toBe(true)
        expect(providerScopeMatches(v2_002, [provider])).toBe(true)
      }
      expect(providerScopeMatches(v2_001, ['adobe-stock'])).toBe(true)
      expect(providerScopeMatches(v2_002, ['adobe-stock'])).toBe(false)
    })
  })

  test('provider_scope values used across the whole fixture are all valid canonical AssetProviderId values recognized by the M2 provider registry -- catches drift (e.g. a fixture claim silently using \'getty-images\' while extraction canonicalizes \'getty\')', () => {
    // Sourced directly from ASSET_PROVIDER_IDS (types/interview-engine.ts)
    // rather than a hand-duplicated literal, so this test can never itself
    // drift out of sync with the registry it's checking against -- a real
    // gap the Artlist registration (2026-08-27) surfaced: a hardcoded
    // ['getty','istock','shutterstock','adobe-stock'] literal here would
    // have silently failed to recognize a newly-registered, legitimately
    // valid provider ID as valid.
    const VALID_PROVIDER_IDS = new Set<string>(ASSET_PROVIDER_IDS)
    for (const claim of TOPIC_CLAIMS_FIXTURE) {
      if (claim.provider_scope === null) continue
      for (const providerId of claim.provider_scope) {
        expect(VALID_PROVIDER_IDS.has(providerId)).toBe(true)
      }
    }
  })

  test('no stock-media claim has an empty-array provider_scope -- an authoring error state, per TopicClaim.provider_scope\'s own doc comment (meaningfully either null or a non-empty array, never [])', () => {
    for (const claim of TOPIC_CLAIMS_FIXTURE) {
      if (claim.provider_scope !== null) {
        expect(claim.provider_scope.length).toBeGreaterThan(0)
      }
    }
  })

  test('every claim ID in the runtime fixture has a matching entry in the markdown (no orphaned/stale fixture entries)', () => {
    const markdown = fs.readFileSync(GOVERNED_CLAIMS_PATH, 'utf-8')
    const markdownIds = new Set(extractMarkdownClaims(markdown).map((c) => c.claim_id))
    const fixtureIds = new Set(TOPIC_CLAIMS_FIXTURE.map((c) => c.claim_id))
    const orphanedInFixture = [...fixtureIds].filter((id) => !markdownIds.has(id))
    expect(orphanedInFixture).toEqual([])
  })

  test('no duplicate claim IDs within the runtime fixture', () => {
    const ids = TOPIC_CLAIMS_FIXTURE.map((c) => c.claim_id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test("a fixture claim's Lifecycle/CRC-eligibility agrees with the markdown (drift detection)", () => {
    const markdown = fs.readFileSync(GOVERNED_CLAIMS_PATH, 'utf-8')
    const markdownById = new Map(extractMarkdownClaims(markdown).map((c) => [c.claim_id, c]))

    for (const fixtureClaim of TOPIC_CLAIMS_FIXTURE) {
      const markdownClaim = markdownById.get(fixtureClaim.claim_id)
      if (!markdownClaim) continue // already caught by the "missing from markdown" test above

      if (markdownClaim.lifecycle) {
        expect(markdownClaim.lifecycle.toLowerCase()).toContain(fixtureClaim.lifecycle.toLowerCase())
      }
      // BUG FIX (2026-08-17, exposed by the CLAIM-COPY-004 CRC-publication
      // decision, the first time these two signals ever diverged): this
      // heuristic previously derived markdown-side CRC eligibility from
      // whether `Publication scope` contained the literal string "CRC
      // eligible" -- but `Publication scope` and CRC eligibility are two
      // independent fields in this document's own entry template (see
      // GOVERNED-CLAIMS.md's own governance-discipline bullet: "Publication
      // scope: CRC eligible is a SEPARATE decision from Adoption"), and
      // `Publication scope` isn't even a field on the runtime TopicClaim
      // type at all -- nothing in production code ever reads it. PM's
      // approved COPY-004 decision keeps `Publication scope: Reviewer/
      // Commercial Assurance` unchanged while separately flipping CRC
      // eligibility via `CRC Approver`/`CRC Decision Date` -- exposing that
      // this test was checking the wrong field. The real governance signal,
      // matching what `CRC Approver` has always meant in this document (a
      // real, named human vs. the literal placeholder "PENDING"), is now
      // checked directly instead.
      const fixtureIsCrcEligible = fixtureClaim.crc_eligible === 'Yes'
      const markdownSaysCrcEligible = !!markdownClaim.crc_approver && !markdownClaim.crc_approver.toUpperCase().startsWith('PENDING')
      expect(fixtureIsCrcEligible).toBe(markdownSaysCrcEligible)
    }
  })

  /**
   * Topic drift detection (added 2026-08-16, LK Phase 1 governance
   * refinement) -- the exact gap that let CLAIM-COPY-001/002/003 sit at
   * `Topic: copyright_ownership` in the fixture for one review cycle after
   * the markdown's own field name was corrected to `copyrightability`
   * during the taxonomy decision in this same refinement. Lifecycle and
   * Publication scope already had drift detection; Topic didn't. Closing
   * that gap now rather than leaving the next taxonomy correction to rely
   * on a human re-reading both files side by side again.
   */
  test("a fixture claim's Topic agrees with the markdown (drift detection)", () => {
    const markdown = fs.readFileSync(GOVERNED_CLAIMS_PATH, 'utf-8')
    const markdownById = new Map(extractMarkdownClaims(markdown).map((c) => [c.claim_id, c]))

    for (const fixtureClaim of TOPIC_CLAIMS_FIXTURE) {
      const markdownClaim = markdownById.get(fixtureClaim.claim_id)
      if (!markdownClaim) continue // already caught by the "missing from markdown" test above
      expect(markdownClaim.topic).toBe(fixtureClaim.topic)
    }
  })

  test('exactly eleven claims in the runtime fixture are Adopted + CRC-eligible as of 2026-08-30 -- the prior ten (CLAIM-COPY-004-v1, CLAIM-STOCK-EDITORIAL-001-v2/-002-v2, CLAIM-STOCK-GETTY/ISTOCK/SHUTTERSTOCK-EDITORIAL-001-v1, CLAIM-COPY-001-v1/-002-v1/-003-v1, CLAIM-MUSIC-ARTLIST-PROJECT-LICENSE-DURATION-001-v1 -- see prior versions of this test/GOVERNED-CLAIMS.md for their own individual provenance) plus the eleventh and newest: CLAIM-SYNTHESIA-STOCK-PAID-PROMOTION-001-v1, the first real tool_scope-narrowed claim, CRC Publication approved 2026-08-30 (CRC Approver: JD (PM)) following CPR_009 + a targeted evidence refresh (LK-37, Classification A) -- the first AI Video Generation Platform Rights domain claim to reach CRC. The other 9 Music Scenario A claims remain WITHHELD/PENDING and are correctly absent from this list -- update only when a further real decision is recorded', () => {
    const liveClaims = TOPIC_CLAIMS_FIXTURE.filter((c) => c.lifecycle === 'Adopted' && c.crc_eligible === 'Yes')
    expect(liveClaims.map((c) => c.claim_id).sort()).toEqual(['CLAIM-COPY-001-v1', 'CLAIM-COPY-002-v1', 'CLAIM-COPY-003-v1', 'CLAIM-COPY-004-v1', 'CLAIM-MUSIC-ARTLIST-PROJECT-LICENSE-DURATION-001-v1', 'CLAIM-STOCK-EDITORIAL-001-v2', 'CLAIM-STOCK-EDITORIAL-002-v2', 'CLAIM-STOCK-GETTY-EDITORIAL-001-v1', 'CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1', 'CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1', 'CLAIM-SYNTHESIA-STOCK-PAID-PROMOTION-001-v1'])
  })
})
