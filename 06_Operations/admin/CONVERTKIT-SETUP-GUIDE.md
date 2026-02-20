# Kit Setup Guide — Free Plan (3-Email Sequence)
## SuperImmersive 8 Lead Gen Funnel

**Time Required:** 60 minutes
**Plan:** Kit Newsletter (Free) — up to 10,000 subscribers
**Last Updated:** February 20, 2026

---

## Overview: What You're Building

```
Website Visitor
  ↓
Submits form on gated page (Formspree)
  ↓
Zapier triggers → Adds to Kit
  ↓
Visual Automation runs:
  ↓
Email #1: Welcome + PDF links (immediate)
  ↓
Wait 3 days
  ↓
Email #2: Why vetting matters + Adobe gap (Day 3)
  ↓
Wait 4 days
  ↓
Email #3: Final check-in + CTA (Day 7)
  ↓
Calendar booking → Discovery call
```

**Why Free Plan works:** The free plan includes "1 basic Visual Automation" — we'll build the entire 3-email flow as a single automation with time delays.

---

## PART 1: Before You Start

### **A. Upload PDFs to Google Drive**

1. Convert HTML files to PDF first:
   - Open `legal-risk-reduction-brief-pdf.html` in browser
   - File → Print → Save as PDF → Name it `Legal-Risk-Reduction-Brief.pdf`
   - Open `v0.2-pdf.html` in browser
   - File → Print → Save as PDF → Name it `Rights-Playbook-v0.2-Executive-Summary.pdf`

2. Upload to Google Drive:
   - Create new folder: "SI8 Lead Magnets"
   - Upload both PDFs
   - Right-click each PDF → Share → Change to "Anyone with the link can view"
   - Click "Copy link" for each

3. **SAVE THESE LINKS** — you'll paste them into Email #1:

```
Legal Brief: ___________________________________________________

Rights Playbook: ___________________________________________________
```

---

## PART 2: Kit Account Setup

### **Step 1: Create Account**

1. Go to https://kit.com
2. Click "Get started free"
3. Enter email, create password
4. Choose plan: **Newsletter (Free)** — up to 10,000 subscribers
5. Complete profile:
   - Name: [Your Name]
   - Website: www.superimmersive8.com
   - Industry: Marketing & Advertising
6. Skip onboarding tour (click "Skip" or "X")

**✅ Checkpoint:** You should see the Kit dashboard

---

### **Step 2: Create Tags**

Tags help you segment subscribers by interest and role.

1. In dashboard, click **"Grow"** (left sidebar)
2. Click **"Tags"**
3. Click **"Create a tag"**
4. Create these 2 tags (one at a time):

**Tag 1:**
```
Name: Lead-Download
Description: Downloaded legal brief or rights playbook
```

**Tag 2:**
```
Name: Lead-Brand
Description: Brand or agency role (from form)
```

**Optional Tag 3** (if you want to track filmmakers separately):
```
Name: Lead-Filmmaker
Description: Filmmaker role (from form)
```

**✅ Checkpoint:** You should see 2-3 tags listed

---

## PART 3: Create Visual Automation (3-Email Flow)

### **Step 3: Create Automation**

1. Click **"Automate"** (left sidebar)
2. Click **"Create automation"** or **"Visual automations"** → **"New automation"**
3. Automation name: `Legal Brief 3-Email Nurture`
4. Click **"Create"** or **"Start from scratch"**

**✅ Checkpoint:** You should see empty automation canvas

---

### **Step 4: Set Up Trigger**

1. Click **"Add trigger"** or click the starting circle
2. Choose trigger: **"Tag added"**
3. Select tag: **"Lead-Download"**
4. Click **"Done"** or **"Save"**

**This means:** When Zapier adds someone with the "Lead-Download" tag, this automation starts.

**✅ Checkpoint:** Trigger box should show "Tag added: Lead-Download"

---

### **Step 5: Add Email #1 (Welcome + PDFs)**

1. Click **"+"** below the trigger box
2. Choose action: **"Send email"**
3. Click **"Create email"**

---

#### **EMAIL #1: Welcome + PDF Links**

**Subject Line:**
```
Your Legal Risk Brief from SuperImmersive 8
```

