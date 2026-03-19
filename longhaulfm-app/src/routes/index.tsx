// src/routes/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { SourceSwitcher } from '@/components/SourceSwitcher'
import { NowPlaying }     from '@/components/NowPlaying'
import { ScheduleGrid }   from '@/components/ScheduleGrid'
import { CallQueue }      from '@/components/CallQueue'
import { PromoPanel }     from '@/components/PromoPanel'
import { RoadAlerts }     from '@/components/RoadAlertForm'
import { useBroadcastStore } from '@/stores/broadcastStore'
import { fmtZAR }         from '@/lib/utils'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function StatPill({ label, value, colour }: { label: string; value: string; colour?: string }) {
  return (
    <div className="bg-road border border-marking rounded px-3 py-2 flex flex-col gap-0.5">
      <span className="font-ui text-2xs font-bold tracking-widest uppercase text-ink-dim">{label}</span>
      <span className="font-display text-2xl tracking-wide" style={{ color: colour ?? '#e8eaf0' }}>
        {value}
      </span>
    </div>
  )
}

function Dashboard() {
  const { state } = useBroadcastStore()

  return (
    <div className="h-full flex flex-col gap-2 p-3 overflow-hidden animate-fade-in">

      {/* ── Row 1: Source Switcher ── */}
      <SourceSwitcher />

      {/* ── Row 2: Stats pills ── */}
      <div className="grid grid-cols-4 gap-2 flex-shrink-0">
        <StatPill
          label="Live Listeners"
          value={(state?.listener_count ?? 0).toLocaleString()}
          colour="#39d98a"
        />
        <StatPill
          label="Source"
          value={(state?.current_source ?? '—').toUpperCase()}
          colour="#f5a623"
        />
        <StatPill
          label="On Air"
          value={state?.is_on_air ? 'YES' : 'OFF'}
          colour={state?.is_on_air ? '#39d98a' : '#ff4d4d'}
        />
        <StatPill
          label="Station"
          value="Long Haul FM"
        />
      </div>

      {/* ── Row 3: Main content grid ── */}
      <div className="flex-1 grid grid-cols-[220px_1fr_220px] grid-rows-[1fr_1fr] gap-2 overflow-hidden">

        {/* Now Playing — spans 2 rows left column */}
        <div className="row-span-2 overflow-hidden">
          <NowPlaying />
        </div>

        {/* Schedule — top centre */}
        <div className="overflow-hidden">
          <ScheduleGrid />
        </div>

        {/* Road Alerts — top right */}
        <div className="overflow-hidden">
          <RoadAlerts />
        </div>

        {/* Call Queue — bottom centre */}
        <div className="overflow-hidden">
          <CallQueue />
        </div>

        {/* Promo Panel — bottom right */}
        <div className="overflow-hidden">
          <PromoPanel />
        </div>
      </div>
    </div>
  )
}
