#!/usr/bin/env node

/**
 * Chain of Title PDF Generator
 *
 * Generates Chain of Title PDFs from approved Airtable submissions.
 *
 * Usage:
 *   node generate-pdf.js <airtable-record-id>
 *
 * Example:
 *   node generate-pdf.js rec1234567890ABC
 */

require('dotenv').config();
const Airtable = require('airtable');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// ============================
// Configuration
// ============================

const config = {
  airtable: {
    apiKey: process.env.AIRTABLE_API_KEY,
    baseId: process.env.AIRTABLE_BASE_ID,
    tableName: process.env.AIRTABLE_TABLE_NAME || 'Rights Verified Submissions'
  },
  output: {
    dir: process.env.OUTPUT_DIR || '../../../05_Catalog/represented'
  },
  template: {
    path: path.join(__dirname, 'template.html')
  }
};

// ============================
// Validation
// ============================

function validateConfig() {
  if (!config.airtable.apiKey) {
    throw new Error('AIRTABLE_API_KEY is not set in .env file');
  }
  if (!config.airtable.baseId) {
    throw new Error('AIRTABLE_BASE_ID is not set in .env file');
  }
}

function validateRecordId(recordId) {
  if (!recordId) {
    console.error('\n❌ Error: No record ID provided\n');
    console.log('Usage: node generate-pdf.js <airtable-record-id>\n');
    console.log('Example: node generate-pdf.js rec1234567890ABC\n');
    process.exit(1);
  }
}

// ============================
// Airtable Functions
// ============================

async function fetchRecord(recordId) {
  console.log(`📡 Fetching record ${recordId} from Airtable...`);

  const base = new Airtable({ apiKey: config.airtable.apiKey }).base(config.airtable.baseId);

  try {
    const record = await base(config.airtable.tableName).find(recordId);
    console.log(`✅ Record found: ${record.fields['Work Title'] || 'Untitled'}`);
    return record;
  } catch (error) {
    console.error(`❌ Error fetching record: ${error.message}`);
    throw error;
  }
}

// ============================
// Data Mapping Functions
// ============================

function mapRecordToTemplateData(record) {
  const fields = record.fields;

  // Basic metadata
  const data = {
    // Cover/Metadata
    catalog_id: fields['Catalog ID'] || 'SI8-2026-XXXX',
    title: fields['Work Title'] || 'Untitled',
    filmmaker_name: fields['Filmmaker Name'] || 'Unknown',
    runtime: fields['Runtime'] || 'Unknown',
    production_date: fields['Production Date'] || 'Unknown',
    chain_of_title_version: 'v1.0',
    review_date: fields['Review Date'] || new Date().toISOString().split('T')[0],

    // Field 3: Rights Verified Sign-off
    reviewer_name: fields['Reviewer'] || 'SI8 Review Team',
    risk_tier: fields['Risk Tier'] || 'Standard',
    review_status: fields['Review Status'] || 'Clean Pass',
    conditions: fields['Conditions'] || 'None',
    flags: fields['Flags'] || 'None',
    licensed_likenesses: fields['Licensed Likenesses'] || 'None',
    licensed_ip: fields['Licensed IP'] || 'None',
    underlying_rights: fields['Underlying Rights'] || 'Original work',
    third_party_assets: fields['Third-Party Assets'] || 'None',
    risk_tier_rationale: fields['Risk Tier Rationale'] || '',

    // Field 5: Modification Rights
    modification_status: fields['Modification Rights Status'] || 'Not Authorized',
    modification_scope: fields['Modification Scope'] || '',
    shopping_agreement_date: fields['Shopping Agreement Date'] || '',

    // Field 6: Category Conflict
    existing_brand_placements: fields['Existing Brand Placements'] || 'None',
    ineligible_categories: fields['Ineligible Categories'] || 'None',
    suitable_categories: fields['Suitable Categories'] || '',
    brand_safety_assessment: fields['Brand Safety Assessment'] || '',

    // Field 7: Territory
    territory_status: fields['Territory'] || 'Global — no restrictions',
    territory_restrictions: fields['Territory Restrictions'] || 'None',
    existing_agreements_territory: fields['Existing Agreements (Territory)'] || 'None',

    // Field 8: Regeneration Rights
    regeneration_status: fields['Regeneration Rights Status'] || 'Not Authorized',
    tier2_eligibility: fields['Tier 2 Eligibility'] || ''
  };

  // Generate complex HTML sections
  data.tools_table_rows = generateToolsTableRows(fields);
  data.models_list = generateModelsList(fields);
  data.commercial_auth_table_rows = generateCommercialAuthTableRows(fields);
  data.scene_list = generateSceneList(fields);
  data.authorized_scenes = generateAuthorizedScenes(fields);
  data.not_authorized_scenes = fields['Not Authorized Scenes'] || 'All other scenes';
  data.version_history_rows = generateVersionHistoryRows(fields);
  data.summary_checklist = generateSummaryChecklist(fields);

  return data;
}

function generateToolsTableRows(fields) {
  // Parse tools from Airtable (assuming JSON or structured format)
  // For now, return a placeholder - you'll customize this based on your Airtable structure
  const tools = fields['Tools Used'] || [];

  if (typeof tools === 'string') {
    // If it's a text field, try to parse or return default
    return `
      <tr>
        <td colspan="6">Tools data needs to be structured. Current value: ${tools}</td>
      </tr>
    `;
  }

  // If you have structured tool data, generate rows
  return `
    <tr>
      <td>Tool data pending</td>
      <td>—</td>
      <td>—</td>
      <td>—</td>
      <td>—</td>
      <td>—</td>
    </tr>
  `;
}

