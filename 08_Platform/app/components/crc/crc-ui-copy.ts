/**
 * CRC deterministic UI-shell copy dictionary (CRC-UI-1, 2026-09-18). Pure,
 * no React -- directly unit-testable, matches the established
 * lib/crc-engine/{results-gate-copy,rate-limit-copy,wait-indicator,
 * acknowledgment-guidance}.ts convention of a small, pure, independently
 * tested copy module. Lives under components/crc/ (presentation ownership)
 * rather than lib/crc-engine/ (semantic/engine ownership) -- see this
 * milestone's own diagnostic report for that boundary rationale.
 *
 * CORE INVARIANT (restated from crc-locale.ts): this module supplies
 * DETERMINISTIC PRESENTATION COPY ONLY. It never returns generated CRC
 * content, never influences extraction/StructuredUnderstanding/ProjectFacts/
 * UserGoals/Material Demand/jurisdiction, and is never passed to any API
 * request body. Selecting a locale here changes what the browser DISPLAYS,
 * never what CRC computes.
 *
 * DECLINE_LABEL (app/crc/page.tsx) is deliberately NOT represented here and
 * MUST NEVER be -- it is the literal userText sent into runTurn() for a
 * skip/stop action (mirrors route.ts's own server-side copy exactly), not
 * presentation chrome. The corresponding VISIBLE button labels (skipQuestion/
 * skipSection/stop below) are safe to localize; the engine-bound text they
 * produce on click must remain the fixed, non-locale-parameterized
 * DECLINE_LABEL constant regardless of which locale is active. See
 * __tests__/crc/crc-decline-label-locale-independence.test.ts for the
 * regression proof.
 *
 * For English, this module reuses the EXISTING pure copy functions in
 * lib/crc-engine/ directly (formatWaitIndicator, getRateLimitMessage,
 * buildTeaserCopy, buildConfirmationCopy, getResultsEmailErrorMessage,
 * RESULTS_GATE_COPY, ACKNOWLEDGMENT_GUIDANCE_COPY) rather than retyping
 * their strings -- those files remain the single source of truth for
 * English, untouched by this milestone. Only the zh-TW branch is new.
 *
 * Role/tool/jurisdiction display labels are looked up here, keyed by the
 * same stable identifiers (definitionId / field kind / option value)
 * guided-entry-definitions.ts already exposes -- that file is NOT modified
 * by this milestone. English continues reading its `label`/`description`/
 * `prompt` fields directly (passed in as `fallback*` below); only zh-TW has
 * a lookup entry. Semantic option `value`s are never read or altered here.
 */

import { formatWaitIndicator as formatWaitIndicatorEn } from '@/lib/crc-engine/wait-indicator'
import { getRateLimitMessage as getRateLimitMessageEn, formatRetryAfter as formatRetryAfterEn } from '@/lib/crc-engine/rate-limit-copy'
import {
  buildTeaserCopy as buildTeaserCopyEn,
  buildConfirmationCopy as buildConfirmationCopyEn,
  getResultsEmailErrorMessage as getResultsEmailErrorMessageEn,
  RESULTS_GATE_COPY as RESULTS_GATE_COPY_EN,
  type TeaserCopy,
  type ConfirmationCopy,
  type ResultsEmailClaimReason,
} from '@/lib/crc-engine/results-gate-copy'
import { ACKNOWLEDGMENT_GUIDANCE_COPY as ACKNOWLEDGMENT_GUIDANCE_COPY_EN } from '@/lib/crc-engine/acknowledgment-guidance'
import type { RateLimitReason } from '@/lib/crc-engine/api-contract'
import type { CrcLocale } from './crc-locale'

// ── Static UI-shell dictionary ──────────────────────────────────────────

export interface CrcUiCopy {
  productName: string
  productSubtitle: string
  languageControlLabel: string
  languageNameEnglish: string
  languageNameTraditionalChinese: string
  zhConversationNotice: string
  roleScreenHeading: string
  freeFormLabel: string
  freeFormDescription: string
  back: string
  continueLabel: string
  selectTool: string
  selectJurisdiction: string
  skipOptional: string
  startConversation: string
  settingUpSession: string
  typeYourQuestion: string
  concernHeadingGuided: string
  concernHeadingFreeForm: string
  headerTitle: string
  headerDescription: string
  startOver: string
  startOverConfirm: string
  loading: string
  sessionNotFoundMessage: string
  sessionNotFoundButton: string
  emptyStateHint: string
  typeYourAnswer: string
  skipQuestion: string
  skipSection: string
  stop: string
  send: string
  retryMessage: string
  retryButton: string
  startNewConversation: string
  feedbackPrompt: string
  feedbackYes: string
  feedbackSomewhat: string
  feedbackNo: string
  feedbackPlaceholder: string
  feedbackSubmit: string
  feedbackThanks: string
  feedbackError: string
  commercialAssuranceCta: string
  changeEmail: string
  resendEmail: string
  networkErrorGeneric: string
}

