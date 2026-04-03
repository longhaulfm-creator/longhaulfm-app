// src/components/ScheduleGrid.tsx
import { useEffect } from 'react'
import { useScheduleStore } from '@/stores/scheduleStore'
import { fmtTime, SOURCE_CONFIG, LANG_LABELS } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Spinner, Empty } from '@/components/ui'
import type { ScheduleSlot } from '@/types'

const SOURCE_BADGE_CLASS: Record<string, string> = {
  spotify: 'badge-spotify',
  live:    'badge-live',
  talk:    'badge-talk',
  news:    'badge-news',
  promo:   'badge-promo',
  auto:    'badge-auto',
}

function SlotRow({ slot, isCurrent }: { slot: ScheduleSlot; isCurrent: boolean }) {
  const src = SOURCE_CONFIG[slot.source]
  return (
    <div className={cn(
      'flex items-center gap-3 px-3 py-2.5 rounded transition-colors',
      isCurrent
        ? 'bg-amber-subtle border border-amber/20'
        : 'bg-lane hover:bg-marking'
    )}>
      <span className={cn(
        'font-display text-lg tracking-wide w-12 flex-shrink-0',
        isCurrent ? 'text-amber' : 'text-ink-muted'
      )}>
        {fmtTime(slot.start_time)}
      </span>

      <div className="flex-1 min-w-0">
        <p className={cn('font-ui text-sm font-semibold leading-tight truncate',
          isCurrent ? 'text-ink' : 'text-ink-muted'
        )}>
          {slot.show?.name ?? 'Unnamed Show'}
        </p>
        <p className="font-body text-2xs text-ink-dim mt-0.5">
          {LANG_LABELS[slot.show?.language ?? 'en']} · {fmtTime(slot.end_time)}
        </p>
      </div>

      <span className={cn('badge', SOURCE_BADGE_CLASS[slot.source])}>
        {src.icon} {src.label}
      </span>

      {isCurrent && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse-slow flex-shrink-0" />
      )}
    </div>
  )
}

export function ScheduleGrid() {
  const { slots, currentSlot, nextSlot, isLoading, fetchToday } = useScheduleStore()

  useEffect(() => { fetchToday() }, [fetchToday])

  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header">
        <span className="panel-title">Today's Schedule</span>
        {nextSlot && (
          <span className="font-ui text-2xs text-ink-dim">
            Next: {nextSlot.show?.name} @ {fmtTime(nextSlot.start_time)}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {isLoading && (
          <div className="flex justify-center py-6"><Spinner /></div>
        )}
        {!isLoading && slots.length === 0 && (
          <Empty message="No shows scheduled today" />
        )}
        {slots.map(slot => (
          <SlotRow
            key={slot.id}
            slot={slot}
            isCurrent={currentSlot?.id === slot.id}
          />
        ))}
      </div>
    </div>
  )
}
