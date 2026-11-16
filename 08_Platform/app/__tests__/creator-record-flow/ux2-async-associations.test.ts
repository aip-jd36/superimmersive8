/**
 * SI8-UX-2-R1 — an upload that finishes after the tools changed is resolved against the CURRENT tools, by the stable key of the
 * tool block it began in and that block's identity generation; never by the position the block had when the upload began.
 *
 * Proves the corrected behaviour for the four reproduced defects (R1, R2, R3, R5) and the additional cases of SI8-UX-2-R1 §4, on
 * the pure reducer the page uses, plus a deterministic randomized invariant check. The synchronous coverage in
 * `ux2-document-associations.test.ts` is unchanged.
 */
import {
  associationReducer, EMPTY_ASSOCIATIONS, outOfRangeDocuments, serializeAttachments, unlinkedAttachments, unresolvedDocuments, uploadOrigin,
  type AssociationEvent, type AssociationState, type UploadOrigin,
} from '@/lib/creator-record-flow/document-associations'

const D = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const run = (events: AssociationEvent[], from: AssociationState = EMPTY_ASSOCIATIONS) => events.reduce(associationReducer, from)
const tools = (...keys: string[]) => run([{ kind: 'tools_sync', keys }])
const done = (n: number, origin: UploadOrigin): AssociationEvent => ({ kind: 'upload_completed', document_id: D(n), category: 'billing_receipt', origin })
const where = (s: AssociationState, n: number) => {
  const a = s.attachments.find((x) => x.document_id === D(n))
  return a ? { tool_index: a.tool_index, pending: s.pending[D(n)] ?? null } : undefined
}

describe('the reproduced defects, corrected', () => {
  test('R1: upload began in tool 2; tool 1 removed meanwhile → linked to the same tool at its new position, visible, nothing pending', () => {
    let s = tools('a', 'b')
    const origin = uploadOrigin(s, 'b')
    s = run([{ kind: 'tool_removed', index: 0 }, done(1, origin)], s)
    expect(where(s, 1)).toEqual({ tool_index: 0, pending: null })
    expect(outOfRangeDocuments(s, s.tools!.length)).toEqual([])
    expect(serializeAttachments(s, 1)).toEqual({ ok: true, attachments: [{ document_id: D(1), category: 'billing_receipt', tool_index: 0 }] })
  })

  test('R2: upload began in tool 2; tool 2 itself removed meanwhile → never linked to another tool; not linked, needs a choice', () => {
    let s = tools('a', 'b', 'c')
    const origin = uploadOrigin(s, 'b')
    s = run([{ kind: 'tool_removed', index: 1 }, done(1, origin)], s)
    expect(where(s, 1)).toEqual({ tool_index: null, pending: 'tool_removed' })
    expect(unlinkedAttachments(s).map((a) => a.document_id)).toEqual([D(1)])
    expect(serializeAttachments(s, 2)).toEqual({ ok: false, unresolved: [D(1)] })
  })

  test('R3: upload began in tool 1; tool 1 changed in place meanwhile → on tool 1, needing reconfirmation', () => {
    let s = tools('a', 'b')
    const origin = uploadOrigin(s, 'a')
    s = run([{ kind: 'tool_identity_changed', index: 0 }, done(1, origin)], s)
    expect(where(s, 1)).toEqual({ tool_index: 0, pending: 'tool_changed' })
  })

  test('R5: tool 2 changed twice, then tool 1 removed, while an upload begun in tool 2 was pending → visible on tool 2 (now first), needing reconfirmation', () => {
    let s = tools('a', 'b')
    const origin = uploadOrigin(s, 'b')
    s = run([{ kind: 'tool_identity_changed', index: 1 }, { kind: 'tool_identity_changed', index: 1 }, { kind: 'tool_removed', index: 0 }, done(1, origin)], s)
    expect(where(s, 1)).toEqual({ tool_index: 0, pending: 'tool_changed' })
    expect(outOfRangeDocuments(s, s.tools!.length)).toEqual([])
  })
})

