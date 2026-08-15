/**
 * Results-email HTML + plain-text renderer (CRC Results Gate milestone,
 * 2026-08-14). Uses ONLY existing, already-computed ProjectionOutput
 * fields plus fixed product copy already approved elsewhere in this
 * product (the "How this understanding was built" paragraphs are copied
 * verbatim from CommercialAssuranceBridge.tsx, not rewritten) -- no new
 * content is invented, no risk score, no verdict language, no second
 * analysis. This module never calls a model and never touches Retrieval or
 * Projection itself; it only renders a ProjectionOutput the caller already
 * computed via the same pure runCRCConversation() GET uses.
 *
 * Deliberately excludes the Commercial Readiness Discovery educational
 * takeaway even when one occurred during the conversation -- it was
 * already delivered live, mid-chat, as its own transcript entry; it is not
 * part of ProjectionOutput's own contract, and pulling it in here would
 * mean reaching past Projection's clean content boundary for content some
 * users already read once and most sessions never trigger at all. Per PM
 * instruction, not reopened.
 *
 * Feedback is deliberately NOT included here in this milestone (PM
 * revision, 2026-08-14) -- the underlying feedback system is untouched,
 * just not wired into this new flow yet.
 *
 * "What this means for what you asked" section (CRC Milestone 2, User
 * Goal + Bounded Interpretation, 2026-08-15): renders
 * `output.goal_interpretations`, only when non-empty (the ordinary case
 * today, since goal capture remains incidental). Each item quotes the
 * user's own words verbatim ("You asked: ...") -- this "You asked:"
 * framing is composed HERE, at render time, not baked into
 * ProjectionOutput's own data (PM revision 6: preserve the user's wording,
 * never transform it into a stronger proposition) -- followed by the
 * fixed, bounded `summary` text lib/bounded-interpretation already
 * produced. No new content is invented here; this section only formats
 * two already-computed strings per item.
 */

import type { ProjectionOutput } from '@/lib/projection-layer/types'
import { buildCalendlyUrl } from './calendly-attribution'

function formatLastVerified(value: string | null): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

/** Same escaping discipline any HTML-email renderer needs -- ProjectionOutput text is user-influenced (derived from conversation content), never assume it's safe to inline raw. */
function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export interface ResultsEmailContent {
  html: string
  text: string
}

const HOW_BUILT_PARAGRAPH_1 =
  'This understanding came from what you shared in conversation — a fast, educational way to surface commercial-readiness considerations.'
const HOW_BUILT_PARAGRAPH_2 =
  "A Commercial Assurance Assessment works differently: an independent SI8 reviewer examines evidence like your files, licenses, and prompts, and produces an Assessment Report you can hand to a client, a platform, or legal."
const EDUCATIONAL_DISCLAIMER =
  'This is educational workflow guidance from a short conversation, not an SI8 Commercial Assurance Assessment. It does not provide legal advice or certify commercial use.'
const CTA_LABEL = 'Talk with SI8 about a Commercial Assurance Assessment'

