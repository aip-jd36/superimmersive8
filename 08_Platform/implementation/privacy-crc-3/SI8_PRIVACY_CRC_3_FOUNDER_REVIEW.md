# SI8-PRIVACY-CRC-3 — CRC privacy notice: founder copy review

Revised in SI8-PRIVACY-CRC-4 (final copy revisions): sections 9, 12, 13 and 14.

**Status: COPY APPROVED — EFFECTIVE DATE PENDING — NOT PUBLISHED.** Branch `work/si8-privacy-crc-1b`, local only. Nothing is
pushed, merged or deployed.

## Approval record (SI8-PRIVACY-CRC-5)

- **Approval reference:** `SI8-PRIVACY-CRC-5-20261117`, recorded 2026-11-17.
- **Approved:** version `crc-privacy-2026-11-17`, English and Traditional Chinese, exactly as below (SI8-PRIVACY-CRC-4 text).
  No further copy revisions.
- **Founder confirmations:** SI8 does not sell users' personal information. Privacy contact `jd@superimmersive8.com`.
- **Not authorized:** Production deployment.
- **Effective date:** pending. It must be the actual Production publication date. Until it is set
  (`CRC_PRIVACY_NOTICE_EFFECTIVE_DATE` in `08_Platform/app/lib/legal/crc-privacy-notice.ts`), the notice is not published: no
  page, no gate link, and captures keep recording `results-gate-v1`.

Any change to the text or version needs a new approval.

## What is built

- **One bilingual notice, one version.** The proposed text lives in `08_Platform/app/lib/legal/crc-privacy-notice-proposed.ts`
  (version `crc-privacy-2026-11-17`). Nothing in the application imports it. It has no effective date and no approval
  reference, so it cannot be published as it stands.
- **The approved notice is in the slot** (`CRC_PRIVACY_NOTICE` in `lib/legal/crc-privacy-notice.ts`) with the approval
  reference and an empty effective date. A notice is published only when it is complete in both languages, including a valid
  effective date.
- **`/crc/privacy`:** English by default, Traditional Chinese at `/crc/privacy?lang=zh-TW`. Once published, each language
  renders under its own `lang` attribute, with a language selector (links with `hreflang`, the current language marked
  `aria-current`). Until then every language shows "not available yet", has no selector and is not indexed.
- **Results-gate link:** appears only once the notice is published, and opens the notice in the visitor's CRC language. The
  Commercial Assurance follow-up sentence is unchanged in both languages.
- **Disclosure provenance (1C) is unchanged.** The gate reports `results-gate-v2` only when it actually shows the link. A notice
  missing a language shows no link and reports `results-gate-v1`.

## Factual limitations you should know before approving

1. **Retention is stated as it is today.** CRC deletes nothing automatically, including IP addresses recorded on usage
   limits. Planned periods (12 months, 30-day IP clearing) are not mentioned; the notice says SI8 is reviewing its retention
   practices and will update the notice when they change. When any limit goes live, including the IP clearing, the notice must
   change under a new version in the same release.
2. **"Ask us not to contact you" and privacy requests are manual.** There is no suppression list or request tool. You will be
   handling these by hand from `jd@superimmersive8.com`, and SI8 must actually stop follow-up for anyone who asks.
3. **Google Analytics loads when a visitor opens CRC.** The notice says so, says CRC provides no setting to turn it off, and
   points to browser controls. It does not suggest any consent or opt-out mechanism, because none exists.
4. **Not verified, so not claimed:**
   - how long Anthropic, Resend, Vercel, Supabase, Google and Calendly keep information;
   - whether Resend tracks opens or clicks (a dashboard setting);
   - whether Vercel's request logs hold IP addresses.

   The notice says only that copies may remain with providers and in backups.
5. **Staff access logging covers SI8's internal tools only.** Direct access through the Supabase dashboard is not logged, so the
   notice says "through SI8's internal tools".
