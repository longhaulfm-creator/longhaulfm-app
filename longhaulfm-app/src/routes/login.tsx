import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { Eye, EyeOff, Lock, Mail, Music } from 'lucide-react'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const { signIn, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!email || !password) return
    setError(null)
    
    const err = await signIn(email, password)
    if (err) {
      setError(err)
    } else {
      // After Supabase login, we stay here to ensure they connect Spotify 
      // or you can auto-navigate if already connected.
      navigate({ to: '/' })
    }
  }

  // ✅ DYNAMIC SPOTIFY LOGIN LOGIC
  const handleSpotifyLogin = () => {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID
    if (!clientId) {
      setError("Missing Spotify Client ID")
      return
    }

    // This detects if you are on ngrok or localhost automatically
    const redirectUri = window.location.origin + "/auth/callback"
    
    const scopes = [
      "streaming",
      "user-read-email",
      "user-read-private",
      "user-modify-playback-state",
      "user-read-playback-state"
    ].join(" ")

    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&show_dialog=true`

    // Redirect the entire window to Spotify
    window.location.href = authUrl
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="road-texture h-screen w-screen flex items-center justify-center bg-asphalt p-4 overflow-hidden">
      <div className="fixed inset-x-0 top-0 h-1 bg-amber shadow-[0_0_15px_rgba(245,166,35,0.6)]" />
      <div className="fixed inset-x-0 bottom-0 h-1 bg-amber/20" />

      <div className="relative z-10 w-full max-w-sm flex flex-col gap-8 p-10 bg-road/95 border border-marking rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-sm animate-fade-in">
        
        <div className="text-center flex flex-col gap-2">
          <h1 className="font-display text-4xl md:text-5xl tracking-widest text-amber drop-shadow-glow">
            🚛 LONG HAUL
          </h1>
          <p className="font-ui text-[10px] tracking-[0.3em] uppercase text-ink-dim font-bold">
            KZN OPS CENTER
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="font-ui text-xs font-bold tracking-widest uppercase text-ink-muted px-1">
              Presenter Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-dim" />
              <input
                className={cn(
                  'w-full bg-black/40 border border-marking rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-amber transition-all',
                  error && 'border-signal-red bg-signal-red/5'
                )}
                type="email"
                placeholder="driver@longhaulfm.co.za"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={handleKey}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-ui text-xs font-bold tracking-widest uppercase text-ink-muted px-1">
              Security Key
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-dim" />
              <input
                className={cn(
                  'w-full bg-black/40 border border-marking rounded-lg py-3 pl-10 pr-12 text-white focus:outline-none focus:border-amber transition-all',
                  error && 'border-signal-red bg-signal-red/5'
                )}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKey}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim hover:text-amber transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-signal-red text-center animate-shake">{error}</p>}

          <Button
            variant="primary"
            className="w-full h-12 mt-2 font-display tracking-widest text-base shadow-[0_0_20px_rgba(245,166,35,0.2)]"
            loading={isLoading}
            onClick={handleSubmit}
          >
            ENGAGE SYSTEM
          </Button>

          {/* 🎵 SPOTIFY CONNECTOR */}
          <div className="relative py-4 flex items-center">
            <div className="flex-grow border-t border-marking"></div>
            <span className="flex-shrink mx-4 font-ui text-[9px] text-ink-dim tracking-widest uppercase">External Link</span>
            <div className="flex-grow border-t border-marking"></div>
          </div>

          <button
            onClick={handleSpotifyLogin}
            className="w-full h-12 flex items-center justify-center gap-3 bg-[#1DB954] hover:bg-[#1ed760] text-black font-display tracking-widest text-sm rounded-lg transition-all active:scale-95"
          >
            <Music size={18} fill="black" />
            CONNECT SPOTIFY
          </button>
        </div>
      </div>
    </div>
  )
}