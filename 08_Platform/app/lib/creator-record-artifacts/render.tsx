/**
 * CR-ARTIFACT-1 — render the Creator Record PDF bytes for a private artifact.
 *
 * Same template and the same field mapping as the legacy generator
 * (`lib/pdf/generateChainOfTitle.tsx` → `generateCreatorRecordPDF`, and
 * `lib/payments/fulfillment-deps.ts`). This milestone changes only where the
 * PDF is stored and how it is delivered, not its content; content changes
 * (LD fixes, Option C) are separate milestones. The legacy generator is left
 * untouched so ordinary customers are unaffected before cutover.
 */

import type React from 'react'
import { renderToStream } from '@react-pdf/renderer'
import { CreatorRecordPDF } from '@/lib/pdf/CreatorRecordPDF'
import type { FulfillmentSubmission } from '@/lib/payments/repository'

type CreatorRecordData = React.ComponentProps<typeof CreatorRecordPDF>['data']

const parseJsonb = (val: unknown, fallback: any) => {
  if (!val) return fallback
  if (typeof val === 'string') {
    try {
      return JSON.parse(val)
    } catch {
      return fallback
    }
  }
  return val
}

export function creatorRecordPdfData(sub: FulfillmentSubmission, recordId: string, issuedAt: Date): CreatorRecordData {
  return {
    creatorRecordId: recordId,
    filmmakerName: sub.filmmaker_name || 'Unknown',
    title: sub.title || 'Untitled',
    issuedAt: issuedAt.toISOString(),
    tools: parseJsonb(sub.tools_used, []),
    authorshipStatement: sub.authorship_statement || undefined,
    likenessConfirmation: parseJsonb(sub.likeness_confirmation, {}),
    ipConfirmation: parseJsonb(sub.ip_confirmation, {}),
    territory: sub.territory_preferences || 'Global',
    // CR-PDF-DECLARATIONS-1: passed as recorded; the renderer treats anything but strict true as not recorded.
    custodianDeclaration: sub.custodian_declaration,
    indemnificationConfirmed: sub.indemnification_confirmed,
  }
}

export async function renderCreatorRecordPdf(sub: FulfillmentSubmission, recordId: string, issuedAt: Date): Promise<Uint8Array> {
  const stream = await renderToStream(<CreatorRecordPDF data={creatorRecordPdfData(sub, recordId, issuedAt)} />)
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  return new Uint8Array(Buffer.concat(chunks))
}
