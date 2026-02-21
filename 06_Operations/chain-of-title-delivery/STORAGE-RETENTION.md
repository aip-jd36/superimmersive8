# Storage & Retention Policy

## Overview

This document defines **where SI8 stores files** (video assets, Chain of Titles, invoices) and **how long** records are retained for legal compliance and customer support.

**Key principle:** Getty Images maintains license records indefinitely. SI8 must do the same. Buyers may need to retrieve their Chain of Title years after purchase if their deployment faces legal review.

---

## Storage Architecture — Year 1 (Manual)

### Primary Storage: Google Drive

```
Google Drive:
/SI8 Licenses/
  ├── [Buyer Company A]/
  │     ├── SI8-2026-0001/
  │     │     ├── Neon-Dreams_SI8-2026-0001.mp4
  │     │     ├── Rights-Package_SI8-2026-0001_v1.0.pdf
  │     │     └── Invoice_SI8-2026-0001.pdf
  │     └── SI8-2026-0015/
  │           ├── [files...]
  │
  ├── [Buyer Company B]/
  │     └── SI8-2026-0008/
  │           ├── [files...]
  │
  └── _Archive/
        └── [Refunded or revoked licenses]
```

**Sharing settings:**
- Folder sharing: "Anyone with link can view" (download only, no edit)
- No expiration on share links
- Access log: Google Drive tracks who accessed when (audit trail)

**Advantages:**
- Free (up to 15GB, then $2/mo per 100GB)
- Reliable (99.9% uptime)
- Familiar to buyers (no special download tools required)
- Easy to manage manually

**Limitations:**
- Not enterprise-grade (no SLA guarantees)
- Sharing links can be accidentally revoked if folder permissions change
- No version control (must manually version Chain of Title PDFs)

---

### Secondary Backup: External Hard Drive

**Frequency:** Weekly full backup (every Sunday)
**Location:** External SSD (1TB) stored at home office
**Structure:** Mirror of Google Drive folder structure

**Backup process:**
1. Connect external drive
2. Run `rsync` or manual copy from Google Drive local sync folder
3. Verify backup completed (spot-check 3 random files)
4. Disconnect drive, store securely

**Rationale:** Protects against Google account lockout, accidental deletions, or Google Drive service failures

---

### License History Database: Google Sheets (Year 1)

| Catalog ID | Asset Title | Buyer Company | Buyer Email | License Type | Amount | Date | Status | Download Link | Notes |
|------------|-------------|---------------|-------------|--------------|--------|------|--------|---------------|-------|
| SI8-2026-0001 | Neon Dreams | Acme Corp | buyer@acme.com | Tier 1 | $8,000 | 2026-02-25 | Active | [GDrive Link] | First deal |
| SI8-2026-0002 | Urban Flow | BrandCo | legal@brandco.com | Tier 2 | $15,000 | 2026-03-10 | Active | [GDrive Link] | Custom placement, 6mo exclusivity |

**Update frequency:** Immediately after each deal closes
**Access:** JD only (Year 1); shared with accountant (read-only)
**Backup:** Auto-sync to Google Drive, weekly export to CSV

---

## Storage Architecture — Year 2 (Semi-Automated)

### Primary Storage: Cloud Object Storage (AWS S3 or Google Cloud Storage)

```
S3 Bucket: si8-licenses/
  ├── assets/
  │     ├── SI8-2026-0001/
  │     │     ├── video.mp4
  │     │     └── thumbnail.jpg
  │     └── SI8-2026-0002/
  │           ├── video.mp4
  │           ├── video_original.mp4 (Tier 2: pre-placement version)
  │           └── thumbnail.jpg
  │
  ├── chain-of-titles/
  │     ├── SI8-2026-0001_v1.0.pdf
  │     ├── SI8-2026-0002_v2.0.pdf
  │     └── [...]
  │
  └── invoices/
        ├── SI8-2026-0001.pdf
        ├── SI8-2026-0002.pdf
        └── [...]
```

**Access control:**
- Pre-signed URLs for buyer downloads (7-day expiration)
- After expiration: buyer logs into account → generates new download link
- Server-side encryption enabled (AES-256)

