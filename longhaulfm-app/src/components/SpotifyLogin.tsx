// src/components/SpotifyLogin.tsx
import React from 'react';
import { initiateSpotifyLogin } from '../services/spotifyAuth';

interface SpotifyLoginProps {
  onLoginSuccess?: () => void;
  onLoginFailure?: (error: string) => void;
  status: string; // Add status prop
}

const SpotifyLogin: React.FC<SpotifyLoginProps> = ({ status }) => {

  const handleLogin = () => {
    initiateSpotifyLogin();
    // The initiateSpotifyLogin function will redirect the user to Spotify.
    // Success/failure will be handled on the callback page.
  };

  return (
    <div className="bg-brand-dark p-4 rounded-lg shadow-lg">
      <div className="panel">
        <div className="panel-header">
          <h2 className="font-header text-xl text-gold">Spotify Master DJ Login</h2>
        </div>
        <div className="p-4 space-y-4">
          <p className="font-ui text-white">
            Please log in with Spotify to manage the Master DJ token and ensure continuous music playback.
          </p>
          
          <div className="flex items-center space-x-2">
            <span className="font-ui text-white">Status:</span>
            <span className="font-header text-lg text-gold-bright">{status}</span>
          </div>

          <button onClick={handleLogin} className="btn-mega-play w-full">
            Connect Spotify
          </button>
        </div>
      </div>
    </div>
  );
};

export default SpotifyLogin;
