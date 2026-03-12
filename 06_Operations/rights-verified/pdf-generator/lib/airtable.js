/**
 * Airtable Helper Functions - Using Direct REST API
 */

const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';

function getConfig() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_TABLE_NAME;

  if (!apiKey || !baseId || !tableName) {
    throw new Error('Airtable credentials not configured');
  }

  return { apiKey, baseId, tableName };
}

/**
 * Fetch approved records from Airtable using REST API
 * @returns {Promise<Array>} Array of approved records
 */
export async function fetchApprovedRecords() {
  const { apiKey, baseId, tableName } = getConfig();

  try {
    const url = `${AIRTABLE_API_BASE}/${baseId}/${encodeURIComponent(tableName)}?filterByFormula={status}='received'&sort[0][field]=submission_id&sort[0][direction]=desc&maxRecords=100`;

    console.log('Fetching from:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Airtable API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    const records = data.records.map(record => ({
      id: record.id,
      title: record.fields['submission_id'] || record.fields['title'] || 'Untitled',
      filmmaker: record.fields['filmmaker_name'] || 'Unknown',
      catalogId: record.fields['submission_id'] || 'Pending',
      reviewDate: new Date().toISOString().split('T')[0],
      status: record.fields['status'] || 'Unknown'
    }));

    console.log('Successfully fetched', records.length, 'records');
    return records;
  } catch (error) {
    console.error('Error fetching approved records:', error);
    throw error;
  }
}

/**
 * Fetch a single record by ID using REST API
 * @param {string} recordId - Airtable record ID
 * @returns {Promise<Object>} Record object
 */
export async function fetchRecord(recordId) {
  const { apiKey, baseId, tableName } = getConfig();

  try {
    const url = `${AIRTABLE_API_BASE}/${baseId}/${encodeURIComponent(tableName)}/${recordId}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Airtable API error (${response.status}): ${errorText}`);
    }

    const record = await response.json();
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

  // Map actual Airtable field names to template variables
  const data = {
    // Cover/Metadata - using actual field names from submission form
    catalog_id: fields['submission_id'] || 'SI8-2026-XXXX',
    title: fields['title'] && fields['title'] !== fields['filmmaker_name']
      ? fields['title']
      : fields['submission_id'] || 'Untitled',
    filmmaker_name: fields['filmmaker_name'] || 'Unknown',
    runtime: fields['runtime'] || 'Unknown',
    production_date: fields['production_start'] && fields['production_end']
      ? `${fields['production_start']} to ${fields['production_end']}`
      : 'Unknown',
    chain_of_title_version: 'v1.0',
    review_date: fields['last_updated'] ? fields['last_updated'].split('T')[0].replace(/-/g, '/') : new Date().toISOString().split('T')[0],

    // Field 3: Rights Verified Sign-off
    reviewer_name: fields['reviewer'] || 'SI8 Review Team',
    risk_tier: 'Standard', // Default for now
    review_status: fields['status'] === 'received' ? 'Pending Review' : 'Clean Pass',
    conditions: 'None',
    flags: 'None',
    licensed_likenesses: fields['likeness_confirmed'] ? 'None (confirmed)' : 'Pending verification',
    licensed_ip: fields['ip_confirmed'] ? 'None (confirmed)' : 'Pending verification',
    underlying_rights: 'Original work - AI generated',
    third_party_assets: fields['audio_music_source'] || 'None',
    risk_tier_rationale: '',

    // Field 5: Modification Rights
    modification_status: fields['tier2_enrollment'] === 'Yes scenes' ? 'Authorized (specific scenes)' :
                         (fields['tier2_enrollment'] === 'Yes full' || fields['tier2_enrollment'] === 'Yes') ? 'Authorized (full work)' : 'Not Authorized',
    modification_scope: fields['tier2_scenes'] || (fields['tier2_enrollment'] === 'Yes full' ? 'Full work authorized' : ''),
    shopping_agreement_date: '',

    // Field 6: Category Conflict
    existing_brand_placements: 'None',
    ineligible_categories: 'None',
    suitable_categories: fields['genre'] || '',
    brand_safety_assessment: fields['logline'] || '',

    // Field 7: Territory
    territory_status: fields['territory_preference'] || 'Global — no restrictions',
    territory_restrictions: 'None',
    existing_agreements_territory: fields['existing_agreements'] || 'None',

    // Field 8: Regeneration Rights
    regeneration_status: fields['tier2_enrollment'] ? 'Authorized for Tier 2 placement' : 'Not Authorized',
    tier2_eligibility: fields['tier2_enrollment'] || 'Not enrolled'
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
  const toolsJson = fields['tools_json'];

  if (!toolsJson) {
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

  try {
    const tools = typeof toolsJson === 'string' ? JSON.parse(toolsJson) : toolsJson;

    if (!Array.isArray(tools) || tools.length === 0) {
      return '<tr><td colspan="6">No tools recorded</td></tr>';
    }

    return tools.map((tool, index) => `
      <tr>
        <td>${tool.name || '—'}</td>
        <td>${tool.version || '—'}</td>
        <td>${tool.plan || '—'}</td>
        <td>✓ Commercial License</td>
        <td>${fields['production_start'] || '—'} to ${fields['production_end'] || '—'}</td>
        <td>Receipt on file</td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Error parsing tools_json:', e);
    return '<tr><td colspan="6">Error parsing tool data</td></tr>';
  }
}

function generateModelsList(fields) {
  const toolsJson = fields['tools_json'];

  if (!toolsJson) {
    return '<li>Model disclosure pending</li>';
  }

  try {
    const tools = typeof toolsJson === 'string' ? JSON.parse(toolsJson) : toolsJson;

    if (!Array.isArray(tools) || tools.length === 0) {
      return '<li>No models recorded</li>';
    }

    return tools.map(tool => `<li>${tool.name} ${tool.version || ''}</li>`).join('\n');
  } catch (e) {
    return '<li>Error parsing model data</li>';
  }
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
