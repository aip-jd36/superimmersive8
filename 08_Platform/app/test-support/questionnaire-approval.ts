/**
 * Test fixtures only (never imported by application code): marks a test's governed sources as approved, so tests that are
 * about something else can pass the questionnaire contract gate (CR-V2-DECL-1B-1). A test that changes its sources afterwards
 * is refused unless it approves them again, as a real change would be.
 */
import { loadQuestionRegistry } from '@/lib/creator-record/contract/question-registry'
import { questionnaireContract, QUESTIONNAIRE_CONTRACT_ID, type QuestionnaireContractApproval } from '@/lib/creator-record/customer-record/questionnaire-contract'
import { sourceTextContent, sourceTextDigest } from '@/lib/creator-record/customer-record/source-text'
import type { CreatorRecordSources } from '@/lib/creator-record/prototype/build-draft'

/** The acknowledgement wording the Creator Record test fixtures share. */
export const fixtureAcknowledgements = (s: CreatorRecordSources): Record<string, string> =>
  Object.fromEntries(s.acknowledgement_ids.map((id) => [id, `Synthetic acknowledgement ${id} (test fixture only).`]))

export function questionnaireApprovalFor(s: CreatorRecordSources, acknowledgements: Readonly<Record<string, string>> = fixtureAcknowledgements(s), over: Partial<QuestionnaireContractApproval> = {}): QuestionnaireContractApproval {
  const loaded = loadQuestionRegistry(s.registry_input)
  if (!loaded.ok) throw new Error(`fixture registry rejected: ${loaded.errors.join('; ')}`)
  const built = questionnaireContract(s, sourceTextDigest(sourceTextContent(s, loaded.registry, acknowledgements)))
  if (!built.ok) throw new Error(`fixture contract refused: ${JSON.stringify(built)}`)
  return { contract_id: QUESTIONNAIRE_CONTRACT_ID, contract_version: 1, contract_sha256: built.sha256, lifecycle: 'approved', authority: 'SYNTHETIC TEST AUTHORITY (fixture only)', decision_date: '2026-10-30', review_ref: 'SYNTHETIC-CONTRACT-REVIEW-1', ...over }
}

export const withQuestionnaireApproval = <S extends CreatorRecordSources>(s: S, acknowledgements?: Readonly<Record<string, string>>): S => ({ ...s, questionnaire_approval: questionnaireApprovalFor(s, acknowledgements) })