const EN: CrcUiCopy = {
  productName: 'SI8',
  productSubtitle: 'CRC',
  languageControlLabel: 'Language',
  languageNameEnglish: 'English',
  languageNameTraditionalChinese: '繁體中文',
  zhConversationNotice: 'This language setting currently applies to the interface only; CRC conversation content is still shown in English.',
  roleScreenHeading: 'How are you making this project?',
  freeFormLabel: 'Tell us in your own words',
  freeFormDescription: 'Start with your question',
  back: 'Back',
  continueLabel: 'Continue',
  selectTool: 'Select a tool',
  selectJurisdiction: 'Select a jurisdiction',
  skipOptional: "I'm not sure / skip",
  startConversation: 'Start Conversation',
  settingUpSession: 'Setting up your session…',
  typeYourQuestion: 'Type your question…',
  concernHeadingGuided: "What's your main question or concern?",
  concernHeadingFreeForm: 'What would you like to know about your project?',
  headerTitle: 'Commercial Readiness Check',
  headerDescription:
    "A short conversation about how your AI video was made. There's no wrong answer, and you can skip anything you'd rather not cover. This is educational workflow guidance, not an SI8 Commercial Assurance Assessment -- it doesn't provide legal advice or certify commercial use.",
  startOver: 'Start Over',
  startOverConfirm: 'Start over? This will clear the current conversation.',
  loading: 'Loading…',
  sessionNotFoundMessage: 'Your session could not be found. It may have expired.',
  sessionNotFoundButton: 'Start New Conversation',
  emptyStateHint: 'Tell me a bit about the project to get started.',
  typeYourAnswer: 'Type your answer…',
  skipQuestion: 'Skip question',
  skipSection: 'Skip section',
  stop: 'Stop',
  send: 'Send',
  retryMessage: 'Something went wrong. Nothing was lost -- you can try again.',
  retryButton: 'Retry',
  startNewConversation: 'Start a New Conversation',
  feedbackPrompt: 'Was this helpful?',
  feedbackYes: 'Yes',
  feedbackSomewhat: 'Somewhat',
  feedbackNo: 'No',
  feedbackPlaceholder: "Anything you'd add? (optional)",
  feedbackSubmit: 'Submit feedback',
  feedbackThanks: 'Thanks for the feedback.',
  feedbackError: 'Something went wrong submitting your feedback. You can try again.',
  commercialAssuranceCta: 'Talk with SI8 about a Commercial Assurance Assessment',
  changeEmail: 'Wrong email? Change it',
  resendEmail: "Didn't get it? Resend",
  networkErrorGeneric: "That didn't go through. You can try again.",
}

const ZH_TW: CrcUiCopy = {
  productName: 'SI8',
  productSubtitle: 'CRC',
  languageControlLabel: '語言',
  languageNameEnglish: 'English',
  languageNameTraditionalChinese: '繁體中文',
  zhConversationNotice: '目前僅介面文字提供繁體中文；CRC 對話內容仍以英文呈現。',
  roleScreenHeading: '這個專案是怎麼製作的？',
  freeFormLabel: '用自己的話告訴我們',
  freeFormDescription: '從您的問題開始',
  back: '上一步',
  continueLabel: '繼續',
  selectTool: '選擇工具',
  selectJurisdiction: '選擇司法管轄區',
  skipOptional: '不確定／略過',
  startConversation: '開始對話',
  settingUpSession: '正在設定您的對話…',
  typeYourQuestion: '請輸入您的問題…',
  concernHeadingGuided: '您最想了解的問題是什麼？',
  concernHeadingFreeForm: '關於您的專案，您想了解什麼？',
  headerTitle: '商業就緒度檢查',
  headerDescription:
    '一段簡短的對話，了解您的 AI 影片是如何製作的。沒有標準答案，任何不想回答的問題都可以略過。這是教育性質的工作流程指引，並非 SI8 商業保證評估（Commercial Assurance Assessment），不構成法律意見，亦不代表已通過商業使用之認證。',
  startOver: '重新開始',
  startOverConfirm: '要重新開始嗎？目前的對話內容將會清除。',
  loading: '載入中…',
  sessionNotFoundMessage: '找不到您的對話紀錄，可能已逾期失效。',
  sessionNotFoundButton: '開始新的對話',
  emptyStateHint: '請先簡單介紹一下這個專案，我們就可以開始了。',
  typeYourAnswer: '請輸入您的回覆…',
  skipQuestion: '略過此問題',
  skipSection: '略過此部分',
  stop: '結束對話',
  send: '傳送',
  retryMessage: '發生錯誤，但先前的內容並未遺失，您可以再試一次。',
  retryButton: '重試',
  startNewConversation: '開始新的對話',
  feedbackPrompt: '這對您有幫助嗎？',
  feedbackYes: '有幫助',
  feedbackSomewhat: '還算有幫助',
  feedbackNo: '沒有幫助',
  feedbackPlaceholder: '還有想補充的嗎？（選填）',
  feedbackSubmit: '送出意見回饋',
  feedbackThanks: '感謝您的意見回饋。',
  feedbackError: '意見回饋送出時發生錯誤，您可以再試一次。',
  commercialAssuranceCta: '與 SI8 洽談商業保證評估（Commercial Assurance Assessment）',
  changeEmail: '信箱填錯了嗎？點此修改',
  resendEmail: '沒收到嗎？重新寄送',
  networkErrorGeneric: '傳送失敗，請再試一次。',
}

