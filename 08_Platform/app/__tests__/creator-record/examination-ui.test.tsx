/**
 * CR-V2-EXAM-INTEGRATION-X3 — the creator examination experience: request bodies, refusal / retry states, and the
 * presentation of unverified observations, limitations, comparisons and version-specific responses (server-rendered
 * markup; the repo has no DOM test environment). The server behaviour is in customer-examination-record.test.ts.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import type { PreparedView } from '@/lib/creator-record/customer-flow/service'
import {
  EXAM_TEXT, LIMITATION_LABELS, X3_WORDING_STATUS, attachmentsOf, chosenResponses, examineStateFrom, preparedBody, targetKey, type ResponseInput,
} from '@/lib/creator-record-flow/examination-ui'
import { ExaminationReview } from '@/components/creator-record/ExaminationReview'
import { EvidencePanel } from '@/components/creator-record/EvidencePanel'

const APP = process.cwd()
const read = (rel: string) => readFileSync(path.join(APP, rel), 'utf8')
const DOC = '33333333-3333-4333-8333-333333333333'
const RUN = '44444444-4444-4444-8444-444444444444'
const STATE = { answers: { P1: ['x'] }, tools: [{ T1: ['kling'], T3: ['Pro'] }], acknowledgements: { A1: true } } as unknown as PreparedView['form_state']

function view(over: Partial<PreparedView> = {}): PreparedView {
  return {
    id: '00000002-aaaa-4aaa-8aaa-aaaaaaaaaaaa', draft_id: '00000001-aaaa-4aaa-8aaa-aaaaaaaaaaaa', version: 2, status: 'prepared', record_ref: 'PREP-x', created_at: '', reviewed_at: null, questionnaire_contract: { contract_id: 'c', contract_version: 1, contract_sha256: 'c'.repeat(64) },
    form_state: STATE,
    declarations: { answers: [{ q_id: 'T3', tool_index: 0, question: 'Plan?', answer: 'Pro' }], acknowledgements: [] },
    documents: [{ document_id: DOC, file_name: 'synthetic-receipt.png', media_type: 'image/png', byte_size: 10, sha256: 'a'.repeat(64), category: 'billing_receipt', tool_index: 0 }],
    guidance_items: 0,
    examination: {
      documents: [{
        document_id: DOC, run_id: RUN, verification: 'not_verified', outcome: { status: 'examined', reason: null },
        observations: [
          { observation_id: 'k:issuer_name:0', field: 'issuer_name', qualifier: null, basis: 'printed_text', status: 'present', value: 'Kling AI', excerpt: 'Kling AI Ltd', verification: 'not_verified' },
          { observation_id: 'k:billing_period:1', field: 'billing_period', qualifier: null, basis: 'printed_text', status: 'not_shown', value: null, excerpt: null, verification: 'not_verified' },
        ],
        limitations: ['recorded_test_data_not_model_output', 'observations_not_verified', 'some_future_code'],
      }],
      comparisons: [{ tool_index: 0, document_id: DOC, run_id: RUN, declared: { tool_id: 'kling', plan: 'Pro' }, provider: { result: 'appears_consistent', reason: 'r' }, plan: { result: 'appears_to_conflict', reason: 'r' } }],
      responses: [{ target: { kind: 'comparison', tool_index: 0, document_id: DOC, field: 'plan' }, code: 'other_plan_applies', given_in_version: 2 }],
      response_codes: ['reading_incorrect', 'wrong_document', 'other_plan_applies', 'not_relevant'],
      guidance: [],
    },
    ...over,
  }
}

describe('request bodies: only the keys the server accepts, never a projection, comparison or envelope', () => {
  test('preparedBody', () => {
    const atts = [{ document_id: DOC, category: 'billing_receipt', tool_index: 0 }]
    expect(preparedBody({ state: STATE, contractSha256: null, attachments: [], includeExaminations: false })).toEqual({ state: STATE })
    expect(preparedBody({ state: STATE, contractSha256: 'c'.repeat(64), attachments: [], includeExaminations: false })).toEqual({ state: STATE, questionnaire_contract_sha256: 'c'.repeat(64) })
    expect(preparedBody({ state: STATE, contractSha256: null, draftId: 'd', attachments: atts, includeExaminations: true })).toEqual({ state: STATE, draft_id: 'd', documents: atts, include_examinations: true })
    const r: ResponseInput[] = [{ target: { kind: 'comparison', tool_index: 0, document_id: DOC, field: 'plan' }, code: 'not_relevant' }]
    expect(preparedBody({ state: STATE, contractSha256: null, attachments: atts, includeExaminations: false, responses: r })).not.toHaveProperty('responses')
    const b = preparedBody({ state: STATE, contractSha256: null, attachments: atts, includeExaminations: true, responses: r })
    expect(Object.keys(b).sort()).toEqual(['documents', 'include_examinations', 'responses', 'state'])
    expect(JSON.stringify(b)).not.toMatch(/"(envelope|projection|comparison|examinations|uat_grant_id|nonce)":/)
  })

  test('responding re-sends exactly this version’s inputs; only valid closed codes on existing targets are sent', () => {
    const v = view()
    expect(attachmentsOf(v)).toEqual([{ document_id: DOC, category: 'billing_receipt', tool_index: 0 }])
    const choice = {
      [targetKey({ kind: 'observation', run_id: RUN, observation_id: 'k:issuer_name:0' })]: 'reading_incorrect',
      [targetKey({ kind: 'comparison', tool_index: 0, document_id: DOC, field: 'provider' })]: 'approved', // not a code
      [targetKey({ kind: 'observation', run_id: RUN, observation_id: 'not-in-this-version' })]: 'not_relevant', // not a target
    }
    expect(chosenResponses(choice, v)).toEqual([{ target: { kind: 'observation', run_id: RUN, observation_id: 'k:issuer_name:0' }, code: 'reading_incorrect' }])
    expect(chosenResponses(choice, view({ examination: undefined }))).toEqual([])
  })
})

describe('examination request states (loading, refusal, retry)', () => {
  test.each([
    [200, { examination: { run_id: RUN, result: 'created' } }, { kind: 'done', result: 'created' }],
    [200, { examination: { run_id: RUN, result: 'existing' } }, { kind: 'done', result: 'existing' }],
    [503, { code: 'unavailable', error: 'Document examination is not available right now.' }, { kind: 'refused', message: 'Document examination is not available right now.', retry: true }],
    [503, { code: 'submissions_stopped', error: 'Creator Record is not taking new submissions right now.' }, { kind: 'refused', message: 'Creator Record is not taking new submissions right now.', retry: false }],
    [409, { code: 'examination_not_permitted', error: 'Document examination is not available for this document.' }, { kind: 'refused', message: 'Document examination is not available for this document.', retry: false }],
    [404, { code: 'not_found', error: 'Not found.' }, { kind: 'refused', message: 'Not found.', retry: false }],
    [403, { code: 'not_invited', error: 'Creator Record is currently available by invitation only.' }, { kind: 'refused', message: 'Creator Record is currently available by invitation only.', retry: false }],
    [500, null, { kind: 'refused', message: 'Something went wrong. Nothing was changed.', retry: false }],
  ])('HTTP %s → %j', (status, json, expected) => {
    expect(examineStateFrom(status, json)).toEqual(expected)
  })
})

describe('presentation: unverified observations, limitations, comparisons, version-specific responses', () => {
  const html = renderToStaticMarkup(<ExaminationReview view={view()} busy={false} onRespond={() => undefined} />)

  test('observations are marked NOT verified, with what the document appears to show and its excerpt', () => {
    expect(html).toContain(EXAM_TEXT.findings_intro.replace(/’/g, '&#x27;').slice(0, 40).replace(/'/g, '&#x27;'))
    expect(html).toContain('data-not-verified')
    expect(html).toContain('Not verified')
    expect(html).toContain('Kling AI')
    expect(html).toContain('Not shown')
  })

  test('every limitation is shown in plain words; an unknown code is shown, never hidden', () => {
    expect(html).toContain(LIMITATION_LABELS.recorded_test_data_not_model_output)
    expect(html).toContain(LIMITATION_LABELS.observations_not_verified)
    expect(html).toContain('some_future_code')
  })

  test('comparisons show the declaration compared and a provisional label', () => {
    expect(html).toContain('you declared kling')
    expect(html).toContain('you declared Pro')
    expect(html).toContain('Appears consistent')
    expect(html).toContain('Appears to conflict')
  })

  test('a recorded response shows the version it was given in', () => {
    expect(html).toContain('Your response (version 2): A different plan applies')
  })

  test('no claim of clearance, verification, licence or legal assurance is made', () => {
    const text = html.replace(/<[^>]+>/g, ' ')
    expect(text).not.toMatch(/\b(cleared|verified licen|certified|approved for commercial|legally (safe|cleared)|guarantee)/i)
    expect(text).toMatch(/not a finding, a certification, a licence check or commercial clearance/)
  })

  test('earlier responses are offered for re-affirmation UNTICKED (no silent carry-forward)', () => {
    const v = view({ carry_forward_candidates: [{ target: { kind: 'comparison', tool_index: 0, document_id: DOC, field: 'plan' }, code: 'other_plan_applies' }] })
    const h = renderToStaticMarkup(<ExaminationReview view={v} busy={false} onRespond={() => undefined} />)
    const block = h.slice(h.indexOf('data-carry-forward'))
    expect(block).toContain('type="checkbox"')
    expect(block.slice(0, block.indexOf('</label>'))).not.toContain('checked')
  })

  test('a version without examination findings renders nothing', () => {
    expect(renderToStaticMarkup(<ExaminationReview view={view({ examination: undefined })} busy={false} onRespond={() => undefined} />)).toBe('')
  })

  test('the evidence panel lists documents with examine, link and include controls; never a grant, nonce or envelope', () => {
    const h = renderToStaticMarkup(
      <EvidencePanel consentVersion="DRAFT-UNAPPROVED-cr-v2-evidence-storage-consent-0" maxTools={2} attachments={[]} onAttachmentsChange={() => undefined}
        includeExaminations={false} onIncludeExaminationsChange={() => undefined}
        initialDocuments={[{ id: DOC, file_name: 'synthetic-receipt.png', media_type: 'image/png', byte_size: 10, sha256: 'a'.repeat(64), created_at: '' }]} />,
    )
    expect(h).toContain('synthetic-receipt.png')
    expect(h).toContain(EXAM_TEXT.examine)
    expect(h).toContain('Tool 2')
    expect(h).toContain(EXAM_TEXT.include_label)
    expect(h).not.toMatch(/uat_grant|nonce|envelope/i)
    const empty = renderToStaticMarkup(<EvidencePanel consentVersion="c" maxTools={1} attachments={[]} onAttachmentsChange={() => undefined} includeExaminations={false} onIncludeExaminationsChange={() => undefined} initialDocuments={[]} />)
    expect(empty).toContain(EXAM_TEXT.no_documents)
  })
})

describe('client and page boundaries', () => {
  const client = read('app/creator-record/CreatorRecordV2Client.tsx')
  const page = read('app/creator-record/page.tsx')
  const panel = read('components/creator-record/EvidencePanel.tsx')
  const review = read('components/creator-record/ExaminationReview.tsx')

  test('without examination: the plain prepare body, no panel, no review', () => {
    expect(client).toContain(": { state, questionnaire_contract_sha256: displayed.sha256, ...(view ? { draft_id: view.draft_id } : {}) })")
    expect(client).toMatch(/\{props\.examination && \(\s*<EvidencePanel/)
    expect(client).toContain('{view.examination && <ExaminationReview')
  })

  test('examination is offered only with an approval for the v6 record; the page gates are unchanged', () => {
    expect(page).toContain("if (deps.submissions !== 'open') return <Unavailable")
    expect(page.indexOf('deps.hasPilotAccess(userId)')).toBeGreaterThan(page.indexOf("if (deps.submissions !== 'open') return <Unavailable"))
    expect(page).not.toMatch(/syntheticUat|synthetic-uat/)
    expect(page).toContain('CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION }).ok')
    // CR-V2-MVP-LAUNCH-FOUNDATION-1 (8Q): the separate AI permission is added only when a live examination is offered.
    expect(page).toContain('? { examination: { consentVersion: EVIDENCE_CONSENT_DRAFT_VERSION, ...(customerLiveOffered() ? { aiPermissionVersion: AI_EXAMINATION_PERMISSION_DRAFT_VERSION } : {}) } }')
    expect(page).toMatch(/\.\.\.\(examinationOffered\s*\n?\s*\?/)
  })

  test('an examination-bearing version never offers payment', () => {
    expect(client).toContain('{reviewed && props.paymentOpen && !view.examination && (')
  })

  test('responses are recorded by the server (a new version), never kept as if recorded in the browser; nothing privileged is sent', () => {
    expect(client).toContain('includeExaminations: true, responses }))')
    for (const src of [client, panel, review]) {
      expect(src).not.toMatch(/localStorage|sessionStorage|indexedDB/)
      expect(src.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/uat_grant|nonce|service_role|SUPABASE|envelope_canonical/)
    }
    // CR-V2-MVP-LAUNCH-FOUNDATION-1 (8Q): an empty POST, or — only when live examination is offered — the permission alone.
    expect(panel).toContain("fetch(`${apiBase}/evidence/${id}/examination`, init)")
    expect(panel).toContain(": { method: 'POST' }")
    expect(panel).toContain('body: JSON.stringify({ ai_permission: props.aiPermissionVersion })')
    expect(panel).toContain("props.apiBase ?? '/api/creator-record-v2'")
    expect(panel).toContain("fetch(`${apiBase}/evidence`, { method: 'POST', body: form })")
  })

  test('no provider-specific branches in the experience', () => {
    for (const src of [panel, review, read('lib/creator-record-flow/examination-ui.ts')])
      expect(src).not.toMatch(/['"](kling|runway|pika|midjourney|elevenlabs|sora|veo|firefly)['"]/i)
  })

  test('the draft wording is marked as not approved', () => {
    expect(X3_WORDING_STATUS).toBe('draft_unapproved')
    expect(read('lib/creator-record-flow/examination-ui.ts')).toContain('WORDING STATUS: DRAFT, NOT APPROVED')
  })
})
