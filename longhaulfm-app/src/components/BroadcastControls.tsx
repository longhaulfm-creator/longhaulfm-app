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
      // 1. Hardware Kill/Open
      await toggleMicHardware(active);

      // 2. Smoother Spotify Ducking (40% volume floor)
      if (player && typeof player.setVolume === 'function') {
        try { 
          await player.setVolume(active ? 0.4 : 1.0); 
        } catch (err) { 
          console.warn("Spotify Volume Error", err); 
        }
      }

      // 3. Global Sync (Ably)
      const channel = ably.channels.get('longhaul-live-sync');
      channel.publish('ducking', { ducked: active, djId: profile?.id });
      
      // 4. Database Persistence
      await supabase.from('broadcast_state').update({ is_playing: active }).eq('id', 1);

      // 5. Store Update
      setIsPlaying(active);
      
    } catch (err) {
      console.error("Broadcast update failed:", err);
      setIsPlaying(false);
    }
  }, [player, toggleMicHardware, setIsPlaying, profile?.id]);

  const handleEngage = useCallback(() => { 
    if (hasAuthority && canBroadcast && !isPlaying) updateBroadcast(true); 
  }, [hasAuthority, canBroadcast, isPlaying, updateBroadcast]);

  const handleRelease = useCallback(() => { 
    if (hasAuthority && isPlaying) updateBroadcast(false); 
  }, [hasAuthority, isPlaying, updateBroadcast]);

  // Handle Takeover
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

  // Keyboard and Window Focus Listeners
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

    // KILL SWITCH: If Trust switches windows, the mic must die
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

  if (!canBroadcast) {
    return (
      <div className="p-4 border border-white/5 bg-black/20 rounded flex items-center gap-3 opacity-50">
        <ShieldAlert size={16} />
        <span className="text-[10px] uppercase tracking-widest">Console Locked</span>
      </div>
    );
  }

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
          <button 
            onClick={handleTakeover} 
            disabled={isTransferring} 
            className="flex-1 bg-indigo-600/20 border border-indigo-500/40 rounded text-[10px] uppercase font-bold tracking-widest text-indigo-200 hover:bg-indigo-600/40"
          >
            {isTransferring ? 'Initialising...' : 'Claim DJ Console'}
          </button>
        ) : (
          <button 
            onClick={() => setHasAuthority(false)} 
            className="flex-1 bg-zinc-800 border border-zinc-600 rounded text-[10px] uppercase font-bold tracking-widest text-zinc-400"
          >
            Release Console
          </button>
        )}
      </div>
    </div>
  )
};