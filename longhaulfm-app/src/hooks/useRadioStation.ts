import { useEffect, useRef } from 'react';

export const useRadioStation = () => {
  const localMicRef = useRef<HTMLAudioElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.muted = false; 
    audio.autoplay = true;
    localMicRef.current = audio;

    return () => {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const toggleMicHardware = async (active: boolean) => {
    console.log("🎤 Mic Signal:", active ? "LIVE" : "KILLED");
    
    try {
      if (active) {
        // Constraints optimized for real-time interaction
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: true, 
            noiseSuppression: true, 
            autoGainControl: false,
            // Shaves off milliseconds by requesting direct hardware access
            latency: 0,
            sampleRate: 48000, 
            sampleSize: 16
          } 
        });
        
        micStreamRef.current = stream;

        if (localMicRef.current) {
          localMicRef.current.srcObject = stream;
          await localMicRef.current.play();
        }
      } else {
        // --- THE "GUILLOTINE" KILL ---
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach(track => {
            track.enabled = false; 
            track.stop();         
          });
          micStreamRef.current = null;
        }

        if (localMicRef.current) {
          localMicRef.current.pause();
          localMicRef.current.srcObject = null;
          // Flushes the browser's audio buffer immediately
          localMicRef.current.load(); 
        }
      }
    } catch (err) {
      console.error("❌ Mic Hardware Error:", err);
      throw err;
    }
  };

  return { toggleMicHardware };
};