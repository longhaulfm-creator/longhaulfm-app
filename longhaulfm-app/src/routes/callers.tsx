// src/routes/callers.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useBroadcastStore } from '@/stores/broadcastStore'
import { fmtRelative, LANG_LABELS } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Button, Empty } from '@/components/ui'
import type { Caller, CallerStatus, ShowLanguage } from '@/types'

export const Route = createFileRoute('/callers')({
  component: CallersPage,
})

const STATUS_ORDER: CallerStatus[] = ['on_air', 'waiting', 'done', 'dropped']

const STATUS_META: Record<CallerStatus, { label: string; colour: string }> = {
  on_air:  { label: 'On Air',  colour: '#ff4d4d' },
  waiting: { label: 'Waiting', colour: '#f5a623' },
  done:    { label: 'Done',    colour: '#4a5068' },
  dropped: { label: 'Dropped', colour: '#2e3347' },
}

function AddCallerForm({ onClose }: { onClose: () => void }) {
  const { addCaller } = useBroadcastStore()
  const [name,     setName]     = useState('')
  const [phone,    setPhone]    = useState('')
  const [location, setLocation] = useState('')
  const [topic,    setTopic]    = useState('')
  const [lang,     setLang]     = useState<ShowLanguage>('en')
  const [saving,   setSaving]   = useState(false)

  const submit = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await addCaller({ name, phone, location, topic, language: lang, status: 'waiting', show_id: null })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-road border border-amber/20 rounded-md p-4 flex flex-col gap-3 animate-fade-in">
      <h3 className="font-ui text-sm font-bold tracking-wider uppercase text-amber">Add Caller</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="font-ui text-2xs font-bold tracking-widest uppercase text-ink-muted">Name *</label>
          <input className="input" placeholder="Caller's name" value={name} onChange={e => setName(e.target.value)} data-selectable />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-ui text-2xs font-bold tracking-widest uppercase text-ink-muted">Phone</label>
          <input className="input" placeholder="+27 …" value={phone} onChange={e => setPhone(e.target.value)} data-selectable />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-ui text-2xs font-bold tracking-widest uppercase text-ink-muted">Location</label>
          <input className="input" placeholder="e.g. N3 · Estcourt" value={location} onChange={e => setLocation(e.target.value)} data-selectable />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-ui text-2xs font-bold tracking-widest uppercase text-ink-muted">Language</label>
          <select className="input" value={lang} onChange={e => setLang(e.target.value as ShowLanguage)}>
            <option value="en">English</option>
            <option value="zu">isiZulu</option>
            <option value="xh">isiXhosa</option>
            <option value="af">Afrikaans</option>
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="font-ui text-2xs font-bold tracking-widest uppercase text-ink-muted">Topic / Dedication</label>
        <input className="input" placeholder="What's on their mind?" value={topic} onChange={e => setTopic(e.target.value)} data-selectable />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={saving} onClick={submit}>Add to Queue</Button>
      </div>
    </div>
  )
}

function CallerRow({ caller }: { caller: Caller }) {
  const { updateCallerStatus } = useBroadcastStore()
  const meta = STATUS_META[caller.status]

  return (
    <div className={cn(
      'flex items-center gap-4 px-4 py-3 rounded border transition-all',
      caller.status === 'on_air'
        ? 'bg-[rgba(255,77,77,0.06)] border-signal-red/30'
        : caller.status === 'waiting'
        ? 'bg-lane border-marking hover:border-stripe'
        : 'bg-road border-marking opacity-50'
    )}>
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-lane border border-stripe
                      flex items-center justify-center font-display text-lg flex-shrink-0">
        🚛
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className="font-ui text-base font-bold text-ink">{caller.name}</span>
          <span className="font-ui text-2xs text-ink-dim">{LANG_LABELS[caller.language]}</span>
          {caller.status === 'on_air' && (
            <span className="font-ui text-2xs text-signal-red font-bold animate-pulse-slow">● ON AIR</span>
          )}
        </div>
        {caller.location && (
          <p className="font-body text-xs text-ink-muted mt-0.5">{caller.location}</p>
        )}
        {caller.topic && (
          <p className="font-body text-xs text-amber italic mt-0.5">"{caller.topic}"</p>
        )}
        <p className="font-body text-2xs text-ink-dim mt-1">{fmtRelative(caller.queued_at)}</p>
      </div>

      {/* Phone */}
      {caller.phone && (
        <span className="font-mono text-xs text-ink-muted hidden md:block">{caller.phone}</span>
      )}

      {/* Status badge */}
      <span
        className="font-ui text-2xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm border"
        style={{ color: meta.colour, borderColor: meta.colour + '40', background: meta.colour + '12' }}
      >
        {meta.label}
      </span>

      {/* Actions */}
      <div className="flex gap-1.5 flex-shrink-0">
        {caller.status === 'waiting' && (
          <>
            <Button size="sm" variant="primary" onClick={() => updateCallerStatus(caller.id, 'on_air')}>
              On Air
            </Button>
            <Button size="sm" variant="danger" onClick={() => updateCallerStatus(caller.id, 'dropped')}>
              Drop
            </Button>
          </>
        )}
        {caller.status === 'on_air' && (
          <Button size="sm" variant="ghost" onClick={() => updateCallerStatus(caller.id, 'done')}>
            Wrap Up
          </Button>
        )}
      </div>
    </div>
  )
}

function CallersPage() {
  const { callers } = useBroadcastStore()
  const [adding, setAdding] = useState(false)

  const sorted = [...callers].sort((a, b) =>
    STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  )

  const counts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = callers.filter(c => c.status === s).length
    return acc
  }, {} as Record<CallerStatus, number>)

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-hidden animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-display text-3xl tracking-wider text-amber">Call Queue</h1>
          <p className="font-ui text-xs text-ink-dim uppercase tracking-wider mt-0.5">
            Manage live callers and dedications
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Status counts */}
          {STATUS_ORDER.filter(s => counts[s] > 0).map(s => (
            <div key={s} className="text-center">
              <p className="font-display text-2xl leading-none" style={{ color: STATUS_META[s].colour }}>
                {counts[s]}
              </p>
              <p className="font-ui text-2xs text-ink-dim">{STATUS_META[s].label}</p>
            </div>
          ))}
          <Button variant="primary" onClick={() => setAdding(a => !a)}>
            {adding ? '✕ Cancel' : '+ Add Caller'}
          </Button>
        </div>
      </div>

      {adding && <AddCallerForm onClose={() => setAdding(false)} />}

      {/* Caller list */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {sorted.length === 0 && !adding && (
          <Empty message="No callers yet — add one above" />
        )}
        {sorted.map(c => <CallerRow key={c.id} caller={c} />)}
      </div>
    </div>
  )
}
