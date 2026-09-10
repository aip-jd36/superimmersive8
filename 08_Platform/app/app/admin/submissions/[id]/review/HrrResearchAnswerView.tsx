/**
 * HrrResearchAnswerView — the ONE presentation of an `HrrResearchAnswer`
 * (CAH-4G.6). BOTH entry modes (topic shortcut, Ask HRR) render through this
 * component — there is no `TopicResearchResultView` / `QuestionResearchResultView`
 * split, and no topic-specific branch.
 *
 * It PRESENTS the already-bounded, already-composed structured answer. It never
 * reinterprets: no re-ranking, no re-evaluated applicability, no new prose. Every
 * string it renders comes verbatim from `HrrResearchAnswer` (Slice 4 fixed
 * templates + verbatim governed statements + verbatim BI blocks + mechanical
 * enumerations). The reviewer question appears only where the answer already
 * carries it (`question_text`), attributed.
 *
 * Consultative hierarchy (Slice 4 §I, PRD A–G), meaning before metadata:
 *   orientation → what governed knowledge says → for this submission →
 *   what remains unresolved → does not apply → research boundary →
 *   [provenance & governance, progressive]
 * Empty sections are omitted — never rendered as an empty heading.
 *
 * NEUTRAL styling only. No pass/fail colour, no ✓/✗, no "PASS"/"FAIL". No
 * `crc_eligible`, no raw `crc_publication_scope` (the contract does not carry
 * them). No "copy to evidence" / "apply" / "accept" affordance. This is
 * reference material, not assessment evidence.
 */

import type { GoalCategory } from '@/types/interview-engine'
import { reviewerTopicLabel } from '@/lib/reviewer-lk/topic-labels'
import type {
  HrrAnswerTopic,
  HrrApplicabilityRollup,
  HrrGovernedConsideration,
  HrrResearchAnswer,
} from '@/lib/hrr/types'
import type { ApplicabilityRequirement } from '@/lib/retrieval-engine/types'

const INK = '#1c1c1e'
const INK_SOFT = '#4a4a52'
const MUTED = '#83837e'
const LINE = 'rgba(0,0,0,0.08)'
const ACCENT = '#233f66'

function requirementText(r: ApplicabilityRequirement): string {
  return `${r.fact}${r.tool ? ` (${r.tool})` : ''} ${r.operator} “${r.value}”`
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
      {children}
    </h4>
  )
}

/** Per-claim applicability + provenance — the governed statement itself is already shown verbatim in `bi_summary_blocks`, so it is NOT repeated here. */
function ClaimProvenanceRow({ c }: { c: HrrGovernedConsideration }) {
  return (
    <li className="text-xs" style={{ color: INK_SOFT }}>
      <span className="font-mono">{c.claim_id}</span> ·{' '}
      <span style={{ color: c.applicability_established ? INK : MUTED }}>
        applicability {c.applicability_established ? 'established' : 'not established'}
      </span>
      {c.applicability_outcomes.length > 0 && (
        <ul className="mt-0.5 list-disc pl-5" style={{ color: MUTED }}>
          {c.applicability_outcomes.map((o, i) => (
            <li key={i}>
              {requirementText(o.requirement)} — <span className="font-medium">{o.status}</span>
            </li>
          ))}
        </ul>
      )}
      {c.unresolved_project_dependencies.length > 0 && (
        <p className="mt-0.5" style={{ color: MUTED }}>
          Governed project dependencies (informational): {c.unresolved_project_dependencies.join(', ')}
        </p>
      )}
      <p className="mt-0.5" style={{ color: MUTED }}>
        Governed record: <span className="font-mono">{c.governed_claims_reference}</span>
      </p>
    </li>
  )
}

