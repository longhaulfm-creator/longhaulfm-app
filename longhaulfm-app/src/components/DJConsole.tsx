import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import * as Ably from 'ably';
import { Mic, MicOff, SkipForward, Play, Pause, Radio } from 'lucide-react';

interface DJConsoleProps {
  spotifyPlayer: any; // The initialized Spotify Player object
  deviceId: string;   // The Spotify Device ID for this station
}

export const DJConsole: React.FC<DJConsoleProps> = ({ spotifyPlayer, deviceId }) => {
  const { t } = useTranslation();
  const [isMicLive, setIsMicLive] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [ablyChannel, setAblyChannel] = useState<Ably.RealtimeChannel | null>(null);

  // 1. Initialize Ably Connection for Publishing
  useEffect(() => {
    const ably = new Ably.Realtime({ key: import.meta.env.VITE_ABLY_KEY });
    const channel = ably.channels.get('longhaul-live');
    setAblyChannel(channel);

    return () => {
      ably.close();
    };
  }, []);

  // 2. Toggle Microphone & Trigger Ducking
  const toggleMic = async () => {
    const newState = !isMicLive;
    setIsMicLive(newState);

    if (ablyChannel) {
      // Instant signal to all listeners to drop volume to 20%
      await ablyChannel.publish('mic-state', { active: newState });
    }
    
    // TODO: Connect to LiveKit Voice Stream here
    console.log(newState ? "ON AIR: Shouting to the masses" : "OFF AIR: Music only");
  };

  // 3. Sync Current Track to All Listeners
  const syncTrack = async () => {
    if (!spotifyPlayer || !ablyChannel) return;

    const state = await spotifyPlayer.getCurrentState();
    if (!state) return;

    const trackData = {
      uri: state.track_window.current_track.uri,
      position_ms: state.position,
      isPlaying: !state.paused
    };

    // Force all listeners to jump to this exact song and millisecond
    await ablyChannel.publish('track-change', trackData);
  };

  return (
    <div className="p-6 bg-base-300 rounded-box shadow-xl border-2 border-primary/20">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black flex items-center gap-2">
          <Radio className="text-primary" /> {t('dj.console_title')}
        </h2>
        <div className={`badge ${isMicLive ? 'badge-error' : 'badge-ghost'} gap-2 p-4 font-bold animate-pulse`}>
          {isMicLive ? t('ui.on_air') : t('ui.off_air')}
        </div>
      </div>

      {/* BIG RED BUTTON: MIC CONTROL */}
      <div className="grid grid-cols-1 gap-4 mb-8">
        <button 
          onClick={toggleMic}
          className={`btn btn-xl h-24 text-2xl ${isMicLive ? 'btn-error' : 'btn-outline btn-primary'}`}
        >
          {isMicLive ? <Mic size={40} /> : <MicOff size={40} />}
          {isMicLive ? t('dj.stop_talking') : t('dj.start_talking')}
        </button>
      </div>

      {/* MUSIC CONTROLS */}
      <div className="bg-black/20 p-4 rounded-lg flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <span className="text-sm font-mono opacity-70">MASTER_PLAYBACK</span>
            <button onClick={syncTrack} className="btn btn-xs btn-ghost text-secondary">
               {t('dj.force_sync_all')}
            </button>
        </div>
        
        <div className="flex justify-center gap-6">
          <button className="btn btn-circle btn-lg" onClick={() => spotifyPlayer.previousTrack()}>
            <SkipForward className="rotate-180" />
          </button>
          <button className="btn btn-circle btn-primary btn-lg" onClick={() => spotifyPlayer.togglePlay()}>
            <Play />
          </button>
          <button className="btn btn-circle btn-lg" onClick={() => spotifyPlayer.nextTrack()}>
            <SkipForward />
          </button>
        </div>
      </div>

      {/* FOOTER: SHONA/AFRIKAANS ACCESSIBILITY */}
      <p className="mt-4 text-center text-xs opacity-50 italic">
        {t('dj.help_text')}
      </p>
    </div>
  );
};