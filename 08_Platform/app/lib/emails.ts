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
  } catch (error) {
    console.error('Error sending submission received email:', error)
  }
}

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
      subject: `Approved: ${filmTitle} is Rights Verified!`,
      html: `
        <h2>Congratulations, ${creatorName}!</h2>
        <p>Your submission <strong>${filmTitle}</strong> has been approved and is now <strong>Rights Verified</strong>.</p>
        <h3>What's Next?</h3>
        <ol>
          <li><strong>Download your Rights Package PDF</strong> - Your Chain of Title documentation is ready</li>
          <li><strong>Optional: List in SI8 Catalog</strong> - Opt-in to earn licensing revenue (you keep 80%)</li>
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
