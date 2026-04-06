// src/components/CallQueue.tsx
import { useState } from 'react'
import { useBroadcastStore } from '@/stores/broadcastStore'
import { LANG_LABELS } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Button, Empty } from '@/components/ui'
import type { Caller, CallerStatus } from '@/types'

const STATUS_LABEL: Record<CallerStatus, string> = {
  waiting: 'Waiting',
  on_air:  'On Air',
  done:    'Done',
  dropped: 'Dropped',
}

function CallerCard({ caller }: { caller: Caller }) {
  const { updateCallerStatus } = useBroadcastStore()

  return (
    <div className={cn(
      'flex items-center gap-3 p-2.5 rounded border transition-all',
      caller.status === 'on_air'
        ? 'bg-signal-red/10 border-signal-red/30'
        : 'bg-lane/40 border-marking hover:border-stripe'
    )}>
      <div className="w-7 h-7 rounded-full bg-marking flex items-center justify-center text-xs flex-shrink-0 border border-stripe">
        🚛
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-ui text-xs font-semibold text-ink truncate">{caller.name}</span>
          <span className="font-ui text-[10px] text-ink-dim">{LANG_LABELS[caller.language]}</span>
        </div>
        {caller.location && (
          <p className="font-body text-[10px] text-ink-dim truncate">{caller.location}</p>
        )}
      </div>

      <div className="flex gap-1 flex-shrink-0">
        {caller.status === 'waiting' && (
          <Button size="sm" variant="primary" onClick={() => updateCallerStatus(caller.id, 'on_air')}>
            On Air
          </Button>
        )}
        {caller.status === 'on_air' && (
          <Button size="sm" variant="ghost" onClick={() => updateCallerStatus(caller.id, 'done')}>
            Done
          </Button>
        )}
      </div>
    </div>
  )
}

export function CallQueue() {
  const { callers = [] } = useBroadcastStore()
  const [adding, setAdding] = useState(false)

  // DEFENSIVE: Guard the filter
  const active = Array.isArray(callers) 
    ? callers.filter(c => c.status === 'waiting' || c.status === 'on_air') 
    : []

  return (
    <div className="panel flex flex-col h-full bg-asphalt/30">
      <div className="panel-header border-b border-lane p-3 flex justify-between items-center">
        <span className="panel-title font-bold uppercase text-[10px] tracking-widest text-ink-dim">Call Queue</span>
        <div className="flex items-center gap-2">
          {active.length > 0 && (
            <span className="text-[10px] text-signal-green font-bold animate-pulse">
              {active.length} ACTIVE
            </span>
          )}
          <Button size="sm" variant="ghost" onClick={() => setAdding(!adding)}>
            {adding ? '✕' : '+'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 custom-scrollbar">
        {active.length === 0 && !adding && (
          <div className="h-full flex items-center justify-center opacity-30 italic text-[10px]">
            No callers in queue
          </div>
        )}
        {active.map(c => <CallerCard key={c.id} caller={c} />)}
      </div>
    </div>
  )
}