import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Spinner, Empty } from '@/components/ui'
import { MapPin, Zap, ShieldCheck, Coffee, Fuel, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PartnerLocation } from '@/types'

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  truck_wash: <UserCheck size={14} />,
  convenience: <Coffee size={14} />,
  fuel: <Fuel size={14} />,
}

export function PartnerPanel() {
  // Query 1: Logistics Nodes (Locations)
  const { data: locations = [], isLoading: locLoading } = useQuery<PartnerLocation[]>({
    queryKey: ['partner-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_locations')
        .select('*')
        .order('is_spotlighted', { ascending: false })
      if (error) throw error
      return data as PartnerLocation[]
    },
    refetchInterval: 30000,
  })

  // Query 2: Network Sponsors (Advertisers Table)
  const { data: advertisers = [], isLoading: adLoading } = useQuery({
    queryKey: ['network-advertisers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('advertisers')
        .select('*')
        .eq('status', 'active')
      if (error) throw error
      return data
    }
  })

  const isLoading = locLoading || adLoading

  return (
    <div className="flex flex-col h-full bg-black/20 font-ui border-l border-white/5">
      {/* Header */}
      <div className="flex-none p-3 border-b border-white/5 bg-black/40 flex justify-between items-center">
        <div>
          <span className="text-[10px] font-black tracking-[0.2em] text-gold uppercase">
            Partner Network
          </span>
          <p className="text-[8px] text-white/30 uppercase tracking-widest mt-0.5 font-mono">
            Node Sync: Active
          </p>
        </div>
        <div className="bg-black/40 px-2 py-1 rounded border border-white/5 flex items-center gap-1.5">
          <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[7px] text-white/50 font-mono">LIVE</span>
        </div>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-20"><Spinner /></div>
        ) : (
          <>
            {/* SECTION: COMMERCIAL SPONSORS */}
            <section className="space-y-2">
              <h3 className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] px-1">Network Sponsors</h3>
              <div className="grid grid-cols-1 gap-1.5">
                {advertisers.map((ad) => (
                  <div key={ad.id} className="bg-white/5 border border-white/5 p-2 rounded flex justify-between items-center group hover:border-gold/30 transition-all">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase text-white/70 group-hover:text-gold transition-colors">{ad.company_name}</span>
                      <span className="text-[6px] text-white/20 uppercase font-mono tracking-tighter">ID: {ad.id.split('-')[0]}</span>
                    </div>
                    <span className={cn(
                      "text-[7px] px-1.5 py-0.5 rounded border font-black uppercase tracking-tighter",
                      ad.subscription_tier === 'premium' ? "border-gold/50 text-gold bg-gold/5" : "border-white/10 text-white/30"
                    )}>
                      {ad.subscription_tier}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* SECTION: LOGISTICS NODES */}
            <section className="space-y-3">
              <h3 className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] px-1">Logistics Nodes</h3>
              {locations.map((loc) => (
                <div key={loc.id} className={cn(
                  "relative border rounded overflow-hidden transition-all duration-500",
                  loc.is_spotlighted ? "bg-gold/5 border-gold/50 shadow-[0_0_25px_rgba(212,175,55,0.1)]" : "bg-white/5 border-white/5"
                )}>
                  <div className="p-3">
                    <div className="flex justify-between items-start mb-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-header text-sm text-white tracking-tighter uppercase truncate leading-none">
                            {loc.name}
                          </h4>
                          {loc.is_spotlighted && <ShieldCheck size={12} className="text-gold" />}
                        </div>
                        <div className="flex items-center gap-1 mt-1.5">
                          <MapPin size={10} className="text-white/20" />
                          <span className="text-[8px] text-white/40 font-mono uppercase tracking-widest">
                            {loc.route || 'N3 Corridor'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-px bg-white/5 rounded border border-white/5 overflow-hidden">
                      <div className="bg-black/40 p-2">
                        <span className="text-[7px] text-white/20 uppercase font-bold block mb-1">Diesel</span>
                        <span className="text-xs font-header text-gold">R {loc.fuel_price_zar?.toFixed(2) || '--.--'}</span>
                      </div>
                      <div className="bg-black/40 p-2">
                        <span className="text-[7px] text-white/20 uppercase font-bold block mb-1">Bays</span>
                        <span className="text-xs font-header text-white">{loc.bays_available ?? 0} <span className="text-[8px] opacity-30 font-ui font-normal ml-1">FREE</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          </>
        )}
      </div>

      {/* Network ID Footer */}
      <div className="p-2 border-t border-white/5 bg-black/40 text-center">
        <span className="text-[6px] text-white/10 uppercase tracking-[0.5em] font-black">
          Commercial Data Uplink // Long Haul FM
        </span>
      </div>
    </div>
  )
}