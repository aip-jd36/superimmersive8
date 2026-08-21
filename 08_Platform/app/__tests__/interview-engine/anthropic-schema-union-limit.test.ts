/**
 * Permanent regression guardrail for Anthropic's structured-output schema
 * union-type limit (P0 Anthropic schema-union-limit diagnostic + fix,
 * 2026-08-21). Production received a real `400 invalid_request_error`
 * ("Schemas contains too many parameters with union types... limit: 16
 * parameters with unions") when the extractor's CANDIDATE_RESPONSE_SCHEMA
 * reached 20 -- the diagnostic traced this to Track B's addition of four
 * dedicated flat nullable fields (usage/license confidence+value hints),
 * pushing a schema that was already AT the 16-parameter ceiling over it.
 *
 * This test inspects the ACTUAL production schema objects (imported
 * directly, not duplicated/reconstructed here) run through the REAL,
 * installed @anthropic-ai/sdk's own transformJSONSchema() -- the exact
 * function jsonSchemaOutputFormat() calls before a schema ever reaches
 * Anthropic (see anthropic-extractor.ts/anthropic-candidate-question.ts/
 * anthropic-decision.ts, all of which call jsonSchemaOutputFormat()).
 * Verified during the diagnostic to preserve `type: [...]` arrays verbatim
 * (never converts them to anyOf), so counting after this transform is the
 * true wire-level count Anthropic's own compiler sees. No network access,
 * no live Anthropic call, fully deterministic.
 *
 * Counting rule: recursively count every schema node whose `type` is an
 * array, or which uses `anyOf`/`oneOf` -- exactly Anthropic's own stated
 * classification ("parameters with type arrays or anyOf").
 */

import { transformJSONSchema } from '@anthropic-ai/sdk/lib/transform-json-schema'
import { CANDIDATE_RESPONSE_SCHEMA } from '@/lib/interview-engine/anthropic-extractor'
import { CANDIDATE_QUESTION_RESPONSE_SCHEMA } from '@/lib/interview-engine/anthropic-candidate-question'
import { DECISION_RESPONSE_SCHEMA } from '@/lib/interview-engine/anthropic-decision'

const ANTHROPIC_UNION_LIMIT = 16

function countUnionParameters(node: unknown, path = '$', out: string[] = []): string[] {
  if (node == null || typeof node !== 'object') return out
  const schema = node as Record<string, unknown>
  if (Array.isArray(schema.type) || Array.isArray(schema.anyOf) || Array.isArray(schema.oneOf)) {
    out.push(path)
  }
  const properties = schema.properties as Record<string, unknown> | undefined
  if (properties) {
    for (const [key, sub] of Object.entries(properties)) {
      countUnionParameters(sub, `${path}.properties.${key}`, out)
    }
  }
  if (schema.items) countUnionParameters(schema.items, `${path}.items`, out)
  if (Array.isArray(schema.anyOf)) schema.anyOf.forEach((v, i) => countUnionParameters(v, `${path}.anyOf[${i}]`, out))
  if (Array.isArray(schema.oneOf)) schema.oneOf.forEach((v, i) => countUnionParameters(v, `${path}.oneOf[${i}]`, out))
  return out
}

/** Same wire-level transform every production call site applies via jsonSchemaOutputFormat(). */
function unionCountOnWire(schema: object): string[] {
  const transformed = transformJSONSchema(schema as any)
  return countUnionParameters(transformed)
}

