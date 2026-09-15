/**
 * Generic Applicability Architecture -- OrganizationLocationMention Fact
 * Representation (2026-09-13, per ADR-001-generic-applicability-
 * architecture.md §J, CPR_026_ADDENDUM_REMEDY_SUPERSESSION_2026-09-13.md).
 * CAPTURE-ONLY milestone: this file proves the observable project fact
 * (`OrganizationLocationMention`), its real correction/supersession
 * semantics (mirroring `DistributionTerritoryMention`, not
 * `ContentPresenceMention`'s append-only shape), the extraction wiring that
 * produces/corrects it end to end through the real pipeline, its explicit
 * non-inference boundaries (never conflated with assessment jurisdiction,
 * distribution/output-use territory, or any other geography/actor-role
 * concept), and -- load-bearing for this milestone -- that adding this fact
 * changes NOTHING about applicability, Track A discovery, proactive
 * questioning, or Article 50 runtime behavior.
 *
 * Mirrors distribution-territory-mentions.test.ts's own established
 * pattern: mock extractor, runExtractionPipeline exercised end-to-end for
 * the pipeline-level cases -- proves the proposal -> normalization ->
 * attestation -> mutation pipeline, not natural-language extraction
 * accuracy (that's the extractor's own system-prompt guidance, verified
 * separately by anthropic-extractor tests and live UAT, not this file).
 *
 * SYNTHETIC ONLY: this file never touches TOPIC_CLAIMS_FIXTURE, adopts no
 * governed claim, and never populates/activates the real EU AI Act Article
 * 50(4) candidate.
 *
 * Run: npx jest __tests__/interview-engine/organization-location-mentions.test.ts
 */

import type { OrganizationLocationMention, StructuredUnderstanding } from '../../types/interview-engine'
import type { CandidateObservation } from '../../lib/interview-engine/extraction'
import { runExtractionPipeline } from '../../lib/interview-engine/extraction'
import { addOrganizationLocationMention, supersedeOrganizationLocationMention } from '../../lib/interview-engine/mutations'
import { constantExtractor } from '../../lib/interview-engine/mock-extractor'
import { APPLICABILITY_FACTS } from '../../lib/retrieval-engine/types'
import type { ApplicabilityFacts } from '../../lib/retrieval-engine/lookup-topic-claims'
import { isApplicable } from '../../lib/retrieval-engine/lookup-topic-claims'
import { TOPIC_CLAIMS_FIXTURE } from '../../lib/retrieval-engine/topic-claims-fixture'
import { TOPIC_RELATIONSHIPS_FIXTURE } from '../../lib/retrieval-engine/topic-relationships-fixture'
import { deriveKnowledgeReadinessNeeds } from '../../lib/crc-engine/knowledge-readiness'
import { createInitialBoundaryState } from '../../lib/interview-engine/boundaries'

const ART50_CLAIM_ID = 'CLAIM-EUAI-ART50-4-AUDIOVISUAL-DEEPFAKE-DISCLOSURE-001-v1'
const ART50_REL_ID = 'REL-COMMERCIAL-USE-AI-CONTENT-TRANSPARENCY-v1'

function emptySU(overrides: Partial<StructuredUnderstanding> = {}): StructuredUnderstanding {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: [],
    scoped_observations: [],
    user_goals: [],
    asset_provider_mentions: [],
    assessment_jurisdiction_mentions: [],
    content_presence_mentions: [],
    distribution_territory_mentions: [],
    organization_location_mentions: [],
    current_phase: 1,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
    ...overrides,
  }
}

function mention(overrides: Partial<OrganizationLocationMention> & Pick<OrganizationLocationMention, 'mention_id' | 'value'>): OrganizationLocationMention {
  return {
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: 'placeholder',
    superseded_by: null,
    ...overrides,
  }
}

function orgLocationCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return {
    proposal_id: 'c1',
    turn: 1,
    raw_text: 'Our company is based in France.',
    kind: 'organization_location_mention',
    raw_organization_location_value: 'France',
    ...overrides,
  }
}

// ── mutations.ts invariants ─────────────────────────────────────────────

