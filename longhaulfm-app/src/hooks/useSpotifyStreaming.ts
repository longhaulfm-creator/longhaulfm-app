// src/hooks/useSpotifyStreaming.ts
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useBroadcastStore } from '@/stores/broadcastStore'

export function useSpotifyStreaming() {
  const { spotifyToken } = useAuthStore()
  const { setNowPlaying } = useBroadcastStore()
  const [playbackState, setPlaybackState] = useState<any>(null)
  const [deviceId, setDeviceId] = useState<string | null>(null)

  useEffect(() => {
    if (!spotifyToken) return

    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true
    document.body.appendChild(script)

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: 'Long Haul FM Master Console',
        getOAuthToken: cb => { cb(spotifyToken) },
        volume: 0.8
      })

      player.addListener('player_state_changed', (state) => {
        if (!state) return
        setPlaybackState(state)
        setNowPlaying(state.track_window.current_track)
        useBroadcastStore.setState({ elapsed: Math.floor(state.position / 1000) })
      })

      player.addListener('ready', ({ device_id }) => {
        setDeviceId(device_id)
        console.log('🚛 Station Player Ready!')
      })

      player.connect()
    }

    return () => { script.remove() }
  }, [spotifyToken])

  return { playbackState, deviceId }
}