**Preview Text:**
```
Plus: Rights Playbook v0.2 Executive Summary
```

**Email Body:** (Replace [PDF LINK 1] and [PDF LINK 2] with your Google Drive links)
```
Hi {{first_name}},

Thanks for requesting our Legal Risk Reduction Brief!

Here are your downloads:

📄 Legal Risk Reduction Brief
[PDF LINK 1 - PASTE YOUR GOOGLE DRIVE LINK HERE]

📄 Rights Playbook v0.2 Executive Summary
[PDF LINK 2 - PASTE YOUR GOOGLE DRIVE LINK HERE]

These resources explain how SI8's Rights Package reduces AI content liability through:

✓ 73%+ statutory damage reduction (innocent infringer defense)
✓ Colorado AI Act safe harbor compliance
✓ Copyrightability assurance (USCO human authorship requirement)
✓ Distribution enablement (E&O insurance + platform compliance)

The file is the carrier. The Rights Package is the product.

Want to discuss how this applies to your brand's AI content needs?
→ Book a 15-min call: https://calendly.com/aipenguins/superimmersive8

Best,
[YOUR NAME]
SuperImmersive 8
www.superimmersive8.com

P.S. I'll follow up in a few days with why unvetted AI video is a legal time bomb.
```

**Action:**
1. Paste subject line
2. Paste preview text
3. Paste email body
4. **REPLACE [PDF LINK 1] and [PDF LINK 2]** with your actual Google Drive links
5. **REPLACE [YOUR NAME]** with your actual name
6. Click **"Save"** or **"Done"**

**✅ Checkpoint:** Email #1 should appear in automation flow

---

### **Step 6: Add 3-Day Wait**

1. Click **"+"** below Email #1
2. Choose action: **"Wait"** or **"Add delay"**
3. Set duration: **3 days**
4. Click **"Done"** or **"Save"**

**✅ Checkpoint:** Wait box should show "Wait 3 days"

---

### **Step 7: Add Email #2 (Why Vetting Matters + Adobe Gap)**

1. Click **"+"** below the Wait box
2. Choose action: **"Send email"**
3. Click **"Create email"**

---

#### **EMAIL #2: Risk + Competitive Differentiation**

**Subject Line:**
```
Adobe won't protect Sora, Runway, or Kling. We will.
```

**Preview Text:**
```
The $150K mistake + the gap Adobe can't fill
```

**Email Body:**
```
Hi {{first_name}},

Quick question: If your legal team flags your AI campaign tomorrow, do you have the documentation to prove good faith?

Most brands don't — until it's too late.

Here's what's happening to brands without documentation:

• Willful infringement penalty: up to $150,000 per work
• Colorado AI Act violation: $20,000 per incident
• Platform removal: TikTok's 340% enforcement increase in 2025

The gap isn't the content. It's the paper trail.

And here's the competitive reality: Adobe's Firefly indemnification only covers Firefly.

If your creative team wants:
• Sora (best cinematic quality)
• Runway (best motion control)
• Kling (best at complex scenes)

Adobe explicitly excludes those tools from indemnification.

Read their terms: "Adobe will have no liability for any Claim to the extent that the Claim is based on... any combination of a Firefly Output with any other material."

This is the gap SI8 fills.

Adobe = safe but boring (Firefly only)
SI8 = best creative tools made safe (through Safe Lane vetting)

Our Safe Lane process:

1. Pre-screen (15 min): Tool verification, No List check
2. Full review (60 min): 7 categories, clear thresholds
3. Risk tier assignment: Certified / Standard / Caution / Reject
4. Rights Package output: 9-field documentation

Our Rights Package documents:
• Tool provenance (which AI tools, versions, paid plans)
• Model disclosure (which AI models generated content)
• Safe Lane sign-off (legal review + risk tier)
• Commercial use authorization (ToS compliance verified)
• Version history (human authorship for copyrightability)
• + 4 more fields

→ See the full process: https://www.superimmersive8.com/safe-lane-how-it-works.html
→ See the Rights Package breakdown: https://www.superimmersive8.com/safe-lane-rights-package.html

Ready to use the best tools safely?
→ Book a call: https://calendly.com/aipenguins/superimmersive8

Best,
[YOUR NAME]
SuperImmersive 8
```

