import { useEffect, useState, useRef } from 'react';
import { ably } from '../lib/ably';

export interface TrackSyncEvent {
  trackId: string;
  positionMs: number;
  timestamp: number;
}

export const useRadioStation = () => {
  const [isDucked, setIsDucked] = useState(false);
  const [latestTrackSync, setLatestTrackSync] = useState<TrackSyncEvent | null>(null);
  
  // Audio reference for the Johannesburg Icecast stream
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. Initialize Audio Hardware
  useEffect(() => {
    // Pointing to your verified AzuraCast mount
    audioRef.current = new Audio("http://34.35.38.193:8000/radio.mp3");
    audioRef.current.preload = "none"; 
    
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  // 2. Network Sync (Ably)
  useEffect(() => {
    const channel = ably.channels.get('longhaul-live-sync');

    const duckingSub = (message: any) => {
      console.log("📻 Signal Sync: Ducking status set to", message.data.ducked);
      setIsDucked(message.data.ducked);
    };

    const trackSub = (message: any) => {
      setLatestTrackSync(message.data as TrackSyncEvent);
    };

    channel.subscribe('ducking', duckingSub);
    channel.subscribe('track-sync', trackSub);

    return () => { 
      channel.unsubscribe('ducking', duckingSub);
      channel.unsubscribe('track-sync', trackSub);
    };
  }, []);

  // 3. Hardware Control
  const toggleStream = (play: boolean) => {
    if (!audioRef.current) return;
    
    if (play) {
      // Re-setting the SRC flushes any old buffer to reduce lag
      audioRef.current.src = "http://34.35.38.193:8000/radio.mp3";
      audioRef.current.play().catch(err => console.error("Broadcast Stream Error:", err));
    } else {
      audioRef.current.pause();
      audioRef.current.src = ""; // Hard stop the data connection
    }
  };

  const broadcastTrack = (trackUri: string, positionMs: number) => {
    const channel = ably.channels.get('longhaul-live-sync');
    channel.publish('track-sync', {
      trackId: trackUri,
      positionMs: positionMs,
      timestamp: Date.now()
    });
  };

  return { isDucked, latestTrackSync, broadcastTrack, toggleStream };
};