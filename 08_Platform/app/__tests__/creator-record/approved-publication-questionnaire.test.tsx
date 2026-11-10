/**
 * CR-V2-MVP-LEGAL-CONTENT-6 — the questionnaire a customer sees with the founder-approved governance content: every approved
 * question, and A2 (Terms agreement and Privacy Notice acknowledgement) as an unticked, required checkbox, followed by working
 * links to the published Terms and Privacy Notice. The record of A2 is the existing acknowledgement mechanism (tested elsewhere).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { CreatorRecordQuestionnaire } from '@/components/creator-record/CreatorRecordQuestionnaire'
import { approvedCustomerRecordInputs } from '@/lib/creator-record/customer-flow/approved-inputs'
import { CUSTOMER_SECTION_TITLES } from '@/lib/creator-record/prototype/questionnaire-structure'
import { validateForm } from '@/lib/creator-record/prototype/form'
import { loadFormConfig } from '@/lib/creator-record/prototype/build-draft'
import { EXAM_TEXT } from '@/lib/creator-record-flow/examination-ui'

const inputs = approvedCustomerRecordInputs()
const html = renderToStaticMarkup(
  <CreatorRecordQuestionnaire
    registryInput={inputs.sources.registry_input}
    presentation={inputs.sources.presentation}
    sectionTitles={CUSTOMER_SECTION_TITLES}
    acknowledgements={inputs.source_text!.acknowledgements}
    maxTools={inputs.sources.max_tools}
    submitting={false}
    issues={[]}
    onSubmit={() => undefined}
  />,
)
const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

describe('the approved questionnaire as rendered', () => {
  test('A2 is shown in full, unticked, with the Terms and Privacy links after it', () => {
    const a2 = inputs.source_text!.acknowledgements.A2
    expect(a2).toMatch(/I agree to the Creator Record Terms of Service and acknowledge that I have read the Privacy Notice\.$/)
    const at = html.indexOf(escape(a2).replace(/’/g, '’'))
    expect(at).toBeGreaterThan(-1)
    const links = html.indexOf('data-legal-links')
    expect(links).toBeGreaterThan(at)
    expect(html.slice(links)).toMatch(/href="\/privacy"[^>]*>privacy notice<\/a>/)
    expect(html.slice(links)).toMatch(/href="\/terms"[^>]*>terms<\/a>/)
    expect(html).toContain(EXAM_TEXT.legal_links_intro)
    // Nothing is pre-ticked.
    expect(html).not.toMatch(/type="checkbox"[^>]*checked=""/)
  })

  test('A2 is required: a version cannot be prepared until it is ticked', () => {
    const config = loadFormConfig(inputs.sources)
    const unticked = validateForm(config, { answers: {}, tools: [{}], acknowledgements: { A1: true } })
    expect(unticked).toContainEqual(expect.objectContaining({ q_id: 'A2', issue: 'acknowledgement_required' }))
  })
})
