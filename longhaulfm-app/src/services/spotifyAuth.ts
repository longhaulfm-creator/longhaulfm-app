// src/services/spotifyAuth.ts
import { spotifyClient } from '../lib/spotify/client';
import { supabase } from '../lib/supabase';
import { SpotifyAuth } from '../types';

const MASTER_DJ_TOKEN_ID = 'master-dj-token';

export const initiateSpotifyLogin = () => {
  spotifyClient.authenticate().then((url) => {
    // Redirect user to Spotify for authorization
    // In a Tauri app, you might need to open this URL in an external browser
    // or use a webview.
    window.location.href = url;
  }).catch((error) => {
    console.error("Error initiating Spotify login:", error);
    alert("Failed to initiate Spotify login. Check console for details.");
  });
};

export const handleSpotifyCallback = async (code: string) => {
  try {
    const { accessToken, refreshToken, expiresAt, tokenType, scopes } = await spotifyClient.get                  AuthenticationResponse(code);

    const newExpiresAt = new Date(expiresAt).toISOString();

    const spotifyAuth: SpotifyAuth = {
      id: MASTER_DJ_TOKEN_ID,
      access_token: accessToken,
      refresh_token: refreshToken!,
      expires_at: newExpiresAt,
      token_type: tokenType,
      scope: scopes.join(' '),
    };

    const { error } = await supabase
      .from('spotify_auth')
      .upsert(spotifyAuth, { onConflict: 'id' });

    if (error) {
      throw error;
    }

    console.log('Master DJ Spotify token stored in Supabase.');
    return true;
  } catch (err: any) {
    console.error('Error handling Spotify callback:', err);
    alert(`Failed to complete Spotify login: ${err.message || 'Unknown error'}`);
    return false;
  }
};
