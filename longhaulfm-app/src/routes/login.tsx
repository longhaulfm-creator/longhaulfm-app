import { useState, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { Eye, EyeOff, Lock, Mail, ShieldAlert, Chrome, Facebook } from 'lucide-react'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const { user, signIn, signInWithSocial, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate({ to: '/' })
    }
  }, [user, navigate])

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!email || !password) return
    
    setError(null)
    const err = await signIn(email, password)
    if (err) {
      setError(err)
    }
  }

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setError(null)
    const err = await signInWithSocial(provider)
    if (err) {
      setError(err)
    }
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-brand-dark p-4 overflow-hidden relative">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gold/5 via-transparent to-transparent opacity-50" />

      <div className="relative z-10 w-full max-w-sm flex flex-col gap-6 p-8 bg-brand border border-white/10 rounded-xl shadow-2xl animate-fade-in">
        <div className="text-center flex flex-col gap-1">
          <h1 className="font-header text-3xl tracking-[0.2em] text-gold uppercase">🚛 LONG HAUL</h1>
          <p className="font-ui text-[9px] tracking-[0.3em] uppercase text-white/40 font-bold">KZN OPS CENTER</p>
        </div>

        {/* --- SOCIAL LOGIN SECTION --- */}
        <div className="flex flex-col gap-3">
          <p className="font-ui text-[8px] text-center uppercase tracking-[0.2em] text-white/20">Join the Crew</p>
          <div className="grid grid-cols-2 gap-3">
            {/* Google Login */}
            <button 
              onClick={() => handleSocialLogin('google')}
              className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-lg transition-all active:scale-95 group"
            >
              <Chrome size={16} className="text-white/40 group-hover:text-white transition-colors" />
              <span className="font-header text-[10px] tracking-widest uppercase text-white/80 group-hover:text-white">Google</span>
            </button>

            {/* Facebook Login */}
            <button 
              onClick={() => handleSocialLogin('facebook')}
              className="flex items-center justify-center gap-2 bg-[#1877F2]/10 border border-[#1877F2]/20 hover:bg-[#1877F2]/20 py-3 rounded-lg transition-all active:scale-95 group"
            >
              <Facebook size={16} className="text-[#1877F2] opacity-80 group-hover:opacity-100" fill="currentColor" />
              <span className="font-header text-[10px] tracking-widest uppercase text-white/80 group-hover:text-white">Facebook</span>
            </button>
          </div>
        </div>

        {/* --- SEPARATOR --- */}
        <div className="flex items-center gap-4">
          <div className="h-[1px] flex-1 bg-white/5" />
          <span className="font-ui text-[8px] uppercase text-white/10 tracking-widest">OR</span>
          <div className="h-[1px] flex-1 bg-white/5" />
        </div>

        {/* --- TRADITIONAL LOGIN --- */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-ui text-[9px] font-bold uppercase text-white/30 tracking-widest px-1">Operator Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                className={cn(
                  'w-full bg-brand-dark border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white font-ui text-xs focus:outline-none focus:border-gold transition-all',
                  error && 'border-signal-red bg-signal-red/5'
                )}
                type="email"
                placeholder="driver@longhaulfm.co.za"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-ui text-[9px] font-bold uppercase text-white/30 tracking-widest px-1">Security Key</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                className={cn(
                  'w-full bg-brand-dark border border-white/10 rounded-lg py-3 pl-10 pr-12 text-white font-ui text-xs focus:outline-none focus:border-gold transition-all',
                  error && 'border-signal-red bg-signal-red/5'
                )}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-gold"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center justify-center gap-2 text-signal-red">
              <ShieldAlert size={14} />
              <p className="text-[9px] font-bold uppercase tracking-tight">{error}</p>
            </div>
          )}

          <Button
            className="w-full h-12 mt-2 font-header tracking-[0.2em] text-sm bg-gold text-brand-dark hover:bg-gold-bright transition-all active:scale-95"
            loading={isLoading}
            type="submit"
          >
            ENGAGE SYSTEM
          </Button>

          <p className="text-[8px] text-center text-white/10 font-ui uppercase tracking-[0.1em] mt-2">
            Authorized Personnel Only — Session Logged
          </p>
        </form>
      </div>
    </div>
  )
}