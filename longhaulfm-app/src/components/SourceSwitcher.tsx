// src/components/SourceSwitcher.tsx
import { useBroadcastStore } from '@/stores/broadcastStore'
import { cn } from '@/lib/utils'
import type { BroadcastSource } from '@/types'

const SOURCES: { id: BroadcastSource; icon: string; label: string }[] = [
  { id: 'spotify', icon: '♫',  label: 'Spotify' },
  { id: 'live',    icon: '●',  label: 'Live Studio' },
  { id: 'talk',    icon: '🎙', label: 'Talk / Phones' },
  { id: 'news',    icon: '📰', label: 'News Feed' },
  { id: 'promo',   icon: '📢', label: 'Promo' },
]

const ACTIVE_CLASS: Record<BroadcastSource, string> = {
  spotify: 'border-[#1db954] text-[#1db954] bg-[rgba(29,185,84,0.08)]',
  live:    'border-signal-red text-signal-red bg-[rgba(255,77,77,0.08)]',
  talk:    'border-signal-blue text-signal-blue bg-[rgba(77,166,255,0.08)]',
  news:    'border-signal-yellow text-signal-yellow bg-[rgba(255,209,102,0.08)]',
  promo:   'border-amber text-amber bg-amber-subtle',
  auto:    'border-ink-dim text-ink-dim bg-lane',
}

export function SourceSwitcher() {
  const { state, isSwitching, fadeDuration, setFadeDuration, switchSource } = useBroadcastStore()
  const current = state?.current_source ?? 'spotify'

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Broadcast Source</span>
        <div className="flex items-center gap-2">
          <span className="font-ui text-2xs text-ink-dim uppercase tracking-wider">Fade</span>
          <input
            type="range" min={1} max={10} value={fadeDuration}
            onChange={e => setFadeDuration(Number(e.target.value))}
            className="w-20 h-1 accent-amber cursor-pointer"
          />
          <span className="font-mono text-2xs text-ink-muted w-6">{fadeDuration}s</span>
        </div>
      </div>

      <div className="p-3 flex items-center gap-2 flex-wrap">
        {SOURCES.map(src => {
          const isActive = current === src.id
          return (
            <button
              key={src.id}
              onClick={() => switchSource(src.id)}
              disabled={isSwitching || isActive}
              className={cn(
                'source-btn',
                isActive && ACTIVE_CLASS[src.id],
                isSwitching && !isActive && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span>{src.icon}</span>
              <span>{src.label}</span>
              {isActive && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-current animate-pulse-slow" />
              )}
            </button>
          )
        })}

        {/* Switching indicator */}
        {isSwitching && (
          <div className="flex items-center gap-1.5 text-amber font-ui text-2xs uppercase tracking-wider">
            <div className="w-3 h-3 border border-amber border-t-transparent rounded-full animate-spin" />
            Switching…
          </div>
        )}
      </div>
    </div>
  )
}
