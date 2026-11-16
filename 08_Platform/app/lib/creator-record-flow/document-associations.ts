/**
 * SI8-UX-2 — the creator's document-to-tool links for the version being prepared. PURE (no React, no fetch): client-safe.
 *
 * The serialized contract is unchanged: a version references documents as `{ document_id, category, tool_index }`, where
 * `tool_index` is the position of a declared tool (or null: not linked to a tool) and the server refuses an index outside the
 * declared tools (`parseEvidenceReferences`). This module only keeps those references correct while the creator edits the tools:
 *
 *   - Removing a tool renumbers the links of every LATER tool down by one, so each document stays with the tool it was linked to.
 *   - The removed tool's own documents are never moved to another tool. They become "needs a choice": not linked, and held back
 *     from preparation until the creator explicitly links them to a tool, leaves them not linked, or takes them out of the version.
 *   - Changing the identity of a declared tool in place (the AI tool chosen, including to or from "Not sure", or clearing it) puts
 *     that tool's documents in "needs a choice" too, keeping their link until the creator decides. The first choice of a tool for
 *     an empty block is not a change. A plan or usage-date change is not a change of identity and never touches a link.
 *   - Only the creator's explicit choice resolves a document. Nothing here reads a document's contents or a reading: links are
 *     never inferred.
 *
 * While any document needs a choice, `serializeAttachments` refuses, so no version can be prepared with an unconfirmed link.
 */
import type { Attachment } from './examination-ui'

export type PendingReason = 'tool_removed' | 'tool_changed'

export interface AssociationState {
  /** The documents in this version, in the order they were added. `tool_index` is always within the declared tools, or null. */
  attachments: Attachment[]
  /** Documents whose link the creator must confirm, and why. Every key is a document in `attachments`. */
  pending: Readonly<Record<string, PendingReason>>
}

/** Where a creator puts a document: a tool (by position), not linked to a tool, or out of this version. */
export type LinkChoice = { kind: 'tool'; tool_index: number } | { kind: 'unlinked' } | { kind: 'exclude' }

export type AssociationEvent =
  | { kind: 'tool_removed'; index: number }
  | { kind: 'tool_identity_changed'; index: number }
  /** The declared tools became fewer than before by a means other than removing one (a questionnaire update). */
  | { kind: 'tools_truncated'; count: number }
  | { kind: 'add'; document_id: string; category: string; tool_index: number | null }
  | { kind: 'choose'; document_id: string; choice: LinkChoice }
  | { kind: 'set_category'; document_id: string; category: string }
  /** Replace everything with a version's own references (correcting a version): nothing is pending. */
  | { kind: 'reset'; attachments: Attachment[] }

export const EMPTY_ASSOCIATIONS: AssociationState = Object.freeze({ attachments: [], pending: {} }) as AssociationState

const withoutKey = (o: Readonly<Record<string, PendingReason>>, key: string): Record<string, PendingReason> => {
  const next = { ...o }
  delete next[key]
  return next
}

/** Whether a change of a tool block's identity answer is a change of the declared tool. Empty → a first choice is not. */
export function toolIdentityChanged(previous: readonly string[] | undefined, next: readonly string[] | undefined): boolean {
  const before = (previous ?? [])[0] ?? ''
  const after = (next ?? [])[0] ?? ''
  return before !== '' && before !== after
}

export function associationReducer(state: AssociationState, event: AssociationEvent): AssociationState {
  switch (event.kind) {
    case 'tool_removed': {
      const k = event.index
      const pending: Record<string, PendingReason> = { ...state.pending }
      const attachments = state.attachments.map((a) => {
        if (a.tool_index === null || a.tool_index < k) return a
        if (a.tool_index > k) return { ...a, tool_index: a.tool_index - 1 }
        pending[a.document_id] = 'tool_removed'
        return { ...a, tool_index: null }
      })
      return { attachments, pending }
    }
    case 'tool_identity_changed': {
      const pending: Record<string, PendingReason> = { ...state.pending }
      for (const a of state.attachments) {
        // A document whose tool was already removed keeps that reason; its link is null, so it is never matched here.
        if (a.tool_index === event.index && pending[a.document_id] !== 'tool_removed') pending[a.document_id] = 'tool_changed'
      }
      return { attachments: state.attachments, pending }
    }
    case 'tools_truncated': {
      const pending: Record<string, PendingReason> = { ...state.pending }
      const attachments = state.attachments.map((a) => {
        if (a.tool_index === null || a.tool_index < event.count) return a
        pending[a.document_id] = 'tool_removed'
        return { ...a, tool_index: null }
      })
      return { attachments, pending }
    }
    case 'add': {
      // Already in this version: nothing moves. The creator changes its link explicitly where it is shown.
      if (state.attachments.some((a) => a.document_id === event.document_id)) return state
      return { attachments: [...state.attachments, { document_id: event.document_id, category: event.category, tool_index: event.tool_index }], pending: state.pending }
    }
    case 'choose': {
      if (!state.attachments.some((a) => a.document_id === event.document_id)) return state
      const pending = withoutKey(state.pending, event.document_id)
      if (event.choice.kind === 'exclude') return { attachments: state.attachments.filter((a) => a.document_id !== event.document_id), pending }
      const tool_index = event.choice.kind === 'tool' ? event.choice.tool_index : null
      return { attachments: state.attachments.map((a) => (a.document_id === event.document_id ? { ...a, tool_index } : a)), pending }
    }
    case 'set_category':
      return { attachments: state.attachments.map((a) => (a.document_id === event.document_id ? { ...a, category: event.category } : a)), pending: state.pending }
    case 'reset':
      return { attachments: event.attachments.map((a) => ({ ...a })), pending: {} }
  }
}

/** Documents still waiting for the creator's choice, in the order they were added. */
export function unresolvedDocuments(state: AssociationState): string[] {
  return state.attachments.filter((a) => state.pending[a.document_id] !== undefined).map((a) => a.document_id)
}

/** The attachments linked to one declared tool, in the order they were added (pending ones included, so they stay visible). */
export const attachmentsForTool = (state: AssociationState, toolIndex: number): Attachment[] => state.attachments.filter((a) => a.tool_index === toolIndex)

/** The attachments not linked to a tool. */
export const unlinkedAttachments = (state: AssociationState): Attachment[] => state.attachments.filter((a) => a.tool_index === null)

/**
 * The references a version is prepared with — exactly the existing contract — or the documents that block it. Refuses while any
 * document needs a choice, and (defensively) if any link points outside the declared tools.
 */
export function serializeAttachments(state: AssociationState, toolCount: number): { ok: true; attachments: Attachment[] } | { ok: false; unresolved: string[] } {
  const unresolved = unresolvedDocuments(state)
  const outOfRange = state.attachments.filter((a) => a.tool_index !== null && (a.tool_index < 0 || a.tool_index >= toolCount)).map((a) => a.document_id)
  const blocked = Array.from(new Set([...unresolved, ...outOfRange]))
  if (blocked.length > 0) return { ok: false, unresolved: blocked }
  return { ok: true, attachments: state.attachments.map((a) => ({ document_id: a.document_id, category: a.category, tool_index: a.tool_index })) }
}
