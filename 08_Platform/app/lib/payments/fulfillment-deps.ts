/**
 * CAA-SECURITY-3B — production wiring for runPaymentFulfillment().
 */
import {
  claimFulfillment, markFulfillmentStep, finishFulfillment, loadFulfillmentSubmission,
  hasCreatorRecordPdf, loadUserContact, type FulfillmentSubmission,
} from './repository'
import type { FulfillmentDeps } from './run-payment-fulfillment'
import { generateCreatorRecordPDF } from '@/lib/pdf/generateChainOfTitle'
import {
  sendCreatorRecordReadyPaymentEmail, sendCertifiedPaymentReceivedEmail,
  notifyAdminPaymentFulfillment, sendPaymentLedgerAdminAlert,
} from '@/lib/emails'

const parseJsonb = (val: unknown, fallback: any) => {
  if (!val) return fallback
  if (typeof val === 'string') { try { return JSON.parse(val) } catch { return fallback } }
  return val
}

async function generateFromSubmission(sub: FulfillmentSubmission): Promise<void> {
  await generateCreatorRecordPDF({
    submissionId: sub.id,
    filmmakerName: sub.filmmaker_name || 'Unknown',
    title: sub.title || 'Untitled',
    tools: parseJsonb(sub.tools_used, []),
    authorshipStatement: sub.authorship_statement || undefined,
    likenessConfirmation: parseJsonb(sub.likeness_confirmation, {}),
    ipConfirmation: parseJsonb(sub.ip_confirmation, {}),
    territory: sub.territory_preferences || 'Global',
  })
}

export function productionFulfillmentDeps(): FulfillmentDeps {
  return {
    claim: claimFulfillment,
    markStep: (s, t, step, status, providerId = null, errorText = null) =>
      markFulfillmentStep(s, t, step, status, providerId, errorText),
    finish: finishFulfillment,
    loadSubmission: loadFulfillmentSubmission,
    hasCreatorRecordPdf,
    generateCreatorRecordPdf: generateFromSubmission,
    loadUserContact,
    sendCreatorRecordEmail: sendCreatorRecordReadyPaymentEmail,
    sendCertifiedReceivedEmail: sendCertifiedPaymentReceivedEmail,
    notifyAdmin: notifyAdminPaymentFulfillment,
    alert: sendPaymentLedgerAdminAlert,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://app.superimmersive8.com',
  }
}
