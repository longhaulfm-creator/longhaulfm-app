import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { SourceSwitcher } from '@/components/SourceSwitcher'
import { NowPlaying } from '@/components/NowPlaying'
import { ScheduleGrid } from '@/components/ScheduleGrid'
import { CallQueue } from '@/components/CallQueue'
import { PromoPanel } from '@/components/PromoPanel'
import { RoadAlerts } from '@/components/RoadAlertForm'
import { BroadcastControls } from '@/components/BroadcastControls'
import { useBroadcastStore } from '@/stores/broadcastStore'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function StatPill({ label, value, colour }: { label: string; value: string; colour?: string }) {
  return (
    <div className="bg-road border border-marking rounded px-3 py-2 flex flex-col gap-0.5 min-w-0">
      <span className="font-ui text-[8px] md:text-2xs font-bold tracking-widest uppercase text-ink-dim truncate">{label}</span>
      <span className="font-display text-lg md:text-2xl tracking-wide truncate" style={{ color: colour ?? '#e8eaf0' }}>{value}</span>
    </div>
  )
}

function Dashboard() {
  const { state, fetchInitial, subscribeRealtime } = useBroadcastStore()

  useEffect(() => {
    fetchInitial()
    const unsub = subscribeRealtime()
    return () => unsub()
  }, [])

  return (
    <div className="h-full flex flex-col gap-2 p-2 md:p-3 overflow-hidden animate-fade-in bg-black">
      <SourceSwitcher />

      {/* Stats Bar: 2x2 on mobile, 4x1 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-shrink-0">
        <StatPill label="Live Listeners" value={(state?.listener_count ?? 0).toLocaleString()} colour="#39d98a" />
        <StatPill label="Source" value={(state?.current_source ?? '—').toUpperCase()} colour="#f5a623" />
        <StatPill label="On Air" value={state?.is_on_air ? 'YES' : 'OFF'} colour={state?.is_on_air ? '#39d98a' : '#ff4d4d'} />
        <StatPill label="Station" value="Long Haul FM" />
      </div>

      {/* Main Content: Scrollable on mobile, Grid on desktop */}
      <div className="flex-1 overflow-y-auto md:overflow-hidden">
        <div className="flex flex-col md:grid md:grid-cols-[220px_1fr_220px] md:grid-rows-[1fr_1fr] gap-2 h-full">
          
          {/* Now Playing: Top on mobile, Left Sidebar on desktop */}
          <div className="md:row-span-2 min-h-[300px] md:min-h-0 bg-road/50 rounded-lg">
            <NowPlaying />
          </div>

          {/* Other Panels */}
          <div className="min-h-[200px] md:min-h-0 bg-road/50 rounded-lg"><ScheduleGrid /></div>
          <div className="min-h-[200px] md:min-h-0 bg-road/50 rounded-lg"><RoadAlerts /></div>
          <div className="min-h-[200px] md:min-h-0 bg-road/50 rounded-lg"><CallQueue /></div>
          <div className="min-h-[200px] md:min-h-0 bg-road/50 rounded-lg"><PromoPanel /></div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex-shrink-0 pt-1">
        <BroadcastControls />
      </div>
    </div>
  )
}