6. **"Google: … SI8's email inbox"** rests on the domain's public mail records pointing to Google.
7. **The recorded gate version is `results-gate-v2`, not the notice version.** Which notice version a visitor could open is known
   from the release dates.
8. **Wording carried over from the live gate.** The Chinese gate sentence renders "Commercial Assurance" as 商業保證評估.
   - That sentence is preserved verbatim and quoted in section 7.
   - Elsewhere the notice uses 商業保證 for the service and 商業保證評估（Commercial Assurance Assessment）for the assessment.
9. **"We do not sell your personal information" (section 10) needs your explicit confirmation before publication.** It is a
   commitment you are making, not a fact the code proves. The statement that the English version prevails has been removed;
   the two languages are written to have the same meaning.
10. **The Chinese text is a careful machine-assisted translation, not reviewed by a professional translator.** A native
    Traditional Chinese reader should check it before approval.
11. **No external legal review was commissioned (your decision).** The notice makes no compliance claims and names no laws.
12. **Requests (section 13).** SI8 reviews each request individually. Some records may need to be kept (assessment records,
    security and access records, records of emails sent), and SI8 commits to telling the requester what was kept and why. That
    explanation is a commitment you will have to honour by hand. "SI8's research records" is no longer listed as kept: if a
    deletion request covers a visitor's wording held in research records, you need to decide case by case.

## Evidence for each section (repository facts)

| § | Statement | Source |
|---|---|---|
| 1 | Automated results, no human review before sending | `app/api/crc/turn/route.ts`, `lib/crc-engine/results-email-delivery.ts` |
| 2 | Conversation, summary, email, feedback, utm/ref, abuse identifier, rate-limit IP, timings/traces/clicks, results-email copy | `crc_sessions` and the related `crc_*` tables (migrations 20260809–20261014); `lib/crc-engine/abuse-key.ts`, `abuse-prevention.ts` |
| 2, 6 | Approximate country: from Vercel's `x-vercel-ip-country` header, used only in admin notifications | `lib/crc-engine/request-geography.ts`, `lib/emails.ts` |
| 4 | Messages and derived information sent to Anthropic | `lib/crc-engine/run-turn.ts` (`@anthropic-ai/sdk`) |
| 5 | Results via Resend; stored copies and delivery attempts | `lib/emails.ts`, `crc_results_email_artifacts`, `crc_results_email_delivery_attempts` |
| 5 | Booking links carry email and reference code | `lib/crc-engine/calendly-attribution.ts`, `results-email-template.ts`, `components/CommercialAssuranceBridge.tsx` |
| 6 | Staff views of conversations and results emails recorded | `crc_sales_events` (`transcript_viewed`, `results_email_viewed`) |
| 6 | Notifications for session started, email submitted (with address), research question (with wording) | `lib/emails.ts` |
| 7 | Follow-up sentence, verbatim | `lib/crc-engine/results-gate-copy.ts`, `components/crc/crc-ui-copy.ts` |
| 8 | Link only on a signed-in, verified-email-matching request; reviewer access recorded | `lib/crc-assurance-handoff/capabilities/email-correlation.ts`, `crc_context_access_events` |
| 9 | GA on all portal pages, no consent step; `crc_session` httpOnly, 7 days; language kept in local storage | `app/layout.tsx`, `lib/analytics/ga-snippet.ts`, `app/api/crc/turn/route.ts`, `components/crc/crc-locale.ts` |
| 12 | No automatic deletion, including rate-limit IP addresses; raw-IP clearing gated off | no delete path in `app/` or `lib/`; `.github/workflows/crc-raw-ip-retention.yml` |

`__tests__/legal/crc-privacy-notice-proposed.test.ts` re-checks the code behaviours behind §2, §5, §6, §9 and §12. If one
changes, that test fails and the notice must be revised before release.

## Release checklist (in order; each step needs its own go-ahead)

