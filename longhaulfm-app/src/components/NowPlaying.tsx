import { useEffect } from 'react'
import { useBroadcastStore } from '@/stores/broadcastStore'
import { useRadioStation } from '@/hooks/useRadioStation'
import { fmtDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Play, Pause, Music, ShieldAlert } from 'lucide-react'

interface Props {
  player: any
  playbackState: any
  togglePlay?: () => void
  isReady: boolean
}

export function NowPlaying({ player, playbackState, togglePlay, isReady }: Props) {
  const { currentTrack, elapsed, duration_secs, tickElapsed, systemKill } = useBroadcastStore()
  const { isDucked } = useRadioStation()

  useEffect(() => {
    const isPlaying = !!(playbackState && !playbackState.paused);
    if (!isPlaying) return;
    const timer = setInterval(() => { tickElapsed(); }, 1000);
    return () => clearInterval(timer);
  }, [playbackState?.paused, tickElapsed]);

  useEffect(() => {
    if (systemKill && player && playbackState && !playbackState.paused) {
      player.pause().catch((err: any) => console.error("Kill signal failed:", err));
    }
  }, [systemKill, player, playbackState]);

  const isLocalPlaying = !!(playbackState && !playbackState.paused);
  
  const trackTitle = playbackState?.track_window?.current_track?.name || currentTrack?.title || "STATION IDLE";
  const trackArtist = Array.isArray(currentTrack?.artists) 
    ? currentTrack.artists.join(', ') 
    : (playbackState?.track_window?.current_track?.artists?.[0]?.name || "LONG HAUL RADIO");
  const artworkUrl = playbackState?.track_window?.current_track?.album?.images?.[0]?.url || currentTrack?.artwork;
  
  const rawDuration = duration_secs || (playbackState?.duration ? Math.floor(playbackState.duration / 1000) : 0);
  const safeElapsed = Number(elapsed) || 0;
  const safeDuration = Number(rawDuration) || 0;
  const progress = safeDuration > 0 ? Math.min((safeElapsed / safeDuration) * 100, 100) : 0;

  return (
    <div className="flex flex-col bg-brand/30 overflow-hidden relative border border-white/5 shadow-2xl rounded-lg shrink-0">
      <div className="py-1 px-4 shrink-0 flex justify-between bg-black/40 border-b border-white/5">
        <span className="font-header text-[9px] tracking-widest text-gold uppercase font-bold">Signal Monitor</span>
        <span className={cn(
          "font-ui text-[9px] font-bold uppercase tracking-widest",
          systemKill ? "text-red-500 animate-pulse" : "text-white/20"
        )}>
          {systemKill ? 'SYSTEM KILLED' : isReady ? 'Engine Ready' : 'Syncing...'}
        </span>
      </div>

      <div className="flex flex-col p-4">
        <div className="flex gap-4 items-center mb-4">
          <div className="h-20 w-20 shrink-0 rounded bg-black/60 border border-gold/20 overflow-hidden relative shadow-lg">
            <div className="absolute inset-0 z-10 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
            {artworkUrl ? (
              <img src={artworkUrl} className={cn("w-full h-full object-cover transition-all", (!isLocalPlaying || systemKill) && "grayscale opacity-30")} />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><Music size={16} className="text-gold/10" /></div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="font-header text-base text-white truncate uppercase leading-tight">
              {systemKill ? "STATION SILENCED" : trackTitle}
            </h2>
            <p className="font-ui text-gold uppercase tracking-[0.2em] text-[8px] mt-1 font-bold opacity-80 truncate">
              {systemKill ? "ADMIN OVERRIDE ACTIVE" : trackArtist}
            </p>
            {isDucked && !systemKill && (
              <div className="flex items-center gap-0.5 h-3 mt-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-0.5 bg-gold animate-bounce" style={{ height: '100%', animationDuration: `${0.3 + (i * 0.1)}s` }} />
                ))}
                <span className="text-[7px] text-gold ml-1 font-bold tracking-tighter">VOICE OVERRIDE</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <button 
            onClick={() => !systemKill && togglePlay?.()}
            disabled={systemKill || !isReady}
            className={cn(
              "w-full h-10 flex gap-2 items-center justify-center font-header text-[10px] rounded border-b-2 transition-all active:translate-y-0.5 shadow-lg uppercase tracking-widest", 
              systemKill ? "bg-zinc-900 text-red-600 border-red-900 cursor-not-allowed" :
              !isReady ? "bg-white/5 text-white/10" : 
              isLocalPlaying ? "bg-signal-red text-white border-red-900" : "bg-gold text-brand-dark border-amber-700"
            )}
          >
            {systemKill ? <><ShieldAlert size={12} /> SYSTEM LOCKED</> : isLocalPlaying ? <><Pause size={12} fill="currentColor" /> Pause Stream</> : <><Play size={12} fill="currentColor" /> Engage Live</>}
          </button>

          <div className="w-full space-y-1">
            <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden relative border border-white/5">
              <div className="absolute top-0 left-0 h-full bg-gold transition-all duration-1000 ease-linear" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between font-mono text-[8px] text-white/40 tracking-tighter tabular-nums">
              <span>{fmtDuration(safeElapsed)}</span>
              <span>{fmtDuration(safeDuration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}