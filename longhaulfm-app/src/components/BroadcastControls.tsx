import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useBroadcastStore } from '@/stores/broadcastStore'
import { useRadioStation } from '@/hooks/useRadioStation'
import { supabase } from '@/lib/supabase'
import { ably } from '@/lib/ably'
import { Power, Mic, ShieldAlert } from 'lucide-react'

interface Props { player: any; userRole: string }

export const BroadcastControls: React.FC<Props> = ({ player, userRole }) => {
  const isPlaying = useBroadcastStore((s) => s.isPlaying)
  const micAllowed = useBroadcastStore((s) => s.micAllowed)
  const systemKill = useBroadcastStore((s) => s.systemKill)
  
  const { toggleStream, broadcastTrack } = useRadioStation(); 
  const pressStartTime = useRef<number>(0)
  const [isSpaceDown, setIsSpaceDown] = useState(false)

  const updateBroadcast = useCallback(async (active: boolean) => {
    if (!player || (!micAllowed && active) || (systemKill && active)) return 

    // 1. Toggle the Master Stream to Johannesburg
    toggleStream(active);

    // 2. Publish Ducking to Ably (Updates Trust's Spotify volume & Listener UI)
    const channel = ably.channels.get('longhaul-live-sync')
    await channel.publish('ducking', { ducked: active })
    
    // 3. METADATA BROADCAST: Send current track info to all listeners
    if (active) {
      const state = await player.getCurrentState();
      if (state?.track_window?.current_track) {
        broadcastTrack(
          state.track_window.current_track.uri,
          state.position || 0
        );
      }
    }

    // 4. Update Supabase state
    await supabase.from('broadcast_state').update({ is_playing: active }).eq('id', 1)
  }, [player, micAllowed, systemKill, toggleStream, broadcastTrack])

  const handleEngage = () => {
    if (!micAllowed || systemKill) return
    pressStartTime.current = Date.now()
    updateBroadcast(!isPlaying)
  }

  const handleRelease = () => {
    if (pressStartTime.current === 0) return
    const pressDuration = Date.now() - pressStartTime.current
    if (pressDuration > 250) {
      updateBroadcast(false); // PTT Behavior
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpaceDown && micAllowed && !systemKill) {
        if (!(['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || ''))) {
          e.preventDefault();
          setIsSpaceDown(true);
          handleEngage();
        }
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpaceDown(false);
        handleRelease();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    }
  }, [isSpaceDown, micAllowed, systemKill, isPlaying, updateBroadcast])

  return (
    <div className="flex gap-2 h-14 select-none">
      <button 
        onClick={() => player?.disconnect()} 
        className="flex flex-col items-center justify-center gap-0.5 px-3 bg-black/40 border border-red-500/30 rounded hover:bg-red-500/10 transition-all shrink-0"
      >
        <Power size={16} className="text-red-500/70" />
        <span className="text-[7px] uppercase tracking-[0.1em] text-red-500/80 font-bold">Standby</span>
      </button>

      <button 
        onMouseDown={handleEngage} 
        onMouseUp={handleRelease}
        onMouseLeave={() => isPlaying && handleRelease()}
        disabled={!micAllowed || systemKill}
        className={`flex-1 transition-all rounded border flex items-center justify-center gap-3 px-4
          ${(!micAllowed || systemKill)
            ? 'bg-zinc-900 border-red-900/50 cursor-not-allowed opacity-60' 
            : isPlaying 
              ? 'bg-red-600 border-white shadow-[0_0_20px_rgba(255,0,0,0.3)]' 
              : 'bg-black/60 border-white/20 hover:border-amber-500/50'
          }`}
      >
        {(!micAllowed || systemKill) ? (
          <ShieldAlert size={20} className="text-red-600 animate-pulse" />
        ) : (
          <Mic size={20} className={isPlaying ? "text-white animate-pulse" : "text-amber-500/50"} />
        )}
        <span className="font-header text-xs tracking-[0.2em] uppercase font-bold text-white">
          {systemKill ? 'SYSTEM KILLED' : !micAllowed ? 'MIC MUZZLED' : isPlaying ? 'On-Air // Broadcasting' : 'Push to Speak'}
        </span>
      </button>
    </div>
  )
}