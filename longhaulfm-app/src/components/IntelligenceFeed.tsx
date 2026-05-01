import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  ShieldAlert, 
  MessageSquare, 
  MapPin, 
  Clock, 
  Phone, 
  AlertCircle, 
  ArrowBigUpDash, 
  ShieldCheck,
  Loader2
} from 'lucide-react'

// Interfaces to keep our data typed
interface RoadAlert {
  id: string
  category: string
  location: string
  message: string
  is_verified: boolean
  province: string
  created_at: string
}

interface WhatsAppLog {
  id: string
  sender_name: string
  message_content: string
  created_at: string
}

export function IntelligenceFeed() {
  const [alerts, setAlerts] = useState<RoadAlert[]>([])
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppLog[]>([])
  const [view, setView] = useState<'alerts' | 'whatsapp'>('whatsapp')
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const channelRef = useRef<any>(null)

  // 1. Check Permissions on Mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      // In your system, if a user is logged in to this dashboard, they are likely an admin/op
      if (user) setIsAdmin(true)
    }
    checkAuth()
  }, [])

  // 2. Fetch Initial Data & Setup Realtime
  useEffect(() => {
    const fetchData = async () => {
      const { data: roadData } = await supabase
        .from('road_alerts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      
      if (roadData) setAlerts(roadData)

      const { data: waData } = await supabase
        .from('whatsapp_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30)
      
      if (waData) setWhatsappLogs(waData)
    }

    fetchData()

    const channel = supabase.channel('intel_stream_central')

    channel.on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'whatsapp_logs' }, 
      (payload) => {
        setWhatsappLogs((prev) => [payload.new as WhatsAppLog, ...prev].slice(0, 30))
      }
    )

    channel.on('postgres_changes', 
      { event: '*', schema: 'public', table: 'road_alerts' }, 
      (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setAlerts((prev) => {
            const filtered = prev.filter(a => a.id !== payload.new.id)
            return [payload.new as RoadAlert, ...filtered].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
          })
        }
      }
    )

    channel.subscribe()
    channelRef.current = channel

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [])

  // 3. Admin Function: Promote WhatsApp message to Verified Road Alert
  const pushToVerified = async (log: WhatsAppLog) => {
    setIsProcessing(log.id)
    try {
      const { error } = await supabase
        .from('road_alerts')
        .insert([{
          message: log.message_content,
          category: 'FIELD REPORT',
          location: 'WHATSAPP UPLINK',
          province: 'KZN',
          is_verified: true,
          is_active: true,
          alert_type: 'incident'
        }])

      if (error) throw error
      
      // Visual feedback: switch to alerts tab to see the result
      setTimeout(() => setView('alerts'), 500)
    } catch (err) {
      console.error('Promotion failed:', err)
    } finally {
      setIsProcessing(null)
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-brand-dark/40 rounded-lg border border-white/5 overflow-hidden backdrop-blur-sm">
      
      {/* TACTICAL TABS */}
      <div className="flex border-b border-white/5 h-10 flex-none bg-black/40">
        <button 
          onClick={() => setView('alerts')}
          className={`flex-1 flex items-center justify-center gap-2 font-ui text-[9px] tracking-widest uppercase transition-all ${
            view === 'alerts' 
              ? 'bg-gold/10 text-gold font-bold border-gold border-b-2' 
              : 'text-white/20 hover:text-white/40'
          }`}
        >
          <ShieldAlert size={12} /> 
          VERIFIED ({alerts.filter(a => a.is_verified).length})
        </button>
        <button 
          onClick={() => setView('whatsapp')}
          className={`flex-1 flex items-center justify-center gap-2 font-ui text-[9px] tracking-widest uppercase transition-all ${
            view === 'whatsapp' 
              ? 'bg-green-500/10 text-green-500 font-bold border-green-500 border-b-2' 
              : 'text-white/20 hover:text-white/40'
          }`}
        >
          <MessageSquare size={12} /> 
          WHATSAPP FEED ({whatsappLogs.length})
        </button>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-3 bg-black/20 custom-scrollbar min-h-0">
        {view === 'whatsapp' ? (
          /* WHATSAPP VIEW */
          whatsappLogs.length > 0 ? (
            <div className="space-y-2">
              {whatsappLogs.map((log) => (
                <div key={log.id} className="group relative bg-zinc-900/40 border border-white/5 p-3 rounded-sm transition-all hover:bg-zinc-900/60">
                  
                  {/* ADMIN ACTION: VERIFY & PUSH */}
                  {isAdmin && (
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        disabled={isProcessing === log.id}
                        onClick={() => pushToVerified(log)}
                        className="flex items-center gap-1.5 bg-gold text-black px-2 py-1 rounded-[2px] text-[8px] font-bold uppercase hover:bg-white transition-all disabled:opacity-50"
                      >
                        {isProcessing === log.id ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <><ArrowBigUpDash size={10} /> Verify & Push</>
                        )}
                      </button>
                    </div>
                  )}

                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center">
                        <Phone size={10} className="text-green-500" />
                      </div>
                      <span className="text-white font-bold text-[10px] uppercase tracking-tight">
                        {log.sender_name || 'Radio Dispatch'}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-white/30">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-white/70 font-ui text-xs leading-relaxed italic pr-12">
                    "{log.message_content}"
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<MessageSquare size={32} />} label="No Active Comms" />
          )
        ) : (
          /* ALERTS / VERIFIED VIEW */
          alerts.length > 0 ? (
            <div className="space-y-2">
              {alerts.map((a) => (
                <div 
                  key={a.id} 
                  className={`p-3 rounded-sm border-l-2 transition-all ${
                    a.is_verified ? 'bg-gold/5 border-gold shadow-[inset_4px_0_10px_rgba(255,215,0,0.05)]' : 'bg-zinc-900/40 border-white/10'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck size={10} className={a.is_verified ? 'text-gold' : 'text-white/40'} />
                      <span className={`text-[10px] font-bold uppercase tracking-tighter ${a.is_verified ? 'text-gold' : 'text-white/60'}`}>
                        {a.category} // {a.location}
                      </span>
                    </div>
                    {a.is_verified && (
                      <span className="bg-gold/20 text-gold text-[7px] px-1 py-0.5 rounded uppercase font-bold">Verified Intel</span>
                    )}
                  </div>
                  <p className="text-white text-[11px] font-ui leading-snug mb-2">
                    {a.message}
                  </p>
                  <div className="flex items-center gap-3 text-[8px] text-white/30 uppercase font-mono">
                    <span className="flex items-center gap-1"><MapPin size={8} /> {a.province}</span>
                    <span className="flex items-center gap-1"><Clock size={8} /> {new Date(a.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<ShieldAlert size={32} />} label="No Intel Reported" />
          )
        )}
      </div>
      
      {/* FOOTER UPLINK STATUS */}
      <div className="h-6 bg-black/60 border-t border-white/5 px-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[7px] text-white/40 uppercase tracking-[0.2em]">Node Sync: Active</span>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && <span className="text-[7px] text-gold uppercase font-bold tracking-widest">Admin Privileges Active</span>}
          <span className="text-[7px] text-white/20 uppercase font-mono">Uplink-v3.0.5</span>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center py-20 opacity-20">
      {icon}
      <p className="text-[9px] tracking-[0.3em] uppercase mt-2">{label}</p>
    </div>
  )
}