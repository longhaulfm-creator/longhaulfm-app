import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export const WhatsAppFeed = () => {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    // 1. Initial Load
    const load = async () => {
      const { data } = await supabase
        .from('whatsapp_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) setLogs(data);
    };
    load();

    // 2. Realtime Subscription
    const sub = supabase
      .channel('live-whatsapp')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_logs' }, 
      (p) => setLogs(prev => [p.new, ...prev]))
      .subscribe();

    return () => { supabase.removeChannel(sub) };
  }, []);

  return (
    <div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-[400px]">
      {logs.map((msg) => (
        <div key={msg.id} className="bg-white/5 border border-white/10 p-2 rounded">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] font-bold text-gold/80">{msg.sender_name}</span>
            <span className="text-[8px] text-white/20">
              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="text-[10px] text-white/80 leading-tight">{msg.message_content}</p>
        </div>
      ))}
    </div>
  );
};