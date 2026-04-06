// src/App.tsx
import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'
import { useBroadcastStore } from './stores/broadcastStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  const fetchInitial = useBroadcastStore(s => s.fetchInitial)
  const subscribe = useBroadcastStore(s => s.subscribeRealtime)

  useEffect(() => {
    fetchInitial()
    const unsubscribe = subscribe()
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [fetchInitial, subscribe])

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}