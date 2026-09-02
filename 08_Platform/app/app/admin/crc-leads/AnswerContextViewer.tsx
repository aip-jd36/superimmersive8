'use client'

/**
 * Optional current-governed-knowledge answer context (CAH-3B §15-§17).
 * Lazy: fetched only on explicit click. Clearly labelled as current
 * governed context, NOT a record of what CRC told the customer.
 * Degrades to "unavailable" without affecting anything else on the page.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { SalesAnswerContext } from '@/lib/crc-sales/types'

export function AnswerContextViewer({ sessionId }: { sessionId: string }) {
  const [ctx, setCtx] = useState<SalesAnswerContext | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/crc-leads/sessions/${sessionId}/answer-context`)
      setCtx(await res.json())
    } catch {
      setCtx({ available: false, temporal_note: 'Could not load.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">Answer context (current governed knowledge)</h3>
        {ctx === null && (
          <Button size="sm" variant="outline" disabled={busy} onClick={load}>
            {busy ? 'Computing…' : 'Load'}
          </Button>
        )}
      </div>
      {ctx !== null && (
        <div className="mt-2 rounded border border-gray-200 p-3 text-xs space-y-3">
          <p className="text-gray-500 italic">{ctx.temporal_note}</p>
          {!ctx.available ? (
            <p className="text-gray-500">Answer context unavailable for this session.</p>
          ) : (
            <>
              {ctx.session_runtime_commit && (
                <p className="text-gray-400">CRC ran under deploy {ctx.session_runtime_commit}; computed {ctx.computed_at}</p>
              )}
              {ctx.goal_statuses && ctx.goal_statuses.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-700">Per goal</p>
                  <ul className="list-disc pl-5">
                    {ctx.goal_statuses.map((g, i) => (
                      <li key={i}>
                        <span className="text-gray-800">{g.goal_category}</span>: {g.interpretation_status_label}
                        {g.unresolved_relevant_claim_ids.length > 0 && (
                          <span className="text-gray-400"> (unresolved: {g.unresolved_relevant_claim_ids.join(', ')})</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {ctx.governed_references && ctx.governed_references.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-700">Governed topics encountered</p>
                  <ul className="list-disc pl-5">
                    {ctx.governed_references.map((r, i) => (
                      <li key={i} className="text-gray-600">
                        {r.claim_id} · {r.topic} · {r.match_origin} (via {r.matched_goal_category})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {ctx.unresolved_applicability && ctx.unresolved_applicability.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-700">Unresolved applicability</p>
                  <ul className="list-disc pl-5">
                    {ctx.unresolved_applicability.map((u, i) => (
                      <li key={i} className="text-gray-600">
                        {u.claim_id} · {u.fact} · {u.status} (goal: {u.goal_category})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  )
}
