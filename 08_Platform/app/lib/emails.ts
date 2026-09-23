import { Resend } from 'resend'
import { escapeHtml } from '@/lib/crc-engine/results-email-template'

const resend = new Resend(process.env.RESEND_API_KEY!)

const FROM_EMAIL = 'SI8 Creator Portal <noreply@superimmersive8.com>'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'jd@superimmersive8.com'

// CRC Results Gate milestone, 2026-08-14. Same verified domain as FROM_EMAIL
// above -- deliberately not a new subdomain/address, since only
// superimmersive8.com has SPF/DKIM/DMARC already configured with Resend.
const CRC_RESULTS_FROM_EMAIL = 'SI8 Commercial Readiness Check <noreply@superimmersive8.com>'

export async function sendNewUserSignupEmail(
  fullName: string,
  email: string,
  nextPath: string
) {
  const productLabel = nextPath === '/certify'
    ? 'SI8 Certified ($499)'
    : nextPath === '/record'
    ? 'Creator Record ($29)'
    : 'Not specified'

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `New signup — ${fullName} (${email})`,
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px; background: #FFFBF5; border: 1px solid #C8900A; border-radius: 8px;">
          <h2 style="color: #C8900A; margin-top: 0;">New Account Created</h2>
          <div style="background: white; padding: 16px 20px; border-radius: 6px; margin: 16px 0;">
            <p style="margin: 6px 0;"><strong>Name:</strong> ${fullName}</p>
            <p style="margin: 6px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #C8900A;">${email}</a></p>
            <p style="margin: 6px 0;"><strong>Signed up for:</strong> ${productLabel}</p>
            <p style="margin: 6px 0;"><strong>Status:</strong> Email verification pending</p>
          </div>
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 13px; color: #666;">
            <p style="margin: 4px 0;">Signed up: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei', dateStyle: 'full', timeStyle: 'short' })} (Taipei time)</p>
            <p style="margin: 4px 0;"><a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin" style="color: #C8900A;">View Admin Panel →</a></p>
          </div>
        </div>
      `,
    })
  } catch (error) {
    console.error('Error sending new user signup email:', error)
  }
}

export async function sendSubmissionReceivedEmail(
  creatorName: string,
  filmTitle: string,
  creatorEmail: string
) {
  try {
    // Email to creator
    await resend.emails.send({
      from: FROM_EMAIL,
      to: creatorEmail,
      subject: `Submission received: ${filmTitle}`,
      html: `
        <h2>Hi ${creatorName},</h2>
        <p>Thank you for submitting <strong>${filmTitle}</strong> for Rights Verified verification.</p>
        <p>We'll review your submission within 5 business days and notify you when it's approved.</p>
        <p>You can track the status of your submission in your <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard">dashboard</a>.</p>
        <br>
        <p>Best,<br>The SI8 Team</p>
      `,
    })

    // Admin notification
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `New submission: ${filmTitle}`,
      html: `
        <h2>New submission received</h2>
        <p><strong>Film:</strong> ${filmTitle}</p>
        <p><strong>Creator:</strong> ${creatorName} (${creatorEmail})</p>
        <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin">Review in Admin Panel →</a></p>
      `,
    })
  } catch (error) {
    console.error('Error sending submission received email:', error)
  }
}

// SI8 Certified approval email (sent by admin after human review)
export async function sendSubmissionApprovedEmail(
  creatorName: string,
  filmTitle: string,
  dashboardUrl: string,
  creatorEmail: string,
  riskRating?: string
) {
  const riskLabel = riskRating
    ? riskRating.charAt(0).toUpperCase() + riskRating.slice(1)
    : null
  const riskColor: Record<string, string> = {
    low: '#166534', standard: '#1e40af', elevated: '#92400e', high: '#991b1b',
  }
  const riskBgColor: Record<string, string> = {
    low: '#dcfce7', standard: '#dbeafe', elevated: '#fef3c7', high: '#fee2e2',
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: creatorEmail,
      subject: `Approved: ${filmTitle} — Chain of Title ready`,
      html: `
        <h2>Congratulations, ${creatorName}!</h2>
        <p>Your submission <strong>${filmTitle}</strong> has passed SI8's commercial audit and is now <strong>SI8 VERIFIED · COMMERCIAL AUDIT PASSED</strong>.</p>
        ${riskLabel ? `
        <p style="margin: 16px 0;">
          <strong>Your Risk Rating:</strong>
          <span style="display: inline-block; background: ${riskBgColor[riskRating!] || '#f3f4f6'}; color: ${riskColor[riskRating!] || '#374151'}; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 14px; margin-left: 8px;">${riskLabel}</span>
        </p>
        ` : ''}
        <h3>What's Next?</h3>
        <ol>
          <li><strong>Download your Chain of Title PDF</strong> — Your SI8 Verified documentation is ready in your dashboard</li>
          <li><strong>Optional: List in SI8 Catalog</strong> — Opt in to earn licensing revenue (you keep 80%)</li>
        </ol>
        <p><a href="${dashboardUrl}" style="background: #818cf8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Your Dashboard</a></p>
        <br>
        <p>Best,<br>The SI8 Team</p>
      `,
    })
  } catch (error) {
    console.error('Error sending submission approved email:', error)
  }
}

// Creator Record approval email (auto-sent on payment — no human review)
export async function sendCreatorRecordApprovedEmail(
  creatorName: string,
  filmTitle: string,
  dashboardUrl: string,
  creatorEmail: string
) {
  try {
    // Email to creator
    await resend.emails.send({
      from: FROM_EMAIL,
      to: creatorEmail,
      subject: `Your Creator Record is ready: ${filmTitle}`,
      html: `
        <h2>Hi ${creatorName},</h2>
        <p>Your Creator Record for <strong>${filmTitle}</strong> has been issued and your self-attested documentation PDF is ready to download.</p>
        <p><strong>Important:</strong> Your Creator Record is stamped <em>"SELF-ATTESTED — NOT FOR COMMERCIAL USE."</em> It is suitable for personal records and portfolio documentation only.</p>
        <h3>Want to use this film commercially?</h3>
        <p>Upgrade to <strong>SI8 Certified ($499)</strong> for a human-reviewed Chain of Title stamped "CLEARED FOR COMMERCIAL USE." Required for brand placements, agency deliverables, streaming submissions, and E&O insurance.</p>
        <p><a href="${dashboardUrl}" style="background: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Download Your Creator Record PDF</a></p>
        <br>
        <p>Best,<br>The SI8 Team</p>
      `,
    })

    // Admin notification (awareness only — no action required)
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `Creator Record submitted: ${filmTitle} — auto-approved`,
      html: `
        <h2>Creator Record auto-approved</h2>
        <p><strong>Film:</strong> ${filmTitle}</p>
        <p><strong>Creator:</strong> ${creatorName} (${creatorEmail})</p>
        <p><strong>Tier:</strong> Creator Record ($29) — self-attested, no review required</p>
        <p>PDF has been auto-generated and is available in the creator's dashboard.</p>
        <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin">View in Admin Panel →</a></p>
      `,
    })
  } catch (error) {
    console.error('Error sending Creator Record approved email:', error)
  }
}

export async function sendSubmissionRejectedEmail(
  creatorName: string,
  filmTitle: string,
  reason: string,
  creatorEmail: string
) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: creatorEmail,
      subject: `Submission Update: ${filmTitle}`,
      html: `
        <h2>Hi ${creatorName},</h2>
        <p>After reviewing your submission <strong>${filmTitle}</strong>, we're unable to approve it for Rights Verified at this time.</p>
        <h3>Reason:</h3>
        <p>${reason}</p>
        <p>You can make corrections and resubmit. Please contact us at <a href="mailto:${ADMIN_EMAIL}">${ADMIN_EMAIL}</a> if you have questions.</p>
        <br>
        <p>Best,<br>The SI8 Team</p>
      `,
    })
  } catch (error) {
    console.error('Error sending submission rejected email:', error)
  }
}

export async function sendOptInConfirmationEmail(
  creatorName: string,
  filmTitle: string,
  catalogUrl: string,
  creatorEmail: string
) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: creatorEmail,
      subject: `${filmTitle} is now live in the SI8 Catalog!`,
      html: `
        <h2>Great news, ${creatorName}!</h2>
        <p>Your film <strong>${filmTitle}</strong> is now listed in the SI8 Catalog and visible to buyers.</p>
        <p><strong>You'll earn 80%</strong> of any licensing deals. We'll notify you when a buyer requests licensing.</p>
        <p><a href="${catalogUrl}">View Your Film in the Catalog</a></p>
        <br>
        <p>Best,<br>The SI8 Team</p>
      `,
    })
  } catch (error) {
    console.error('Error sending opt-in confirmation email:', error)
  }
}

/**
 * CRC results-email send (CRC Results Gate milestone, 2026-08-14).
 * Deliberately NOT fire-and-forget like every other function in this file
 * -- the caller's response to the browser must reflect what actually
 * happened, so this returns a typed outcome instead of swallowing errors
 * into a console.error. A timeout/network error is reported as 'unknown',
 * never 'failed' -- Resend may have accepted the request before the
 * response was lost in transit, and this function must never claim more
 * certainty than it has (see results-email-delivery.ts for how the caller
 * uses this distinction).
 */
export type CrcResultsEmailOutcome = { status: 'accepted'; providerId: string } | { status: 'failed'; error: string } | { status: 'unknown'; error: string }

export async function sendCrcResultsEmail(to: string, subject: string, html: string, text: string): Promise<CrcResultsEmailOutcome> {
  try {
    const { data, error } = await resend.emails.send({
      from: CRC_RESULTS_FROM_EMAIL,
      to,
      reply_to: ADMIN_EMAIL,
      subject,
      html,
      text,
    })
    if (error) {
      // Resend's own API returned a definitive rejection (invalid address,
      // domain issue, rate limit, etc.) -- a real, confirmed failure, safe
      // to tell the user "that didn't go through."
      return { status: 'failed', error: error.message }
    }
    return { status: 'accepted', providerId: data!.id }
  } catch (err) {
    // Network error, timeout, or any other exception BEFORE a definitive
    // response was received -- Resend may have already accepted the
    // request. Must not be reported as 'failed'.
    return { status: 'unknown', error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Material Demand admin notification (LK-DEMAND-2E, 2026-09-18). Prompt,
 * best-effort operational visibility for a human when CRC durably records
 * one or more genuinely NEW qualified Material Demand observations --
 * fire-and-forget, same discipline as every other admin notification in
 * this file above (sendNewUserSignupEmail, the admin halves of
 * sendSubmissionReceivedEmail/sendCreatorRecordApprovedEmail): internal
 * try/catch, console.error on failure, never throws, caller (CRC's own
 * request handler) is never affected either way.
 *
 * AUTHORITY BOUNDARY -- this email reports EVIDENCE, never interpretation.
 * A Material Demand observation proves only "the user materially asked
 * CRC to account for this text." It does NOT prove canonical subject
 * identity, GovernedSubject existence, Living Knowledge coverage or its
 * absence, a knowledge gap, a new LK domain, a governance candidate, or an
 * onboarding requirement -- see KnowledgeDemandOccurrence's own header
 * (types/interview-engine.ts) and the crc_knowledge_demand_occurrences
 * migration's own header for the full boundary this email must never
 * cross. GOVERNANCE_STATUS_COPY below is therefore a FIXED, literal
 * constant -- never composed, interpolated, or model-generated from
 * observation content -- and this function imports nothing from
 * lib/crc-engine/governance-candidates.ts: it creates no governance
 * candidate, no evidence association, no GovernedSubject, and determines
 * no coverage or gap conclusion. A human reading this email may later,
 * separately, manually choose to act through that entirely distinct
 * tooling; this email has zero structural connection to it.
 *
 * ESCAPING: `raw_text` is verbatim, fully user-controlled conversation
 * content -- reuses results-email-template.ts's own escapeHtml() (the
 * established discipline for exactly this content category: "user-
 * influenced... never assume it's safe to inline raw"), not the raw
 * interpolation pattern the other functions in this file predate that
 * discipline with.
 *
 * ONE EMAIL PER CALL: callers pass every newly-inserted observation from
 * one accepted CRC turn in a single array -- this function sends exactly
 * one email containing all of them (never one email per observation, never
 * aggregated across turns/sessions). A no-op (zero provider calls) when
 * `observations` is empty.
 */
export interface MaterialDemandObservation {
  occurrence_id: string
  session_id: string
  source_turn: number
  raw_text: string
  created_at: string
}

const MATERIAL_DEMAND_GOVERNANCE_STATUS_COPY =
  'Raw Material Demand evidence only. Not yet classified as a governed subject, knowledge gap, or governance candidate. No action is implied.'

// Presentation-only bound -- the persisted evidence row and occurrence
// identity are always unaffected; only the email's own rendered text may
// be shortened. No length limit exists on raw_text at the schema level.
const MATERIAL_DEMAND_DISPLAY_TEXT_MAX_LENGTH = 500

function truncateForDisplay(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength)}… (truncated for display only -- full text preserved in crc_knowledge_demand_occurrences)`
}

