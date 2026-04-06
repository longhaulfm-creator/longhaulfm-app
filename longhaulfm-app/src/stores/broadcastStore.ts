import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { BroadcastState, Caller } from '@/types'

interface NowPlaying {
  track_title: string
  track_artist: string
  artwork_url: string
  duration_secs: number
  source: 'spotify' | 'live' | 'talk'
}

interface BroadcastStore {
  state: BroadcastState | null
  callers: Caller[]
  nowPlaying: NowPlaying | null
  spotifyToken: string | null
  isLoading: boolean
  elapsed: number
  fetchInitial: () => Promise<void>
  subscribeRealtime: () => () => void
  setSpotifyToken: (token: string) => void
  setNowPlaying: (track: any) => void
  tickElapsed: () => void
}

export const useBroadcastStore = create<BroadcastStore>((set, get) => ({
  state: null,
  callers: [],
  nowPlaying: null,
  spotifyToken: typeof window !== 'undefined' ? localStorage.getItem('spotify_access_token') : null,
  isLoading: true,
  elapsed: 0,

  setSpotifyToken: (token: string) => {
    set({ spotifyToken: token })
    localStorage.setItem('spotify_access_token', token)
  },

  // 1. Action to update track metadata from the Spotify SDK
  setNowPlaying: (track: any) => {
    set({
      nowPlaying: {
        track_title: track.name,
        track_artist: track.artists.map((a: any) => a.name).join(', '),
        artwork_url: track.album.images[0]?.url || '',
        duration_secs: Math.floor(track.duration_ms / 1000),
        source: 'spotify'
      }
    })
  },

  tickElapsed: () => {
    const { elapsed, nowPlaying } = get()
    if (nowPlaying && elapsed < nowPlaying.duration_secs) {
      set({ elapsed: elapsed + 1 })
    }
  },

  fetchInitial: async () => {
    set({ isLoading: true })
    const savedToken = localStorage.getItem('spotify_access_token')
    
    try {
      const { data: stateData, error: stateError } = await supabase
        .from('broadcast_state')
        .select('*')
        .maybeSingle()

      if (stateError) throw stateError

      const { data: callerData } = await supabase
        .from('callers')
        .select('*')
        .in('status', ['waiting', 'on_air'])

      set({ 
        state: stateData || { 
          id: 1, 
          current_source: 'spotify', 
          is_on_air: false, 
          listener_count: 0 
        }, 
        callers: callerData || [],
        spotifyToken: savedToken,
        isLoading: false 
      })
    } catch (error) {
      console.error('❌ BroadcastStore Fetch Error:', error)
      set({ isLoading: false })
    }
  },

  subscribeRealtime: () => {
    const channel = supabase.channel('broadcast-ops')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'broadcast_state' }, 
        (payload) => set({ state: payload.new as BroadcastState })
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'callers' },
        async () => {
          const { data } = await supabase.from('callers').select('*').in('status', ['waiting', 'on_air'])
          set({ callers: data || [] })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }
}))