'use client'

/**
 * Reviewer Living Knowledge lookup (CAH-4E §14).
 *
 * Deliberate, on-demand only. Initial state is a topic selector + a button —
 * NOTHING is fetched on mount. One click issues exactly one GET to the audited
 * `/reviewer-lk` endpoint (which writes one `lk_research` access event before
 * returning any governed content).
 *
 * Renders structured governed claims — no generated prose, no ranking, no
 * "apply" / "copy to evidence" / "accept" / "summarize". No <input>/<textarea>
 * that feeds assessment state. This component shares no state with the
 * workbook.
 */

import { useCallback, useState } from 'react'
import type { GoalCategory } from '@/types/interview-engine'
import { REVIEWER_LK_FRAMING } from '@/lib/reviewer-lk/project-reviewer-claims'
import type { ReviewerLkClaim, ReviewerLkLookupResult, ReviewerLkWithheld } from '@/lib/reviewer-lk/types'

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'loaded'; result: Extract<ReviewerLkLookupResult, { ok: true }> }
  | { kind: 'error'; message: string }

const WITHHELD_LABEL: Record<ReviewerLkWithheld['reason'], string> = {
  not_adopted: 'not yet Adopted governed knowledge',
  superseded: 'superseded by a newer version',
  publication_scope_not_reviewer_eligible: 'publication scope is not reviewer-eligible (Internal/research)',
  publication_scope_missing_or_unknown: 'publication scope missing or unrecognized',
}

function ClaimCard({ claim }: { claim: ReviewerLkClaim }) {
  return (
    <li className="rounded-md border p-3" style={{ borderColor: '#e0ddd2', backgroundColor: '#fdfcf9' }}>
      <div className="flex flex-wrap items-baseline gap-x-2 text-xs" style={{ color: '#83837e' }}>
        <span className="font-mono">{claim.claim_id}</span>
        <span>· {claim.claim_character}</span>
        <span>· {claim.jurisdiction}</span>
        <span>· {claim.lifecycle}</span>
        <span>· scope: {claim.publication_scope}</span>
        <span>· CRC channel: {claim.crc_eligible}</span>
        {claim.last_verified ? <span>· verified {claim.last_verified}</span> : null}
      </div>

      {claim.statement ? (
        <p className="mt-2 text-sm" style={{ color: '#1c1c1e' }}>{claim.statement}</p>
      ) : (
        <p className="mt-2 text-sm italic" style={{ color: '#83837e' }}>
          No published statement — consult the governed ledger entry.
        </p>
      )}

      {claim.crc_publication_scope ? (
        <p className="mt-1 text-xs" style={{ color: '#4a4a52' }}>
          Scope of the statement: {claim.crc_publication_scope}
        </p>
      ) : null}

      <div className="mt-2 text-xs" style={{ color: '#4a4a52' }}>
        Applicability to this submission:{' '}
        <span style={{ color: claim.applicability_established ? '#1c1c1e' : '#83837e' }}>
          {claim.applicability_established ? 'established' : 'not established'}
        </span>
        {claim.applicability_outcomes.length > 0 ? (
          <ul className="mt-1 list-disc pl-5">
            {claim.applicability_outcomes.map((o, i) => (
              <li key={i}>
                {o.requirement.fact}
                {o.requirement.tool ? ` (${o.requirement.tool})` : ''} {o.requirement.operator}{' '}
                &ldquo;{o.requirement.value}&rdquo; — <span className="font-medium">{o.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <span> — no applicability requirements</span>
        )}
      </div>

      {claim.unresolved_project_dependencies.length > 0 ? (
        <p className="mt-1 text-xs" style={{ color: '#83837e' }}>
          Governed project dependencies (informational): {claim.unresolved_project_dependencies.join(', ')}
        </p>
      ) : null}

      {claim.provider_scope || claim.tool_scope ? (
        <p className="mt-1 text-xs" style={{ color: '#83837e' }}>
          {claim.provider_scope ? `provider scope: ${claim.provider_scope.join(', ')}` : ''}
          {claim.provider_scope && claim.tool_scope ? ' · ' : ''}
          {claim.tool_scope ? `tool scope: ${claim.tool_scope.join(', ')}` : ''}
        </p>
      ) : null}

      <p className="mt-1 text-xs" style={{ color: '#83837e' }}>
        Full governed record: <span className="font-mono">{claim.governed_claims_reference}</span>
      </p>
    </li>
  )
}

export function ReviewerLkLookup({
  submissionId,
  topics,
}: {
  submissionId: string
  topics: readonly GoalCategory[]
}) {
  const [topic, setTopic] = useState<GoalCategory>(topics[0] ?? ('commercial_use' as GoalCategory))
  const [state, setState] = useState<State>({ kind: 'idle' })

  const lookUp = useCallback(async () => {
    setState({ kind: 'loading' })
    try {
      const res = await fetch(
        `/api/admin/submissions/${submissionId}/reviewer-lk?topic=${encodeURIComponent(topic)}`,
        { method: 'GET', cache: 'no-store' },
      )
      if (res.status === 503) {
        setState({ kind: 'error', message: 'Living Knowledge research unavailable — access could not be recorded. Try again.' })
        return
      }
      const data = (await res.json()) as ReviewerLkLookupResult
      if (!res.ok || data.ok !== true) {
        setState({ kind: 'error', message: 'Could not load governed knowledge for this topic.' })
        return
      }
      setState({ kind: 'loaded', result: data })
    } catch {
      setState({ kind: 'error', message: 'Could not load governed knowledge for this topic.' })
    }
  }, [submissionId, topic])

  return (
    <div className="text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs" style={{ color: '#83837e' }}>
          Topic
        </label>
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value as GoalCategory)}
          className="rounded border px-2 py-1 text-sm"
          style={{ borderColor: '#e0ddd2', backgroundColor: '#fff' }}
        >
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={lookUp}
          disabled={state.kind === 'loading'}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: '#1c1c1e' }}
        >
          {state.kind === 'loading' ? 'Looking up…' : 'Look up governed knowledge'}
        </button>
      </div>

      {state.kind === 'error' ? (
        <p className="mt-3 text-sm" style={{ color: '#9a3b2f' }}>{state.message}</p>
      ) : null}

      {state.kind === 'loaded' ? (
        <div className="mt-3">
          <p className="text-xs" style={{ color: '#83837e' }}>{REVIEWER_LK_FRAMING.applicability_note}</p>
          <p className="mt-1 text-xs" style={{ color: '#83837e' }}>
            Retrieval context (submission facts — not evidence): tools{' '}
            {state.result.retrieval_context.resolved_tool_ids.join(', ') || '—'} · jurisdiction{' '}
            {state.result.retrieval_context.jurisdiction_included.join(', ') || '—'}
          </p>

          {state.result.claims.length === 0 ? (
            <p className="mt-3 text-sm" style={{ color: '#83837e' }}>
              No reviewer-eligible governed knowledge matched this topic and the submission’s resolved context.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {state.result.claims.map((c) => (
                <ClaimCard key={c.claim_id} claim={c} />
              ))}
            </ul>
          )}

          {state.result.withheld.length > 0 ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs" style={{ color: '#4a4a52' }}>
                {state.result.withheld.length} governed claim(s) on this topic withheld from reviewer research
              </summary>
              <ul className="mt-1 space-y-1 pl-4">
                {state.result.withheld.map((w) => (
                  <li key={w.claim_id} className="text-xs" style={{ color: '#83837e' }}>
                    <span className="font-mono">{w.claim_id}</span> — {WITHHELD_LABEL[w.reason]}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
