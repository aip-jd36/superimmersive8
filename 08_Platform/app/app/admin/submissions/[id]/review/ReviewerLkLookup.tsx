'use client'

/**
 * Reviewer Living Knowledge look-up (CAH-4E §14; presentation reworked CAH-4F;
 * moved into the inspector's "Living Knowledge" tab in CAH-4F.1).
 *
 * Deliberate, on-demand only. Initial state is a topic picker + a button —
 * NOTHING is fetched on mount, on inspector open, or on tab switch. One click
 * issues exactly one GET to the audited `/reviewer-lk` endpoint (which writes
 * one `lk_research` access event before returning any governed content).
 *
 * Presentation rules (PRD_CAH_4F_REVIEWER_RESOURCES.md §7–§9, refined CAH-4F.1):
 *   - the topic picker shows reviewer-readable labels; the value sent to the
 *     API is the unchanged `GoalCategory` enum string;
 *   - each result renders, in this order:
 *       proposition → Applicability → Context used for this look-up →
 *       Why this applies → Evidence limitations / unresolved requirements →
 *       Provenance and governance details;
 *   - the governed proposition is visually primary;
 *   - Applicability has an explicit heading; "Not established" is neutral
 *     (grey text weight), never a red/green pass/fail;
 *   - the CRC-channel governance prose `crc_publication_scope` is NOT rendered
 *     as reviewer authority text, and `crc_eligible` is NOT shown.
 *
 * No generated prose, no ranking, no "apply" / "copy to evidence" / "accept" /
 * "summarize". No <input>/<textarea>. Shares no state with the workbook.
 */

import { useCallback, useRef, useState } from 'react'
import type { GoalCategory } from '@/types/interview-engine'
import { REVIEWER_LK_FRAMING } from '@/lib/reviewer-lk/project-reviewer-claims'
import { reviewerTopicLabel } from '@/lib/reviewer-lk/topic-labels'
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

/** Reviewer-readable topic chips. `data-topic` carries the canonical enum. */
function TopicChips({
  topics,
  value,
  onChange,
}: {
  topics: readonly GoalCategory[]
  value: GoalCategory
  onChange: (t: GoalCategory) => void
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const idx = topics.indexOf(value)
  const moveTo = (next: number) => {
    const n = (next + topics.length) % topics.length
    onChange(topics[n])
    refs.current[n]?.focus()
  }
  return (
    <div role="radiogroup" aria-label="Topic" className="flex flex-wrap gap-1.5">
      {topics.map((t, i) => {
        const active = t === value
        return (
          <button
            key={t}
            ref={(el) => { refs.current[i] = el }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            data-topic={t}
            onClick={() => onChange(t)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); moveTo(idx + 1) }
              else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); moveTo(idx - 1) }
            }}
            className="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
            style={
              active
                ? { borderColor: '#233f66', backgroundColor: '#233f66', color: '#ffffff' }
                : { borderColor: '#d9d6cc', backgroundColor: '#ffffff', color: '#4a4a52' }
            }
          >
            {reviewerTopicLabel(t)}
          </button>
        )
      })}
    </div>
  )
}

function Disclosure({
  label,
  count,
  children,
}: {
  label: string
  count?: number
  children: React.ReactNode
}) {
  return (
    <details className="mt-2 border-t pt-2" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
      <summary className="flex cursor-pointer items-center justify-between text-xs font-medium" style={{ color: '#4a4a52' }}>
        <span>{label}</span>
        {typeof count === 'number' ? (
          <span
            className="ml-2 rounded-full px-1.5 text-[10px]"
            style={{ backgroundColor: 'rgba(0,0,0,0.06)', color: '#4a4a52' }}
          >
            {count}
          </span>
        ) : null}
      </summary>
      <div className="mt-1.5">{children}</div>
    </details>
  )
}

function RequirementRow({ o }: { o: ReviewerLkClaim['applicability_outcomes'][number] }) {
  return (
    <li>
      {o.requirement.fact}
      {o.requirement.tool ? ` (${o.requirement.tool})` : ''} {o.requirement.operator}{' '}
      &ldquo;{o.requirement.value}&rdquo; — <span className="font-medium">{o.status}</span>
    </li>
  )
}

