/**
 * Reviewer CRC Context panel (CAH-4B §10).
 *
 * A read-only SERVER component rendered as a SIBLING of `<WorkbookClient>` on
 * the review page — never a WorkbookClient field or section, never part of
 * workbook form state. Being a server component, it is structurally incapable
 * of sharing client state with the workbook.
 *
 * It shows only:
 *   - that a linked CRC conversation exists, and its association provenance
 *     (a permission fact, never ownership; the raw transcript is NOT exposed —
 *     that is CAH-4C);
 *   - the customer's explicit CRC goals;
 *   - a bounded, non-interpreting projection of what the customer described;
 *   - superseded / corrected context where present;
 *   - a neutral "unchanged / changed / comparison unavailable" state marker.
 *
 * No editable control. No save. No "copy to evidence" / "apply" / "accept".
 * No finding/outcome suggestion. Collapsed by default; renders nothing when
 * there is no linked CRC.
 */

import { checkReviewerContextAccess } from '@/lib/reviewer-context/auth'
import { getReviewerCrcContext } from '@/lib/reviewer-context/service'
import type { CrcStateComparison, ReviewerCrcContextItem } from '@/lib/reviewer-context/types'

const NOT_EVIDENCE_NOTICE =
  'Customer-provided CRC context — not verified, and not assessment evidence. It does not affect controls, evidence, gaps, findings, outcome, confidence, or sign-off.'

function stateComparisonLabel(c: CrcStateComparison): string {
  switch (c) {
    case 'unchanged':
      return 'CRC project state is unchanged since it was linked.'
    case 'changed':
      return 'CRC project state has changed since it was linked. The context below reflects the current CRC state.'
    case 'comparison_unavailable':
      return 'State comparison unavailable (knowledge-canonicalization version differs, or the stored state could not be read).'
  }
}

function AssociationBlock({ item, index }: { item: ReviewerCrcContextItem; index: number }) {
  const { provenance, project, state_comparison } = item
  return (
    <div
      className="mt-4 first:mt-0 rounded-md border p-3"
      style={{ borderColor: '#e0ddd2', backgroundColor: '#fdfcf9' }}
    >
      <div className="text-xs" style={{ color: '#83837e' }}>
        Linked CRC conversation {index + 1} · linked by the customer via{' '}
        <span className="font-mono">{provenance.authorization_basis}</span> ·{' '}
        {new Date(provenance.associated_at).toISOString().slice(0, 10)}
      </div>
      <div className="mt-1 text-xs" style={{ color: '#4a4a52' }}>
        {stateComparisonLabel(state_comparison)}
      </div>

      {project == null ? (
        <p className="mt-3 text-sm" style={{ color: '#83837e' }}>
          CRC project context is unavailable for this conversation.
        </p>
      ) : (
        <div className="mt-3 space-y-3 text-sm">
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#83837e' }}>
              Customer&rsquo;s stated goals
            </h4>
            {project.goals.length === 0 ? (
              <p style={{ color: '#83837e' }}>No explicit goal captured.</p>
            ) : (
              <ul className="mt-1 list-disc pl-5 space-y-1">
                {project.goals.map((g, i) => (
                  <li key={i}>
                    <span style={{ color: '#1c1c1e' }}>&ldquo;{g.raw_text}&rdquo;</span>{' '}
                    <span style={{ color: '#83837e' }}>
                      [{g.category} · {g.scope} · {g.state}]
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {project.assertions.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#83837e' }}>
                Project context, as the customer described it
              </h4>
              <ul className="mt-1 space-y-1">
                {project.assertions.map((a, i) => (
                  <li key={i}>
                    <span style={{ color: '#83837e' }}>{a.kind}:</span>{' '}
                    <span style={{ color: '#1c1c1e' }}>{a.stated}</span>{' '}
                    <span className="text-xs" style={{ color: '#83837e' }}>
                      [{a.state}
                      {a.canonical_id ? ` · ${a.canonical_id}` : ''}]
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {project.correction_history.length > 0 && (
            <details>
              <summary className="cursor-pointer text-xs" style={{ color: '#4a4a52' }}>
                Correction history ({project.correction_history.length})
              </summary>
              <ul className="mt-1 space-y-1 pl-4">
                {project.correction_history.map((h, i) => (
                  <li key={i} className="text-xs" style={{ color: '#83837e' }}>
                    {h.kind}: &ldquo;{h.stated}&rdquo; (superseded)
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

export async function ReviewerCrcContextPanel({ submissionId }: { submissionId: string }) {
  const access = await checkReviewerContextAccess()
  if (!access.ok) return null

  const context = await getReviewerCrcContext(submissionId)
  if (!context.linked) return null

  return (
    <div className="max-w-2xl mx-auto px-8 pt-6">
      <details
        className="rounded-lg border"
        style={{ borderColor: '#e0ddd2', backgroundColor: '#f7f5ef' }}
      >
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium" style={{ color: '#1c1c1e' }}>
          Linked CRC context ({context.associations.length})
          <span className="block mt-0.5 text-xs font-normal" style={{ color: '#83837e' }}>
            {NOT_EVIDENCE_NOTICE}
          </span>
        </summary>
        <div className="px-4 pb-4">
          {context.associations.map((item, i) => (
            <AssociationBlock key={item.provenance.association_id} item={item} index={i} />
          ))}
        </div>
      </details>
    </div>
  )
}
