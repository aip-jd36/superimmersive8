/**
 * SI8-UX-2 harness: the same reference rules as `parseEvidenceReferences` (lib/creator-record/evidence-intake/contract.ts), for the
 * browser harness only (the real module imports node:crypto). Equivalence with the real parser is test-enforced
 * (`__tests__/creator-record/ux2-harness-references.test.ts`).
 */
import { EVIDENCE_CATEGORIES, EVIDENCE_MAX_PER_RECORD, EVIDENCE_MAX_PER_TOOL } from '@/lib/creator-record/evidence-intake/vocabulary'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export function parseEvidenceReferencesForHarness(v: unknown, toolCount: number): { document_id: string; category: string; tool_index: number | null }[] | null {
  if (v === undefined) return []
  if (!Array.isArray(v) || v.length > EVIDENCE_MAX_PER_RECORD) return null
  const out: { document_id: string; category: string; tool_index: number | null }[] = []
  const seen = new Set<string>()
  const perTool = new Map<number, number>()
  for (const item of v) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null
    const o = item as Record<string, unknown>
    if (Object.keys(o).sort().join(',') !== 'category,document_id,tool_index') return null
    if (typeof o.document_id !== 'string' || !UUID.test(o.document_id) || seen.has(o.document_id)) return null
    if (typeof o.category !== 'string' || !(EVIDENCE_CATEGORIES as readonly string[]).includes(o.category)) return null
    const t = o.tool_index
    if (t !== null && (typeof t !== 'number' || !Number.isInteger(t) || t < 0 || t >= toolCount)) return null
    if (t !== null) {
      const n = (perTool.get(t) ?? 0) + 1
      if (n > EVIDENCE_MAX_PER_TOOL) return null
      perTool.set(t, n)
    }
    seen.add(o.document_id)
    out.push({ document_id: o.document_id, category: o.category, tool_index: t as number | null })
  }
  return out
}
