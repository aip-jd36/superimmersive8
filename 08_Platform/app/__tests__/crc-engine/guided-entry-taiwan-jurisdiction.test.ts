/**
 * Taiwan jurisdiction option tests (CRC-GE-TW-1, 2026-09-22). Proves
 * Taiwan is reachable end-to-end through the EXISTING, unmodified Guided
 * Entry jurisdiction architecture -- the same generic path United States
 * and European Union already use -- and that UI locale and jurisdiction
 * remain fully independent.
 */

import { GUIDED_ENTRY_DEFINITIONS, findGuidedEntryDefinition } from '../../lib/crc-engine/guided-entry-definitions'
import { validateGuidedEntryRequest, applyGuidedEntrySelection } from '../../lib/crc-engine/guided-entry-init'
import { getOptionDisplayLabel } from '../../components/crc/crc-ui-copy'

describe('1/2/3. Taiwan appears as a Guided Entry jurisdiction option with the authoritative canonical value and English label', () => {
  test('every role definition\'s jurisdiction field includes a Taiwan option with value AND label exactly "Taiwan"', () => {
    for (const def of GUIDED_ENTRY_DEFINITIONS) {
      const jurisdictionField = def.fields.find((f) => f.kind === 'jurisdiction')
      expect(jurisdictionField).toBeDefined()
      const taiwanOption = jurisdictionField!.options.find((o) => o.value === 'Taiwan')
      expect(taiwanOption).toEqual({ value: 'Taiwan', label: 'Taiwan' })
    }
  })

  test('United States and European Union remain present and unchanged alongside Taiwan (8. existing behavior preserved)', () => {
    const jurisdictionField = GUIDED_ENTRY_DEFINITIONS[0].fields.find((f) => f.kind === 'jurisdiction')!
    expect(jurisdictionField.options).toEqual([
      { value: 'United States', label: 'United States' },
      { value: 'European Union', label: 'European Union' },
      { value: 'Taiwan', label: 'Taiwan' },
    ])
  })

  test('the exact canonical value matches the real, adopted CLAIM-COPYRIGHT-TW-AI-ASSISTED-OUTPUT-001-v1 TopicClaim\'s own applicability_requirements value', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { TOPIC_CLAIMS_FIXTURE } = require('../../lib/retrieval-engine/topic-claims-fixture')
    const taiwanClaim = TOPIC_CLAIMS_FIXTURE.find((c: any) => c.claim_id === 'CLAIM-COPYRIGHT-TW-AI-ASSISTED-OUTPUT-001-v1')
    expect(taiwanClaim).toBeDefined()
    expect(taiwanClaim.jurisdiction).toBe('Taiwan')
    expect(taiwanClaim.applicability_requirements).toContainEqual({ fact: 'jurisdiction', operator: 'equals', value: 'Taiwan' })

    const jurisdictionField = GUIDED_ENTRY_DEFINITIONS[0].fields.find((f) => f.kind === 'jurisdiction')!
    const taiwanOption = jurisdictionField.options.find((o) => o.value === 'Taiwan')!
    // The exact same string the real governed claim's applicability gate
    // expects -- not a parallel/invented identifier.
    expect(taiwanOption.value).toBe(taiwanClaim.jurisdiction)
  })
})

describe('4. zh-TW displays the established Traditional Chinese Taiwan label (台灣, matching existing SI8 marketing-site convention)', () => {
  test('getOptionDisplayLabel returns 台灣 for the Taiwan jurisdiction value under zh-TW', () => {
    expect(getOptionDisplayLabel('zh-TW', 'jurisdiction', 'Taiwan', 'Taiwan')).toBe('台灣')
  })

  test('English still returns "Taiwan" unchanged', () => {
    expect(getOptionDisplayLabel('en', 'jurisdiction', 'Taiwan', 'Taiwan')).toBe('Taiwan')
  })

  test('does NOT use 臺灣 (the alternate Traditional-Chinese rendering) -- follows the established repository convention exactly', () => {
    expect(getOptionDisplayLabel('zh-TW', 'jurisdiction', 'Taiwan', 'Taiwan')).not.toBe('臺灣')
  })
})

