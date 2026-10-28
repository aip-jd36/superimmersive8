/**
 * CR-V2-VERTICAL-SLICE-1 — renders a draft Creator Record view model
 * (`lib/creator-record/presentation/build-draft-record.ts`).
 *
 * Presentational only: every string comes from the view model, which is built
 * from the creator's answers, the guidance pipeline's output, ledger text and
 * fixed templates. This component adds no wording of its own beyond neutral
 * structure (section frames), and never changes a conclusion. Intended for
 * reuse by the eventual customer product; the internal trace is rendered only
 * when `showTrace` is set.
 */

import type { DraftRecordView as View } from '@/lib/creator-record/presentation/build-draft-record'
import type { PublicUatView } from '@/lib/creator-record/public-uat/build-public-uat-draft'
import { groupGuidanceCards } from '@/lib/creator-record/presentation/group-guidance'
import { T } from '@/lib/creator-record/presentation/templates'

const INK = '#1a1918'
const MUTED = '#6b6560'
const LINE = 'rgba(0,0,0,0.08)'

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`record-${id}`} data-record-section={id} className="mb-6 rounded-lg border bg-white p-6" style={{ borderColor: LINE }}>
      <h2 id={`record-${id}`} className="font-display text-lg font-semibold mb-3" style={{ color: INK }}>{title}</h2>
      {children}
    </section>
  )
}

/** A visible field label, so each line of a card is identifiable as plain page text. */
function Field({ label, children, className = 'text-xs mt-2', id }: { label: string; children: React.ReactNode; className?: string; id?: string }) {
  return (
    <p className={className} id={id}>
      <span className="font-semibold">{label}: </span>
      {children}
    </p>
  )
}

/**
 * `view` is the admin prototype's view or the public UAT harness's view
 * (CR-V2-WORK-UAT-HARNESS-2: designation added, internal trace and identifiers
 * removed server-side). `showReferences` = false hides the per-card reference
 * line; `showTrace` renders the internal trace only when the view carries one.
 */
