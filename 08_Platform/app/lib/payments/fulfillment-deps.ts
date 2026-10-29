/**
 * CAA-SECURITY-3B — production wiring for runPaymentFulfillment().
 */
import {
  claimFulfillment, markFulfillmentStep, finishFulfillment, loadFulfillmentSubmission,
  loadUserContact, type FulfillmentSubmission,
} from './repository'
import type { FulfillmentDeps } from './run-payment-fulfillment'
import { generateCreatorRecordPDF } from '@/lib/pdf/generateChainOfTitle'
import { creatorRecordComplete, issueCreatorRecord } from '@/lib/creator-record-artifacts/production'
import {
  sendCreatorRecordReadyPaymentEmail, sendCertifiedPaymentReceivedEmail,
  notifyAdminPaymentFulfillment, sendPaymentLedgerAdminAlert,
} from '@/lib/emails'

const parseJsonb = (val: unknown, fallback: any) => {
  if (!val) return fallback
  if (typeof val === 'string') { try { return JSON.parse(val) } catch { return fallback } }
  return val
}

/** Exported for the CR-PDF-DECLARATIONS-1 wiring test only. */
export async function generateFromSubmission(sub: FulfillmentSubmission): Promise<void> {
  await generateCreatorRecordPDF({
    submissionId: sub.id,
    filmmakerName: sub.filmmaker_name || 'Unknown',
    title: sub.title || 'Untitled',
    tools: parseJsonb(sub.tools_used, []),
    authorshipStatement: sub.authorship_statement || undefined,
    likenessConfirmation: parseJsonb(sub.likeness_confirmation, {}),
    ipConfirmation: parseJsonb(sub.ip_confirmation, {}),
    territory: sub.territory_preferences || 'Global',
    custodianDeclaration: sub.custodian_declaration,
    indemnificationConfirmed: sub.indemnification_confirmed,
  })
}

export function productionFulfillmentDeps(): FulfillmentDeps {
  return {
    claim: claimFulfillment,
    markStep: (s, t, step, status, providerId = null, errorText = null) =>
      markFulfillmentStep(s, t, step, status, providerId, errorText),
    finish: finishFulfillment,
    loadSubmission: loadFulfillmentSubmission,
    // CR-ARTIFACT-1: explicit precedence (private artifact → legacy PDF → rollout gate → legacy generator).
    // Ordinary customers stay on the legacy generator until cutover (lib/creator-record-artifacts/config.ts).
    hasCreatorRecordPdf: creatorRecordComplete,
    generateCreatorRecordPdf: (sub) => issueCreatorRecord(sub, () => generateFromSubmission(sub)),
    loadUserContact,
    sendCreatorRecordEmail: sendCreatorRecordReadyPaymentEmail,
    sendCertifiedReceivedEmail: sendCertifiedPaymentReceivedEmail,
    notifyAdmin: notifyAdminPaymentFulfillment,
    alert: sendPaymentLedgerAdminAlert,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://app.superimmersive8.com',
  }
}
