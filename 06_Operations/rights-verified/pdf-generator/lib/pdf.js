/**
 * PDF Generation Helper Functions (Serverless-optimized)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// For serverless Chrome (Vercel)
import chromium from 'chrome-aws-lambda';
import puppeteerCore from 'puppeteer-core';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load HTML template
 * @returns {Promise<string>} Template HTML string
 */
export async function loadTemplate() {
  const templatePath = path.join(__dirname, '..', 'template.html');
  const template = await fs.readFile(templatePath, 'utf-8');
  return template;
}

/**
 * Populate template with data
 * @param {string} template - HTML template
 * @param {Object} data - Data object with template variables
 * @returns {string} Populated HTML
 */
export function populateTemplate(template, data) {
  let html = template;

  // Replace all {{variable}} placeholders
  Object.keys(data).forEach(key => {
    const placeholder = `{{${key}}}`;
    const value = data[key] || '';
    html = html.split(placeholder).join(value);
  });

  return html;
}

/**
 * Generate PDF from HTML using serverless Chrome
 * @param {string} html - HTML content
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function generatePDF(html) {
  let browser = null;

  try {
    // Launch browser with serverless Chrome
    browser = await puppeteerCore.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true
    });

    const page = await browser.newPage();

    // Set content
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    return pdfBuffer;

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Generate filename for PDF
 * @param {Object} data - Template data
 * @returns {string} Filename
 */
export function generateFilename(data) {
  const catalogId = data.catalog_id || 'SI8-XXXX';
  return `${catalogId}-chain-of-title-v1.0.pdf`;
}

/**
 * Slugify text for use in URLs/filenames
 * @param {string} text - Text to slugify
 * @returns {string} Slugified text
 */
export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate storage path for PDF
 * @param {Object} data - Template data
 * @returns {Object} Path information
 */
export function generateStoragePath(data) {
  const filmmakerSlug = slugify(data.filmmaker_name);
  const titleSlug = slugify(data.title);
  const filename = generateFilename(data);

  return {
    filmmaker: filmmakerSlug,
    title: titleSlug,
    filename,
    relativePath: `${filmmakerSlug}/${titleSlug}/${filename}`
  };
}