export function DraftRecordView({ view, showTrace = false, showReferences = true }: { view: View | PublicUatView; showTrace?: boolean; showReferences?: boolean }) {
  const trace = 'trace' in view ? view.trace : null
  return (
    <article style={{ color: INK }}>
      {view.banner && (
        <div className="mb-6 rounded-lg border p-4" style={{ backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }} role="note">
          <p className="text-sm font-semibold" style={{ color: '#92400E' }}>{view.banner.title}</p>
          {view.banner.lines.map((l) => (
            <p key={l} className="text-xs mt-1" style={{ color: '#92400E' }}>{l}</p>
          ))}
        </div>
      )}

      <header className="mb-6">
        <p className="text-xs uppercase tracking-wide" style={{ color: MUTED }}>{view.header.record_title} · {view.header.status}</p>
        <h1 className="font-display text-2xl font-bold mt-1">{view.header.title}</h1>
        <p className="text-xs mt-1" style={{ color: MUTED }}>{view.header.record_id} · version {view.header.version} · prepared {view.header.prepared_on}</p>
      </header>

      <Section id="summary" title={T.section_summary}>
        {view.summary.map((s) => <p key={s} className="text-sm mb-1">{s}</p>)}
      </Section>

      <Section id="declarations" title={T.section_declarations}>
        <p className="text-sm mb-4" style={{ color: MUTED }}>{view.declarations.intro}</p>
        {view.declarations.groups.map((g) => (
          <div key={g.id} className="mb-4">
            <h3 className="text-sm font-semibold mb-2">{g.heading}</h3>
            <dl className="text-sm">
              {g.rows.map((r, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-1.5 border-b" style={{ borderColor: LINE }}>
                  <dt style={{ color: MUTED }}>{r.label}</dt>
                  <dd className="sm:col-span-2">
                    {r.value}
                    {r.note && <span className="block text-xs mt-0.5" style={{ color: MUTED }}>{r.note}</span>}
                  </dd>
                </div>
              ))}
            </dl>
            {g.note && <p className="text-xs mt-2" style={{ color: MUTED }}>{g.note}</p>}
          </div>
        ))}
      </Section>

      <Section id="documents" title={T.section_documents}>
        <p className="text-sm mb-4" style={{ color: MUTED }}>{view.documents.intro}</p>
        {view.documents.empty && <p className="text-sm">{view.documents.empty}</p>}
        {view.documents.items.map((d) => (
          <article key={d.document_id} aria-labelledby={`doc-${d.document_id}`} data-document-id={d.document_id} className="mb-4 rounded-md border p-4" style={{ borderColor: LINE }}>
            <h3 id={`doc-${d.document_id}`} className="text-sm font-semibold">{d.heading}</h3>
            <dl className="text-xs mt-2">
              {d.rows.map((r) => (
                <div key={r.label} className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-1 border-b" style={{ borderColor: LINE }}>
                  <dt style={{ color: MUTED }}>{r.label}</dt>
                  <dd className="sm:col-span-2 break-words">
                    {r.value}
                    {r.note && <span className="block mt-0.5" style={{ color: MUTED }}>{r.note}</span>}
                  </dd>
                </div>
              ))}
            </dl>
            {d.notes.map((n) => <p key={n} className="text-xs mt-2">{n}</p>)}
          </article>
        ))}
      </Section>

      <Section id="reconciliation" title={T.section_reconciliation}>
        <p className="text-sm mb-4" style={{ color: MUTED }}>{view.reconciliation.intro}</p>
        {view.reconciliation.empty && <p className="text-sm">{view.reconciliation.empty}</p>}
        {view.reconciliation.items.map((r) => (
          <article key={r.tool_index} aria-labelledby={`recon-${r.tool_index}`} className="mb-4 rounded-md border p-4" style={{ borderColor: LINE }}>
            <h3 id={`recon-${r.tool_index}`} className="text-sm font-semibold">{r.heading}</h3>
            <dl className="text-xs mt-2">
              {r.rows.map((row) => (
                <div key={row.label} className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-1 border-b" style={{ borderColor: LINE }}>
                  <dt style={{ color: MUTED }}>{row.label}</dt>
                  <dd className="sm:col-span-2 break-words">
                    {row.value}
                    {row.note && <span className="block mt-0.5" style={{ color: MUTED }}>{row.note}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </Section>

      <Section id="guidance" title={T.section_guidance}>
        <p className="text-sm mb-4" style={{ color: MUTED }}>{view.guidance.intro}</p>
        {view.guidance.empty && <p className="text-sm">{view.guidance.empty}</p>}
        {/* CR-V2-MVP-17: cards grouped by subject; text identical on every card of a group is shown once for the group. */}
        {groupGuidanceCards(view.guidance.cards).map((g, gi) => (
          <section key={g.subject} aria-labelledby={`guidance-group-${gi}`} data-guidance-group={gi} className="mb-4 rounded-md border p-4" style={{ borderColor: LINE }}>
            <h3 id={`guidance-group-${gi}`} className="text-sm font-semibold">Guidance: {g.subject}</h3>
            {/* Shown once, directly under the heading: identical on every card of this group, so it applies to all of them. */}
            {g.shared_caveats.map((cv) => <Field key={cv} label="Caveat">{cv}</Field>)}
            {g.shared_source && <p className="text-xs mt-2" style={{ color: MUTED }}>{g.shared_source}</p>}
            {g.cards.map(({ card: c, own_caveats, show_own_source }) => (
              <article key={c.claim_id} aria-labelledby={`guidance-group-${gi} card-${c.claim_id}`} data-guidance-claim={c.claim_id} className="mt-3 border-t pt-3 first-of-type:border-t-0 first-of-type:pt-0" style={{ borderColor: LINE }}>
                <Field label="Relevance">{c.conclusion_label}</Field>
                <Field label="Guidance" className="text-sm mt-2" id={`card-${c.claim_id}`}>{c.explanation}</Field>
                {c.basis.map((b) => <Field key={b} label="Based on what you told us">{b}</Field>)}
                {c.depends_on.length > 0 && (
                  <div className="text-xs mt-2">
                    <span className="font-semibold">Depends on:</span>
                    <ul className="list-disc pl-5" style={{ color: MUTED }}>
                      {c.depends_on.map((d) => <li key={d}>{d}</li>)}
                    </ul>
                  </div>
                )}
                {own_caveats.map((cv) => <Field key={cv} label="Caveat">{cv}</Field>)}
                {show_own_source && <p className="text-xs mt-2" style={{ color: MUTED }}>{c.source}</p>}
                {showReferences && <p className="text-xs mt-1" style={{ color: MUTED }}>Reference: {c.claim_id}</p>}
              </article>
            ))}
          </section>
        ))}
      </Section>

      <Section id="open-items" title={T.section_open_items}>
        <p className="text-sm mb-4" style={{ color: MUTED }}>{view.open_items.intro}</p>
        {view.open_items.empty && <p className="text-sm">{view.open_items.empty}</p>}
        {view.open_items.not_established.length > 0 && (
          <div data-open-items-kind="not-established" className="mb-4">
            <h3 className="text-sm font-semibold mb-2">{T.not_established_heading}</h3>
            {view.open_items.not_established.map((n) => (
              <div key={n.key} data-not-established={n.key} className="mb-3 rounded-md border p-4 text-sm" style={{ borderColor: LINE }}>
                <h4 className="font-semibold">Open item: {n.label}</h4>
                <dl className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-1 text-xs">
                  <dt style={{ color: MUTED }}>What you told us</dt><dd className="sm:col-span-2">{n.told_us}</dd>
                  <dt style={{ color: MUTED }}>Status</dt><dd className="sm:col-span-2">{n.status}</dd>
                  <dt style={{ color: MUTED }}>Relates to</dt><dd className="sm:col-span-2">{n.for_guidance.join('; ')}</dd>
                </dl>
                {n.next && <p className="mt-2 text-xs" data-not-established-next>{n.next}</p>}
              </div>
            ))}
          </div>
        )}
        {view.open_items.items.length > 0 && view.open_items.not_established.length > 0 && <h3 className="text-sm font-semibold mb-2">{T.documents_needed_heading}</h3>}
        {view.open_items.items.map((o) => (
          <div key={o.dependency_id} data-open-item={o.dependency_id} className="mb-3 rounded-md border p-4 text-sm" style={{ borderColor: LINE }}>
            <h3 className="font-semibold">Open item: {o.label}</h3>
            <dl className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-1 text-xs">
              <dt style={{ color: MUTED }}>What you told us</dt><dd className="sm:col-span-2">{o.told_us}</dd>
              <dt style={{ color: MUTED }}>Documents</dt><dd className="sm:col-span-2">{o.documents}</dd>
              <dt style={{ color: MUTED }}>Evidence</dt><dd className="sm:col-span-2">{o.evidence}</dd>
              <dt style={{ color: MUTED }}>Sufficiency</dt><dd className="sm:col-span-2">{o.sufficiency}</dd>
              <dt style={{ color: MUTED }}>Status</dt><dd className="sm:col-span-2">{o.status}</dd>
              <dt style={{ color: MUTED }}>Relates to</dt><dd className="sm:col-span-2">{o.for_guidance.join('; ')}</dd>
            </dl>
          </div>
        ))}
        {view.open_items.documents_mentioned.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2">{T.existence_items_heading}</h3>
            {view.open_items.documents_mentioned.map((d) => (
              <p key={d.label} className="text-xs mb-1"><span style={{ color: MUTED }}>{d.label}</span> {d.note}</p>
            ))}
          </div>
        )}
      </Section>

      <Section id="not-included" title={T.section_not_shown}>
        {view.not_shown.intro && <p className="text-sm mb-2" style={{ color: MUTED }}>{view.not_shown.intro}</p>}
        {view.not_shown.lines.length > 0 && <ul className="text-sm list-disc pl-5">{view.not_shown.lines.map((l) => <li key={l}>{l}</li>)}</ul>}
        {view.not_shown.empty && <p className="text-sm">{view.not_shown.empty}</p>}
      </Section>

      <Section id="independent-review" title={T.section_independent_review}>
        <p className="text-sm mb-2" style={{ color: MUTED }}>{view.independent_review.intro}</p>
        <ul className="text-sm list-disc pl-5">{view.independent_review.lines.map((l) => <li key={l}>{l}</li>)}</ul>
      </Section>

      <Section id="not-done" title={T.section_not_done}>
        <ul className="text-sm list-disc pl-5">{view.not_done.map((l) => <li key={l}>{l}</li>)}</ul>
      </Section>

      <Section id="method" title={T.section_method}>
        <dl className="text-xs grid grid-cols-1 sm:grid-cols-3 gap-1">
          {view.method.map((m) => (
            <div key={m.label} className="contents">
              <dt style={{ color: MUTED }}>{m.label}</dt>
              <dd className="sm:col-span-2">{m.value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {showTrace && trace && 'trace' in view && (
        <details className="mb-6 rounded-lg border bg-white p-4 text-xs" style={{ borderColor: LINE }}>
          <summary className="cursor-pointer font-semibold">Internal UAT trace (not part of a record)</summary>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(trace, null, 2)}</pre>
          <p className="mt-3 font-semibold">Guidance provenance</p>
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(view.guidance.cards.map((c) => c.provenance), null, 2)}</pre>
        </details>
      )}
    </article>
  )
}
