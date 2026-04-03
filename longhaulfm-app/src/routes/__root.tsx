// src/routes/__root.tsx
import { useEffect } from 'react'
import { createRootRoute, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { useBroadcastStore } from '@/stores/broadcastStore'
import { useAlertStore } from '@/stores/alertStore'
import { StatusBar } from '@/components/StatusBar'
import { Sidebar } from '@/components/Sidebar'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:  30_000,
      retry:      1,
      refetchOnWindowFocus: false,
    },
  },
})

function AppShell() {
  const { user, isReady, init } = useAuthStore()
  const { fetchInitial, subscribeRealtime } = useBroadcastStore()
  const { fetchAlerts, subscribeRealtime: subscribeAlerts } = useAlertStore()
  const navigate = useNavigate()
  const router   = useRouterState()
  const isLogin  = router.location.pathname === '/login'

  // Boot auth
  useEffect(() => {
    const unsub = init()
    return unsub
  }, [init])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isReady) return
    if (!user && !isLogin) navigate({ to: '/' })
    if (user  &&  isLogin) navigate({ to: '/' })
  }, [user, isReady, isLogin, navigate])

  // Boot data + realtime once authenticated
  useEffect(() => {
    if (!user) return
    fetchInitial()
    fetchAlerts()
    const unsubBroadcast = subscribeRealtime()
    const unsubAlerts    = subscribeAlerts()
    return () => {
      unsubBroadcast()
      unsubAlerts()
    }
  }, [user])

  // Loading splash
  if (!isReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-asphalt">
        <div className="flex flex-col items-center gap-3">
          <div className="font-display text-4xl tracking-widest text-amber">🚛 Long Haul FM</div>
          <div className="w-6 h-6 border-2 border-marking border-t-amber rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // Login page — no shell
  if (!user || isLogin) {
    return <Outlet />
  }

  // Authenticated shell
  return (
    <div className="road-texture h-screen w-screen flex flex-col overflow-hidden">
      <StatusBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden bg-asphalt">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export const Route = createRootRoute({
  component: () => (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  ),
})
