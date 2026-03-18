// src/components/CallQueue.tsx
import { useState } from 'react'
import { useBroadcastStore } from '@/stores/broadcastStore'
import { fmtRelative, LANG_LABELS } from '@/lib/utils'
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
        ? 'bg-[rgba(255,77,77,0.06)] border-signal-red/20'
        : 'bg-lane border-marking hover:border-stripe'
    )}>
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-marking flex items-center justify-center
                      font-display text-sm text-ink-muted flex-shrink-0 border border-stripe">
        🚛
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-ui text-sm font-semibold text-ink truncate">{caller.name}</span>
          <span className="font-ui text-2xs text-ink-dim">{LANG_LABELS[caller.language]}</span>
        </div>
        {caller.location && (
          <p className="font-body text-2xs text-ink-dim truncate">{caller.location}</p>
        )}
        {caller.topic && (
          <p className="font-body text-2xs text-ink-muted italic truncate">"{caller.topic}"</p>
        )}
      </div>

      {/* Status badge */}
      <span className={cn('status-' + caller.status)}>
        {STATUS_LABEL[caller.status]}
      </span>

      {/* Actions */}
      <div className="flex gap-1 flex-shrink-0">
        {caller.status === 'waiting' && (
          <>
            <Button
              size="sm"
              variant="primary"
              onClick={() => updateCallerStatus(caller.id, 'on_air')}
            >
              On Air
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => updateCallerStatus(caller.id, 'dropped')}
            >
              Drop
            </Button>
          </>
        )}
        {caller.status === 'on_air' && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => updateCallerStatus(caller.id, 'done')}
          >
            Done
          </Button>
        )}
      </div>
    </div>
  )
}

function AddCallerForm({ onClose }: { onClose: () => void }) {
  const { addCaller } = useBroadcastStore()
  const [name, setName]       = useState('')
  const [location, setLocation] = useState('')
  const [topic, setTopic]     = useState('')
  const [lang, setLang]       = useState<'en' | 'zu' | 'xh' | 'af'>('en')
  const [saving, setSaving]   = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await addCaller({ name, location, topic, language: lang, status: 'waiting', show_id: null, phone: null })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border-t border-marking p-3 flex flex-col gap-2 bg-lane">
      <span className="panel-title">Add Caller</span>
      <div className="grid grid-cols-2 gap-2">
        <input
          className="input"
          placeholder="Caller name *"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          className="input"
          placeholder="Location (e.g. N3 · Estcourt)"
          value={location}
          onChange={e => setLocation(e.target.value)}
        />
      </div>
      <input
        className="input"
        placeholder="Topic / dedication"
        value={topic}
        onChange={e => setTopic(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <select className="input flex-1" value={lang} onChange={e => setLang(e.target.value as typeof lang)}>
          <option value="en">English</option>
          <option value="zu">isiZulu</option>
          <option value="xh">isiXhosa</option>
          <option value="af">Afrikaans</option>
        </select>
        <Button variant="primary" onClick={handleSubmit} loading={saving}>Add</Button>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  )
}

export function CallQueue() {
  const { callers } = useBroadcastStore()
  const [adding, setAdding] = useState(false)
  const active = callers.filter(c => c.status === 'waiting' || c.status === 'on_air')

  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header">
        <span className="panel-title">Call Queue</span>
        <div className="flex items-center gap-2">
          {active.length > 0 && (
            <span className="font-ui text-2xs text-signal-green font-bold">
              {active.length} Active
            </span>
          )}
          <Button size="sm" variant="ghost" onClick={() => setAdding(a => !a)}>
            {adding ? '✕' : '+ Caller'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
        {active.length === 0 && !adding && (
          <Empty message="No callers in queue" />
        )}
        {active.map(c => <CallerCard key={c.id} caller={c} />)}
      </div>

      {adding && <AddCallerForm onClose={() => setAdding(false)} />}
    </div>
  )
}
