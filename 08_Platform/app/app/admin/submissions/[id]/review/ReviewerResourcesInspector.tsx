'use client'

/**
 * ReviewerResourcesInspector — CAH-4F.1.
 *
 * Owns ONLY the mode/tab UI state of the Reviewer Resources inspector:
 *
 *     [ Living Knowledge ] [ Linked CRC Context ]
 *
 * It receives the two resource views as opaque, already-server-rendered
 * `React.ReactNode` slots (`livingKnowledge`, `linkedCrcContext`) produced by
 * the server `ReviewerResources` component. It never imports a reviewer-lk /
 * reviewer-context service, never fetches, never writes.
 *
 * Both slots stay mounted; switching tabs only toggles visibility, so:
 *   - a completed Living Knowledge look-up survives a tab switch;
 *   - switching to a tab triggers NO network call and NO audit event
 *     (the LK look-up is an explicit button action inside the LK slot; the
 *     CRC transcript is an explicit action inside the CRC slot).
 *
 * The panel frame (title "Reviewer Resources", subtitle, close control) is
 * owned by `ReviewerShell`, not here.
 */

import { useState } from 'react'
import { BookMarked, MessageSquare } from 'lucide-react'

type Mode = 'living_knowledge' | 'linked_crc'

const TABS: Array<{ id: Mode; label: string; Icon: typeof BookMarked }> = [
  { id: 'living_knowledge', label: 'Living Knowledge', Icon: BookMarked },
  { id: 'linked_crc', label: 'Linked CRC Context', Icon: MessageSquare },
]

export function ReviewerResourcesInspector({
  livingKnowledge,
  linkedCrcContext,
}: {
  livingKnowledge: React.ReactNode
  linkedCrcContext: React.ReactNode
}) {
  const [mode, setMode] = useState<Mode>('living_knowledge')

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        role="tablist"
        aria-label="Reviewer Resources modes"
        className="flex flex-shrink-0 gap-1 border-b px-3 pt-3"
        style={{ borderColor: 'rgba(0,0,0,0.08)' }}
      >
        {TABS.map(({ id, label, Icon }) => {
          const active = mode === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`reviewer-resources-tab-${id}`}
              aria-selected={active}
              aria-controls={`reviewer-resources-panel-${id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setMode(id)}
              className="flex items-center gap-1.5 rounded-t-md border border-b-0 px-3 py-2 text-xs font-medium transition-colors"
              style={{
                borderColor: active ? 'rgba(0,0,0,0.08)' : 'transparent',
                backgroundColor: active ? '#FFFFFF' : 'transparent',
                color: active ? '#1c1c1e' : '#83837e',
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          )
        })}
      </div>

      <div
        role="tabpanel"
        id="reviewer-resources-panel-living_knowledge"
        aria-labelledby="reviewer-resources-tab-living_knowledge"
        className={`${mode === 'living_knowledge' ? 'block' : 'hidden'} min-h-0 flex-1 overflow-y-auto p-4`}
      >
        {livingKnowledge}
      </div>

      <div
        role="tabpanel"
        id="reviewer-resources-panel-linked_crc"
        aria-labelledby="reviewer-resources-tab-linked_crc"
        className={`${mode === 'linked_crc' ? 'block' : 'hidden'} min-h-0 flex-1 overflow-y-auto p-4`}
      >
        {linkedCrcContext}
      </div>
    </div>
  )
}