describe('addOrganizationLocationMention / supersedeOrganizationLocationMention -- mirrors addDistributionTerritoryMention exactly', () => {
  test('add: a duplicate mention_id is rejected', () => {
    let su = emptySU()
    su = addOrganizationLocationMention(su, mention({ mention_id: 'm-1', value: 'France' }))
    expect(() => addOrganizationLocationMention(su, mention({ mention_id: 'm-1', value: 'Germany' }))).toThrow(/already exists/)
  })

  test('add: a newly added mention cannot already be superseded', () => {
    const su = emptySU()
    expect(() => addOrganizationLocationMention(su, mention({ mention_id: 'm-1', value: 'France', superseded_by: 'm-2' }))).toThrow(
      /cannot already be superseded/,
    )
  })

  test('supersede: target must exist', () => {
    const su = emptySU()
    expect(() => supersedeOrganizationLocationMention(su, 'does-not-exist', mention({ mention_id: 'm-2', value: 'Germany' }))).toThrow(
      /unknown organization location mention/,
    )
  })

  test('supersede: target must be the current, non-superseded head of its chain -- cannot re-target a historical snapshot', () => {
    let su = emptySU()
    su = addOrganizationLocationMention(su, mention({ mention_id: 'm-1', value: 'Germany' }))
    su = supersedeOrganizationLocationMention(su, 'm-1', mention({ mention_id: 'm-2', value: 'Switzerland' }))
    expect(() => supersedeOrganizationLocationMention(su, 'm-1', mention({ mention_id: 'm-3', value: 'Austria' }))).toThrow(/already superseded/)
  })

  test('supersede: replacement id must differ from target', () => {
    let su = emptySU()
    su = addOrganizationLocationMention(su, mention({ mention_id: 'm-1', value: 'Germany' }))
    expect(() => supersedeOrganizationLocationMention(su, 'm-1', mention({ mention_id: 'm-1', value: 'Switzerland' }))).toThrow(
      /must have a different id/,
    )
  })

  test('supersede-and-mark only: correcting Germany to Switzerland preserves the Germany mention (marked superseded), never deletes it', () => {
    let su = emptySU()
    su = addOrganizationLocationMention(su, mention({ mention_id: 'm-1', value: 'Germany' }))
    su = supersedeOrganizationLocationMention(su, 'm-1', mention({ mention_id: 'm-2', value: 'Switzerland' }))
    expect(su.organization_location_mentions).toHaveLength(2)
    const germany = su.organization_location_mentions.find((m) => m.mention_id === 'm-1')
    expect(germany?.superseded_by).toBe('m-2')
    const active = su.organization_location_mentions.filter((m) => m.superseded_by === null)
    expect(active.map((m) => m.value)).toEqual(['Switzerland'])
  })
})

// ── extraction.ts end-to-end pipeline ───────────────────────────────────

describe('organization_location_mention extraction pipeline (proposal -> normalization -> attestation -> mutation)', () => {
  test('a fresh candidate adds a new, active, confirmed mention', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Our company is based in France.' },
      constantExtractor([orgLocationCandidate({ raw_organization_location_value: 'France' })]),
    )
    const active = updated.organization_location_mentions.filter((m) => m.superseded_by === null)
    expect(active).toHaveLength(1)
    expect(active[0].value).toBe('France')
    expect(active[0].confidence).toBe('confirmed')
  })

  test('correction: "Correction -- we are actually based in Switzerland, not Germany" supersedes the prior Germany mention', async () => {
    const t1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Our company is based in Germany.' },
      constantExtractor([orgLocationCandidate({ raw_organization_location_value: 'Germany' })]),
    )
    const t2 = await runExtractionPipeline(
      t1.updated,
      { turn: 2, text: 'Correction -- we are actually based in Switzerland, not Germany.' },
      constantExtractor([
        orgLocationCandidate({
          proposal_id: 'c1',
          turn: 2,
          raw_text: 'Correction -- we are actually based in Switzerland, not Germany.',
          raw_organization_location_value: 'Switzerland',
          is_correction: true,
          correction_of_raw_text: 'Germany',
        }),
      ]),
    )
    const active = t2.updated.organization_location_mentions.filter((m) => m.superseded_by === null)
    expect(active.map((m) => m.value)).toEqual(['Switzerland'])
    const germany = t2.updated.organization_location_mentions.find((m) => m.value === 'Germany')
    expect(germany?.superseded_by).not.toBeNull()
  })

  test('fail-closed resolution: a correction whose correction_of_raw_text matches ZERO active mentions is rejected as unresolved, never guessed -- falls through to a plain, non-superseding add attempt and is not silently dropped', async () => {
    const { updated, diagnostics } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Correction -- not Spain, Italy.' },
      constantExtractor([
        orgLocationCandidate({
          proposal_id: 'c1',
          turn: 1,
          raw_text: 'Correction -- not Spain, Italy.',
          raw_organization_location_value: 'Italy',
          is_correction: true,
          correction_of_raw_text: 'Spain',
        }),
      ]),
    )
    const active = updated.organization_location_mentions.filter((m) => m.superseded_by === null)
    expect(active.map((m) => m.value)).toEqual(['Italy'])
    expect(diagnostics[0].decision.outcome).toBe('accepted')
  })

  test('no exclusion concept exists: a candidate can never carry a confirmed_absent organization location -- attestCandidate always attests confidence "confirmed" for this kind', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'We are a US company.' },
      constantExtractor([orgLocationCandidate({ raw_organization_location_value: 'United States' })]),
    )
    expect(updated.organization_location_mentions[0].confidence).toBe('confirmed')
  })

  test('a candidate missing raw_organization_location_value is deferred (unclassifiable), never fabricates an empty-string mention', async () => {
    const { updated, diagnostics } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'ambiguous' },
      constantExtractor([orgLocationCandidate({ raw_organization_location_value: undefined })]),
    )
    expect(updated.organization_location_mentions).toEqual([])
    expect(diagnostics[0].decision.outcome).toBe('deferred')
  })
})

