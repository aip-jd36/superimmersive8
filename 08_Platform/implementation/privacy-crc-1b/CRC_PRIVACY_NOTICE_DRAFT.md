# Commercial Readiness Check Privacy Notice — DRAFT

**Status: DRAFT — NOT APPROVED — NOT FOR PUBLICATION.** SI8-PRIVACY-CRC-1B, 2026-11-17.

This text is not used by the application. The app's notice slot (`08_Platform/app/lib/legal/crc-privacy-notice.ts`,
`CRC_PRIVACY_NOTICE`) is `null`, so `/crc/privacy` shows "This document is not available yet." and the results gate shows no link.
Publishing means copying the approved text into that slot, with a version identifier, effective date and approval reference, in
one reviewed change, and only after the publication gate below is met.

Bracketed **[UNRESOLVED: …]** items must be decided, replaced or explicitly accepted before publication. Nothing in this draft
establishes legal compliance.

---

## Commercial Readiness Check Privacy Notice

PMF Strategy Inc., doing business as SuperImmersive 8 ("SI8", "we" or "us")

Version [UNRESOLVED: version identifier, e.g. crc-privacy-YYYY-MM-DD] · Effective [UNRESOLVED: date]

This notice explains how SI8 handles personal information in the Commercial Readiness Check ("CRC") at
app.superimmersive8.com/crc. Creator Record has its own Creator Record Privacy Notice. SI8's marketing website is covered by
[UNRESOLVED: the website privacy notice, once published — or remove this sentence].

### 1. What CRC is, and what it is not

CRC is a free, educational conversation about commercial-readiness considerations that may apply to an AI-video workflow you
describe. An AI model conducts the conversation and the results are produced automatically. No person at SI8 reviews your
conversation before your results are sent.

CRC is not a Commercial Assurance Assessment, not a certification, not a clearance and not legal advice.

### 2. Information we collect

- **Your conversation.** What you type, including any project, tool, business or personal details you choose to share, and the
  structured summary of your project that CRC derives from it (for example the tools, uses and goals you describe).
- **Your email address**, which we need to send your results.
- **Feedback** you choose to give about CRC.
- **How you arrived.** Campaign information carried in the link that brought you to CRC (for example `utm_source` or `ref`).
- **Security and abuse-prevention records.** A one-way identifier derived from your network address, used to apply usage limits.
  If a usage limit is triggered, we also record your IP address so that a person can investigate a mistaken block
  (see section 9).
- **Technical records** of how the conversation ran, such as timings and diagnostic information.
- **Your results email.** A copy of the results email we sent you, and its delivery status.
- **Analytics** about your use of the site (see section 8).

Please do not include other people's personal information, or confidential information you are not entitled to share, in the
conversation.

### 3. How we use it

- To run the conversation and produce your educational results.
- To email your results to you, and to resend them if you ask.
- To keep CRC secure, apply usage limits and investigate mistaken blocks.
- To improve CRC and to decide which topics SI8 researches. The questions people ask, including their wording, inform that work
  and may be kept as part of SI8's research records (see section 10).
- To follow up as described in section 4.
- If you later ask SI8 for a Commercial Assurance Assessment, as described in section 5.

### 4. Commercial Assurance follow-up

When you enter your email address, the results page tells you that SI8 may also follow up with information relevant to
Commercial Assurance, SI8's human-reviewed service. [UNRESOLVED (legal review): whether this follow-up is permitted on the
current basis in each relevant jurisdiction, or needs separate consent; how a person asks SI8 to stop, and the wording that
describes it — e.g. "You can ask us to stop at any time by emailing [privacy contact]." Operational note, not public text: no new
CRC-derived sales outreach is being started pending that review.]

### 5. Commercial Assurance context

If you request a Commercial Assurance Assessment, SI8 may link your CRC conversation to that assessment so the reviewer can see the
context you gave. A link is made only for that purpose, access to a linked conversation is restricted to SI8 personnel working on
the assessment, and each access is recorded. A linked conversation becomes part of the assessment record.
[UNRESOLVED: confirm that links are made only when the person requests an Assessment, as this sentence states.]

### 6. Who at SI8 can see your information

Authorized SI8 personnel can view CRC sessions, including your email address, the conversation and the results email sent to you,
to operate and support CRC. Viewing a conversation or a sent results email through SI8's internal tools is recorded.

### 7. Service providers

- **Anthropic:** AI processing of the conversation.
- **Supabase:** database storage.
- **Resend:** sending results emails.
- **Vercel:** hosting.
- **Google Analytics:** usage measurement.
- **Calendly:** scheduling, if you choose to book a call from your results.

These providers process information to provide their services to SI8. SI8 does not sell your personal information.
[UNRESOLVED (legal review): international transfers and the basis on which providers process information.]

### 8. Analytics and cookies

The CRC pages use Google Analytics, which uses cookies or similar technologies to collect technical information about your device
and browser and how you use the site. [UNRESOLVED (legal review): whether consent is required before analytics loads in relevant
jurisdictions, and how a visitor can decline.]

### 9. How long we keep information

- **IP addresses recorded when a usage limit is triggered:** [UNRESOLVED: state "cleared after 30 days" only once the 30-day
  clearing is running in Production. Until then, this sentence must not be published.]
- **Everything else** — the conversation and derived summary, email address, feedback, campaign information, abuse-prevention
  identifier, technical records and results emails: [UNRESOLVED: no retention period is approved. Today this information is kept
  until it is deleted. A period, or an accurate statement of the current practice, must be approved before publication.]
- Copies may remain in service providers' backups until those backups expire.

### 10. Your requests

You can ask to access, correct or delete personal information from your CRC sessions by emailing [UNRESOLVED: verified privacy
contact]. We handle these requests manually and may need to confirm that the email address is yours.

Some information may need to be kept, or may not be removable in full: information that has become part of a Commercial
Assurance Assessment you requested, SI8 research records that include your wording, security and access records, and records of
what was sent to you. We will tell you if any information cannot be removed. [UNRESOLVED: requires a documented, tested deletion
procedure before this section is published; deletion is currently a manual database operation with ordering constraints.]

[UNRESOLVED (legal review): jurisdiction-specific rights, legal bases and complaint routes.]

### 11. Changes to this notice

We may update this notice. Each version has its own version identifier and effective date.

### 12. Contact

PMF Strategy Inc., doing business as SuperImmersive 8
Email: [UNRESOLVED: verified privacy contact]

---

## Publication gate (all required)

1. Notice text approved (founder), with an approval reference.
2. Privacy contact verified, and the person who handles requests named.
3. Retention statements accurate: section 9 matches what Production actually does at the moment of publication.
4. Legal-review questions resolved, or explicitly accepted through the appropriate governance process.
5. Gate link wording approved in English and Traditional Chinese (`RESULTS_GATE_PRIVACY_LINK_COPY`,
   `getResultsGatePrivacyLinkCopyLocalized`); decide whether `/crc/privacy` needs a Traditional Chinese version.

A passing build or test run is not publication approval.
