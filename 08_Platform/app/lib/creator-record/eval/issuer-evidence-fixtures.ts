/**
 * CRV2-IA-4D2 — synthetic issuer-evidence fixtures (reading contract v3). This file is the SOURCE of the fixture set.
 *
 * CRV2-IA-4D3 S2b: the documents are rendered by the existing generator (`fixtures/generate_receipt_fixtures.py`, `lines` template)
 * from `fixtures/issuer-evidence-fixtures.json`, which is exported from this file (`export-issuer-evidence-spec.ts`; a test pins the
 * two as identical), and every rendered document's SHA-256 is pinned in `fixtures/issuer-evidence-fixtures.document-hashes.json`.
 *
 * Every document is fictional, synthetic and marked as such. Each fixture lists the lines its document prints and the v3 truth:
 * the statements a correct reading reports and the issuer state the shared rule must derive from them. The documents are not yet
 * rendered (the existing generator renders them before any paid evaluation run, which needs separate authorization); nothing here
 * calls a model. Business names are fictional except where a fixture needs a product or provider mention (the same names the
 * existing receipt fixtures already use). No rule anywhere depends on these names.
 */

import type { IssuerEvidenceState, IssuerStatementRole } from '../receipt-examination/issuer-evidence'
import type { ReceiptExtraction } from '../receipt-examination/schema'

/** v2 (CRV2-IA-4D3 S2b): adds a document naming no business and a styled sender-only letterhead; v1's eight documents unchanged. */
export const ISSUER_EVIDENCE_FIXTURE_SET = { id: 'si8/creator-record-v2-issuer-evidence-fixtures', version: 2 } as const

export const SYNTHETIC_FOOTER = 'SYNTHETIC TEST DOCUMENT - NOT A REAL RECEIPT'

export interface IssuerEvidenceTruth {
  state: Exclude<IssuerEvidenceState, 'unclassified'>
  /** The attributed business when `identified`, else null. */
  business: string | null
  /** Every business the document names, with the role a correct reading gives it (order not significant). */
  statements: { business: string; role: IssuerStatementRole }[]
}

export interface IssuerEvidenceDocumentFixture {
  kind: 'document'
  id: string
  case: string
  /** The printed lines, in order (a renderer lays them out; the synthetic footer is always added). */
  lines: string[]
  /** A visually styled letterhead printed above the lines (name in large type, details beneath). Absent = no letterhead. */
  letterhead?: { name: string; details: string[] }
  truth: IssuerEvidenceTruth
}

/** A reading recorded under the earlier contract (v2): no issuer evidence. Every consumer must treat it as `unclassified`. */
export interface HistoricalReadingFixture {
  kind: 'historical_v2_reading'
  id: string
  case: string
  reading: ReceiptExtraction
}

export type IssuerEvidenceFixture = IssuerEvidenceDocumentFixture | HistoricalReadingFixture

const common = ['Subscription receipt (synthetic)', 'Receipt ID: SYN-IEV3-0001', 'Date: October 1, 2026', 'Amount: USD 15.00 (synthetic)']