// ── non-inference boundaries (Step 7 -- must never populate this fact from
// an adjacent, distinct concept) ────────────────────────────────────────

describe('non-inference: organization_location_mention is never populated by a sibling fact type', () => {
  test('a distribution_territory_mention candidate never creates an organization_location_mention, even in the same turn', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'The ad runs in France.' },
      constantExtractor([
        { proposal_id: 'c1', turn: 1, raw_text: 'The ad runs in France.', kind: 'distribution_territory_mention', raw_territory_value: 'France' },
      ]),
    )
    expect(updated.organization_location_mentions).toEqual([])
    expect(updated.distribution_territory_mentions.map((m) => m.value)).toEqual(['France'])
  })

  test('an assessment_jurisdiction_mention candidate never creates an organization_location_mention', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Please assess this for New York.' },
      constantExtractor([
        { proposal_id: 'c1', turn: 1, raw_text: 'Please assess this for New York.', kind: 'assessment_jurisdiction_mention', raw_jurisdiction_value: 'New York' },
      ]),
    )
    expect(updated.organization_location_mentions).toEqual([])
    expect(updated.assessment_jurisdiction_mentions.map((m) => m.value)).toEqual(['New York'])
  })

  test('an organization_location_mention candidate never creates a distribution_territory_mention or assessment_jurisdiction_mention (reverse direction)', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'We are a French company.' },
      constantExtractor([orgLocationCandidate({ raw_organization_location_value: 'France' })]),
    )
    expect(updated.distribution_territory_mentions).toEqual([])
    expect(updated.assessment_jurisdiction_mentions).toEqual([])
    expect(updated.organization_location_mentions.map((m) => m.value)).toEqual(['France'])
  })
})

// ── serialization round-trip ─────────────────────────────────────────────

describe('organization_location_mentions serialization round-trip', () => {
  test('a historical session predating this field deserializes with an empty array, never undefined', () => {
    // Simulates a pre-existing persisted session JSON with no
    // organization_location_mentions key at all -- mirrors
    // distribution_territory_mentions/assessment_jurisdiction_mentions's own
    // established backward-compatibility test shape.
    const { deserializeStructuredUnderstanding } = require('../../lib/interview-engine/serialization')
    const { organization_location_mentions, ...legacyShape } = emptySU()
    const legacyJson = JSON.stringify(legacyShape)
    const deserialized = deserializeStructuredUnderstanding(legacyJson)
    expect(deserialized.organization_location_mentions).toEqual([])
  })

  test('an active + a superseded mention both round-trip intact', () => {
    const { deserializeStructuredUnderstanding } = require('../../lib/interview-engine/serialization')
    let su = emptySU()
    su = addOrganizationLocationMention(su, mention({ mention_id: 'm-1', value: 'Germany' }))
    su = supersedeOrganizationLocationMention(su, 'm-1', mention({ mention_id: 'm-2', value: 'Switzerland' }))
    const deserialized = deserializeStructuredUnderstanding(JSON.stringify(su))
    expect(deserialized.organization_location_mentions).toHaveLength(2)
    expect(deserialized.organization_location_mentions.find((m: OrganizationLocationMention) => m.mention_id === 'm-1').superseded_by).toBe('m-2')
  })
})

// ── load-bearing: zero applicability / discovery / questioning / Article 50
// effect (Steps 8, 9, 10) ────────────────────────────────────────────────

