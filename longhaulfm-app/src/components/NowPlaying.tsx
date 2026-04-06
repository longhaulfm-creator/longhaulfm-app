import { useEffect, useRef } from 'react'
import { useBroadcastStore } from '@/stores/broadcastStore'
import { useSpotifyStreaming } from '@/hooks/useSpotifyStreaming'
import { fmtDuration, SOURCE_CONFIG } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function NowPlaying() {
  const { nowPlaying, state, elapsed, tickElapsed } = useBroadcastStore()
  const { playbackState } = useSpotifyStreaming()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (state?.is_on_air && playbackState && !playbackState.paused) {
      timerRef.current = setInterval(tickElapsed, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [tickElapsed, state?.is_on_air, playbackState?.paused])

  const source = nowPlaying?.source ?? 'spotify'
  const srcConfig = SOURCE_CONFIG[source]
  const duration = nowPlaying?.duration_secs ?? 0
  const progress = duration > 0 ? Math.min((elapsed / duration) * 100, 100) : 0
  const isPlaying = state?.is_on_air && playbackState && !playbackState.paused;

  return (
    <div className="panel flex flex-col h-full bg-road/20 overflow-hidden">
      <div className="panel-header border-b border-marking/20 p-3 flex justify-between items-center bg-black/40">
        <span className="panel-title font-ui text-[10px] uppercase tracking-widest text-ink-dim">On Air Monitor</span>
        <div className="flex items-center gap-2" style={{ color: srcConfig.colour }}>
          <span className="font-ui text-[10px] font-bold uppercase tracking-widest">{srcConfig.label}</span>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4 flex-1">
        {/* Artwork */}
        <div className="w-full aspect-square max-h-[280px] md:max-h-none rounded-lg bg-lane overflow-hidden relative mx-auto shadow-2xl border border-marking/30">
          {nowPlaying?.artwork_url ? (
            <img 
              src={nowPlaying.artwork_url} 
              className={cn("w-full h-full object-cover transition-all duration-1000", isPlaying ? "scale-105" : "scale-100 grayscale")} 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-black/40 text-4xl opacity-10">🚛</div>
          )}
        </div>

        {/* Info */}
        <div className="text-center space-y-1">
          <h2 className="font-display text-xl text-white truncate">{nowPlaying?.track_title || "Station Idle"}</h2>
          <p className="font-body text-xs text-spotify uppercase tracking-wider">{nowPlaying?.track_artist || "Long Haul FM"}</p>
        </div>

        {/* Visualizer */}
        <div className="flex items-end gap-0.5 h-10 px-2 mt-auto">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className={cn("flex-1 transition-all duration-500 rounded-full", isPlaying ? "animate-pulse" : "bg-ink-dim/10")}
              style={{
                height: isPlaying ? `${10 + Math.random() * 25}px` : '3px',
                backgroundColor: isPlaying ? srcConfig.colour : undefined
              }}
            />
          ))}
        </div>

        {/* Progress */}
        {duration > 0 && (
          <div className="space-y-1.5">
            <div className="w-full h-1 bg-black/60 rounded-full overflow-hidden">
              <div className="h-full bg-amber transition-all duration-1000" style={{ width: `${progress}%`, backgroundColor: srcConfig.colour }} />
            </div>
            <div className="flex justify-between font-mono text-[9px] text-ink-dim tracking-tighter">
              <span>{fmtDuration(elapsed)}</span>
              <span>{fmtDuration(duration)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}