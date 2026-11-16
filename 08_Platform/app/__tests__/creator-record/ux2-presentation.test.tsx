/**
 * SI8-UX-2 — rendered presentation of the redesigned Creator Record page (static markup: the repo has no DOM test environment;
 * interaction is proven on the pure reducers and in the browser harness).
 *
 * Proves: the stepped questionnaire shows one governed section per step with its governed title, and the single page is unchanged
 * when `stepped` is off; documents are managed inside the tool section; D10 — no reading value, comparison, discrepancy,
 * verification indicator or suggested correction is rendered anywhere in the form, and readings stay in the separate review view;
 * storage consent and AI permission are separate, explicit and use the approved wording; a document that needs a choice shows the
 * notice and no pre-selected link; a full tool is not offered; payment still opens Stripe-hosted Checkout; the wording guard covers
 * the new components.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { CreatorRecordQuestionnaire } from '@/components/creator-record/CreatorRecordQuestionnaire'
import { RecordDocuments, ToolDocuments, type DocumentsContext } from '@/components/creator-record/ToolDocuments'
import type { CreatorRecordDocuments } from '@/components/creator-record/useCreatorRecordDocuments'
import { approvedCustomerRecordInputs } from '@/lib/creator-record/customer-flow/approved-inputs'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV } from '@/lib/creator-record/governed/sources'
import { CUSTOMER_SECTION_TITLES } from '@/lib/creator-record/prototype/questionnaire-structure'
import { associationReducer, EMPTY_ASSOCIATIONS, type AssociationEvent } from '@/lib/creator-record-flow/document-associations'
import { COMPARISON_LABELS, EXAM_LIVE_TEXT, EXAM_TEXT, OBSERVATION_STATUS_LABELS, RESPONSE_LABELS } from '@/lib/creator-record-flow/examination-ui'
import { PANEL_TEXT, QUESTIONNAIRE_CHROME } from '@/lib/creator-record-flow/wording'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { GUARDED, checkCustomerWording } = require('../../scripts/customer-wording-check.js')

const sources = approvedCustomerRecordInputs(GOV).sources
const ACKS = GOV.acknowledgements as Record<string, string>
const decode = (html: string) => html.replace(/&quot;/g, '"').replace(/&#x27;/g, '\'').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const text = (html: string) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ')

const questionnaire = (over: Record<string, unknown> = {}) => renderToStaticMarkup(
  <CreatorRecordQuestionnaire
    registryInput={sources.registry_input}
    presentation={sources.presentation as never}
    sectionTitles={CUSTOMER_SECTION_TITLES}
    acknowledgements={ACKS}
    maxTools={sources.max_tools}
    submitting={false}
    issues={[]}
    onSubmit={() => undefined}
    {...over}
  />,
)

const D = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const stored = (n: number) => ({ id: D(n), file_name: `ux2-synthetic-receipt-${n}.pdf`, media_type: 'application/pdf', byte_size: 1000, sha256: 'a'.repeat(64), created_at: '2026-11-16T00:00:00Z' })
function ctx(events: AssociationEvent[], o: { toolCount?: number; examined?: string[]; live?: boolean } = {}): DocumentsContext {
  const docs: CreatorRecordDocuments = {
    documents: [1, 2, 3, 4, 5].map(stored), loading: false, listError: null, reload: async () => undefined,
    upload: async () => ({ ok: false, error: 'x' }), examine: async () => undefined,
    examination: Object.fromEntries((o.examined ?? []).map((id) => [id, { kind: 'done', result: 'existing' } as const])),
  }
  return { state: events.reduce(associationReducer, EMPTY_ASSOCIATIONS), dispatch: () => undefined, docs, toolCount: o.toolCount ?? 2, textMode: o.live === false ? 'replay' : 'live', aiPermissionRequired: o.live !== false }
}
const add = (n: number, tool_index: number | null): AssociationEvent => ({ kind: 'add', document_id: D(n), category: 'billing_receipt', tool_index })

describe('stepped questionnaire', () => {
  test('first step: the governed "Your video" section only, the step status, and no later section or acknowledgement', () => {
    const t = text(questionnaire({ stepped: true }))
    expect(t).toContain('Step 1 of 7')
    expect(t).toContain(CUSTOMER_SECTION_TITLES.project)
    expect(t).toContain('What is the title of the video?')
    expect(t).not.toContain('Which AI tool did you use?')
    expect(t).not.toContain(ACKS.A1)
    expect(t).toContain(QUESTIONNAIRE_CHROME.continue)
    expect(t).not.toContain(QUESTIONNAIRE_CHROME.submit)
    // Every step is listed by its governed title, in order.
    const order = ['project', 'locations', 'tools', 'people', 'materials', 'contribution'].map((s) => t.indexOf(CUSTOMER_SECTION_TITLES[s]))
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  test('the last step carries the approved acknowledgements and the existing submit; a blocked submission shows why and is disabled', () => {
    const html = questionnaire({ stepped: true, initialStep: 'acknowledgements', submitBlocked: true })
    const t = text(html)
    expect(t).toContain('Step 7 of 7')
    expect(t).toContain(ACKS.A1)
    expect(t).toContain(ACKS.A2)
    expect(t).toContain(QUESTIONNAIRE_CHROME.submit_blocked)
    expect(html).toMatch(/<button type="submit" disabled=""/)
  })

  test('without `stepped` the single page is unchanged: every section and the acknowledgements, and no step navigation', () => {
    const t = text(questionnaire())
    for (const s of ['project', 'locations', 'tools', 'people', 'materials', 'contribution']) expect(t).toContain(CUSTOMER_SECTION_TITLES[s])
    expect(t).toContain(ACKS.A1)
    expect(t).not.toContain('Step 1 of 7')
  })

  test('the tools step hosts the caller\'s documents inside each tool block', () => {
    const c = ctx([add(1, 0)])
    const html = questionnaire({ stepped: true, initialStep: 'tools', renderToolDocuments: (i: number) => <ToolDocuments ctx={c} toolIndex={i} /> })
    expect(html).toMatch(/data-tool-block="0"[\s\S]*data-tool-documents="0"/)
    expect(text(html)).toContain('ux2-synthetic-receipt-1.pdf')
  })
})

describe('documents in the tool section (D10: no reading content)', () => {
  const ALL_READING_LABELS = [...Object.values(COMPARISON_LABELS), ...Object.values(OBSERVATION_STATUS_LABELS), EXAM_TEXT.findings_title, EXAM_TEXT.comparisons_title, EXAM_TEXT.limitations_title, PANEL_TEXT.table_appears, PANEL_TEXT.comparison_provider + ':', ...Object.values(RESPONSE_LABELS)]

  test('an examined document shows only that it was read; no value, comparison, verification or correction is rendered', () => {
    const html = renderToStaticMarkup(<ToolDocuments ctx={ctx([add(1, 0), add(2, 0)], { examined: [D(1)] })} toolIndex={0} />)
    const t = text(html)
    expect(t).toContain(EXAM_LIVE_TEXT.examined)
    for (const label of ALL_READING_LABELS) expect(t).not.toContain(label)
    expect(t).not.toMatch(/verified|matches your|discrepanc|does not match|suggest/i)
  })

  test('storage consent and AI permission are separate statements with the approved wording, and nothing is pre-ticked', () => {
    const html = renderToStaticMarkup(<ToolDocuments ctx={ctx([add(2, 0)])} toolIndex={0} />)
    const t = text(html)
    expect(t).toContain(EXAM_TEXT.ai_permission_label)
    expect(html).not.toMatch(/checked=""/)
    // The storage consent is asked only when adding a document (the upload panel), never implied by a stored one.
    expect(t).not.toContain(EXAM_LIVE_TEXT.consent_label)
    expect(t).toContain(PANEL_TEXT.add_new_document)
    expect(t).toContain(PANEL_TEXT.choose_existing)
  })

  test('without a live examination no AI permission statement is shown and the replay wording applies', () => {
    const t = text(renderToStaticMarkup(<ToolDocuments ctx={ctx([add(2, 0)], { live: false })} toolIndex={0} />))
    expect(t).not.toContain(EXAM_TEXT.ai_permission_label)
    expect(t).toContain(EXAM_TEXT.examine)
  })

  test('a document whose tool changed shows the notice and no pre-selected link', () => {
    const html = renderToStaticMarkup(<ToolDocuments ctx={ctx([add(1, 0), { kind: 'tool_identity_changed', index: 0 }])} toolIndex={0} />)
    expect(text(html)).toContain(PANEL_TEXT.needs_choice_changed)
    expect(html).toMatch(/<option value="" selected="">Choose…<\/option>/)
  })

  test('a tool already holding two documents is not offered to another document', () => {
    const html = renderToStaticMarkup(<RecordDocuments ctx={ctx([add(1, 0), add(2, 0), add(3, null)])} includeExaminations={false} onIncludeExaminationsChange={() => undefined} />)
    expect(html).toMatch(/<option value="0" disabled="">Tool 1<\/option>/)
    expect(html).toMatch(/<option value="1">Tool 2<\/option>/)
  })

  test('after the tools: documents needing a choice, documents not linked, and the existing record-level reading switch', () => {
    const t = text(renderToStaticMarkup(<RecordDocuments ctx={ctx([add(1, 0), add(3, null), { kind: 'tool_removed', index: 0 }], { toolCount: 1 })} includeExaminations={false} onIncludeExaminationsChange={() => undefined} />))
    expect(t).toContain(PANEL_TEXT.needs_choice_heading)
    expect(t).toContain(PANEL_TEXT.needs_choice_removed)
    expect(t).toContain(PANEL_TEXT.unlinked_heading)
    expect(t).toContain(EXAM_LIVE_TEXT.include_label)
    expect(t).toContain(EXAM_LIVE_TEXT.include_note)
  })
})

describe('contracts the page keeps', () => {
  const client = readFileSync(path.join(__dirname, '../../app/creator-record/CreatorRecordV2Client.tsx'), 'utf8')
  test('payment still opens Stripe-hosted Checkout through the existing routes; no card field exists on the page', () => {
    expect(client).toContain('/api/creator-record-v2/prepared/${view.id}/purchase')
    expect(client).toContain("fetch('/api/checkout/create-session'")
    expect(client).toContain('window.location.assign(session.url)')
    for (const f of ['app/creator-record/CreatorRecordV2Client.tsx', 'components/creator-record/ToolDocuments.tsx', 'components/creator-record/CreatorRecordQuestionnaire.tsx']) {
      expect(readFileSync(path.join(__dirname, '../..', f), 'utf8')).not.toMatch(/card ?number|cvc|cardnumber|stripe\.elements/i)
    }
  })

  test('the reading view is still only the prepared version\'s examination review, and it still offers responses', () => {
    expect(client).toContain('<ExaminationReview')
    expect(client).not.toContain('EvidencePanel')
    const review = readFileSync(path.join(__dirname, '../../components/creator-record/ExaminationReview.tsx'), 'utf8')
    expect(review).toContain('EXAM_TEXT.record_responses')
    expect(review).not.toContain('comparisons_title')
  })

  test('preparation is never sent while a document needs a choice', () => {
    expect(client).toContain('serializeAttachments(associations, state.tools.length)')
    expect(client).toMatch(/submitBlocked=\{props\.examination !== undefined && unresolvedDocuments\(associations\)\.length > 0\}/)
  })

  test('the wording guard covers the new components and passes', () => {
    const files = GUARDED.map((g: { file: string }) => g.file)
    expect(files).toEqual(expect.arrayContaining(['components/creator-record/ToolDocuments.tsx', 'components/creator-record/useCreatorRecordDocuments.ts', 'components/creator-record/CreatorRecordQuestionnaire.tsx', 'app/creator-record/CreatorRecordV2Client.tsx']))
    expect(checkCustomerWording(path.join(__dirname, '../..'))).toEqual([])
  })
})