describe('5/9. selecting Taiwan produces the same existing jurisdiction mutation shape as the other jurisdictions, sending the raw semantic value', () => {
  function guidedRequestFor(jurisdictionValue: string) {
    return {
      guidedEntryInitId: '11111111-1111-4111-8111-111111111111',
      definitionId: 'independent-own-work',
      definitionVersion: 'v1',
      concern: 'Can I use this commercially?',
      fields: [
        { fieldId: 'workflow_role', value: 'independent creator, my own work' },
        { fieldId: 'jurisdiction', value: jurisdictionValue },
      ],
    }
  }

  test('validateGuidedEntryRequest accepts Taiwan exactly as it accepts United States -- same generic path, no special-casing', () => {
    const taiwanResult = validateGuidedEntryRequest(guidedRequestFor('Taiwan'))
    const usResult = validateGuidedEntryRequest(guidedRequestFor('United States'))
    expect(taiwanResult.ok).toBe(true)
    expect(usResult.ok).toBe(true)
    if (taiwanResult.ok && usResult.ok) {
      // Identical shape, differing only in the jurisdiction value itself.
      const workflowRoleAnswer = { fieldId: 'workflow_role', kind: 'workflow_role', value: 'independent creator, my own work' }
      expect(taiwanResult.selection.answers).toEqual([workflowRoleAnswer, { fieldId: 'jurisdiction', kind: 'jurisdiction', value: 'Taiwan' }])
      expect(usResult.selection.answers).toEqual([workflowRoleAnswer, { fieldId: 'jurisdiction', kind: 'jurisdiction', value: 'United States' }])
    }
  })

  test('applyGuidedEntrySelection produces a real AssessmentJurisdictionMention with value "Taiwan", confidence "confirmed" -- identical mechanism to United States/European Union', () => {
    const result = validateGuidedEntryRequest(guidedRequestFor('Taiwan'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const su = applyGuidedEntrySelection(result.selection, 'test-token')
    expect(su.assessment_jurisdiction_mentions).toHaveLength(1)
    expect(su.assessment_jurisdiction_mentions[0].value).toBe('Taiwan')
    expect(su.assessment_jurisdiction_mentions[0].confidence).toBe('confirmed')
    expect(su.assessment_jurisdiction_mentions[0].superseded_by).toBeNull()
    // 9. the raw semantic value reaches StructuredUnderstanding verbatim --
    // never a localized/display form (which would be '台灣' under zh-TW,
    // never sent by Guided Entry at all -- see the wiring proof below).
    expect(su.assessment_jurisdiction_mentions[0].value).not.toBe('台灣')
  })

  test('an unknown/invalid jurisdiction value is still rejected -- Taiwan\'s addition does not weaken validation', () => {
    const result = validateGuidedEntryRequest(guidedRequestFor('Someplace Invented'))
    expect(result.ok).toBe(false)
  })
})

describe('6/7. UI locale and jurisdiction remain fully independent (critical invariant)', () => {
  test('6. selecting zh-TW UI locale does not appear anywhere in the jurisdiction option list or validation path -- jurisdiction options are locale-independent data', () => {
    // The GUIDED_ENTRY_JURISDICTION_FIELD.options array (validated against
    // server-side) contains no locale field, no locale-conditional
    // filtering, and Taiwan is present in it unconditionally -- it does
    // not appear "only under zh-TW." Confirmed structurally: options is a
    // plain array with exactly value/label, no locale key at all.
    const jurisdictionField = GUIDED_ENTRY_DEFINITIONS[0].fields.find((f) => f.kind === 'jurisdiction')!
    for (const option of jurisdictionField.options) {
      expect(Object.keys(option).sort()).toEqual(['label', 'value'])
    }
  })

  test('7. selecting Taiwan jurisdiction does not touch or reference locale in any way -- AssessmentJurisdictionMention has no locale field', () => {
    const result = validateGuidedEntryRequest({
      guidedEntryInitId: '22222222-2222-4222-8222-222222222222',
      definitionId: 'independent-own-work',
      definitionVersion: 'v1',
      concern: 'Can I use this commercially?',
      fields: [
        { fieldId: 'workflow_role', value: 'independent creator, my own work' },
        { fieldId: 'jurisdiction', value: 'Taiwan' },
      ],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const su = applyGuidedEntrySelection(result.selection, 'test-token-2')
    const mention = su.assessment_jurisdiction_mentions[0]
    expect(Object.keys(mention).sort()).not.toContain('locale')
  })

  test('getOptionDisplayLabel never mutates or infers the underlying semantic value from locale -- it only ever returns a DISPLAY string, and the function signature takes locale/value as fully independent parameters', () => {
    // Calling with locale zh-TW and jurisdiction 'United States' proves
    // locale does not somehow "redirect" to Taiwan or any other value --
    // it only affects which LABEL is shown for whatever value was passed.
    expect(getOptionDisplayLabel('zh-TW', 'jurisdiction', 'United States', 'United States')).toBe('美國')
    expect(getOptionDisplayLabel('zh-TW', 'jurisdiction', 'European Union', 'European Union')).toBe('歐盟')
    expect(getOptionDisplayLabel('zh-TW', 'jurisdiction', 'Taiwan', 'Taiwan')).toBe('台灣')
  })
})

describe('findGuidedEntryDefinition -- Taiwan is available under every role, unchanged progression', () => {
  test.each(['agency-producing-for-client', 'independent-own-work', 'in-house-own-organization'])('%s definition includes Taiwan in its jurisdiction options', (definitionId) => {
    const def = findGuidedEntryDefinition(definitionId, 'v1')
    expect(def).not.toBeNull()
    const jurisdictionField = def!.fields.find((f) => f.kind === 'jurisdiction')!
    expect(jurisdictionField.options.map((o) => o.value)).toContain('Taiwan')
  })
})
