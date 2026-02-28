# Google Cloud Setup Guide — Rights Verified Web Intake Form

**Time required:** 15-20 minutes
**Prerequisites:** Google account (use your SI8 Google account)

---

## Step 1: Create Google Cloud Project (5 min)

1. **Go to Google Cloud Console:**
   - Open: https://console.cloud.google.com/

2. **Create new project:**
   - Click "Select a project" dropdown (top left, next to "Google Cloud")
   - Click "NEW PROJECT"
   - Project name: `SI8 Rights Verified`
   - Location: Leave as "No organization"
   - Click "CREATE"
   - Wait for project to be created (~30 seconds)

3. **Select the new project:**
   - Click "Select a project" dropdown again
   - Click "SI8 Rights Verified"
   - Verify in top bar it shows "SI8 Rights Verified"

---

## Step 2: Enable Google Sheets API (2 min)

1. **Navigate to APIs & Services:**
   - In left sidebar: Click "APIs & Services" → "Library"
   - Or go directly to: https://console.cloud.google.com/apis/library

2. **Enable Google Sheets API:**
   - Search for: `Google Sheets API`
   - Click on "Google Sheets API"
   - Click "ENABLE"
   - Wait for API to enable (~10 seconds)

---

## Step 3: Enable Google Drive API (2 min)

1. **Back to API Library:**
   - Click "APIs & Services" → "Library" (or browser back button)

2. **Enable Google Drive API:**
   - Search for: `Google Drive API`
   - Click on "Google Drive API"
   - Click "ENABLE"
   - Wait for API to enable (~10 seconds)

---

## Step 4: Create Service Account (5 min)

**What is a service account?**
A "robot" account that your code uses to access Google Sheets/Drive without requiring you to log in manually each time.

1. **Navigate to Service Accounts:**
   - In left sidebar: Click "IAM & Admin" → "Service Accounts"
   - Or go to: https://console.cloud.google.com/iam-admin/serviceaccounts

2. **Create service account:**
   - Click "+ CREATE SERVICE ACCOUNT" (top of page)

3. **Service account details:**
   - Service account name: `rights-verified-bot`
   - Service account ID: (auto-fills: `rights-verified-bot@...`)
   - Description: `Service account for Rights Verified web intake form`
   - Click "CREATE AND CONTINUE"

4. **Grant access (optional):**
   - Role: Skip this (click "CONTINUE" without selecting a role)
   - We'll grant access directly to the Sheet/Drive folder later

5. **Grant users access (optional):**
   - Skip this (click "DONE")

---

## Step 5: Create Service Account Key (3 min)

**This is the credential file your code will use.**

1. **Find your service account:**
   - You should see `rights-verified-bot@...` in the service accounts list
   - Click on the email address (the whole row is clickable)

2. **Create key:**
   - Click "KEYS" tab (at top)
   - Click "ADD KEY" → "Create new key"
   - Key type: Select "JSON"
   - Click "CREATE"

