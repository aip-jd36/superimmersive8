# Submission System Setup Guide

**Status:** Code deployed, awaiting manual setup
**Last updated:** March 10, 2026

---

## ✅ What's Already Done (Code Deployed)

- Frontend form collects all 12 sections including new fields
- API validates and processes submissions
- File upload to Cloudinary implemented
- Email templates created for 3 outcomes
- All code pushed to production

---

## 🔧 What You Need to Do

### **Step 1: Update Airtable Base (5 minutes)**

**Action:** Add 5 new columns to your "Submissions" table

Go to your Airtable base → Submissions table → Add these fields:

| Field Name | Field Type | Settings |
|------------|------------|----------|
| `catalog_title` | Single line text | Required |
| `catalog_description` | Long text | Optional |
| `catalog_thumbnail` | Attachment | Accept images only |
| `terms_consent` | Checkbox | Default: unchecked |
| `video_password` | Single line text | Optional |

**Also recommended (for review workflow):**

| Field Name | Field Type | Settings | Options |
|------------|------------|----------|---------|
| `review_status` | Single select | Required | Received, Pre-Screen, Full Review, Approved, Conditional, Rejected |
| `review_notes` | Long text | Optional | For decision reasoning |
| `decision_date` | Date | Optional | When review completed |
| `chain_of_title_url` | URL | Optional | Link to generated PDF |

---

### **Step 2: Create Cloudinary Account (10 minutes)**

**Why:** Store catalog thumbnails with public URLs for website display

**Steps:**

1. Go to https://cloudinary.com/users/register/free
2. Sign up (free tier: 25GB storage, 25GB bandwidth/month)
3. After signup, go to **Dashboard**
4. Copy these 3 values:
   - Cloud Name (e.g., "si8-prod")
   - API Key (e.g., "123456789012345")
   - API Secret (e.g., "abcdefghijklmnopqrstuvwxyz")

5. **Create Upload Preset:**
   - Go to Settings → Upload
   - Scroll to "Upload presets"
   - Click "Add upload preset"
   - Preset name: `si8_catalog`
   - Signing Mode: **Unsigned** (important!)
   - Folder: `si8-catalog-submissions`
   - Click "Save"

---

### **Step 3: Add Environment Variables to Vercel (5 minutes)**

**Action:** Add Cloudinary credentials to Vercel

1. Go to https://vercel.com/your-project/settings/environment-variables
2. Add these 3 variables:

| Name | Value | Environment |
|------|-------|-------------|
| `CLOUDINARY_CLOUD_NAME` | (your cloud name from step 2) | Production, Preview, Development |
| `CLOUDINARY_API_KEY` | (your API key from step 2) | Production, Preview, Development |
| `CLOUDINARY_API_SECRET` | (your API secret from step 2) | Production, Preview, Development |

3. Click "Save"
4. **Redeploy:** Go to Deployments → Latest → Click ⋯ → Redeploy

---

### **Step 4: Create Airtable Views for Review Workflow (5 minutes)**

**Action:** Organize submissions by status

In your Airtable Submissions table, create these views:

**View 1: Pending Review**
- Filter: `review_status` = "Received"
- Sort: `timestamp` (oldest first)

**View 2: In Review**
- Filter: `review_status` = "Pre-Screen" OR "Full Review"
- Sort: `timestamp` (oldest first)

**View 3: Approved**
- Filter: `review_status` = "Approved"
- Sort: `decision_date` (newest first)

**View 4: Needs Info**
- Filter: `review_status` = "Conditional"
- Sort: `timestamp` (oldest first)

**View 5: Rejected**
- Filter: `review_status` = "Rejected"
- Sort: `decision_date` (newest first)

---

### **Step 5: Test End-to-End (10 minutes)**

**Action:** Submit a test form to verify everything works

