/**
 * Guided Entry Foundation (GE-1) — validation + allow-listed field-to-
 * mutation mapping tests. Covers the required-tests list from the GE-1
 * implementation task: fail-closed validation, zero UserGoal fabrication,
 * no arbitrary StructuredUnderstanding paths, no evidence-only satisfaction,
 * explicit-self-report confidence, canonical tool handling, provenance
 * distinguishability, and correction/supersession using the real,
 * unmodified mutations.ts functions.
 *
 * Run: npx jest __tests__/crc-engine/guided-entry-init.test.ts
 */

import {
  validateGuidedEntryRequest,
  applyGuidedEntrySelection,
  buildGuidedEntrySourceStatement,
  GUIDED_ENTRY_SOURCE_PREFIX,
  GUIDED_ENTRY_INIT_TURN,
  isValidGuidedEntryInitId,
  type RawGuidedEntryInit,
} from '../../lib/crc-engine/guided-entry-init'
import { supersedeToolMention, supersedeAssessmentJurisdictionMention } from '../../lib/interview-engine/mutations'
import { GUIDED_ENTRY_DEFINITIONS } from '../../lib/crc-engine/guided-entry-definitions'
import { isCanonicalToolIdentity } from '../../lib/tool-identity/registry'
import type { ToolMention, AssessmentJurisdictionMention } from '../../types/interview-engine'

const VALID_ID = '11111111-1111-4111-8111-111111111111'
const DEFINITION = GUIDED_ENTRY_DEFINITIONS[0]

function baseRaw(overrides: Partial<RawGuidedEntryInit> = {}): RawGuidedEntryInit {
  return {
    guidedEntryInitId: VALID_ID,
    definitionId: DEFINITION.definitionId,
    definitionVersion: DEFINITION.version,
    fields: [{ fieldId: 'workflow_role', value: 'agency, producing for a client' }],
    concern: 'Can I use this commercially?',
    ...overrides,
  }
}

describe('isValidGuidedEntryInitId', () => {
  test('accepts a UUID v4 string', () => {
    expect(isValidGuidedEntryInitId(VALID_ID)).toBe(true)
  })
  test('rejects non-UUID strings, numbers, and non-v4 UUIDs', () => {
    expect(isValidGuidedEntryInitId('not-a-uuid')).toBe(false)
    expect(isValidGuidedEntryInitId(123)).toBe(false)
    expect(isValidGuidedEntryInitId('11111111-1111-1111-8111-111111111111')).toBe(false) // version nibble not '4'
  })
})

