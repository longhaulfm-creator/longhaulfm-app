import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { NowPlaying } from '@/components/NowPlaying'
import { BroadcastControls } from '@/components/BroadcastControls'
import { AdminPanel } from '@/components/AdminPanel'
import { IntelligenceFeed } from '@/components/IntelligenceFeed'
import { PartnerPanel } from '@/components/PartnerPanel'
import { UserIdentity } from '@/components/layout/ui/UserIdentity'
import { FallbackPlayer } from '@/components/FallbackPlayer'
import { useBroadcastStore } from '@/stores/broadcastStore'
import { useAuthStore } from '@/stores/authStore'
import { useSpotifyToken } from '@/hooks/useSpotifyToken'
import { useSpotifyStreaming } from '@/hooks/useSpotifyStreaming'
import { useRadioStation } from '@/hooks/useRadioStation'
import { supabase } from '@/lib/supabase'
import { Radio, Store, ListMusic, Zap, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getVersion } from '@tauri-apps/api/app'
import { platform } from '@tauri-apps/plugin-os'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function StatPill({ label, value, colour }: { label: string; value: string; colour?: string }) {
  return (
    <div className="bg-brand border border-white/5 rounded px-2 py-1 flex flex-col justify-center min-w-0 h-11 shadow-inner flex-1">
      <span className="font-ui text-[7px] font-bold tracking-[0.2em] uppercase text-white/30 truncate leading-none">
        {label}
      </span>
      <span className="font-header text-base tracking-wide truncate leading-none mt-1" style={{ color: colour ?? '#d4af37' }}>
        {value}
      </span>
    </div>
  )
}

