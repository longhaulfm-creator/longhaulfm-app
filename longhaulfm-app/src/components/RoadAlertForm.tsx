// src/components/RoadAlertForm.tsx
import { useState } from 'react'
import { useAlertStore } from '@/stores/alertStore'
import { ALERT_ICONS, fmtRelative } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Button, Empty, Spinner } from '@/components/ui'
import type { AlertCategory, AlertSeverity } from '@/types'

const CATEGORIES: { id: AlertCategory; label: string }[] = [
  { id: 'incident',    label: 'Incident'    },
  { id: 'roadworks',  label: 'Roadworks'   },
  { id: 'weather',    label: 'Weather'     },
  { id: 'weighbridge', label: 'Weighbridge' },
  { id: 'fuel',       label: 'Fuel'        },
  { id: 'closure',    label: 'Closure'     },
]

const SEVERITY_CLASSES: Record<AlertSeverity, string> = {
  critical: 'border-signal-red text-signal-red',
  warning:  'border-signal-yellow text-signal-yellow',
  info:     'border-signal-blue text-signal-blue',
}

export function RoadAlerts() {
  const { alerts, isLoading, addAlert, deactivateAlert } = useAlertStore()
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [route,    setRoute]    = useState('')
  const [detail,   setDetail]   = useState('')
  const [category, setCategory] = useState<AlertCategory>('incident')
  const [severity, setSeverity] = useState<AlertSeverity>('warning')
  const [saving,   setSaving]   = useState(false)

  const handleSubmit = async () => {
    if (!route.trim() || !detail.trim()) return
    setSaving(true)
    try {
      await addAlert({ route, detail, category, severity })
      setRoute(''); setDetail(''); setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header">
        <span className="panel-title">Road Alerts — KZN</span>
        <Button size="sm" variant="ghost" onClick={() => setShowForm(f => !f)}>
          {showForm ? '✕' : '+ Alert'}
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="border-b border-marking p-3 bg-lane flex flex-col gap-2 animate-fade-in">
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input"
              placeholder="Route (e.g. N3 · KM 447)"
              value={route}
              onChange={e => setRoute(e.target.value)}
            />
            <select
              className="input"
              value={category}
              onChange={e => setCategory(e.target.value as AlertCategory)}
            >
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{ALERT_ICONS[c.id]} {c.label}</option>
              ))}
            </select>
          </div>
          <textarea
            className="input resize-none"
            rows={2}
            placeholder="Alert details…"
            value={detail}
            onChange={e => setDetail(e.target.value)}
            data-selectable
          />
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {(['info', 'warning', 'critical'] as AlertSeverity[]).map(s => (
                <button
                  key={s}
                  onClick={() => setSeverity(s)}
                  className={cn(
                    'px-2.5 py-1 rounded-sm border font-ui text-2xs font-bold uppercase tracking-wider transition-colors',
                    severity === s
                      ? SEVERITY_CLASSES[s] + ' bg-current/10'
                      : 'border-marking text-ink-dim hover:border-stripe'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <Button variant="primary" onClick={handleSubmit} loading={saving}>
              Broadcast Alert
            </Button>
          </div>
        </div>
      )}

      {/* Alert list */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
        {isLoading && <div className="flex justify-center py-4"><Spinner /></div>}
        {!isLoading && alerts.length === 0 && (
          <Empty message="No active alerts" />
        )}

        {alerts.map(alert => (
          <div
            key={alert.id}
            className={cn(
              'flex gap-2.5 p-2.5 rounded border bg-lane',
              alert.severity === 'critical' && 'border-signal-red/30 bg-[rgba(255,77,77,0.04)]',
              alert.severity === 'warning'  && 'border-signal-yellow/30',
              alert.severity === 'info'     && 'border-marking',
            )}
          >
            <span className={cn('text-base flex-shrink-0 mt-0.5', `severity-${alert.severity}`)}>
              {ALERT_ICONS[alert.category]}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-display text-base tracking-wide text-amber">
                  {alert.route}
                </span>
                <span className={cn('font-ui text-2xs font-bold uppercase tracking-wider', `severity-${alert.severity}`)}>
                  {alert.severity}
                </span>
              </div>
              <p className="font-body text-xs text-ink-muted leading-snug">{alert.detail}</p>
              <p className="font-body text-2xs text-ink-dim mt-1">{fmtRelative(alert.created_at)}</p>
            </div>
            <button
              onClick={() => deactivateAlert(alert.id)}
              className="text-ink-dim hover:text-signal-red transition-colors text-xs flex-shrink-0"
              title="Clear alert"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
