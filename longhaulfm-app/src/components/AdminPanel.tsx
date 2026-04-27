import React, { useState, useEffect, useRef } from 'react';
import { useBroadcastStore } from '../stores/broadcastStore';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { ShieldAlert, Power, MicOff, UserX, Radio, RefreshCcw } from 'lucide-react';
import { RealtimeChannel } from '@supabase/supabase-js';

export const AdminPanel = () => {
  const { profile } = useAuthStore();
  const { systemKill, toggleMic, toggleSystemKill, fetchInitial } = useBroadcastStore();
  const [activeMasterId, setActiveMasterId] = useState<string | null>(null);
  const [isKicking, setIsKicking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    let mounted = true;

    const setupAdminControl = async () => {
      // 1. Initial State Fetch
      const { data } = await supabase.from('spotify_auth').select('id, get_spotify_token_99').limit(1).maybeSingle();
      if (mounted && data?.get_spotify_token_99) setActiveMasterId(data.id);

      // 2. Clear stale channels
      const channelName = 'admin_sync_global';
      const stale = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
      if (stale) await supabase.removeChannel(stale);

      // 3. Setup and Listen
      const channel = supabase.channel(channelName);
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'spotify_auth' }, (payload: any) => {
        if (!mounted) return;
        if (payload.eventType === 'DELETE' || !payload.new?.get_spotify_token_99) {
          setActiveMasterId(null);
        } else {
          setActiveMasterId(payload.new.id);
        }
      });

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED' && mounted) console.log("📡 Admin Master Sync: Online");
      });

      channelRef.current = channel;
    };

    setupAdminControl();
    return () => { 
      mounted = false; 
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [isAdmin]);

  const handleForceDisconnect = async () => {
    if (!confirm("⚠️ Kick DJ and reset system?")) return;
    setIsKicking(true);
    try {
      await supabase.functions.invoke('azuracast-control', { body: { action: 'disconnect_source' } });
      await supabase.from('spotify_auth').delete().neq('id', '00000000'); // Clean DB
      await supabase.rpc('reset_broadcast_system');
      await fetchInitial();
      setActiveMasterId(null);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally { setIsKicking(false); }
  };

  if (!isAdmin) return null;

  return (
    <div className="bg-zinc-900/95 border border-white/10 p-4 rounded shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <ShieldAlert size={14} className="text-orange-400" />
          <h2 className="text-[10px] font-bold uppercase text-white tracking-widest">Master Control</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
            <Radio size={10} className={activeMasterId ? "text-blue-400 animate-pulse" : "text-zinc-600"} />
            <span className="text-[8px] text-blue-300 font-mono font-bold">{activeMasterId ? 'LIVE' : 'AUTO'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={handleForceDisconnect} disabled={isKicking} className="col-span-2 mb-2 p-3 border border-red-500/40 bg-red-950/20 rounded-lg flex items-center justify-center gap-2 hover:bg-red-500/30">
          <UserX size={16} className="text-red-500" />
          <span className="text-[9px] font-black uppercase text-red-200">Force Eject</span>
        </button>
        <button onClick={() => toggleSystemKill()} className={`p-3 rounded border flex flex-col items-center gap-1 ${systemKill ? 'bg-red-600 border-white' : 'bg-zinc-800 border-white/5'}`}>
          <Power size={16} color="white" /><span className="text-[8px] font-bold uppercase text-white">Kill</span>
        </button>
        <button onClick={() => toggleMic()} className="p-3 rounded border bg-zinc-800 border-white/5 flex flex-col items-center gap-1">
          <MicOff size={16} color="white" /><span className="text-[8px] font-bold uppercase text-white">Muzzle</span>
        </button>
      </div>
    </div>
  );
};