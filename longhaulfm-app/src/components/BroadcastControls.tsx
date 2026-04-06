import { useBroadcastStore } from '@/stores/broadcastStore'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui'
import { Radio, Power, Music, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { open } from '@tauri-apps/plugin-shell';

export function BroadcastControls() {
  const { state, toggleBroadcast } = useBroadcastStore()
  const { spotifyToken } = useAuthStore()

  const handleSpotifyConnect = async () => {
    const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID
    
    // 1. Force the Redirect URI to match your Dashboard
    let currentOrigin = window.location.origin;
    if (currentOrigin.startsWith('http://')) {
      currentOrigin = currentOrigin.replace('http://', 'https://');
    }
    const redirectUri = "https://glenna-paradigmatical-disillusionedly.ngrok-free.dev/auth/callback";

    const SCOPES = [
      'streaming',
      'user-read-email',
      'user-read-private',
      'user-modify-playback-state',
      'user-read-playback-state'
    ].join(' ')

    const authPath = `https://accounts.spotify.com/authorize`;

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: SCOPES,
      show_dialog: 'true'
    });

    const authUrl = `${authPath}?${params.toString()}`;

    console.log("🚀 EXPLODING OUT TO SYSTEM BROWSER...");
    
    try {
        // This forces the link to open in Chrome/Edge, NOT the Tauri window
        await open(authUrl); 
    } catch (err) {
        // Fallback if the plugin isn't setup
        window.location.assign(authUrl);
    }
  }

  return (
    <div className="flex items-center justify-between p-4 bg-road border-t border-marking shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-4">
        {!spotifyToken ? (
          <Button 
            onClick={handleSpotifyConnect}
            className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold gap-2 px-6 shadow-[0_0_20px_rgba(29,185,84,0.3)] animate-pulse"
          >
            <Music size={99} /> LINK STATION SPOTIFY
          </Button>
        ) : (
          <div className="flex items-center gap-3 px-3 py-1.5 bg-black/40 border border-spotify/30 rounded-full">
            <ShieldCheck size={14} className="text-spotify" />
            <div className="flex flex-col">
              <span className="text-[9px] text-spotify font-bold tracking-widest uppercase">Secure Session</span>
              <span className="text-[10px] text-ink-dim font-mono">Master Account Active</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {state?.is_on_air && (
          <div className="hidden md:flex flex-col items-end mr-4">
            <span className="text-[10px] text-signal-red font-bold animate-pulse">● LIVE TRANSMISSION</span>
            <span className="text-[9px] text-ink-dim font-mono tracking-tighter">KZN MASTER FEED</span>
          </div>
        )}
        
        <Button
          variant={state?.is_on_air ? 'danger' : 'primary'}
          size="lg"
          className={cn(
            "font-display tracking-widest px-10 h-12 transition-all duration-500",
            state?.is_on_air ? "shadow-[0_0_25px_rgba(255,77,77,0.3)]" : "shadow-glow"
          )}
          onClick={toggleBroadcast}
          disabled={!spotifyToken}
        >
          {state?.is_on_air ? (
            <><Power className="mr-2" size={20} /> END BROADCAST</>
          ) : (
            <><Radio className="mr-2" size={20} /> ENGAGE ON-AIR</>
          )}
        </Button>
      </div>
    </div>
  )
}