import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useBroadcastStore } from '@/stores/broadcastStore'
import { useRadioStation } from '@/hooks/useRadioStation'
import { useSpotifyToken } from '@/hooks/useSpotifyToken'
import { supabase } from '@/lib/supabase'
import { ably } from '@/lib/ably'
import { Mic } from 'lucide-react'

interface Props { player: any; userRole: string; deviceId?: string | null }

export const BroadcastControls: React.FC<Props> = ({ player, userRole, deviceId }) => {
  const isPlaying = useBroadcastStore((s) => s.isPlaying)
  const setIsPlaying = useBroadcastStore((s) => s.setIsPlaying) // Ensure this exists in your store
  const { toggleMicHardware } = useRadioStation(); 
  const { takeControlAsDJ, token } = useSpotifyToken();

  const [hasAuthority, setHasAuthority] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isSpaceDown, setIsSpaceDown] = useState(false)

  const updateBroadcast = useCallback(async (active: boolean) => {
    console.log("📡 UpdateBroadcast sequence started. Active:", active);
    
    // 1. MIC ALWAYS TOGGLES (Even if Spotify is broken)
    await toggleMicHardware(active);

    // 2. SPOTIFY DUCKING (Only if player exists)
    if (player) {
      try {
        await player.setVolume(active ? 0.15 : 1.0);
        console.log("🎵 Spotify Volume Set to:", active ? 0.15 : 1.0);
      } catch (err) {
        console.warn("⚠️ Spotify Player exists but failed to set volume.");
      }
    } else {
      console.warn("⚠️ No Spotify Player detected. Ducking skipped.");
    }

    // 3. GLOBAL SIGNALS
    const channel = ably.channels.get('longhaul-live-sync')
    channel.publish('ducking', { ducked: active })
    
    await supabase.from('broadcast_state').update({ is_playing: active }).eq('id', 1)
    
    // Update local Zustand store so the UI button turns Red
    setIsPlaying(active); 

  }, [player, toggleMicHardware, setIsPlaying])

  const handleEngage = () => {
    if (!hasAuthority) {
      console.log("🚫 Cannot talk: Console not claimed.");
      return;
    }
    updateBroadcast(true);
  }

  const handleRelease = () => {
    if (!hasAuthority) return;
    updateBroadcast(false);
  }

  const handleTakeover = async () => {
    setIsTransferring(true);
    console.log("🔌 Attempting to claim DJ console...");
    try {
      // If you have the token, we force the DJ state
      if (token) {
        await takeControlAsDJ({ access_token: token });
        setHasAuthority(true);
        console.log("✅ Console Claimed!");
      }
    } catch (err) {
      console.error("❌ Takeover failed:", err);
    } finally {
      setIsTransferring(false);
    }
  };

  // Keyboard Listeners
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
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    }
  }, [isSpaceDown, hasAuthority])

  return (
    <div className="flex flex-col gap-2 w-full select-none">
      <div className="flex gap-2 h-14">
        <button 
          onMouseDown={handleEngage} 
          onMouseUp={handleRelease}
          // The button should look enabled if you have authority
          className={`flex-1 transition-all rounded border flex items-center justify-center gap-3 px-4
            ${!hasAuthority ? 'bg-zinc-900 opacity-40 cursor-not-allowed' : 
              isPlaying ? 'bg-red-600 border-white shadow-[0_0_20px_rgba(255,0,0,0.5)]' : 
              'bg-black/60 border-white/20 hover:border-white/40'}`}
        >
          <Mic size={20} className={isPlaying ? "text-white" : "text-amber-500"} />
          <span className="font-header text-xs tracking-widest uppercase font-bold text-white">
            {!hasAuthority ? 'CLAIM CONSOLE TO TALK' : isPlaying ? 'ON AIR' : 'HOLD SPACE TO TALK'}
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