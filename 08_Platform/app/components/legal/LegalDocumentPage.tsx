/**
 * CR-V2-MVP-LAUNCH-FOUNDATION-1 — renders an approved legal document, or a fixed "not available yet" notice. Never draft text.
 * Server component: no client code, no data fetching.
 *
 * SI8-PRIVACY-CRC-3: optional `lang`, `labels` and `before` (a slot above the document, e.g. a language selector) let the CRC
 * notice render in Traditional Chinese. Without them the output is exactly as before (Creator Record /privacy and /terms).
 */
import type { ReactNode } from 'react'
import { legalPageContent, type ApprovedLegalDocument } from '@/lib/legal/policies'

export interface LegalDocumentLabels {
  /** The line under the title, e.g. "Version x · Effective y". */
  meta: (version: string, effectiveDate: string) => string
  unavailable: string
}

export const DEFAULT_LEGAL_DOCUMENT_LABELS: LegalDocumentLabels = {
  meta: (version, effectiveDate) => `Version ${version} · Effective ${effectiveDate}`,
  unavailable: 'This document is not available yet.',
}

export function LegalDocumentPage({
  doc,
  fallbackTitle,
  lang,
  labels = DEFAULT_LEGAL_DOCUMENT_LABELS,
  before,
}: {
  doc: ApprovedLegalDocument | null
  fallbackTitle: string
  lang?: string
  labels?: LegalDocumentLabels
  before?: ReactNode
}) {
  const content = legalPageContent(doc)
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10" {...(lang ? { lang } : {})}>
      {before}
      {content.available ? (
        <article>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{content.doc.title}</h1>
          <p className="text-sm text-gray-500 mb-6">{labels.meta(content.doc.version, content.doc.effective_date)}</p>
          {content.doc.paragraphs.map((p, i) => <p key={i} className="text-gray-800 mb-4 whitespace-pre-line">{p}</p>)}
        </article>
      ) : (
        <section>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{fallbackTitle}</h1>
          <p className="text-gray-700" data-legal-unavailable>{labels.unavailable}</p>
        </section>
      )}
    </main>
  )
}