const CRC_UI_COPY: Record<CrcLocale, CrcUiCopy> = { en: EN, 'zh-TW': ZH_TW }

/** Falls back to English for any locale not present in the dictionary (defensive -- CrcLocale is currently closed to 'en' | 'zh-TW', so this branch is unreachable today, not a silent-failure risk). */
export function getCrcUiCopy(locale: CrcLocale): CrcUiCopy {
  return CRC_UI_COPY[locale] ?? EN
}

// ── Role / tool / jurisdiction display-label lookups ────────────────────
// Presentation-only. guided-entry-definitions.ts is never imported or
// modified here -- callers pass the EXISTING English label/description/
// prompt as `fallback*`; these functions only ever substitute the zh-TW
// presentation string for a known, stable identifier. Semantic values are
// never read, returned, or influenced.

const ROLE_DISPLAY_ZH_TW: Record<string, { label: string; description: string }> = {
  'agency-producing-for-client': { label: '代理商', description: '為客戶製作' },
  'independent-own-work': { label: '獨立創作者', description: '個人作品' },
  'in-house-own-organization': { label: '內部團隊', description: '為所屬組織製作' },
}

export function getRoleDisplay(
  locale: CrcLocale,
  definitionId: string,
  fallbackLabel: string,
  fallbackDescription: string,
): { label: string; description: string } {
  if (locale === 'zh-TW') {
    const zh = ROLE_DISPLAY_ZH_TW[definitionId]
    if (zh) return zh
  }
  return { label: fallbackLabel, description: fallbackDescription }
}

const FIELD_PROMPT_ZH_TW: Record<string, string> = {
  tool: '您使用哪個工具生成這支 AI 影片？',
  jurisdiction: '我們應考量哪個司法管轄區？',
}

/** `kind` is GuidedFieldKind ('tool' | 'jurisdiction' | 'workflow_role') -- typed as `string` here only to avoid importing the semantic type into this presentation module; callers already have the real typed value. */
export function getFieldPrompt(locale: CrcLocale, kind: string, fallbackPrompt: string): string {
  if (locale === 'zh-TW') {
    const zh = FIELD_PROMPT_ZH_TW[kind]
    if (zh) return zh
  }
  return fallbackPrompt
}

// Third-party tool names (Runway Gen-3, Kling, Google Veo, Pika, Luma) are
// deliberately NOT translated (product decision, CRC-UI-1) -- no lookup
// table exists for `kind: 'tool'` option labels; English `label` is always
// returned unchanged for tool options regardless of locale.
const JURISDICTION_OPTION_LABEL_ZH_TW: Record<string, string> = {
  'United States': '美國',
  'European Union': '歐盟',
  // CRC-GE-TW-1 (2026-09-22). '台灣' (not '臺灣') -- follows the existing,
  // already-established SI8 repository convention: every occurrence of
  // Taiwan in the marketing site's own zh-TW content
  // (07_Website/zh/rights-verified/{chain-of-title,playbook}/index.html)
  // uses 台灣, so this display label matches existing SI8 usage rather
  // than introducing a second, inconsistent rendering.
  Taiwan: '台灣',
}

/** `value` is the option's semantic value (e.g. 'United States') -- read-only, never altered or returned as a new value; only ever used as a lookup KEY into a presentation-only label table. */
export function getOptionDisplayLabel(locale: CrcLocale, kind: string, value: string, fallbackLabel: string): string {
  if (locale === 'zh-TW' && kind === 'jurisdiction') {
    const zh = JURISDICTION_OPTION_LABEL_ZH_TW[value]
    if (zh) return zh
  }
  return fallbackLabel
}

// ── Locale-aware wrappers around existing lib/crc-engine/ pure copy ─────
// English always delegates to the existing, untouched function -- these
// wrappers add ONLY the zh-TW branch; they never duplicate or diverge from
// the English source of truth.