export async function sendMaterialDemandAdminNotification(observations: MaterialDemandObservation[]): Promise<void> {
  if (observations.length === 0) return

  try {
    const observationsHtml = observations
      .map(
        (o) => `
          <div style="background: white; padding: 12px 16px; border-radius: 6px; margin: 10px 0; border: 1px solid #eee;">
            <p style="margin: 4px 0;"><strong>Observation:</strong> ${escapeHtml(truncateForDisplay(o.raw_text, MATERIAL_DEMAND_DISPLAY_TEXT_MAX_LENGTH))}</p>
            <p style="margin: 4px 0;"><strong>Session:</strong> ${escapeHtml(o.session_id)}</p>
            <p style="margin: 4px 0;"><strong>Turn:</strong> ${escapeHtml(String(o.source_turn))}</p>
            <p style="margin: 4px 0;"><strong>Occurrence:</strong> ${escapeHtml(o.occurrence_id)}</p>
            <p style="margin: 4px 0;"><strong>Recorded:</strong> ${escapeHtml(o.created_at)}</p>
          </div>`,
      )
      .join('')

    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: 'New CRC Material Demand observation',
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
          <h2 style="margin-top: 0;">New CRC Material Demand observation${observations.length > 1 ? 's' : ''}</h2>
          ${observationsHtml}
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 13px; color: #666;">
            <p style="margin: 4px 0;"><strong>Governance status:</strong> ${MATERIAL_DEMAND_GOVERNANCE_STATUS_COPY}</p>
          </div>
        </div>
      `,
    })
  } catch (error) {
    console.error('Error sending Material Demand admin notification email:', error)
  }
}

// ── CRC-OPS-NOTIFY-1 (2026-09-23): admin usage notifications ────────────────
// Two purpose-specific, best-effort operational notifications -- NOT a
// generic notification platform, and NOT an overload of
// sendMaterialDemandAdminNotification above (different event, different
// payload shape, different subject line; that function's own contract stays
// Material-Demand-specific). Reuse only: the shared `resend` client,
// ADMIN_EMAIL/FROM_EMAIL, escapeHtml, and the identical fail-open pattern
// (try/catch, console.error, never throws/rejects) already established by
// every admin-notification function in this file. Deliberately minimal
// payloads -- no transcript, no raw IP, no abuse key, no
// StructuredUnderstanding/RetrievalResult/BoundedInterpretation/Living
// Knowledge content of any kind. Caller (app/api/crc/turn/route.ts) is
// responsible for deciding WHEN to call these (traffic-type exclusion,
// genuine-new-session/first-acceptance gating) -- this module only composes
// and sends.

export interface CrcSessionStartedNotification {
  sessionId: string
  initializationSource: 'free_form' | 'guided'
  attributionToken?: string | null
  /**
   * CRC-OPS-GEO-1 (2026-09-23). Already-resolved, already-formatted
   * display name (e.g. 'Taiwan') -- this module never resolves/formats a
   * raw header itself, matching every other field in this payload (the
   * caller always supplies presentation-ready values). Describes coarse
   * NETWORK/egress geography only, never a verified physical location;
   * omitted entirely (never rendered as "Unknown") when absent/invalid.
   */
  approximateCountry?: string | null
}

export async function sendCrcSessionStartedAdminNotification(payload: CrcSessionStartedNotification): Promise<void> {
  try {
    const timestamp = new Date().toISOString()
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: 'New CRC session started',
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
          <h2 style="margin-top: 0;">New CRC session started</h2>
          <div style="background: white; padding: 12px 16px; border-radius: 6px; margin: 10px 0; border: 1px solid #eee;">
            <p style="margin: 4px 0;"><strong>Event:</strong> crc_session_started</p>
            <p style="margin: 4px 0;"><strong>Time:</strong> ${escapeHtml(timestamp)}</p>
            <p style="margin: 4px 0;"><strong>Session:</strong> ${escapeHtml(payload.sessionId)}</p>
            <p style="margin: 4px 0;"><strong>Initialization source:</strong> ${escapeHtml(payload.initializationSource)}</p>
            ${payload.attributionToken ? `<p style="margin: 4px 0;"><strong>Attribution token:</strong> ${escapeHtml(payload.attributionToken)}</p>` : ''}
            ${payload.approximateCountry ? `<p style="margin: 4px 0;"><strong>Approximate country:</strong> ${escapeHtml(payload.approximateCountry)}</p>` : ''}
          </div>
        </div>
      `,
    })
  } catch (error) {
    console.error('Error sending CRC session started admin notification email:', error)
  }
}

