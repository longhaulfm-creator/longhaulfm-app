// src/routes/schedule.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useScheduleStore } from '@/stores/scheduleStore'
import { fmtTime, SOURCE_CONFIG, LANG_LABELS, DAYS_FULL } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Badge, Spinner, Empty } from '@/components/ui'
import type { ScheduleSlot } from '@/types'

export const Route = createFileRoute('/schedule')({
  component: SchedulePage,
})

function SchedulePage() {
  const { slots, currentSlot, nextSlot, isLoading, fetchToday } = useScheduleStore()
  const today = new Date().getDay()

  useEffect(() => { fetchToday() }, [fetchToday])

  const src = (slot: ScheduleSlot) => SOURCE_CONFIG[slot.source]

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-hidden animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-display text-3xl tracking-wider text-amber">
            {DAYS_FULL[today]}'s Schedule
          </h1>
          <p className="font-ui text-xs text-ink-dim uppercase tracking-wider mt-0.5">
            Long Haul FM · KwaZulu-Natal
          </p>
        </div>
        {nextSlot && (
          <div className="text-right">
            <p className="font-ui text-2xs text-ink-dim uppercase tracking-wider">Up Next</p>
            <p className="font-ui text-sm font-bold text-ink">{nextSlot.show?.name}</p>
            <p className="font-display text-xl text-amber">{fmtTime(nextSlot.start_time)}</p>
          </div>
        )}
      </div>

      {/* Schedule table */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && <div className="flex justify-center py-12"><Spinner /></div>}
        {!isLoading && slots.length === 0 && (
          <Empty message="No shows scheduled for today" />
        )}

        <div className="flex flex-col gap-1.5">
          {slots.map(slot => {
            const isCurrent = currentSlot?.id === slot.id
            const config    = src(slot)
            return (
              <div
                key={slot.id}
                className={cn(
                  'grid grid-cols-[80px_1fr_160px_120px] items-center gap-4',
                  'px-4 py-3 rounded border transition-all',
                  isCurrent
                    ? 'bg-amber-subtle border-amber/30 shadow-amber'
                    : 'bg-road border-marking hover:border-stripe hover:bg-lane'
                )}
              >
                {/* Time */}
                <div className="flex flex-col">
                  <span className={cn(
                    'font-display text-2xl tracking-wide leading-none',
                    isCurrent ? 'text-amber' : 'text-ink-muted'
                  )}>
                    {fmtTime(slot.start_time)}
                  </span>
                  <span className="font-ui text-2xs text-ink-dim">
                    → {fmtTime(slot.end_time)}
                  </span>
                </div>

                {/* Show info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      'font-ui text-base font-bold truncate',
                      isCurrent ? 'text-ink' : 'text-ink-muted'
                    )}>
                      {slot.show?.name ?? 'Unnamed Show'}
                    </p>
                    {isCurrent && (
                      <span className="w-2 h-2 rounded-full bg-signal-green animate-pulse-slow flex-shrink-0" />
                    )}
                  </div>
                  {slot.show?.description && (
                    <p className="font-body text-xs text-ink-dim truncate mt-0.5">
                      {slot.show.description}
                    </p>
                  )}
                  {slot.notes && (
                    <p className="font-body text-2xs text-ink-dim italic mt-0.5">{slot.notes}</p>
                  )}
                </div>

                {/* Language */}
                <span className="font-ui text-sm text-ink-muted">
                  {LANG_LABELS[slot.show?.language ?? 'en']}
                </span>

                {/* Source */}
                <span
                  className="font-ui text-xs font-bold uppercase tracking-wider"
                  style={{ color: config.colour }}
                >
                  {config.icon} {config.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
