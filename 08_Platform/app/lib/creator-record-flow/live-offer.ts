/**
 * CR-V2-MVP-LAUNCH-FOUNDATION-1 — whether this build may OFFER a new customer live AI examination: both live-examination code
 * locks AND the approved privacy notice and terms. Kept apart from the examination wiring so a page can ask without importing
 * any examination port. (Re-checking readings that already exist is not new AI processing and uses the locks alone.)
 */
import { CUSTOMER_LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD, LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD } from '@/lib/creator-record/live-examination/controls'
import { legalPoliciesApproved } from '@/lib/legal/policies'

/** Both code locks, read at call time. */
export const customerLiveEnabledInThisBuild = (): boolean => LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD === true && CUSTOMER_LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD === true

/** A NEW live examination is offered only with both code locks and the approved legal documents. Fail closed. */
export const customerLiveOffered = (): boolean => customerLiveEnabledInThisBuild() && legalPoliciesApproved()