1. ~~Copy approval (founder).~~ Done: `SI8-PRIVACY-CRC-5-20261117`, including the "do not sell" confirmation.
2. **Native Chinese read-through:** not recorded as done. Any correction it produces is a copy change and needs a new approval.
3. **Release change (engineering), made only once Production release is authorized and the publication date is known:**
   - set `CRC_PRIVACY_NOTICE_EFFECTIVE_DATE` to that date (YYYY-MM-DD), with the text, version and approval reference unchanged;
   - update the two tests that assert the date is empty;
   - run `tsc`, the targeted tests and `next build`.
4. **Production release authorization (founder, separate).** Merge and deploy. Nothing else is needed: no migration, no secret,
   no environment change.
5. **After deploy, check:**
   - `/crc/privacy` and `/crc/privacy?lang=zh-TW` show the notice;
   - the language selector works;
   - the gate shows the link in English and Chinese;
   - a test capture records `results-gate-v2`. Use an internal test session, not a real visitor.
6. **Keep the notice true:**
   - when the raw-IP clearing is activated, or a retention period is introduced, or any described behaviour changes, publish a
     new version in the same release;
   - honour "do not contact" and access, correction and deletion requests by hand, telling each requester what was kept and
     why.

The raw-IP clearing has its own sequence (migration, secret, founder authorization of the first run) and is independent of
this release.

<!-- BEGIN GENERATED NOTICE TEXT (from lib/legal/crc-privacy-notice-proposed.ts, version crc-privacy-2026-11-17) -->

## Proposed notice — English

### Commercial Readiness Check Privacy Notice

This notice explains how PMF Strategy Inc., doing business as SuperImmersive 8 ("SI8", "we" or "us"), handles personal information in the Commercial Readiness Check ("CRC") at app.superimmersive8.com/crc. Creator Record has its own Creator Record Privacy Notice. This notice does not cover SI8's marketing website or SI8's other services.

#### 1. What CRC is

CRC is a free, educational conversation about commercial-readiness considerations that may apply to an AI video workflow you describe. An AI model conducts the conversation and your results are produced automatically. No person at SI8 reviews your conversation before your results are sent. CRC is not a Commercial Assurance Assessment, a certification, a clearance or legal advice.

#### 2. Information we collect

- Conversation: what you type, including any project, tool, business or personal details you choose to share, and the structured summary of your project that CRC derives from it.
- Email address: the address you give us to receive your results.
- Feedback: any rating or comment you choose to give about CRC.
- How you arrived: campaign information in the link that brought you to CRC, such as utm_source or ref.
- Security and usage limits: a one-way identifier derived from your IP address, used to apply usage limits. If a usage limit is triggered, we also record your IP address so that a person can investigate a mistaken block.
- Technical records: how the conversation ran, such as response timings, events such as clicks on the booking link, and diagnostic information.
- Results email: a copy of the results email we send you, and its delivery status.
- Approximate country: the country your network connection appears to come from, as reported by our hosting provider. We use it only in SI8's internal notifications (section 6) and do not save it in CRC's database.

Please do not include other people's personal information, or confidential information you are not entitled to share, in the conversation.

#### 3. How we use it

- To run the conversation and produce your educational results.
- To email your results to you, and to resend them if you ask.
- To keep CRC secure, apply usage limits and investigate mistaken blocks.
- To understand how CRC is used, improve it and decide which topics SI8 researches. The questions people ask, including their wording, inform that work and may be kept as part of SI8's research records.
- To follow up as described in section 7.
- If you ask SI8 to connect a CRC session to a Commercial Assurance Assessment, as described in section 8.

#### 4. AI processing

To produce each reply and your results, your messages and the information CRC has derived from the conversation so far are sent to Anthropic, the AI model provider SI8 uses. The results are generated automatically and may be incomplete or wrong.

#### 5. Your results email

Your results are sent by email through Resend. We keep a copy of the email we sent, the address it was sent to and its delivery status, so that we can resend it if you ask and support CRC.

