import { useEffect } from 'react';
import { ably } from '../lib/ably'; 
import { useSpotifyStreaming } from './useSpotifyStreaming'; 
import { useSpotifyToken } from './useSpotifyToken';

interface AdPayload {
  url: string;
  company: string;
  slogan: string;
}

export const useAdInterceptor = () => {
  const { token: accessToken, loading: tokenLoading } = useSpotifyToken(); 
  const { player } = useSpotifyStreaming(accessToken || '', 'dj');

  useEffect(() => {
    if (tokenLoading || !accessToken || !player) return;

    const channel = ably.channels.get('fleet-broadcast');
    console.log("[Interceptor] ONLINE. Ready for broadcast interrupts.");

    const subscription = channel.subscribe('PLAY_AD_INTERRUPT', async (message: { data: AdPayload }) => {
      const { url, company, slogan } = message.data;

      try {
        console.log(`[Interceptor] Intercepting for: ${company}`);
        await player.setVolume(0.1);

        const adAudio = new Audio(`${url}?t=${Date.now()}`);
        adAudio.crossOrigin = "anonymous";
        
        await adAudio.play().catch(e => {
          console.error("[Interceptor] Playback failed:", e.message);
          player.setVolume(1.0);
        });

        adAudio.onended = async () => {
          await player.setVolume(1.0);
          console.log("[Interceptor] Ad finished. Resuming Music.");
        };

        adAudio.onerror = async () => {
          await player.setVolume(1.0);
        };

      } catch (err) {
        player.setVolume(1.0).catch(() => {});
      }
    });

    return () => {
      channel.unsubscribe('PLAY_AD_INTERRUPT');
    };
  }, [accessToken, player, tokenLoading]); 
};