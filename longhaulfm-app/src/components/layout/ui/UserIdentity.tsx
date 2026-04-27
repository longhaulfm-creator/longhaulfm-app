import { useAuthStore } from '@/stores/authStore'
import { User as UserIcon, LogOut, Loader2, LogIn } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export function UserIdentity() {
  const { user, signOut, isLoading } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.email) console.log("👤 Operator Session:", user.email);
  }, [user?.email]);

  return (
    <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-lg px-3 py-2 shrink-0 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${user ? 'bg-gold/20 border-gold/40' : 'bg-white/5 border-white/10'}`}>
          {isLoading ? <Loader2 size={16} className="animate-spin text-gold" /> : <UserIcon size={16} className={user ? 'text-gold' : 'text-white/20'} />}
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] text-white/30 uppercase tracking-[0.2em]">{user ? 'Authenticated' : 'Network'}</span>
          <span className="text-xs text-white uppercase tracking-widest mt-1">{user ? user.email?.split('@')[0] : 'Anonymous'}</span>
        </div>
      </div>

      {user ? (
        <button onClick={() => signOut()} className="group flex items-center gap-2 bg-white/5 hover:bg-red-500/10 border border-white/10 px-3 py-1.5 rounded-md transition-all">
          <span className="text-[9px] uppercase text-white/40 group-hover:text-red-500">Disconnect</span>
          <LogOut size={14} className="text-white/20 group-hover:text-red-500" />
        </button>
      ) : (
        <button onClick={() => navigate({ to: '/login' })} className="flex items-center gap-2 bg-gold/10 text-gold border border-gold/30 px-4 py-1.5 rounded-md">
          <LogIn size={14} /><span className="text-[10px] uppercase">Join Crew</span>
        </button>
      )}
    </div>
  )
}