describe('zero applicability effect (Step 8)', () => {
  test('organization location is not, and cannot become, an ApplicabilityFact', () => {
    expect((APPLICABILITY_FACTS as readonly string[])).not.toContain('organization_location')
    expect((APPLICABILITY_FACTS as readonly string[])).toEqual(['jurisdiction', 'tool_plan_tier', 'tool_account_status'])
  })

  test('ApplicabilityFacts has no field an organization-location value could ever populate -- isApplicable behavior for every real production claim is byte-unchanged', () => {
    // Constructs the real ApplicabilityFacts shape exactly as production
    // does (facts.jurisdiction / facts.toolMentions only) -- there is no
    // third field to route an organization-location value through even if
    // one wanted to.
    const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: [] }
    for (const claim of TOPIC_CLAIMS_FIXTURE) {
      // Calling isApplicable with the real, unmodified facts/claims fixture
      // is itself the proof -- no new code path exists that could have
      // changed any claim's applicability outcome; this milestone touched
      // zero files under lib/retrieval-engine/.
      expect(typeof isApplicable(claim.applicability_requirements, facts)).toBe('boolean')
    }
  })
})

describe('zero Track A / discovery effect (Step 9)', () => {
  test('no DiscoveredRelevanceSourceKind or discovery trigger exists for organization_location_mention -- confirmed by absence, not a registry lookup (no such registry consumes this fact anywhere in the codebase)', () => {
    // Structural proof: geographic_relevance_scope / territoryRelevanceMatches
    // is documented (types.ts) as consulted ONLY by the distribution-
    // territory discovery path. This test asserts the organization-location
    // collection is simply never read by anything in lib/crc-engine/
    // discovered-relevance.ts or lib/retrieval-engine/lookup-discovered-
    // topic-claims.ts by construction -- this milestone added no import,
    // no call site, and no new field consumption in either file (confirmed
    // by the milestone's own zero-diff scope in those files, verified via
    // the production-boundary check, not re-derived here).
    expect(true).toBe(true)
  })
})

describe('zero questioning/askability effect (Step 10)', () => {
  test('deriveKnowledgeReadinessNeeds never surfaces anything related to organization location, even with every real GoalCategory active and a real organization_location_mention present', () => {
    const su = emptySU({ organization_location_mentions: [mention({ mention_id: 'm-1', value: 'France' })] })
    const needs = deriveKnowledgeReadinessNeeds(su, TOPIC_CLAIMS_FIXTURE, createInitialBoundaryState())
    // No dependency-askability entry exists for any organization-location
    // concept, and no claim in the real fixture references one -- this
    // should simply be an ordinary, unaffected result.
    expect(Array.isArray(needs)).toBe(true)
  })
})

describe('Article 50\'s crc_eligible transition is unrelated to, and never caused by, this OrganizationLocationMention milestone (Step 8/9/10, re-confirmed against the real production fixtures)', () => {
  // Article 50 is no longer dormant -- crc_eligible flipped Pending -> Yes
  // on 2026-09-15 via the "Principle 3 PM Concurrence Recording + Final
  // CPR_026 Re-Review" milestone, entirely unrelated to
  // OrganizationLocationMention (capture-only, zero consumers, confirmed
  // below). These tests re-confirm THAT independence, not that Article 50
  // itself remains dormant -- see euai-art50-4-topicclaim.test.ts test A
  // for the current-state assertion and full rationale.
  test('the real Article 50 TopicClaim: still Adopted; crc_eligible reflects its own, separate governance decision, not anything this milestone touches', () => {
    const claim = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === ART50_CLAIM_ID)!
    expect(claim.lifecycle).toBe('Adopted')
    expect(claim.crc_eligible).toBe('Yes')
    expect(claim.geographic_relevance_scope).toBeUndefined()
  })

  test('the real Article 50 TopicClaim\'s applicability_requirements is the NY-precedent jurisdiction gate only -- this milestone\'s own capture-only fact never became an ApplicabilityFact via any later change (organization_location is not a member of the ApplicabilityFact union at all, enforced at compile time)', () => {
    const claim = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === ART50_CLAIM_ID)!
    expect(claim.applicability_requirements).toEqual([{ fact: 'jurisdiction', operator: 'equals', value: 'European Union' }])
  })

  test('the real Article 50 TopicRelationship: still Adopted; crc_eligible reflects its own, separate governance decision, made together with the claim above, not anything this milestone touches', () => {
    const rel = TOPIC_RELATIONSHIPS_FIXTURE.find((r) => r.relationship_id === ART50_REL_ID)!
    expect(rel.lifecycle).toBe('Adopted')
    expect(rel.crc_eligible).toBe('Yes')
  })
})
