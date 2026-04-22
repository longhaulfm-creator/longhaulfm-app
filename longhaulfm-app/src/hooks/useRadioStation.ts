import { useEffect, useRef } from 'react';

export const useRadioStation = () => {
  const localMicRef = useRef<HTMLAudioElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.muted = false; // MUST be false to hear yourself in Virtual Cable
    localMicRef.current = audio;
    return () => {
      if (micStreamRef.current) micStreamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const toggleMicHardware = async (active: boolean) => {
    console.log("🎤 ToggleMicHardware called with:", active);
    
    if (active) {
      try {
        // Only request if we don't have an active stream
        if (!micStreamRef.current) {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: false } 
          });
          micStreamRef.current = stream;
        }

        if (localMicRef.current) {
          localMicRef.current.srcObject = micStreamRef.current;
          await localMicRef.current.play();
          console.log("✅ Mic is LIVE to Virtual Cable");
        }
      } catch (err) {
        console.error("❌ Mic Hardware failed to start:", err);
      }
    } else {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
      }
      if (localMicRef.current) {
        localMicRef.current.srcObject = null;
      }
      console.log("🛑 Mic Hardware SHUT DOWN");
    }
  };

  return { toggleMicHardware };
};