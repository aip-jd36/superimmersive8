/**
 * Reviewer CRC Context view (CAH-4B §10; CAH-4F.1: moved into the inspector's
 * "Linked CRC Context" tab — the outer <details> disclosure is gone, the tab IS
 * the disclosure).
 *
 * A read-only SERVER component. Rendered as the `linkedCrcContext` slot of
 * `ReviewerResourcesInspector`, which sits in `ReviewerShell`'s inspector
 * region — a peer of, never a child of, `WorkbookClient`. Being a server
 * component, it is structurally incapable of sharing client state with the
 * workbook. Grouping it beside the Living Knowledge view is placement only —
 * the two remain different authorities (customer-provided context vs. governed
 * SI8 knowledge) with independent data paths and audits.
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
 * For a submission with NO linked CRC conversation it renders a NEUTRAL empty
 * state — a missing CRC is not an assessment deficiency, and the tab stays
 * present so the inspector's two-mode IA is stable per CAH-4F.1.
 *
 * No editable control. No save. No "copy to evidence" / "apply" / "accept".
 * No finding/outcome suggestion.
 */

import { checkReviewerContextAccess } from '@/lib/reviewer-context/auth'
import { getReviewerCrcContext } from '@/lib/reviewer-context/service'
import type { CrcStateComparison, ReviewerCrcContextItem } from '@/lib/reviewer-context/types'
import { ReviewerTranscriptDrawer } from './ReviewerTranscriptDrawer'

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

function AssociationBlock({
  item,
  index,
  submissionId,
}: {
  item: ReviewerCrcContextItem
  index: number
  submissionId: string
}) {
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

      {/* CAH-4C: deliberate, audited, on-demand transcript — does NOT load with the page. */}
      <ReviewerTranscriptDrawer submissionId={submissionId} associationId={provenance.association_id} />

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

  if (!context.linked) {
    return (
      <div>
        <p className="text-sm" style={{ color: '#4a4a52' }}>
          No CRC conversation is linked to this submission.
        </p>
        <p className="mt-1 text-xs" style={{ color: '#83837e' }}>
          A linked CRC conversation is optional customer/project context. Its absence is not an
          assessment deficiency and does not affect controls, evidence, gaps, findings, outcome,
          confidence, or sign-off.
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="mb-3 text-xs" style={{ color: '#83837e' }}>
        {NOT_EVIDENCE_NOTICE}
      </p>
      {context.associations.map((item, i) => (
        <AssociationBlock
          key={item.provenance.association_id}
          item={item}
          index={i}
          submissionId={submissionId}
        />
      ))}
    </div>
  )
}