export function buildResultsEmailContent(output: ProjectionOutput, attributionToken: string | null | undefined, email: string): ResultsEmailContent {
  const isFullyEmpty =
    output.opening_line === '' && output.understood_summary === '' && output.knowledge_items.length === 0 && output.goal_interpretations.length === 0
  const ctaUrl = buildCalendlyUrl(attributionToken, email)

  const htmlParts: string[] = []
  const textParts: string[] = []

  htmlParts.push('<h1 style="font-size:20px;margin:0 0 16px;color:#111;">Your Commercial Readiness Check</h1>')
  textParts.push('YOUR COMMERCIAL READINESS CHECK\n')

  if (isFullyEmpty) {
    const emptyLine =
      "The interview is complete. There wasn't enough information shared to generate a summary this time — nothing was lost, and you're welcome to start a new conversation whenever you'd like to share more."
    htmlParts.push(`<p style="font-size:14px;color:#555;margin:0 0 20px;">${escapeHtml(emptyLine)}</p>`)
    textParts.push(`${emptyLine}\n`)
  } else {
    if (output.opening_line !== '') {
      htmlParts.push(`<p style="font-size:16px;font-weight:600;margin:0 0 12px;color:#111;">${escapeHtml(output.opening_line)}</p>`)
      textParts.push(`${output.opening_line}\n`)
    }
    if (output.understood_summary !== '') {
      htmlParts.push(`<p style="font-size:14px;color:#444;white-space:pre-line;margin:0 0 20px;">${escapeHtml(output.understood_summary)}</p>`)
      textParts.push(`${output.understood_summary}\n`)
    }
    if (output.knowledge_items.length > 0) {
      for (const item of output.knowledge_items) {
        const lastUpdated = formatLastVerified(item.last_verified)
        htmlParts.push(
          `<div style="border:1px solid #e0e0e0;border-radius:6px;padding:14px 16px;margin:0 0 12px;">` +
            `<p style="font-size:14px;color:#222;white-space:pre-line;margin:0;">${escapeHtml(item.statement)}</p>` +
            (lastUpdated ? `<p style="font-size:12px;color:#888;margin:8px 0 0;">Content last updated ${escapeHtml(lastUpdated)}</p>` : '') +
            `</div>`,
        )
        textParts.push(`- ${item.statement}${lastUpdated ? ` (Content last updated ${lastUpdated})` : ''}\n`)
      }
    }
    if (output.goal_interpretations.length > 0) {
      htmlParts.push('<p style="font-size:14px;font-weight:600;margin:20px 0 8px;color:#111;">What this means for what you asked</p>')
      textParts.push('\nWHAT THIS MEANS FOR WHAT YOU ASKED\n')
      for (const item of output.goal_interpretations) {
        htmlParts.push(
          `<div style="border:1px solid #e0e0e0;border-radius:6px;padding:14px 16px;margin:0 0 12px;">` +
            `<p style="font-size:13px;font-style:italic;color:#555;margin:0 0 8px;">You asked: &ldquo;${escapeHtml(item.goal_text)}&rdquo;</p>` +
            `<p style="font-size:14px;color:#222;white-space:pre-line;margin:0;">${escapeHtml(item.summary)}</p>` +
            `</div>`,
        )
        textParts.push(`You asked: "${item.goal_text}"\n${item.summary}\n\n`)
      }
    }
  }

  htmlParts.push('<hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0;" />')
  htmlParts.push('<p style="font-size:14px;font-weight:600;margin:0 0 8px;color:#111;">How this understanding was built</p>')
  htmlParts.push(`<p style="font-size:13px;color:#555;margin:0 0 10px;">${escapeHtml(HOW_BUILT_PARAGRAPH_1)}</p>`)
  htmlParts.push(`<p style="font-size:13px;color:#555;margin:0 0 20px;">${escapeHtml(HOW_BUILT_PARAGRAPH_2)}</p>`)
  textParts.push(`\nHOW THIS UNDERSTANDING WAS BUILT\n${HOW_BUILT_PARAGRAPH_1}\n${HOW_BUILT_PARAGRAPH_2}\n`)

  htmlParts.push(
    `<p style="margin:0 0 24px;"><a href="${ctaUrl}" style="display:inline-block;background:#233f66;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;">${escapeHtml(CTA_LABEL)}</a></p>`,
  )
  textParts.push(`\n${CTA_LABEL}: ${ctaUrl}\n`)

  htmlParts.push(`<p style="font-size:12px;color:#999;margin:24px 0 0;border-top:1px solid #eee;padding-top:16px;">${escapeHtml(EDUCATIONAL_DISCLAIMER)}</p>`)
  textParts.push(`\n${EDUCATIONAL_DISCLAIMER}\n`)

  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;">${htmlParts.join('\n')}</div>`
  const text = textParts.join('\n')

  return { html, text }
}
