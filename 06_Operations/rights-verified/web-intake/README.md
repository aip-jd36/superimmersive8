# Rights Verified Web Intake Form — Project Overview

**Project:** Rights Verified submission system (web-based intake form)
**Status:** Planning phase (PRD in progress)
**Version:** v0.1 (target)
**Start date:** February 27, 2026

---

## What This Is

A web-based intake form that allows filmmakers to submit their AI-generated work to SI8 for Rights Verified review. This system replaces manual email/PDF submissions with a structured, automated workflow.

**User-facing:** Filmmakers fill out a web form with all 10 required sections from SUBMISSION-REQUIREMENTS.md
**SI8-facing:** Submissions automatically logged, notifications sent, reviewer dashboard for managing submissions

---

## Why This Project

**Problem:**
- Manual email submissions = unstructured data
- PDF forms = not mobile-friendly, data not queryable
- No automated tracking or status updates
- Email templates sent manually = slow, error-prone

**Solution:**
- Web intake form = structured data from day one
- Mobile-responsive = filmmakers can submit from phones
- Automated notifications = SI8 notified instantly
- Submission tracking = built-in status management
- Prepares for Year 3 platform = same fields become database schema

---

## Project Documentation

| Document | Status | Purpose |
|----------|--------|---------|
| **PRD.md** | ✅ Complete | Product requirements, user stories, success metrics |
| **TECHNICAL-SPEC.md** | ✅ Complete | Stack decisions, data schema, API design |
| **IMPLEMENTATION-PLAN.md** | ✅ Complete | Build phases, task breakdown, timeline |
| **DEPLOYMENT.md** | ⏳ Not started | Hosting, CI/CD, environment setup |
| **TESTING.md** | ⏳ Not started | Test scenarios, QA checklist |
| **SECURITY.md** | ⏳ Not started | Data privacy, file upload security |
| **EMAIL-INTEGRATION.md** | ⏳ Not started | Email automation setup |
| **MAINTENANCE.md** | ⏳ Not started | Monitoring, backups, incident response |

---

## Key Design Principles

1. **Mobile-first** — Many filmmakers use phones
2. **Progressive disclosure** — Don't overwhelm with all fields at once
3. **Save & resume** — Let filmmakers draft over multiple sessions
4. **Clear validation** — Real-time feedback on errors
5. **Year 3 ready** — Build now as if it's a platform (structured data, API-first)

---

## Success Metrics (v0.1)

- ✅ 100% of submissions captured as structured data (no manual email parsing)
- ✅ <10% form abandonment rate (filmmakers complete what they start)
- ✅ Mobile usable (>50% traffic from mobile without issues)
- ✅ SI8 notified within 5 minutes of submission
- ✅ Filmmaker receives confirmation within 5 minutes

---

## Phases

| Phase | Goal | Timeline |
|-------|------|----------|
| **v0.1 (MVP)** | Working form, email notifications, basic tracking | Week 2-3 |
| **v0.2** | Admin dashboard, status management, search/filter | Month 2 |
| **v0.3** | Save & resume, automated Chain of Title generation | Month 3-4 |
| **v1.0** | Lawyer-reviewed, production-ready for paid deals | Month 6 |

---

## Folder Structure

```
web-intake/
├── README.md                          (this file)
├── PRD.md                             Product Requirements Document
├── TECHNICAL-SPEC.md                  Technical architecture
├── IMPLEMENTATION-PLAN.md             Build roadmap
├── DEPLOYMENT.md                      Deployment guide
├── TESTING.md                         Test plan
├── SECURITY.md                        Security considerations
├── EMAIL-INTEGRATION.md               Email automation
├── MAINTENANCE.md                     Ongoing operations
├── DECISIONS.md                       Technical decision log
│
├── designs/
│   ├── wireframes/                    Form mockups
│   └── user-flows/                    User journey diagrams
│
├── code/
│   ├── frontend/                      HTML/CSS/JS form
│   ├── backend/                       API endpoints
│   └── integrations/                  Email, storage, etc.
│
└── versions/
    ├── v0.1/                          First working version
    └── CHANGELOG.md                   Version history
```

---

## Quick Links

**Reference documents:**
- `../SUBMISSION-REQUIREMENTS.md` — Defines all 10 form sections
- `../REVIEW-PROCESS.md` — SI8's 4-stage review workflow
- `../CHAIN-OF-TITLE-SCHEMA.md` — Output format after approval
- `../email-templates/` — Notification email templates

**Current website:**
- `/07_Website/` — Existing SI8 website (Vercel deployment)
- Same stack can be used: Static HTML/CSS/JS or Next.js

---

## Current Status: Ready to Build

**Planning Complete (Feb 27, 2026):**
- ✅ Folder structure created
- ✅ PRD.md complete (product requirements, user stories, success metrics)
- ✅ TECHNICAL-SPEC.md complete (stack decisions, data schema, API design)
- ✅ IMPLEMENTATION-PLAN.md complete (24-hour build plan, 12-day timeline)

**Stack Finalized:**
- Frontend: Static HTML/CSS/JS
- Storage: Google Sheets
- Files: Google Drive API
- Email: Resend
- Hosting: Vercel
- **Total cost:** $0/month

**Next (Mar 1-15, 2026):**
- ⏳ Day 1: Google Cloud setup (3 hrs)
- ⏳ Day 2-5: Frontend build (14 hrs)
- ⏳ Day 6-9: Backend + integration (10 hrs)
- ⏳ Day 10-11: Testing (4 hrs)
- ⏳ Day 12: Deploy to production (1 hr)

**v0.1 Launch:** March 15, 2026

---

**Last updated:** February 27, 2026
