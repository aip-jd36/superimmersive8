/**
 * CR-V2-MVP-LAUNCH-FOUNDATION-1 — renders an approved legal document, or a fixed "not available yet" notice. Never draft text.
 * Server component: no client code, no data fetching.
 */
import { legalPageContent, type ApprovedLegalDocument } from '@/lib/legal/policies'

export function LegalDocumentPage({ doc, fallbackTitle }: { doc: ApprovedLegalDocument | null; fallbackTitle: string }) {
  const content = legalPageContent(doc)
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {content.available ? (
        <article>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{content.doc.title}</h1>
          <p className="text-sm text-gray-500 mb-6">Version {content.doc.version} · Effective {content.doc.effective_date}</p>
          {content.doc.paragraphs.map((p, i) => <p key={i} className="text-gray-800 mb-4 whitespace-pre-line">{p}</p>)}
        </article>
      ) : (
        <section>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{fallbackTitle}</h1>
          <p className="text-gray-700" data-legal-unavailable>This document is not available yet.</p>
        </section>
      )}
    </main>
  )
}
