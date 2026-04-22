import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

interface BroadcastState {
  isPlaying: boolean       
  isMusicPlaying: boolean  
  micAllowed: boolean
  systemKill: boolean
  isFallbackActive: boolean
  currentTrack: any | null
  upcomingTracks: any[] 
  elapsed: number
  duration_secs: number
  spotifyToken: string | null
  setNowPlaying: (state: any) => Promise<void>
  tickElapsed: () => void
  fetchInitial: () => Promise<void>
  subscribeRealtime: () => () => void
  toggleMic: () => Promise<void>
  toggleSystemKill: () => Promise<void>
}

let activeChannel: RealtimeChannel | null = null;
let authChannel: RealtimeChannel | null = null;

/**
 * THE DRACONIAN TRACK PARSER
 * Standardizes metadata from various Spotify shapes and DB JSON.
 */
const dracoParse = (raw: any) => {
  if (!raw) return null;
  let data = raw;
  
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch (e) { return null; }
  }

  const core = data.item || data.track || data;

  let artist = "Unknown Artist";
  const rawArtist = core.artist || core.artists || data.artist || data.artists;
  
  if (Array.isArray(rawArtist)) {
    artist = rawArtist.map((a: any) => a.name || a).join(', ');
  } else if (typeof rawArtist === 'object') {
    artist = rawArtist.name || "Unknown Artist";
  } else if (typeof rawArtist === 'string') {
    artist = rawArtist;
  }

  let artwork = core.artwork || core.album_art || data.artwork || data.album_art;
  if (core.album?.images?.[0]?.url) {
    artwork = core.album.images[0].url;
  } else if (data.album?.images?.[0]?.url) {
    artwork = data.album.images[0].url;
  }

  return {
    title: core.title || core.name || data.title || data.name || "Unknown Title",
    artist: artist,
    artwork: artwork,
    duration_ms: core.duration_ms || data.duration_ms || 0,
    progress_ms: data.progress_ms || core.progress_ms || 0,
    uri: core.uri || data.uri
  };
};

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
  spotifyToken: null,

  tickElapsed: () => set((state) => ({ 
    elapsed: state.elapsed < state.duration_secs ? state.elapsed + 1 : state.elapsed 
  })),

  toggleMic: async () => {
    const next = !get().micAllowed
    set({ micAllowed: next }) 
    await supabase.from('broadcast_state').update({ mic_allowed: next }).eq('id', 1)
  },

  toggleSystemKill: async () => {
    const next = !get().systemKill
    set({ 
      systemKill: next,
      isFallbackActive: next ? true : (!get().isPlaying && !get().isMusicPlaying)
    }) 
    await supabase.from('broadcast_state').update({ system_kill: next }).eq('id', 1)
  },

  fetchInitial: async () => {
    const { data: stateData } = await supabase
      .from('broadcast_state')
      .select('is_playing, mic_allowed, system_kill, track_data')
      .eq('id', 1)
      .maybeSingle()

    if (stateData) {
      const parsed = dracoParse(stateData.track_data);
      const upcoming = stateData.track_data?.upcoming || [];
      
      set({ 
        isPlaying: stateData.is_playing, 
        micAllowed: stateData.mic_allowed,
        systemKill: stateData.system_kill,
        currentTrack: parsed, 
        upcomingTracks: upcoming,
        duration_secs: parsed?.duration_ms ? Math.floor(parsed.duration_ms / 1000) : 0,
        elapsed: parsed?.progress_ms ? Math.floor(parsed.progress_ms / 1000) : 0,
        isFallbackActive: stateData.system_kill || (!stateData.is_playing && !get().isMusicPlaying)
      })
    }

    const { data: authData } = await supabase
      .from('spotify_auth')
      .select('access_token')
      .eq('id', '6ba16792-7108-4d64-964c-f1e6005d5e2e')
      .maybeSingle()

    if (authData?.access_token) {
      set({ spotifyToken: authData.access_token })
    }
  },

  subscribeRealtime: () => {
    if (activeChannel) return () => {};

    activeChannel = supabase.channel('broadcast_sync_stable')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'broadcast_state', filter: 'id=eq.1' },
        (payload) => {
          const newData = payload.new as any;
          if (!newData || Object.keys(newData).length === 0) return; 

          // 🛑 ANTI-JITTER: The DJ should ignore their own DB update echo.
          // Their local Spotify SDK is the "Source of Truth".
          if (get().spotifyToken) return;

          const parsed = dracoParse(newData.track_data);
          const upcoming = newData.track_data?.upcoming || [];

          set({
            isPlaying: newData.is_playing,
            micAllowed: newData.mic_allowed,
            systemKill: newData.system_kill,
            currentTrack: parsed,
            upcomingTracks: upcoming,
            duration_secs: parsed?.duration_ms ? Math.floor(parsed.duration_ms / 1000) : get().duration_secs,
            elapsed: parsed?.progress_ms ? Math.floor(parsed.progress_ms / 1000) : get().elapsed,
            isFallbackActive: newData.system_kill || !newData.is_playing
          });
        }
      )
      .subscribe();

    authChannel = supabase.channel('auth_sync')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'spotify_auth' },
        (payload) => {
          const newData = payload.new as any;
          if (newData.access_token) {
            set({ spotifyToken: newData.access_token });
          }
        }
      )
      .subscribe();

    return () => {
      activeChannel?.unsubscribe();
      authChannel?.unsubscribe();
      activeChannel = null;
      authChannel = null;
    };
  },

  setNowPlaying: async (state: any) => {
    if (!state) {
      set({ isMusicPlaying: false, isFallbackActive: get().systemKill || !get().isPlaying })
      return
    }

    const track = state.track_window?.current_track
    const musicActive = !state.paused
    const nextTracks = (state.track_window?.next_tracks || []).slice(0, 3);

    // Standardized Payload including the Manifest
    const trackPayload = track ? {
      title: track.name,
      artist: track.artists.map((a: any) => a.name).join(', '),
      artwork: track.album.images[0]?.url,
      uri: track.uri,
      duration_ms: state.duration,
      progress_ms: state.position,
      upcoming: nextTracks
    } : null;

    // Update DJ Local State
    set({
      isMusicPlaying: musicActive,
      isFallbackActive: get().systemKill || (!get().isPlaying && !musicActive),
      elapsed: Math.floor(state.position / 1000),
      duration_secs: Math.floor(state.duration / 1000),
      upcomingTracks: nextTracks,
      currentTrack: trackPayload || get().currentTrack
    })

    // BROADCAST: DJ sends state to the DB for listeners
    if (get().spotifyToken && trackPayload && musicActive) {
      await supabase
        .from('broadcast_state')
        .update({ 
          track_data: trackPayload,
          is_playing: true, // This hides the Fallback banner for listeners
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);
    }
  }
}))