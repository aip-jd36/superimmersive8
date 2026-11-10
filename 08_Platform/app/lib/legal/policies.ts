/**
 * CR-V2-MVP-LAUNCH-FOUNDATION-1 — the privacy notice and terms of service, as approved content only.
 *
 * INFRASTRUCTURE ONLY. No policy text is approved, so none is published: each slot below is `null`, the public pages say the
 * document is not available yet, and `legalPoliciesApproved()` is false. While it is false, Creator Record v2 cannot accept real
 * documents, offer AI examination or sell a record, whatever the other locks say (`evidence-production.ts`,
 * `examination-customer.ts`, `customer-flow/purchase.ts`).
 *
 * CR-V2-SCHEMA8-PATH-1 (E7): the approved versions are also part of every storage consent and AI-examination permission a
 * creator gives (`../creator-record/evidence-intake/contract.ts`), so a change to either document makes earlier authorizations
 * stale instead of silently reusing them.
 *
 * To publish: replace a slot with the approved text, its version identifier, its approval reference and the date it takes effect,
 * in one reviewed change. Draft wording never goes here.
 */

export interface ApprovedLegalDocument {
  /**
   * A stable identifier, e.g. "privacy-2026-12-01". Shown on the page and recorded inside every consent and permission that
   * relies on it. 3–32 characters, lower case: it must fit inside the permission identifiers the database stores.
   */
  version: string
  effective_date: string
  /** Who approved it and where that approval is recorded (not shown to customers). */
  approval_reference: string
  title: string
  /** Paragraphs, in order. Plain text: no markup is interpreted. */
  paragraphs: readonly string[]
}

