# TODO - Creator Portal MVP

Checklist of what's built, what's missing, and next steps.

## ✅ COMPLETE - MVP Features Built

### Authentication
- [x] Sign up page with email/password
- [x] Login page
- [x] OAuth callback handler
- [x] Session persistence
- [x] Logout functionality
- [x] Auth middleware (protects /dashboard and /submit routes)

### Submission Form
- [x] Multi-step form (10 sections)
- [x] Form validation with Zod
- [x] Progress indicator
- [x] Auto-save to localStorage
- [x] All required fields implemented
- [x] Submit & Pay button

### Payment Integration
- [x] Stripe Checkout session creation
- [x] Redirect to Stripe
- [x] Success/cancel URLs
- [x] Webhook handler for payment confirmation
- [x] Database update on payment success

### Dashboard
- [x] Summary cards (submissions, approved, catalog, earnings)
- [x] Submissions table with status badges
- [x] Empty state
- [x] Protected route (requires auth)
- [x] Navigation with logout

### Email Notifications
- [x] Submission received email template
- [x] Submission approved email template
- [x] Submission rejected email template
- [x] Opt-in confirmation email template
- [x] Resend integration

### Database
- [x] Supabase client setup (client, server, admin)
- [x] TypeScript types generated
- [x] RLS policies configured
- [x] Tables created (users, submissions, opt_ins, rights_packages, licensing_deals)

### Infrastructure
- [x] Next.js 14 App Router setup
- [x] Tailwind CSS + shadcn/ui components
- [x] TypeScript configuration
- [x] Environment variables
- [x] README documentation
- [x] Test plan
- [x] Deployment guide

---

## ❌ MISSING - Need to Implement

### High Priority (Week 1-2)

#### 1. File Upload Logic
**Status**: Input fields exist but files not uploaded to Supabase Storage

**TODO**:
- [ ] Implement file upload handler in submission form
- [ ] Upload receipts to `receipts/` bucket
- [ ] Upload process screenshots to `receipts/` bucket
- [ ] Store file URLs in `receipt_urls` and `process_screenshots_urls` columns
- [ ] Add file type validation (PDF, JPG, PNG only)
- [ ] Add file size validation (max 10MB per file)
- [ ] Display uploaded files with preview thumbnails
- [ ] Allow removing files before submission

**Files to edit**:
- `/app/submit/page.tsx` - Add file upload handlers
- Create new component: `/components/FileUpload.tsx`

---

#### 2. Submission Details Page
**Status**: Not built - creators can only see summary in table

**TODO**:
- [ ] Create `/app/dashboard/submissions/[id]/page.tsx`
- [ ] Display all submission data (read-only)
- [ ] Show status banner with next steps
- [ ] Add "Download Rights Package" button (if approved)
- [ ] Add "Opt Into Catalog" button (if approved and not opted in)
- [ ] Show uploaded receipts and screenshots

**Files to create**:
- `/app/dashboard/submissions/[id]/page.tsx`
- `/components/SubmissionDetails.tsx`

---

#### 3. Opt-In Modal
**Status**: Email template exists but no UI modal

**TODO**:
- [ ] Create opt-in modal component
- [ ] Add form fields:
  - Video URL (YouTube/Vimeo embed link)
  - Catalog description (max 500 chars)
  - Tags (autocomplete)
  - Thumbnail upload (optional)
- [ ] Add terms checkbox
- [ ] Create API route: `/api/submissions/[id]/opt-in`
- [ ] Insert record into `opt_ins` table
- [ ] Send opt-in confirmation email

**Files to create**:
- `/components/OptInModal.tsx`
- `/app/api/submissions/[id]/opt-in/route.ts`

---

### Medium Priority (Week 3-4)

#### 4. Admin Panel
**Status**: Not built - admin must use Supabase dashboard

**TODO**:
- [ ] Create `/app/admin` route
- [ ] Add admin role check middleware
- [ ] Build review queue page (submissions with payment_status = 'paid')
- [ ] Add approve/reject buttons
- [ ] Add review notes textarea
- [ ] Trigger email notifications on approve/reject
- [ ] Build catalog management page (toggle visibility)

**Files to create**:
- `/app/admin/layout.tsx`
- `/app/admin/submissions/page.tsx`
- `/app/admin/catalog/page.tsx`
- `/app/api/admin/submissions/[id]/approve/route.ts`
- `/app/api/admin/submissions/[id]/reject/route.ts`

---

#### 5. Rights Package PDF Generation
**Status**: Table exists but PDFs not generated

