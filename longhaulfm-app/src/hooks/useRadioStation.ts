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
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: true, 
            noiseSuppression: true, 
            autoGainControl: false,
            latency: 0,
            sampleRate: 48000
          } 
        });
        
        micStreamRef.current = stream;

        if (localMicRef.current) {
          localMicRef.current.srcObject = stream;
          await localMicRef.current.play();
        }
      } else {
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