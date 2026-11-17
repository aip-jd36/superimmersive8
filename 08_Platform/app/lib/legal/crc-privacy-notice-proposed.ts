/**
 * SI8-PRIVACY-CRC-3/4 — Commercial Readiness Check privacy notice copy, English and Traditional Chinese.
 *
 * COPY APPROVED by the founder, reference SI8-PRIVACY-CRC-5-20261117 (SI8-PRIVACY-CRC-5, 2026-11-17), including the
 * commitment "We do not sell your personal information". Any change to the text or version needs a new approval.
 *
 * Only `./crc-privacy-notice.ts` imports this module (checked by `__tests__/legal/crc-privacy-notice-proposed.test.ts`). It
 * carries no effective date and no approval reference of its own: the slot in `./crc-privacy-notice.ts` adds the approval
 * reference and the effective date, and the notice is published only once that date is set.
 *
 * Every statement describes CRC as it behaves at branch `work/si8-privacy-crc-1b` (`ef2ae803` and later); the evidence for each
 * section is in 08_Platform/implementation/privacy-crc-3/SI8_PRIVACY_CRC_3_FOUNDER_REVIEW.md. Retention statements describe the
 * current practice only (no automatic deletion); planned periods are deliberately not stated (SI8-PRIVACY-CRC-4). When any
 * retention limit, including the raw-IP clearing, goes live, this text must change, under a new version, in the same release.
 * "We do not sell your personal information" (section 10) was explicitly confirmed by the founder (SI8-PRIVACY-CRC-5).
 *
 * Both languages must keep the same number of paragraphs in the same order (tested). The Commercial Assurance follow-up
 * sentence is quoted verbatim from the results gate in each language (tested).
 *
 * To publish: set CRC_PRIVACY_NOTICE_EFFECTIVE_DATE in `./crc-privacy-notice.ts` to the Production publication date, in the
 * Production release change.
 */
import type { CrcPrivacyNotice } from './crc-privacy-notice'

const CONTACT = 'jd@superimmersive8.com'

