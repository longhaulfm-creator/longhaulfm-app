import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

interface BroadcastState {
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void // ✅ ADDED THIS
  isMusicPlaying: boolean  
  micAllowed: boolean
  systemKill: boolean
  isFallbackActive: boolean
  currentTrack: any | null
  upcomingTracks: any[] 
  elapsed: number
  duration_secs: number
  spotifyToken: string | null
  broadcastId: string | null
  setNowPlaying: (state: any) => Promise<void>
  tickElapsed: () => void
  fetchInitial: () => Promise<void>
  subscribeRealtime: () => () => void
  toggleMic: () => Promise<void>
  toggleSystemKill: () => Promise<void>
}

let activeChannel: RealtimeChannel | null = null;

const dracoParse = (raw: any) => {
  if (!raw) return null;
  let data = raw;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch (e) { return null; }
  }
  const core = data.item || data.track || data;
  let artist = "Unknown Artist";
  const rawArtist = core.artist || core.artists || data.artist || data.artists;
  if (Array.isArray(rawArtist)) artist = rawArtist.map((a: any) => a.name || a).join(', ');
  else if (typeof rawArtist === 'object') artist = rawArtist.name || "Unknown Artist";
  let artwork = core.artwork || core.album_art || data.artwork || data.album_art;
  if (core.album?.images?.[0]?.url) artwork = core.album.images[0].url;
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
  
  // ✅ ADDED THIS: The actual function to update the state
  setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),

  isMusicPlaying: false,
  micAllowed: true,
  systemKill: false,
  isFallbackActive: true, 
  currentTrack: null,
  upcomingTracks: [],
  elapsed: 0,
  duration_secs: 0,
  spotifyToken: null,
  broadcastId: null,

  tickElapsed: () => set((state) => ({ 
    elapsed: state.elapsed < state.duration_secs ? state.elapsed + 1 : state.elapsed 
  })),

  toggleMic: async () => {
    const id = get().broadcastId;
    if (!id) return;
    const next = !get().micAllowed;
    set({ micAllowed: next }); 
    await supabase.from('broadcast_state').update({ mic_allowed: next }).eq('id', id);
  },

  toggleSystemKill: async () => {
    const id = get().broadcastId;
    if (!id) return;
    const next = !get().systemKill;
    set({ 
      systemKill: next,
      isFallbackActive: next ? true : (!get().isPlaying && !get().isMusicPlaying)
    }); 
    await supabase.from('broadcast_state').update({ system_kill: next }).eq('id', id);
  },

  fetchInitial: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      // 1. Fetch Broadcast State
      const { data: stateData, error: stateError } = await supabase
        .from('broadcast_state')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (stateError) console.error("❌ Broadcast State Error:", stateError.message);

      if (stateData) {
        const parsed = dracoParse(stateData.track_data);
        set({ 
          broadcastId: stateData.id,
          isPlaying: stateData.is_playing, 
          micAllowed: stateData.mic_allowed,
          systemKill: stateData.system_kill,
          currentTrack: parsed, 
          upcomingTracks: stateData.track_data?.upcoming || [],
          duration_secs: parsed?.duration_ms ? Math.floor(parsed.duration_ms / 1000) : 0,
          elapsed: parsed?.progress_ms ? Math.floor(parsed.progress_ms / 1000) : 0,
          isFallbackActive: stateData.system_kill || (!stateData.is_playing && !get().isMusicPlaying)
        });
      }

      // 2. Fetch Token using NEW column name
      const { data: authData, error: authError } = await supabase
        .from('spotify_auth')
        .select('get_spotify_token_99')
        .limit(1)
        .maybeSingle();

      if (authError) {
        console.error("❌ Spotify Auth Fetch Error:", authError.message);
      }

      if (authData?.get_spotify_token_99) {
        set({ spotifyToken: authData.get_spotify_token_99 });
      }
    } catch (e) {
      console.error("❌ Critical Store Error:", e);
    }
  },

  subscribeRealtime: () => {
    if (activeChannel) return () => {};

    activeChannel = supabase.channel('station-engine-room')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'broadcast_state' }, (payload) => {
          const newData = payload.new as any;
          if (!newData) return;
          
          // If we are currently the active streamer, we ignore external track updates 
          // to prevent "looping" our own updates back into our local state.
          const isDJ = !!get().spotifyToken;
          const parsed = dracoParse(newData.track_data);
          
          set({
            isPlaying: newData.is_playing,
            micAllowed: newData.mic_allowed,
            systemKill: newData.system_kill,
            currentTrack: isDJ ? get().currentTrack : parsed,
            upcomingTracks: isDJ ? get().upcomingTracks : (newData.track_data?.upcoming || []),
            duration_secs: isDJ ? get().duration_secs : (parsed?.duration_ms ? Math.floor(parsed.duration_ms / 1000) : get().duration_secs),
            elapsed: isDJ ? get().elapsed : (parsed?.progress_ms ? Math.floor(parsed.progress_ms / 1000) : get().elapsed),
            isFallbackActive: newData.system_kill || !newData.is_playing
          });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'spotify_auth' }, (payload) => {
          const newData = payload.new as any;
          // Listen for the new column in Realtime updates
          if (newData.get_spotify_token_99) {
            set({ spotifyToken: newData.get_spotify_token_99 });
          } else {
            set({ spotifyToken: null });
          }
      })
      .subscribe();

    return () => {
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
        activeChannel = null;
      }
    };
  },

  setNowPlaying: async (state: any) => {
    if (!state) {
      set({ isMusicPlaying: false, isFallbackActive: get().systemKill || !get().isPlaying });
      return;
    }
    const track = state.track_window?.current_track;
    const musicActive = !state.paused;
    const nextTracks = (state.track_window?.next_tracks || []).slice(0, 3);

    const trackPayload = track ? {
      title: track.name,
      artist: track.artists.map((a: any) => a.name).join(', '),
      artwork: track.album.images[0]?.url,
      uri: track.uri,
      duration_ms: state.duration,
      progress_ms: state.position,
      upcoming: nextTracks
    } : null;

    set({
      isMusicPlaying: musicActive,
      isFallbackActive: get().systemKill || (!get().isPlaying && !musicActive),
      elapsed: Math.floor(state.position / 1000),
      duration_secs: Math.floor(state.duration / 1000),
      upcomingTracks: nextTracks,
      currentTrack: trackPayload || get().currentTrack
    });

    const id = get().broadcastId;
    // Only update the database if we have a valid token (meaning we are the active DJ)
    if (id && get().spotifyToken && trackPayload && musicActive) {
      await supabase
        .from('broadcast_state')
        .update({ 
          track_data: trackPayload,
          is_playing: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
    }
  }
}))