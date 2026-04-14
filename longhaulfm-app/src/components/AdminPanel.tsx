import React, { useState } from 'react';
import { useBroadcastStore } from '@/stores/broadcastStore';
import { useSpotifyToken } from '@/hooks/useSpotifyToken';
import { supabase } from '@/lib/supabase';
import { Radio, Power, MicOff, RefreshCw, CheckCircle2, Share2 } from 'lucide-react';

interface AdminPanelProps {
  deviceId?: string | null;
  togglePlay: (play: boolean) => void;
}

export const AdminPanel = ({ deviceId, togglePlay }: AdminPanelProps) => {
  const { micAllowed, systemKill, toggleMic, toggleSystemKill, fetchInitial } = useBroadcastStore();
  const { token } = useSpotifyToken();
  const [isTransferring, setIsTransferring] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleHandover = async () => {
    if (!token || !deviceId) {
      alert("Spotify Signal not ready on this device.");
      return;
    }

    if (confirm("🔄 CLAIM MASTER CONSOLE? This will kick the current DJ and route audio to your laptop.")) {
      setIsTransferring(true);
      try {
        // 1. Transfer Spotify Playback to THIS laptop
        await fetch('https://api.spotify.com/v1/me/player', {
          method: 'PUT',
          body: JSON.stringify({ device_ids: [deviceId], play: true }),
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        // 2. Clear Icecast mount (Requires 'Allow Insecure Content' in Chrome for localhost)
        try {
          await fetch('http://34.35.38.193:8000/admin/killsource?mount=/radio.mp3', {
            mode: 'no-cors',
            headers: { 'Authorization': 'Basic ' + btoa('admin:your_icecast_pass') }
          });
        } catch (iceErr) {
          console.warn("Icecast kick blocked by browser security. Proceeding with handover.");
        }

        // 3. Force update Supabase so listeners get metadata immediately
        await supabase
          .from('broadcast_state')
          .update({ 
            is_playing: true, 
            system_kill: false,
            updated_at: new Date().toISOString() 
          })
          .eq('id', 1);

        // 4. Trigger local playback
        setTimeout(() => {
          togglePlay(true);
          setIsTransferring(false);
          fetchInitial();
        }, 1000);

      } catch (e) {
        console.error("Handover failed:", e);
        setIsTransferring(false);
      }
    }
  };

  const handleKillswitch = async () => {
    if (confirm(systemKill ? "Restore station?" : "🚨 EMERGENCY: Kill all audio?")) {
      await toggleSystemKill();
      setTimeout(() => fetchInitial(), 500);
    }
  };

  return (
    <div className="bg-zinc-900/95 border border-red-500/30 p-4 rounded shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
        <Radio size={14} className={systemKill ? "text-red-500 animate-pulse" : "text-green-500"} />
        <h2 className="text-[10px] font-bold uppercase text-white tracking-widest">Station Authority</h2>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button 
          onClick={handleHandover}
          disabled={isTransferring}
          className="col-span-2 mb-2 p-3 bg-blue-600/20 border border-blue-500/40 rounded flex items-center justify-center gap-2 hover:bg-blue-600/40 transition-all disabled:opacity-50"
        >
          <Share2 size={14} className={isTransferring ? "animate-spin" : ""} />
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">
            {isTransferring ? 'Claiming Signal...' : 'Claim Master Console'}
          </span>
        </button>

        <button onClick={handleKillswitch} className={`p-3 rounded flex flex-col items-center gap-1 border transition-all ${systemKill ? 'bg-red-600' : 'bg-zinc-800 border-white/5'}`}>
          <Power size={16} />
          <span className="text-[8px] font-bold uppercase tracking-tighter">{systemKill ? 'RESTORE' : 'SYSTEM KILL'}</span>
        </button>
        
        <button onClick={() => toggleMic()} className={`p-3 rounded flex flex-col items-center gap-1 border transition-all ${!micAllowed ? 'bg-amber-600' : 'bg-zinc-800 border-white/5'}`}>
          <MicOff size={16} />
          <span className="text-[8px] font-bold uppercase tracking-tighter">{!micAllowed ? 'RELEASE' : 'MUZZLE'}</span>
        </button>
      </div>
      
      <button 
        onClick={async () => { setIsResetting(true); await supabase.rpc('reset_broadcast_system'); await fetchInitial(); setIsResetting(false); }} 
        className="w-full mt-4 flex items-center justify-center gap-2 py-2 text-[8px] font-bold uppercase border border-white/10 rounded text-white/60 hover:text-white transition-colors"
      >
        <RefreshCw size={10} className={isResetting ? "animate-spin" : ""} /> Full Logic Reset
      </button>
    </div>
  );
};