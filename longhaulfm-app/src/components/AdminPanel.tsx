import React, { useState, useEffect, useRef } from 'react';
import { useBroadcastStore } from '../stores/broadcastStore';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { ShieldAlert, Power, MicOff, UserX, Radio, MessageSquare, Trash2, Users } from 'lucide-react';
import { RealtimeChannel } from '@supabase/supabase-js';
import * as Ably from 'ably';

// Define the shape of our WhatsApp requests
interface RadioRequest {
  from: string;
  text: string;
  timestamp: string;
  pushname?: string;
  groupName?: string; 
}

/**
 * ABLY CLIENT PERSISTENCE
 * We initialize this outside the component to prevent "zombie" connections
 * and race conditions during React's StrictMode re-renders.
 */
const ablyClient = new Ably.Realtime('2ne0Nw.FzNQzA:0i4mI8K5WgJP5gvqaIE4fDukyZLEsGQu793ly-Ri0eY');

export const AdminPanel = () => {
  const { profile } = useAuthStore();
  const { systemKill, toggleMic, toggleSystemKill, fetchInitial } = useBroadcastStore();
  const [activeMasterId, setActiveMasterId] = useState<string | null>(null);
  const [isKicking, setIsKicking] = useState(false);
  const [requests, setRequests] = useState<RadioRequest[]>([]);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isAdmin = profile?.role === 'admin';

  // --- WHATSAPP BRIDGE CONNECTION (ABLY) ---
  useEffect(() => {
    if (!isAdmin) return;

    const requestChannel = ablyClient.channels.get('radio-messages');

    // Subscribe to incoming WhatsApp requests
    requestChannel.subscribe('incoming-request', (msg) => {
      setRequests((prev) => {
        // Prevent duplicate logs if Ably re-sends a message
        const isDuplicate = prev.some(r => r.timestamp === msg.data.timestamp && r.text === msg.data.text);
        if (isDuplicate) return prev;
        return [msg.data as RadioRequest, ...prev].slice(0, 50);
      });
    });

    return () => {
      // We only unsubscribe from the channel; we leave the global connection open
      requestChannel.unsubscribe('incoming-request');
    };
  }, [isAdmin]);

  // --- SUPABASE ADMIN SYNC ---
  useEffect(() => {
    if (!isAdmin) return;
    let mounted = true;

    const setupAdminControl = async () => {
      const { data } = await supabase.from('spotify_auth').select('id, get_spotify_token_99').limit(1).maybeSingle();
      if (mounted && data?.get_spotify_token_99) setActiveMasterId(data.id);

      const channelName = 'admin_sync_global';
      const stale = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
      if (stale) await supabase.removeChannel(stale);

      const channel = supabase.channel(channelName);
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'spotify_auth' }, (payload: any) => {
        if (!mounted) return;
        if (payload.eventType === 'DELETE' || !payload.new?.get_spotify_token_99) {
          setActiveMasterId(null);
        } else {
          setActiveMasterId(payload.new.id);
        }
      });

      channel.subscribe();
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
      await supabase.from('spotify_auth').delete().neq('id', '00000000'); 
      await supabase.rpc('reset_broadcast_system');
      await fetchInitial();
      setActiveMasterId(null);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally { setIsKicking(false); }
  };

  if (!isAdmin) return null;

  return (
    <div className="flex gap-4 h-[400px]">
      {/* LEFT: MASTER CONTROLS */}
      <div className="w-64 bg-zinc-900/95 border border-white/10 p-4 rounded shadow-2xl backdrop-blur-xl flex flex-col">
        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert size={14} className="text-orange-400" />
            <h2 className="text-[10px] font-bold uppercase text-white tracking-widest">Master Control</h2>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
            <Radio size={10} className={activeMasterId ? "text-blue-400 animate-pulse" : "text-zinc-600"} />
            <span className="text-[8px] text-blue-300 font-mono font-bold">{activeMasterId ? 'LIVE' : 'AUTO'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 flex-grow">
          <button onClick={handleForceDisconnect} disabled={isKicking} className="col-span-2 mb-2 p-3 border border-red-500/40 bg-red-950/20 rounded-lg flex items-center justify-center gap-2 hover:bg-red-500/30">
            <UserX size={16} className="text-red-500" />
            <span className="text-[9px] font-black uppercase text-red-200">Force Eject</span>
          </button>
          
          <button onClick={() => toggleSystemKill()} className={`p-3 rounded border flex flex-col items-center gap-1 transition-colors ${systemKill ? 'bg-red-600 border-white' : 'bg-zinc-800 border-white/5 hover:bg-zinc-700'}`}>
            <Power size={16} color="white" />
            <span className="text-[8px] font-bold uppercase text-white">Kill</span>
          </button>

          <button onClick={() => toggleMic()} className="p-3 rounded border bg-zinc-800 border-white/5 flex flex-col items-center gap-1 hover:bg-zinc-700 transition-colors">
            <MicOff size={16} color="white" />
            <span className="text-[8px] font-bold uppercase text-white">Muzzle</span>
          </button>
        </div>
      </div>

      {/* RIGHT: WHATSAPP REQUEST LINE */}
      <div className="flex-grow bg-zinc-900/95 border border-white/10 rounded shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-2">
            <MessageSquare size={14} className="text-green-400" />
            <h2 className="text-[10px] font-bold uppercase text-white tracking-widest">Request Line</h2>
          </div>
          <button 
            onClick={() => setRequests([])} 
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
          {requests.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-[9px] uppercase tracking-widest text-zinc-600 animate-pulse">Waiting for listener data...</p>
            </div>
          ) : (
            requests.map((req, idx) => (
              <div key={idx} className="bg-white/5 border border-white/5 p-2 rounded relative group hover:bg-white/10 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-green-400 uppercase tracking-tighter leading-none">
                      {req.pushname || 'Anonymous'}
                    </span>
                    {req.groupName && (
                      <span className="text-[7px] text-zinc-500 uppercase flex items-center gap-1 mt-1 font-bold">
                        <Users size={8} className="text-zinc-600" /> {req.groupName}
                      </span>
                    )}
                  </div>
                  <span className="text-[8px] text-zinc-500 font-mono bg-black/20 px-1 rounded">
                    {new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-200 leading-tight break-words font-medium mt-1">
                  {req.text}
                </p>
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-green-500 rounded-l opacity-50"></div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};