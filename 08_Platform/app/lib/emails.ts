import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

const FROM_EMAIL = 'SI8 Creator Portal <noreply@superimmersive8.com>'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'jd@superimmersive8.com'

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
  creatorEmail: string
) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: creatorEmail,
      subject: `Approved: ${filmTitle} — Chain of Title ready`,
      html: `
        <h2>Congratulations, ${creatorName}!</h2>
        <p>Your submission <strong>${filmTitle}</strong> has passed SI8's Rights Verified review and is now cleared for commercial use.</p>
        <h3>What's Next?</h3>
        <ol>
          <li><strong>Download your Chain of Title PDF</strong> — Your commercial clearance documentation is ready in your dashboard</li>
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
