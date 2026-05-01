import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useBroadcastStore } from '@/stores/broadcastStore'
import { useAuthStore } from '@/stores/authStore'
import { useRadioStation } from '@/hooks/useRadioStation'
import { useSpotifyToken } from '@/hooks/useSpotifyToken'
import { ably } from '@/lib/ably'
import { Mic, Radio, LogOut, Loader2, Play } from 'lucide-react'

interface Props { player: any; }

export const BroadcastControls: React.FC<Props> = ({ player }) => {
  const isMicLive = useBroadcastStore((s) => s.isMicLive);
  const setIsMicLive = useBroadcastStore((s) => s.setIsMicLive);
  const isJinglePlaying = useBroadcastStore((s) => s.isJinglePlaying);
  const triggerJingle = useBroadcastStore((s) => s.triggerJingle);
  const { profile } = useAuthStore();
  
  const { initMicHardware, toggleMicHardware, killMicComplete } = useRadioStation(); 
  const { token } = useSpotifyToken(); 

  const [hasAuthority, setHasAuthority] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const isBroadcastingRef = useRef(false);

  const TEST_JINGLE = "https://lqvyngvhgjpiczqxnjhr.supabase.co/storage/v1/object/public/partner-assets/jingle-test.mp3";

  const updateBroadcast = useCallback(async (active: boolean) => {
    if (isBroadcastingRef.current === active) return;
    isBroadcastingRef.current = active;

    try {
      // 1. Handle Mic Hardware First
      await toggleMicHardware(active);
      
      // 2. Handle Spotify Ducking
      if (player?.setVolume) {
        await player.setVolume(active ? 0.05 : 1.0); 
      }
      
      // 3. Sync to Listeners via Ably
      const channel = ably.channels.get('longhaul-live-sync');
      channel.publish('ducking', { ducked: active });
      
      setIsMicLive(active);
    } catch (err) {
      console.error("Broadcast Toggle Error:", err);
      isBroadcastingRef.current = false;
      setIsMicLive(false);
    }
  }, [player, toggleMicHardware, setIsMicLive]);

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
    if (!token) return;
    setIsClaiming(true);
    try {
      setIsMicLive(false);
      isBroadcastingRef.current = false;
      await initMicHardware();
      const syncChannel = ably.channels.get('spotify_sync');
      await syncChannel.publish('dj_takeover', { 
        dj_id: profile?.id,
        dj_name: profile?.full_name || 'Operator',
        spotify_token: token 
      });
      setHasAuthority(true);
    } catch (e) {
      console.error("Takeover Failed:", e);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleRelease = () => {
    updateBroadcast(false);
    killMicComplete();
    setHasAuthority(false);
  };

  if (!profile || (profile.role !== 'admin' && profile.role !== 'dj')) return null;

  return (
    <div className="flex flex-col gap-2 w-full select-none">
      <button 
        onMouseDown={() => hasAuthority && updateBroadcast(true)} 
        onMouseUp={() => hasAuthority && updateBroadcast(false)}
        disabled={!hasAuthority}
        className={`h-16 transition-all duration-75 rounded-lg border flex items-center justify-center gap-3 px-4 shadow-xl
          ${!hasAuthority 
            ? 'opacity-20 cursor-not-allowed bg-zinc-900 border-white/5' 
            : isMicLive 
              ? 'bg-red-600 border-red-400 shadow-red-500/20' 
              : 'bg-zinc-800 border-white/10 hover:bg-zinc-700 active:scale-[0.98]'
          }`}
      >
        <Mic size={20} className={isMicLive ? "text-white" : "text-amber-500"} />
        <div className="flex flex-col items-start text-left">
          <span className="font-bold text-[10px] uppercase tracking-[0.2em]">
            {!hasAuthority ? 'System Locked' : isMicLive ? 'LIVE ON AIR' : 'Ready to Talk'}
          </span>
          <span className="text-[8px] opacity-40 uppercase font-mono tracking-wider">
            {hasAuthority ? (isMicLive ? 'Broadcasting...' : 'Hold Spacebar') : 'Claim Console First'}
          </span>
        </div>
      </button>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => triggerJingle(TEST_JINGLE)}
          disabled={!hasAuthority || isJinglePlaying}
          className={`h-10 rounded border flex items-center justify-center gap-2 transition-all uppercase text-[9px] font-bold tracking-widest
            ${!hasAuthority || isJinglePlaying
              ? 'bg-zinc-900 border-white/5 text-zinc-600 cursor-not-allowed'
              : 'bg-amber-600/10 border-amber-500/20 hover:bg-amber-600/20 text-amber-500 active:scale-95'
            }`}
        >
          {isJinglePlaying ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
          {isJinglePlaying ? 'Playing...' : 'Jingle'}
        </button>

        {!hasAuthority ? (
          <button 
            onClick={handleTakeover} 
            disabled={!token || isClaiming}
            className="h-10 text-[9px] font-bold border rounded uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border-indigo-500/20"
          >
            {isClaiming ? <Loader2 size={12} className="animate-spin" /> : <Radio size={12} />}
            Claim
          </button>
        ) : (
          <button 
            onClick={handleRelease} 
            className="h-10 bg-zinc-900 hover:bg-red-900/20 text-zinc-500 hover:text-red-400 text-[9px] font-bold border border-white/5 rounded uppercase tracking-widest transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={12} /> Release
          </button>
        )}
      </div>
    </div>
  );
};