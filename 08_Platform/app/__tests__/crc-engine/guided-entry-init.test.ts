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
import { addToolMention, supersedeToolMention, supersedeAssessmentJurisdictionMention } from '../../lib/interview-engine/mutations'
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
      baseRaw({ fields: [{ fieldId: 'workflow_role', value: 'agency, producing for a client' }, { fieldId: 'tool', values: ['some-made-up-tool'] }] }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/Unknown option value/)
  })

  test('rejects a multi-select field submitted with "value" instead of "values" (malformed mixed state)', () => {
    const result = validateGuidedEntryRequest(
      baseRaw({ fields: [{ fieldId: 'workflow_role', value: 'agency, producing for a client' }, { fieldId: 'tool', value: 'kling' }] }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/multi-select and must use "values"/)
  })

  test('rejects a single-select field submitted with "values" instead of "value" (malformed mixed state)', () => {
    const result = validateGuidedEntryRequest(
      baseRaw({ fields: [{ fieldId: 'workflow_role', values: ['agency, producing for a client'] }] }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/single-select and must use "value"/)
  })

  test('rejects a duplicate selection within one multi-select field', () => {
    const result = validateGuidedEntryRequest(
      baseRaw({
        fields: [
          { fieldId: 'workflow_role', value: 'agency, producing for a client' },
          { fieldId: 'tool', values: ['kling', 'kling'] },
        ],
      }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/duplicate selection/)
  })

  test('one invalid identity among several valid ones fails the entire multi-select field', () => {
    const result = validateGuidedEntryRequest(
      baseRaw({
        fields: [
          { fieldId: 'workflow_role', value: 'agency, producing for a client' },
          { fieldId: 'tool', values: ['kling', 'some-made-up-tool', 'pika'] },
        ],
      }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/Unknown option value/)
  })

  test('an empty "values" array for an optional multi-select field is accepted and treated as omitted (Skip-equivalent)', () => {
    const result = validateGuidedEntryRequest(
      baseRaw({ fields: [{ fieldId: 'workflow_role', value: 'agency, producing for a client' }, { fieldId: 'tool', values: [] }] }),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.selection.answers.find((a) => a.fieldId === 'tool')).toBeUndefined()
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
        { fieldId: 'tool', values: ['runway-gen3'] },
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

  test('CRC-GE-MULTITOOL-1: N selected canonical tools produce N ordinary ToolMentions, each with distinct deterministic ids and preserved per-value provenance', () => {
    const raw = baseRaw({
      fields: [
        { fieldId: 'workflow_role', value: 'agency, producing for a client' },
        { fieldId: 'tool', values: ['kling', 'elevenlabs', 'suno'] },
      ],
    })
    const result = validateGuidedEntryRequest(raw)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const su = applyGuidedEntrySelection(result.selection, 'tok-multi')
    expect(su.tool_mentions).toHaveLength(3)
    const identifiers = su.tool_mentions.map((m) => (m.resolution.kind === 'canonical' ? m.resolution.identifier : null)).sort()
    expect(identifiers).toEqual(['elevenlabs', 'kling', 'suno'])
    // Distinct ids -- no collision from reusing the same (token, fieldId) id for every value.
    const ids = su.tool_mentions.map((m) => m.mention_id)
    expect(new Set(ids).size).toBe(3)
    for (const mention of su.tool_mentions) {
      expect(mention.access_surface).toEqual({ state: 'unknown' })
      expect(mention.plan_tier).toEqual({ state: 'unknown' })
      expect(mention.account_status).toEqual({ state: 'unknown' })
      expect(mention.confidence).toBe('confirmed')
      expect(mention.superseded_by).toBeNull()
      expect(mention.source_turn).toBe(GUIDED_ENTRY_INIT_TURN)
      expect(mention.source_statement.startsWith(GUIDED_ENTRY_SOURCE_PREFIX)).toBe(true)
      // Each mention's own provenance names its OWN value, never a combined/synthetic one.
      if (mention.resolution.kind === 'canonical') {
        expect(mention.source_statement).toContain(`value="${mention.resolution.identifier}"`)
      }
    }
  })

  test('CRC-GE-MULTITOOL-1: selection order does not alter the resulting set of mention ids (semantic set behavior)', () => {
    const forward = baseRaw({
      fields: [{ fieldId: 'workflow_role', value: 'agency, producing for a client' }, { fieldId: 'tool', values: ['kling', 'pika', 'luma'] }],
    })
    const reversed = baseRaw({
      fields: [{ fieldId: 'workflow_role', value: 'agency, producing for a client' }, { fieldId: 'tool', values: ['luma', 'pika', 'kling'] }],
    })
    const forwardResult = validateGuidedEntryRequest(forward)
    const reversedResult = validateGuidedEntryRequest(reversed)
    expect(forwardResult.ok).toBe(true)
    expect(reversedResult.ok).toBe(true)
    if (!forwardResult.ok || !reversedResult.ok) return
    const suForward = applyGuidedEntrySelection(forwardResult.selection, 'same-multi-token')
    const suReversed = applyGuidedEntrySelection(reversedResult.selection, 'same-multi-token')
    const idsForward = new Set(suForward.tool_mentions.map((m) => m.mention_id))
    const idsReversed = new Set(suReversed.tool_mentions.map((m) => m.mention_id))
    expect(idsForward).toEqual(idsReversed)
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
        { fieldId: 'tool', values: ['runway-gen3'] },
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

  test('deterministic mention ids: same token + fieldId + value always produces the same id', () => {
    const raw = baseRaw({
      fields: [
        { fieldId: 'workflow_role', value: 'agency, producing for a client' },
        { fieldId: 'tool', values: ['runway-gen3'] },
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
        { fieldId: 'tool', values: ['runway-gen3'] },
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

  test('CRC-GE-MULTITOOL-1 (Phase 8): a multi-tool Guided Entry init (Runway + ElevenLabs + Suno) produces three independently addressable active mentions — no special Guided Entry correction logic, the same generic mutations.ts functions used everywhere else', () => {
    const raw = baseRaw({
      fields: [
        { fieldId: 'workflow_role', value: 'agency, producing for a client' },
        { fieldId: 'tool', values: ['runway-gen3', 'elevenlabs', 'suno'] },
      ],
    })
    const result = validateGuidedEntryRequest(raw)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const su = applyGuidedEntrySelection(result.selection, 'tok-multi-correction')
    expect(su.tool_mentions).toHaveLength(3)
    const runway = su.tool_mentions.find((m) => m.resolution.kind === 'canonical' && m.resolution.identifier === 'runway-gen3')!
    const elevenlabs = su.tool_mentions.find((m) => m.resolution.kind === 'canonical' && m.resolution.identifier === 'elevenlabs')!
    const suno = su.tool_mentions.find((m) => m.resolution.kind === 'canonical' && m.resolution.identifier === 'suno')!
    expect(runway).toBeDefined()
    expect(elevenlabs).toBeDefined()
    expect(suno).toBeDefined()

    // "It wasn't Runway, it was Kling" -- correct exactly one mention; the other two are completely untouched.
    const runwayCorrected: ToolMention = { ...runway, mention_id: 'conv-runway-correction', resolution: { kind: 'canonical', identifier: 'kling' }, source_turn: 2, source_statement: "It wasn't Runway, it was Kling.", superseded_by: null }
    let su2 = supersedeToolMention(su, runway.mention_id, runwayCorrected)
    expect(su2.tool_mentions.find((m) => m.mention_id === runway.mention_id)!.superseded_by).toBe('conv-runway-correction')
    expect(su2.tool_mentions.find((m) => m.mention_id === elevenlabs.mention_id)!.superseded_by).toBeNull()
    expect(su2.tool_mentions.find((m) => m.mention_id === suno.mention_id)!.superseded_by).toBeNull()

    // "Actually I didn't use Suno" -- confirmed_absent supersession, existing precedent, no dedicated retract function needed.
    const sunoRetracted: ToolMention = { ...suno, mention_id: 'conv-suno-retraction', confidence: 'confirmed_absent', source_turn: 2, source_statement: "Actually I didn't use Suno.", superseded_by: null }
    const su3 = supersedeToolMention(su2, suno.mention_id, sunoRetracted)
    expect(su3.tool_mentions.find((m) => m.mention_id === suno.mention_id)!.superseded_by).toBe('conv-suno-retraction')
    expect(su3.tool_mentions.find((m) => m.mention_id === 'conv-suno-retraction')!.confidence).toBe('confirmed_absent')
    expect(su3.tool_mentions.find((m) => m.mention_id === elevenlabs.mention_id)!.superseded_by).toBeNull()

    // "I also used Pika" -- plain addToolMention, no interaction with any existing mention.
    const pikaAddition: ToolMention = {
      mention_id: 'conv-pika-addition',
      resolution: { kind: 'canonical', identifier: 'pika' },
      access_surface: { state: 'unknown' },
      plan_tier: { state: 'unknown' },
      account_status: { state: 'unknown' },
      confidence: 'confirmed',
      source_turn: 2,
      source_statement: 'I also used Pika.',
      superseded_by: null,
    }
    const su4 = addToolMention(su3, pikaAddition)
    // 6 rows total: runway(superseded) + elevenlabs + suno(superseded) + kling + suno-retraction + pika.
    expect(su4.tool_mentions).toHaveLength(6)
    // "Active" (non-superseded) is not the same as "affirmatively present" --
    // the suno-retraction mention IS the active head of that chain; it just
    // carries confidence 'confirmed_absent' rather than 'confirmed'. The
    // meaningful query is the AFFIRMATIVELY active set.
    const affirmativelyActive = su4.tool_mentions.filter((m) => m.superseded_by === null && m.confidence === 'confirmed')
    const affirmativeIdentifiers = affirmativelyActive.map((m) => (m.resolution.kind === 'canonical' ? m.resolution.identifier : null)).sort()
    expect(affirmativeIdentifiers).toEqual(['elevenlabs', 'kling', 'pika'])
    // The retraction is still the active (non-superseded) head of the Suno
    // chain -- superseded_by null, confirmed_absent -- distinct from being
    // "gone": it is CRC's current, correct understanding, not a supersede target.
    const activeSunoRow = su4.tool_mentions.find((m) => m.mention_id === 'conv-suno-retraction')!
    expect(activeSunoRow.superseded_by).toBeNull()
    expect(activeSunoRow.confidence).toBe('confirmed_absent')
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