// CR-V2-MVP-LEGAL-CONTENT-6: founder-approved (JD-CR-V2-MVP-LEGAL-CONTENT-5-20261109). Paragraphs are the frozen
// CR-V2-MVP-LEGAL-CONTENT-5 text, verbatim; changing any of them, or a version, needs a new approval.
export const PRIVACY_NOTICE: ApprovedLegalDocument | null = Object.freeze({
  version: "privacy-2026-11-09",
  effective_date: "2026-11-09",
  approval_reference: "JD-CR-V2-MVP-LEGAL-CONTENT-5-20261109",
  title: "Creator Record Privacy Notice",
  paragraphs: Object.freeze([
    "This Privacy Notice explains how PMF Strategy Inc., doing business as SuperImmersive 8 (\"SI8\", \"we\" or \"us\"), handles personal information in Creator Record, the service at app.superimmersive8.com. It covers your account, the questionnaire, documents you choose to add, automated document readings, payment, your Creator Record and related emails. It does not cover SI8's marketing website or SI8's other services.",
    "1. What Creator Record is",
    "Creator Record lets you describe an AI-assisted video and how you made it, optionally add supporting documents such as receipts or invoices, and buy a private PDF record. The record contains what you told us, educational guidance about certain AI tool providers' published terms and, if you ask for it, what an automated reading reports a document appears to show. No person at SI8 checks your answers, your documents or the readings.",
    "2. Information we collect",
    "Account: your name, email address and sign-in information.\nDeclarations: your answers to the questionnaire about your video, the tools you used and how you made it, and the confirmations you give in it.\nDocuments: files you choose to add (PDF, PNG or JPEG), with their file name, type, size and a digital fingerprint of the file.\nDocument readings: what an automated reading reports a document appears to show, such as who issued it, the plan or product named and dates.\nYour record: the versions of your record you prepare, the responses you give to readings, and the PDF issued to you.\nPermissions: the storage consent and AI-reading permissions you give or withdraw, and when.\nPayment: the status of your purchase and payment references. Card details are handled by Stripe; SI8 does not receive your full card number.\nEmails and support: messages we send you and correspondence with us.\nTechnical information: security and access logs, anti-abuse checks and usage analytics.",
    "3. How we use it",
    "We use this information to run your account and the questionnaire, store the documents you add, read documents when you ask us to, prepare and deliver your record, take payment and handle refunds, respond to you, keep the service secure, keep records of consents, permissions and transactions, and understand how the service is used.",
    "4. Documents you add",
    "Adding documents is optional. Add only documents you are entitled to share. Before you add a document, please remove or cover details that are not needed, such as card numbers, home addresses and other people's personal information.",
    "Documents are stored privately. Authorized SI8 personnel may open a stored document to provide support or operate the service; each time a document is opened through the application, that access is recorded.",
    "Agreeing to storage does not allow SI8 to send a document for automated reading. That needs a separate permission.",
    "5. Automated document reading",
    "If you ask SI8 to read a document, you will first be asked for permission for that document. SI8 then sends the document and SI8's fixed reading instructions to Anthropic, the AI model provider SI8 uses. SI8 does not add your name, email address, account details or answers to that request, but the document itself may contain personal information. Anthropic processes these requests under its applicable service terms.",
    "The reading is automated. It may be incomplete or wrong, and no person at SI8 checks it. You can review each reading before you buy a record and mark it as wrong; your response is printed beside the reading but does not change it. A reading is not a legal review, not a check of your licence or plan, and not a decision about whether your video may be used commercially.",
    "6. Withdrawing AI-reading permission",
    "You can withdraw permission for automated reading at any time by emailing jd@superimmersive8.com from the email address on your account.",
    "A withdrawal applies to every document you added before you withdrew. After that, none of those documents is read again, none can be used in a new version of a record, and a record that uses one of them cannot be bought or issued. If you have already paid for a record that uses one of them and it has not been issued, it is paused and we will contact you about it. Records already issued are not affected. Withdrawing does not delete documents or readings; you can ask for deletion separately.",
    "Documents you add after withdrawing can be read again if you give permission for them. Adding the same file again does not create a new copy: the earlier, withdrawn copy is used, so it cannot be read again.",
    "7. How long we keep information",
    "Original documents: we delete each original file 90 days after you add it. If a paid record that uses it has not yet been issued, we may keep it up to 104 days after you added it. The file is then removed within 7 days. In exceptional cases, such as investigating a problem, SI8 may keep a document longer under a documented hold of no more than 60 days in total.",
    "Your account, declarations, readings, prepared records and issued PDFs are stored separately from original files. We generally keep them while your account exists so that you can access your records. You can ask for access, correction or deletion as described below; some information may need to be kept for payment, security, consent or other legitimate purposes.",
    "Backups: copies of information may remain in our service providers' backups until those backups expire.",
    "8. Access, correction and deletion",
    "You can see your records and download issued PDFs from your dashboard. Before you buy a record, you can change your answers and prepare a new version. An issued record cannot be changed.",
    "While Creator Record is available to you, you can remove a document from your list if no version of a record uses it. To delete any other document, your records or your account, email jd@superimmersive8.com from the email address on your account. We handle these requests manually. We may need to confirm your identity, and if you have a paid record that has not been issued we will resolve that order first, which may include a refund. We will tell you if any information cannot be removed or must be kept.",
    "What is removed depends on the request and on what SI8 must keep. Payment and refund records, the history of consents and permissions, access logs, document fingerprints and related identifiers may be kept for these purposes and may still be linked to you. If you also use other SI8 services, the account information those services need may be kept.",
    "Information held by Stripe about your payment, by our email provider about messages sent to you, and in backups described in section 7, is handled under those arrangements.",
    "9. Service providers",
    "Supabase: sign-in, database and private file storage.\nAnthropic: automated reading of documents you give permission for.\nStripe: payment processing.\nResend: service emails about your records.\nVercel: hosting of the application.\nGoogle Analytics: analytics on how the application is used.\nCloudflare: anti-abuse checks when you sign up or sign in.",
    "We share personal information with these service providers to run Creator Record, and where the law requires it or to protect the service and its users. We do not sell the documents you upload.",
    "10. Where information is processed",
    "SI8 and its service providers may store and process information in countries other than the one where you live.",
    "11. Your choices and rights",
    "Depending on where you live, you may have rights to access, correct or delete your personal information, to object to or restrict some processing, or to withdraw consent. To use any of these rights, email jd@superimmersive8.com. Withdrawing permission for automated reading does not stop the processing needed to run your account or keep transaction records.",
    "12. Analytics and cookies",
    "The application uses Google Analytics to understand how it is used, and Cloudflare's anti-abuse check on the sign-up and sign-in pages. These use cookies or similar technologies and collect technical information about your device and browser.",
    "13. Security",
    "We use private storage, access controls and logging of document access to protect information. No online service is completely secure.",
    "14. Changes to this notice",
    "We may update this notice. Each version has its own version identifier and effective date. When the notice changes, you may be asked to agree to storage or reading again before adding or reading documents, and documents added under an earlier version cannot be used again under the new one.",
    "15. Contact",
    "PMF Strategy Inc., doing business as SuperImmersive 8\nEmail: jd@superimmersive8.com",
  ]),
})

