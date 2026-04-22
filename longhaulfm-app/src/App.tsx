import { useEffect, useState, useRef } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'
import { useBroadcastStore } from './stores/broadcastStore' 
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
  
  const fetchInitial = useBroadcastStore(state => state.fetchInitial)
  const subscribeRealtime = useBroadcastStore(state => state.subscribeRealtime)

  // 1. Initialize Station State & Realtime Subscriptions
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (!isInitialized.current) {
      console.log("📻 Radio Station Initializing...");
      fetchInitial();
      unsubscribe = subscribeRealtime();
      isInitialized.current = true;
    }

    return () => {
      if (unsubscribe) {
        console.log("🔌 Cleaning up Realtime Subscriptions");
        unsubscribe();
      }
    };
  }, [fetchInitial, subscribeRealtime]) 

  // 2. Inject Spotify SDK for Master Console
  useEffect(() => {
    if (!document.getElementById('spotify-sdk')) {
      const script = document.createElement("script");
      script.id = "spotify-sdk";
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      document.body.appendChild(script);
    }

    // Attach handler to window
    window.onSpotifyWebPlaybackSDKReady = () => {
      setSdkReady(true);
      console.log("🎸 Long Haul FM: Spotify Engine Started");
    };

    // Note: No specific cleanup needed for the script injection
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}