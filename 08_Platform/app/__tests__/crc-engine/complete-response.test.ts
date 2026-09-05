/**
 * Shared complete-response gating helper tests (CRC Results Gate
 * milestone, 2026-08-14). Covers PM test cases R/S -- the core invariant
 * that a non-grandfathered response never carries Projection content, and
 * that grandfathered sessions are unaffected.
 */

import { buildCompleteResponseFields } from '../../lib/crc-engine/complete-response'
import { CRC_CONFIG } from '../../lib/crc-engine/config'
import type { ProjectionOutput } from '../../lib/projection-layer/types'
import type { ConsultativeNote } from '../../lib/crc-engine/unresolved-applicability-realization'

const SAMPLE_OUTPUT: ProjectionOutput = {
  opening_line: 'Real opening line.',
  understood_summary: 'Real summary text that must never leak.',
  knowledge_items: [
    { claim_id: 'c1', matrix_identifier: 'm1', statement: 'Real finding one.', last_verified: null },
    { claim_id: 'c2', matrix_identifier: 'm2', statement: 'Real finding two.', last_verified: null },
  ],
  goal_interpretations: [],
  closing_cta: '',
}

/** M2B: a realized note, distinct enough (a real sentence, not an empty placeholder) to prove leak-detection assertions below are meaningful. */
const SAMPLE_NOTES: ConsultativeNote[] = [{ goal_index: 0, text: "Specifically, this depends on your test fact, which hasn't been confirmed in this conversation." }]

const BEFORE_LAUNCH = new Date(new Date(CRC_CONFIG.resultsGateLaunchedAt).getTime() - 1000).toISOString()
const AFTER_LAUNCH = new Date(new Date(CRC_CONFIG.resultsGateLaunchedAt).getTime() + 1000).toISOString()

describe('buildCompleteResponseFields', () => {
  test('grandfathered (created before launch marker) -> full projection present, teaser/results_email absent', () => {
    const fields = buildCompleteResponseFields({
      sessionCreatedAt: BEFORE_LAUNCH,
      output: SAMPLE_OUTPUT,
      consultativeNotes: SAMPLE_NOTES,
      attributionToken: 'attr-1',
      email: 'jd@example.com',
      resultsEmailStatus: null,
      resultsEmailLastRecipient: null,
    })
    expect(fields.grandfathered).toBe(true)
    expect(fields.projection).toEqual(SAMPLE_OUTPUT)
    expect(fields.teaser).toBeUndefined()
    expect(fields.results_email).toBeUndefined()
    expect(fields.email).toBe('jd@example.com')
  })

  // M2B: grandfathered sessions receive the realized notes exactly as
  // computed, same gating discipline as `projection` itself.
  test('grandfathered -> consultative_notes present, equal to what was computed', () => {
    const fields = buildCompleteResponseFields({
      sessionCreatedAt: BEFORE_LAUNCH,
      output: SAMPLE_OUTPUT,
      consultativeNotes: SAMPLE_NOTES,
      attributionToken: 'attr-1',
      email: 'jd@example.com',
      resultsEmailStatus: null,
      resultsEmailLastRecipient: null,
    })
    expect(fields.consultative_notes).toEqual(SAMPLE_NOTES)
  })

  // PM case R: full Projection absent from every new-gated response.
  test('non-grandfathered -> projection is absent entirely (not null, not present at all)', () => {
    const fields = buildCompleteResponseFields({
      sessionCreatedAt: AFTER_LAUNCH,
      output: SAMPLE_OUTPUT,
      consultativeNotes: SAMPLE_NOTES,
      attributionToken: 'attr-1',
      email: 'jd@example.com',
      resultsEmailStatus: null,
      resultsEmailLastRecipient: null,
    })
    expect(fields.grandfathered).toBe(false)
    expect('projection' in fields).toBe(false)
  })

  // M2B: mirrors PM case R exactly, for the new Composition-owned field --
  // a non-grandfathered response must never carry realized detail either,
  // even when notes were actually computed for this turn.
  test('non-grandfathered -> consultative_notes is absent entirely, even when notes were computed', () => {
    const fields = buildCompleteResponseFields({
      sessionCreatedAt: AFTER_LAUNCH,
      output: SAMPLE_OUTPUT,
      consultativeNotes: SAMPLE_NOTES,
      attributionToken: 'attr-1',
      email: 'jd@example.com',
      resultsEmailStatus: null,
      resultsEmailLastRecipient: null,
    })
    expect('consultative_notes' in fields).toBe(false)
    expect(JSON.stringify(fields)).not.toContain('depends on your')
  })

  test('non-grandfathered -> teaser count is knowledge_items.length, never the items themselves', () => {
    const fields = buildCompleteResponseFields({
      sessionCreatedAt: AFTER_LAUNCH,
      output: SAMPLE_OUTPUT,
      consultativeNotes: SAMPLE_NOTES,
      attributionToken: undefined,
      email: null,
      resultsEmailStatus: null,
      resultsEmailLastRecipient: null,
    })
    expect(fields.teaser).toEqual({ consideration_count: 2 })
    expect(JSON.stringify(fields)).not.toContain('Real finding')
    expect(JSON.stringify(fields)).not.toContain('Real summary')
  })

  test('non-grandfathered -> raw email is never included, even when one was supplied', () => {
    const fields = buildCompleteResponseFields({
      sessionCreatedAt: AFTER_LAUNCH,
      output: SAMPLE_OUTPUT,
      consultativeNotes: SAMPLE_NOTES,
      attributionToken: undefined,
      email: 'jd@example.com',
      resultsEmailStatus: 'accepted',
      resultsEmailLastRecipient: 'jd@example.com',
    })
    expect('email' in fields).toBe(false)
    expect(JSON.stringify(fields)).not.toContain('jd@example.com')
  })

  test('non-grandfathered -> results_email defaults to not_sent when nothing has been attempted', () => {
    const fields = buildCompleteResponseFields({
      sessionCreatedAt: AFTER_LAUNCH,
      output: SAMPLE_OUTPUT,
      consultativeNotes: SAMPLE_NOTES,
      attributionToken: undefined,
      email: null,
      resultsEmailStatus: null,
      resultsEmailLastRecipient: null,
    })
    expect(fields.results_email).toEqual({ status: 'not_sent' })
  })

  test('non-grandfathered -> results_email reflects a masked recipient once one is targeted', () => {
    const fields = buildCompleteResponseFields({
      sessionCreatedAt: AFTER_LAUNCH,
      output: SAMPLE_OUTPUT,
      consultativeNotes: SAMPLE_NOTES,
      attributionToken: undefined,
      email: null,
      resultsEmailStatus: 'accepted',
      resultsEmailLastRecipient: 'jd@pmfstrategy.com',
    })
    expect(fields.results_email).toEqual({ status: 'accepted', masked_email: 'j•••@pmfstrategy.com' })
  })

  test('exactly at the launch marker is treated as non-grandfathered (>=, not >)', () => {
    const fields = buildCompleteResponseFields({
      sessionCreatedAt: CRC_CONFIG.resultsGateLaunchedAt,
      output: SAMPLE_OUTPUT,
      consultativeNotes: SAMPLE_NOTES,
      attributionToken: undefined,
      email: null,
      resultsEmailStatus: null,
      resultsEmailLastRecipient: null,
    })
    expect(fields.grandfathered).toBe(false)
  })
})
