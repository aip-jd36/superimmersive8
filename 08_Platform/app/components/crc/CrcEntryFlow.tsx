'use client'

/**
 * Guided Entry mobile product surface (GE-2). ONE generic, config-driven
 * component — not AgencyGuidedEntry.tsx / IndependentGuidedEntry.tsx /
 * InHouseGuidedEntry.tsx. Renders from the real GE-1
 * GUIDED_ENTRY_DEFINITIONS catalogue (imported directly — it's a plain,
 * dependency-free data module, safe in a client component, and the single
 * source of truth Diagnostic Phase 2 asks for: no field id/value/option is
 * ever re-typed here). ROLE_PRESENTATION below is presentation-only
 * metadata (icon), explicitly allowed by that same Phase 2 note, keyed by
 * the real definitionId — it never introduces a new id or overrides an
 * authoritative value.
 *
 * This component owns ONLY local, pre-initialization UI state (which
 * screen, which role, which field answers, the draft concern text). It
 * never talks to the network and never touches StructuredUnderstanding —
 * it hands a fully-formed submission up to its parent (app/crc/page.tsx)
 * via onGuidedSubmit/onFreeFormSubmit, which alone owns the actual
 * guidedInit / message POST (same fetch() path either way — see
 * page.tsx's own submit()). No CRC session exists until one of those two
 * callbacks fires — selecting a role card alone creates nothing server-side
 * (Diagnostic Phase 5's own requirement).
 */

