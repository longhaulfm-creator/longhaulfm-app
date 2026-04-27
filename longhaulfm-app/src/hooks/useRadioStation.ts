import { useEffect, useRef } from 'react';

export const useRadioStation = () => {
  const localMicRef = useRef<HTMLAudioElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Hidden element to pipe audio to the Virtual Cable
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
    console.log("🎤 ToggleMicHardware:", active ? "ENERGIZE" : "KILL");
    
    try {
      if (active) {
        // Request Mic Access with noise suppression but no echo cancel (cleaner for radio)
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: true, 
            noiseSuppression: true, 
            autoGainControl: false 
          } 
        });
        
        micStreamRef.current = stream;

        if (localMicRef.current) {
          localMicRef.current.srcObject = stream;
          await localMicRef.current.play();
          console.log("✅ Mic Pipeline Active");
        }
      } else {
        // --- THE KILL SWITCH ---
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach(track => {
            track.enabled = false; // Mute track first
            track.stop();         // Kill hardware
          });
          micStreamRef.current = null;
        }

        if (localMicRef.current) {
          localMicRef.current.pause();
          localMicRef.current.srcObject = null;
          localMicRef.current.load(); // Force clear buffer
        }
        console.log("🛑 Mic Pipeline Destroyed");
      }
    } catch (err) {
      console.error("❌ Mic Hardware Error:", err);
      throw err;
    }
  };

  return { toggleMicHardware };
};