export const CRC_PRIVACY_NOTICE_PROPOSED: CrcPrivacyNotice = Object.freeze({
  version: 'crc-privacy-2026-11-17',
  effective_date: '',
  approval_reference: '',
  text: Object.freeze({
    en: Object.freeze({
      title: 'Commercial Readiness Check Privacy Notice',
      paragraphs: Object.freeze([
        'This notice explains how PMF Strategy Inc., doing business as SuperImmersive 8 ("SI8", "we" or "us"), handles personal information in the Commercial Readiness Check ("CRC") at app.superimmersive8.com/crc. Creator Record has its own Creator Record Privacy Notice. This notice does not cover SI8\'s marketing website or SI8\'s other services.',
        '1. What CRC is',
        'CRC is a free, educational conversation about commercial-readiness considerations that may apply to an AI video workflow you describe. An AI model conducts the conversation and your results are produced automatically. No person at SI8 reviews your conversation before your results are sent. CRC is not a Commercial Assurance Assessment, a certification, a clearance or legal advice.',
        '2. Information we collect',
        'Conversation: what you type, including any project, tool, business or personal details you choose to share, and the structured summary of your project that CRC derives from it.\nEmail address: the address you give us to receive your results.\nFeedback: any rating or comment you choose to give about CRC.\nHow you arrived: campaign information in the link that brought you to CRC, such as utm_source or ref.\nSecurity and usage limits: a one-way identifier derived from your IP address, used to apply usage limits. If a usage limit is triggered, we also record your IP address so that a person can investigate a mistaken block.\nTechnical records: how the conversation ran, such as response timings, events such as clicks on the booking link, and diagnostic information.\nResults email: a copy of the results email we send you, and its delivery status.\nApproximate country: the country your network connection appears to come from, as reported by our hosting provider. We use it only in SI8\'s internal notifications (section 6) and do not save it in CRC\'s database.',
        'Please do not include other people\'s personal information, or confidential information you are not entitled to share, in the conversation.',
        '3. How we use it',
        'To run the conversation and produce your educational results.\nTo email your results to you, and to resend them if you ask.\nTo keep CRC secure, apply usage limits and investigate mistaken blocks.\nTo understand how CRC is used, improve it and decide which topics SI8 researches. The questions people ask, including their wording, inform that work and may be kept as part of SI8\'s research records.\nTo follow up as described in section 7.\nIf you ask SI8 to connect a CRC session to a Commercial Assurance Assessment, as described in section 8.',
        '4. AI processing',
        'To produce each reply and your results, your messages and the information CRC has derived from the conversation so far are sent to Anthropic, the AI model provider SI8 uses. The results are generated automatically and may be incomplete or wrong.',
        '5. Your results email',
        'Your results are sent by email through Resend. We keep a copy of the email we sent, the address it was sent to and its delivery status, so that we can resend it if you ask and support CRC.',
        'The results email includes a link to book a call with SI8 through Calendly. That link, and the booking link shown at the end of CRC, may include your email address and a reference code so that a booking can be matched to your CRC session. If you open the link, Calendly receives that information.',
        '6. Who at SI8 sees your information',
        'Authorized SI8 personnel can view CRC sessions, including your email address, the conversation and the results email sent to you, to operate and support CRC. Viewing a conversation or a sent results email through SI8\'s internal tools is recorded.',
        'SI8 also sends itself automatic notification emails: when a CRC session starts; when an email address is submitted for results, including that address; and when the conversation raises a question SI8 may research, including your wording. These notifications can include the approximate country described in section 2, and they are kept in SI8\'s email inbox.',
        '7. Commercial Assurance follow-up',
        'When you enter your email address, CRC tells you: "SI8 may also follow up with information relevant to Commercial Assurance." Commercial Assurance is SI8\'s human-reviewed service. If you do not want to hear from us, email ' + CONTACT + ' and ask us not to contact you. We handle these requests manually.',
        '8. Commercial Assurance Assessment',
        'If you request a Commercial Assurance Assessment while signed in to your SI8 account and ask SI8 to connect a CRC session to it, SI8 can link that session to your assessment when the verified email address on your account matches the email address you gave in CRC. The SI8 reviewer can then see the context you gave. Each time a reviewer views a linked conversation, the access is recorded. A linked conversation becomes part of the assessment record.',
        '9. Analytics and cookies',
        'CRC pages use Google Analytics to understand how the site is used. Google Analytics loads when you open CRC and uses cookies or similar technologies to collect technical information about your device, your browser and how you use the pages. CRC does not provide a setting to turn it off. You can block analytics or cookies through your browser settings or a browser extension.',
        'CRC also sets its own cookie, crc_session, which keeps your place in the conversation. Scripts on the page cannot read it, and it expires after 7 days. CRC remembers the language you choose in your browser\'s storage.',
        '10. Service providers',
        'Anthropic: AI processing of the conversation.\nSupabase: database storage.\nResend: sending results emails and SI8\'s notification emails.\nVercel: hosting, and the approximate country described in section 2.\nGoogle: Google Analytics, and SI8\'s email inbox, which receives notification emails and privacy requests.\nCalendly: scheduling, if you open a booking link.',
        'These providers process information to provide their services to SI8. We do not sell your personal information.',
        '11. Where information is processed',
        'SI8 and its service providers may store and process information in countries other than the one where you live, including the United States.',
        '12. How long we keep information',
        'CRC does not currently delete information automatically. We keep conversations, derived information, email addresses, feedback, campaign information, results emails, technical records and security records, including IP addresses recorded when a usage limit is triggered, until they are deleted, for example after a request under section 13.',
        'We are reviewing our retention practices and may introduce additional retention limits. We will update this notice when those practices change.',
        'Copies of information may remain in our service providers\' systems and backups, and notification emails remain in SI8\'s email inbox, until they are deleted or expire.',
        '13. Access, correction and deletion',
        'You can ask to access, correct or delete personal information from your CRC sessions by emailing ' + CONTACT + '. We review each request individually and may ask you to confirm that you control the email address involved.',
        'Some records may need to be kept, for example information that has become part of a Commercial Assurance Assessment, security and access records, and records of emails sent to you. If we keep any information, we will tell you what we kept and why.',
        'Depending on where you live, you may have other rights over your personal information. To ask about them, email ' + CONTACT + '.',
        '14. Changes to this notice',
        'We may update this notice. Each version has its own version identifier and effective date.',
        '15. Contact',
        'PMF Strategy Inc., doing business as SuperImmersive 8\nEmail: ' + CONTACT,
      ]),
    }),
    'zh-TW': Object.freeze({
      title: '商業就緒度檢查隱私權聲明',
      paragraphs: Object.freeze([
        '本聲明說明 PMF Strategy Inc.（以 SuperImmersive 8 名義營業，以下稱「SI8」或「我們」）如何處理位於 app.superimmersive8.com/crc 的商業就緒度檢查（Commercial Readiness Check，以下稱「CRC」）中的個人資料。Creator Record 另有其專屬的 Creator Record 隱私權聲明。本聲明不適用於 SI8 的行銷網站或 SI8 的其他服務。',
        '1. CRC 是什麼',
        'CRC 是一項免費的教育性對話，說明您所描述的 AI 影片製作流程可能涉及的商業就緒度考量。對話由 AI 模型進行，您的結果也是自動產生的。在寄出您的結果之前，SI8 不會有任何人審閱您的對話。CRC 不是商業保證評估（Commercial Assurance Assessment），也不是認證、權利清查（clearance）或法律意見。',
        '2. 我們蒐集的資料',
        '對話內容：您輸入的內容，包括您選擇提供的任何專案、工具、業務或個人細節，以及 CRC 據此整理出的專案結構化摘要。\n電子郵件地址：您提供用來接收結果的地址。\n意見回饋：您選擇提供的任何評分或意見。\n來源資訊：帶您進入 CRC 的連結中所含的行銷活動資訊，例如 utm_source 或 ref。\n安全與使用限制：由您的 IP 位址衍生、無法還原的單向識別碼，用於套用使用限制。若觸發使用限制，我們也會記錄您的 IP 位址，以便由專人調查誤判的封鎖。\n技術紀錄：對話的運作情形，例如回應時間、點擊預約連結等事件，以及診斷資訊。\n結果電子郵件：我們寄給您的結果電子郵件副本及其寄送狀態。\n大致所在國家／地區：由我們的主機服務供應商回報、您的網路連線看似來自的國家或地區。我們僅將其用於 SI8 的內部通知（第 6 節），不會將其存入 CRC 的資料庫。',
        '請勿在對話中提供他人的個人資料，或您無權分享的機密資訊。',
        '3. 我們如何使用這些資料',
        '進行對話並產生您的教育性結果。\n以電子郵件寄送您的結果，並在您要求時重新寄送。\n維護 CRC 的安全、套用使用限制，並調查誤判的封鎖。\n了解 CRC 的使用情形、加以改進，並決定 SI8 要研究哪些主題。使用者提出的問題（包括其措辭）會作為這項工作的參考，並可能保留為 SI8 研究紀錄的一部分。\n依第 7 節所述進行後續聯繫。\n若您要求 SI8 將 CRC 工作階段連結至商業保證評估，依第 8 節所述處理。',
        '4. AI 處理',
        '為了產生每一則回覆及您的結果，您的訊息以及 CRC 目前為止從對話中整理出的資訊，會傳送給 SI8 所使用的 AI 模型供應商 Anthropic。結果為自動產生，可能不完整或有誤。',
        '5. 您的結果電子郵件',
        '您的結果透過 Resend 以電子郵件寄送。我們會保留所寄出電子郵件的副本、收件地址及寄送狀態，以便在您要求時重新寄送，並支援 CRC 的運作。',
        '結果電子郵件中附有透過 Calendly 與 SI8 預約通話的連結。該連結以及 CRC 結尾顯示的預約連結，可能包含您的電子郵件地址和一組參考代碼，以便將預約與您的 CRC 工作階段對應。您開啟連結時，Calendly 會收到這些資訊。',
        '6. SI8 內部哪些人會看到您的資料',
        '經授權的 SI8 人員可以檢視 CRC 工作階段，包括您的電子郵件地址、對話內容及寄給您的結果電子郵件，以營運及支援 CRC。透過 SI8 內部工具檢視對話或已寄出的結果電子郵件時，都會留下紀錄。',
        'SI8 也會自動寄送通知電子郵件給自己：在 CRC 工作階段開始時；有人提交電子郵件地址以接收結果時，內容包含該地址；以及對話中出現 SI8 可能研究的問題時，內容包含您的措辭。這些通知可能包含第 2 節所述的大致所在國家／地區，並保存在 SI8 的電子郵件信箱中。',
        '7. 商業保證（Commercial Assurance）後續聯繫',
        '您輸入電子郵件地址時，CRC 會告知您：「SI8 也可能會就商業保證評估（Commercial Assurance）相關資訊與您聯繫。」商業保證是 SI8 由專人審查的服務。如果您不希望收到我們的聯繫，請寄信至 ' + CONTACT + '，要求我們不要與您聯繫。我們以人工方式處理這類要求。',
        '8. 商業保證評估',
        '如果您在登入 SI8 帳戶的狀態下申請商業保證評估（Commercial Assurance Assessment），並要求 SI8 將某個 CRC 工作階段連結至該評估，當您帳戶中已驗證的電子郵件地址與您在 CRC 中提供的電子郵件地址相符時，SI8 可以將該工作階段連結至您的評估。SI8 的審查人員即可看到您提供的背景資訊。審查人員每次檢視已連結的對話，都會留下存取紀錄。已連結的對話會成為該評估紀錄的一部分。',
        '9. 分析工具與 Cookie',
        'CRC 頁面使用 Google Analytics 了解網站的使用情形。您開啟 CRC 時，Google Analytics 就會載入，並使用 Cookie 或類似技術蒐集您的裝置、瀏覽器以及您如何使用頁面等技術資訊。CRC 沒有提供關閉它的設定。您可以透過瀏覽器設定或瀏覽器擴充功能封鎖分析工具或 Cookie。',
        'CRC 也會設定自己的 Cookie「crc_session」，用來記住您在對話中的進度。頁面上的程式無法讀取此 Cookie，且會在 7 天後失效。CRC 會在您瀏覽器的儲存空間中記住您選擇的語言。',
        '10. 服務供應商',
        'Anthropic：對話的 AI 處理。\nSupabase：資料庫儲存。\nResend：寄送結果電子郵件及 SI8 的通知電子郵件。\nVercel：網站主機服務，以及第 2 節所述的大致所在國家／地區。\nGoogle：Google Analytics，以及接收通知電子郵件和隱私權相關要求的 SI8 電子郵件信箱。\nCalendly：您開啟預約連結時的預約服務。',
        '這些供應商處理資料，是為了向 SI8 提供其服務。我們不會出售您的個人資料。',
        '11. 資料的處理地點',
        'SI8 及其服務供應商可能在您居住國家以外的地區（包括美國）儲存及處理資料。',
        '12. 資料保存期間',
        'CRC 目前不會自動刪除資料。對話內容、整理出的資訊、電子郵件地址、意見回饋、來源資訊、結果電子郵件、技術紀錄及安全紀錄（包括觸發使用限制時記錄的 IP 位址），都會保存到被刪除為止，例如在您依第 13 節提出要求之後。',
        '我們正在檢討資料保存做法，並可能訂定其他保存期限。相關做法變更時，我們會更新本聲明。',
        '資料副本可能保留在服務供應商的系統及備份中，通知電子郵件也會保留在 SI8 的電子郵件信箱中，直到被刪除或到期為止。',
        '13. 查詢、更正及刪除',
        '您可以寄信至 ' + CONTACT + '，要求查詢、更正或刪除您 CRC 工作階段中的個人資料。我們會逐一審查每項要求，並可能請您確認您能使用相關的電子郵件地址。',
        '部分紀錄可能需要保留，例如已成為商業保證評估一部分的資料、安全與存取紀錄，以及寄給您的電子郵件紀錄。若我們保留任何資料，會告知您保留了哪些資料及原因。',
        '依您居住地的不同，您可能對您的個人資料享有其他權利。如需詢問，請寄信至 ' + CONTACT + '。',
        '14. 本聲明的變更',
        '我們可能會更新本聲明。每個版本都有各自的版本識別碼及生效日期。',
        '15. 聯絡方式',
        'PMF Strategy Inc.（以 SuperImmersive 8 名義營業）\n電子郵件：' + CONTACT,
      ]),
    }),
  }),
})
