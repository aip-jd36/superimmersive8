#!/usr/bin/env node

/**
 * Chain of Title PDF Generator - Web Server
 *
 * Simple Express.js server with web UI for generating Chain of Title PDFs.
 *
 * Usage:
 *   npm start
 *   Open browser to http://localhost:3000
 */

require('dotenv').config();
const express = require('express');
const Airtable = require('airtable');
const path = require('path');
const { mapRecordToTemplateData, generatePDF } = require('./generate-pdf');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Airtable configuration
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const tableName = process.env.AIRTABLE_TABLE_NAME || 'Rights Verified Submissions';

// ============================
// Helper Functions
// ============================

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function loadTemplate() {
  const templatePath = path.join(__dirname, 'template.html');
  return await fs.readFile(templatePath, 'utf-8');
}

function populateTemplate(template, data) {
  let html = template;
  Object.keys(data).forEach(key => {
    const placeholder = `{{${key}}}`;
    const value = data[key] || '';
    html = html.split(placeholder).join(value);
  });
  return html;
}

async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function generateOutputPath(data) {
  const filmmakerSlug = slugify(data.filmmaker_name);
  const titleSlug = slugify(data.title);
  const filename = `${data.catalog_id}-chain-of-title-v1.0.pdf`;

  const outputDir = process.env.OUTPUT_DIR || '../../../05_Catalog/represented';
  const dir = path.join(__dirname, outputDir, filmmakerSlug, titleSlug);
  return { dir, fullPath: path.join(dir, filename), filename };
}

// ============================
// API Routes
// ============================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Chain of Title PDF Generator is running',
    timestamp: new Date().toISOString()
  });
});

// Get list of approved records
app.get('/api/records', async (req, res) => {
  try {
    const records = [];

    await base(tableName)
      .select({
        filterByFormula: "{Status} = 'Approved'",
        sort: [{ field: 'Review Date', direction: 'desc' }],
        maxRecords: 100
      })
      .eachPage((pageRecords, fetchNextPage) => {
        pageRecords.forEach(record => {
          records.push({
            id: record.id,
            title: record.fields['Work Title'] || 'Untitled',
            filmmaker: record.fields['Filmmaker Name'] || 'Unknown',
            catalogId: record.fields['Catalog ID'] || 'Pending',
            reviewDate: record.fields['Review Date'] || '',
            status: record.fields['Status'] || 'Unknown'
          });
        });
        fetchNextPage();
      });

    res.json({
      success: true,
      count: records.length,
      records
    });

  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get single record details
app.get('/api/records/:id', async (req, res) => {
  try {
    const record = await base(tableName).find(req.params.id);

    res.json({
      success: true,
      record: {
        id: record.id,
        fields: record.fields
      }
    });

  } catch (error) {
    console.error('Error fetching record:', error);
    res.status(404).json({
      success: false,
      error: 'Record not found'
    });
  }
});

// Generate PDF
app.post('/api/generate', async (req, res) => {
  const { recordId } = req.body;

  if (!recordId) {
    return res.status(400).json({
      success: false,
      error: 'Record ID is required'
    });
  }

  try {
    // Fetch record
    const record = await base(tableName).find(recordId);

    // Map data
    const data = mapRecordToTemplateData(record);

    // Load and populate template
    const template = await loadTemplate();
    const html = populateTemplate(template, data);

    // Generate output path
    const { dir, fullPath, filename } = generateOutputPath(data);
    await ensureDirectory(dir);

    // Generate PDF using Puppeteer
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.pdf({
        path: fullPath,
        format: 'A4',
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      });
    } finally {
      await browser.close();
    }

    // Success response
    res.json({
      success: true,
      message: 'PDF generated successfully',
      data: {
        title: data.title,
        filmmaker: data.filmmaker_name,
        catalogId: data.catalog_id,
        filename,
        path: fullPath
      }
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================
// Start Server
// ============================

app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(60));
  console.log('');
  console.log('  🚀 Chain of Title PDF Generator - Web UI');
  console.log('');
  console.log('='.repeat(60));
  console.log('');
  console.log(`  ✅ Server running at: http://localhost:${PORT}`);
  console.log('');
  console.log('  📋 Next steps:');
  console.log('     1. Open your browser to the URL above');
  console.log('     2. Select an approved record from the dropdown');
  console.log('     3. Click "Generate PDF"');
  console.log('     4. Download or locate the generated PDF');
  console.log('');
  console.log('  🛑 To stop: Press Ctrl+C');
  console.log('');
  console.log('='.repeat(60));
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});
