import { useEffect, useState, useRef } from 'react';
import { useBroadcastStore } from '../stores/broadcastStore';

export const useSpotifyStreaming = (accessToken: string, userRole: string) => {
  const [isReady, setIsReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<any>(null);
  const { setNowPlaying } = useBroadcastStore();
  const playerRef = useRef<any>(null);

  useEffect(() => {
    // Both Admin and DJ need the SDK ready for session transfers
    const masterRoles = ['admin', 'dj'];
    if (!masterRoles.includes(userRole) || !accessToken) return;

    const setupPlayer = async () => {
      if (playerRef.current) return;

      const player = new (window as any).Spotify.Player({
        name: 'Long Haul FM Master Console',
        getOAuthToken: (cb: (t: string) => void) => cb(accessToken),
        volume: 0.5
      });

      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('✅ Signal Connected to Device:', device_id);
        setDeviceId(device_id);
        setIsReady(true);
      });

      player.addListener('player_state_changed', (state: any) => {
        if (state) {
          setPlaybackState(state);
          // This updates the store, which pushes metadata to Supabase/Ably
          setNowPlaying(state);
        }
      });

      player.connect();
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

  const togglePlay = async (play: boolean) => {
    if (!playerRef.current) return;
    if (play) await playerRef.current.resume();
    else await playerRef.current.pause();
  };

  return { 
    player: playerRef.current, 
    isReady, 
    deviceId, 
    playbackState, 
    togglePlay 
  };
};