describe('additional concurrency and integrity cases', () => {
  test('changing the tool away and back still needs reconfirmation (generations only grow)', () => {
    let s = run([{ kind: 'add', document_id: D(9), category: 'licence', tool_index: 0 }], tools('a'))
    const origin = uploadOrigin(s, 'a')
    s = run([{ kind: 'tool_identity_changed', index: 0 }, { kind: 'tool_identity_changed', index: 0 }, done(1, origin)], s)
    expect(s.tools![0].generation).toBe(2)
    expect(where(s, 1)).toEqual({ tool_index: 0, pending: 'tool_changed' })
    // A document already on the tool keeps its reconfirmation requirement after changing back.
    expect(where(s, 9)).toEqual({ tool_index: 0, pending: 'tool_changed' })
  })

  test('an upload that began AFTER the change, with nothing changed since, needs no reconfirmation', () => {
    let s = run([{ kind: 'tool_identity_changed', index: 0 }], tools('a'))
    s = associationReducer(s, done(1, uploadOrigin(s, 'a')))
    expect(where(s, 1)).toEqual({ tool_index: 0, pending: null })
  })

  test('multiple concurrent uploads finishing in either order each land on their own tool', () => {
    let s = tools('a', 'b', 'c')
    const fromA = uploadOrigin(s, 'a')
    const fromC = uploadOrigin(s, 'c')
    s = run([{ kind: 'tool_removed', index: 1 }, done(2, fromC), done(1, fromA)], s)
    expect(where(s, 1)).toEqual({ tool_index: 0, pending: null })
    expect(where(s, 2)).toEqual({ tool_index: 1, pending: null })
  })

  test('a duplicate document added elsewhere while the upload was pending is not moved or re-flagged', () => {
    let s = tools('a', 'b')
    const origin = uploadOrigin(s, 'a')
    // Meanwhile the creator chose the same stored document for tool 2, then explicitly left it not linked.
    s = run([{ kind: 'add', document_id: D(1), category: 'licence', tool_index: 1 }, { kind: 'choose', document_id: D(1), choice: { kind: 'unlinked' } }], s)
    const before = s
    s = associationReducer(s, done(1, origin))
    expect(s).toBe(before)
    expect(where(s, 1)).toEqual({ tool_index: null, pending: null })
  })

  test('a tool removed and re-created with the same provider is a different tool: the upload is not linked to it', () => {
    let s = tools('a', 'b')
    const origin = uploadOrigin(s, 'b')
    s = run([{ kind: 'tool_removed', index: 1 }, { kind: 'tool_added', key: 'b2' }, done(1, origin)], s)
    expect(s.tools!.map((t) => t.key)).toEqual(['a', 'b2'])
    expect(where(s, 1)).toEqual({ tool_index: null, pending: 'tool_removed' })
  })

  test('explicit choices made while an upload is pending are kept; the completion only adds its own document', () => {
    let s = run([
      { kind: 'add', document_id: D(7), category: 'billing_receipt', tool_index: 0 },
      { kind: 'add', document_id: D(8), category: 'billing_receipt', tool_index: 1 },
    ], tools('a', 'b'))
    const origin = uploadOrigin(s, 'b')
    s = run([
      { kind: 'tool_removed', index: 0 }, // D(7) needs a choice
      { kind: 'choose', document_id: D(7), choice: { kind: 'exclude' } },
      { kind: 'choose', document_id: D(8), choice: { kind: 'unlinked' } },
      done(1, origin),
    ], s)
    expect(s.attachments.map((a) => [a.document_id, a.tool_index])).toEqual([[D(8), null], [D(1), 0]])
    expect(s.pending).toEqual({})
  })

  test('an upload whose tool block is unknown (e.g. the questionnaire was re-mounted) needs a choice', () => {
    let s = tools('a')
    const origin = uploadOrigin(s, 'a')
    s = run([{ kind: 'tools_sync', keys: ['x'] }, done(1, origin)], s)
    expect(where(s, 1)).toEqual({ tool_index: null, pending: 'tool_removed' })
  })

  test('tools_sync keeps the generation of known keys and starts new keys at 0', () => {
    const s = run([{ kind: 'tool_identity_changed', index: 0 }, { kind: 'tools_sync', keys: ['a', 'z'] }], tools('a'))
    expect(s.tools).toEqual([{ key: 'a', generation: 1 }, { key: 'z', generation: 0 }])
  })
})

