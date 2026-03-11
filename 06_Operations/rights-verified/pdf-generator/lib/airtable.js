/**
 * Airtable Helper Functions
 */

import Airtable from 'airtable';

// Initialize Airtable base
let base;

function getBase() {
  if (!base) {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!apiKey || !baseId) {
      throw new Error('Airtable credentials not configured');
    }

    base = new Airtable({ apiKey }).base(baseId);
  }
  return base;
}

/**
 * Fetch approved records from Airtable
 * @returns {Promise<Array>} Array of approved records
 */
export async function fetchApprovedRecords() {
  const tableName = process.env.AIRTABLE_TABLE_NAME || 'Rights Verified Submissions';
  const records = [];

  try {
    await getBase()(tableName)
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

    return records;
  } catch (error) {
    console.error('Error fetching approved records:', error);
    throw error;
  }
}

/**
 * Fetch a single record by ID
 * @param {string} recordId - Airtable record ID
 * @returns {Promise<Object>} Record object
 */
export async function fetchRecord(recordId) {
  const tableName = process.env.AIRTABLE_TABLE_NAME || 'Rights Verified Submissions';

  try {
    const record = await getBase()(tableName).find(recordId);
    return record;
  } catch (error) {
    console.error('Error fetching record:', error);
    throw error;
  }
}

/**
 * Map Airtable record to template data
 * @param {Object} record - Airtable record
 * @returns {Object} Template data object
 */
export function mapRecordToTemplateData(record) {
  const fields = record.fields;

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

  // Generate complex HTML sections (placeholder for now)
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

// Helper functions for generating complex HTML sections
function generateToolsTableRows(fields) {
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

  return models.split(/\n|,/).map(m => m.trim()).filter(Boolean)
    .map(model => `<li>${model}</li>`)
    .join('\n');
}

function generateCommercialAuthTableRows(fields) {
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
  const items = [
    `Tool provenance: ${fields['Tool Count'] || '—'} tools documented`,
    `Rights Verified: ${fields['Risk Tier'] || 'Standard'} tier, ${fields['Review Status'] || 'Clean Pass'}`,
    `Commercial authorization: ${fields['Commercial Auth Status'] || 'Verified'}`,
    `Territory: ${fields['Territory'] || 'Global, no restrictions'}`
  ];

  return items.map(item => `<li>${item}</li>`).join('\n');
}