**Cost estimate:**
- Storage: ~$0.023/GB/month (S3 Standard)
- Bandwidth: ~$0.09/GB downloaded
- 100 deals (100GB assets + 100MB docs): ~$5/mo storage, ~$20/mo bandwidth

**Advantages:**
- Programmatic access (API-driven)
- Versioning built-in (automatic Chain of Title version tracking)
- Scalable (no manual folder management)
- 99.99% uptime SLA

---

### License History Database: Notion or Airtable (Year 2)

**Migration from Google Sheets:**
- Import existing Google Sheets data
- Add fields: buyer account ID, licensee name (if different), territory restrictions
- Set up views: Active licenses, Refunded, Tier 1 vs. Tier 2
- Automate: Zapier/Make integration to update database when Stripe payment received

**Benefits:**
- Relational database (link buyers to multiple licenses)
- Better permissions (read-only views for accountant, filmmaker royalty tracking)
- Search and filter (find all licenses by buyer, by date, by tier)

---

## Storage Architecture — Year 3 (Full Platform)

### Primary Storage: Cloud Object Storage (same as Year 2)

### User Account Dashboard

Buyers log in to self-serve portal:

```
My Licenses
────────────────────────────────────────────────────
SI8-2026-0001 | Neon Dreams       | Feb 25, 2026 | Tier 1 Standard
  → Download Video (MP4)
  → Download Chain of Title (PDF)
  → Download Invoice (PDF)
  → View License Details

SI8-2026-0015 | Ocean Depths      | Mar 10, 2026 | Tier 1 Standard
  → Download Video (MP4)
  → Download Chain of Title (PDF)
  → Download Invoice (PDF)
  → View License Details

────────────────────────────────────────────────────
Export All Records (ZIP) | Contact Support
```

**Database:** PostgreSQL or MongoDB (relational, scalable)
**Authentication:** Email + password, or OAuth (Google/Microsoft SSO)
**Download links:** Generated on-demand (time-limited pre-signed URLs, no expiration on re-generation rights)

---

## Record Retention Policy

Based on industry best practices and legal compliance requirements:

| Record Type | Retention Period | Storage Location (Year 1) | Storage Location (Year 2+) |
|-------------|------------------|---------------------------|---------------------------|
| **Video Assets** | Indefinite (user lifetime) | Google Drive | S3 Standard → S3 Glacier (after 1 year) |
| **Chain of Title PDFs** | Indefinite (user lifetime) | Google Drive | S3 Standard (always hot — frequent access) |
| **Invoices** | 7 years minimum (tax law) | Google Drive + accounting software | S3 Standard + accounting system |
| **License History Records** | Indefinite | Google Sheets | Database (hot), exported to CSV quarterly |
| **Email Confirmations** | 7 years | Gmail archive | Email archive + backup to S3 |
| **Filmmaker Agreements** | Agreement duration + 7 years | Google Drive | S3 + legal folder |
| **Rights Verified Review Notes** | Indefinite (internal only) | Google Drive | S3 (internal bucket, not shared with buyers) |

### Storage Tier Transitions (Year 2+)

**Hot Storage (S3 Standard):**
- 0-90 days post-purchase: All files
- 90+ days: Chain of Titles, invoices (frequent access for re-downloads)

**Warm Storage (S3 Glacier Instant Retrieval):**
- 1+ years post-purchase: Video assets (less frequent access, lower cost)
- Retrieval time: Milliseconds (instant)
- Cost: ~50% cheaper than S3 Standard

**Cold Storage (S3 Glacier Deep Archive):**
- 7+ years post-refund: Revoked licenses (legal compliance only, rarely accessed)
- Retrieval time: 12 hours
- Cost: ~90% cheaper than S3 Standard

**No deletion:** Files are never deleted, only moved to cheaper storage tiers.

---

## Retention Timeline Examples

### Example 1: Active License (Tier 1)

