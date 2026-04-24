import React, { useState, useEffect, useCallback } from 'react'
import { useBroadcastStore } from '@/stores/broadcastStore'
import { useAuthStore } from '@/stores/authStore'
import { useRadioStation } from '@/hooks/useRadioStation'
import { useSpotifyToken } from '@/hooks/useSpotifyToken'
import { supabase } from '@/lib/supabase'
import { ably } from '@/lib/ably'
import { Mic, ShieldAlert } from 'lucide-react'

interface Props { player: any; userRole: string; deviceId?: string | null }

export const BroadcastControls: React.FC<Props> = ({ player, deviceId }) => {
  const isPlaying = useBroadcastStore((s) => s.isPlaying)
  const setIsPlaying = useBroadcastStore((s) => s.setIsPlaying)
  const { profile } = useAuthStore() 
  const { toggleMicHardware } = useRadioStation(); 
  const { takeControlAsDJ, token } = useSpotifyToken();

  const [hasAuthority, setHasAuthority] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isSpaceDown, setIsSpaceDown] = useState(false)

  const canBroadcast = profile?.role === 'admin' || profile?.role === 'dj';

  // --- NEW: KICK LISTENER ---
  useEffect(() => {
    if (!hasAuthority) return;

    // Listen for the Admin clearing the master token
    const channel = supabase.channel('authority_monitor')
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'spotify_auth' }, () => {
        console.warn("🚨 AUTHORITY REVOKED BY ADMIN");
        setHasAuthority(false);
        setIsPlaying(false);
        toggleMicHardware(false);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [hasAuthority, setIsPlaying, toggleMicHardware]);
  // ---------------------------

  const updateBroadcast = useCallback(async (active: boolean) => {
    await toggleMicHardware(active);
    if (player) {
      try { await player.setVolume(active ? 0.15 : 1.0); } catch (err) { console.warn("Spotify Volume Error"); }
    }
    const channel = ably.channels.get('longhaul-live-sync')
    channel.publish('ducking', { ducked: active })
    
    await supabase.from('broadcast_state').update({ is_playing: active }).eq('id', 1)
    setIsPlaying(active); 
  }, [player, toggleMicHardware, setIsPlaying])

  const handleEngage = () => { if (hasAuthority && canBroadcast) updateBroadcast(true); }
  const handleRelease = () => { if (hasAuthority) updateBroadcast(false); }

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
      if (e.code === 'Space' && hasAuthority) {
        e.preventDefault();
        setIsSpaceDown(false);
        handleRelease();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); }
  }, [isSpaceDown, hasAuthority])

  if (!canBroadcast) return <div className="p-4 border border-white/5 bg-black/20 rounded flex items-center gap-3 opacity-50"><ShieldAlert size={16} /><span className="text-[10px] uppercase tracking-widest">Console Locked</span></div>;

  return (
    <div className="flex flex-col gap-2 w-full select-none">
      <div className="flex gap-2 h-14">
        <button 
          onMouseDown={handleEngage} 
          onMouseUp={handleRelease}
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
          <button onClick={handleTakeover} disabled={isTransferring} className="flex-1 bg-indigo-600/20 border border-indigo-500/40 rounded text-[10px] uppercase font-bold tracking-widest text-indigo-200 hover:bg-indigo-600/40">
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