3. **Download key:**
   - A JSON file will automatically download
   - Filename: `si8-rights-verified-1234567890ab.json` (random numbers)
   - **IMPORTANT:** Save this file securely! You'll need it later.
   - **DO NOT commit this to GitHub** (it's a secret)

4. **Note the service account email:**
   - It looks like: `rights-verified-bot@si8-rights-verified-123456.iam.gserviceaccount.com`
   - Copy this email address (you'll need it in Step 7)

---

## Step 6: Create Google Sheet (3 min)

1. **Go to Google Sheets:**
   - Open: https://sheets.google.com/

2. **Create new spreadsheet:**
   - Click "Blank" (or "+" to create new)
   - Name it: `SI8 Rights Verified Submissions`

3. **Create sheet:**
   - Bottom left, you should see "Sheet1" tab
   - Right-click "Sheet1" → Rename to: `Submissions`

4. **Add column headers:**
   - Row 1 should have these 40 headers (copy-paste each into cells A1-AN1):

```
submission_id
timestamp
status
filmmaker_name
filmmaker_email
filmmaker_location
filmmaker_portfolio
prior_works
first_submission
title
runtime
genre
logline
intended_use
production_start
production_end
existing_agreements
tools_json
receipts_folder_url
authorship_declaration
likeness_confirmed
likeness_notes
ip_confirmed
ip_notes
audio_music_source
audio_music_tool
audio_sound_design
audio_voiceover
tier2_enrollment
tier2_scenes
territory_preference
territory_restrictions
exclusivity_preference
video_file_url
supporting_docs_folder
reviewer
review_notes
catalog_id
chain_of_title_url
last_updated
```

**Quick way to add headers:**
- Copy all 40 lines above
- Click cell A1
- Paste
- It should fill A1-A40 (one per row)
- Select A1:A40
- Copy
- Click cell A1 again
- Right-click → "Paste special" → "Paste transposed"
- Now headers are in row 1, columns A-AN

5. **Note the Spreadsheet ID:**
   - Look at the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit`
   - Copy the long ID between `/d/` and `/edit`
   - Example: `1aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789`
   - Save this ID — you'll need it later

---

## Step 7: Share Google Sheet with Service Account (1 min)

**This gives the service account permission to write to your sheet.**

1. **In Google Sheet:**
   - Click "Share" button (top right)

2. **Add service account:**
   - In "Add people and groups" field, paste the service account email
   - Example: `rights-verified-bot@si8-rights-verified-123456.iam.gserviceaccount.com`
   - Role: "Editor"
   - **UNCHECK** "Notify people" (it's a robot, doesn't need email notification)
   - Click "Share" or "Done"

---

## Step 8: Create Google Drive Folder (2 min)

1. **Go to Google Drive:**
   - Open: https://drive.google.com/

2. **Create folder:**
   - Click "New" → "Folder"
   - Name: `SI8 Rights Verified Submissions`
   - Click "CREATE"

3. **Open the folder:**
   - Double-click to open it (should be empty)

4. **Note the Folder ID:**
   - Look at URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
   - Copy the ID at the end
   - Example: `1XyZaBcDeFgHiJkLmNoPqRsTuVwXyZ`
   - Save this ID — you'll need it later

5. **Share folder with service account:**
   - Right-click folder name (in Drive) → "Share"
   - Add service account email (same as Step 7)
   - Role: "Editor"
   - **UNCHECK** "Notify people"
   - Click "Share" or "Done"

---

## Step 9: Save All Credentials (1 min)

**Create a text file with all your IDs/keys:**

Create: `06_Operations/rights-verified/web-intake/CREDENTIALS.txt`

**Contents:**
```
SERVICE ACCOUNT EMAIL:
rights-verified-bot@si8-rights-verified-123456.iam.gserviceaccount.com

SERVICE ACCOUNT KEY FILE:
/path/to/downloaded/si8-rights-verified-1234567890ab.json

SPREADSHEET ID:
1aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789

GOOGLE DRIVE FOLDER ID:
1XyZaBcDeFgHiJkLmNoPqRsTuVwXyZ

GOOGLE CLOUD PROJECT ID:
si8-rights-verified-123456
```

**IMPORTANT:**
- DO NOT commit `CREDENTIALS.txt` to GitHub
- Add to `.gitignore`: `CREDENTIALS.txt`
- Add to `.gitignore`: `*.json` (to prevent service account key from being committed)

---

## Step 10: Test Connection (5 min)

**Let's verify everything works before building the form.**

1. **Install Google APIs library:**
```bash
cd /Users/JD/Desktop/SuperImmersive8
npm install googleapis@^120.0.0
```

2. **Create test script:**

Create: `06_Operations/rights-verified/web-intake/test-connection.js`

```javascript
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Load service account key
const keyPath = '/path/to/your/si8-rights-verified-1234567890ab.json';
const serviceAccountKey = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

// Authenticate
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccountKey,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file'
  ]
});