```
Purchase date: Feb 25, 2026
────────────────────────────────────────────────────
Day 0-90:
  → All files in hot storage (S3 Standard)
  → Buyer downloads files within 7 days
  → Download links valid indefinitely

Day 90 - 1 year:
  → Chain of Title, invoice: S3 Standard (hot)
  → Video asset: S3 Standard (still hot, cheaper to keep than migrate)

Year 1+:
  → Chain of Title, invoice: S3 Standard (hot, frequently accessed)
  → Video asset: S3 Glacier Instant Retrieval (warm, 50% cost savings)
  → Buyer can still re-download anytime (instant retrieval)

Year 7+:
  → Same as Year 1+ (no change, license still active)
  → Accounting records: Can archive to cold storage (tax law: 7 years)
```

### Example 2: Refunded License (Within 30 Days)

```
Purchase date: Feb 25, 2026
Refund date: Mar 10, 2026 (14 days later)
────────────────────────────────────────────────────
Day 0-14:
  → All files in hot storage
  → Buyer downloads, decides to refund

Day 14 (refund processed):
  → Download links revoked
  → License marked "Refunded" in database
  → Files moved to /Archive/ folder

Year 0-7:
  → Files remain in S3 Standard (legal compliance: 7 years)
  → Not accessible to buyer (links disabled)

Year 7+:
  → Files moved to S3 Glacier Deep Archive (cold storage, 90% cost savings)
  → Retained indefinitely for legal compliance, rarely accessed
```

---

## Backup & Disaster Recovery

### Backup Strategy (Year 1)

| Data | Primary Storage | Backup 1 | Backup 2 | Backup Frequency |
|------|-----------------|----------|----------|------------------|
| Video assets | Google Drive | External SSD | N/A | Weekly (Sunday) |
| Chain of Titles | Google Drive | External SSD | N/A | Weekly (Sunday) |
| Invoices | Google Drive + Accounting software | External SSD | N/A | Weekly (Sunday) |
| License history | Google Sheets | CSV export to Drive | External SSD | Daily (auto-sync) |

**Recovery time objective (RTO):** 24 hours
**Recovery point objective (RPO):** 7 days (worst case: 1 week of data loss if external drive backup fails)

### Backup Strategy (Year 2+)

| Data | Primary Storage | Backup 1 | Backup 2 | Backup Frequency |
|------|-----------------|----------|----------|------------------|
| Video assets | S3 (primary region) | S3 (cross-region replication) | N/A | Real-time |
| Chain of Titles | S3 (primary region) | S3 (cross-region replication) | N/A | Real-time |
| Invoices | S3 + Accounting software | S3 (cross-region) | N/A | Real-time |
| Database | PostgreSQL (primary) | Daily automated backup to S3 | N/A | Daily (midnight) |

**RTO:** 1 hour
**RPO:** < 1 hour (worst case: 1 hour of data loss if database fails before daily backup)

### Cross-Region Replication

**Primary region:** AWS us-west-1 (Northern California) or GCS asia-east1 (Taiwan)
**Backup region:** AWS ap-southeast-1 (Singapore)

**Why cross-region:**
- Protects against regional outages (earthquake, data center failure)
- Improves download speed for SEA buyers (serve from Singapore if closer)

**Cost:** ~2x storage cost (data stored in 2 regions)

---

## Access Logs & Audit Trail

### What to Log

| Event | Log Data | Retention Period | Purpose |
|-------|----------|------------------|---------|
| File download | Buyer email, file name, timestamp, IP address | 7 years | Audit trail for license compliance |
| License purchase | Buyer details, amount, payment method, timestamp | Indefinite | Financial records + license history |
| Download link generated | Buyer email, catalog ID, link expiration, timestamp | 7 years | Track re-download requests |
| Refund processed | Buyer email, refund amount, reason, timestamp | 7 years | Financial + legal compliance |
| Chain of Title updated | Catalog ID, version (v1.0 → v1.1), reason, timestamp | Indefinite | Version control for legal review |

### How to Log (Year 1)

**Manual logging:**
- Google Sheets: "Download Log" tab (buyer email, file, date)
- Gmail: Search by catalog ID to find all emails related to a license

