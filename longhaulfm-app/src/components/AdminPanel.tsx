import React, { useState, useEffect, useRef } from 'react';
import { useBroadcastStore } from '../stores/broadcastStore';
import { supabase } from '../lib/supabase';
import { 
  ShieldAlert, Power, MicOff, UserX, Radio, RefreshCcw
} from 'lucide-react';

// The ID from your screenshot
const MASTER_DJ_ID = '6ba16792-7108-4d64-964c-f1e6005d5e2e';

export const AdminPanel = () => {
  const { systemKill, toggleMic, toggleSystemKill, fetchInitial } = useBroadcastStore();
  const [activeMasterId, setActiveMasterId] = useState<string | null>(null);
  const [isKicking, setIsKicking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const getMaster = async () => {
      const { data, error } = await supabase
        .from('spotify_auth')
        .select('id') 
        .eq('id', MASTER_DJ_ID)
        .maybeSingle();
      
      if (!error && data) {
        setActiveMasterId(data.id);
      }
    };

    getMaster();

    if (!channelRef.current) {
      const channelId = `admin-sync-${Math.random().toString(36).substring(7)}`;
      channelRef.current = supabase.channel(channelId)
        .on(
          'postgres_changes',
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'spotify_auth', 
            filter: `id=eq.${MASTER_DJ_ID}` 
          },
          (payload) => {
            console.log('👑 Master DJ State Updated');
            setActiveMasterId(payload.new.id);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') console.log('✅ Admin Sync Live');
        });
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  // NEW: Manual Sync to force Edge Function metadata refresh
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await supabase.functions.invoke('spotify-sync', {
        body: { action: 'refresh_metadata' }
      });
      await fetchInitial();
    } catch (err) {
      console.error("Manual sync failed", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleForceDisconnect = async () => {
    if (!confirm("⚠️ FORCE DISCONNECT LIVE SOURCE? \nThis will stop the BUTT/Larix connection.")) return;
    setIsKicking(true);
    try {
      // 1. Kick from AzuraCast
      const response = await fetch("https://radio.longhaul-fm.co.za/api/station/1/backend/disconnect", {
        method: 'POST',
        headers: { 'X-API-Key': import.meta.env.VITE_AZURACAST_API_KEY || '' }
      });
      
      // 2. Reset the DB state so listeners see the Fallback/Auto-DJ info
      const { error } = await supabase.rpc('reset_broadcast_system');
      if (error) throw error;

      // 3. Trigger a sync to clean up metadata
      await supabase.functions.invoke('spotify-sync', { body: { action: 'disengage' } });

      await fetchInitial();
      alert("✅ Operator Ejected and System Reset.");
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setIsKicking(false);
    }
  };

  return (
    <div className="bg-zinc-900/95 border border-white/10 p-4 rounded shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <ShieldAlert size={14} className="text-zinc-500" />
          <h2 className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Global Policy</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleManualSync}
            disabled={isSyncing}
            className="p-1 hover:bg-white/5 rounded transition-colors text-zinc-500 hover:text-gold"
            title="Force Metadata Sync"
          >
            <RefreshCcw size={12} className={isSyncing ? "animate-spin" : ""} />
          </button>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
            <Radio size={10} className={activeMasterId ? "text-blue-400 animate-pulse" : "text-zinc-600"} />
            <span className="text-[8px] text-blue-300 font-mono uppercase font-bold">
              {activeMasterId ? 'STATION MASTER' : 'AUTO-DJ'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button 
          onClick={handleForceDisconnect}
          disabled={isKicking}
          className="col-span-2 mb-2 p-3 border border-red-500/40 bg-red-950/20 rounded-lg flex items-center justify-center gap-2 hover:bg-red-500/30 transition-all disabled:opacity-50"
        >
          <UserX size={16} className={isKicking ? "animate-spin" : "text-red-500"} />
          <span className="text-[9px] font-black uppercase text-red-200">Force Disconnect</span>
        </button>

        <button 
          onClick={() => toggleSystemKill()} 
          className={`p-3 rounded border transition-all ${systemKill ? 'bg-red-600 border-white' : 'bg-zinc-800 border-white/5 hover:bg-zinc-700'}`}
        >
          <Power size={16} color="white" className="mx-auto" />
          <span className="text-[8px] font-bold uppercase text-white block mt-1">System Kill</span>
        </button>
        
        <button 
          onClick={() => toggleMic()} 
          className="p-3 rounded border bg-zinc-800 border-white/5 hover:bg-zinc-700 transition-all"
        >
          <MicOff size={16} color="white" className="mx-auto" />
          <span className="text-[8px] font-bold uppercase text-white block mt-1">Muzzle Mics</span>
        </button>
      </div>
      
      {systemKill && (
        <div className="mt-4 p-2 bg-red-500/10 border border-red-500/20 rounded">
          <p className="text-[8px] text-red-400 text-center leading-tight uppercase font-bold">
            Emergency Override Active: All broadcast streams are currently suppressed at the Edge.
          </p>
        </div>
      )}
    </div>
  );
};