import { useEffect, useRef, useState, useMemo } from 'react'
import { useBroadcastStore } from '@/stores/broadcastStore'
import { cn } from '@/lib/utils'
import { Play, Pause, Music, RefreshCw } from 'lucide-react'

export function NowPlaying({ player, playbackState }: any) {
  const { currentTrack, isPlaying, elapsed, duration_secs, tickElapsed } = useBroadcastStore()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isStreamPlaying, setIsStreamPlaying] = useState(false)
  const isMaster = !!player

  // Progress Sync
  useEffect(() => {
    if (!isPlaying) return
    const timer = setInterval(() => tickElapsed(), 1000)
    return () => clearInterval(timer)
  }, [isPlaying, tickElapsed])

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return "0:00"
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
  }

  // Use Local Spotify data if Admin, otherwise use Global Synced Store
  const meta = useMemo(() => {
    if (isMaster && playbackState?.track_window?.current_track) {
      const t = playbackState.track_window.current_track
      return {
        title: t.name,
        artist: t.artists[0].name,
        art: t.album.images[0]?.url,
        pos: playbackState.position / 1000,
        dur: playbackState.duration / 1000
      }
    }
    return {
      title: currentTrack?.title || "STATION IDLE",
      artist: currentTrack?.artist || "LONG HAUL FM",
      art: currentTrack?.artwork,
      pos: elapsed,
      dur: duration_secs
    }
  }, [isMaster, playbackState, currentTrack, elapsed, duration_secs])

  return (
    <div className="bg-brand/30 border border-white/5 rounded-lg overflow-hidden shadow-2xl">
      {!isMaster && <audio ref={audioRef} src="https://radio.longhaul-fm.co.za/radio/8000/radio.mp3" crossOrigin="anonymous" />}
      
      <div className="p-1.5 px-4 bg-black/60 border-b border-white/5 flex justify-between items-center">
        <span className="text-[8px] font-black uppercase tracking-widest text-gold">Signal Monitor</span>
        <span className="text-[8px] font-black uppercase text-white/40">{isMaster ? 'MASTER' : 'RELAY'}</span>
      </div>

      <div className="p-4">
        <div className="flex gap-4 items-center mb-4">
          <div className="h-20 w-20 bg-black rounded border border-white/10 overflow-hidden">
            {meta.art ? <img src={meta.art} className="w-full h-full object-cover" /> : <Music className="m-auto mt-6 opacity-10" />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-white font-bold truncate uppercase text-sm">{meta.title}</h2>
            <p className="text-gold/60 text-[10px] font-bold truncate uppercase">{meta.artist}</p>
            <div className="mt-2 text-[10px] font-mono text-gold/80 bg-black/40 px-2 py-0.5 rounded inline-block">
              {formatTime(meta.pos)} / {formatTime(meta.dur)}
            </div>
          </div>
        </div>

        <button 
          onClick={() => {
            if (isMaster) return // Admin controls via BroadcastControls
            if (!audioRef.current) return
            isStreamPlaying ? audioRef.current.pause() : audioRef.current.play()
            setIsStreamPlaying(!isStreamPlaying)
          }}
          className={cn(
            "w-full py-3 rounded font-black uppercase text-[10px] tracking-[0.2em] transition-all",
            (isMaster ? (playbackState && !playbackState.paused) : isStreamPlaying) ? "bg-red-600 text-white" : "bg-gold text-black"
          )}
        >
          {(isMaster ? (playbackState && !playbackState.paused) : isStreamPlaying) ? "Disengage Broadcast" : "Engage Live Link"}
        </button>

        <div className="mt-4 h-1 w-full bg-black/60 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gold transition-all duration-1000 ease-linear" 
            style={{ width: `${(meta.pos / meta.dur) * 100}%` }} 
          />
        </div>
      </div>
    </div>
  )
}