async function testConnection() {
  console.log('Testing Google Cloud connection...\n');

  // Test 1: Google Sheets API
  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = 'YOUR_SPREADSHEET_ID_HERE';

    console.log('📊 Testing Google Sheets API...');

    // Read headers
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Submissions!A1:AN1'
    });

    console.log('✅ Google Sheets API works!');
    console.log(`   Found ${response.data.values[0].length} column headers`);

    // Write test row
    const testRow = ['TEST-2026-0001', new Date().toISOString(), 'test', 'Test User', 'test@example.com'];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Submissions!A:E',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [testRow] }
    });

    console.log('✅ Google Sheets write works!');
    console.log('   Check your spreadsheet for test row\n');

  } catch (error) {
    console.error('❌ Google Sheets API error:', error.message);
    return;
  }

  // Test 2: Google Drive API
  try {
    const drive = google.drive({ version: 'v3', auth });
    const folderId = 'YOUR_FOLDER_ID_HERE';

    console.log('📁 Testing Google Drive API...');

    // Create test folder
    const folderMetadata = {
      name: 'TEST-2026-0001',
      mimeType: 'application/vnd.google-apps.folder',
      parents: [folderId]
    };

    const folder = await drive.files.create({
      resource: folderMetadata,
      fields: 'id'
    });

    console.log('✅ Google Drive API works!');
    console.log(`   Created test folder ID: ${folder.data.id}`);
    console.log('   Check your Google Drive folder\n');

  } catch (error) {
    console.error('❌ Google Drive API error:', error.message);
    return;
  }

  console.log('🎉 All tests passed! Google Cloud setup is complete.');
}

testConnection();
```

3. **Update the script:**
   - Replace `YOUR_SPREADSHEET_ID_HERE` with your Spreadsheet ID
   - Replace `YOUR_FOLDER_ID_HERE` with your Google Drive Folder ID
   - Replace `/path/to/your/si8-rights-verified-1234567890ab.json` with actual path

4. **Run test:**
```bash
node 06_Operations/rights-verified/web-intake/test-connection.js
```

5. **Expected output:**
```
Testing Google Cloud connection...

📊 Testing Google Sheets API...
✅ Google Sheets API works!
   Found 40 column headers
✅ Google Sheets write works!
   Check your spreadsheet for test row

📁 Testing Google Drive API...
✅ Google Drive API works!
   Created test folder ID: 1AbCdEfGhIjKlMnOpQrStUvWxYz
   Check your Google Drive folder

🎉 All tests passed! Google Cloud setup is complete.
```

6. **Verify:**
   - Open Google Sheet → should see test row in row 2
   - Open Google Drive folder → should see "TEST-2026-0001" folder
   - If both exist → setup is complete! ✅

7. **Clean up test data:**
   - Delete test row from Google Sheet
   - Delete test folder from Google Drive

---

## Step 11: Add to Vercel Environment Variables (Later)

**You'll do this when deploying to production (Day 12).**

When ready to deploy:

1. Go to Vercel dashboard: https://vercel.com/
2. Select project: `superimmersive8`
3. Go to "Settings" → "Environment Variables"
4. Add these variables:

| Name | Value |
|------|-------|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Paste entire contents of JSON key file |
| `SHEET_ID` | Your Spreadsheet ID |
| `GOOGLE_DRIVE_FOLDER_ID` | Your Google Drive Folder ID |

**For local development:**

Create `.env.local` file (not committed to git):

```
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"si8-rights-verified-123456",...}
SHEET_ID=1aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789
GOOGLE_DRIVE_FOLDER_ID=1XyZaBcDeFgHiJkLmNoPqRsTuVwXyZ
RESEND_API_KEY=re_xxxxx
```

---

## Troubleshooting

### "Permission denied" error
- Make sure you shared the Sheet/Drive folder with the service account email
- Make sure service account has "Editor" access (not "Viewer")

### "Invalid credentials" error
- Make sure you downloaded the JSON key correctly
- Make sure you're using the correct key file path
- Make sure the key file is valid JSON (open in text editor to verify)

### "API not enabled" error
- Go back to Google Cloud Console → APIs & Services → Library
- Make sure both Google Sheets API and Google Drive API show as "Enabled"

### "Quota exceeded" error
- Free tier = 1,000 requests per 100 seconds
- Very unlikely to hit this limit with form submissions
- If hit, wait 100 seconds and try again

---

## Security Checklist

Before proceeding:

- [ ] Service account JSON key saved securely (not in public folder)
- [ ] Added `*.json` to `.gitignore`
- [ ] Added `CREDENTIALS.txt` to `.gitignore`
- [ ] Service account email has "Editor" access to Sheet + Drive folder
- [ ] Test connection script passed all tests
- [ ] Test data cleaned up (test row + test folder deleted)

---

## Next Steps

Once Google Cloud setup is complete:

✅ **Day 1 complete** (Google Cloud setup)
⏳ **Day 2-5:** Build frontend (HTML/CSS/JS)

---

**Setup complete? Run the test script and verify everything works before building the form!**