The results email includes a link to book a call with SI8 through Calendly. That link, and the booking link shown at the end of CRC, may include your email address and a reference code so that a booking can be matched to your CRC session. If you open the link, Calendly receives that information.

#### 6. Who at SI8 sees your information

Authorized SI8 personnel can view CRC sessions, including your email address, the conversation and the results email sent to you, to operate and support CRC. Viewing a conversation or a sent results email through SI8's internal tools is recorded.

SI8 also sends itself automatic notification emails: when a CRC session starts; when an email address is submitted for results, including that address; and when the conversation raises a question SI8 may research, including your wording. These notifications can include the approximate country described in section 2, and they are kept in SI8's email inbox.

#### 7. Commercial Assurance follow-up

When you enter your email address, CRC tells you: "SI8 may also follow up with information relevant to Commercial Assurance." Commercial Assurance is SI8's human-reviewed service. If you do not want to hear from us, email jd@superimmersive8.com and ask us not to contact you. We handle these requests manually.

#### 8. Commercial Assurance Assessment

If you request a Commercial Assurance Assessment while signed in to your SI8 account and ask SI8 to connect a CRC session to it, SI8 can link that session to your assessment when the verified email address on your account matches the email address you gave in CRC. The SI8 reviewer can then see the context you gave. Each time a reviewer views a linked conversation, the access is recorded. A linked conversation becomes part of the assessment record.

#### 9. Analytics and cookies

CRC pages use Google Analytics to understand how the site is used. Google Analytics loads when you open CRC and uses cookies or similar technologies to collect technical information about your device, your browser and how you use the pages. CRC does not provide a setting to turn it off. You can block analytics or cookies through your browser settings or a browser extension.

CRC also sets its own cookie, crc_session, which keeps your place in the conversation. Scripts on the page cannot read it, and it expires after 7 days. CRC remembers the language you choose in your browser's storage.

#### 10. Service providers

- Anthropic: AI processing of the conversation.
- Supabase: database storage.
- Resend: sending results emails and SI8's notification emails.
- Vercel: hosting, and the approximate country described in section 2.
- Google: Google Analytics, and SI8's email inbox, which receives notification emails and privacy requests.
- Calendly: scheduling, if you open a booking link.

These providers process information to provide their services to SI8. We do not sell your personal information.

#### 11. Where information is processed

SI8 and its service providers may store and process information in countries other than the one where you live, including the United States.

#### 12. How long we keep information

CRC does not currently delete information automatically. We keep conversations, derived information, email addresses, feedback, campaign information, results emails, technical records and security records, including IP addresses recorded when a usage limit is triggered, until they are deleted, for example after a request under section 13.

We are reviewing our retention practices and may introduce additional retention limits. We will update this notice when those practices change.

Copies of information may remain in our service providers' systems and backups, and notification emails remain in SI8's email inbox, until they are deleted or expire.

#### 13. Access, correction and deletion

You can ask to access, correct or delete personal information from your CRC sessions by emailing jd@superimmersive8.com. We review each request individually and may ask you to confirm that you control the email address involved.

Some records may need to be kept, for example information that has become part of a Commercial Assurance Assessment, security and access records, and records of emails sent to you. If we keep any information, we will tell you what we kept and why.

Depending on where you live, you may have other rights over your personal information. To ask about them, email jd@superimmersive8.com.

#### 14. Changes to this notice

We may update this notice. Each version has its own version identifier and effective date.

#### 15. Contact

- PMF Strategy Inc., doing business as SuperImmersive 8
- Email: jd@superimmersive8.com

## Proposed notice — Traditional Chinese (繁體中文)

### 商業就緒度檢查隱私權聲明

