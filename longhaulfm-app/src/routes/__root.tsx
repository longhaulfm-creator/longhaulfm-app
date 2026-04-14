// src/routes/__root.tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useBroadcastStore } from '@/stores/broadcastStore'
import { useAlertStore } from '@/stores/alertStore'
import { useAuthStore } from '@/stores/authStore'

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-brand-dark text-gold font-header p-10 text-center">
        <p className="tracking-[0.3em] text-xl mb-4 uppercase">404: Signal Lost</p>
        <button 
          onClick={() => window.location.href = '/'}
          className="font-ui text-[10px] uppercase tracking-widest text-white/40 hover:text-gold border border-white/10 px-4 py-2 rounded"
        >
          Re-establish Connection
        </button>
      </div>
    )
  },
})

function RootComponent() {
  const fetchInitial = useBroadcastStore(s => s.fetchInitial)
  const subscribeBroadcast = useBroadcastStore(s => s.subscribeRealtime)
  const fetchAlerts = useAlertStore(s => s.fetchAlerts)
  
  // Load the identity initializer
  const initializeAuth = useAuthStore(s => s.initialize)

  useEffect(() => {
    // 1. Establish Operator Identity
    initializeAuth()
    
    // 2. Load Radio Data
    fetchInitial()
    fetchAlerts()
    
    // 3. Open Realtime Channels
    const unsubBroadcast = subscribeBroadcast()

    return () => {
      if (typeof unsubBroadcast === 'function') {
        unsubBroadcast()
      }
    }
  }, [initializeAuth, fetchInitial, fetchAlerts, subscribeBroadcast])

  return (
    <main className="h-screen w-screen bg-brand-dark text-white font-body antialiased overflow-hidden flex flex-col">
      <Outlet />
    </main>
  )
}