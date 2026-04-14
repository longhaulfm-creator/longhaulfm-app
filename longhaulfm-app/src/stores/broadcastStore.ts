import { create } from 'zustand'
import { supabase } from '../lib/supabase'

interface BroadcastState {
  isPlaying: boolean       // Global: Is the station supposed to be live?
  isMusicPlaying: boolean  // Local: Is Spotify actually making sound right now?
  micAllowed: boolean
  systemKill: boolean
  isFallbackActive: boolean
  currentTrack: any | null
  upcomingTracks: any[] 
  elapsed: number
  duration_secs: number
  setNowPlaying: (state: any) => void
  tickElapsed: () => void
  fetchInitial: () => Promise<void>
  subscribeRealtime: () => () => void
  toggleMic: () => Promise<void>
  toggleSystemKill: () => Promise<void>
}

export const useBroadcastStore = create<BroadcastState>((set, get) => ({
  isPlaying: false,
  isMusicPlaying: false,
  micAllowed: true,
  systemKill: false,
  isFallbackActive: true, 
  currentTrack: null,
  upcomingTracks: [],
  elapsed: 0,
  duration_secs: 0,

  tickElapsed: () => set((state) => ({ elapsed: state.elapsed + 1 })),

  toggleMic: async () => {
    const next = !get().micAllowed
    set({ micAllowed: next }) 
    await supabase.from('broadcast_state').update({ mic_allowed: next }).eq('id', 1)
  },

  toggleSystemKill: async () => {
    const next = !get().systemKill
    // If System Kill is ON, Fallback MUST be active.
    set({ 
      systemKill: next,
      isFallbackActive: next ? true : (!get().isPlaying && !get().isMusicPlaying)
    }) 
    await supabase.from('broadcast_state').update({ system_kill: next }).eq('id', 1)
  },

  fetchInitial: async () => {
    const { data } = await supabase.from('broadcast_state').select('*').eq('id', 1).maybeSingle()
    if (data) {
      set({ 
        isPlaying: data.is_playing, 
        micAllowed: data.mic_allowed,
        systemKill: data.system_kill,
        // Default to Supabase track data if Spotify hasn't reported yet
        currentTrack: data.track_data,
        isFallbackActive: data.system_kill || (!data.is_playing && !get().isMusicPlaying)
      })
    }
  },

  subscribeRealtime: () => {
    const existing = supabase.getChannels().find(c => c.topic === 'realtime:broadcast_global_sync')
    if (existing) {
      if (existing.state === 'joined') return () => {}
      supabase.removeChannel(existing)
    }
    
    const channel = supabase.channel('broadcast_global_sync')

    channel
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'broadcast_state', 
        filter: 'id=eq.1' 
      }, 
      (payload) => {
        const newData = payload.new as any
        const currentMusic = get().isMusicPlaying
        
        set({ 
          isPlaying: newData.is_playing, 
          micAllowed: newData.mic_allowed,
          systemKill: newData.system_kill,
          // Update fallback based on new global instructions + local playback status
          isFallbackActive: newData.system_kill || (!newData.is_playing && !currentMusic)
        })
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') console.log("📡 Signal Synced")
      })

    return () => { supabase.removeChannel(channel) }
  },

  setNowPlaying: (state: any) => {
    if (!state) {
      // If Spotify state is null, we check if the global signal is also off before engaging fallback
      set({ 
        isMusicPlaying: false, 
        upcomingTracks: [],
        isFallbackActive: get().systemKill || !get().isPlaying
      })
      return
    }

    const track = state.track_window?.current_track
    const nextTracks = state.track_window?.next_tracks || []
    const musicActive = !state.paused
    
    // Logic: Fallback is active IF System Kill is on OR (Global Signal is off AND Spotify is silent)
    const shouldBeFallback = get().systemKill || (!get().isPlaying && !musicActive)

    set({
      isMusicPlaying: musicActive,
      isFallbackActive: shouldBeFallback,
      elapsed: Math.floor(state.position / 1000),
      duration_secs: Math.floor(state.duration / 1000),
      upcomingTracks: nextTracks.slice(0, 3),
      currentTrack: track ? {
        title: track.name,
        artists: track.artists.map((a: any) => a.name),
        artwork: track.album.images[0]?.url,
        uri: track.uri
      } : get().currentTrack // Keep existing track data if track object is missing
    })
  }
}))