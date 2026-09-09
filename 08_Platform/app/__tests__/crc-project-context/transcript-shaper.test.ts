/**
 * CAH-4C §3 / §12 — the neutral CRC transcript shaper.
 *
 * `shapeCrcTranscript` is the verbatim shaping loop extracted from
 * `lib/crc-sales/repository.ts`'s `getEligibleSessionTranscript`. Proves:
 *   - only { role, text, timestamp } is returned, nothing else from the row;
 *   - sequence is preserved verbatim;
 *   - corrections/contradictions in the transcript are NOT resolved;
 *   - non-user/assistant entries are dropped;
 *   - no entry is classified as evidence / attestation / verified / finding;
 *   - non-array input -> [], never throws.
 */

import { shapeCrcTranscript } from '@/lib/crc-project-context/transcript'

test('returns only role/text/timestamp, in order, verbatim', () => {
  const raw = [
    { role: 'user', text: 'Can I use Kling commercially?', timestamp: '2026-09-01T00:00:00Z', extra: 'IGNORED', id: 'x' },
    { role: 'assistant', text: 'It depends on your plan.', timestamp: null },
    { role: 'user', text: 'Actually I used Runway, not Kling.', timestamp: '2026-09-01T00:01:00Z' },
  ]
  const out = shapeCrcTranscript(raw)
  expect(out).toEqual([
    { role: 'user', text: 'Can I use Kling commercially?', timestamp: '2026-09-01T00:00:00Z' },
    { role: 'assistant', text: 'It depends on your plan.', timestamp: null },
    { role: 'user', text: 'Actually I used Runway, not Kling.', timestamp: '2026-09-01T00:01:00Z' },
  ])
  // no leaked fields
  expect(JSON.stringify(out)).not.toMatch(/IGNORED|"id"|"extra"/)
})

test('a correction in the transcript is preserved verbatim in sequence — never merged or resolved', () => {
  const raw = [
    { role: 'user', text: 'No real person appears.' },
    { role: 'assistant', text: 'Understood.' },
    { role: 'user', text: 'Wait, my own face does appear.' },
  ]
  const out = shapeCrcTranscript(raw)
  expect(out.map((e) => e.text)).toEqual([
    'No real person appears.',
    'Understood.',
    'Wait, my own face does appear.',
  ])
  expect(JSON.stringify(out)).not.toMatch(/resolved|corrected value|1 real person/i)
})

test('drops non-user/assistant entries (system/internal metadata)', () => {
  const raw = [
    { role: 'system', text: 'internal' },
    { role: 'user', text: 'hi' },
    { role: 'tool', text: 'internal' },
    { role: 'assistant', text: 'hello' },
    { role: undefined, text: 'x' },
    { notrole: 'user', text: 'x' },
  ]
  expect(shapeCrcTranscript(raw).map((e) => e.role)).toEqual(['user', 'assistant'])
})

test('coerces missing/non-string text -> "" and missing/non-string timestamp -> null', () => {
  const raw = [
    { role: 'user' },
    { role: 'assistant', text: 42, timestamp: 999 },
    { role: 'user', text: 'ok', timestamp: '2026-09-01' },
  ]
  expect(shapeCrcTranscript(raw)).toEqual([
    { role: 'user', text: '', timestamp: null },
    { role: 'assistant', text: '', timestamp: null },
    { role: 'user', text: 'ok', timestamp: '2026-09-01' },
  ])
})

test('non-array input -> [], never throws', () => {
  expect(shapeCrcTranscript(null)).toEqual([])
  expect(shapeCrcTranscript(undefined)).toEqual([])
  expect(shapeCrcTranscript('a string')).toEqual([])
  expect(shapeCrcTranscript({ role: 'user', text: 'x' })).toEqual([])
  expect(shapeCrcTranscript(123)).toEqual([])
})

test('no classification tokens in the output shape', () => {
  const out = shapeCrcTranscript([{ role: 'user', text: 'anything' }])
  expect(Object.keys(out[0])).toEqual(['role', 'text', 'timestamp'])
  for (const k of ['evidence', 'attestation', 'verified', 'finding', 'conclusion', 'risk', 'control']) {
    expect(Object.keys(out[0])).not.toContain(k)
  }
})

test('behaviorally equivalent to the pre-extraction Sales loop for a mixed fixture', () => {
  const raw = [
    { role: 'user', text: 'q1', timestamp: 't1' },
    { role: 'system', text: 'noise' },
    { role: 'assistant', text: 'a1' },
    { role: 'user', text: 'q2' },
  ]
  // Reproduce the old loop exactly:
  const legacy: Array<{ role: 'user' | 'assistant'; text: string; timestamp: string | null }> = []
  for (const e of raw as Array<Record<string, unknown>>) {
    const role = e.role
    if (role !== 'user' && role !== 'assistant') continue
    const text = typeof e.text === 'string' ? e.text : ''
    const timestamp = typeof e.timestamp === 'string' ? e.timestamp : null
    legacy.push({ role, text, timestamp })
  }
  expect(shapeCrcTranscript(raw)).toEqual(legacy)
})