export function formatWaitIndicatorLocalized(locale: CrcLocale, elapsedSeconds: number): string {
  if (locale === 'zh-TW') {
    if (elapsedSeconds <= 0) return '思考中…'
    const verb = elapsedSeconds >= 10 ? '仍在處理中…' : '思考中…'
    return `${verb}（${elapsedSeconds} 秒）`
  }
  return formatWaitIndicatorEn(elapsedSeconds)
}

function formatRetryAfterLocalized(locale: CrcLocale, seconds: number): string {
  if (locale !== 'zh-TW') return formatRetryAfterEn(seconds)
  if (seconds < 60) return '幾秒鐘後'
  if (seconds < 60 * 60) return `約 ${Math.round(seconds / 60)} 分鐘後`
  if (seconds < 60 * 60 * 24) return `約 ${Math.round(seconds / (60 * 60))} 小時後`
  return `約 ${Math.round(seconds / (60 * 60 * 24))} 天後`
}

const NEAR_ONE_DAY_SECONDS_ZH = 23 * 60 * 60

export function getRateLimitMessageLocalized(locale: CrcLocale, reason: RateLimitReason | undefined, retryAfterSeconds: number | undefined): string {
  if (locale !== 'zh-TW') return getRateLimitMessageEn(reason, retryAfterSeconds)

  if (reason === 'burst') {
    return '您傳送訊息的速度有點快，請稍等幾秒後再試一次。'
  }
  if (reason === 'session_creation_rate') {
    if (typeof retryAfterSeconds === 'number' && retryAfterSeconds >= NEAR_ONE_DAY_SECONDS_ZH) {
      return '您今天的商業就緒度檢查次數已達上限，請明天再試。'
    }
    const retryText = typeof retryAfterSeconds === 'number' ? formatRetryAfterLocalized(locale, retryAfterSeconds) : '稍後'
    return `您今天的商業就緒度檢查次數已達上限，請於${retryText}再試。`
  }
  return '目前的對話次數已達上限，請稍後再試。'
}

export function buildTeaserCopyLocalized(locale: CrcLocale, considerationCount: number): TeaserCopy {
  if (locale !== 'zh-TW') return buildTeaserCopyEn(considerationCount)
  const heading = '您的商業就緒度檢查已完成'
  if (considerationCount === 0) {
    return { heading, body: '我們將寄送您一份摘要，說明我們理解的內容以及與您的工作流程相關的現行指引。' }
  }
  return { heading, body: `根據您描述的工作流程，我們發現了 ${considerationCount} 項商業就緒度相關考量。` }
}

export function buildConfirmationCopyLocalized(locale: CrcLocale, maskedEmail: string): ConfirmationCopy {
  if (locale !== 'zh-TW') return buildConfirmationCopyEn(maskedEmail)
  return {
    heading: '請查看您的信箱',
    body: `我們已將您的商業就緒度檢查結果寄至 ${maskedEmail}。`,
    body2: '結果內容包含我們的理解與您所描述工作流程相關的現行指引。',
  }
}

export function getResultsEmailErrorMessageLocalized(locale: CrcLocale, reason: ResultsEmailClaimReason): string {
  if (locale !== 'zh-TW') return getResultsEmailErrorMessageEn(reason)
  switch (reason) {
    case 'distinct_recipient_limit':
      return '這份商業就緒度檢查已嘗試寄送至多個信箱。如需使用其他信箱，請開始新的商業就緒度檢查。'
    case 'resend_limit':
      return '此結果已重新寄送過幾次。若您仍未收到，請開始新的商業就緒度檢查。'
    case 'cooldown':
      return '請稍候片刻，再要求重新寄送。'
    case 'send_in_progress':
      return '仍在處理中，請稍後再試一次。'
    case 'not_yet_sent':
    case 'session_not_found':
      return '發生錯誤，請再試一次。'
  }
}

export interface ResultsGateCopy {
  heading: string
  valueProp: string
  fieldLabel: string
  buttonText: string
  disclosure: string
}

export function getResultsGateCopyLocalized(locale: CrcLocale): ResultsGateCopy {
  if (locale !== 'zh-TW') return RESULTS_GATE_COPY_EN
  return {
    heading: '我們該將結果寄到哪個信箱？',
    valueProp: '請輸入您可以收信的電子郵件地址，我們會將完整的商業就緒度檢查結果寄給您。',
    fieldLabel: '電子郵件地址',
    buttonText: '將結果寄給我',
    disclosure: 'SI8 也可能會就商業保證評估（Commercial Assurance）相關資訊與您聯繫。',
  }
}

export function getAcknowledgmentGuidanceCopyLocalized(locale: CrcLocale): string {
  if (locale !== 'zh-TW') return ACKNOWLEDGMENT_GUIDANCE_COPY_EN
  return '如果還有其他關於這支影片製作方式的資訊想補充，歡迎繼續說明。若沒有，也可以直接點選「結束對話」，我會為您總結目前已了解的內容。'
}
