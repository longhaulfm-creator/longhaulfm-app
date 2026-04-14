import { useAuthStore } from '@/stores/authStore'
import { LogIn, User as UserIcon, LogOut, Loader2 } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export function UserIdentity() {
  const { user, signOut, isLoading, session } = useAuthStore()
  const navigate = useNavigate()

  // Diagnostic log - check your browser console for this!
  useEffect(() => {
    console.log("Current Auth User:", user?.email)
  }, [user])

  const handleLoginClick = () => {
    navigate({ to: '/login' })
  }

  return (
    <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-lg px-3 py-2 shrink-0 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${user ? 'bg-gold/20 border-gold/40' : 'bg-white/5 border-white/10'}`}>
          {isLoading ? (
            <Loader2 size={16} className="text-gold animate-spin" />
          ) : (
            <UserIcon size={16} className={user ? 'text-gold' : 'text-white/20'} />
          )}
        </div>
        
        <div className="flex flex-col">
          <span className="font-ui text-[9px] text-white/30 uppercase tracking-[0.2em] leading-none">
            {user ? 'Authenticated Operator' : 'Network Status'}
          </span>
          <span className="font-header text-xs text-white uppercase tracking-widest leading-none mt-1">
            {user ? (user.email?.split('@')[0]) : 'Anonymous Listener'}
          </span>
        </div>
      </div>

      {user ? (
        <button 
          onClick={() => signOut()}
          className="group flex items-center gap-2 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/40 px-3 py-1.5 rounded-md transition-all"
        >
          <span className="font-header text-[9px] tracking-widest uppercase text-white/40 group-hover:text-red-500 transition-colors">Disconnect</span>
          <LogOut size={14} className="text-white/20 group-hover:text-red-500" />
        </button>
      ) : (
        <button 
          onClick={handleLoginClick}
          className="flex items-center gap-2 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 px-4 py-1.5 rounded-md transition-all active:scale-95 shadow-lg shadow-gold/5"
        >
          <LogIn size={14} />
          <span className="font-header text-[10px] tracking-widest uppercase">Join Crew</span>
        </button>
      )}
    </div>
  )
}