function Dashboard() {
  const { user, isLoading: authLoading } = useAuthStore()
  const { token } = useSpotifyToken()
  const [userRole, setUserRole] = useState<string>('subscriber')
  const [activeTab, setActiveTab] = useState<'intel' | 'partners'>('intel')
  
  const [updateData, setUpdateData] = useState<{
    version: string;
    url: string;
    notes: string;
    required: boolean;
  } | null>(null)

  // 1. Initialize the Spotify Engine and get device context
  const streaming = useSpotifyStreaming(token || '', userRole)
  
  const { isDucked } = useRadioStation()
  const { 
    isPlaying, systemKill, isFallbackActive, upcomingTracks, 
    fetchInitial, subscribeRealtime 
  } = useBroadcastStore()

  useEffect(() => {
    let isMounted = true;
    
    const initSession = async () => {
      if (user && isMounted) {
        try {
          const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
          if (data && isMounted) setUserRole(data.role)
        } catch (e) {
          console.error("Identity sync failure:", e)
        }
      }
      
      try {
        const isTauri = !!(window as any).__TAURI_INTERNALS__;
        if (isTauri && isMounted) {
          const currentPlatform = await platform()
          const currentVersion = await getVersion()
          const { data: config } = await supabase.from('app_config').select('*').eq('platform', currentPlatform).maybeSingle()

          if (config && isMounted) {
            const isNewer = config.latest_version.localeCompare(currentVersion, undefined, { numeric: true, sensitivity: 'base' }) > 0
            if (isNewer) {
              setUpdateData({
                version: config.latest_version,
                url: config.download_url,
                notes: config.release_notes,
                required: config.is_required
              })
            }
          }
        }
      } catch (err) {
        console.warn("Signal verification bypassed:", err)
      }

      fetchInitial()
    }

    initSession()
    const unsub = subscribeRealtime()
    return () => {
      isMounted = false;
      if (unsub) unsub();
    }
  }, [user, fetchInitial, subscribeRealtime])

  if (authLoading) return (
    <div className="h-screen w-screen bg-brand-dark flex items-center justify-center animate-pulse text-gold uppercase tracking-[0.5em] text-xs">
      Loading Signal...
    </div>
  )

  return (
    <div className="fixed inset-0 flex flex-col bg-brand-dark font-body text-white overflow-hidden">
      <FallbackPlayer />

      {/* BRANDED UPDATE MODAL */}
      {updateData && (
        <div className="fixed inset-0 z-[200] bg-brand-dark/95 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-black border border-gold/40 p-8 rounded-2xl max-w-sm w-full shadow-[0_0_80px_rgba(212,175,55,0.15)] text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold to-transparent opacity-50" />
            <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Zap className="text-gold fill-gold/20" size={28} />
            </div>
            <h2 className="font-header text-2xl text-white uppercase tracking-tighter mb-1">Signal Upgrade</h2>
            <p className="text-gold text-[10px] font-black uppercase tracking-[0.3em] mb-6">v{updateData.version} detected</p>
            <div className="bg-white/5 border border-white/5 rounded-lg p-4 mb-8 text-left">
              <p className="text-[8px] text-white/30 uppercase tracking-widest mb-2 font-bold font-ui">Manifest Notes</p>
              <p className="text-white/70 text-xs leading-relaxed italic font-body">{updateData.notes || "System optimizations."}</p>
            </div>
            <a href={updateData.url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-3 w-full bg-gold text-brand-dark font-black py-4 rounded-lg uppercase tracking-widest text-xs">
              Update Frequency <ExternalLink size={14} />
            </a>
            {!updateData.required && (
              <button onClick={() => setUpdateData(null)} className="mt-6 text-[9px] text-white/20 uppercase tracking-[0.3em]">Continue</button>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto lg:overflow-hidden p-2 lg:p-3 custom-scrollbar">
        
        {isFallbackActive && (
          <div className="sticky top-0 z-[110] pointer-events-none mb-3">
            <div className="bg-amber-600/20 border border-amber-500/50 px-4 py-1.5 rounded-full flex items-center justify-center gap-3 backdrop-blur-md max-w-sm mx-auto shadow-2xl">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">
                {systemKill ? 'SYSTEM TERMINATED' : 'FALLBACK SIGNAL ACTIVE'}
              </span>
            </div>
          </div>
        )}

        {/* 2. ADMIN PANEL INJECTION WITH HANDOVER PROPS */}
        {userRole === 'admin' && (
          <div className="fixed top-16 right-4 z-[100] w-72 max-w-[80vw] pointer-events-auto">
            <AdminPanel 
              deviceId={streaming.deviceId} 
              togglePlay={streaming.togglePlay} 
            />
          </div>
        )}

        <header className="flex-none mb-3">
          <UserIdentity />
        </header>

        <div className="flex gap-2 mb-3">
          <StatPill label="Signal Status" value={systemKill ? 'OFFLINE' : isPlaying ? 'LIVE' : 'IDLE'} colour={systemKill ? '#ef4444' : isPlaying ? '#22c55e' : '#3b82f6'} />
          <StatPill label="Audio Input" value={isFallbackActive ? 'STATION LOOP' : isDucked ? 'MIC ON' : 'MUSIC'} colour={isFallbackActive ? '#f59e0b' : isDucked ? '#f59e0b' : '#ffffff'} />
        </div>

        <div className="flex flex-col-reverse lg:flex-row gap-3 h-auto lg:h-[calc(100vh-220px)] min-h-0">
          <section className="flex flex-col bg-black/40 rounded-lg border border-white/5 overflow-hidden h-[450px] lg:h-full lg:flex-1 shadow-2xl">
            <div className="flex p-1 bg-black/60 border-b border-white/5 flex-none">
              <button onClick={() => setActiveTab('intel')} className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded text-[10px] font-bold uppercase tracking-widest", activeTab === 'intel' ? "bg-gold text-brand-dark" : "text-white/40")}>
                <Radio size={12} /> Intel Feed
              </button>
              <button onClick={() => setActiveTab('partners')} className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded text-[10px] font-bold uppercase tracking-widest", activeTab === 'partners' ? "bg-gold text-brand-dark" : "text-white/40")}>
                <Store size={12} /> Partner Net
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {activeTab === 'intel' ? <IntelligenceFeed /> : <PartnerPanel />}
            </div>
          </section>

          <section className="flex flex-col gap-3 lg:flex-1 lg:h-full min-h-0">
            <div className="flex-none shadow-2xl">
              <NowPlaying 
                player={streaming.player} 
                playbackState={streaming.playbackState} 
                togglePlay={streaming.togglePlay} 
                isReady={streaming.isReady} 
              />
            </div>
            <div className="bg-black/60 rounded-lg border border-white/5 p-4 flex flex-col h-[350px] lg:flex-1 lg:min-h-0 shadow-inner">
              <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2 flex-none">
                <ListMusic size={14} className="text-gold" />
                <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-white/50">Upcoming Manifest</h3>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                {upcomingTracks.length > 0 ? upcomingTracks.map((track, i) => (
                  <div key={track.id || i} className="flex gap-4 items-center opacity-40 hover:opacity-100 group">
                    <span className="font-mono text-[10px] text-white/20 group-hover:text-gold transition-colors">0{i+1}</span>
                    <div className="truncate flex-1">
                      <p className="text-[10px] font-bold uppercase truncate text-white/80">{track.name}</p>
                      <p className="text-[8px] text-white/30 truncate uppercase tracking-tighter">{track.artists[0]?.name || 'Unknown Artist'}</p>
                    </div>
                  </div>
                )) : (
                  <div className="h-full flex items-center justify-center py-10 opacity-20 italic text-[9px] uppercase tracking-widest">Awaiting Signal...</div>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="text-center mt-8 mb-6 flex flex-col items-center gap-0.5 opacity-40">
          <p className="text-[7px] font-header tracking-[0.4em] uppercase italic">Operated by the</p>
          <p className="uppercase font-black text-[10px] tracking-widest text-white">Isuhamba Group</p>
        </div>
      </main>

      <footer className="flex-none bg-brand p-3 border-t border-white/10 rounded-t-xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-50">
        {user && token ? (
          <BroadcastControls player={streaming.player} userRole={userRole} />
        ) : (
          <div className="py-2 text-center opacity-30 uppercase text-[9px] tracking-[0.4em]">Reception Only Mode</div>
        )}
      </footer>
    </div>
  )
}