**TODO**:
- [ ] Choose PDF generation library (puppeteer or @react-pdf/renderer)
- [ ] Create Rights Package PDF template
- [ ] Add 9-field Chain of Title structure
- [ ] Generate catalog ID (SI8-YYYY-####)
- [ ] Upload PDF to `rights-packages/` bucket
- [ ] Store PDF URL in `rights_packages` table
- [ ] Add download endpoint: `/api/rights-packages/[id]/download`

**Files to create**:
- `/lib/pdf-generator.ts`
- `/templates/rights-package.tsx` or `.html`
- `/app/api/admin/rights-packages/generate/route.ts`
- `/app/api/rights-packages/[id]/download/route.ts`

---

### Low Priority (Post-MVP)

#### 6. Public Catalog Page
**Status**: Not built

**TODO**:
- [ ] Create `/app/catalog/page.tsx` (public, no auth required)
- [ ] Display all opted-in submissions with `visible = true`
- [ ] Add filter by genre, tags
- [ ] Add video preview (YouTube/Vimeo embed)
- [ ] Add "Request Licensing" button
- [ ] Create licensing request form (creates lead for admin)

**Files to create**:
- `/app/catalog/page.tsx`
- `/app/catalog/[id]/page.tsx`
- `/components/CatalogCard.tsx`
- `/app/api/catalog/[id]/request-license/route.ts`

---

#### 7. Earnings Page
**Status**: Summary card exists but no detailed earnings page

**TODO**:
- [ ] Create `/app/dashboard/earnings/page.tsx`
- [ ] Display pending deals table
- [ ] Display completed deals table
- [ ] Add deal receipt download
- [ ] Show payment timeline

**Files to create**:
- `/app/dashboard/earnings/page.tsx`
- `/components/EarningsTable.tsx`

---

#### 8. Profile Page
**Status**: Not built - profile data auto-filled in form

**TODO**:
- [ ] Create `/app/dashboard/profile/page.tsx`
- [ ] Allow editing: Full Name, Bio, Website URL, Profile Image
- [ ] Upload profile image to `avatars/` bucket
- [ ] Update `users` table on save

**Files to create**:
- `/app/dashboard/profile/page.tsx`
- `/components/ProfileForm.tsx`

---

## 🔧 IMPROVEMENTS - Nice to Have

### UX Enhancements
- [ ] Add loading spinners on all async actions
- [ ] Add toast notifications (react-hot-toast already in package.json)
- [ ] Add form field help tooltips
- [ ] Add character counter on textareas
- [ ] Add "Save Draft" button (in addition to auto-save)
- [ ] Add submission preview before payment

### Security Enhancements
- [ ] Add rate limiting middleware (prevent spam submissions)
- [ ] Add CAPTCHA on signup (prevent bot signups)
- [ ] Add 2FA for admin accounts
- [ ] Add file upload virus scanning (Supabase Enterprise or third-party)

### Performance Optimizations
- [ ] Add React Query for client-side caching
- [ ] Implement ISR for public catalog pages
- [ ] Add image optimization with Next.js Image
- [ ] Add lazy loading for submission table (pagination)

### Analytics
- [ ] Add Vercel Analytics
- [ ] Add custom event tracking (signup, submission, payment)
- [ ] Add conversion funnel tracking
- [ ] Add Sentry error tracking

---

## 🚀 DEPLOYMENT PREREQUISITES

### Before Production Deploy
- [ ] Add Stripe **live mode** keys to Vercel
- [ ] Create live product in Stripe ($499)
- [ ] Update `VERIFICATION_PRICE_ID` in code
- [ ] Set up production webhook endpoint
- [ ] Update `NEXT_PUBLIC_SITE_URL` to production URL
- [ ] Configure custom domain (superimmersive8.com)
- [ ] Test complete flow on staging

### Post-Deploy
- [ ] Monitor webhook delivery in Stripe
- [ ] Monitor email delivery in Resend
- [ ] Check Supabase logs for errors
- [ ] Test on real mobile devices (iPhone, Android)
- [ ] Run Lighthouse audit (target: >90 score)

---

## 🐛 KNOWN BUGS / ISSUES

### Form Validation
- [ ] "Runtime seconds" input allows values > 59 (should enforce max)
- [ ] Form doesn't validate all sections before showing "Submit" button
- [ ] Auto-save can conflict with form validation state

### UI/UX
- [ ] Dashboard table not paginated (will be slow with >50 submissions)
- [ ] No loading state when navigating between pages
- [ ] No confirmation dialog before logout

### Stripe Integration
- [ ] Webhook signature verification needs testing with production keys
- [ ] No handling for failed/declined payments (need to show error to user)
- [ ] No refund logic if submission is rejected

### Email
- [ ] Email "From" address uses noreply@superimmersive8.com (need to verify domain in Resend)
- [ ] No email queue (emails sent synchronously - could timeout)

---

## 📝 DOCUMENTATION NEEDED

- [ ] API documentation (endpoints, request/response formats)
- [ ] Database schema diagram
- [ ] User flow diagrams
- [ ] Admin workflow documentation
- [ ] Troubleshooting guide (common errors and fixes)
- [ ] Video tutorial for creators (how to submit)
- [ ] FAQ page for common questions

---

## 🎯 PRIORITIES FOR WEEK 1

**Focus on getting end-to-end flow working:**

1. **Add Stripe keys** (BLOCKING - nothing works without this)
2. **Test complete submission flow** (signup → submit → pay → webhook → dashboard)
3. **Implement file upload logic** (receipts are required, can't launch without this)
4. **Build submission details page** (creators need to see full submission data)
5. **Create opt-in modal** (pathway to catalog revenue)

**Week 1 Success Criteria:**
- [ ] Can submit a video with receipts uploaded
- [ ] Payment processes correctly
- [ ] Submission appears in dashboard with full details
- [ ] Can opt-in to catalog after manual approval (via Supabase)

---

## 🔮 FUTURE FEATURES (Post-Launch)

### Phase 2 (Month 2-3)
- [ ] Self-serve catalog browsing for buyers
- [ ] Automated Rights Package PDF generation
- [ ] Admin panel for reviewing submissions
- [ ] Stripe Connect for automated payouts

### Phase 3 (Month 4-6)
- [ ] API for enterprise integration
- [ ] Advanced search/filters on catalog
- [ ] Creator messaging system
- [ ] Buyer accounts (not just guest checkout)
- [ ] Analytics dashboard for creators (views, clicks, conversion)

### Phase 4 (Year 2+)
- [ ] AI-powered rights verification (automated tool receipt parsing)
- [ ] Custom AI Placement marketplace (brands request modifications)
- [ ] Mobile app (React Native)
- [ ] Multi-language support (EN, ZH-TW, ES, JP)

---

**Status**: MVP built, ready for Stripe setup and testing
**Last Updated**: March 19, 2026
