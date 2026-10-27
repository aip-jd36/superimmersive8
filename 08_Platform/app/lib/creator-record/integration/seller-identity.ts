/**
 * CR-V2-MVP-6 — the seller name a document appears to show, resolved to a
 * canonical tool with the SAME fail-closed resolution used for the creator's
 * own tool answers (`./facts.ts`): `normalizeCandidate`, existing aliases and
 * canonical ids only. No suffix stripping, no fuzzy matching, no guessing
 * between candidates. Anything else is unrecognised or ambiguous.
 */

import { normalizeCandidate } from '@/lib/interview-engine/extraction'

export type ResolvedSellerIdentity = { kind: 'canonical'; tool_id: string } | { kind: 'ambiguous' } | { kind: 'unrecognized' }

export function resolveSellerIdentity(name: string): ResolvedSellerIdentity {
  const raw = name.trim()
  if (!raw) return { kind: 'unrecognized' }
  const r = normalizeCandidate({ kind: 'tool_mention', raw_tool_name: raw, raw_text: raw, proposal_id: 'creator-record-seller', turn: 0 })
  if (r.status === 'resolved') return { kind: 'canonical', tool_id: r.canonical_identifier }
  if (r.status === 'known_ambiguous') return { kind: 'ambiguous' }
  return { kind: 'unrecognized' }
}
