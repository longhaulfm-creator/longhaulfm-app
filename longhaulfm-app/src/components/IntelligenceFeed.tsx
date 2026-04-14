import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ShieldAlert, MessageSquare, MapPin, Clock, Phone } from 'lucide-react'

export function IntelligenceFeed() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [whatsappLogs, setWhatsappLogs] = useState<any[]>([]) // New state for WhatsApp
  const [view, setView] = useState<'alerts' | 'whatsapp'>('alerts')

  useEffect(() => {
    // 1. Initial Data Fetch
    const fetchData = async () => {
      // Fetch Verified Alerts
      const { data: roadData } = await supabase
        .from('road_alerts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (roadData) setAlerts(roadData)

      // Fetch WhatsApp Logs
      const { data: waData } = await supabase
        .from('whatsapp_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30)
      if (waData) setWhatsappLogs(waData)
    }
    fetchData()

    // 2. Realtime Subscriptions
    const roadChannel = supabase
      .channel('road_alerts_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'road_alerts' }, 
        (payload) => setAlerts((prev) => [payload.new, ...prev])
      )
      .subscribe()

    const waChannel = supabase
      .channel('whatsapp_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_logs' }, 
        (payload) => setWhatsappLogs((prev) => [payload.new, ...prev])
      )
      .subscribe()

    return () => { 
      supabase.removeChannel(roadChannel)
      supabase.removeChannel(waChannel)
    }
  }, [])

  return (
    <div className="flex flex-col h-full w-full bg-brand-dark/40 rounded-lg border border-white/5 overflow-hidden">
      {/* TACTICAL TABS */}
      <div className="flex border-b border-white/5 h-10 flex-none bg-brand/50">
        <button 
          onClick={() => setView('alerts')}
          className={`flex-1 flex items-center justify-center gap-2 font-ui text-[9px] tracking-widest uppercase transition-all ${view === 'alerts' ? 'bg-gold/10 text-gold font-bold border-b-2 border-gold' : 'text-white/20'}`}
        >
          <ShieldAlert size={12} /> VERIFIED
        </button>
        <button 
          onClick={() => setView('whatsapp')}
          className={`flex-1 flex items-center justify-center gap-2 font-ui text-[9px] tracking-widest uppercase transition-all ${view === 'whatsapp' ? 'bg-green-500/10 text-green-500 font-bold border-b-2 border-green-500' : 'text-white/20'}`}
        >
          <MessageSquare size={12} /> INTEL FEED
        </button>
      </div>

      {/* THE SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 bg-black/20">
        {view === 'alerts' ? (
          alerts.length > 0 ? (
            alerts.map((alert) => (
              <div key={alert.id} className="bg-brand border-l-2 border-gold p-3 rounded-r shadow-sm">
                <div className="flex justify-between items-start mb-1.5">
                  <span className="bg-gold/10 text-gold text-[8px] font-bold px-1.5 py-0.5 rounded border border-gold/20 uppercase tracking-widest">
                    {alert.category}
                  </span>
                  <div className="flex items-center gap-1 text-white/20 text-[9px]">
                    <Clock size={10} />
                    {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <p className="text-white font-ui text-xs leading-relaxed mb-2 uppercase tracking-wide">{alert.message}</p>
                <div className="flex items-center gap-1.5 text-white/40 text-[9px] font-bold italic">
                  <MapPin size={11} className="text-gold" />
                  {alert.location}
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex items-center justify-center text-white/10 font-ui text-[10px] uppercase tracking-[0.2em]">
              Scanning for alerts...
            </div>
          )
        ) : (
          /* WHATSAPP INTEL LOGS */
          whatsappLogs.length > 0 ? (
            whatsappLogs.map((log) => (
              <div key={log.id} className="bg-zinc-900/40 border border-white/5 p-3 rounded hover:border-green-500/30 transition-colors">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Phone size={8} className="text-green-500" />
                    </div>
                    <span className="text-white/80 font-bold text-[9px] uppercase tracking-tighter">
                      {log.sender_name || 'Anonymous User'}
                    </span>
                  </div>
                  <span className="text-[8px] text-white/20 font-mono">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-white/60 font-ui text-[11px] leading-tight selection:bg-green-500/30">
                  {log.message_content}
                </p>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-10">
              <MessageSquare size={32} className="mb-2" />
              <p className="font-header text-[10px] tracking-[0.4em] uppercase">No Comms Activity</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}