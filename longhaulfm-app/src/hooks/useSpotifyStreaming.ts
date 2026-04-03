import { useEffect, useState } from 'react';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { spotifyClient, PLAYLIST_ID } from '../lib/spotify/client';

export function useSpotifyStreaming() {
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    // 1. Handle Deep Link Redirects (for Android Auth)
    onOpenUrl((urls) => {
      const url = new URL(urls[0]);
      if (url.pathname === '/callback') {
        // The SDK usually picks up the code from the URL automatically
        // but you may need to trigger a re-auth check here.
        window.location.href = url.href; 
      }
    });

    // 2. Initialize Spotify Player
    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: 'LongHaul FM Android',
        getOAuthToken: async (cb: (token: string) => void) => {
          const token = await spotifyClient.getAccessToken();
          cb(token?.access_token || "");
        },
        volume: 0.8
      });

      player.addListener('ready', ({ device_id }) => {
        console.log('Player Ready');
        setDeviceId(device_id);
      });

      player.connect();
    };
  }, []);

  const playLongHaul = async () => {
    if (!deviceId) return;
    await spotifyClient.player.startResumePlayback(deviceId, {
      context_uri: `spotify:playlist:${PLAYLIST_ID}`
    });
  };

  return { playLongHaul, deviceId };
}