/**
 * CR-V2-WORK-UAT-HARNESS-2 — strict parsing of the public harness request.
 *
 * Accepted body, nothing else:
 *   { answers, tools, acknowledgements,            ← the questionnaire form state
 *     documents?: [{ tool_index, fixture_id }] }   ← an ALLOWLISTED fixture id only
 *
 * CR-V2-MVP-6: no review, adoption or reconciliation field is accepted.
 *
 * There is no way to send a document observation, a document id, a file, a
 * hash, a mode, an extraction or a version: any such key is rejected. The
 * observation for a fixture is built on the server (`./fixtures.ts`). The
 * form-state part reuses the admin prototype's own parser unchanged.
 */

import { MAX_DOCUMENTS_PER_TOOL } from '../evidence/document-observations'
import type { CreatorRecordFormState } from '../prototype/form'
import { parseFormState } from '../prototype/parse-form-state'
import { isAllowlistedFixture } from './fixtures'

/** Same ceiling as the admin draft route. */
export const PUBLIC_UAT_MAX_BODY_BYTES = 32_000
const MAX_DOCUMENTS = 3

export interface PublicDocumentRef {
  tool_index: number
  fixture_id: string
}

export type PublicParseResult = { ok: true; state: CreatorRecordFormState; documents: PublicDocumentRef[] } | { ok: false }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const exactKeys = (o: Record<string, unknown>, keys: readonly string[]) => Object.keys(o).length === keys.length && keys.every((k) => Object.prototype.hasOwnProperty.call(o, k))

function parseRef(raw: unknown, toolCount: number): PublicDocumentRef | null {
  if (!isObj(raw) || !exactKeys(raw, ['tool_index', 'fixture_id'])) return null
  const { tool_index, fixture_id } = raw
  if (typeof tool_index !== 'number' || !Number.isInteger(tool_index) || tool_index < 0 || tool_index >= toolCount) return null
  if (!isAllowlistedFixture(fixture_id)) return null
  return { tool_index, fixture_id }
}

export function parsePublicUatRequest(body: unknown): PublicParseResult {
  if (!isObj(body)) return { ok: false }
  if (Object.keys(body).some((k) => !['answers', 'tools', 'acknowledgements', 'documents'].includes(k))) return { ok: false }
  const { documents, ...form } = body
  const parsed = parseFormState(form)
  if (!parsed.ok) return { ok: false }
  const refs: PublicDocumentRef[] = []
  if (documents !== undefined) {
    if (!Array.isArray(documents) || documents.length > MAX_DOCUMENTS) return { ok: false }
    for (const d of documents) {
      const r = parseRef(d, parsed.state.tools.length)
      if (!r) return { ok: false }
      if (refs.filter((x) => x.tool_index === r.tool_index).length >= MAX_DOCUMENTS_PER_TOOL) return { ok: false }
      refs.push(r)
    }
  }
  return { ok: true, state: parsed.state, documents: refs }
}