本聲明說明 PMF Strategy Inc.（以 SuperImmersive 8 名義營業，以下稱「SI8」或「我們」）如何處理位於 app.superimmersive8.com/crc 的商業就緒度檢查（Commercial Readiness Check，以下稱「CRC」）中的個人資料。Creator Record 另有其專屬的 Creator Record 隱私權聲明。本聲明不適用於 SI8 的行銷網站或 SI8 的其他服務。

#### 1. CRC 是什麼

CRC 是一項免費的教育性對話，說明您所描述的 AI 影片製作流程可能涉及的商業就緒度考量。對話由 AI 模型進行，您的結果也是自動產生的。在寄出您的結果之前，SI8 不會有任何人審閱您的對話。CRC 不是商業保證評估（Commercial Assurance Assessment），也不是認證、權利清查（clearance）或法律意見。

#### 2. 我們蒐集的資料

- 對話內容：您輸入的內容，包括您選擇提供的任何專案、工具、業務或個人細節，以及 CRC 據此整理出的專案結構化摘要。
- 電子郵件地址：您提供用來接收結果的地址。
- 意見回饋：您選擇提供的任何評分或意見。
- 來源資訊：帶您進入 CRC 的連結中所含的行銷活動資訊，例如 utm_source 或 ref。
- 安全與使用限制：由您的 IP 位址衍生、無法還原的單向識別碼，用於套用使用限制。若觸發使用限制，我們也會記錄您的 IP 位址，以便由專人調查誤判的封鎖。
- 技術紀錄：對話的運作情形，例如回應時間、點擊預約連結等事件，以及診斷資訊。
- 結果電子郵件：我們寄給您的結果電子郵件副本及其寄送狀態。
- 大致所在國家／地區：由我們的主機服務供應商回報、您的網路連線看似來自的國家或地區。我們僅將其用於 SI8 的內部通知（第 6 節），不會將其存入 CRC 的資料庫。

請勿在對話中提供他人的個人資料，或您無權分享的機密資訊。

#### 3. 我們如何使用這些資料

- 進行對話並產生您的教育性結果。
- 以電子郵件寄送您的結果，並在您要求時重新寄送。
- 維護 CRC 的安全、套用使用限制，並調查誤判的封鎖。
- 了解 CRC 的使用情形、加以改進，並決定 SI8 要研究哪些主題。使用者提出的問題（包括其措辭）會作為這項工作的參考，並可能保留為 SI8 研究紀錄的一部分。
- 依第 7 節所述進行後續聯繫。
- 若您要求 SI8 將 CRC 工作階段連結至商業保證評估，依第 8 節所述處理。

#### 4. AI 處理

為了產生每一則回覆及您的結果，您的訊息以及 CRC 目前為止從對話中整理出的資訊，會傳送給 SI8 所使用的 AI 模型供應商 Anthropic。結果為自動產生，可能不完整或有誤。

#### 5. 您的結果電子郵件

您的結果透過 Resend 以電子郵件寄送。我們會保留所寄出電子郵件的副本、收件地址及寄送狀態，以便在您要求時重新寄送，並支援 CRC 的運作。

結果電子郵件中附有透過 Calendly 與 SI8 預約通話的連結。該連結以及 CRC 結尾顯示的預約連結，可能包含您的電子郵件地址和一組參考代碼，以便將預約與您的 CRC 工作階段對應。您開啟連結時，Calendly 會收到這些資訊。

#### 6. SI8 內部哪些人會看到您的資料

經授權的 SI8 人員可以檢視 CRC 工作階段，包括您的電子郵件地址、對話內容及寄給您的結果電子郵件，以營運及支援 CRC。透過 SI8 內部工具檢視對話或已寄出的結果電子郵件時，都會留下紀錄。

SI8 也會自動寄送通知電子郵件給自己：在 CRC 工作階段開始時；有人提交電子郵件地址以接收結果時，內容包含該地址；以及對話中出現 SI8 可能研究的問題時，內容包含您的措辭。這些通知可能包含第 2 節所述的大致所在國家／地區，並保存在 SI8 的電子郵件信箱中。

