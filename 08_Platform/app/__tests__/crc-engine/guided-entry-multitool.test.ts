/**
 * CRC-GE-MULTITOOL-1 (2026-09-22) — catalogue, copy, localization, and
 * generic-architecture proof tests. Multi-value validation/mutation/
 * correction-compatibility proofs live in guided-entry-init.test.ts
 * (extended by this same milestone); reducer/UI-state proofs live in
 * guided-entry-flow-state.test.ts (also extended). This file covers the
 * remaining proportional-testing requirements specific to the new,
 * broadened 13-tool catalogue and question copy.
 *
 * Run: npx jest __tests__/crc-engine/guided-entry-multitool.test.ts
 */

import { GUIDED_ENTRY_DEFINITIONS, findGuidedEntryDefinition } from '../../lib/crc-engine/guided-entry-definitions'
import { validateGuidedEntryRequest } from '../../lib/crc-engine/guided-entry-init'
import { getFieldPrompt, getOptionDisplayLabel } from '../../components/crc/crc-ui-copy'
import { isCanonicalToolIdentity } from '../../lib/tool-identity/registry'

const APPROVED_CATALOGUE = [
  'runway-gen3',
  'kling',
  'google-veo',
  'pika',
  'luma',
  'midjourney',
  'gemini-api',
  'gemini-consumer-app',
  'adobe-firefly',
  'stability-ai',
  'synthesia',
  'suno',
  'elevenlabs',
] as const

describe('1. the tool field exposes exactly the 13 approved canonical identities', () => {
  test('every role definition\'s tool field options match the approved catalogue exactly (order-independent set equality)', () => {
    for (const def of GUIDED_ENTRY_DEFINITIONS) {
      const toolField = def.fields.find((f) => f.kind === 'tool')!
      const values = toolField.options.map((o) => o.value).sort()
      expect(values).toEqual([...APPROVED_CATALOGUE].sort())
      expect(toolField.options).toHaveLength(13)
    }
  })

  test('13. every exposed value is independently confirmed canonical (defense-in-depth, not dead code)', () => {
    const toolField = GUIDED_ENTRY_DEFINITIONS[0].fields.find((f) => f.kind === 'tool')!
    for (const option of toolField.options) {
      expect(isCanonicalToolIdentity(option.value)).toBe(true)
    }
  })
})

describe('2. OpenAI Sora is absent', () => {
  test('openai-sora does not appear in the tool field options of any role definition', () => {
    for (const def of GUIDED_ENTRY_DEFINITIONS) {
      const toolField = def.fields.find((f) => f.kind === 'tool')!
      expect(toolField.options.map((o) => o.value)).not.toContain('openai-sora')
    }
  })
})

describe('3. Seedance is absent and not canonical', () => {
  test('seedance does not appear in the tool field options, and is not a canonical identity at all', () => {
    for (const def of GUIDED_ENTRY_DEFINITIONS) {
      const toolField = def.fields.find((f) => f.kind === 'tool')!
      expect(toolField.options.map((o) => o.value)).not.toContain('seedance')
    }
    expect(isCanonicalToolIdentity('seedance')).toBe(false)
  })
})

describe('4/5. exact English and zh-TW question copy', () => {
  test('English tool field prompt is exactly "Which AI tools did you use for this production?"', () => {
    const toolField = GUIDED_ENTRY_DEFINITIONS[0].fields.find((f) => f.kind === 'tool')!
    expect(toolField.prompt).toBe('Which AI tools did you use for this production?')
    expect(getFieldPrompt('en', 'tool', toolField.prompt)).toBe('Which AI tools did you use for this production?')
  })

  test('zh-TW tool field prompt is exactly the PM-approved "您這個製作使用了哪些 AI 工具？"', () => {
    const toolField = GUIDED_ENTRY_DEFINITIONS[0].fields.find((f) => f.kind === 'tool')!
    expect(getFieldPrompt('zh-TW', 'tool', toolField.prompt)).toBe('您這個製作使用了哪些 AI 工具？')
  })
})

