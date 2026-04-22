import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useBroadcastStore } from '@/stores/broadcastStore'
import { useRadioStation } from '@/hooks/useRadioStation'
import { useSpotifyToken } from '@/hooks/useSpotifyToken'
import { supabase } from '@/lib/supabase'
import { ably } from '@/lib/ably'
import { Mic, Radio, LogOut } from 'lucide-react'

interface Props { player: any; userRole: string; deviceId?: string | null }

export const BroadcastControls: React.FC<Props> = ({ player, userRole, deviceId }) => {
  const isPlaying = useBroadcastStore((s) => s.isPlaying)
  const { toggleStream } = useRadioStation(); 
  const { takeControlAsDJ, releaseControlToAutoDJ, token } = useSpotifyToken();

  const [hasAuthority, setHasAuthority] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const pressStartTime = useRef<number>(0)
  const [isSpaceDown, setIsSpaceDown] = useState(false)

  const updateBroadcast = useCallback(async (active: boolean) => {
    if (!player || !hasAuthority) return;

    await toggleStream(active);

    try {
      // 🎚️ DJ DUCKING: Drop local music to 10% to prevent headphone bleed into the mic
      await player.setVolume(active ? 0.1 : 1.0); 
    } catch (err) {
      console.warn("Spotify Vol Sync Error", err);
    }

    const channel = ably.channels.get('longhaul-live-sync')
    await channel.publish('ducking', { ducked: active })
    
    await supabase.from('broadcast_state').update({ is_playing: active }).eq('id', 1)
  }, [player, hasAuthority, toggleStream])

  const handleEngage = () => {
    if (!hasAuthority || isPlaying) return
    pressStartTime.current = Date.now()
    updateBroadcast(true)
  }

  const handleRelease = () => {
    if (pressStartTime.current === 0) return
    updateBroadcast(false);
    pressStartTime.current = 0;
  }

  const handleTakeover = async () => {
    setIsTransferring(true);
    try {
      if (deviceId && token) {
        await fetch(`https://api.spotify.com/v1/me/player`, {
          method: 'PUT',
          body: JSON.stringify({ device_ids: [deviceId], play: true }),
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
      }
      await takeControlAsDJ({ access_token: token || '' });
      setHasAuthority(true);
    } catch (err) {
      console.error("Takeover failed", err);
    } finally {
      setIsTransferring(false);
    }
  };

  const handleReleaseControl = async () => {
    await releaseControlToAutoDJ();
    setHasAuthority(false);
    if (isPlaying) updateBroadcast(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpaceDown && hasAuthority) {
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
  }, [isSpaceDown, hasAuthority, isPlaying])

  return (
    <div className="flex flex-col gap-2 w-full select-none">
      <div className="flex gap-2 h-14">
        <button 
          onMouseDown={handleEngage} 
          onMouseUp={handleRelease}
          onMouseLeave={() => isPlaying && handleRelease()}
          disabled={!hasAuthority}
          className={`flex-1 transition-all rounded border flex items-center justify-center gap-3 px-4
            ${!hasAuthority ? 'bg-zinc-900 opacity-40' : isPlaying ? 'bg-red-600 shadow-[0_0_20px_rgba(255,0,0,0.4)] border-white' : 'bg-black/60 border-white/20'}`}
        >
          <Mic size={20} className={isPlaying ? "text-white animate-pulse" : "text-amber-500"} />
          <span className="font-header text-xs tracking-widest uppercase font-bold text-white">
            {isPlaying ? 'ON AIR' : 'HOLD SPACE TO TALK'}
          </span>
        </button>
      </div>

      <div className="flex gap-2 h-10">
        {!hasAuthority ? (
          <button onClick={handleTakeover} disabled={isTransferring} className="flex-1 bg-indigo-600/20 border border-indigo-500/40 rounded text-[10px] uppercase font-bold tracking-widest text-indigo-200">
            {isTransferring ? 'Claiming...' : 'Claim Console'}
          </button>
        ) : (
          <button onClick={handleReleaseControl} className="flex-1 bg-zinc-800 border border-zinc-600 rounded text-[10px] uppercase font-bold tracking-widest text-zinc-400">
            Release Console
          </button>
        )}
      </div>
    </div>
  )
};