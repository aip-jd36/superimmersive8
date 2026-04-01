// Vercel Serverless Function: Request Demo handler
// 1. Sends admin notification email via Resend
// 2. Adds subscriber to Kit with tag

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (!body || typeof body === 'string') {
      body = JSON.parse(req.body || '{}');
    }

    const { email, name, role, website } = body;

    // Honeypot check — bots fill this field, humans don't see it
    if (website) {
      return res.status(200).json({ success: true, message: 'Demo request received.' });
    }

    // Basic field validation
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Name validation — reject bot-generated random strings
    if (name) {
      // Reject names over 60 chars with no spaces (random string pattern)
      if (name.length > 60 && !name.includes(' ')) {
        return res.status(200).json({ success: true, message: 'Demo request received.' });
      }
      // Reject names that are purely alphanumeric with no spaces and over 20 chars
      if (/^[A-Za-z0-9]{20,}$/.test(name)) {
        return res.status(200).json({ success: true, message: 'Demo request received.' });
      }
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const KIT_API_SECRET = process.env.KIT_API_SECRET;
    const KIT_TAG_ID = process.env.KIT_TAG_ID;

    const roleLabels = {
      agency: 'Agency / Production House',
      brand: 'Brand / Marketing Team',
      filmmaker: 'AI Filmmaker / Creator',
      legal: 'Legal / Compliance',
      other: 'Other'
    };
    const roleLabel = roleLabels[role] || role || 'Not specified';

    // ============================================
    // 1. SEND ADMIN NOTIFICATION VIA RESEND
    // ============================================

    let emailSent = false;
    if (RESEND_API_KEY) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'SI8 Website <onboarding@resend.dev>',
          to: ['jd@superimmersive8.com'],
          subject: `New Demo Request — ${name || email} (${roleLabel})`,
          html: `
            <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #FFFBF5; border: 1px solid #C8900A; border-radius: 8px;">
              <h2 style="color: #C8900A; margin-top: 0;">New Demo Request</h2>
              <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 8px 0;"><strong>Name:</strong> ${name || 'Not provided'}</p>
                <p style="margin: 8px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #C8900A;">${email}</a></p>
                <p style="margin: 8px 0;"><strong>Role:</strong> ${roleLabel}</p>
              </div>
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #666;">
                <p style="margin: 4px 0;">Reply to: <a href="mailto:${email}" style="color: #C8900A;">${email}</a></p>
                <p style="margin: 4px 0;">Submitted: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei', dateStyle: 'full', timeStyle: 'short' })} (Taipei time)</p>
                <p style="margin: 4px 0;">Source: superimmersive8.com homepage demo form</p>
              </div>
            </div>
          `,
        }),
      });
      emailSent = emailResponse.ok;
      if (!emailResponse.ok) {
        const errData = await emailResponse.json();
        console.error('Resend error:', errData);
      }
    } else {
      console.error('Missing RESEND_API_KEY');
    }

    // ============================================
    // 2. ADD TO KIT
    // ============================================

    let kitAdded = false;
    if (KIT_API_SECRET && KIT_TAG_ID) {
      try {
        const kitResponse = await fetch(
          `https://api.kit.com/v3/tags/${KIT_TAG_ID}/subscribe`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_secret: KIT_API_SECRET,
              email: email,
              first_name: name || '',
            }),
          }
        );
        kitAdded = kitResponse.ok;
        if (!kitResponse.ok) {
          const kitData = await kitResponse.json();
          console.error('Kit error (non-fatal):', kitData);
        }
      } catch (kitError) {
        console.error('Kit exception (non-fatal):', kitError.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Demo request received.',
      email_sent: emailSent,
      kit_added: kitAdded
    });

  } catch (error) {
    console.error('Fatal error in demo form handler:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