describe('6/22. third-party tool labels remain untranslated regardless of locale (product decision, CRC-UI-1, reconfirmed unchanged)', () => {
  test.each(APPROVED_CATALOGUE.map((v) => [v] as const))('%s renders identically under en and zh-TW -- locale never mutates the semantic value, only ever a display label', (value) => {
    const toolField = GUIDED_ENTRY_DEFINITIONS[0].fields.find((f) => f.kind === 'tool')!
    const option = toolField.options.find((o) => o.value === value)!
    const enLabel = getOptionDisplayLabel('en', 'tool', option.value, option.label)
    const zhLabel = getOptionDisplayLabel('zh-TW', 'tool', option.value, option.label)
    expect(enLabel).toBe(option.label)
    expect(zhLabel).toBe(option.label) // no zh-TW lookup table exists for `kind: 'tool'` -- always falls back to the raw label
    expect(zhLabel).toBe(enLabel)
    // The option's own semantic `value` is completely untouched by either call.
    expect(option.value).toBe(value)
  })
})

describe('14. no partial mutation on invalid input (structural guarantee, not just a behavioral coincidence)', () => {
  test('a request with one invalid tool identity among several valid ones returns ok:false with no `selection` at all -- applyGuidedEntrySelection can never be reached for it', () => {
    const result = validateGuidedEntryRequest({
      guidedEntryInitId: '33333333-3333-4333-8333-333333333333',
      definitionId: 'independent-own-work',
      definitionVersion: 'v2',
      concern: 'Can I use this commercially?',
      fields: [
        { fieldId: 'workflow_role', value: 'independent creator, my own work' },
        { fieldId: 'tool', values: ['kling', 'pika', 'not-a-real-tool'] },
      ],
    })
    expect(result.ok).toBe(false)
    // TypeScript's own discriminated ValidateGuidedEntryResult union means
    // `result.selection` does not exist on the `ok: false` branch -- there
    // is no `StructuredUnderstanding` half-built anywhere to inspect,
    // because none was ever constructed. This is the actual mechanism
    // behind "no partial mutation," not merely an untested assumption.
    expect('selection' in result).toBe(false)
  })
})

describe('18. scalar role/jurisdiction behavior is completely unchanged by this milestone', () => {
  test('workflow_role and jurisdiction remain cardinality: "single" on every role definition', () => {
    for (const def of GUIDED_ENTRY_DEFINITIONS) {
      const roleField = def.fields.find((f) => f.kind === 'workflow_role')!
      const jurisdictionField = def.fields.find((f) => f.kind === 'jurisdiction')!
      expect(roleField.cardinality).toBe('single')
      expect(jurisdictionField.cardinality).toBe('single')
    }
  })

  test('a plain scalar jurisdiction/workflow_role request validates exactly as before, using "value" (never "values")', () => {
    const result = validateGuidedEntryRequest({
      guidedEntryInitId: '44444444-4444-4444-8444-444444444444',
      definitionId: 'independent-own-work',
      definitionVersion: 'v2',
      concern: 'Can I use this commercially?',
      fields: [
        { fieldId: 'workflow_role', value: 'independent creator, my own work' },
        { fieldId: 'jurisdiction', value: 'United States' },
      ],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.selection.answers.find((a) => a.fieldId === 'jurisdiction')).toEqual({
      fieldId: 'jurisdiction',
      kind: 'jurisdiction',
      cardinality: 'single',
      value: 'United States',
    })
  })
})

describe('19. old scalar tool request compatibility -- deliberately NOT accepted under the new v2 definition (version bump is the compatibility mechanism)', () => {
  test('the old v1 definition version no longer resolves at all -- a stale client fails closed with the existing "unknown definition" error, not a confusing payload-shape error', () => {
    expect(findGuidedEntryDefinition('independent-own-work', 'v1')).toBeNull()
    const result = validateGuidedEntryRequest({
      guidedEntryInitId: '55555555-5555-4555-8555-555555555555',
      definitionId: 'independent-own-work',
      definitionVersion: 'v1',
      concern: 'Can I use this commercially?',
      fields: [{ fieldId: 'workflow_role', value: 'independent creator, my own work' }],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/Unknown guided entry definition/)
  })
})

describe('21. all three role definitions share the exact same multi-tool field object', () => {
  test('tool field is byte-identical (deep equality) across Agency/Independent/In-house', () => {
    const [first, ...rest] = GUIDED_ENTRY_DEFINITIONS
    const firstTool = first.fields.find((f) => f.kind === 'tool')
    for (const def of rest) {
      expect(def.fields.find((f) => f.kind === 'tool')).toEqual(firstTool)
    }
  })
})
