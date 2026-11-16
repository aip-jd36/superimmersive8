/**
 * SI8-UX-2 — document-to-tool links stay correct through tool removal and in-place tool changes.
 *
 * Proves, on the pure reducer the page uses: removing the first, middle or last tool renumbers the links of later tools and never
 * moves the removed tool's documents to another tool; those documents, and the documents of a tool whose identity changed in
 * place, need an explicit choice; a plan or date change touches nothing; nothing can be serialized while a choice is pending; and
 * the serialized references are exactly the existing `{ document_id, category, tool_index }` contract.
 */
import {
  associationReducer, attachmentsForTool, EMPTY_ASSOCIATIONS, serializeAttachments, toolIdentityChanged, unlinkedAttachments, unresolvedDocuments,
  type AssociationEvent, type AssociationState,
} from '@/lib/creator-record-flow/document-associations'

const D = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const run = (events: AssociationEvent[], from: AssociationState = EMPTY_ASSOCIATIONS) => events.reduce(associationReducer, from)
const add = (n: number, tool_index: number | null, category = 'billing_receipt'): AssociationEvent => ({ kind: 'add', document_id: D(n), category, tool_index })
const links = (s: AssociationState) => Object.fromEntries(s.attachments.map((a) => [a.document_id, a.tool_index]))

// Three tools, two documents on each, plus one not linked.
const THREE_TOOLS = run([add(1, 0), add(2, 0), add(3, 1), add(4, 1), add(5, 2), add(6, 2), add(7, null)])

describe('removing a tool', () => {
  test('removing the FIRST tool: later tools renumber down, its own documents need a choice and are not linked to any tool', () => {
    const s = associationReducer(THREE_TOOLS, { kind: 'tool_removed', index: 0 })
    expect(links(s)).toEqual({ [D(1)]: null, [D(2)]: null, [D(3)]: 0, [D(4)]: 0, [D(5)]: 1, [D(6)]: 1, [D(7)]: null })
    expect(s.pending).toEqual({ [D(1)]: 'tool_removed', [D(2)]: 'tool_removed' })
    expect(unresolvedDocuments(s)).toEqual([D(1), D(2)])
  })

  test('removing the MIDDLE tool: the first keeps its links, the last renumbers, the middle tool\'s documents need a choice', () => {
    const s = associationReducer(THREE_TOOLS, { kind: 'tool_removed', index: 1 })
    expect(links(s)).toEqual({ [D(1)]: 0, [D(2)]: 0, [D(3)]: null, [D(4)]: null, [D(5)]: 1, [D(6)]: 1, [D(7)]: null })
    expect(s.pending).toEqual({ [D(3)]: 'tool_removed', [D(4)]: 'tool_removed' })
  })

  test('removing the LAST tool: nothing renumbers, its documents need a choice (never out of range)', () => {
    const s = associationReducer(THREE_TOOLS, { kind: 'tool_removed', index: 2 })
    expect(links(s)).toEqual({ [D(1)]: 0, [D(2)]: 0, [D(3)]: 1, [D(4)]: 1, [D(5)]: null, [D(6)]: null, [D(7)]: null })
    expect(s.pending).toEqual({ [D(5)]: 'tool_removed', [D(6)]: 'tool_removed' })
    expect(s.attachments.every((a) => a.tool_index === null || a.tool_index < 2)).toBe(true)
  })

  test('a document never ends up linked to a tool it was not linked to (every position, every document)', () => {
    for (let k = 0; k < 3; k++) {
      const s = associationReducer(THREE_TOOLS, { kind: 'tool_removed', index: k })
      for (const before of THREE_TOOLS.attachments) {
        const after = s.attachments.find((a) => a.document_id === before.document_id)!
        if (before.tool_index === null) expect(after.tool_index).toBeNull()
        else if (before.tool_index === k) expect(after.tool_index).toBeNull()
        else expect(after.tool_index).toBe(before.tool_index > k ? before.tool_index - 1 : before.tool_index)
      }
    }
  })

  test('documents not linked to a tool, and the order documents were added in, are unaffected', () => {
    const s = associationReducer(THREE_TOOLS, { kind: 'tool_removed', index: 0 })
    expect(s.attachments.map((a) => a.document_id)).toEqual(THREE_TOOLS.attachments.map((a) => a.document_id))
    expect(s.pending[D(7)]).toBeUndefined()
  })

  test('duplicate provider declarations: removing one of two "Runway" tools keeps the other Runway tool\'s documents with it', () => {
    // Tools 0 and 1 are both Runway (identity does not matter to links: they are by position).
    const s = run([add(1, 0), add(2, 1), { kind: 'tool_removed', index: 0 }])
    expect(links(s)).toEqual({ [D(1)]: null, [D(2)]: 0 })
    expect(s.pending).toEqual({ [D(1)]: 'tool_removed' })
  })
})