export const TERMS_OF_SERVICE: ApprovedLegalDocument | null = Object.freeze({
  version: "terms-2026-11-09",
  effective_date: "2026-11-09",
  approval_reference: "JD-CR-V2-MVP-LEGAL-CONTENT-5-20261109",
  title: "Creator Record Terms of Service",
  paragraphs: Object.freeze([
    "These Terms apply to Creator Record, the service at app.superimmersive8.com provided by PMF Strategy Inc., doing business as SuperImmersive 8 (\"SI8\", \"we\" or \"us\"). You agree to these Terms when you confirm them in the Creator Record questionnaire, and they apply to every Creator Record you prepare or buy. The Creator Record Privacy Notice explains how we handle personal information.",
    "1. What Creator Record is",
    "A Creator Record is a private PDF that contains what you told SI8 about an AI-assisted video, educational guidance about the published terms of certain AI tool providers and, if you added documents and asked for them to be read, what an automated reading reports each document appears to show.",
    "Creator Record is self-declared and automated. No person at SI8 reviews your video, your answers, your documents or the readings. It is not legal advice, not a clearance, not a decision that your video may be used commercially, and not SI8's human-reviewed Commercial Assurance Assessment.",
    "2. Who can use Creator Record",
    "Creator Record is currently available by invitation only. You must be at least 18 years old. Individuals and businesses may both buy Creator Records; if you use it for a business, you confirm that you may accept these Terms for it. You are responsible for keeping your sign-in details secure and for activity under your account.",
    "3. Your answers and documents",
    "You confirm that what you tell SI8 is accurate to the best of your knowledge. Add only documents you are entitled to share, and remove details that are not needed, such as card numbers, home addresses and other people's personal information. SI8 does not check that any document is genuine, complete or current, or that it belongs to you.",
    "4. Automated readings",
    "If you give permission, an AI model reads a document you choose and reports what it appears to show. Readings may be incomplete or wrong, and no person checks them. You can mark a reading as wrong before you buy; your response is printed beside it but does not change it. SI8 draws no conclusion from comparing your documents with your answers. Readings do not change your answers or the guidance.",
    "5. Educational guidance",
    "Guidance is available for Runway, Pika and Higgsfield only. It describes each provider's own published terms as SI8 last read them. Providers change their terms, and the terms that applied to your account when you made your video may differ. Guidance is general, is not a determination about your video, your account or your use, and does not show which plan applied to you. Other tools can be listed in your record but receive no guidance; that is not a finding about them.",
    "6. Price and payment",
    "A Creator Record costs US$29, paid once through Stripe when you buy it. Promotional codes may reduce the price. You review your record before you pay. Your order is confirmed only after Stripe confirms successful payment. If checkout is interrupted or a charge appears incorrect, contact SI8 so we can investigate.",
    "7. Issuing your record",
    "After payment, your PDF is prepared automatically and made available on your dashboard. If it cannot be prepared automatically, it waits for SI8 and we will contact you. A record that uses a document for which you withdrew AI-reading permission, or a document deleted before the record was issued, cannot be issued automatically.",
    "An issued record cannot be changed. If your answers change, you can prepare and buy a new record.",
    "8. Refunds",
    "If SI8 cannot deliver a Creator Record you paid for, including because permission was withdrawn or a required document was deleted before issuance, we will refund that purchase in full. If your order is paused, contact jd@superimmersive8.com for assistance. Refunds are made manually through Stripe to the original payment method where possible. Once a record is issued, we do not ordinarily refund a change of mind, but we will review billing errors, material service errors and any refund or cancellation rights required by applicable law. Nothing in these Terms limits rights that cannot lawfully be excluded.",
    "9. Your information",
    "How SI8 handles personal information, how long documents are kept and how to ask for deletion are described in the Creator Record Privacy Notice.",
    "10. Use of the service",
    "Do not use Creator Record to upload material you are not entitled to share, to interfere with the service or other users, or for unlawful purposes. SI8 may suspend an account that does so.",
    "11. Our responsibility to you",
    "Creator Record provides automated educational information. It does not guarantee commercial clearance, third-party rights or fitness for a particular project, and SI8 does not guarantee that the service will be uninterrupted or error-free. To the extent permitted by applicable law, SI8 is not responsible for decisions made by treating a Creator Record as rights clearance, or for indirect or consequential loss, and SI8's total liability for a Creator Record is limited to the amount you paid for it. Nothing in these Terms excludes or limits liability, or consumer rights, that cannot lawfully be excluded or limited.",
    "12. Changes",
    "We may update these Terms. Each version has its own version identifier and effective date. You may be asked to agree to the new version before you continue to use Creator Record.",
    "13. Governing law and disputes",
    "These Terms are governed by the laws of the State of Texas, United States, without affecting any mandatory consumer protection of the country where you live. Disputes may be brought in the courts of Texas, or in the courts where you live if the law gives you that right. Before starting a claim, please contact jd@superimmersive8.com so we can try to resolve it.",
    "14. Contact",
    "PMF Strategy Inc., doing business as SuperImmersive 8\nEmail: jd@superimmersive8.com",
  ]),
})

