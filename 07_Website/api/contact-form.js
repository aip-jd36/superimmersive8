export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, name, company, type, message } = req.body;

    // Validate required fields
    if (!email || !name || !type || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'name', 'type', 'message']
      });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const KIT_API_SECRET = process.env.KIT_API_SECRET;
    const KIT_TAG_ID = process.env.KIT_TAG_ID; // Reuse existing tag or create new one

    // ============================================
    // 1. SEND EMAIL NOTIFICATION TO JD VIA RESEND
    // ============================================

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SI8 Website <onboarding@resend.dev>',
        to: ['jd@superimmersive8.com'],
        subject: `🔔 New Contact Form Inquiry from ${name}`,
        html: `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #FFFBF5; border: 1px solid #C8900A; border-radius: 8px;">
            <h2 style="color: #C8900A; margin-top: 0;">New Contact Form Inquiry</h2>

            <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>Name:</strong> ${name}</p>
              <p style="margin: 8px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #C8900A;">${email}</a></p>
              <p style="margin: 8px 0;"><strong>Company:</strong> ${company || 'Not provided'}</p>
              <p style="margin: 8px 0;"><strong>Type:</strong> ${type}</p>
            </div>

            <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0 0 8px 0;"><strong>Message:</strong></p>
              <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${message}</p>
            </div>

            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #666;">
              <p style="margin: 4px 0;">Respond to: <a href="mailto:${email}" style="color: #C8900A;">${email}</a></p>
              <p style="margin: 4px 0;">Submitted: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei', dateStyle: 'full', timeStyle: 'short' })} (Taipei time)</p>
            </div>
          </div>
        `,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error('Resend error:', emailData);
      // Don't fail the whole request if email fails - still add to Kit
    }

    // ============================================
    // 2. ADD TO KIT FOR CRM TRACKING (OPTIONAL)
    // ============================================

    let kitAdded = false;
    try {
      const kitResponse = await fetch(
        `https://api.kit.com/v3/tags/${KIT_TAG_ID}/subscribe`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_secret: KIT_API_SECRET,
            email: email,
            first_name: name || ''
            // Note: Custom fields removed - add to Kit dashboard first
          }),
        }
      );

      const kitData = await kitResponse.json();
      kitAdded = kitResponse.ok;

      if (!kitResponse.ok) {
        console.error('Kit API error (non-fatal):', kitData);
      }
    } catch (kitError) {
      console.error('Kit error (non-fatal):', kitError);
      // Don't fail the request if Kit fails - email is the priority
    }

    // ============================================
    // 3. RETURN SUCCESS
    // ============================================

    return res.status(200).json({
      success: true,
      message: 'Message sent successfully! We\'ll respond within 24 hours.',
      email_sent: emailResponse.ok,
      kit_added: kitAdded
    });

  } catch (error) {
    console.error('Contact form error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
