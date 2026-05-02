import React, { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { Chrome, Mail, Lock, Loader2 } from 'lucide-react'

// This export is required by TanStack Router to clear the build error in image_a5dfbd.png
export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { signIn, signUp, signInWithSocial, isLoading } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    const authError = isSignUp 
      ? await signUp(email, password)
      : await signIn(email, password)
      
    if (authError) setError(authError)
  }

  const handleGoogleLogin = async () => {
    setError(null)
    const authError = await signInWithSocial('google')
    if (authError) setError(authError)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4 text-white">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tighter mb-2">LONGHAUL FM</h1>
          <p className="text-white/40 text-sm uppercase tracking-[0.2em]">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-white/40 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-white/40 transition-colors"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-white/40 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-white/40 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-xs mt-2 text-center bg-red-400/10 py-2 rounded border border-red-400/20">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-white/90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : (isSignUp ? 'REGISTER' : 'SIGN IN')}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-[#0a0a0a] px-4 text-white/30 tracking-widest">Or continue with</span>
            </div>
          </div>

          {/* Social Sign In - Google Only */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-4 bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-lg transition-all active:scale-95 group"
          >
            <Chrome size={18} className="text-white/40 group-hover:text-white transition-colors" />
            <span className="font-bold text-[12px] tracking-widest uppercase text-white/80 group-hover:text-white">
              Sign in with Google
            </span>
          </button>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[11px] uppercase tracking-widest text-white/40 hover:text-white transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}