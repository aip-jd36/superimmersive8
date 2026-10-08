/**
 * Governed dependency display vocabulary -- registry tests (CRC-CC-SCOPE-6F,
 * 2026-09-25; CRC-CC-DISPLAY-VOCABULARY-2, 2026-10-08, explicit test-time
 * coverage contract). Deterministic, no mocking -- exercises the real
 * production registry directly. Mirrors applicability-fact-display.test.ts's
 * own convention exactly. Deliberately narrow: proves exactly the one
 * activated entry and the fail-closed default for everything else.
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

  test('every other current stock/evidence-only dependency remains unregistered -- fail closed, never a fallback string', () => {
    const stockIds = ['editorial_designation_confirmed', 'separate_authorization_obtained', 'release_status_confirmed', 'rights_and_clearance_status', 'asset_confirmed_getty', 'asset_confirmed_istock', 'asset_confirmed_shutterstock', 'which_provider']
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

  test('exactly one dependency ID is registered', () => {
    const candidates = ['human_contribution_description', 'editorial_designation_confirmed', 'separate_authorization_obtained', 'release_status_confirmed', 'rights_and_clearance_status']
    const registered = candidates.filter((id) => getDependencyDisplayLabel(id) !== undefined)
    expect(registered).toEqual(['human_contribution_description'])
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

  test('an EXPLICIT null decision is distinguishable from a never-decided (absent) one, even though both resolve the public lookup to undefined', () => {
    expect(hasExplicitDependencyDisplayDecision('editorial_designation_confirmed')).toBe(true) // explicit null
    expect(getDependencyDisplayLabel('editorial_designation_confirmed')).toBeUndefined()
    expect(hasExplicitDependencyDisplayDecision('some_dependency_id_nobody_has_ever_reviewed')).toBe(false) // never decided
    expect(getDependencyDisplayLabel('some_dependency_id_nobody_has_ever_reviewed')).toBeUndefined()
  })

  test('every currently-null-decided real governed dependency ID still resolves to undefined through the public lookup -- the coverage table change produced ZERO rendered-copy change', () => {
    const nullDecided = allGovernedDependencyIds().filter((id) => id !== 'human_contribution_description')
    expect(nullDecided.length).toBeGreaterThan(0)
    for (const id of nullDecided) {
      expect(hasExplicitDependencyDisplayDecision(id)).toBe(true)
      expect(getDependencyDisplayLabel(id)).toBeUndefined()
    }
  })

  test('display-decision coverage is independent of askability -- an evidence-only (non-askable) dependency may be null-decided, and the one askable dependency may be labeled; neither implies the other', () => {
    // human_contribution_description: askable AND labeled.
    expect(isDependencyAskableInCrc('human_contribution_description')).toBe(true)
    expect(getDependencyDisplayLabel('human_contribution_description')).toBeDefined()
    // editorial_designation_confirmed (a real stock dependency): evidence-only
    // (non-askable) AND null-decided -- both independently true, neither caused
    // by the other.
    expect(isDependencyAskableInCrc('editorial_designation_confirmed')).toBe(false)
    expect(getDependencyDisplayLabel('editorial_designation_confirmed')).toBeUndefined()
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
