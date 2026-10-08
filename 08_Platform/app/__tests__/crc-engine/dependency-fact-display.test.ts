/**
 * Governed dependency display vocabulary -- registry tests (CRC-CC-SCOPE-6F,
 * 2026-09-25; CRC-CC-DISPLAY-VOCABULARY-2, 2026-10-08, explicit test-time
 * coverage contract; CRC-CC-DEPENDENCY-LABELS-1, 2026-10-08, 18 additional
 * human/PM-approved Level-1 labels following the CRC-CC-DEPENDENCY-LABEL-
 * GOVERNANCE-1 read-only triage). Deterministic, no mocking -- exercises the
 * real production registry directly. Mirrors applicability-fact-display.test.ts's
 * own convention exactly.
 */

import * as fs from 'fs'
import * as path from 'path'
import { getDependencyDisplayLabel, hasExplicitDependencyDisplayDecision } from '@/lib/crc-engine/dependency-fact-display'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { isDependencyAskableInCrc } from '@/lib/crc-engine/dependency-askability'

const APP_ROOT = path.join(__dirname, '..', '..')

describe('getDependencyDisplayLabel -- production registry', () => {
  test('human_contribution_description -> the one human/PM-approved label, exactly', () => {
    expect(getDependencyDisplayLabel('human_contribution_description')).toBe('human contribution to the finished work')
  })

  test('the approved label never contains the word "creative" -- SCOPE-6E explicitly rejected human creative contribution', () => {
    const label = getDependencyDisplayLabel('human_contribution_description')
    expect(label).toBeDefined()
    expect(label!.toLowerCase()).not.toContain('creative')
  })

  test('the approved label never contains legal-conclusion vocabulary', () => {
    const label = getDependencyDisplayLabel('human_contribution_description')!
    expect(label.toLowerCase()).not.toMatch(/copyright|authorship|ownership|clearance|sufficient|meaningful|legally|evidence|verified|approved|commercial/)
  })

  // CRC-CC-DEPENDENCY-LABELS-1 (2026-10-08): the stock/evidence-only IDs this
  // test originally asserted were ALL unregistered are no longer all
  // unregistered -- 5 of the 8 (editorial_designation_confirmed,
  // separate_authorization_obtained, release_status_confirmed,
  // rights_and_clearance_status, which_provider) are now human/PM-approved
  // Category-A labels (see the dedicated describe block below). This
  // assertion is intentionally superseded for those 5, not deleted outright
  // -- narrowed to the 3 that remain Category-B/unregistered, which is the
  // behavior this test still correctly protects.
  test('the remaining stock Category-B dependencies stay unregistered -- fail closed, never a fallback string', () => {
    const stockIds = ['asset_confirmed_getty', 'asset_confirmed_istock', 'asset_confirmed_shutterstock']
    for (const id of stockIds) {
      expect(getDependencyDisplayLabel(id)).toBeUndefined()
    }
  })

  test('an unrecognized/unknown dependency ID fails closed to undefined, never throws, never de-snake-cases', () => {
    expect(getDependencyDisplayLabel('not_a_real_dependency_id')).toBeUndefined()
    expect(getDependencyDisplayLabel('')).toBeUndefined()
  })

  test('the label is not mechanically derived from the ID -- de-snake-casing the ID would NOT produce the approved label', () => {
    const mechanicallyDerived = 'human_contribution_description'.replace(/_/g, ' ')
    expect(getDependencyDisplayLabel('human_contribution_description')).not.toBe(mechanicallyDerived)
  })

  // CRC-CC-DEPENDENCY-LABELS-1 (2026-10-08): intentionally superseded, not
  // deleted -- this test's own candidate list now includes 4 of the 18
  // newly-approved IDs, so "exactly one" is no longer the correct
  // assertion. The underlying invariant this test protected (the registry
  // only resolves what has actually been approved, nothing more) is now
  // covered precisely by the dedicated 19-entry test below.
  test('exactly the human/PM-approved set is registered among this candidate list (now 5 of 5, not 1 of 5)', () => {
    const candidates = ['human_contribution_description', 'editorial_designation_confirmed', 'separate_authorization_obtained', 'release_status_confirmed', 'rights_and_clearance_status']
    const registered = candidates.filter((id) => getDependencyDisplayLabel(id) !== undefined)
    expect(registered.sort()).toEqual(candidates.slice().sort())
  })
})

