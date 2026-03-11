/**
 * API Route: POST /api/generate
 * Generate Chain of Title PDF from Airtable record
 */

import { withAuth } from '../lib/auth.js';
import { fetchRecord, mapRecordToTemplateData } from '../lib/airtable.js';
import { loadTemplate, populateTemplate, generateStoragePath, generateFilename } from '../lib/pdf.js';

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
    console.log(`Generating HTML for record: ${recordId}`);

    // 1. Fetch record from Airtable
    const record = await fetchRecord(recordId);

    // 2. Map record data to template variables
    const data = mapRecordToTemplateData(record);

    // 3. Load and populate template
    const template = await loadTemplate();
    let html = populateTemplate(template, data);

    // 4. Add print-optimized CSS and print button
    html = addPrintStyles(html, data);

    // 5. Return HTML
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);

  } catch (error) {
    console.error('Error in /api/generate:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate HTML'
    });
  }
}

/**
 * Add print-optimized styles and print button to HTML
 */
function addPrintStyles(html, data) {
  const filename = generateFilename(data);

  const printStyles = `
    <style>
      /* Print styles - prevent awkward page breaks */
      @media print {
        body {
          margin: 0;
          padding: 0;
        }
        .no-print {
          display: none !important;
        }
        .page-break {
          page-break-after: always;
        }

        /* Prevent page breaks inside these elements */
        table, .section, .field-group, .metadata-grid {
          page-break-inside: avoid !important;
        }

        /* Keep table rows together */
        tr, th, td {
          page-break-inside: avoid !important;
        }

        /* Keep list items together */
        li {
          page-break-inside: avoid !important;
        }

        /* Keep headings with following content */
        h1, h2, h3, h4, h5, h6 {
          page-break-after: avoid !important;
          page-break-inside: avoid !important;
        }

        /* Orphans and widows control */
        p, li {
          orphans: 3;
          widows: 3;
        }
      }

      /* Screen styles for print button */
      @media screen {
        .print-button-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          background: white;
          padding: 10px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .print-button {
          background: #B8860B;
          color: white;
          border: none;
          padding: 12px 24px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .print-button:hover {
          background: #9A7209;
        }

        .print-instructions {
          margin-top: 10px;
          font-size: 12px;
          color: #666;
          max-width: 250px;
        }
      }
    </style>

    <div class="print-button-container no-print">
      <button class="print-button" onclick="window.print()">🖨️ Print to PDF</button>
      <div class="print-instructions">
        Click to open print dialog, then save as PDF.<br>
        Filename: <strong>${filename}</strong>
      </div>
    </div>

    <script>
      // Auto-set document title for PDF filename
      document.title = "${filename.replace('.pdf', '')}";
    </script>
  `;

  // Insert before </body>
  return html.replace('</body>', `${printStyles}</body>`);
}

// Export with auth middleware
export default withAuth(handler);