function generateModelsList(fields) {
  const models = fields['Models Used'] || '';
  if (!models) return '<li>Model disclosure pending</li>';

  // Split by newlines or commas and format as list
  return models.split(/\n|,/).map(m => m.trim()).filter(Boolean)
    .map(model => `<li>${model}</li>`)
    .join('\n');
}

function generateCommercialAuthTableRows(fields) {
  // Similar to tools table - customize based on your structure
  return `
    <tr>
      <td>Commercial authorization data pending</td>
      <td>—</td>
      <td>—</td>
      <td>—</td>
    </tr>
  `;
}

function generateSceneList(fields) {
  const scenes = fields['Authorized Scenes'] || '';
  if (!scenes) return '<p>No scenes authorized for modification</p>';

  return scenes.split('\n').map(s => s.trim()).filter(Boolean)
    .map(scene => `<li>${scene}</li>`)
    .join('\n');
}

function generateAuthorizedScenes(fields) {
  const scenes = fields['Authorized Scenes'] || '';
  if (!scenes) return '<p>No scenes authorized for regeneration</p>';

  return scenes.split('\n').map(s => s.trim()).filter(Boolean)
    .map(scene => `<li>${scene}</li>`)
    .join('\n');
}

function generateVersionHistoryRows(fields) {
  const reviewDate = fields['Review Date'] || new Date().toISOString().split('T')[0];
  const catalogId = fields['Catalog ID'] || 'SI8-2026-XXXX';

  return `
    <tr>
      <td>${reviewDate}</td>
      <td>Production version reviewed. Chain of Title v1.0 issued. Catalog ID: ${catalogId}</td>
    </tr>
  `;
}

function generateSummaryChecklist(fields) {
  // Generate summary checklist items
  const items = [
    `Tool provenance: ${fields['Tool Count'] || '—'} tools documented`,
    `Rights Verified: ${fields['Risk Tier'] || 'Standard'} tier, ${fields['Review Status'] || 'Clean Pass'}`,
    `Commercial authorization: ${fields['Commercial Auth Status'] || 'Verified'}`,
    `Territory: ${fields['Territory'] || 'Global, no restrictions'}`
  ];

  return items.map(item => `<li>${item}</li>`).join('\n');
}

// ============================
// Template Functions
// ============================

async function loadTemplate() {
  console.log(`📄 Loading template from ${config.template.path}...`);
  try {
    const template = await fs.readFile(config.template.path, 'utf-8');
    console.log(`✅ Template loaded (${template.length} characters)`);
    return template;
  } catch (error) {
    console.error(`❌ Error loading template: ${error.message}`);
    throw error;
  }
}

function populateTemplate(template, data) {
  console.log('🔄 Populating template with data...');

  let html = template;

  // Replace all {{variable}} placeholders
  Object.keys(data).forEach(key => {
    const placeholder = `{{${key}}}`;
    const value = data[key] || '';
    html = html.split(placeholder).join(value);
  });

  // Check for remaining placeholders (debugging)
  const remainingPlaceholders = html.match(/\{\{[^}]+\}\}/g);
  if (remainingPlaceholders) {
    console.warn(`⚠️  Warning: ${remainingPlaceholders.length} placeholders not replaced:`);
    console.warn(remainingPlaceholders.slice(0, 5).join(', '));
  }

  console.log('✅ Template populated');
  return html;
}

// ============================
// PDF Generation Functions
// ============================

async function generatePDF(html, outputPath) {
  console.log('🖨️  Generating PDF with Puppeteer...');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set content
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generate PDF
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    console.log(`✅ PDF generated: ${outputPath}`);
  } finally {
    await browser.close();
  }
}

// ============================
// File System Functions
// ============================

function generateOutputPath(data) {
  // Create file path: 05_Catalog/represented/[filmmaker-slug]/[title-slug]/
  const filmmakerSlug = slugify(data.filmmaker_name);
  const titleSlug = slugify(data.title);
  const filename = `${data.catalog_id}-chain-of-title-v1.0.pdf`;

  const dir = path.join(__dirname, config.output.dir, filmmakerSlug, titleSlug);
  return { dir, fullPath: path.join(dir, filename) };
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function ensureDirectory(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`📁 Directory ensured: ${dirPath}`);
  } catch (error) {
    console.error(`❌ Error creating directory: ${error.message}`);
    throw error;
  }
}

// ============================
// Main Function
// ============================

async function main() {
  console.log('\n🚀 SI8 Chain of Title Generator\n');
  console.log('='.repeat(50));
  console.log('');

  try {
    // Get record ID from command line
    const recordId = process.argv[2];

    // Validate
    validateRecordId(recordId);
    validateConfig();

    // Fetch record from Airtable
    const record = await fetchRecord(recordId);

    // Map record data to template variables
    const data = mapRecordToTemplateData(record);

    // Load template
    const template = await loadTemplate();

    // Populate template
    const html = populateTemplate(template, data);

    // Generate output path
    const { dir, fullPath } = generateOutputPath(data);

    // Ensure directory exists
    await ensureDirectory(dir);

    // Generate PDF
    await generatePDF(html, fullPath);

    console.log('');
    console.log('='.repeat(50));
    console.log('');
    console.log('✅ SUCCESS!');
    console.log('');
    console.log(`📄 Chain of Title: ${data.title}`);
    console.log(`🎬 Filmmaker: ${data.filmmaker_name}`);
    console.log(`📁 PDF Location: ${fullPath}`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Spot-check the PDF for errors');
    console.log('2. Upload to Google Drive');
    console.log('3. Update Airtable with PDF link');
    console.log('');

  } catch (error) {
    console.error('\n❌ ERROR:\n');
    console.error(error.message);
    console.error('');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, mapRecordToTemplateData, generatePDF };