export interface CrcResultsEmailCapturedNotification {
  sessionId: string
  turnCount: number
  initializationSource: 'free_form' | 'guided' | null
  email: string
  attributionToken?: string | null
  /** CRC-OPS-GEO-1 (2026-09-23). Same contract as CrcSessionStartedNotification's own field above. */
  approximateCountry?: string | null
}

export async function sendCrcResultsEmailCapturedAdminNotification(payload: CrcResultsEmailCapturedNotification): Promise<void> {
  try {
    const timestamp = new Date().toISOString()
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: 'CRC results email captured',
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
          <h2 style="margin-top: 0;">CRC results email captured</h2>
          <div style="background: white; padding: 12px 16px; border-radius: 6px; margin: 10px 0; border: 1px solid #eee;">
            <p style="margin: 4px 0;"><strong>Event:</strong> crc_results_email_captured</p>
            <p style="margin: 4px 0;"><strong>Time:</strong> ${escapeHtml(timestamp)}</p>
            <p style="margin: 4px 0;"><strong>Session:</strong> ${escapeHtml(payload.sessionId)}</p>
            <p style="margin: 4px 0;"><strong>Turn count:</strong> ${escapeHtml(String(payload.turnCount))}</p>
            <p style="margin: 4px 0;"><strong>Initialization source:</strong> ${escapeHtml(payload.initializationSource ?? 'unknown')}</p>
            <p style="margin: 4px 0;"><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
            ${payload.attributionToken ? `<p style="margin: 4px 0;"><strong>Attribution token:</strong> ${escapeHtml(payload.attributionToken)}</p>` : ''}
            ${payload.approximateCountry ? `<p style="margin: 4px 0;"><strong>Approximate country:</strong> ${escapeHtml(payload.approximateCountry)}</p>` : ''}
          </div>
        </div>
      `,
    })
  } catch (error) {
    console.error('Error sending CRC results email captured admin notification email:', error)
  }
}

export async function sendInfoRequestEmail(
  creatorName: string,
  filmTitle: string,
  requestedInfo: string,
  dashboardUrl: string,
  creatorEmail: string
) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: creatorEmail,
      subject: `Action Required: Additional Information Needed for ${filmTitle}`,
      html: `
        <h2>Hi ${creatorName},</h2>
        <p>We've reviewed your submission <strong>${filmTitle}</strong> and need some additional information before we can complete our review.</p>
        <h3>What We Need:</h3>
        <p>${requestedInfo}</p>
        <p><strong>Important:</strong> Please respond within <strong>14 days</strong> to keep your submission active.</p>
        <p>Reply to this email with the requested information, or update your submission in the dashboard.</p>
        <p><a href="${dashboardUrl}" style="background: #818cf8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Go to Dashboard</a></p>
        <br>
        <p>Best,<br>The SI8 Team</p>
      `,
    })
  } catch (error) {
    console.error('Error sending info request email:', error)
  }
}