describe('changing a declared tool in place', () => {
  test('identity rules: a first choice is not a change; changing, clearing or moving to or from "Not sure" is', () => {
    expect(toolIdentityChanged(undefined, ['runway-gen3'])).toBe(false)
    expect(toolIdentityChanged([], ['runway-gen3'])).toBe(false)
    expect(toolIdentityChanged([''], ['higgsfield'])).toBe(false)
    expect(toolIdentityChanged(['runway-gen3'], ['runway-gen3'])).toBe(false)
    expect(toolIdentityChanged(['runway-gen3'], ['higgsfield'])).toBe(true)
    expect(toolIdentityChanged(['runway-gen3'], ['not_sure'])).toBe(true)
    expect(toolIdentityChanged(['not_sure'], ['higgsfield'])).toBe(true)
    expect(toolIdentityChanged(['higgsfield'], [])).toBe(true)
  })

  test('the changed tool\'s documents keep their link but need a choice; other tools are untouched', () => {
    const s = associationReducer(THREE_TOOLS, { kind: 'tool_identity_changed', index: 1 })
    expect(links(s)).toEqual(links(THREE_TOOLS))
    expect(s.pending).toEqual({ [D(3)]: 'tool_changed', [D(4)]: 'tool_changed' })
    expect(attachmentsForTool(s, 1).map((a) => a.document_id)).toEqual([D(3), D(4)])
  })

  test('a plan or usage-date change emits no event, so links and pending state are unchanged', () => {
    // The questionnaire emits `tool_identity_changed` only for the identity question (T1); T3 and T4 never reach the reducer.
    expect(toolIdentityChanged(['runway-gen3'], ['runway-gen3'])).toBe(false)
    expect(serializeAttachments(THREE_TOOLS, 3).ok).toBe(true)
  })

  test('confirming the same tool again resolves the choice and keeps the link', () => {
    const s = run([{ kind: 'tool_identity_changed', index: 0 }, { kind: 'choose', document_id: D(1), choice: { kind: 'tool', tool_index: 0 } }], THREE_TOOLS)
    expect(s.pending).toEqual({ [D(2)]: 'tool_changed' })
    expect(links(s)[D(1)]).toBe(0)
  })

  test('a document already waiting because its tool was removed keeps that reason', () => {
    const s = run([{ kind: 'tool_removed', index: 0 }, { kind: 'tool_identity_changed', index: 0 }], THREE_TOOLS)
    expect(s.pending[D(1)]).toBe('tool_removed')
    // The tool now at position 0 (formerly tool 1) has its own documents flagged as changed.
    expect(s.pending[D(3)]).toBe('tool_changed')
  })
})

describe('explicit choices and serialization', () => {
  test('nothing serializes while any document needs a choice', () => {
    const s = associationReducer(THREE_TOOLS, { kind: 'tool_removed', index: 1 })
    expect(serializeAttachments(s, 2)).toEqual({ ok: false, unresolved: [D(3), D(4)] })
  })

  test('each of the three choices resolves a document: link to a tool, leave not linked, take out of the version', () => {
    const s = run([
      { kind: 'tool_removed', index: 1 },
      { kind: 'choose', document_id: D(3), choice: { kind: 'tool', tool_index: 1 } },
      { kind: 'choose', document_id: D(4), choice: { kind: 'exclude' } },
    ], THREE_TOOLS)
    expect(unresolvedDocuments(s)).toEqual([])
    const r = serializeAttachments(s, 2)
    expect(r).toEqual({
      ok: true,
      attachments: [
        { document_id: D(1), category: 'billing_receipt', tool_index: 0 },
        { document_id: D(2), category: 'billing_receipt', tool_index: 0 },
        { document_id: D(3), category: 'billing_receipt', tool_index: 1 },
        { document_id: D(5), category: 'billing_receipt', tool_index: 1 },
        { document_id: D(6), category: 'billing_receipt', tool_index: 1 },
        { document_id: D(7), category: 'billing_receipt', tool_index: null },
      ],
    })
    const left = run([{ kind: 'choose', document_id: D(3), choice: { kind: 'unlinked' } }], associationReducer(THREE_TOOLS, { kind: 'tool_removed', index: 1 }))
    expect(left.pending[D(3)]).toBeUndefined()
    expect(unlinkedAttachments(left).map((a) => a.document_id)).toContain(D(3))
  })

  test('serialized references carry exactly the existing three keys', () => {
    const r = serializeAttachments(THREE_TOOLS, 3)
    if (!r.ok) throw new Error('expected ok')
    for (const a of r.attachments) expect(Object.keys(a).sort()).toEqual(['category', 'document_id', 'tool_index'])
  })

  test('defensively, a link outside the declared tools refuses even if not pending', () => {
    expect(serializeAttachments(THREE_TOOLS, 2)).toEqual({ ok: false, unresolved: [D(5), D(6)] })
  })

  test('adding a document already in the version moves nothing (the same file uploaded again returns the same document)', () => {
    const s = associationReducer(THREE_TOOLS, add(3, 0))
    expect(s).toBe(THREE_TOOLS)
  })

  test('a choice about a document not in the version does nothing', () => {
    expect(associationReducer(THREE_TOOLS, { kind: 'choose', document_id: D(99), choice: { kind: 'unlinked' } })).toBe(THREE_TOOLS)
  })

  test('document type is kept through removal, renumbering and choices', () => {
    const s = run([add(1, 0, 'licence'), add(2, 1, 'permission'), { kind: 'tool_removed', index: 0 }, { kind: 'set_category', document_id: D(2), category: 'other' }])
    expect(s.attachments).toEqual([{ document_id: D(1), category: 'licence', tool_index: null }, { document_id: D(2), category: 'other', tool_index: 0 }])
  })
})

