// src/routes/__root.tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useBroadcastStore } from '@/stores/broadcastStore'
import { useAlertStore } from '@/stores/alertStore'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const fetchInitial = useBroadcastStore(s => s.fetchInitial)
  const subscribeBroadcast = useBroadcastStore(s => s.subscribeRealtime)
  const fetchAlerts = useAlertStore(s => s.fetchAlerts)

  useEffect(() => {
    // 1. Initial Data Load
    fetchInitial()
    fetchAlerts()

    // 2. Setup Realtime Subscriptions
    const unsubBroadcast = subscribeBroadcast()

    // 3. Cleanup to prevent memory leaks and "is not a function" errors
    return () => {
      if (typeof unsubBroadcast === 'function') {
        unsubBroadcast()
      }
    }
  }, [fetchInitial, fetchAlerts, subscribeBroadcast])

  return (
    <main className="h-screen w-screen bg-asphalt text-ink overflow-hidden flex flex-col">
      <Outlet />
    </main>
  )
}