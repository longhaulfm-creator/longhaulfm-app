import { useEffect, useState, useRef } from 'react';
import { useBroadcastStore } from '../stores/broadcastStore';

export const useSpotifyStreaming = (accessToken: string, userRole: string) => {
  const [isReady, setIsReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<any>(null);
  const { setNowPlaying } = useBroadcastStore();
  
  const playerRef = useRef<any>(null);
  const tokenRef = useRef(accessToken);

  // Keep the token reference updated for the SDK's callback
  useEffect(() => {
    if (accessToken && accessToken !== 'get_spotify_token_99') {
      tokenRef.current = accessToken;
      console.log("🎫 SDK Token Reference Synchronized");
    }
  }, [accessToken]);

  useEffect(() => {
    const masterRoles = ['admin', 'dj'];
    
    if (
      !masterRoles.includes(userRole) || 
      !accessToken || 
      accessToken === 'get_spotify_token_99' ||
      (window as any).SpotifyPlayerStarted
    ) {
      return;
    }

    const setupPlayer = async () => {
      if ((window as any).SpotifyPlayerStarted) return;
      (window as any).SpotifyPlayerStarted = true;

      const player = new (window as any).Spotify.Player({
        name: 'Long Haul FM Master Console',
        // CRITICAL: The SDK calls this function periodically.
        // By using a ref, we give it the fresh token without restarting the player.
        getOAuthToken: (cb: (t: string) => void) => {
          console.log("🔄 SDK requested fresh token pulse...");
          cb(tokenRef.current);
        },
        volume: 0.5
      });

      player.addListener('ready', async ({ device_id }: { device_id: string }) => {
        console.log('✅ Signal Connected to Device:', device_id);
        setDeviceId(device_id);
        setIsReady(true);
        (window as any).masterPlayer = player;

        // Transfer playback to this device
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
        // If auth fails, the token is dead. We need a hard reset of the flag.
        (window as any).SpotifyPlayerStarted = false;
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
      // Only disconnect if the component actually unmounts or role changes
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
        (window as any).SpotifyPlayerStarted = false;
      }
    };
  }, [userRole]); // Removed accessToken from dependency to prevent player re-creation

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