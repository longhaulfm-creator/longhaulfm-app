import { useEffect, useRef, useState } from 'react';

export const useRadioStation = () => {
  const localMicRef = useRef<HTMLAudioElement | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.muted = false; 
    audio.autoplay = true;
    (audio as any).preservesPitch = false;
    localMicRef.current = audio;

    return () => {
      if (micStream) {
        micStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [micStream]);

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
        
        setMicStream(stream);

        if (localMicRef.current) {
          localMicRef.current.srcObject = stream;
          try {
            await localMicRef.current.play();
          } catch (playErr) {
            console.warn("⚠️ Audio play deferred, retrying...", playErr);
            setTimeout(() => localMicRef.current?.play(), 50);
          }
        }
        return stream; // Return the stream for immediate use
      } else {
        if (micStream) {
          micStream.getTracks().forEach(track => track.stop());
          setMicStream(null);
        }

        if (localMicRef.current) {
          localMicRef.current.pause();
          localMicRef.current.srcObject = null;
          localMicRef.current.load(); 
        }
        return null;
      }
    } catch (err) {
      console.error("❌ Mic Hardware Error:", err);
      throw err;
    }
  };

  return { toggleMicHardware, micStream };
};