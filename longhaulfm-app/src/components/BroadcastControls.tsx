import React, { useState, useEffect, useCallback } from 'react'
import { useBroadcastStore } from '@/stores/broadcastStore'
import { useAuthStore } from '@/stores/authStore'
import { useRadioStation } from '@/hooks/useRadioStation'
import { useSpotifyToken } from '@/hooks/useSpotifyToken'
import { supabase } from '@/lib/supabase'
import { ably } from '@/lib/ably'
import { Mic, ShieldAlert } from 'lucide-react'

interface Props { 
  player: any; 
  userRole?: string; 
  deviceId?: string | null 
}

export const BroadcastControls: React.FC<Props> = ({ player }) => {
  // Use stable selectors for store values
  const isPlaying = useBroadcastStore((s) => s.isPlaying);
  const setIsPlaying = useBroadcastStore((s) => s.setIsPlaying);
  
  const { profile } = useAuthStore();
  const { toggleMicHardware } = useRadioStation(); 
  const { takeControlAsDJ, token } = useSpotifyToken();

  const [hasAuthority, setHasAuthority] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isSpaceDown, setIsSpaceDown] = useState(false);

  const canBroadcast = profile?.role === 'admin' || profile?.role === 'dj';

  const updateBroadcast = useCallback(async (active: boolean) => {
    try {
      // 1. Hardware Toggle
      await toggleMicHardware(active);

      // 2. Spotify Ducking
      if (player && typeof player.setVolume === 'function') {
        try { 
          await player.setVolume(active ? 0.4 : 1.0); 
        } catch (err) { 
          console.warn("Spotify Volume Error", err); 
        }
      }

      // 3. Network Sync
      const channel = ably.channels.get('longhaul-live-sync');
      channel.publish('ducking', { ducked: active, djId: profile?.id });
      
      // 4. Persistence
      await supabase.from('broadcast_state').update({ is_playing: active }).eq('id', 1);

      // 5. UI Update with strict type check
      if (typeof setIsPlaying === 'function') {
        setIsPlaying(active);
      } else {
        console.warn("⚠️ setIsPlaying found to be non-function, checking store...");
        // Fallback: update via store directly if selector fails
        useBroadcastStore.getState().setIsPlaying(active);
      }
      
    } catch (err) {
      console.error("Broadcast update failed:", err);
      // Attempt to reset state on failure
      if (typeof setIsPlaying === 'function') setIsPlaying(false);
    }
  }, [player, toggleMicHardware, setIsPlaying, profile?.id]);

  const handleEngage = useCallback(() => { 
    if (hasAuthority && canBroadcast && !isPlaying) updateBroadcast(true); 
  }, [hasAuthority, canBroadcast, isPlaying, updateBroadcast]);

  const handleRelease = useCallback(() => { 
    if (hasAuthority && isPlaying) updateBroadcast(false); 
  }, [hasAuthority, isPlaying, updateBroadcast]);

  const handleTakeover = async () => {
    if (!canBroadcast) return alert("UNAUTHORIZED");
    setIsTransferring(true);
    try {
      if (token) {
        await takeControlAsDJ({ get_spotify_token_99: token });
        setHasAuthority(true);
      }
    } catch (err) {
      console.error("Takeover failed", err);
    } finally {
      setIsTransferring(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpaceDown && hasAuthority) {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;
        e.preventDefault();
        setIsSpaceDown(true);
        handleEngage();
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpaceDown(false);
        handleRelease();
      }
    }

    const onBlur = () => {
      if (isSpaceDown) {
        setIsSpaceDown(false);
        handleRelease();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => { 
      window.removeEventListener('keydown', onKeyDown); 
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    }
  }, [isSpaceDown, hasAuthority, handleEngage, handleRelease]);

  if (!canBroadcast) return null; // Or your locked UI

  return (
    <div className="flex flex-col gap-2 w-full select-none">
      <div className="flex gap-2 h-14">
        <button 
          onMouseDown={handleEngage} 
          onMouseUp={handleRelease}
          disabled={!hasAuthority}
          className={`flex-1 transition-all rounded border flex items-center justify-center gap-3 px-4
            ${!hasAuthority ? 'bg-zinc-900 opacity-40 cursor-not-allowed' : 
              isPlaying ? 'bg-red-600 border-white shadow-[0_0_20px_rgba(255,0,0,0.5)]' : 
              'bg-black/60 border-white/20 hover:border-white/40'}`}
        >
          <Mic size={20} className={isPlaying ? "text-white" : "text-amber-500"} />
          <span className="font-header text-xs tracking-widest uppercase font-bold text-white">
            {!hasAuthority ? 'CLAIM CONSOLE' : isPlaying ? 'ON AIR' : 'HOLD SPACE TO TALK'}
          </span>
        </button>
      </div>

      <div className="flex gap-2 h-10">
        {!hasAuthority ? (
          <button onClick={handleTakeover} disabled={isTransferring} className="flex-1 bg-indigo-600/20 border border-indigo-500/40 rounded text-[10px] uppercase font-bold tracking-widest text-indigo-200">
            {isTransferring ? 'Initialising...' : 'Claim DJ Console'}
          </button>
        ) : (
          <button onClick={() => setHasAuthority(false)} className="flex-1 bg-zinc-800 border border-zinc-600 rounded text-[10px] uppercase font-bold tracking-widest text-zinc-400">
            Release Console
          </button>
        )}
      </div>
    </div>
  )
};