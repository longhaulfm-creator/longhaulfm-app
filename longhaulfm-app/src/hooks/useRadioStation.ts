import { useEffect, useRef, useState } from 'react';

export const useRadioStation = () => {
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const [isDucked, setIsDucked] = useState(false);

  const killMicComplete = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    sourceNodeRef.current = null;
    gainNodeRef.current = null;
    setIsDucked(false);
  };

  useEffect(() => {
    return () => killMicComplete();
  }, []);

  const initMicHardware = async () => {
    if (micStreamRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          channelCount: 1
        } 
      });

      // IMMEDIATE SAFETY: Mute tracks before even creating the context
      stream.getAudioTracks().forEach(t => (t.enabled = false));

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const source = ctx.createMediaStreamSource(stream);
      const gainNode = ctx.createGain();

      // Set volume to 0 immediately
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      
      sourceNodeRef.current = source;
      gainNodeRef.current = gainNode;
      audioCtxRef.current = ctx;
      micStreamRef.current = stream;

      if (ctx.state !== 'suspended') await ctx.suspend();
      
      console.log("🔒 Hardware Gate: LOCKED");
    } catch (err: any) {
      console.error("❌ Setup Failed:", err.message);
      throw err;
    }
  };

  const toggleMicHardware = async (active: boolean) => {
    if (active) {
      if (!micStreamRef.current) await initMicHardware();
      
      if (audioCtxRef.current?.state === 'suspended') {
        await audioCtxRef.current.resume();
      }

      if (sourceNodeRef.current && gainNodeRef.current && audioCtxRef.current) {
        sourceNodeRef.current.connect(gainNodeRef.current);
        gainNodeRef.current.connect(audioCtxRef.current.destination);
        // Quick ramp up to avoid "pop"
        gainNodeRef.current.gain.exponentialRampToValueAtTime(1.0, audioCtxRef.current.currentTime + 0.02);
      }

      micStreamRef.current?.getAudioTracks().forEach(t => (t.enabled = true));
      setIsDucked(true);
    } else {
      if (gainNodeRef.current && audioCtxRef.current) {
        // Absolute zero
        gainNodeRef.current.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
        gainNodeRef.current.disconnect();
      }

      micStreamRef.current?.getAudioTracks().forEach(t => (t.enabled = false));
      
      if (audioCtxRef.current?.state === 'running') {
        await audioCtxRef.current.suspend();
      }

      setIsDucked(false);
    }
  };

  return { initMicHardware, toggleMicHardware, killMicComplete, isDucked };
};