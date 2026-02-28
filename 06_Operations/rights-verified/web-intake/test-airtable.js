const Airtable = require('airtable');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env.local') });

// Load credentials from environment variables
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ Missing environment variables!');
  console.error('   Make sure .env.local contains:');
  console.error('   - AIRTABLE_API_KEY');
  console.error('   - AIRTABLE_BASE_ID\n');
  process.exit(1);
}

const airtable = new Airtable({ apiKey: AIRTABLE_API_KEY });
const base = airtable.base(AIRTABLE_BASE_ID);

async function testConnection() {
  console.log('Testing Airtable connection...\n');

  // Test 1: Read table schema (check if base is accessible)
  try {
    console.log('📊 Testing base access...');

    const records = await base('Submissions')
      .select({ maxRecords: 1 })
      .firstPage();

    console.log('✅ Base access works!');
    console.log(`   Found table: Submissions`);
    console.log(`   Current record count: ${records.length}\n`);
  } catch (error) {
    console.error('❌ Base access error:', error.message);
    console.error('   Check: API token has correct scopes and base access\n');
    return;
  }

  // Test 2: Create test record
  try {
    console.log('📝 Testing record creation...');

    const testRecord = await base('Submissions').create([
      {
        fields: {
          submission_id: 'TEST-2026-0001',
          status: 'received',
          filmmaker_name: 'Test Filmmaker',
          filmmaker_email: 'test@example.com',
          filmmaker_location: 'Test City',
          title: 'Test Film',
          runtime: '01:30',
          genre: 'Test Genre',
          first_submission: true,
          video_url: 'https://vimeo.com/test'
        }
      }
    ]);

    console.log('✅ Record creation works!');
    console.log(`   Created record ID: ${testRecord[0].id}`);
    console.log('   Check your Airtable base for the test record\n');

    // Test 3: Read the record we just created
    console.log('📖 Testing record read...');

    const readRecord = await base('Submissions').find(testRecord[0].id);

    console.log('✅ Record read works!');
    console.log(`   Read back: ${readRecord.get('filmmaker_name')}\n`);

    // Test 4: Delete test record (cleanup)
    console.log('🗑️  Cleaning up test record...');

    await base('Submissions').destroy([testRecord[0].id]);

    console.log('✅ Test record deleted\n');

  } catch (error) {
    console.error('❌ Record operation error:', error.message);
    if (error.statusCode === 422) {
      console.error('   Likely cause: Field name mismatch or missing required field');
      console.error('   Check: All field names match exactly (case-sensitive)\n');
    }
    return;
  }

  console.log('🎉 All tests passed! Airtable setup is complete.');
  console.log('\nNext step: Build the web form frontend');
}

testConnection();
