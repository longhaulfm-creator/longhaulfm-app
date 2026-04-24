import { useEffect, useState, useRef } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'
import { useBroadcastStore } from './stores/broadcastStore'
import { useAuthStore } from './stores/authStore'
import './i18n/config'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
})

export default function App() {
  const [sdkReady, setSdkReady] = useState(false)
  const isInitialized = useRef(false); 
  
  // Stores
  const initializeAuth = useAuthStore(state => state.initialize)
  const fetchInitial = useBroadcastStore(state => state.fetchInitial)
  const subscribeRealtime = useBroadcastStore(state => state.subscribeRealtime)

  // 1. Unified System Initialization
  useEffect(() => {
    let unsubscribeRealtime: (() => void) | undefined;

    const startEngine = async () => {
      if (isInitialized.current) return;
      isInitialized.current = true;

      console.log("📻 Radio Station: Powering Up...");
      
      try {
        // First, get our auth and tokens in order
        await initializeAuth();
        
        // Then, fetch initial broadcast state
        await fetchInitial();
        
        // Finally, start the realtime pulse
        unsubscribeRealtime = subscribeRealtime();
      } catch (err) {
        console.error("Critical Failure during Station Boot:", err);
        isInitialized.current = false; // Allow retry on failure
      }
    };

    startEngine();

    return () => {
      if (unsubscribeRealtime) {
        console.log("🔌 Cleaning up Realtime Subscriptions");
        unsubscribeRealtime();
        isInitialized.current = false;
      }
    };
    // Dependencies are kept stable to avoid re-triggering the loop
  }, [fetchInitial, subscribeRealtime, initializeAuth]) 

  // 2. Inject Spotify SDK for Master Console
  useEffect(() => {
    // Only inject once
    if (!document.getElementById('spotify-sdk')) {
      const script = document.createElement("script");
      script.id = "spotify-sdk";
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      document.body.appendChild(script);
    }

    window.onSpotifyWebPlaybackSDKReady = () => {
      setSdkReady(true);
      console.log("🎸 Long Haul FM: Spotify Engine Ready");
    };
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}