import { useEffect, useState, useRef } from 'react';
import { useBroadcastStore } from '../stores/broadcastStore';

export const useSpotifyStreaming = (accessToken: string, userRole: string) => {
  const [isReady, setIsReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<any>(null);
  const { setNowPlaying } = useBroadcastStore();
  
  const playerRef = useRef<any>(null);
  const tokenRef = useRef(accessToken);

  // 1. Keep the token reference updated for the SDK's internal refresh callback
  useEffect(() => {
    tokenRef.current = accessToken;
    console.log("🎫 SDK Token Reference Updated");
  }, [accessToken]);

  useEffect(() => {
    const masterRoles = ['admin', 'dj'];
    
    // 2. SINGLETON LOCK: Prevent React Strict Mode or double-mounting from creating 2 players
    if (!masterRoles.includes(userRole) || !accessToken || (window as any).SpotifyPlayerStarted) {
      return;
    }

    const setupPlayer = async () => {
      if ((window as any).SpotifyPlayerStarted) return;
      (window as any).SpotifyPlayerStarted = true;

      const player = new (window as any).Spotify.Player({
        name: 'Long Haul FM Master Console',
        // The SDK calls this whenever it needs to re-authorize
        getOAuthToken: (cb: (t: string) => void) => cb(tokenRef.current),
        volume: 0.5,
        enableMediaSession: true 
      });

      // --- EVENT LISTENERS ---
      player.addListener('ready', async ({ device_id }: { device_id: string }) => {
        console.log('✅ Signal Connected to Device:', device_id);
        setDeviceId(device_id);
        setIsReady(true);
        (window as any).masterPlayer = player;

        // 3. FORCE TRANSFER: Tell Spotify this laptop tab is now the BOSS
        // This prevents the "random skipping" caused by other active devices
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

      player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.log('❌ Device Offline:', device_id);
        setIsReady(false);
      });

      player.addListener('player_state_changed', (state: any) => {
        if (state) {
          setPlaybackState(state);
          setNowPlaying(state);
        } else {
          // If state is null, Spotify likely took the session away
          console.warn("⚠️ Lost playback state control");
        }
      });

      // --- ERROR HANDLING ---
      player.addListener('initialization_error', ({ message }: any) => {
        console.error('Init Error:', message);
        (window as any).SpotifyPlayerStarted = false;
      });
      
      player.addListener('authentication_error', ({ message }: any) => {
        console.error('Auth Error (Token likely poisoned):', message);
        (window as any).SpotifyPlayerStarted = false;
      });

      player.addListener('account_error', ({ message }: any) => {
        console.error('🛑 PREMIUM REQUIRED:', message);
      });

      await player.connect();
      playerRef.current = player;
    };

    // Load SDK logic
    if (!(window as any).Spotify) {
      const script = document.createElement("script");
      script.id = "spotify-player-script";
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      document.body.appendChild(script);
      (window as any).onSpotifyWebPlaybackSDKReady = setupPlayer;
    } else {
      setupPlayer();
    }

    return () => {
      // 4. CLEANUP: Kill the singleton lock so it can restart on refresh
      if (playerRef.current) {
        console.log("♻️ Disconnecting Player...");
        playerRef.current.disconnect();
        playerRef.current = null;
        (window as any).SpotifyPlayerStarted = false;
      }
    };
  }, [userRole, setNowPlaying]); // Notice: No accessToken here to prevent re-renders

  const togglePlay = async (shouldPlay: boolean) => {
    if (!playerRef.current) return;
    try {
      await playerRef.current.activateElement();
      if (shouldPlay) await playerRef.current.resume();
      else await playerRef.current.pause();
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