1. Go to https://www.superimmersive8.com/submit
2. Fill out all 12 sections with test data
3. Upload a test thumbnail (any image, 1920x1080px recommended)
4. Check "I agree to terms"
5. Submit

**Verify:**
- ✅ Submission succeeds (confirmation page)
- ✅ You receive internal notification email at jd@superimmersive8.com
- ✅ Test email receives filmmaker confirmation
- ✅ Airtable record created with all fields populated
- ✅ Catalog thumbnail appears in Airtable "catalog_thumbnail" field
- ✅ Thumbnail is accessible via URL (click to open)

---

## 📋 Review Workflow (How to Process Submissions)

### **When a new submission arrives:**

1. **Check email** → You'll get notification with Airtable link
2. **Open Airtable record** → "Pending Review" view
3. **Change status** to "Pre-Screen"
4. **Pre-screen (15 min):**
   - Check tools are Approved/Caution list
   - Verify commercial plan receipts provided
   - Quick scan for No List violations
   - Review modification rights authorization
   - Check audio disclosure

5. **Decision:**
   - **Pass pre-screen** → Change status to "Full Review"
   - **Need info** → Change status to "Conditional" → Send conditional email
   - **Reject** → Change status to "Rejected" → Send rejection email

6. **Full Review (45-60 min):** (if passed pre-screen)
   - Review all 7 categories (tool verification, authorship, likeness, IP, brand safety, audio, modification rights)
   - Add notes to `review_notes` field

7. **Final Decision:**
   - **Approved** → Change status to "Approved" → Generate Chain of Title → Send approval email
   - **Conditional** → Send conditional email with specific requests
   - **Rejected** → Send rejection email with clear explanation

---

## 📧 How to Send Outcome Emails

**Email templates are in:** `/07_Website/api/email-templates.js`

**To use:**
1. Copy the template code
2. Fill in the filmmaker's details
3. Send manually for now (TODO: Automate in future)

**Required for each email:**
- Filmmaker name
- Film title
- Submission ID
- Outcome-specific details (Chain of Title URL, requested info, or rejection reason)

---

## ⚠️ Important Notes

**Catalog Thumbnails:**
- Stored in Cloudinary at: `https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/si8-catalog-submissions/`
- Organized by submission ID
- Accessible via Airtable attachment field

**File Storage Limitations:**
- Receipts and supporting docs: Currently stored as text (file names/sizes only)
- Future TODO: Upload to Vercel Blob or Cloudinary

**Email Sending:**
- Confirmation emails: Automated ✅
- Outcome emails (approved/conditional/rejected): Manual for now (copy templates)
- Future TODO: Create Airtable automation or Vercel API endpoints

---

## 🚀 Next Steps After Setup

Once setup is complete:

1. Test with a real filmmaker submission
2. Document any edge cases in review process
3. Refine email templates based on actual use
4. Create Chain of Title generation workflow
5. Build catalog publishing process (approved → website)

---

## ❓ Troubleshooting

**Thumbnail not uploading?**
- Check Cloudinary credentials in Vercel env vars
- Verify upload preset `si8_catalog` exists and is unsigned
- Check Cloudinary dashboard for error logs

**Airtable record not created?**
- Check AIRTABLE_API_KEY and AIRTABLE_BASE_ID in Vercel
- Verify all new fields exist in Airtable
- Check Vercel function logs for errors

**Emails not sending?**
- Check RESEND_API_KEY in Vercel env vars
- Verify sender email (noreply@superimmersive8.com) is verified in Resend
- Check Resend dashboard for error logs

---

## 📞 Support

Questions about setup? Email jd@superimmersive8.com or check:
- Cloudinary docs: https://cloudinary.com/documentation
- Airtable API docs: https://airtable.com/developers/web/api
- Vercel env vars: https://vercel.com/docs/concepts/projects/environment-variables

---

**Setup Status:** ⏳ Pending manual steps (Airtable + Cloudinary)
**Target completion:** Before first real filmmaker submission
