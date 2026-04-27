import { useEffect, useRef } from 'react';

export const useRadioStation = () => {
  const localMicRef = useRef<HTMLAudioElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Create a hidden audio element to pipe the mic to the Virtual Cable
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
    console.log("🎤 ToggleMicHardware called with:", active);
    
    try {
      if (active) {
        // 1. Request Mic Access
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: false, 
            noiseSuppression: true, 
            autoGainControl: false 
          } 
        });
        
        micStreamRef.current = stream;

        // 2. Attach to the audio element (which should output to Virtual Cable)
        if (localMicRef.current) {
          localMicRef.current.srcObject = stream;
          await localMicRef.current.play();
          console.log("✅ Mic is LIVE to Virtual Cable");
        }
      } else {
        // 3. Clean up
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach(track => track.stop());
          micStreamRef.current = null;
        }
        if (localMicRef.current) {
          localMicRef.current.srcObject = null;
          localMicRef.current.pause();
        }
        console.log("🛑 Mic Hardware SHUT DOWN");
      }
    } catch (err) {
      console.error("❌ Mic Hardware Error:", err);
      throw err; // Re-throw so BroadcastControls knows the hardware failed
    }
  };

  return { toggleMicHardware };
};