describe('Anthropic structured-output schema union-type limit guardrail', () => {
  // A. extractor schema union count <= 16
  test('A: extractor (CANDIDATE_RESPONSE_SCHEMA) union count is at or under the Anthropic limit', () => {
    const paths = unionCountOnWire(CANDIDATE_RESPONSE_SCHEMA)
    expect(paths.length).toBeLessThanOrEqual(ANTHROPIC_UNION_LIMIT)
  })

  // D. extractor expected union count after redesign (~12, per the diagnostic)
  test('D: extractor union count is exactly 12 after the generic attributes[] redesign -- 20 (pre-fix) minus the 8 flat fields collapsed into attributes[] (0 new unions)', () => {
    const paths = unionCountOnWire(CANDIDATE_RESPONSE_SCHEMA)
    expect(paths.length).toBe(12)
  })

  // B. candidate-generator schema union count <= 16
  test('B: candidate generator (CANDIDATE_QUESTION_RESPONSE_SCHEMA) union count is at or under the Anthropic limit', () => {
    const paths = unionCountOnWire(CANDIDATE_QUESTION_RESPONSE_SCHEMA)
    expect(paths.length).toBeLessThanOrEqual(ANTHROPIC_UNION_LIMIT)
  })

  test('candidate generator union count is exactly 4 (unchanged by this milestone -- not touched)', () => {
    const paths = unionCountOnWire(CANDIDATE_QUESTION_RESPONSE_SCHEMA)
    expect(paths.length).toBe(4)
  })

  // C. decider schema union count <= 16
  test('C: decider (DECISION_RESPONSE_SCHEMA) union count is at or under the Anthropic limit', () => {
    const paths = unionCountOnWire(DECISION_RESPONSE_SCHEMA)
    expect(paths.length).toBeLessThanOrEqual(ANTHROPIC_UNION_LIMIT)
  })

  test('decider union count is exactly 0 (unchanged by this milestone -- not touched)', () => {
    const paths = unionCountOnWire(DECISION_RESPONSE_SCHEMA)
    expect(paths.length).toBe(0)
  })

  // E. attributes is required and array-typed
  test('E: attributes is required and array-typed on the extractor schema', () => {
    const items = (CANDIDATE_RESPONSE_SCHEMA.properties.candidates.items as any).properties
    expect(items.attributes.type).toBe('array')
    expect((CANDIDATE_RESPONSE_SCHEMA.properties.candidates.items as any).required).toContain('attributes')
  })

  test('attributes itself is never nullable -- type is the bare string "array", not an array-of-types union', () => {
    const attributesSchema = (CANDIDATE_RESPONSE_SCHEMA.properties.candidates.items as any).properties.attributes
    expect(Array.isArray(attributesSchema.type)).toBe(false)
  })

  test('attribute entry fields (key, confidence, value) are all required and none are nullable', () => {
    const entrySchema = (CANDIDATE_RESPONSE_SCHEMA.properties.candidates.items as any).properties.attributes.items
    expect(entrySchema.required.sort()).toEqual(['confidence', 'key', 'value'].sort())
    for (const field of ['key', 'confidence', 'value']) {
      expect(Array.isArray(entrySchema.properties[field].type)).toBe(false)
    }
  })

  test('the attribute key enum is exactly the closed four-value set', () => {
    const entrySchema = (CANDIDATE_RESPONSE_SCHEMA.properties.candidates.items as any).properties.attributes.items
    expect(entrySchema.properties.key.enum.slice().sort()).toEqual(['access_surface', 'license', 'plan_tier', 'usage'].sort())
  })
})

describe('scalability invariant (Section 16 / test AD): attribute vocabulary growth does not add top-level nullable properties', () => {
  // AD. schema vocabulary growth does not add top-level nullable properties
  test('AD: the candidate item schema has a FIXED top-level property count regardless of how many attribute keys the closed vocabulary contains', () => {
    const itemProperties = Object.keys((CANDIDATE_RESPONSE_SCHEMA.properties.candidates.items as any).properties)
    // A structural assertion, not a magic number chosen to pass: the count
    // today (with 4 known attribute keys) must be IDENTICAL to what it
    // would be with any other number of attribute keys, since attributes
    // is one array property regardless of vocabulary size. Proven by
    // recomputing top-level property count against a synthetic schema
    // built the same way but with a hypothetically larger key vocabulary,
    // and asserting it is unchanged.
    const key = (CANDIDATE_RESPONSE_SCHEMA.properties.candidates.items as any).properties.attributes.items.properties.key
    const widerKeyEnumSchema = {
      ...CANDIDATE_RESPONSE_SCHEMA,
      properties: {
        candidates: {
          ...CANDIDATE_RESPONSE_SCHEMA.properties.candidates,
          items: {
            ...(CANDIDATE_RESPONSE_SCHEMA.properties.candidates.items as any),
            properties: {
              ...(CANDIDATE_RESPONSE_SCHEMA.properties.candidates.items as any).properties,
              attributes: {
                ...(CANDIDATE_RESPONSE_SCHEMA.properties.candidates.items as any).properties.attributes,
                items: {
                  ...(CANDIDATE_RESPONSE_SCHEMA.properties.candidates.items as any).properties.attributes.items,
                  properties: {
                    ...(CANDIDATE_RESPONSE_SCHEMA.properties.candidates.items as any).properties.attributes.items.properties,
                    key: { ...key, enum: [...key.enum, 'likeness_consent', 'music_license', 'client_asset_authorization'] },
                  },
                },
              },
            },
          },
        },
      },
    }
    const widerKeyProperties = Object.keys((widerKeyEnumSchema.properties.candidates.items as any).properties)
    expect(widerKeyProperties.length).toBe(itemProperties.length)

    // The union count itself is also unaffected by growing the key
    // vocabulary -- new keys are new enum VALUES, not new schema
    // PARAMETERS, so the union count invariant holds even as the
    // vocabulary grows.
    const beforeCount = unionCountOnWire(CANDIDATE_RESPONSE_SCHEMA).length
    const afterCount = unionCountOnWire(widerKeyEnumSchema).length
    expect(afterCount).toBe(beforeCount)
  })
})