/** A claim that does NOT apply — shown WITH its statement (it is not in `bi_summary_blocks`). */
function DoesNotApplyClaim({ c }: { c: HrrGovernedConsideration }) {
  return (
    <li className="rounded-md border p-3" style={{ borderColor: '#e0ddd2', backgroundColor: '#f6f5f0' }}>
      {c.statement_verbatim ? (
        <p className="text-sm leading-relaxed font-display" style={{ color: INK_SOFT }}>
          {c.statement_verbatim}
        </p>
      ) : (
        <p className="text-sm italic" style={{ color: MUTED }}>
          No published statement — consult the governed ledger entry.
        </p>
      )}
      <ul className="mt-1.5 list-disc pl-5 text-xs" style={{ color: MUTED }}>
        {c.applicability_outcomes.map((o, i) => (
          <li key={i}>
            {requirementText(o.requirement)} — <span className="font-medium">{o.status}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[11px]" style={{ color: MUTED }}>
        <span className="font-mono">{c.claim_id}</span> · <span className="font-mono">{c.governed_claims_reference}</span>
      </p>
    </li>
  )
}

function ApplicabilityRollupView({ a }: { a: HrrApplicabilityRollup }) {
  const groups: Array<{ label: string; items: ApplicabilityRequirement[] }> = [
    { label: 'Established for this submission', items: a.established },
    { label: 'Not yet established', items: a.unresolved },
    { label: 'Confirmed not to apply', items: a.not_met },
  ].filter((g) => g.items.length > 0)
  if (groups.length === 0) return null
  return (
    <div>
      <SectionHeading>For this submission</SectionHeading>
      <div className="mt-1 space-y-1.5 text-xs" style={{ color: INK_SOFT }}>
        {groups.map((g) => (
          <div key={g.label}>
            <span style={{ color: MUTED }}>{g.label}:</span>{' '}
            {g.items.map((r) => requirementText(r)).join('; ')}
          </div>
        ))}
      </div>
      <p className="mt-1 text-[11px]" style={{ color: MUTED }}>
        Applicability is evaluated deterministically against the submission&rsquo;s structured facts — not assessment evidence.
      </p>
    </div>
  )
}

function TopicBlock({ topic }: { topic: HrrAnswerTopic }) {
  return (
    <section
      aria-label={`Governed research — ${topic.topic_label}`}
      className="rounded-md border p-3"
      style={{ borderColor: LINE, backgroundColor: '#ffffff' }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
        {topic.topic_label}
        {topic.intent_origin === 'interpreted_question' ? ' · interpreted from your question' : ''}
      </p>

      {/* A — orientation, prominent */}
      <p className="mt-1.5 text-sm font-medium leading-relaxed" style={{ color: INK }}>
        {topic.orientation}
      </p>

      {/* B — what the governed knowledge says: the verbatim Bounded Interpretation
             reading is the primary text; each contributing governed claim's
             per-claim applicability + provenance sits behind a disclosure (the
             statement itself is already in the reading above — never repeated). */}
      {topic.bi_summary_blocks.map((block, i) => (
        <p key={i} className="mt-2 text-sm leading-relaxed" style={{ color: INK_SOFT }}>
          {block}
        </p>
      ))}
      {topic.governed_considerations.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs" style={{ color: INK_SOFT }}>
            Governed claims — applicability &amp; provenance ({topic.governed_considerations.length})
          </summary>
          <ul className="mt-1.5 space-y-2">
            {topic.governed_considerations.map((c) => (
              <ClaimProvenanceRow key={c.claim_id} c={c} />
            ))}
          </ul>
        </details>
      )}

      {/* C — submission applicability rollup */}
      <ApplicabilityRollupView a={topic.applicability} />

      {/* D — what remains unresolved (before provenance) */}
      {topic.unresolved_inputs.length > 0 && (
        <div>
          <SectionHeading>What remains unresolved</SectionHeading>
          <ul className="mt-1.5 space-y-1.5 text-xs" style={{ color: INK_SOFT }}>
            {topic.unresolved_inputs.map((u, i) => (
              <li key={i}>
                <span className="font-mono">{u.identifier}</span> — {u.note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* E — does not apply (neutral, not a finding) */}
      {topic.does_not_apply.length > 0 && (
        <div>
          <SectionHeading>Does not apply to this submission</SectionHeading>
          {topic.does_not_apply_note && (
            <p className="mt-1 text-xs" style={{ color: MUTED }}>
              {topic.does_not_apply_note}
            </p>
          )}
          <ul className="mt-1.5 space-y-2">
            {topic.does_not_apply.map((c) => (
              <DoesNotApplyClaim key={c.claim_id} c={c} />
            ))}
          </ul>
        </div>
      )}

      {/* F — research / authority boundary */}
      <p className="mt-3 border-t pt-2 text-xs" style={{ borderColor: LINE, color: MUTED }}>
        {topic.boundary_note}
      </p>

      {/* G — provenance & governance, progressive */}
      {(topic.governed_claim_refs.length > 0 || topic.withheld.length > 0) && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs" style={{ color: INK_SOFT }}>
            Provenance &amp; governance details
          </summary>
          <div className="mt-1 space-y-1 text-xs" style={{ color: MUTED }}>
            {topic.governed_claim_refs.length > 0 && (
              <div>
                Governed records:{' '}
                {topic.governed_claim_refs.map((ref, i) => (
                  <span key={ref}>
                    {i > 0 ? ', ' : ''}
                    <span className="font-mono">{ref}</span>
                  </span>
                ))}
              </div>
            )}
            {topic.withheld.length > 0 && (
              <div>
                {topic.withheld.length} governed claim(s) on this topic are not reviewer-eligible:
                <ul className="mt-0.5 list-disc pl-5">
                  {topic.withheld.map((w) => (
                    <li key={w.claim_id}>
                      <span className="font-mono">{w.claim_id}</span> — {w.reason.replace(/_/g, ' ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}
    </section>
  )
}

export function HrrResearchAnswerView({
  answer,
  onResearchTopic,
}: {
  answer: HrrResearchAnswer
  /** Optional — makes "offered research paths" clickable. Pure navigation; no reinterpretation. */
  onResearchTopic?: (topic: GoalCategory) => void
}) {
  return (
    <div className="space-y-3">
      {answer.question_text && (
        <p className="text-xs italic" style={{ color: MUTED }}>
          You asked: &ldquo;{answer.question_text}&rdquo;
        </p>
      )}

      {/* Lane 1 — assessment-authority boundary, visually distinct */}
      {answer.assessment_authority_note && (
        <div
          role="note"
          aria-label="Assessment authority boundary"
          className="rounded-md border-l-2 px-3 py-2 text-sm leading-relaxed"
          style={{ borderColor: ACCENT, backgroundColor: '#eef2f8', color: '#33415c' }}
        >
          {answer.assessment_authority_note}
        </div>
      )}

      {answer.scope_note && (
        <p className="text-xs" style={{ color: MUTED }}>
          {answer.scope_note}
        </p>
      )}

      {/* Lane 2 — governed research, one block per researched clause */}
      {answer.topics.map((topic) => (
        <TopicBlock key={topic.topic} topic={topic} />
      ))}

      {/* Offered research paths (unsupported / authority-only without a topic) */}
      {answer.offered_research_paths && answer.offered_research_paths.length > 0 && (
        <div>
          <SectionHeading>Try a governed research topic</SectionHeading>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {answer.offered_research_paths.map((t) =>
              onResearchTopic ? (
                <button
                  key={t}
                  type="button"
                  data-topic={t}
                  onClick={() => onResearchTopic(t)}
                  className="rounded-full border px-3 py-1 text-xs font-medium"
                  style={{ borderColor: '#d9d6cc', backgroundColor: '#ffffff', color: INK_SOFT }}
                >
                  {reviewerTopicLabel(t)}
                </button>
              ) : (
                <span
                  key={t}
                  className="rounded-full border px-3 py-1 text-xs"
                  style={{ borderColor: '#d9d6cc', color: INK_SOFT }}
                >
                  {reviewerTopicLabel(t)}
                </span>
              ),
            )}
          </div>
        </div>
      )}

      <p className="border-t pt-2 text-[11px] leading-relaxed" style={{ borderColor: LINE, color: MUTED }}>
        {answer.reviewer_responsibility_note}
      </p>
    </div>
  )
}
