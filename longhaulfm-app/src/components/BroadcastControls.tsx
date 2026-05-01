import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useBroadcastStore } from '@/stores/broadcastStore'
import { useAuthStore } from '@/stores/authStore'
import { useRadioStation } from '@/hooks/useRadioStation'
import { useSpotifyToken } from '@/hooks/useSpotifyToken'
import { ably } from '@/lib/ably'
import { Mic, Radio, LogOut, Loader2 } from 'lucide-react'

interface Props { player: any; }

export const BroadcastControls: React.FC<Props> = ({ player }) => {
  const isPlaying = useBroadcastStore((s) => s.isPlaying);
  const setIsPlaying = useBroadcastStore((s) => s.setIsPlaying);
  const { profile } = useAuthStore();
  
  const { toggleMicHardware, killMicComplete } = useRadioStation(); 
  const { token } = useSpotifyToken(); // Ensure this matches your hook's return

  const [hasAuthority, setHasAuthority] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const isBroadcastingRef = useRef(false);

  const updateBroadcast = useCallback(async (active: boolean) => {
    if (isBroadcastingRef.current === active) return;
    isBroadcastingRef.current = active;

    try {
      await toggleMicHardware(active);
      
      if (player?.setVolume) {
        // Drop music to 20% when talking
        await player.setVolume(active ? 0.2 : 1.0); 
      }
      
      // Global ducking for listeners
      const channel = ably.channels.get('longhaul-live-sync');
      channel.publish('ducking', { ducked: active });
      
      setIsPlaying(active);
    } catch (err) {
      console.warn("PTT Logic Note:", err);
    }
  }, [player, toggleMicHardware, setIsPlaying]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Space' && hasAuthority) {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          updateBroadcast(true);
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && hasAuthority) {
        updateBroadcast(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [hasAuthority, updateBroadcast]);

  const handleTakeover = async () => {
    // If token isn't there yet, we can't sync the stream
    if (!token) {
      console.error("❌ Spotify Token missing from hook state.");
      return;
    }

    setIsClaiming(true);
    try {
      // Direct Ably Sync (matches your useSpotifyToken.ts log channel)
      const syncChannel = ably.channels.get('spotify_sync');
      await syncChannel.publish('dj_takeover', { 
        dj_id: profile?.id,
        dj_name: profile?.full_name || 'Operator',
        spotify_token: token 
      });

      setHasAuthority(true);
      console.log("📡 Console Hijacked. Push-to-Talk Engaged.");
    } catch (e) {
      console.error("Takeover Failed:", e);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleRelease = () => {
    killMicComplete();
    setHasAuthority(false);
    console.log("🔌 Console Released.");
  };

  if (!profile || (profile.role !== 'admin' && profile.role !== 'dj')) return null;

  return (
    <div className="flex flex-col gap-2 w-full select-none">
      {/* PUSH TO TALK BUTTON */}
      <button 
        onMouseDown={() => hasAuthority && updateBroadcast(true)} 
        onMouseUp={() => hasAuthority && updateBroadcast(false)}
        onTouchStart={() => hasAuthority && updateBroadcast(true)}
        onTouchEnd={() => hasAuthority && updateBroadcast(false)}
        disabled={!hasAuthority}
        className={`h-16 transition-all duration-75 rounded-lg border flex items-center justify-center gap-3 px-4 shadow-xl
          ${!hasAuthority 
            ? 'opacity-20 cursor-not-allowed bg-zinc-900 border-white/5' 
            : isPlaying 
              ? 'bg-red-600 border-red-400 shadow-red-500/20' 
              : 'bg-zinc-800 border-white/10 hover:bg-zinc-700 active:scale-[0.98]'
          }`}
      >
        <Mic size={20} className={isPlaying ? "text-white" : "text-amber-500"} />
        <div className="flex flex-col items-start text-left">
          <span className="font-bold text-[10px] uppercase tracking-[0.2em]">
            {!hasAuthority ? 'System Locked' : isPlaying ? 'LIVE ON AIR' : 'Ready to Talk'}
          </span>
          <span className="text-[8px] opacity-40 uppercase font-mono tracking-wider">
            {hasAuthority ? (isPlaying ? 'Broadcasting...' : 'Hold Spacebar') : 'Claim Console First'}
          </span>
        </div>
      </button>

      {/* AUTHORITY TOGGLE */}
      {!hasAuthority ? (
        <button 
          onClick={handleTakeover} 
          disabled={!token || isClaiming}
          className={`h-10 text-[9px] font-bold border rounded uppercase tracking-widest transition-all flex items-center justify-center gap-2
            ${!token || isClaiming 
              ? 'bg-zinc-900 border-white/5 text-zinc-600 cursor-not-allowed' 
              : 'bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border-indigo-500/20'}`}
        >
          {isClaiming ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Radio size={12} />
          )}
          {!token ? 'Waiting for Token...' : isClaiming ? 'Syncing...' : 'Claim DJ Console'}
        </button>
      ) : (
        <button 
          onClick={handleRelease} 
          className="h-10 bg-zinc-900 hover:bg-red-900/20 text-zinc-500 hover:text-red-400 text-[9px] font-bold border border-white/5 rounded uppercase tracking-widest transition-all flex items-center justify-center gap-2"
        >
          <LogOut size={12} /> Release Console
        </button>
      )}
    </div>
  );
};