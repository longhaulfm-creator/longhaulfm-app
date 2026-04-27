import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useBroadcastStore } from '@/stores/broadcastStore'
import { useAuthStore } from '@/stores/authStore'
import { useRadioStation } from '@/hooks/useRadioStation'
import { useSpotifyToken } from '@/hooks/useSpotifyToken'
import { supabase } from '@/lib/supabase'
import { ably } from '@/lib/ably'
import { Mic } from 'lucide-react'

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
  const isSpaceDownRef = useRef(false);

  const canBroadcast = profile?.role === 'admin' || profile?.role === 'dj';

  const updateBroadcast = useCallback(async (active: boolean) => {
    try {
      // 1. Hardware Toggle & Stream Capture
      const stream = await toggleMicHardware(active);

      // 2. Spotify Ducking
      if (player?.setVolume) {
        await player.setVolume(active ? 0.3 : 1.0); // Slightly deeper duck for clarity
      }

      // 3. Network Sync
      // NOTE: If you aren't hearing audio, it's because 'ducking' is just a message.
      // You need a way to pipe the 'stream' data to the listeners here.
      const channel = ably.channels.get('longhaul-live-sync');
      channel.publish('ducking', { 
        ducked: active, 
        djId: profile?.id,
        timestamp: Date.now() 
      });
      
      // 4. Database Sync
      await supabase.from('broadcast_state').update({ is_playing: active }).eq('id', 1);

      // 5. Global State Update
      setIsPlaying(active);
      
    } catch (err) {
      console.error("Broadcast update failed:", err);
      setIsPlaying(false);
    }
  }, [player, toggleMicHardware, setIsPlaying, profile?.id]);

  const handleEngage = useCallback(() => { 
    if (hasAuthority && canBroadcast && !isPlaying) {
      updateBroadcast(true);
    }
  }, [hasAuthority, canBroadcast, isPlaying, updateBroadcast]);

  const handleRelease = useCallback(() => { 
    if (hasAuthority && isPlaying) {
      updateBroadcast(false);
    }
  }, [hasAuthority, isPlaying, updateBroadcast]);

  // Keyboard Listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpaceDownRef.current && hasAuthority) {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;
        e.preventDefault();
        isSpaceDownRef.current = true;
        handleEngage();
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        isSpaceDownRef.current = false;
        handleRelease();
      }
    }
    const onBlur = () => {
      if (isSpaceDownRef.current) {
        isSpaceDownRef.current = false;
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
  }, [hasAuthority, handleEngage, handleRelease]);

  const handleTakeover = async () => {
    if (!canBroadcast) return;
    setIsTransferring(true);
    try {
      if (token) {
        await takeControlAsDJ({ get_spotify_token_99: token });
        setHasAuthority(true);
      }
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full select-none">
      <button 
        onMouseDown={handleEngage} 
        onMouseUp={handleRelease}
        onMouseLeave={handleRelease}
        disabled={!hasAuthority}
        className={`h-14 transition-all rounded border flex items-center justify-center gap-3 px-4
          ${!hasAuthority ? 'bg-zinc-900 opacity-40 cursor-not-allowed' : 
            isPlaying ? 'bg-red-600 border-white shadow-[0_0_20px_rgba(255,0,0,0.4)]' : 
            'bg-black/60 border-white/20 hover:border-white/40'}`}
      >
        <Mic size={20} className={isPlaying ? "text-white" : "text-amber-500"} />
        <span className="font-bold text-xs tracking-widest uppercase text-white">
          {!hasAuthority ? 'CLAIM CONSOLE' : isPlaying ? 'ON AIR' : 'HOLD SPACE TO TALK'}
        </span>
      </button>

      {!hasAuthority ? (
        <button onClick={handleTakeover} disabled={isTransferring} className="h-10 bg-indigo-600/20 border border-indigo-500/40 rounded text-[10px] uppercase font-bold tracking-widest text-indigo-200">
          {isTransferring ? 'Initialising...' : 'Claim DJ Console'}
        </button>
      ) : (
        <button onClick={() => setHasAuthority(false)} className="h-10 bg-zinc-800 border border-zinc-600 rounded text-[10px] uppercase font-bold tracking-widest text-zinc-400">
          Release Console
        </button>
      )}
    </div>
  )
};