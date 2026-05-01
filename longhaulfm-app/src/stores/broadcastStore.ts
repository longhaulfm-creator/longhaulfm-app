import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'
import { ably } from '../lib/ably'

interface BroadcastState {
  isPlaying: boolean 
  isMicLive: boolean 
  isJinglePlaying: boolean
  setIsPlaying: (playing: boolean) => void
  setIsMicLive: (live: boolean) => void
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
  listenerCount: number
  setNowPlaying: (state: any) => Promise<void>
  tickElapsed: () => void
  fetchInitial: () => Promise<void>
  updateListeners: () => Promise<void>
  subscribeRealtime: () => () => void
  toggleMic: () => Promise<void>
  toggleSystemKill: () => Promise<void>
  triggerJingle: (url: string) => void
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
  const rawArtist = core.artists || core.artist || data.artists || data.artist;
  if (Array.isArray(rawArtist) && rawArtist.length > 0) {
    artist = rawArtist.map((a: any) => typeof a === 'string' ? a : (a.name || "Unknown")).join(', ');
  } else if (typeof rawArtist === 'string') {
    artist = rawArtist;
  } else if (typeof rawArtist === 'object' && rawArtist !== null) {
    artist = rawArtist.name || "Unknown Artist";
  }
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
  isMicLive: false,
  isJinglePlaying: false,
  setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),
  setIsMicLive: (live: boolean) => set({ isMicLive: live }),
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
  listenerCount: 0,

  triggerJingle: (url: string) => {
    set({ isJinglePlaying: true });
    const channel = ably.channels.get('fleet-broadcast');
    channel.publish('JINGLE_TRIGGER', { url });
  },

  updateListeners: async () => {
    try {
      const res = await fetch('https://radio.longhaul-fm.co.za/api/nowplaying/1');
      const data = await res.json();
      const mainMount = data.station.mounts.find(
        (m: any) => m.name === '/radio.mp3' || m.path === '/radio.mp3'
      );
      set({ listenerCount: mainMount?.listeners?.unique || 0 });
    } catch (e) {
      console.error("❌ Mount Sync Error:", e);
    }
  },

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
    get().updateListeners();
    try {
      const { data: stateData } = await supabase
        .from('broadcast_state')
        .select('*')
        .limit(1)
        .maybeSingle();

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
          isFallbackActive: stateData.system_kill || (!stateData.is_playing)
        });
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: authData } = await supabase
          .from('spotify_auth')
          .select('get_spotify_token_99')
          .limit(1)
          .maybeSingle();

        if (authData?.get_spotify_token_99) {
          set({ spotifyToken: authData.get_spotify_token_99 });
        }
      }
    } catch (e) {
      console.error("❌ Critical Store Error:", e);
    }
  },

  subscribeRealtime: () => {
    if (activeChannel) return () => {};
    const listenerInterval = setInterval(() => get().updateListeners(), 30000);

    activeChannel = supabase.channel('station-engine-room')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'broadcast_state' }, (payload) => {
          const newData = payload.new as any;
          if (!newData) return;
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
          set({ spotifyToken: newData.get_spotify_token_99 || null });
      })
      .subscribe();

    return () => {
      clearInterval(listenerInterval);
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