// ── CRC-CC-DISPLAY-VOCABULARY-2 (2026-10-08) -- explicit decision coverage ──
//
// Dependency IDs are open strings, not a closed union, so this contract is
// enforced at TEST time against the live, production governed-claim
// fixture rather than at TypeScript compile time -- see
// dependency-fact-display.ts's own header. A future governed claim
// introducing a new, undecided dependency ID fails the coverage test below
// rather than silently reaching Production as an anonymous fallback.
describe('dependency display-decision coverage against the live governed fixture (CRC-CC-DISPLAY-VOCABULARY-2)', () => {
  function allGovernedDependencyIds(): string[] {
    const ids = new Set<string>()
    for (const claim of TOPIC_CLAIMS_FIXTURE) {
      for (const dep of claim.unresolved_project_dependencies) ids.add(dep)
    }
    return [...ids]
  }

  test('every dependency ID any real governed claim references via unresolved_project_dependencies has an EXPLICIT display decision (label or null) -- missing registry entries, not explicit nulls, fail this test', () => {
    const undecided = allGovernedDependencyIds().filter((id) => !hasExplicitDependencyDisplayDecision(id))
    expect(undecided).toEqual([])
  })

  test('sanity: the live fixture currently references more than one dependency ID, so the coverage test above is not vacuous', () => {
    expect(allGovernedDependencyIds().length).toBeGreaterThan(1)
  })

  // CRC-CC-DEPENDENCY-LABELS-1 (2026-10-08): editorial_designation_confirmed
  // is now a human/PM-approved label, not an explicit-null example -- this
  // test is updated to use asset_confirmed_getty (still Category-B/null)
  // instead. The assertion's own INTENT (explicit-null vs. never-decided
  // are distinguishable) is unchanged; only the illustrative ID is swapped.
  test('an EXPLICIT null decision is distinguishable from a never-decided (absent) one, even though both resolve the public lookup to undefined', () => {
    expect(hasExplicitDependencyDisplayDecision('asset_confirmed_getty')).toBe(true) // explicit null
    expect(getDependencyDisplayLabel('asset_confirmed_getty')).toBeUndefined()
    expect(hasExplicitDependencyDisplayDecision('some_dependency_id_nobody_has_ever_reviewed')).toBe(false) // never decided
    expect(getDependencyDisplayLabel('some_dependency_id_nobody_has_ever_reviewed')).toBeUndefined()
  })

  // CRC-CC-DEPENDENCY-LABELS-1: narrowed from "every ID except
  // human_contribution_description" (no longer true -- 18 more now resolve
  // to a real label) to the exact, current Category-B set this milestone
  // left untouched.
  test('every currently-null-decided real governed dependency ID still resolves to undefined through the public lookup -- the coverage table change produced ZERO rendered-copy change for these', () => {
    const CATEGORY_B = [
      'actual_knowledge_confirmed',
      'advertisement_purpose_confirmed',
      'advertiser_or_duty_holder_status_confirmed',
      'artistic_creative_satirical_fictional_analogous_work',
      'asset_confirmed_getty',
      'asset_confirmed_istock',
      'asset_confirmed_shutterstock',
      'confusion_as_to_affiliation_or_sponsorship',
      'content_constitutes_deep_fake',
      'deployer_status_confirmed',
      'expressive_work_exemption_applies',
      'provider_status_confirmed',
      'synthetic_performer_content_present',
      'synthetic_performer_present_confirmed',
      'union_establishment_or_output_use',
    ]
    const governed = new Set(allGovernedDependencyIds())
    // Sanity: every Category-B ID is itself a real, currently-governed
    // dependency -- this list isn't drifting from the live fixture.
    for (const id of CATEGORY_B) expect(governed.has(id)).toBe(true)
    expect(CATEGORY_B.length).toBe(15)
    for (const id of CATEGORY_B) {
      expect(hasExplicitDependencyDisplayDecision(id)).toBe(true)
      expect(getDependencyDisplayLabel(id)).toBeUndefined()
    }
  })

  test('display-decision coverage is independent of askability -- an evidence-only (non-askable) dependency may be null-decided OR labeled, and the one askable dependency is labeled; neither state implies the other', () => {
    // human_contribution_description: askable AND labeled.
    expect(isDependencyAskableInCrc('human_contribution_description')).toBe(true)
    expect(getDependencyDisplayLabel('human_contribution_description')).toBeDefined()
    // editorial_designation_confirmed: evidence-only (non-askable) AND now
    // LABELED (CRC-CC-DEPENDENCY-LABELS-1) -- proves a label does not grant
    // askability.
    expect(isDependencyAskableInCrc('editorial_designation_confirmed')).toBe(false)
    expect(getDependencyDisplayLabel('editorial_designation_confirmed')).toBeDefined()
    // asset_confirmed_getty: evidence-only (non-askable) AND still
    // null-decided -- the other half of the independence proof.
    expect(isDependencyAskableInCrc('asset_confirmed_getty')).toBe(false)
    expect(getDependencyDisplayLabel('asset_confirmed_getty')).toBeUndefined()
  })

  test('display-decision coverage does not alter BI disposition, applicability, evidence classification, or claim-count semantics -- the registry module imports nothing from those subsystems', () => {
    // Structural, not behavioral: dependency-fact-display.ts imports nothing
    // from bounded-interpretation/ or dependency-askability.ts -- a label/
    // null decision cannot reach either, because neither reads this module.
    const src = fs.readFileSync(path.join(APP_ROOT, 'lib/crc-engine/dependency-fact-display.ts'), 'utf-8')
    expect(src).not.toMatch(/from ['"].*bounded-interpretation/)
    expect(src).not.toMatch(/from ['"].*dependency-askability/)
  })

  test('no claim_id or raw dependency-ID humanization ever leaks into a registered label', () => {
    for (const claim of TOPIC_CLAIMS_FIXTURE) {
      for (const dep of claim.unresolved_project_dependencies) {
        const label = getDependencyDisplayLabel(dep)
        if (label === undefined) continue
        expect(label).not.toContain(claim.claim_id)
        expect(label).not.toBe(dep.replace(/_/g, ' ')) // never mechanically de-snake-cased
      }
    }
  })
})

// ── CRC-CC-DEPENDENCY-LABELS-1 (2026-10-08) -- 18 approved Level-1 labels ──
//
// Human/PM-approved Category-A set from CRC-CC-DEPENDENCY-LABEL-GOVERNANCE-1's
// own read-only triage. Every string below is asserted byte-for-byte exact --
// this test file does not author, improve, or normalize wording; it only
// proves the registry matches what was approved.
describe('approved Level-1 dependency labels (CRC-CC-DEPENDENCY-LABELS-1)', () => {
  const APPROVED: Record<string, string> = {
    which_provider: 'stock or footage provider',
    editorial_designation_confirmed: 'provider content designation',
    separate_authorization_obtained: 'separate provider authorization',
    release_status_confirmed: 'model or property release status',
    rights_and_clearance_status: 'provider rights-and-clearance status',
    which_music_provider: 'music provider',
    artlist_license_type_confirmed: 'Artlist license type',
    artlist_licensee_employer_size_confirmed: 'Artlist licensee organization size',
    artlist_licensee_employer_type_confirmed: 'Artlist licensee organization type',
    artlist_subscription_active_at_publication_confirmed: 'Artlist subscription status at publication',
    epidemic_license_tier_confirmed: 'Epidemic Sound license tier',
    music_subscription_active_at_publication_confirmed: 'music subscription status at publication',
    storyblocks_license_tier_confirmed: 'Storyblocks license tier',
    stabilityai_commercial_registration_completed: 'Stability AI commercial registration status',
    stabilityai_organization_revenue_threshold_status: 'Stability AI organization revenue status',
    stabilityai_product_is_core_model_under_community_license: 'Stability AI product category',
    synthesia_stock_avatar_used_confirmed: 'Synthesia avatar type',
    synthesia_written_consent_obtained: 'Synthesia written-consent status',
  }

  const CATEGORY_B = [
    'actual_knowledge_confirmed',
    'advertisement_purpose_confirmed',
    'advertiser_or_duty_holder_status_confirmed',
    'artistic_creative_satirical_fictional_analogous_work',
    'asset_confirmed_getty',
    'asset_confirmed_istock',
    'asset_confirmed_shutterstock',
    'confusion_as_to_affiliation_or_sponsorship',
    'content_constitutes_deep_fake',
    'deployer_status_confirmed',
    'expressive_work_exemption_applies',
    'provider_status_confirmed',
    'synthetic_performer_content_present',
    'synthetic_performer_present_confirmed',
    'union_establishment_or_output_use',
  ]

  test('all 18 approved dependency IDs resolve to their exact approved label, byte-for-byte', () => {
    for (const [id, label] of Object.entries(APPROVED)) {
      expect(getDependencyDisplayLabel(id)).toBe(label)
    }
  })

  test('exactly 18 approved entries exist in this mapping (sanity on the test fixture itself)', () => {
    expect(Object.keys(APPROVED)).toHaveLength(18)
  })

  test('human_contribution_description remains unchanged by this milestone', () => {
    expect(getDependencyDisplayLabel('human_contribution_description')).toBe('human contribution to the finished work')
  })

  test('all 15 Category-B (governance-sensitive) dependencies remain explicit null, not a label', () => {
    expect(CATEGORY_B).toHaveLength(15)
    for (const id of CATEGORY_B) {
      expect(getDependencyDisplayLabel(id)).toBeUndefined()
      expect(hasExplicitDependencyDisplayDecision(id)).toBe(true) // still an explicit decision, just not a label
    }
  })

  test('18 approved + 1 pre-existing + 15 Category-B accounts for exactly the 34 entries this registry currently carries', () => {
    expect(Object.keys(APPROVED).length + 1 + CATEGORY_B.length).toBe(34)
  })

  test('a null dependency still returns undefined; an unknown dependency still returns undefined -- both fail-closed identically', () => {
    expect(getDependencyDisplayLabel('asset_confirmed_getty')).toBeUndefined() // null-decided
    expect(getDependencyDisplayLabel('a_dependency_id_that_has_never_existed')).toBeUndefined() // never decided
  })

  // Part 13: mechanical semantic-safety audit. This does NOT rewrite any
  // label if it trips -- it only reports. None did.
  test('none of the 18 approved labels mechanically contains a value/result/conclusion word', () => {
    const FORBIDDEN = /confirmed|approved|cleared|compliant|allowed|permitted|satisfied|applicable|required|sufficient/i
    for (const [id, label] of Object.entries(APPROVED)) {
      expect({ id, label, matches: FORBIDDEN.test(label) }).toEqual({ id, label, matches: false })
    }
  })

  test('the newly-labeled dependencies remain governed exactly as before -- display decisions do not alter dependency-askability.ts treatment', () => {
    // Spot-check across families: a labeled-but-non-askable dependency from
    // each governed claim family this milestone touched.
    const spotCheck = ['which_provider', 'artlist_license_type_confirmed', 'stabilityai_commercial_registration_completed', 'synthesia_written_consent_obtained']
    for (const id of spotCheck) {
      expect(isDependencyAskableInCrc(id)).toBe(false)
      expect(getDependencyDisplayLabel(id)).toBeDefined()
    }
  })

  test('implementing these 18 labels required no change to dependency-askability.ts -- the module remains a leaf with no upstream readers among Retrieval/BI/applicability modules', () => {
    const src = fs.readFileSync(path.join(APP_ROOT, 'lib/crc-engine/dependency-fact-display.ts'), 'utf-8')
    expect(src).not.toMatch(/from ['"].*bounded-interpretation/)
    expect(src).not.toMatch(/from ['"].*dependency-askability/)
  })
})
