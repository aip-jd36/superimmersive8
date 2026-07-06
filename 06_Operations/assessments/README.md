# SI8 Assessments Archive

This directory stores the complete dossier for every SI8 Campaign Assurance Assessment.

## Structure

Each assessment lives in its own subdirectory named by Assessment ID:

```
06_Operations/assessments/
├── README.md                   (this file)
├── post-assessment-reviews/    (all PARs, one file per assessment)
│
├── assessment-zero/            (system validation — not a customer assessment)
│   ├── README.md
│   ├── 00-customer-profile.md
│   ├── 01-certform-submission.md
│   ├── 02-evidence-package/
│   ├── 03-reviewer-workbook.md
│   ├── 04-assessment-report.md
│   ├── 05-delivery-email.md
│   ├── 06-post-assessment-review.md
│   └── 07-lessons-learned.md
│
├── ASSESS-001-YYYY-MM-DD/      (first real customer assessment)
│   ├── README.md
│   ├── 00-customer-profile.md
│   ├── 01-certform-submission.md (or link to Supabase record)
│   ├── 02-evidence-package/
│   ├── 03-reviewer-workbook.md
│   ├── 04-assessment-report.md
│   └── 05-delivery-email.md
│
└── ...
```

## Naming

- Folder name = Assessment ID: `ASSESS-001-YYYY-MM-DD` where the date is the **delivery date**
- All files inside follow the numbered prefix convention for sorted display

## Post-Assessment Reviews

All Post-Assessment Reviews (PARs) are filed at:
```
06_Operations/assessments/post-assessment-reviews/PAR-[ASSESS-ID].md
```

The PAR template is the `SI8-Post-Assessment-Review-Template-v0.1.md` in `06_Operations/reviewer-workbook/`.

PARs are filed within 24 hours of report delivery. PAR improvements held in `SI8-Reviewer-Manual-v0.2-Candidate-Improvements.md`.

## Report PDFs

Generated PDFs are **not stored here**. They are generated from Typst source in `tools/report-pipeline/` and emailed directly to the customer. The `.typ` source file (version-controlled) is the authoritative artifact.

## Confidentiality

Dossier files contain customer-identifiable information. Do not share this directory outside SI8. Do not commit real customer data to a public repository.
