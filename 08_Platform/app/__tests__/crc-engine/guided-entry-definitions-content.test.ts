/**
 * GE-2 — content/domain-level checks for the three approved initial roles
 * and the analytics event-type additions. Covers required test 1 (entry
 * screen has exactly four first-class choices: three roles + one
 * always-present free-form option hardcoded in CrcEntryFlow.tsx) at the
 * data level, and Phase 3's "must not imply" content requirement.
 *
 * Run: npx jest __tests__/crc-engine/guided-entry-definitions-content.test.ts
 */

import { GUIDED_ENTRY_DEFINITIONS } from '../../lib/crc-engine/guided-entry-definitions'
import { ANALYTICS_EVENT_TYPES } from '../../lib/crc-engine/analytics-events'

describe('GUIDED_ENTRY_DEFINITIONS — exactly the three approved roles', () => {
  test('exactly three definitions, matching the approved entry-screen roles (test 1, data level -- the fourth, always-present choice is Free Form, hardcoded in CrcEntryFlow.tsx, not a GuidedEntryDefinition)', () => {
    expect(GUIDED_ENTRY_DEFINITIONS).toHaveLength(3)
    expect(GUIDED_ENTRY_DEFINITIONS.map((d) => d.definitionId).sort()).toEqual(
      ['agency-producing-for-client', 'in-house-own-organization', 'independent-own-work'].sort(),
    )
  })

  const PROHIBITED_TERMS = [
    /authoriz/i,
    /\bown(s|ership)?\b/i,
    /clear(ance|ed)?\b/i,
    /permission/i,
    /contract/i,
    /evidence/i,
    /jurisdiction/i,
    /approv/i,
  ]

  test.each(GUIDED_ENTRY_DEFINITIONS.map((d) => [d.definitionId, d] as const))(
    '%s: `establishes` text explicitly disclaims what it must NOT imply (Phase 3)',
    (_id, def) => {
      const lower = def.establishes.toLowerCase()
      // Concepts common to all three roles regardless of whether a third
      // party (client/employer) is even involved.
      expect(lower).toMatch(/does not tell crc|not tell crc/i)
      expect(lower).toContain('clearance')
      expect(lower).toContain('jurisdiction')
      expect(lower).toContain('evidence')
      // "Authorization" (someone else's permission) is only a meaningful
      // concept for the two roles that involve a third party at all --
      // Agency (client) and In-house (employer). Independent has no such
      // party, so its own disclaimer correctly omits it rather than
      // mentioning a concept that doesn't apply to a solo creator.
      if (def.definitionId !== 'independent-own-work') {
        expect(lower).toContain('authorization')
      }
    },
  )

  test('each definition establishes exactly one workflow_role option -- never a compound/bundled assertion', () => {
    for (const def of GUIDED_ENTRY_DEFINITIONS) {
      const roleField = def.fields.find((f) => f.kind === 'workflow_role')
      expect(roleField).toBeDefined()
      expect(roleField!.options).toHaveLength(1)
    }
  })

  test('all three roles share byte-identical tool and jurisdiction field specs -- CRC asks the same thing regardless of role (approved mock, screens 2-4)', () => {
    const [first, ...rest] = GUIDED_ENTRY_DEFINITIONS
    const firstTool = first.fields.find((f) => f.kind === 'tool')
    const firstJurisdiction = first.fields.find((f) => f.kind === 'jurisdiction')
    for (const def of rest) {
      expect(def.fields.find((f) => f.kind === 'tool')).toEqual(firstTool)
      expect(def.fields.find((f) => f.kind === 'jurisdiction')).toEqual(firstJurisdiction)
    }
  })
})

describe('ANALYTICS_EVENT_TYPES — GE-2 additions', () => {
  test('includes the three new funnel event types alongside every pre-existing one', () => {
    expect(ANALYTICS_EVENT_TYPES).toEqual(
      expect.arrayContaining(['cta_click', 'discovery_signal', 'commercial_assurance_bridge_shown', 'results_gate_shown', 'guided_entry_submitted', 'guided_entry_crc_initialized', 'free_form_crc_initialized']),
    )
  })
})