### How to Log (Year 2+)

**Automated logging:**
- S3 access logs: Auto-enabled, records every file download
- Application logs: API endpoint logs (user ID, action, timestamp)
- Database: Audit table (tracks all inserts/updates to license records)

---

## Data Privacy & Compliance

### GDPR Compliance (EU Buyers)

**Right to access:** Buyer can request all data SI8 has about them (license history, invoices, download logs)
**Right to deletion:** Buyer can request account deletion after licenses expire (NOT applicable while license is active — legal compliance requires retention)
**Data minimization:** Only collect what's necessary (name, email, company, payment info)

**SI8's position:** License records are business records (B2B transaction), not personal data subject to deletion under GDPR. Buyer is licensing for business use, not personal use.

**Year 1 action:** Include data privacy clause in license terms (buyer consents to data retention for legal compliance)

### Taiwan PDPA Compliance

**Personal Data Protection Act (PDPA):** Taiwan's data privacy law
**Key requirement:** Notify buyers of data collection and use
**SI8's action:** Privacy policy on website + email footer ("Your data is used for license fulfillment and stored securely. We do not sell or share your data.")

---

## Cost Projections

### Year 1 Storage Costs (Google Drive)

| Item | Cost |
|------|------|
| Google Drive (100GB plan) | $2/mo = $24/yr |
| External SSD (1TB, one-time) | $100 |
| **Total Year 1** | **$124** |

### Year 2 Storage Costs (AWS S3)

Assumptions:
- 50 deals in Year 2
- Average video size: 500MB
- Average Chain of Title size: 2MB
- Total storage: ~26GB (video) + 100MB (docs)

| Item | Cost |
|------|------|
| S3 Standard storage (27GB) | $0.62/mo = $7.44/yr |
| S3 bandwidth (100 downloads, 50GB total) | $4.50 |
| **Total Year 2** | **~$12/yr** |

**Insight:** Cloud storage is cheaper than Google Drive once you're over 100GB and need programmatic access.

### Year 3 Storage Costs (Platform Scale)

Assumptions:
- 200 deals in Year 3
- Total storage: 100GB (hot) + 50GB (warm archive)

| Item | Cost |
|------|------|
| S3 Standard (100GB hot) | $2.30/mo = $27.60/yr |
| S3 Glacier Instant (50GB warm) | $0.50/mo = $6/yr |
| S3 bandwidth (500 downloads, 250GB) | $22.50 |
| Database hosting (PostgreSQL, managed) | $15/mo = $180/yr |
| **Total Year 3** | **~$236/yr** |

---

## Open Questions

- **Download link expiration:** Year 1 = no expiration (Google Drive). Year 2 = 7-day expiration (S3 pre-signed URLs). Does 7 days feel too short? Should it be 30 days?
- **Re-download limit:** Unlimited re-downloads forever? Or "after 1 year, contact support"?
- **File versioning:** If Chain of Title template changes (e.g., v1.0 → v1.1 format), does buyer get updated PDF? Or frozen at purchase date?
- **What if buyer's company is acquired?** Can new company access old licenses? (Getty: yes, licenses transfer with company ownership)
- **International data residency:** Do EU buyers require data stored in EU region? (Adds cost + complexity)

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Feb 21, 2026 | Use Google Drive for Year 1 | Free, reliable, easy to manage, no tech overhead |
| Feb 21, 2026 | No expiration on download links (Year 1) | Matches Getty model, reduces support burden |
| Feb 21, 2026 | Weekly external SSD backup | Protects against Google account lockout, accidental deletion |
| Feb 21, 2026 | Indefinite retention for all license records | Legal compliance + customer support (buyer may need docs years later) |
| TBD | Migrate to S3 in Year 2 or wait until Year 3? | Depends on deal volume + need for automation |

---

**Next Steps:**
1. Set up Google Drive folder structure (before first deal)
2. Create License History Google Sheet template
3. Purchase external SSD (1TB) for weekly backups
4. Document first deal end-to-end (refine storage process)
5. Review AWS S3 pricing (if >20 deals in Year 1, migrate early to S3)
