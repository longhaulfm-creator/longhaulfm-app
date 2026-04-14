import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'
import './i18n/config' // Critical: Initialize your Shona/Afrikaans translations early

// 1. Setup the "Business Brain" cache
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

export default function App() {
  const [sdkReady, setSdkReady] = useState(false)

  useEffect(() => {
    // 2. Fast & Rude: Inject Spotify SDK once at the root
    // This makes 'window.Spotify' available to all routes/components
    if (!document.getElementById('spotify-sdk')) {
      const script = document.createElement("script");
      script.id = "spotify-sdk";
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      document.body.appendChild(script);
    }

    window.onSpotifyWebPlaybackSDKReady = () => {
      setSdkReady(true);
      console.log("🎸 Long Haul FM: Spotify Engine Started");
    };

    // 3. Clean up old listeners if the app hot-reloads
    return () => {
      // In a real radio environment, we keep this alive as long as possible
    };
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {/* We use RouterProvider here. 
          Inside your routes, you'll use the 'useRadioStation' hook 
          to listen for Ably 'ducking' and 'sync' events.
      */}
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}