describe('defence in depth: no invisible or out-of-range link', () => {
  test('with the tools known, an add outside them becomes "needs a choice", not linked', () => {
    const s = run([{ kind: 'add', document_id: D(1), category: 'other', tool_index: 5 }], tools('a', 'b'))
    expect(where(s, 1)).toEqual({ tool_index: null, pending: 'tool_removed' })
    expect(serializeAttachments(s, 2).ok).toBe(false)
  })

  test('tools_truncated also shrinks the known tools', () => {
    const s = run([{ kind: 'add', document_id: D(1), category: 'other', tool_index: 2 }, { kind: 'tools_truncated', count: 1 }], tools('a', 'b', 'c'))
    expect(s.tools!.map((t) => t.key)).toEqual(['a'])
    expect(where(s, 1)).toEqual({ tool_index: null, pending: 'tool_removed' })
  })

  test('without known tools the link is kept as given (legacy), but it is reported and preparation refuses', () => {
    const s = run([{ kind: 'add', document_id: D(1), category: 'other', tool_index: 5 }])
    expect(outOfRangeDocuments(s, 2)).toEqual([D(1)])
    expect(serializeAttachments(s, 2).ok).toBe(false)
  })

  test('randomized: whatever the order of tool edits, uploads and choices, every link is a declared tool or none, every pending entry is a document, and nothing pending is ever serialized', () => {
    let seed = 20261116
    const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n }
    for (let run_ = 0; run_ < 400; run_++) {
      let s = tools('k0', 'k1')
      let nextKey = 2
      let nextDoc = 1
      const inFlight: UploadOrigin[] = []
      for (let step = 0; step < 30; step++) {
        const n = s.tools!.length
        const op = rnd(8)
        if (op === 0 && n < 3) s = associationReducer(s, { kind: 'tool_added', key: `k${nextKey++}` })
        else if (op === 1 && n > 1) s = associationReducer(s, { kind: 'tool_removed', index: rnd(n) })
        else if (op === 2) s = associationReducer(s, { kind: 'tool_identity_changed', index: rnd(n) })
        else if (op === 3) inFlight.push(uploadOrigin(s, s.tools![rnd(n)].key))
        else if (op === 4 && inFlight.length) s = associationReducer(s, done(nextDoc++, inFlight.splice(rnd(inFlight.length), 1)[0]))
        else if (op === 5) s = associationReducer(s, { kind: 'add', document_id: D(nextDoc++), category: 'other', tool_index: rnd(n + 2) })
        else if (op === 6 && s.attachments.length) {
          const a = s.attachments[rnd(s.attachments.length)]
          const c = rnd(3)
          s = associationReducer(s, { kind: 'choose', document_id: a.document_id, choice: c === 0 ? { kind: 'tool', tool_index: rnd(n) } : c === 1 ? { kind: 'unlinked' } : { kind: 'exclude' } })
        }
        const count = s.tools!.length
        for (const a of s.attachments) expect(a.tool_index === null || (a.tool_index >= 0 && a.tool_index < count)).toBe(true)
        for (const id of Object.keys(s.pending)) expect(s.attachments.some((a) => a.document_id === id)).toBe(true)
        const ser = serializeAttachments(s, count)
        if (unresolvedDocuments(s).length > 0) expect(ser.ok).toBe(false)
        else expect(ser.ok).toBe(true)
      }
    }
  })
})