function ClaimCard({
  claim,
  context,
}: {
  claim: ReviewerLkClaim
  context: { tools: string[]; jurisdiction: string[] }
}) {
  const unresolved = claim.applicability_outcomes.filter((o) => o.status !== 'met')
  const limitationCount = unresolved.length + claim.unresolved_project_dependencies.length

  return (
    <li className="rounded-md border p-3" style={{ borderColor: '#e0ddd2', backgroundColor: '#fdfcf9' }}>
      {/* 1 — the governed proposition leads, visually primary */}
      {claim.statement ? (
        <p className="text-[15px] leading-relaxed font-display" style={{ color: '#1c1c1e' }}>
          {claim.statement}
        </p>
      ) : (
        <p className="text-sm italic" style={{ color: '#83837e' }}>
          No published statement — consult the governed ledger entry (see provenance details).
        </p>
      )}

      {/* 2 — Applicability (explicit heading, neutral styling, status only) */}
      <div className="mt-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#83837e' }}>
          Applicability
        </h4>
        <p className="mt-1 text-xs" style={{ color: '#4a4a52' }}>
          <span
            className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
            style={{ backgroundColor: claim.applicability_established ? '#233f66' : '#c9c6bc' }}
          />
          <span style={{ color: claim.applicability_established ? '#1c1c1e' : '#83837e' }}>
            {claim.applicability_established ? 'Established' : 'Not established'}
          </span>{' '}
          for this submission.
        </p>
        {claim.applicability_outcomes.length === 0 ? (
          <p className="mt-0.5 text-xs" style={{ color: '#83837e' }}>No additional applicability requirements.</p>
        ) : !claim.applicability_established ? (
          <p className="mt-0.5 text-xs" style={{ color: '#83837e' }}>
            {'A required fact is unresolved or does not match this submission’s context — this is not a negative finding.'}
          </p>
        ) : null}
      </div>

      {/* 3 — Context used for this look-up */}
      <div className="mt-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#83837e' }}>
          Context used for this look-up
        </h4>
        <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs" style={{ color: '#4a4a52' }}>
          <div>
            <dt className="text-[10px] uppercase tracking-wide" style={{ color: '#9a988f' }}>Resolved tools</dt>
            <dd>{context.tools.join(', ') || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide" style={{ color: '#9a988f' }}>Jurisdiction</dt>
            <dd>{context.jurisdiction.join(', ') || '—'}</dd>
          </div>
        </dl>
        <p className="mt-1 text-[11px]" style={{ color: '#83837e' }}>
          Submission-derived inputs to retrieval — not assessment evidence.
        </p>
      </div>

      {/* 4 — Why this applies (the full deterministic requirement breakdown) */}
      {claim.applicability_outcomes.length > 0 ? (
        <Disclosure label="Why this applies">
          <ul className="list-disc pl-5 text-xs" style={{ color: '#4a4a52' }}>
            {claim.applicability_outcomes.map((o, i) => (
              <RequirementRow key={i} o={o} />
            ))}
          </ul>
        </Disclosure>
      ) : null}

      {/* 5 — Evidence limitations / unresolved requirements */}
      <Disclosure label="Evidence limitations / unresolved requirements" count={limitationCount}>
        {limitationCount === 0 ? (
          <p className="text-xs" style={{ color: '#83837e' }}>No unresolved requirements or governed project dependencies.</p>
        ) : (
          <>
            {unresolved.length > 0 ? (
              <ul className="list-disc pl-5 text-xs" style={{ color: '#4a4a52' }}>
                {unresolved.map((o, i) => (
                  <RequirementRow key={i} o={o} />
                ))}
              </ul>
            ) : null}
            {claim.unresolved_project_dependencies.length > 0 ? (
              <p className="mt-1 text-xs" style={{ color: '#83837e' }}>
                Governed project dependencies (informational): {claim.unresolved_project_dependencies.join(', ')}
              </p>
            ) : null}
          </>
        )}
      </Disclosure>

      {/* 6 — Provenance and governance details */}
      <Disclosure label="Provenance and governance details">
        <div className="space-y-1 text-xs" style={{ color: '#83837e' }}>
          <div>
            <span className="font-mono">{claim.claim_id}</span> · {claim.claim_character} · {claim.jurisdiction} ·{' '}
            {claim.lifecycle} · scope: {claim.publication_scope}
            {claim.last_verified ? ` · verified ${claim.last_verified}` : ''}
          </div>
          {claim.provider_scope || claim.tool_scope ? (
            <div>
              {claim.provider_scope ? `Provider scope: ${claim.provider_scope.join(', ')}` : ''}
              {claim.provider_scope && claim.tool_scope ? ' · ' : ''}
              {claim.tool_scope ? `Tool scope: ${claim.tool_scope.join(', ')}` : ''}
            </div>
          ) : null}
          <div>
            Full governed record: <span className="font-mono">{claim.governed_claims_reference}</span>
          </div>
        </div>
      </Disclosure>
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
      <p className="text-xs font-semibold" style={{ color: '#4a4a52' }}>1. Select a topic</p>
      <div className="mt-1.5">
        <TopicChips topics={topics} value={topic} onChange={setTopic} />
      </div>

      <p className="mt-3 text-xs font-semibold" style={{ color: '#4a4a52' }}>2. Look up governed knowledge</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={lookUp}
          disabled={state.kind === 'loading'}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: '#233f66' }}
        >
          {state.kind === 'loading' ? 'Looking up…' : 'Look up governed knowledge'}
        </button>
        <span className="text-xs" style={{ color: '#83837e' }}>
          Topic: {reviewerTopicLabel(topic)}
        </span>
      </div>

      {state.kind === 'error' ? (
        <p className="mt-3 text-sm" style={{ color: '#9a3b2f' }}>{state.message}</p>
      ) : null}

      {state.kind === 'loaded' ? (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs" style={{ color: '#83837e' }}>
            <span>
              {state.result.claims.length} result{state.result.claims.length === 1 ? '' : 's'}
            </span>
            <button
              type="button"
              onClick={() => setState({ kind: 'idle' })}
              className="font-medium hover:underline"
              style={{ color: '#233f66' }}
            >
              Clear results
            </button>
          </div>
          <p className="mt-1 text-[11px] italic" style={{ color: '#83837e' }}>
            Reference only — not assessment evidence. {REVIEWER_LK_FRAMING.applicability_note}
          </p>

          {state.result.claims.length === 0 ? (
            <p className="mt-3 text-sm" style={{ color: '#83837e' }}>
              No reviewer-eligible governed knowledge matched this topic and the submission&rsquo;s resolved context.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {state.result.claims.map((c) => (
                <ClaimCard
                  key={c.claim_id}
                  claim={c}
                  context={{
                    tools: state.result.retrieval_context.resolved_tool_ids,
                    jurisdiction: state.result.retrieval_context.jurisdiction_included,
                  }}
                />
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
