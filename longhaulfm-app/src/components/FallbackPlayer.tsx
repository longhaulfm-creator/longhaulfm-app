import React, { useEffect, useRef } from 'react';
import { useBroadcastStore } from '@/stores/broadcastStore';

// A low-fi ambient truck idling/radio static loop
const FALLBACK_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"; 

export const FallbackPlayer = () => {
  const isFallbackActive = useBroadcastStore((s) => s.isFallbackActive);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      if (isFallbackActive) {
        audioRef.current.volume = 0;
        audioRef.current.play().catch(() => {});
        // Fade in
        const fadeIn = setInterval(() => {
          if (audioRef.current && audioRef.current.volume < 0.3) {
            audioRef.current.volume += 0.05;
          } else {
            clearInterval(fadeIn);
          }
        }, 100);
      } else {
        // Fade out
        const fadeOut = setInterval(() => {
          if (audioRef.current && audioRef.current.volume > 0.05) {
            audioRef.current.volume -= 0.05;
          } else {
            audioRef.current?.pause();
            clearInterval(fadeOut);
          }
        }, 50);
      }
    }
  }, [isFallbackActive]);

  return (
    <audio ref={audioRef} src={FALLBACK_URL} loop className="hidden" />
  );
};