export { LEGAL_PATHS } from './paths'

/** The version format: 3–32 characters (E7 binds these inside 120-character permission identifiers). */
export const LEGAL_VERSION_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/

const complete = (d: ApprovedLegalDocument | null): d is ApprovedLegalDocument =>
  !!d && LEGAL_VERSION_PATTERN.test(d.version) && /^\d{4}-\d{2}-\d{2}$/.test(d.effective_date) &&
  d.approval_reference.trim().length > 0 && d.title.trim().length > 0 && d.paragraphs.length > 0 && d.paragraphs.every((p) => p.trim().length > 0)

type PolicyDocs = { privacy: ApprovedLegalDocument | null; terms: ApprovedLegalDocument | null }
const CURRENT: PolicyDocs = { privacy: PRIVACY_NOTICE, terms: TERMS_OF_SERVICE }

/** True only when BOTH documents carry complete, approved content. Fail closed. */
export function legalPoliciesApproved(docs: PolicyDocs = CURRENT): boolean {
  return complete(docs.privacy) && complete(docs.terms)
}

/** CR-V2-SCHEMA8-PATH-1 (E7): the two approved versions an authorization relies on, or null while either is not approved. */
export interface ApprovedPolicyVersions {
  privacy: string
  terms: string
}

export function approvedPolicyVersions(docs: PolicyDocs = CURRENT): ApprovedPolicyVersions | null {
  return complete(docs.privacy) && complete(docs.terms) ? { privacy: docs.privacy.version, terms: docs.terms.version } : null
}

/** What a public legal page shows: the approved document, or nothing (never draft text). */
export function legalPageContent(doc: ApprovedLegalDocument | null): { available: true; doc: ApprovedLegalDocument } | { available: false } {
  return complete(doc) ? { available: true, doc } : { available: false }
}
