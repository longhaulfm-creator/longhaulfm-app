import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { NowPlaying } from '@/components/NowPlaying'
import { AdminPanel } from '@/components/AdminPanel'
import { IntelligenceFeed } from '@/components/IntelligenceFeed'
import { PartnerPanel } from '@/components/PartnerPanel'
import { UserIdentity } from '@/components/layout/ui/UserIdentity'
import { FallbackPlayer } from '@/components/FallbackPlayer'
import { BroadcastControls } from '@/components/BroadcastControls'
import { useBroadcastStore } from '@/stores/broadcastStore'
import { useAuthStore } from '@/stores/authStore'
import { useSpotifyToken } from '@/hooks/useSpotifyToken'
import { useSpotifyStreaming } from '@/hooks/useSpotifyStreaming'
import { useRadioStation } from '@/hooks/useRadioStation'
import { useAdInterceptor } from '@/hooks/useAdInterceptor' 
import { supabase } from '@/lib/supabase'
import { ListMusic } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getVersion } from '@tauri-apps/api/app'
import { platform } from '@tauri-apps/plugin-os'
import { Logo } from '@/components/Logo'

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
  const [, setUpdateData] = useState<any>(null)

  const streaming = useSpotifyStreaming(token || '', userRole)
  const { isDucked } = useRadioStation()
  
  // Initialize Background Ad Listener
  useAdInterceptor();

  const { 
    isPlaying, systemKill, isFallbackActive, upcomingTracks, 
    fetchInitial, subscribeRealtime, listenerCount 
  } = useBroadcastStore()

  useEffect(() => {
    let isMounted = true;
    fetchInitial();

    const syncRole = async () => {
      if (user) {
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (data && isMounted) setUserRole(data.role || 'subscriber')
      }
    }
    syncRole();

    const checkUpdates = async () => {
       try {
         const isTauri = !!(window as any).__TAURI_INTERNALS__;
         if (isTauri && isMounted) {
           const currentPlatform = await platform()
           const currentVersion = await getVersion()
           const { data: config } = await supabase.from('app_config').select('*').eq('platform', currentPlatform).maybeSingle()
           if (config && config.latest_version !== currentVersion) {
              setUpdateData(config);
           }
         }
       } catch (e) { console.warn("Update check bypassed"); }
    }
    checkUpdates();

    const unsub = subscribeRealtime();
    return () => { 
      isMounted = false; 
      if (unsub) unsub(); 
    }
  }, [user, fetchInitial, subscribeRealtime]);

  if (authLoading) return (
    <div className="h-screen w-screen bg-brand-dark flex items-center justify-center animate-pulse text-gold uppercase tracking-[0.5em] text-xs">
      Loading Signal...
    </div>
  )

  return (
    <div className="fixed inset-0 flex flex-col bg-brand-dark font-body text-white overflow-hidden">
      <FallbackPlayer />

      <main className="flex-1 overflow-y-auto p-3 lg:p-6 custom-scrollbar">
        
        {isFallbackActive && (
          <div className="sticky top-0 z-[110] pointer-events-none mb-6 text-center">
            <div className="inline-flex bg-amber-600/20 border border-amber-500/50 px-4 py-1.5 rounded-full items-center gap-3 backdrop-blur-md shadow-2xl">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">
                {systemKill ? 'SYSTEM TERMINATED' : 'FALLBACK SIGNAL ACTIVE'}
              </span>
            </div>
          </div>
        )}

        <header className="relative flex-none mb-6 flex items-center justify-between min-h-[80px]">
          <UserIdentity />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <Logo className="h-16 lg:h-20" />
          </div>
          <div className="hidden lg:block w-72">
            {userRole === 'admin' && <AdminPanel deviceId={streaming.deviceId} togglePlay={streaming.togglePlay} />}
          </div>
        </header>

        <div className="flex gap-2 mb-6">
          <StatPill label="Signal Status" value={systemKill ? 'OFFLINE' : isPlaying ? 'LIVE' : 'IDLE'} colour={systemKill ? '#ef4444' : isPlaying ? '#22c55e' : '#3b82f6'} />
          <StatPill label="Audio Input" value={isFallbackActive ? 'STATION LOOP' : isDucked ? 'MIC ON' : 'MUSIC'} colour={isFallbackActive ? '#f59e0b' : '#ffffff'} />
          <StatPill label="Listeners" value={listenerCount.toString()} colour={listenerCount > 0 ? '#22c55e' : '#ffffff20'} />
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 min-h-0">
          <section className="flex flex-col bg-black/40 rounded-lg border border-white/5 overflow-hidden h-[500px] lg:h-[600px]">
            <div className="flex p-1 bg-black/60 border-b border-white/5">
              <button onClick={() => setActiveTab('intel')} className={cn("flex-1 py-3 text-[10px] font-bold uppercase tracking-widest", activeTab === 'intel' ? "bg-gold text-brand-dark" : "text-white/40")}>Intel Feed</button>
              <button onClick={() => setActiveTab('partners')} className={cn("flex-1 py-3 text-[10px] font-bold uppercase tracking-widest", activeTab === 'partners' ? "bg-gold text-brand-dark" : "text-white/40")}>Partner Net</button>
            </div>
            <div className="flex-1 overflow-hidden">
              {activeTab === 'intel' ? <IntelligenceFeed /> : <PartnerPanel />}
            </div>
          </section>

          <section className="flex flex-col gap-6">
            <NowPlaying 
              player={streaming.player} 
              playbackState={streaming.playbackState} 
              togglePlay={streaming.togglePlay} 
              isReady={streaming.isReady} 
            />
            
            <div className="bg-black/60 rounded-lg border border-white/5 p-5 flex flex-col flex-1 min-h-0">
              <div className="flex items-center gap-3 mb-5 border-b border-white/5 pb-3">
                <ListMusic size={16} className="text-gold" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/50">Upcoming Manifest</h3>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
                {upcomingTracks.length > 0 ? upcomingTracks.map((track, i) => {
                  const name = track.name || track.title;
                  let artist = 'Unknown Artist';
                  if (track.artist) artist = track.artist;
                  else if (Array.isArray(track.artists)) artist = track.artists.map((a: any) => a.name || a).join(', ');
                  
                  return (
                    <div key={i} className="flex gap-4 items-center opacity-60">
                      <span className="font-mono text-[10px] text-gold">0{i+1}</span>
                      <div className="truncate">
                        <p className="text-[11px] font-bold uppercase truncate text-white">{name}</p>
                        <p className="text-[9px] text-white/30 truncate uppercase tracking-widest">{artist}</p>
                      </div>
                    </div>
                  )
                }) : (
                  <div className="h-full flex items-center justify-center opacity-20 text-[10px] uppercase tracking-[0.4em]">Awaiting Signal...</div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="bg-brand p-4 border-t border-white/10 flex flex-col gap-3">
        {user && token ? (
          <BroadcastControls player={streaming.player} userRole={userRole} />
        ) : (
          <div className="py-2 text-center opacity-40 uppercase text-[10px] font-bold tracking-[0.6em]">Reception Only Mode</div>
        )}
        
        {/* Restored Branding Footer */}
        <div className="flex items-center justify-center pt-2 border-t border-white/5">
          <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-white/20">
            Powered by the <span className="text-white/40">Isuhamba Group</span>
          </p>
        </div>
      </footer>
    </div>
  )
}