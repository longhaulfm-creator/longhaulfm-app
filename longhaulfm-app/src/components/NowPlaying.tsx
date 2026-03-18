// src/components/NowPlaying.tsx
import { useEffect, useRef } from 'react'
import { useBroadcastStore } from '@/stores/broadcastStore'
import { fmtDuration, SOURCE_CONFIG } from '@/lib/utils'
import { cn } from '@/lib/utils'

const BAR_COUNT = 40

export function NowPlaying() {
  const { nowPlaying, state, elapsed, tickElapsed } = useBroadcastStore()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Local elapsed ticker
  useEffect(() => {
    timerRef.current = setInterval(tickElapsed, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [tickElapsed])

  const source     = nowPlaying?.source ?? 'spotify'
  const srcConfig  = SOURCE_CONFIG[source]
  const duration   = nowPlaying?.duration_secs ?? 0
  const progress   = duration > 0 ? Math.min((elapsed / duration) * 100, 100) : 0
  const isLive     = source === 'live' || source === 'talk'

  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header">
        <span className="panel-title">Now Playing</span>
        <span
          className="font-ui text-2xs font-bold tracking-widest uppercase"
          style={{ color: srcConfig.colour }}
        >
          {srcConfig.icon} {srcConfig.label}
        </span>
      </div>

      <div className="p-3 flex flex-col gap-3 flex-1">
        {/* Artwork / placeholder */}
        <div className="w-full aspect-square rounded bg-lane overflow-hidden flex-shrink-0 relative">
          {nowPlaying?.artwork_url ? (
            <img
              src={nowPlaying.artwork_url}
              alt={nowPlaying.track_title ?? ''}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <span className="text-4xl opacity-30">
                {isLive ? '🎙' : '♫'}
              </span>
              {isLive && state?.is_on_air && (
                <span className="font-ui text-2xs text-signal-red uppercase tracking-widest animate-pulse-slow">
                  ● Broadcasting
                </span>
              )}
            </div>
          )}

          {/* Live overlay badge */}
          {isLive && (
            <div className="absolute top-2 left-2">
              <span className="badge badge-live">● Live</span>
            </div>
          )}
        </div>

        {/* Track info */}
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="font-ui text-base font-bold text-ink leading-tight truncate">
            {nowPlaying?.track_title ?? (isLive ? 'Live Broadcast' : '—')}
          </p>
          <p className="font-body text-xs text-ink-muted truncate">
            {nowPlaying?.track_artist ?? ''}
          </p>
        </div>

        {/* Waveform */}
        <div className="flex items-end gap-0.5 h-8">
          {Array.from({ length: BAR_COUNT }).map((_, i) => {
            const h = 20 + Math.sin(i * 0.8) * 12 + Math.sin(i * 1.7) * 6
            const dur = (0.5 + (i % 7) * 0.08).toFixed(2)
            const delay = (i * 0.02).toFixed(2)
            return (
              <div
                key={i}
                className="wave-bar flex-1"
                style={{
                  height: `${h}px`,
                  '--dur':   `${dur}s`,
                  '--delay': `${delay}s`,
                  animationPlayState: state?.is_on_air ? 'running' : 'paused',
                } as React.CSSProperties}
              />
            )
          })}
        </div>

        {/* Progress bar */}
        {!isLive && duration > 0 && (
          <div className="flex flex-col gap-1">
            <div className="w-full h-0.5 bg-marking rounded-full relative overflow-visible">
              <div
                className="h-full bg-amber rounded-full transition-all duration-1000 relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber" />
              </div>
            </div>
            <div className="flex justify-between font-mono text-2xs text-ink-dim">
              <span>{fmtDuration(elapsed)}</span>
              <span>{fmtDuration(duration)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
