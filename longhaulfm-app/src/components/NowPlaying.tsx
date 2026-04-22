import { useEffect, useRef, useState } from 'react'
import { useBroadcastStore } from '@/stores/broadcastStore'
import { useRadioStation } from '@/hooks/useRadioStation'
import { cn } from '@/lib/utils'
import { Play, Pause, Music, Clock, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Props {
  player: any
  playbackState: any
  togglePlay?: (shouldPlay: boolean) => void 
  isReady: boolean
}

export function NowPlaying({ player, playbackState, togglePlay, isReady }: Props) {
  const { currentTrack, isPlaying, elapsed, duration_secs, tickElapsed, systemKill } = useBroadcastStore()
  const { isDucked } = useRadioStation()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isStreamPlaying, setIsStreamPlaying] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    const shouldTick = !!(playbackState && !playbackState.paused) || isPlaying;
    if (!shouldTick || systemKill) return;
    const timer = setInterval(() => { tickElapsed(); }, 1000);
    return () => clearInterval(timer);
  }, [playbackState?.paused, isPlaying, systemKill, tickElapsed]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isDucked ? 0.2 : 1.0;
  }, [isDucked]);

  const isSpotifyActive = !!(playbackState && !playbackState.paused);
  const isLocalPlaying = player ? isSpotifyActive : isStreamPlaying;

  const handleEngageClick = async () => {
    if (systemKill || isSyncing) return;
    setIsSyncing(true);
    const activating = !isLocalPlaying;

    try {
      await supabase.functions.invoke('spotify-sync', {
        body: { action: activating ? 'engage' : 'disengage' }
      });

      if (player) {
        if (togglePlay && isReady) await togglePlay(activating);
      } else {
        if (audioRef.current) {
          activating ? await audioRef.current.play() : audioRef.current.pause();
          setIsStreamPlaying(activating);
        }
      }
    } catch (err) {
      console.error("Broadcast Sync Failed:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  /** * FAIL-SAFE METADATA MAPPING
   * This ensures that no matter where the data comes from (SDK vs DB), 
   * the Anonymous UI can actually render it.
   */
  const trackTitle = playbackState?.track_window?.current_track?.name 
    || currentTrack?.title 
    || currentTrack?.name 
    || "STATION IDLE";

  const artistName = playbackState?.track_window?.current_track?.artists?.[0]?.name 
    || currentTrack?.artist 
    || (Array.isArray(currentTrack?.artists) ? currentTrack?.artists[0]?.name : currentTrack?.artists)
    || "Unknown Artist";

  const artworkUrl = playbackState?.track_window?.current_track?.album?.images?.[0]?.url 
    || currentTrack?.artwork 
    || currentTrack?.album_art;
  
  // Progress Logic
  const currentPos = player ? (playbackState?.position / 1000 || elapsed) : elapsed;
  const totalDuration = player ? (playbackState?.duration / 1000 || duration_secs) : duration_secs;
  const progressPercent = totalDuration > 0 ? Math.min((currentPos / totalDuration) * 100, 100) : 0;

  return (
    <div className="flex flex-col bg-brand/30 overflow-hidden relative border border-white/5 shadow-2xl rounded-lg shrink-0">
      {!player && (
        <audio 
          ref={audioRef} 
          src="https://radio.longhaul-fm.co.za/radio/8000/radio.mp3" 
          preload="auto" 
          crossOrigin="anonymous" 
          playsInline 
        />
      )}

      {/* Signal Status Bar */}
      <div className="py-1 px-4 flex justify-between bg-black/40 border-b border-white/5">
        <div className="flex items-center gap-2">
           <div className={cn("w-1.5 h-1.5 rounded-full", (isLocalPlaying || isPlaying) ? "bg-green-500 animate-pulse" : "bg-white/20")} />
           <span className="font-header text-[9px] tracking-widest text-gold uppercase font-bold">Signal Monitor</span>
        </div>
        <span className={cn("text-[9px] font-bold uppercase", systemKill ? "text-red-500" : (isLocalPlaying || isPlaying) ? "text-green-400" : "text-white/20")}>
          {player ? 'MASTER LINK' : 'RELAY LINK'}
        </span>
      </div>

      <div className="p-4">
        <div className="flex gap-4 items-center mb-4">
          {/* Album Art */}
          <div className="h-20 w-20 rounded bg-black/60 border border-gold/20 overflow-hidden shadow-lg relative">
            {artworkUrl ? (
              <img 
                src={artworkUrl} 
                alt="Art" 
                className={cn("w-full h-full object-cover", (!isLocalPlaying && !isPlaying || systemKill) && "grayscale opacity-30")} 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music size={16} className="text-gold/10" />
              </div>
            )}
          </div>

          {/* Track Info */}
          <div className="min-w-0 flex-1">
            <h2 className="font-header text-sm text-white truncate uppercase tracking-tight leading-tight">
              {trackTitle}
            </h2>
            <p className="text-[10px] text-gold/60 truncate uppercase font-bold tracking-tighter mb-1">
              {artistName}
            </p>
            <div className="flex items-center gap-2 mt-1">
               <Clock size={10} className="text-gold/50" />
               <span className="font-mono text-[10px] text-gold/80">
                 {formatTime(currentPos)} / {formatTime(totalDuration)}
               </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={handleEngageClick}
          disabled={(player && !isReady) || isSyncing}
          className={cn(
            "w-full h-10 flex gap-2 items-center justify-center font-header text-[10px] rounded border-b-2 transition-all active:translate-y-0.5 uppercase tracking-widest font-bold", 
            isLocalPlaying ? "bg-signal-red text-white border-red-900" : "bg-gold text-brand-dark border-amber-700",
            isSyncing && "opacity-70 animate-pulse cursor-wait"
          )}
        >
          {isSyncing ? (
            <><RefreshCw size={12} className="animate-spin" /> Syncing...</>
          ) : isLocalPlaying ? (
            <><Pause size={12} /> Disengage</>
          ) : (
            <><Play size={12} /> Engage Live</>
          )}
        </button>

        {/* Progress Bar */}
        <div className="mt-4 relative w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full bg-gold transition-all duration-1000 ease-linear shadow-[0_0_8px_#FFD700]" 
            style={{ width: `${progressPercent}%` }} 
          />
        </div>
      </div>
    </div>
  )
}