import { useReducer } from 'react'
import { Building2, ChevronLeft, ChevronRight, MessageCircle, User, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { GUIDED_ENTRY_DEFINITIONS } from '@/lib/crc-engine/guided-entry-definitions'
import {
  buildGuidedSubmission,
  currentField as selectCurrentField,
  guidedEntryFlowReducer,
  initialGuidedEntryFlowState,
  isOnConcernStep as selectIsOnConcernStep,
  visibleFields as selectVisibleFields,
} from '@/lib/crc-engine/guided-entry-flow-state'
import type { GuidedEntryDefinition, GuidedFieldSpec } from '@/types/guided-entry'
import { useCrcLocale } from './CrcLocaleProvider'
import { getRoleDisplay, getFieldPrompt, getOptionDisplayLabel } from './crc-ui-copy'
import type { CrcLocale } from './crc-locale'
import type { CrcUiCopy } from './crc-ui-copy'

const CONCERN_MAX_LENGTH = 500

/** Presentation-only (icon) — see module header. Every key here MUST be a real definitionId; nothing here is read by validation or by guided-entry-init.ts. */
const ROLE_PRESENTATION: Record<string, { Icon: typeof Users }> = {
  'agency-producing-for-client': { Icon: Users },
  'independent-own-work': { Icon: User },
  'in-house-own-organization': { Icon: Building2 },
}

export interface GuidedSubmission {
  guidedEntryInitId: string
  definitionId: string
  definitionVersion: string
  /** CRC-GE-MULTITOOL-1: a multi-select field entry carries `values` (never `value`); every single-select field entry carries `value` (never `values`), exactly as before. */
  fields: { fieldId: string; value?: string; values?: string[] }[]
  concern: string
}

export interface CrcEntryFlowProps {
  onFreeFormSubmit: (text: string) => void
  onGuidedSubmit: (submission: GuidedSubmission) => void
  /** True while either path's request is in flight — disables submit controls, matches page.tsx's own existing `phase === 'sending'` discipline (no separate loading state machine). */
  submitting: boolean
  /** Server-reported error for the LAST submit attempt, if any — cleared by the parent once a new attempt starts. Preserves form state (Diagnostic Phase 11: errors never discard the user's answers). */
  errorMessage: string | null
}

export function CrcEntryFlow({ onFreeFormSubmit, onGuidedSubmit, submitting, errorMessage }: CrcEntryFlowProps) {
  // All state transitions live in guided-entry-flow-state.ts's pure
  // reducer -- this component only dispatches actions and renders. See
  // that module's own header for why (no component-rendering test
  // environment in this repo).
  const [state, dispatch] = useReducer(guidedEntryFlowReducer, undefined, initialGuidedEntryFlowState)
  const { screen, selectedDefinition, stepIndex, answers, concern, freeFormText } = state
  // CRC-UI-1: UI-shell locale only -- see CrcLocaleProvider.tsx's own
  // header. Never read by guided-entry-flow-state.ts's reducer, never
  // passed to buildGuidedSubmission, never part of GuidedSubmission.
  const { locale, copy } = useCrcLocale()

  const visibleFields = selectVisibleFields(selectedDefinition)
  const isOnConcernStep = selectIsOnConcernStep(state)
  const currentField = selectCurrentField(state)

  function selectRole(def: GuidedEntryDefinition) {
    dispatch({ type: 'SELECT_ROLE', definition: def })
  }

  function selectFreeForm() {
    dispatch({ type: 'SELECT_FREE_FORM' })
  }

  function goBack() {
    dispatch({ type: 'GO_BACK' })
  }

  function setFieldAnswer(field: GuidedFieldSpec, value: string) {
    dispatch({ type: 'SET_FIELD_ANSWER', fieldId: field.fieldId, value })
  }

  function toggleFieldValue(field: GuidedFieldSpec, value: string) {
    dispatch({ type: 'TOGGLE_FIELD_VALUE', fieldId: field.fieldId, value })
  }

  function skipField(field: GuidedFieldSpec) {
    dispatch({ type: 'SKIP_FIELD', fieldId: field.fieldId })
  }

  function continueFromField(field: GuidedFieldSpec) {
    // Required fields cannot reach this UI unanswered — the only current
    // required field kind (workflow_role) is never rendered as a step at
    // all (see the reducer's own SELECT_ROLE branch), so every field
    // actually shown here is optional and Continue is always safe to
    // press with or without a selection. Kept as an explicit guard, not
    // an assumption, in case a future definition adds a required visible
    // field.
    if (field.required && !answers[field.fieldId]) return
    dispatch({ type: 'ADVANCE_STEP' })
  }

  function submitGuided() {
    if (submitting) return
    const submission = buildGuidedSubmission(state, crypto.randomUUID())
    if (!submission) return
    onGuidedSubmit(submission)
  }

  function submitFreeForm() {
    const trimmed = freeFormText.trim()
    if (!trimmed || submitting) return
    onFreeFormSubmit(trimmed)
  }

  const totalDots = selectedDefinition ? 1 + visibleFields.length + 1 : 0
  const activeDotIndex = selectedDefinition ? 1 + stepIndex : 0

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        {screen === 'choice' && (
          <div className="space-y-5">
            <h1 className="text-xl font-semibold leading-snug text-foreground sm:text-2xl">{copy.roleScreenHeading}</h1>
            <div className="flex flex-col gap-3">
              {GUIDED_ENTRY_DEFINITIONS.map((def) => {
                const presentation = ROLE_PRESENTATION[def.definitionId]
                const Icon = presentation?.Icon ?? Users
                const display = getRoleDisplay(locale, def.definitionId, def.label, def.description)
                return (
                  <button
                    key={def.definitionId}
                    type="button"
                    onClick={() => selectRole(def)}
                    className="group flex min-h-[64px] items-center gap-4 rounded-xl border border-input bg-card p-4 text-left shadow-sm transition-colors hover:border-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:bg-accent"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-base font-semibold text-foreground">{display.label}</span>
                      <span className="block text-sm text-muted-foreground">{display.description}</span>
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
                  </button>
                )
              })}
              <button
                type="button"
                onClick={selectFreeForm}
                className="group flex min-h-[64px] items-center gap-4 rounded-xl border border-input bg-card p-4 text-left shadow-sm transition-colors hover:border-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:bg-accent"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="flex-1">
                  <span className="block text-base font-semibold text-foreground">{copy.freeFormLabel}</span>
                  <span className="block text-sm text-muted-foreground">{copy.freeFormDescription}</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {screen === 'guided_step' && selectedDefinition && (
          <div className="space-y-5">
            <GuidedStepHeader definition={selectedDefinition} totalDots={totalDots} activeDotIndex={activeDotIndex} onBack={goBack} locale={locale} copy={copy} />

            {currentField && (
              <FieldStep
                field={currentField}
                value={answers[currentField.fieldId] ?? (currentField.cardinality === 'multiple' ? [] : '')}
                onChange={(value) => setFieldAnswer(currentField, value)}
                onToggle={(value) => toggleFieldValue(currentField, value)}
                onSkip={() => skipField(currentField)}
                onContinue={() => continueFromField(currentField)}
                locale={locale}
                copy={copy}
              />
            )}

            {isOnConcernStep && (
              <ConcernStep
                value={concern}
                onChange={(value) => dispatch({ type: 'SET_CONCERN', value })}
                onSubmit={submitGuided}
                submitting={submitting}
                errorMessage={errorMessage}
                heading={copy.concernHeadingGuided}
                copy={copy}
              />
            )}
          </div>
        )}

        {screen === 'free_form' && (
          <div className="space-y-5">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              {copy.back}
            </button>
            <ConcernStep
              value={freeFormText}
              onChange={(value) => dispatch({ type: 'SET_FREE_FORM_TEXT', value })}
              onSubmit={submitFreeForm}
              submitting={submitting}
              errorMessage={errorMessage}
              heading={copy.concernHeadingFreeForm}
              copy={copy}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function GuidedStepHeader({
  definition,
  totalDots,
  activeDotIndex,
  onBack,
  locale,
  copy,
}: {
  definition: GuidedEntryDefinition
  totalDots: number
  activeDotIndex: number
  onBack: () => void
  locale: CrcLocale
  copy: CrcUiCopy
}) {
  const presentation = ROLE_PRESENTATION[definition.definitionId]
  const Icon = presentation?.Icon ?? Users
  const display = getRoleDisplay(locale, definition.definitionId, definition.label, definition.description)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          {copy.back}
        </button>
        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
          {display.label}
        </span>
      </div>
      <div className="flex items-center gap-1.5" role="progressbar" aria-valuenow={activeDotIndex + 1} aria-valuemin={1} aria-valuemax={totalDots}>
        {Array.from({ length: totalDots }).map((_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= activeDotIndex ? 'bg-primary' : 'bg-muted'}`} />
        ))}
      </div>
    </div>
  )
}

function FieldStep({
  field,
  value,
  onChange,
  onToggle,
  onSkip,
  onContinue,
  locale,
  copy,
}: {
  field: GuidedFieldSpec
  /** A single-select field's current draft value (string) or a multi-select field's current selection (string[]) — which shape applies is read from `field.cardinality`, never guessed from the runtime value. */
  value: string | string[]
  /** Single-select fields only. */
  onChange: (value: string) => void
  /** Multi-select fields only — toggles one value's membership in the current selection. */
  onToggle: (value: string) => void
  onSkip: () => void
  onContinue: () => void
  locale: CrcLocale
  copy: CrcUiCopy
}) {
  const prompt = getFieldPrompt(locale, field.kind, field.prompt)
  const isMultiSelect = field.cardinality === 'multiple'
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold leading-snug text-foreground sm:text-2xl">{prompt}</h2>
      {isMultiSelect ? (
        // CRC-GE-MULTITOOL-1: mobile-first checkbox/toggle list — native
        // HTML only, no new dependency. Each option is independently
        // tappable (min 48px touch target), selected state is visually
        // obvious (border + background change, on top of the native
        // checkbox's own check mark), keyboard-accessible via ordinary
        // Tab/Space (no Ctrl/Cmd-click), and free to select/deselect
        // repeatedly before Continue. No tool-category/modality grouping
        // and no "Other"/free-text entry — options render in the field's
        // own declared order, unmodified.
        <div className="space-y-2" role="group" aria-label={prompt}>
          {field.options.map((opt) => {
            const selectedValues = value as string[]
            const checked = selectedValues.includes(opt.value)
            return (
              <label
                key={opt.value}
                className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-base transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${
                  checked ? 'border-primary bg-accent' : 'border-input bg-background'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(opt.value)}
                  className="h-5 w-5 shrink-0 accent-primary"
                />
                <span>{getOptionDisplayLabel(locale, field.kind, opt.value, opt.label)}</span>
              </label>
            )
          })}
        </div>
      ) : (
        <div className="space-y-1.5">
          <label htmlFor={`guided-field-${field.fieldId}`} className="sr-only">
            {prompt}
          </label>
          <select
            id={`guided-field-${field.fieldId}`}
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">{field.kind === 'tool' ? copy.selectTool : copy.selectJurisdiction}</option>
            {field.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {getOptionDisplayLabel(locale, field.kind, opt.value, opt.label)}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Button type="button" size="lg" className="h-12 w-full text-base" onClick={onContinue}>
          {copy.continueLabel}
        </Button>
        {!field.required && (
          <button type="button" onClick={onSkip} className="text-sm text-muted-foreground underline hover:text-foreground">
            {copy.skipOptional}
          </button>
        )}
      </div>
    </div>
  )
}

function ConcernStep({
  value,
  onChange,
  onSubmit,
  submitting,
  errorMessage,
  heading,
  copy,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  submitting: boolean
  errorMessage: string | null
  heading: string
  copy: CrcUiCopy
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold leading-snug text-foreground sm:text-2xl">{heading}</h2>
      <div className="space-y-1">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, CONCERN_MAX_LENGTH))}
          placeholder={copy.typeYourQuestion}
          rows={5}
          disabled={submitting}
          className="text-base"
        />
        <p className="text-right text-xs text-muted-foreground">
          {value.length}/{CONCERN_MAX_LENGTH}
        </p>
      </div>
      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
      <Button type="button" size="lg" className="h-12 w-full text-base" disabled={value.trim().length === 0 || submitting} onClick={onSubmit}>
        {submitting ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" aria-hidden="true" />
            {copy.settingUpSession}
          </span>
        ) : (
          copy.startConversation
        )}
      </Button>
    </div>
  )
}
