import { useEffect, useState, useRef } from 'react';
import { useBroadcastStore } from '../stores/broadcastStore';
import { supabase } from '../lib/supabase'; // Ensure you have your supabase client imported

export const useSpotifyStreaming = (initialToken: string, userRole: string) => {
  const [isReady, setIsReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<any>(null);
  const { setNowPlaying } = useBroadcastStore();
  
  const playerRef = useRef<any>(null);
  const tokenRef = useRef(initialToken);

  // Helper to fetch a fresh token from your Edge Function
  const fetchFreshToken = async (): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('spotify-sync');
      if (error || !data?.get_spotify_token_99) throw new Error("Failed to sync Spotify token");
      
      const newToken = data.get_spotify_token_99;
      tokenRef.current = newToken;
      console.log("🔄 Edge Function provided fresh token");
      return newToken;
    } catch (err) {
      console.error("🚨 Token Refresh Loop Error:", err);
      return tokenRef.current; // Fallback to last known token
    }
  };

  // Sync token if parent component updates it
  useEffect(() => {
    if (initialToken && initialToken !== 'get_spotify_token_99') {
      tokenRef.current = initialToken;
    }
  }, [initialToken]);

  useEffect(() => {
    const masterRoles = ['admin', 'dj'];
    
    if (
      !masterRoles.includes(userRole) || 
      (window as any).SpotifyPlayerStarted
    ) {
      return;
    }

    const setupPlayer = async () => {
      if ((window as any).SpotifyPlayerStarted) return;
      (window as any).SpotifyPlayerStarted = true;

      const player = new (window as any).Spotify.Player({
        name: 'Long Haul FM Master Console',
        // This callback is the key to preventing the 1-hour crash
        getOAuthToken: async (cb: (t: string) => void) => {
          console.log("🔄 SDK requested fresh token pulse...");
          const token = await fetchFreshToken();
          cb(token);
        },
        volume: 0.5
      });

      player.addListener('ready', async ({ device_id }: { device_id: string }) => {
        console.log('✅ Signal Connected to Device:', device_id);
        setDeviceId(device_id);
        setIsReady(true);
        (window as any).masterPlayer = player;

        try {
          await fetch('https://api.spotify.com/v1/me/player', {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${tokenRef.current}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ device_ids: [device_id], play: true }),
          });
          console.log("⚡ Playback transferred to Master Console");
        } catch (e) {
          console.error("Transfer failed:", e);
        }
      });

      player.addListener('authentication_error', ({ message }: any) => {
        console.error('❌ SDK Auth Error:', message);
        (window as any).SpotifyPlayerStarted = false;
        // Force a token refresh on auth failure
        fetchFreshToken();
      });

      player.addListener('player_state_changed', (state: any) => {
        if (state) {
          setPlaybackState(state);
          setNowPlaying(state);
        }
      });

      await player.connect();
      playerRef.current = player;
    };

    if (!(window as any).Spotify) {
      const script = document.createElement("script");
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      document.body.appendChild(script);
      (window as any).onSpotifyWebPlaybackSDKReady = setupPlayer;
    } else {
      setupPlayer();
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
        (window as any).SpotifyPlayerStarted = false;
      }
    };
  }, [userRole]);

  const togglePlay = async (shouldPlay: boolean) => {
    if (!playerRef.current) return;
    try {
      if (shouldPlay) await playerRef.current.resume();
      else await playerRef.current.pause();
    } catch (error) {
      console.error("Playback Action Failed:", error);
    }
  };

  return { player: playerRef.current, isReady, deviceId, playbackState, togglePlay };
};