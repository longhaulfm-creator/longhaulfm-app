import { useEffect } from 'react';
import { ably } from '../lib/ably'; 
import { useSpotifyStreaming } from './useSpotifyStreaming'; 
import { useSpotifyToken } from './useSpotifyToken';
import { useBroadcastStore } from '../stores/broadcastStore';

interface AdPayload {
  url: string;
  company: string;
  slogan: string;
}

export const useAdInterceptor = () => {
  const { token: accessToken, loading: tokenLoading } = useSpotifyToken(); 
  const { player } = useSpotifyStreaming(accessToken || '', 'dj');

  useEffect(() => {
    const channel = ably.channels.get('fleet-broadcast');
    console.log("[Interceptor] ONLINE. Monitoring jingles and sponsored ads.");

    // 1. Handle Manual Jingles
    const jingleSub = channel.subscribe('JINGLE_TRIGGER', async (message) => {
      const { url } = message.data;
      
      try {
        useBroadcastStore.setState({ isJinglePlaying: true });
        
        // DUCK: Dropped to 5% for better clarity
        if (player) await player.setVolume(0.05);

        const jingleAudio = new Audio(`${url}?t=${Date.now()}`);
        jingleAudio.crossOrigin = "anonymous";
        jingleAudio.volume = 1.0; // Jingle at full strength
        
        await jingleAudio.play();

        jingleAudio.onended = async () => {
          if (player) await player.setVolume(1.0);
          useBroadcastStore.setState({ isJinglePlaying: false });
        };

        jingleAudio.onerror = async () => {
          if (player) await player.setVolume(1.0);
          useBroadcastStore.setState({ isJinglePlaying: false });
        };

      } catch (err) {
        if (player) player.setVolume(1.0).catch(() => {});
        useBroadcastStore.setState({ isJinglePlaying: false });
      }
    });

    // 2. Handle Sponsored Audio Ads (from Edge Function)
    const adSub = channel.subscribe('PLAY_AD_INTERRUPT', async (message: { data: AdPayload }) => {
      const { url, company } = message.data;
      console.log(`[Ads] Playing sponsored content for: ${company}`);

      try {
        // DUCK: Dropped to 5% for better clarity
        if (player) await player.setVolume(0.05);

        const adAudio = new Audio(`${url}?t=${Date.now()}`);
        adAudio.crossOrigin = "anonymous";
        adAudio.volume = 1.0;
        
        await adAudio.play().catch(e => {
          if (player) player.setVolume(1.0);
        });

        adAudio.onended = async () => {
          if (player) await player.setVolume(1.0);
        };

        adAudio.onerror = async () => {
          if (player) await player.setVolume(1.0);
        };

      } catch (err) {
        if (player) player.setVolume(1.0).catch(() => {});
      }
    });

    return () => {
      channel.unsubscribe('PLAY_AD_INTERRUPT');
      channel.unsubscribe('JINGLE_TRIGGER');
    };
  }, [player]); 
};