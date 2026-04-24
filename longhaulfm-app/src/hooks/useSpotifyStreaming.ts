import { useEffect, useState, useRef } from 'react';
import { useBroadcastStore } from '../stores/broadcastStore';

export const useSpotifyStreaming = (accessToken: string, userRole: string) => {
  const [isReady, setIsReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<any>(null);
  const { setNowPlaying } = useBroadcastStore();
  const playerRef = useRef<any>(null);

  useEffect(() => {
    const masterRoles = ['admin', 'dj'];
    // Ensure we have a valid token before attempting setup
    if (!masterRoles.includes(userRole) || !accessToken) return;

    const setupPlayer = async () => {
      if (playerRef.current) return;

      const player = new (window as any).Spotify.Player({
        name: 'Long Haul FM Master Console',
        getOAuthToken: (cb: (t: string) => void) => cb(accessToken),
        volume: 0.5
      });

      // --- EVENT LISTENERS ---
      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('✅ Signal Connected to Device:', device_id);
        setDeviceId(device_id);
        setIsReady(true);
        (window as any).masterPlayer = player;
      });

      player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.log('❌ Device ID has gone offline:', device_id);
        setIsReady(false);
      });

      player.addListener('player_state_changed', (state: any) => {
        if (state) {
          setPlaybackState(state);
          setNowPlaying(state);
        }
      });

      player.addListener('initialization_error', ({ message }: any) => console.error('Init Error:', message));
      player.addListener('authentication_error', ({ message }: any) => console.error('Auth Error:', message));
      player.addListener('account_error', ({ message }: any) => console.error('Premium Required:', message));

      // START CONNECTION
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
      }
    };
  }, [accessToken, userRole, setNowPlaying]);

  const togglePlay = async (shouldPlay: boolean) => {
    if (!playerRef.current) {
      console.warn("⚠️ Player not initialized.");
      return;
    }

    try {
      await playerRef.current.activateElement();
      if (shouldPlay) {
        await playerRef.current.resume();
      } else {
        await playerRef.current.pause();
      }
    } catch (error) {
      console.error("Playback Action Failed:", error);
    }
  };

  return { 
    player: playerRef.current, 
    isReady, 
    deviceId, 
    playbackState, 
    togglePlay 
  };
};