#### 7. 商業保證（Commercial Assurance）後續聯繫

您輸入電子郵件地址時，CRC 會告知您：「SI8 也可能會就商業保證評估（Commercial Assurance）相關資訊與您聯繫。」商業保證是 SI8 由專人審查的服務。如果您不希望收到我們的聯繫，請寄信至 jd@superimmersive8.com，要求我們不要與您聯繫。我們以人工方式處理這類要求。

#### 8. 商業保證評估

如果您在登入 SI8 帳戶的狀態下申請商業保證評估（Commercial Assurance Assessment），並要求 SI8 將某個 CRC 工作階段連結至該評估，當您帳戶中已驗證的電子郵件地址與您在 CRC 中提供的電子郵件地址相符時，SI8 可以將該工作階段連結至您的評估。SI8 的審查人員即可看到您提供的背景資訊。審查人員每次檢視已連結的對話，都會留下存取紀錄。已連結的對話會成為該評估紀錄的一部分。

#### 9. 分析工具與 Cookie

CRC 頁面使用 Google Analytics 了解網站的使用情形。您開啟 CRC 時，Google Analytics 就會載入，並使用 Cookie 或類似技術蒐集您的裝置、瀏覽器以及您如何使用頁面等技術資訊。CRC 沒有提供關閉它的設定。您可以透過瀏覽器設定或瀏覽器擴充功能封鎖分析工具或 Cookie。

CRC 也會設定自己的 Cookie「crc_session」，用來記住您在對話中的進度。頁面上的程式無法讀取此 Cookie，且會在 7 天後失效。CRC 會在您瀏覽器的儲存空間中記住您選擇的語言。

#### 10. 服務供應商

- Anthropic：對話的 AI 處理。
- Supabase：資料庫儲存。
- Resend：寄送結果電子郵件及 SI8 的通知電子郵件。
- Vercel：網站主機服務，以及第 2 節所述的大致所在國家／地區。
- Google：Google Analytics，以及接收通知電子郵件和隱私權相關要求的 SI8 電子郵件信箱。
- Calendly：您開啟預約連結時的預約服務。

這些供應商處理資料，是為了向 SI8 提供其服務。我們不會出售您的個人資料。

#### 11. 資料的處理地點

SI8 及其服務供應商可能在您居住國家以外的地區（包括美國）儲存及處理資料。

#### 12. 資料保存期間

CRC 目前不會自動刪除資料。對話內容、整理出的資訊、電子郵件地址、意見回饋、來源資訊、結果電子郵件、技術紀錄及安全紀錄（包括觸發使用限制時記錄的 IP 位址），都會保存到被刪除為止，例如在您依第 13 節提出要求之後。

我們正在檢討資料保存做法，並可能訂定其他保存期限。相關做法變更時，我們會更新本聲明。

資料副本可能保留在服務供應商的系統及備份中，通知電子郵件也會保留在 SI8 的電子郵件信箱中，直到被刪除或到期為止。

#### 13. 查詢、更正及刪除

您可以寄信至 jd@superimmersive8.com，要求查詢、更正或刪除您 CRC 工作階段中的個人資料。我們會逐一審查每項要求，並可能請您確認您能使用相關的電子郵件地址。

部分紀錄可能需要保留，例如已成為商業保證評估一部分的資料、安全與存取紀錄，以及寄給您的電子郵件紀錄。若我們保留任何資料，會告知您保留了哪些資料及原因。

依您居住地的不同，您可能對您的個人資料享有其他權利。如需詢問，請寄信至 jd@superimmersive8.com。

#### 14. 本聲明的變更

我們可能會更新本聲明。每個版本都有各自的版本識別碼及生效日期。

#### 15. 聯絡方式

- PMF Strategy Inc.（以 SuperImmersive 8 名義營業）
- 電子郵件：jd@superimmersive8.com

<!-- END GENERATED NOTICE TEXT -->
