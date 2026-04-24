import React, { useState, useEffect, useRef } from 'react';
import { useBroadcastStore } from '../stores/broadcastStore';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { 
  ShieldAlert, Power, MicOff, UserX, Radio, RefreshCcw, Lock
} from 'lucide-react';
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
      // 1. Get current state to see if a DJ is already active
      const { data, error } = await supabase
        .from('spotify_auth')
        .select('id, get_spotify_token_99') 
        .limit(1)
        .maybeSingle();
      
      if (error || !mounted) return;

      if (data?.get_spotify_token_99) {
        setActiveMasterId(data.id);
      }

      // 2. Setup Realtime Channel
      // We clean up existing channels first to prevent the "cannot add callbacks" error
      const channelName = 'admin_sync_global';
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase.channel(channelName);

      // 3. Define listeners BEFORE calling .subscribe()
      channel.on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'spotify_auth' 
        },
        (payload: any) => {
          if (payload.eventType === 'DELETE' || !payload.new?.get_spotify_token_99) {
            console.log("🚫 DJ Authority Revoked");
            setActiveMasterId(null);
          } else if (payload.new?.get_spotify_token_99) {
            console.log("👑 New Station Master Detected:", payload.new.id);
            setActiveMasterId(payload.new.id);
          }
        }
      );

      // 4. Subscribe
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED' && mounted) {
          console.log("📡 Admin Master Sync: Online");
        }
      });

      channelRef.current = channel;
    };

    setupAdminControl();

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [isAdmin]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await supabase.functions.invoke('spotify-sync', { 
        body: { action: 'refresh_metadata' } 
      });
      await fetchInitial();
    } catch (err) {
      console.error("Sync failed", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleForceDisconnect = async () => {
    if (!confirm("⚠️ ALERT: This will physically kick the DJ from the stream and reset Spotify. Proceed?")) return;
    
    setIsKicking(true);
    try {
      // 1. Call the Edge Function to sever the AzuraCast/Icecast connection
      // This kills the audio pipe from the Stylo Tablet
      const { error: azuraError } = await supabase.functions.invoke('azuracast-control', { 
        body: { action: 'disconnect_source' } 
      });
      if (azuraError) throw new Error("Failed to sever Audio pipe");

      // 2. Wipe the Spotify Authorization table
      // This "kicks" the DJ out of the UI authority on their device
      await supabase.from('spotify_auth').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // 3. Reset the internal broadcast tables
      await supabase.rpc('reset_broadcast_system');

      // 4. Tell Spotify Engine to disengage
      await supabase.functions.invoke('spotify-sync', { 
        body: { action: 'disengage' } 
      });

      // 5. Refresh local state
      await fetchInitial();
      setActiveMasterId(null);
      
      alert("✅ Operator Ejected. Radio has returned to Auto-DJ.");
    } catch (err: any) {
      alert(`❌ Force Disconnect Failed: ${err.message}`);
    } finally {
      setIsKicking(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-black/40 border border-white/5 p-6 rounded-lg flex flex-col items-center justify-center gap-3">
        <Lock size={20} className="text-white/10" />
        <p className="text-[9px] uppercase tracking-[0.3em] text-white/20">Admin Authorization Required</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/95 border border-white/10 p-4 rounded shadow-2xl backdrop-blur-xl">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <ShieldAlert size={14} className="text-orange-400" />
          <h2 className="text-[10px] font-bold uppercase text-white tracking-widest">Master Control</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleManualSync} 
            disabled={isSyncing} 
            className="p-1 text-zinc-500 hover:text-orange-400 transition-colors"
            title="Refresh Radio State"
          >
            <RefreshCcw size={12} className={isSyncing ? "animate-spin" : ""} />
          </button>
          
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
            <Radio size={10} className={activeMasterId ? "text-blue-400 animate-pulse" : "text-zinc-600"} />
            <span className="text-[8px] text-blue-300 font-mono uppercase font-bold">
              {activeMasterId ? 'STATION MASTER LIVE' : 'AUTO-DJ ACTIVE'}
            </span>
          </div>
        </div>
      </div>

      {/* Control Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* The "Nuclear" Button */}
        <button 
          onClick={handleForceDisconnect} 
          disabled={isKicking} 
          className="col-span-2 mb-2 p-3 border border-red-500/40 bg-red-950/20 rounded-lg flex items-center justify-center gap-2 hover:bg-red-500/30 active:scale-95 transition-all group"
        >
          <UserX size={16} className={isKicking ? "animate-spin" : "text-red-500 group-hover:scale-110 transition-transform"} />
          <span className="text-[9px] font-black uppercase text-red-200">Force Disconnect Source</span>
        </button>

        {/* System Kill Toggle */}
        <button 
          onClick={() => toggleSystemKill()} 
          className={`p-3 rounded border transition-all flex flex-col items-center justify-center gap-1
            ${systemKill 
              ? 'bg-red-600 border-white shadow-[0_0_15px_rgba(255,0,0,0.4)]' 
              : 'bg-zinc-800 border-white/5 hover:bg-zinc-700'
            }`}
        >
          <Power size={16} color="white" />
          <span className="text-[8px] font-bold uppercase text-white">System Kill</span>
        </button>
        
        {/* Muzzle Mics Toggle */}
        <button 
          onClick={() => toggleMic()} 
          className="p-3 rounded border bg-zinc-800 border-white/5 hover:bg-zinc-700 transition-all flex flex-col items-center justify-center gap-1"
        >
          <MicOff size={16} color="white" />
          <span className="text-[8px] font-bold uppercase text-white">Muzzle Mics</span>
        </button>
      </div>

      {/* Identity Footer */}
      {activeMasterId && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-[7px] uppercase tracking-tighter text-zinc-500 text-center">
            Active Session ID: <span className="text-zinc-300 font-mono">{activeMasterId}</span>
          </p>
        </div>
      )}
    </div>
  );
};