import { useEffect, useRef } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'
import { useBroadcastStore } from './stores/broadcastStore'
import { useAuthStore } from './stores/authStore'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000 } },
})

export default function App() {
  const isInitialized = useRef(false); 
  const initializeAuth = useAuthStore(state => state.initialize)
  const fetchInitial = useBroadcastStore(state => state.fetchInitial)
  const subscribeRealtime = useBroadcastStore(state => state.subscribeRealtime)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (!isInitialized.current) {
      isInitialized.current = true;
      const startEngine = async () => {
        console.log("📻 Radio Station: Powering Up...");
        try {
          await initializeAuth();
          await fetchInitial();
          unsubscribe = subscribeRealtime();
        } catch (err) {
          console.error("Critical Failure:", err);
        }
      };
      startEngine();
    }

    return () => { if (unsubscribe) unsubscribe(); };
  }, [initializeAuth, fetchInitial, subscribeRealtime]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}