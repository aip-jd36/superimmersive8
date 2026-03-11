/**
 * API Route: GET /api/records
 * Fetch approved records from Airtable
 */

import { withAuth } from '../lib/auth.js';
import { fetchApprovedRecords } from '../lib/airtable.js';

async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const records = await fetchApprovedRecords();

    res.status(200).json({
      success: true,
      count: records.length,
      records
    });

  } catch (error) {
    console.error('Error in /api/records:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch records'
    });
  }
}

// Export with auth middleware
export default withAuth(handler);
