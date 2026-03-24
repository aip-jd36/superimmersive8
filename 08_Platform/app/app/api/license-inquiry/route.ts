import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)
const ADMIN_EMAIL = 'jd@superimmersive8.com'
const FROM_EMAIL = 'SI8 Showcase <noreply@superimmersive8.com>'

export async function POST(request: NextRequest) {
  try {
    const { filmTitle, catalogId, inquirerName, inquirerEmail, message } = await request.json()

    if (!filmTitle || !inquirerName || !inquirerEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const subject = `License Inquiry — ${filmTitle}${catalogId ? ` (${catalogId})` : ''}`

    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      replyTo: inquirerEmail,
      subject,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1918;">
          <div style="background: #1a1918; padding: 24px 32px; border-radius: 8px 8px 0 0;">
            <h1 style="color: #f59e0b; font-family: 'Space Grotesk', sans-serif; font-size: 20px; margin: 0;">
              New License Inquiry
            </h1>
          </div>
          <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #666; width: 160px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;">Film</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: 600;">${filmTitle}${catalogId ? ` <span style="color: #999; font-size: 13px; font-weight: 400;">(${catalogId})</span>` : ''}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #666; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;">Inquirer</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 15px;">${inquirerName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #666; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;">Email</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 15px;"><a href="mailto:${inquirerEmail}" style="color: #C8900A;">${inquirerEmail}</a></td>
              </tr>
              ${message ? `
              <tr>
                <td style="padding: 10px 0; font-size: 13px; color: #666; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; vertical-align: top;">Comments</td>
                <td style="padding: 10px 0; font-size: 15px; line-height: 1.6; color: #333;">${message.replace(/\n/g, '<br>')}</td>
              </tr>
              ` : ''}
            </table>
            <div style="margin-top: 24px; padding: 16px; background: #fafaf7; border-radius: 6px; border: 1px solid #e5e5e5;">
              <p style="margin: 0; font-size: 13px; color: #666;">Reply directly to this email to respond to ${inquirerName}.</p>
            </div>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('License inquiry error:', error)
    return NextResponse.json({ error: 'Failed to send inquiry' }, { status: 500 })
  }
}
