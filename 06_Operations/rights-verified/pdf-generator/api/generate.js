/**
 * API Route: POST /api/generate
 * Generate Chain of Title PDF from Airtable record
 */

import { withAuth } from '../lib/auth.js';
import { fetchRecord, mapRecordToTemplateData } from '../lib/airtable.js';
import { loadTemplate, populateTemplate, generatePDF, generateStoragePath, generateFilename } from '../lib/pdf.js';

async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  const { recordId } = req.body;

  if (!recordId) {
    return res.status(400).json({
      success: false,
      error: 'Record ID is required'
    });
  }

  try {
    console.log(`Generating PDF for record: ${recordId}`);

    // 1. Fetch record from Airtable
    const record = await fetchRecord(recordId);

    // 2. Map record data to template variables
    const data = mapRecordToTemplateData(record);

    // 3. Load and populate template
    const template = await loadTemplate();
    const html = populateTemplate(template, data);

    // 4. Generate PDF
    const pdfBuffer = await generatePDF(html);

    // 5. Generate filename and storage path
    const filename = generateFilename(data);
    const storagePath = generateStoragePath(data);

    // 6. Return PDF as downloadable file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Return metadata in custom headers (for logging/tracking)
    res.setHeader('X-Catalog-ID', data.catalog_id);
    res.setHeader('X-Title', encodeURIComponent(data.title));
    res.setHeader('X-Filmmaker', encodeURIComponent(data.filmmaker_name));
    res.setHeader('X-Storage-Path', storagePath.relativePath);

    res.status(200).send(pdfBuffer);

  } catch (error) {
    console.error('Error in /api/generate:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate PDF'
    });
  }
}

// Export with auth middleware
export default withAuth(handler);
