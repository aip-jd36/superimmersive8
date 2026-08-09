/**
 * Knowledge Item projection deterministic evaluation suite
 * (PROJECTION_LAYER_ARCHITECTURE.md §9, Prototype Beta, Slice 1B). Every
 * case here is deterministic -- no live model, no LLM evaluation needed,
 * matching the architecture doc's own stated expectation for this path.
 */

import * as fs from 'fs'
import * as path from 'path'
import { projectKnowledgeItems } from '@/lib/projection-layer/project-knowledge-items'
import type { RetrievalResult } from '@/lib/retrieval-engine/types'

function retrievalResult(overrides: Partial<RetrievalResult> = {}): RetrievalResult {
  return {
    source_fact: { kind: 'tool', identifier: 'runway-gen3' },
    claim_id: 'runway-gen3',
    matrix_identifier: 'runway-gen3',
    publication_scope: 'CRC may state only that Runway permits commercial use across tiers.',
    candidate_statement: "Runway's current Terms allow commercial use across all subscription tiers.",
    last_verified: '2026-07-01',
    ...overrides,
  }
}

describe('projectKnowledgeItems', () => {
  test('1: one valid result -> one Knowledge Item', () => {
    const out = projectKnowledgeItems([retrievalResult()])
    expect(out.knowledge_items).toHaveLength(1)
    expect(out.diagnostics).toEqual([])
  })

  test('2: multiple results -> multiple separate items, never merged', () => {
    const out = projectKnowledgeItems([
      retrievalResult({ claim_id: 'runway-gen3', matrix_identifier: 'runway-gen3', candidate_statement: 'Runway statement.' }),
      retrievalResult({ claim_id: 'kling', matrix_identifier: 'kling', candidate_statement: 'Kling statement.' }),
    ])
    expect(out.knowledge_items).toHaveLength(2)
    expect(out.knowledge_items.map((i) => i.statement)).toEqual(['Runway statement.', 'Kling statement.'])
  })

  test('3: candidate_statement is preserved byte-for-byte, never reworded', () => {
    const statement = "Runway's current Terms allow commercial use across all subscription tiers, provided you comply with the Terms of Service. The Free plan mainly differs by watermarking rather than commercial-use permissions."
    const out = projectKnowledgeItems([retrievalResult({ candidate_statement: statement })])
    expect(out.knowledge_items[0].statement).toBe(statement)
  })

  test('4: publication_scope never becomes output text, and is not a field on the rendered item', () => {
    const scope = 'CRC may state only that Runway permits commercial use -- this publication scope does not extend to ownership analysis.'
    const out = projectKnowledgeItems([retrievalResult({ publication_scope: scope, candidate_statement: 'A distinct, unrelated candidate statement.' })])
    expect(JSON.stringify(out)).not.toContain('does not extend to ownership analysis')
    expect(Object.keys(out.knowledge_items[0]).sort()).toEqual(['claim_id', 'last_verified', 'statement'])
  })

  test('5: null candidate_statement -> diagnostic, no item, never fabricated or falls back to publication_scope', () => {
    const out = projectKnowledgeItems([retrievalResult({ candidate_statement: null, claim_id: 'kling' })])
    expect(out.knowledge_items).toEqual([])
    expect(out.diagnostics).toEqual([{ claim_id: 'kling', reason: 'missing_candidate_statement' }])
  })

  test('6: empty RetrievalResult[] -> empty items and diagnostics, never an error', () => {
    const out = projectKnowledgeItems([])
    expect(out.knowledge_items).toEqual([])
    expect(out.diagnostics).toEqual([])
  })

  test('7: claim_id is preserved for traceability on both items and diagnostics', () => {
    const rendered = projectKnowledgeItems([retrievalResult({ claim_id: 'elevenlabs-commercial-tiering' })])
    expect(rendered.knowledge_items[0].claim_id).toBe('elevenlabs-commercial-tiering')

    const skipped = projectKnowledgeItems([retrievalResult({ claim_id: 'elevenlabs-voice-consent', candidate_statement: null })])
    expect(skipped.diagnostics[0].claim_id).toBe('elevenlabs-voice-consent')
  })

  test('8: last_verified is preserved correctly, including a null value', () => {
    const withDate = projectKnowledgeItems([retrievalResult({ last_verified: '2026-06-15' })])
    expect(withDate.knowledge_items[0].last_verified).toBe('2026-06-15')

    const withoutDate = projectKnowledgeItems([retrievalResult({ last_verified: null })])
    expect(withoutDate.knowledge_items[0].last_verified).toBeNull()
  })

  test('9: module has no import of Matrix, Living Notebook, Retrieval-logic, or LLM/adapter code -- structural, not just discipline', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'projection-layer', 'project-knowledge-items.ts'), 'utf-8')
    const importLines = source.match(/^import .+$/gm) ?? []
    expect(importLines.length).toBeGreaterThan(0) // sanity: the file does import something (its own types)

    // Scoped to actual import statements, not doc comments -- this module's own
    // header comment legitimately *names* lib/retrieval-engine/retrieve.ts while
    // explaining why it is NOT imported, which must not itself trip this check.
    const importText = importLines.join('\n')
    const forbiddenPatterns = [
      /matrix-fixture/i,
      /platform-rights-matrix/i,
      /living-notebook/i,
      /lib\/retrieval-engine\/(retrieve|lookup-rows|enumerate-eligible-claims|extract-matchable-facts|assemble-result)/i,
      /anthropic/i,
      /openai/i,
      /\bllm\b/i,
    ]
    for (const pattern of forbiddenPatterns) {
      expect(importText).not.toMatch(pattern)
    }

    // Only permitted imports: RetrievalResult's own type module, and Projection's own sibling types module.
    for (const line of importLines) {
      expect(line).toMatch(/@\/lib\/retrieval-engine\/types|\.\/types/)
    }
  })

  test('10: duplicate claim_id across two results (different matrix_identifier) -- both rendered independently, never merged or deduped', () => {
    const out = projectKnowledgeItems([
      retrievalResult({ claim_id: 'shared-id', matrix_identifier: 'tool-a', candidate_statement: 'Tool A statement.' }),
      retrievalResult({ claim_id: 'shared-id', matrix_identifier: 'tool-b', candidate_statement: 'Tool B statement.' }),
    ])
    expect(out.knowledge_items).toHaveLength(2)
    expect(out.knowledge_items.map((i) => i.statement)).toEqual(['Tool A statement.', 'Tool B statement.'])
    expect(out.knowledge_items.every((i) => i.claim_id === 'shared-id')).toBe(true)
  })

  test('10b: fully identical duplicate results (same claim_id, same matrix_identifier, same statement) -- still not deduped, preserved 1:1 with input', () => {
    const one = retrievalResult({ claim_id: 'runway-gen3', matrix_identifier: 'runway-gen3', candidate_statement: 'Identical statement.' })
    const out = projectKnowledgeItems([one, { ...one }])
    expect(out.knowledge_items).toHaveLength(2)
    expect(out.knowledge_items[0]).toEqual(out.knowledge_items[1])
  })
})
