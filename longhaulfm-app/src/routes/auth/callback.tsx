import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/auth/callback')({
  component: CallbackPage,
})

// Prevent double-execution in React Strict Mode
let isExchanging = false;

function CallbackPage() {
  const navigate = useNavigate()
  const { setSpotifyToken } = useAuthStore()
  const [status, setStatus] = useState('Intercepting Signal...')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    
    if (code && !isExchanging) {
      exchangeCode(code)
    } else if (!code) {
      setStatus("No code found in URL")
    }
  }, [])

  const exchangeCode = async (code: string) => {
    try {
      isExchanging = true;
      setStatus('Exchanging Keys...')
      
      const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID
      const clientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET
      const redirectUri = window.location.origin + window.location.pathname;

      if (!clientId || !clientSecret) {
        throw new Error("Missing Client ID or Secret in .env file")
      }

      // Updated to the REAL Spotify Endpoint
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`)
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri,
        }),
      })

      const data = await response.json()

      if (data.access_token) {
        setSpotifyToken(data.access_token)
        
        // Use UPSERT instead of UPDATE to handle missing rows
        const { error: supabaseError } = await supabase
          .from('broadcast_state')
          .upsert({ 
            id: 1,
            spotify_refresh_token: data.refresh_token,
            last_token_refresh: new Date().toISOString() 
          }, { onConflict: 'id' })

        if (supabaseError) {
          console.warn("Supabase Sync Warning:", supabaseError.message)
        }

        setStatus('Success! Opening Terminal...')
        setTimeout(() => navigate({ to: '/' }), 1000)
      } else {
        throw new Error(data.error_description || data.error || "Handshake failed")
      }
    } catch (err: any) {
      console.error("Exchange Error:", err)
      setStatus(`Error: ${err.message}`)
      isExchanging = false; // Allow retry on actual error
    }
  }

  return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center gap-6">
      <div className="w-12 h-12 border-4 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
      <div className="text-center">
        <h2 className="font-display text-xl text-white tracking-widest uppercase italic">Security Gateway</h2>
        <p className="font-mono text-[10px] text-[#1DB954] tracking-widest uppercase animate-pulse mt-2">{status}</p>
      </div>
    </div>
  )
}