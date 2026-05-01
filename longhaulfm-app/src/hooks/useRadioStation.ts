import { useEffect, useRef, useState } from 'react';

export const useRadioStation = () => {
  const micStreamRef = useRef<MediaStream | null>(null);
  const [isDucked, setIsDucked] = useState(false);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const toggleMicHardware = async (active: boolean) => {
    // 1. ENGAGING THE MIC (Spacebar/Button Down)
    if (active) {
      try {
        // Only request the stream if we don't already have one
        if (!micStreamRef.current) {
          console.log("🎙️ Attempting to engage Mic hardware...");
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = stream;
        }

        // Enable the track and trigger Ducking
        micStreamRef.current.getAudioTracks().forEach(t => (t.enabled = true));
        setIsDucked(true);
        console.log("🎤 LIVE - Ducking Engaged");

      } catch (err: any) {
        // SILENT FAIL: No popups, just console logs
        console.error("❌ Mic Blocked (OBS/BUTT likely holding lock):", err.message);
        // We still trigger "Ducking" so the DJ can talk over the music locally 
        // even if the stream hardware is busy.
        setIsDucked(true); 
      }
    } 
    
    // 2. RELEASING THE MIC (Spacebar/Button Up)
    else {
      if (micStreamRef.current) {
        // We don't stop the tracks (to avoid re-init lag next time), just disable them
        micStreamRef.current.getAudioTracks().forEach(t => (t.enabled = false));
      }
      setIsDucked(false);
      console.log("🎤 MUTED - Music Normal");
    }
  };

  const killMicComplete = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
      setIsDucked(false);
      console.log("⚰️ Hardware Connection Terminated");
    }
  };

  // We expose initMic as a no-op or a simple check if needed, 
  // but toggleMicHardware handles the heavy lifting now.
  const initMic = async () => {
    console.log("🔍 Mic init deferred to PTT (Push-to-Talk) action.");
    return null;
  };

  return { toggleMicHardware, initMic, killMicComplete, isDucked };
};