export const ISSUER_EVIDENCE_FIXTURES: readonly IssuerEvidenceFixture[] = Object.freeze([
  {
    kind: 'document',
    id: 'iev3-provider-label-only',
    case: 'Provider or product mention without issuer attribution',
    lines: [...common, 'Provider: Runway', 'Plan: Standard'],
    truth: { state: 'not_attributed', business: null, statements: [{ business: 'Runway', role: 'mentioned_only' }] },
  },
  {
    kind: 'document',
    id: 'iev3-explicit-merchant',
    case: 'Explicit issuer or billing attribution',
    lines: [...common, 'Merchant of record: Northwind Studio Tools Ltd', 'Product: Northwind Studio Pro'],
    truth: {
      state: 'identified',
      business: 'Northwind Studio Tools Ltd',
      statements: [{ business: 'Northwind Studio Tools Ltd', role: 'issuer_attribution' }],
    },
  },
  {
    kind: 'document',
    id: 'iev3-issuer-disclaimer',
    case: 'Issuer disclaimer',
    lines: [...common, 'Provider: Runway', 'This document was not issued by Runway.'],
    truth: {
      state: 'denied',
      business: null,
      statements: [
        { business: 'Runway', role: 'mentioned_only' },
        { business: 'Runway', role: 'issuer_denied' },
      ],
    },
  },
  {
    kind: 'document',
    id: 'iev3-competing-issuers',
    case: 'Genuine competing issuer assertions',
    lines: [...common, 'Invoice issued by Alpha Media Ltd', 'This invoice is issued by Beta Studio GmbH'],
    truth: {
      state: 'conflicting',
      business: null,
      statements: [
        { business: 'Alpha Media Ltd', role: 'issuer_attribution' },
        { business: 'Beta Studio GmbH', role: 'issuer_attribution' },
      ],
    },
  },
  {
    kind: 'document',
    id: 'iev3-sender-distinct-from-merchant',
    case: 'Sender distinct from merchant',
    lines: ['Gamma Creative Agency Ltd', '12 Example Road, Example City', ...common, 'Billed by: Pika Labs, Inc.', 'Plan: Pro'],
    truth: {
      state: 'identified',
      business: 'Pika Labs, Inc.',
      statements: [
        { business: 'Gamma Creative Agency Ltd', role: 'sender_only' },
        { business: 'Pika Labs, Inc.', role: 'issuer_attribution' },
      ],
    },
  },
  {
    kind: 'document',
    id: 'iev3-sender-only',
    case: 'Letterhead or sender alone',
    lines: ['Delta Video Services Ltd', '34 Example Avenue, Example City', ...common, 'Plan: Pro'],
    truth: { state: 'not_attributed', business: null, statements: [{ business: 'Delta Video Services Ltd', role: 'sender_only' }] },
  },
  {
    kind: 'document',
    id: 'iev3-reseller-issued',
    case: 'Reseller-issued receipt',
    lines: [...common, 'Sold by: ResellerHub Payments Ltd', 'Item: Runway Pro (12 months, resold)'],
    truth: {
      state: 'identified',
      business: 'ResellerHub Payments Ltd',
      statements: [
        { business: 'ResellerHub Payments Ltd', role: 'issuer_attribution' },
        { business: 'Runway', role: 'mentioned_only' },
      ],
    },
  },
  {
    kind: 'document',
    id: 'iev3-app-store-merchant',
    case: 'App-store merchant',
    lines: [...common, 'App purchase receipt', 'Seller: Example App Marketplace Inc.', 'In-app subscription: Pika Pro'],
    truth: {
      state: 'identified',
      business: 'Example App Marketplace Inc.',
      statements: [
        { business: 'Example App Marketplace Inc.', role: 'issuer_attribution' },
        { business: 'Pika', role: 'mentioned_only' },
      ],
    },
  },
  {
    kind: 'document',
    id: 'iev3-no-business-named',
    case: 'Document naming no business',
    lines: ['Payment confirmation (synthetic)', 'Reference: SYN-IEV3-0002', 'Date: October 1, 2026', 'Amount: USD 15.00 (synthetic)', 'Plan: Standard'],
    truth: { state: 'missing', business: null, statements: [] },
  },
  {
    kind: 'document',
    id: 'iev3-styled-letterhead-sender-only',
    case: 'Visually realistic sender letterhead alone',
    letterhead: { name: 'Epsilon Post Studio Ltd', details: ['7 Example Lane, Example City', 'billing@epsilon-post.example', 'Company no. 00000000 (synthetic)'] },
    lines: [...common, 'Plan: Pro'],
    truth: { state: 'not_attributed', business: null, statements: [{ business: 'Epsilon Post Studio Ltd', role: 'sender_only' }] },
  },
  {
    kind: 'historical_v2_reading',
    id: 'iev3-historical-v2-reading',
    case: 'Historical v2 reading without issuer basis',
    // The shape of a real v2 reading of a "Provider: …" label: the model reported the provider as issuer.
    reading: {
      document_type: 'subscription_confirmation',
      readability: 'legible',
      issuer_name: { status: 'present', value: 'Runway', evidence: 'Provider: Runway' },
      product_or_plan_name: { status: 'present', value: 'Standard', evidence: 'Plan: Standard' },
      transaction_date: { status: 'present', value: '2026-10-01', evidence: 'Date: October 1, 2026' },
      service_period_start: { status: 'not_shown', value: null, evidence: null },
      service_period_end: { status: 'not_shown', value: null, evidence: null },
      plan_candidates: [{ text: 'Standard', evidence: 'Plan: Standard', context: 'other' }],
      multiple_plans_shown: false,
      instruction_like_text_present: false,
    },
  },
])
