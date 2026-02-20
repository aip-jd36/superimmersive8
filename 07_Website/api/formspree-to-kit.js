// Vercel Serverless Function: Formspree → Kit Integration
// Receives webhook from Formspree and adds subscriber to Kit with tag

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract form data from Formspree webhook
    const { email, name } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Kit API credentials from environment variables
    const KIT_API_SECRET = process.env.KIT_API_SECRET;
    const KIT_TAG_ID = process.env.KIT_TAG_ID;

    if (!KIT_API_SECRET || !KIT_TAG_ID) {
      console.error('Missing environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Call Kit API to add subscriber with tag
    const kitResponse = await fetch(
      `https://api.kit.com/v3/tags/${KIT_TAG_ID}/subscribe`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_secret: KIT_API_SECRET,
          email: email,
          first_name: name || '', // Optional: use name if provided
        }),
      }
    );

    const kitData = await kitResponse.json();

    // Check if Kit API call was successful
    if (!kitResponse.ok) {
      console.error('Kit API error:', kitData);
      return res.status(500).json({
        error: 'Failed to add subscriber to Kit',
        details: kitData
      });
    }

    // Success!
    console.log('Subscriber added to Kit:', email);
    return res.status(200).json({
      success: true,
      message: 'Subscriber added successfully',
      subscriber: kitData.subscription
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