**Action:**
1. Paste all content
2. Replace [YOUR NAME]
3. Click **"Save"** or **"Done"**

**✅ Checkpoint:** Email #2 should appear in automation flow

---

### **Step 8: Add 4-Day Wait**

1. Click **"+"** below Email #2
2. Choose action: **"Wait"** or **"Add delay"**
3. Set duration: **4 days**
4. Click **"Done"** or **"Save"**

**✅ Checkpoint:** Wait box should show "Wait 4 days"

---

### **Step 9: Add Email #3 (Final Check-In)**

1. Click **"+"** below the Wait box
2. Choose action: **"Send email"**
3. Click **"Create email"**

---

#### **EMAIL #3: Final Follow-Up**

**Subject Line:**
```
Still evaluating AI content options?
```

**Preview Text:**
```
Final check-in — any questions about Safe Lane vetting?
```

**Email Body:**
```
Hi {{first_name}},

I wanted to check in one last time.

You downloaded our Legal Risk Brief last week — any questions come up as you reviewed it?

Common questions I get:

• "Can we use this for existing AI campaigns?"
• "What if we already have footage from Midjourney/Runway?"
• "How does this integrate with our existing agency workflow?"
• "What's the pricing structure?"

Happy to jump on a quick 15-min call to walk through your specific situation.

→ Book here: https://calendly.com/aipenguins/superimmersive8

If now's not the right time, no worries — you'll hear from me when we have case studies to share (targeting Q2 2026).

Best,
[YOUR NAME]
SuperImmersive 8

P.S. If you're curious, here's our complete vetting process: https://www.superimmersive8.com/safe-lane-how-it-works.html
```

**Action:**
1. Paste all content
2. Replace [YOUR NAME]
3. Click **"Save"** or **"Done"**

**✅ Checkpoint:** Email #3 should appear in automation flow

---

### **Step 10: Review & Activate Automation**

1. Review the full automation flow:
   ```
   Trigger: Tag "Lead-Download" added
     ↓
   Email #1 (Welcome + PDFs)
     ↓
   Wait 3 days
     ↓
   Email #2 (Risk + Adobe)
     ↓
   Wait 4 days
     ↓
   Email #3 (Final check-in)
   ```

2. Check all emails are saved
3. At top of automation page, toggle **"Inactive"** to **"Active"**
4. Confirm activation

**✅ Checkpoint:** Automation status should show "Active" (green)

---

## PART 4: Zapier Integration (Connect Formspree → Kit)

### **Step 11: Create Zapier Account**

1. Go to https://zapier.com
2. Sign up (email + password)
3. Choose plan: **Free** (100 tasks/month) or **Starter** ($19.99/mo — 750 tasks/month)
   - Free plan works if you expect <100 form submissions/month
4. Complete onboarding
5. Click **"Create Zap"** button

---

### **Step 12: Configure Zap — Trigger**

**Trigger = Formspree form submission**