describe('repeated operations never leave stale state', () => {
  test('remove, relink, remove again, change identity, relink: every step consistent and the end state serializes', () => {
    let s = THREE_TOOLS
    s = associationReducer(s, { kind: 'tool_removed', index: 0 }) // D1, D2 pending; tools now [old1, old2]
    s = associationReducer(s, { kind: 'choose', document_id: D(1), choice: { kind: 'tool', tool_index: 1 } })
    s = associationReducer(s, { kind: 'choose', document_id: D(2), choice: { kind: 'unlinked' } })
    s = associationReducer(s, { kind: 'tool_removed', index: 1 }) // old2's D5, D6 and now D1 need a choice
    expect(s.pending).toEqual({ [D(1)]: 'tool_removed', [D(5)]: 'tool_removed', [D(6)]: 'tool_removed' })
    s = associationReducer(s, { kind: 'tool_identity_changed', index: 0 }) // old1's D3, D4
    expect(Object.keys(s.pending).sort()).toEqual([D(1), D(3), D(4), D(5), D(6)].sort())
    for (const id of [D(1), D(3), D(4), D(5), D(6)]) s = associationReducer(s, { kind: 'choose', document_id: id, choice: { kind: 'tool', tool_index: 0 } })
    // Two documents per tool at most is a server rule (EVIDENCE_MAX_PER_TOOL); the reducer only keeps links correct.
    expect(unresolvedDocuments(s)).toEqual([])
    expect(serializeAttachments(s, 1).ok).toBe(true)
    expect(s.attachments.every((a) => a.tool_index === null || a.tool_index === 0)).toBe(true)
  })

  test('a questionnaire update with fewer tools puts the lost tools\' documents in "needs a choice", never drops them', () => {
    const s = associationReducer(THREE_TOOLS, { kind: 'tools_truncated', count: 1 })
    expect(links(s)).toEqual({ [D(1)]: 0, [D(2)]: 0, [D(3)]: null, [D(4)]: null, [D(5)]: null, [D(6)]: null, [D(7)]: null })
    expect(Object.keys(s.pending).sort()).toEqual([D(3), D(4), D(5), D(6)].sort())
  })

  test('reset (correcting a version) replaces everything and clears pending choices', () => {
    const pending = associationReducer(THREE_TOOLS, { kind: 'tool_removed', index: 0 })
    const s = associationReducer(pending, { kind: 'reset', attachments: [{ document_id: D(9), category: 'licence', tool_index: 0 }] })
    expect(s).toEqual({ attachments: [{ document_id: D(9), category: 'licence', tool_index: 0 }], pending: {} })
  })

  test('the reducer never mutates its input', () => {
    const before = JSON.stringify(THREE_TOOLS)
    for (const e of [{ kind: 'tool_removed', index: 1 }, { kind: 'tool_identity_changed', index: 0 }, { kind: 'tools_truncated', count: 0 }] as AssociationEvent[]) associationReducer(THREE_TOOLS, e)
    expect(JSON.stringify(THREE_TOOLS)).toBe(before)
  })
})
