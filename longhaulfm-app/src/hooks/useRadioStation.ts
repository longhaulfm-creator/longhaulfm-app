import { useEffect, useState, useRef } from 'react';
import { ably } from '../lib/ably';

export const useRadioStation = () => {
  const [isDucked, setIsDucked] = useState(false);
  const SECURE_STREAM_URL = "https://radio.longhaul-fm.co.za/radio/8000/radio.mp3";

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "none";
    audioRef.current = audio;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  // 🎚️ LISTENER DUCKING: Drop music to 15% so the voice cuts through completely
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isDucked ? 0.15 : 1.0;
    }
  }, [isDucked]);

  useEffect(() => {
    const channel = ably.channels.get('longhaul-live-sync');
    const duckingSub = (msg: any) => {
      setTimeout(() => setIsDucked(msg.data.ducked), 2200);
    };
    channel.subscribe('ducking', duckingSub);
    return () => { channel.unsubscribe('ducking', duckingSub); };
  }, []);

  const toggleStream = async (play: boolean) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (play) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } 
        });
        micStreamRef.current = stream;
        
        audio.src = `${SECURE_STREAM_URL}?t=${Date.now()}`;
        audio.muted = false; // Ensure the HTML element is active
        playPromiseRef.current = audio.play();

        const jumpToLive = () => {
          if (audio.buffered.length > 0) {
            audio.currentTime = audio.buffered.end(audio.buffered.length - 1);
            audio.removeEventListener('canplay', jumpToLive);
          }
        };
        audio.addEventListener('canplay', jumpToLive);

      } catch (err) {
        console.error("❌ Hardware Error:", err);
      }
    } else {
      // 🛑 NUKE PROTOCOL: Total Software and Hardware Annihilation
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => {
          track.enabled = false; // Step 1: Force OS to mute the channel
          track.stop();          // Step 2: Sever power to the hardware sensor
        });
        micStreamRef.current = null; // Step 3: Destroy the memory reference
      }
      
      audio.pause();
      audio.muted = true; // Step 4: Mute the HTML element to kill any phantom bleed
      audio.src = ""; 
      audio.load(); 
      playPromiseRef.current = null;
    }
  };

  return { isDucked, toggleStream };
};