1. Search for app: **"Formspree"**
2. Select **"Formspree"**
3. Choose trigger event: **"New Submission"**
4. Click **"Continue"**
5. Click **"Sign in to Formspree"**
6. Log in with your Formspree account
7. Authorize Zapier to access Formspree
8. Choose account: Select your Formspree account
9. Click **"Continue"**
10. Choose form: Select **"safe-lane-legal-brief"** form (or whichever gated form you're using)
11. Click **"Continue"**
12. Click **"Test trigger"**
13. Zapier will find a recent form submission (if you haven't submitted test yet, do that now)
14. Click **"Continue with selected record"**

**✅ Checkpoint:** You should see sample form data (name, email, company, role)

---

### **Step 13: Configure Zap — Action (Add to Kit)**

**Action = Add subscriber to Kit with tag**

1. Click **"+"** to add action
2. Search for app: **"Kit"** or **"ConvertKit"** (same company, Kit is the new name)
3. Select **"Kit"**
4. Choose action event: **"Add Tag to Subscriber"**
5. Click **"Continue"**
6. Click **"Sign in to Kit"**
7. You'll need your Kit API Secret:
   - Go to Kit dashboard (new tab)
   - Click your profile (top right) → **"Settings"**
   - Click **"Advanced"** (left sidebar)
   - Copy **"API Secret"** (NOT "API Key")
   - Paste into Zapier
8. Click **"Yes, Continue to Kit"**
9. Map fields:

**Email Address:**
```
Select from dropdown: "Email" (from Formspree trigger)
```

**First Name:**
```
Select from dropdown: "Name" (from Formspree trigger)
```

**Tag:**
```
Select from dropdown: "Lead-Download"
```

10. Click **"Continue"**
11. Click **"Test step"**
12. Check Kit → "Grow" → "Subscribers" — you should see test subscriber added with "Lead-Download" tag
13. Click **"Continue"**

**✅ Checkpoint:** Test subscriber should appear in Kit with tag applied, and automation should have started

---

### **Step 14: Name & Activate Zap**

1. At top left, click **"Untitled Zap"**
2. Rename: `Formspree → Kit (Legal Brief)`
3. Click **"Publish"** button (top right)
4. Confirm: **"Turn on Zap"**

**✅ Checkpoint:** Zap status should show "On" (green toggle)

---

### **Step 15: Create Second Zap (For Rights Playbook Page) [Optional]**

If you have a separate gated page for Rights Playbook:

1. Click **"Create Zap"** (create new)
2. Repeat Steps 12-14
3. **Only difference:** Select "safe-lane-rights-playbook" form in trigger
4. Use same tag: "Lead-Download" (both forms trigger same automation)
5. Name: `Formspree → Kit (Rights Playbook)`
6. Publish

**✅ Checkpoint:** You should have 2 active Zaps (one for each gated page)

---

## PART 5: Testing the Full Funnel

### **Step 16: End-to-End Test**

1. Go to your website: `https://www.superimmersive8.com/safe-lane-legal-brief.html`
2. Fill out form with YOUR email (so you can test the full experience)
3. Submit form
4. **Check these within 5 minutes:**

**✅ Formspree:**
- Log in to Formspree dashboard
- Check "Submissions" — you should see new entry

**✅ Zapier:**
- Log in to Zapier dashboard
- Click "Zap History" (left sidebar)
- You should see "Success" for recent trigger

**✅ Kit:**
- Log in to Kit dashboard
- Click "Grow" → "Subscribers"
- You should see yourself added
- Click your name → Check "Lead-Download" tag is applied
- Check "Activity" tab → Automation should be running

**✅ Email:**
- Check your inbox
- You should receive Email #1 (Welcome + PDFs) within 1-2 minutes
- Click PDF links to verify they download

**✅ Automation Scheduling:**
- In Kit, view your subscriber
- Check timeline — Email #2 should be scheduled for 3 days from now, Email #3 for 7 days from now

---

### **Step 17: Remove Test Subscriber**

After testing:

1. In Kit → "Grow" → "Subscribers"
2. Find your test subscriber
3. Click name → "Actions" → "Delete subscriber"
4. Confirm deletion

*(This prevents you from receiving the full 3-email sequence)*

---

## PART 6: Ongoing Management

### **Monitoring (Weekly)**

**Check these metrics in Kit:**

1. **"Grow" → "Subscribers"**
   - Total subscribers
   - Growth rate (new per week)

2. **"Automate" → Click your automation**
   - How many subscribers entered
   - Email open rates (aim for >30%)
   - Email click rates (aim for >5%)

3. **"Grow" → "Tags"**
   - How many "Lead-Download" subscribers
   - If you're tracking by role, review Brand vs Filmmaker split

---

### **Monthly Optimization**

**If open rates are low (<25%):**
- Test new subject lines
- Adjust send times
- Shorten email length

**If click rates are low (<3%):**
- Make CTAs more prominent
- Test different link text
- Add more value before asking for call

**If unsubscribe rate is high (>5%):**
- Emails may be too frequent (consider 4-5 day waits instead of 3-4)
- Content not relevant to subscriber
- Adjust automation timing or content

---

## Troubleshooting

### **"Subscriber not receiving Email #1"**

**Check:**
1. Kit → Subscriber → Activity tab — was email sent?
2. Check spam folder
3. Verify automation is "Active"
4. Check subscriber's email address is correct
5. Verify subscriber has "Lead-Download" tag (automation won't trigger without it)

---

### **"Zapier not triggering"**

**Check:**
1. Zap status is "On" (green)
2. Formspree form ID matches Zap trigger
3. Zapier "Zap History" for error messages
4. Formspree integration is connected (Settings → Integrations)

---

### **"PDF links not working"**

**Check:**
1. Google Drive links are set to "Anyone with link can view"
2. Links don't have `?usp=sharing` at end (remove if present)
3. Test links in incognito browser
4. Re-share PDFs and get new links

---

### **"Automation not starting when tag is added"**

**Check:**
1. Automation is set to "Active" (not "Inactive" or "Draft")
2. Trigger is set to correct tag: "Lead-Download"
3. Tag name matches exactly (case-sensitive)
4. Check subscriber's Activity tab — does tag show as added?

---

## Summary Checklist

**Before you start:**
- [ ] Convert both HTML files to PDFs using browser Print to PDF
- [ ] Upload PDFs to Google Drive
- [ ] Set sharing to "Anyone with link"
- [ ] Copy both PDF links

**Kit setup:**
- [ ] Create Kit account (Newsletter free plan)
- [ ] Create 2 tags (Lead-Download, Lead-Brand)
- [ ] Create Visual Automation "Legal Brief 3-Email Nurture"
- [ ] Set trigger: Tag "Lead-Download" added
- [ ] Add Email #1 (paste content + PDF links + replace [YOUR NAME])
- [ ] Add Wait: 3 days
- [ ] Add Email #2 (paste content + replace [YOUR NAME])
- [ ] Add Wait: 4 days
- [ ] Add Email #3 (paste content + replace [YOUR NAME])
- [ ] Activate automation

**Zapier setup:**
- [ ] Create Zapier account (Free or Starter plan)
- [ ] Create Zap #1: Formspree (Legal Brief form) → Kit
- [ ] Configure trigger (Formspree form)
- [ ] Configure action (Add tag "Lead-Download")
- [ ] Test & publish Zap #1
- [ ] Create Zap #2: Formspree (Rights Playbook form) → Kit [optional if separate form]
- [ ] Test & publish Zap #2

**Testing:**
- [ ] Submit test form on website
- [ ] Verify Formspree captures submission
- [ ] Verify Zapier triggers successfully
- [ ] Verify Kit adds subscriber with tag
- [ ] Verify automation starts
- [ ] Verify Email #1 arrives with working PDF links
- [ ] Verify Emails #2 and #3 are scheduled (Day 3, Day 7)
- [ ] Delete test subscriber

---

## Time Estimate Breakdown

| Task | Time |
|------|------|
| Convert HTML to PDF + upload to Google Drive | 10 min |
| Create Kit account + tags | 10 min |
| Create Visual Automation + paste 3 emails | 20 min |
| Replace placeholders ([YOUR NAME], PDF links) | 5 min |
| Create Zapier account + Zap #1 | 10 min |
| Test full funnel | 5 min |
| **TOTAL** | **60 min** |

---

## Support Resources

**Kit (formerly ConvertKit):**
- Help docs: https://help.kit.com
- Community: https://community.kit.com
- Support: help@kit.com

**Zapier:**
- Help docs: https://help.zapier.com
- Community: https://community.zapier.com
- Support: contact@zapier.com

**Formspree:**
- Help docs: https://help.formspree.io
- Support: support@formspree.io

---

## Why This Works with Free Plan

**Free Plan Limitation:** 1 basic Visual Automation (no Sequences feature)

**Our Workaround:** Build the entire 3-email flow as a single automation:
- Trigger: Tag added
- Action 1: Send Email #1
- Action 2: Wait 3 days
- Action 3: Send Email #2
- Action 4: Wait 4 days
- Action 5: Send Email #3

This achieves the same result as using Sequences (paid feature), but works within the free plan constraints.

You can run this indefinitely on the free plan as long as you stay under 10,000 subscribers.

**When to upgrade to Creator plan ($33/mo):**
- If you need more than 1 automation (e.g., separate flows for different lead magnets)
- If you want cleaner Sequences interface (easier to manage)
- If you want A/B testing for subject lines
- If you need integrations (though Zapier works with free plan)

---

**Questions or issues? Reference this document section by section. Each step has a ✅ Checkpoint to verify you're on track.**

Good luck! 🚀
