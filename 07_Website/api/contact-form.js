export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== Contact Form Submission Started ===');

    // Parse request body (Vercel doesn't auto-parse in all cases)
    let body = req.body;
    if (!body || typeof body === 'string') {
      body = JSON.parse(req.body || '{}');
    }

    const { email, name, company, type, message } = body;
    console.log('Form data:', { email, name, company, type, message: message?.substring(0, 50) });

    // Validate required fields
    if (!email || !name || !type || !message) {
      console.log('Validation failed - missing fields');
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'name', 'type', 'message']
      });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const KIT_API_SECRET = process.env.KIT_API_SECRET;
    const KIT_TAG_ID = process.env.KIT_TAG_ID;

    console.log('Environment check:', {
      hasResendKey: !!RESEND_API_KEY,
      hasKitSecret: !!KIT_API_SECRET,
      hasKitTagId: !!KIT_TAG_ID
    });

    // ============================================
    // 1. SEND EMAIL NOTIFICATION TO JD VIA RESEND
    // ============================================

    console.log('Attempting to send email via Resend...');
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
    console.log('Email response status:', emailResponse.status);
    console.log('Email response data:', emailData);

    if (!emailResponse.ok) {
      console.error('❌ Resend API failed:', emailData);
      // Don't fail the whole request if email fails - still add to Kit
    } else {
      console.log('✓ Email sent successfully');
    }

    // ============================================
    // 2. ADD TO KIT FOR CRM TRACKING (OPTIONAL)
    // ============================================

    console.log('Attempting to add to Kit...');
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
      console.log('Kit response status:', kitResponse.status);
      console.log('Kit response data:', kitData);

      if (!kitResponse.ok) {
        console.error('❌ Kit API failed (non-fatal):', kitData);
      } else {
        console.log('✓ Added to Kit successfully');
      }
    } catch (kitError) {
      console.error('❌ Kit exception (non-fatal):', kitError.message);
      // Don't fail the request if Kit fails - email is the priority
    }

    // ============================================
    // 3. RETURN SUCCESS
    // ============================================

    console.log('=== Returning success response ===');
    console.log('Email sent:', emailResponse.ok, '| Kit added:', kitAdded);

    return res.status(200).json({
      success: true,
      message: 'Message sent successfully! We\'ll respond within 24 hours.',
      email_sent: emailResponse.ok,
      kit_added: kitAdded
    });

  } catch (error) {
    console.error('❌ FATAL ERROR in contact form handler:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