describe('validateGuidedEntryRequest — fail-closed', () => {
  test('valid, minimal request validates', () => {
    const result = validateGuidedEntryRequest(baseRaw())
    expect(result.ok).toBe(true)
  })

  test('rejects malformed guidedEntryInitId', () => {
    const result = validateGuidedEntryRequest(baseRaw({ guidedEntryInitId: 'not-a-uuid' }))
    expect(result.ok).toBe(false)
  })

  test('rejects unknown definitionId', () => {
    const result = validateGuidedEntryRequest(baseRaw({ definitionId: 'does-not-exist' }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/Unknown guided entry definition/)
  })

  test('rejects unknown definitionVersion for a real definitionId', () => {
    const result = validateGuidedEntryRequest(baseRaw({ definitionVersion: 'v999' }))
    expect(result.ok).toBe(false)
  })

  test('rejects missing required field', () => {
    const result = validateGuidedEntryRequest(baseRaw({ fields: [] }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/Missing required field/)
  })

  test('rejects unknown fieldId for this definition', () => {
    const result = validateGuidedEntryRequest(baseRaw({ fields: [{ fieldId: 'not_a_real_field', value: 'x' }] }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/Unknown field/)
  })

  test('rejects an option value not offered by this field', () => {
    const result = validateGuidedEntryRequest(
      baseRaw({ fields: [{ fieldId: 'workflow_role', value: 'agency, producing for a client' }, { fieldId: 'tool', value: 'some-made-up-tool' }] }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/Unknown option value/)
  })

  test('rejects duplicate entries for the same fieldId', () => {
    const result = validateGuidedEntryRequest(
      baseRaw({
        fields: [
          { fieldId: 'workflow_role', value: 'agency, producing for a client' },
          { fieldId: 'workflow_role', value: 'agency, producing for a client' },
        ],
      }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/Duplicate/)
  })

  test('rejects empty/whitespace-only concern', () => {
    const result = validateGuidedEntryRequest(baseRaw({ concern: '   ' }))
    expect(result.ok).toBe(false)
  })

  test('rejects malformed fields shape (not an array, or non-string members)', () => {
    expect(validateGuidedEntryRequest(baseRaw({ fields: 'nope' })).ok).toBe(false)
    expect(validateGuidedEntryRequest(baseRaw({ fields: [{ fieldId: 1, value: 'x' }] })).ok).toBe(false)
  })

  test('accepts optional fields (tool, jurisdiction) being entirely omitted', () => {
    const result = validateGuidedEntryRequest(baseRaw({ fields: [{ fieldId: 'workflow_role', value: 'agency, producing for a client' }] }))
    expect(result.ok).toBe(true)
  })

  test('every canonical tool option in the real fixture is actually canonical (defense-in-depth check is not dead code)', () => {
    const toolField = DEFINITION.fields.find((f) => f.kind === 'tool')!
    for (const option of toolField.options) {
      expect(isCanonicalToolIdentity(option.value)).toBe(true)
    }
  })
})

describe('applyGuidedEntrySelection — allow-listed mutation mapping', () => {
  test('workflow_role field produces a ProjectFacts.workflow_role AttestedFact, confidence "confirmed" (explicit self-report, never stronger)', () => {
    const result = validateGuidedEntryRequest(baseRaw())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const su = applyGuidedEntrySelection(result.selection, 'tok-1')
    expect(su.project_facts.workflow_role.attestation).toEqual({ state: 'confirmed', value: 'agency, producing for a client' })
    expect(su.project_facts.workflow_role.source_turn).toBe(GUIDED_ENTRY_INIT_TURN)
  })

  test('tool field produces a real ToolMention with canonical resolution, unknown access_surface/plan_tier/account_status, confidence "confirmed"', () => {
    const raw = baseRaw({
      fields: [
        { fieldId: 'workflow_role', value: 'agency, producing for a client' },
        { fieldId: 'tool', value: 'runway-gen3' },
      ],
    })
    const result = validateGuidedEntryRequest(raw)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const su = applyGuidedEntrySelection(result.selection, 'tok-2')
    expect(su.tool_mentions).toHaveLength(1)
    const mention = su.tool_mentions[0]
    expect(mention.resolution).toEqual({ kind: 'canonical', identifier: 'runway-gen3' })
    expect(mention.access_surface).toEqual({ state: 'unknown' })
    expect(mention.plan_tier).toEqual({ state: 'unknown' })
    expect(mention.account_status).toEqual({ state: 'unknown' })
    expect(mention.confidence).toBe('confirmed')
    expect(mention.superseded_by).toBeNull()
  })

  test('jurisdiction field produces a real AssessmentJurisdictionMention, confidence "confirmed"', () => {
    const raw = baseRaw({
      fields: [
        { fieldId: 'workflow_role', value: 'agency, producing for a client' },
        { fieldId: 'jurisdiction', value: 'United States' },
      ],
    })
    const result = validateGuidedEntryRequest(raw)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const su = applyGuidedEntrySelection(result.selection, 'tok-3')
    expect(su.assessment_jurisdiction_mentions).toHaveLength(1)
    expect(su.assessment_jurisdiction_mentions[0].value).toBe('United States')
    expect(su.assessment_jurisdiction_mentions[0].confidence).toBe('confirmed')
  })

  test('creates ZERO UserGoals — a role/scenario selection must never fabricate a UserGoal (Phase 7)', () => {
    const raw = baseRaw({
      fields: [
        { fieldId: 'workflow_role', value: 'agency, producing for a client' },
        { fieldId: 'tool', value: 'runway-gen3' },
        { fieldId: 'jurisdiction', value: 'United States' },
      ],
    })
    const result = validateGuidedEntryRequest(raw)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const su = applyGuidedEntrySelection(result.selection, 'tok-4')
    expect(su.user_goals).toEqual([])
  })

  test('cannot satisfy an evidence-only dependency — no field kind targets anything outside project_facts.workflow_role / tool_mentions / assessment_jurisdiction_mentions', () => {
    // Structural proof, not a guess: GUIDED_FIELD_KINDS is closed to
    // exactly three values, and applyOneGuidedField's switch has exactly
    // three cases, each calling one specific, real mutations.ts export.
    // Nothing here can reach human_contribution_description,
    // content_presence_mentions, or any other evidence-only-capable field.
    const raw = baseRaw({ fields: [{ fieldId: 'workflow_role', value: 'agency, producing for a client' }] })
    const result = validateGuidedEntryRequest(raw)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const su = applyGuidedEntrySelection(result.selection, 'tok-5')
    expect(su.project_facts.human_contribution_description.attestation).toEqual({ state: 'unknown' })
    expect(su.content_presence_mentions).toEqual([])
    expect(su.distribution_territory_mentions).toEqual([])
    expect(su.organization_location_mentions).toEqual([])
    expect(su.asset_provider_mentions).toEqual([])
  })

  test('deterministic mention ids: same token + fieldId always produces the same id', () => {
    const raw = baseRaw({
      fields: [
        { fieldId: 'workflow_role', value: 'agency, producing for a client' },
        { fieldId: 'tool', value: 'runway-gen3' },
      ],
    })
    const result = validateGuidedEntryRequest(raw)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const suA = applyGuidedEntrySelection(result.selection, 'same-token')
    const suB = applyGuidedEntrySelection(result.selection, 'same-token')
    expect(suA.tool_mentions[0].mention_id).toBe(suB.tool_mentions[0].mention_id)
    const suC = applyGuidedEntrySelection(result.selection, 'different-token')
    expect(suC.tool_mentions[0].mention_id).not.toBe(suA.tool_mentions[0].mention_id)
  })
})

describe('provenance — guided-origin facts are distinguishable from conversation text without fabricating prose', () => {
  test('source_statement is a structured, self-describing tag, never conversational prose', () => {
    const stmt = buildGuidedEntrySourceStatement('agency-producing-for-client', 'v1', 'workflow_role', 'agency, producing for a client')
    expect(stmt.startsWith(GUIDED_ENTRY_SOURCE_PREFIX)).toBe(true)
    expect(stmt).toContain('definition=agency-producing-for-client@v1')
    expect(stmt).toContain('field=workflow_role')
    // Never claims to be something the user "said" -- no first-person phrasing, no quotation of invented speech.
    expect(stmt).not.toMatch(/^I |^"I /)
  })

  test('a real conversational source_statement can never collide with the guided prefix by construction (the prefix is not natural English)', () => {
    const conversational = 'We used Runway Gen-3, team plan, for a client campaign.'
    expect(conversational.startsWith(GUIDED_ENTRY_SOURCE_PREFIX)).toBe(false)
  })
})

describe('correction — a guided-origin fact uses the exact same, unmodified correction/supersession semantics as any other', () => {
  test('supersedeToolMention works identically on a guided-origin ToolMention', () => {
    const raw = baseRaw({
      fields: [
        { fieldId: 'workflow_role', value: 'agency, producing for a client' },
        { fieldId: 'tool', value: 'runway-gen3' },
      ],
    })
    const result = validateGuidedEntryRequest(raw)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const su = applyGuidedEntrySelection(result.selection, 'tok-6')
    const original = su.tool_mentions[0]

    const correction: ToolMention = {
      mention_id: 'conv-correction-1',
      resolution: { kind: 'canonical', identifier: 'kling' },
      access_surface: { state: 'unknown' },
      plan_tier: { state: 'unknown' },
      account_status: { state: 'unknown' },
      confidence: 'confirmed',
      source_turn: 2,
      source_statement: 'Actually, sorry, we used Kling, not Runway.',
      superseded_by: null,
    }
    const corrected = supersedeToolMention(su, original.mention_id, correction)
    const priorNow = corrected.tool_mentions.find((m) => m.mention_id === original.mention_id)!
    expect(priorNow.superseded_by).toBe('conv-correction-1')
    expect(corrected.tool_mentions.find((m) => m.mention_id === 'conv-correction-1')?.resolution).toEqual({ kind: 'canonical', identifier: 'kling' })
  })

  test('supersedeAssessmentJurisdictionMention works identically on a guided-origin mention', () => {
    const raw = baseRaw({
      fields: [
        { fieldId: 'workflow_role', value: 'agency, producing for a client' },
        { fieldId: 'jurisdiction', value: 'United States' },
      ],
    })
    const result = validateGuidedEntryRequest(raw)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const su = applyGuidedEntrySelection(result.selection, 'tok-7')
    const original = su.assessment_jurisdiction_mentions[0]

    const correction: AssessmentJurisdictionMention = {
      mention_id: 'conv-correction-2',
      value: 'European Union',
      confidence: 'confirmed',
      source_turn: 2,
      source_statement: 'Actually this is for the EU, not the US.',
      superseded_by: null,
    }
    const corrected = supersedeAssessmentJurisdictionMention(su, original.mention_id, correction)
    expect(corrected.assessment_jurisdiction_mentions.find((m) => m.mention_id === original.mention_id)?.superseded_by).toBe('conv-correction-2')
  })
})
