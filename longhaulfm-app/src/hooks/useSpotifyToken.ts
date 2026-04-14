import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { SpotifyAuth } from '../types';

// The fixed identity for the Isuhamba Broadcast Master
const MASTER_DJ_TOKEN_ID = '6ba16792-7108-4d64-964c-f1e6005d5e2e';

export const useSpotifyToken = () => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isRefreshing = useRef(false);

  /**
   * Triggers the Edge Function to swap the stored Refresh Token 
   * for a new short-lived Access Token.
   */
  const getFreshTokenFromSupabase = async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('spotify-refresh');
    if (error) throw new Error("Edge Function Error: " + error.message);
    if (!data?.access_token) throw new Error("No access token in response");
    return data.access_token;
  };

  /**
   * Persists the new token and expiry back to the 'spotify_auth' table.
   */
  const updateSpotifyAuth = async (auth: SpotifyAuth) => {
    try {
      const { error } = await supabase
        .from('spotify_auth')
        .upsert({
          ...auth,
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
    } catch (err) {
      console.error('❌ Supabase Auth Sync Error:', err);
    }
  };

  const refreshToken = useCallback(async () => {
    // Prevent concurrent refresh attempts
    if (isRefreshing.current) return token;
    isRefreshing.current = true;
    
    try {
      // 1. Fetch current credentials from the central auth table
      const { data: spotifyAuth, error: fetchError } = await supabase
        .from('spotify_auth')
        .select('*')
        .eq('id', MASTER_DJ_TOKEN_ID)
        .maybeSingle(); // Prevents crashing if the row is temporarily missing

      if (fetchError) throw fetchError;

      if (!spotifyAuth) {
        console.warn("📡 No Master Auth row found. Standing by for manual seed...");
        isRefreshing.current = false;
        return null;
      }

      const currentAuth = spotifyAuth as SpotifyAuth;
      const expiresAt = new Date(currentAuth.expires_at).getTime();
      const now = Date.now();

      // 2. Only refresh if the token is dead or dying (less than 2 mins left)
      if (expiresAt > now + 120000) {
        setToken(currentAuth.access_token);
        isRefreshing.current = false;
        return currentAuth.access_token;
      }

      console.log('📡 Signal stale. Re-authorizing via Edge Function...');
      
      // 3. Request fresh access from Spotify
      const newAccessToken = await getFreshTokenFromSupabase();
      
      // 4. Prepare update payload (standard 1-hour expiry)
      const updatedAuth = {
        ...currentAuth,
        access_token: newAccessToken,
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString() 
      };

      // 5. Update the central source of truth
      await updateSpotifyAuth(updatedAuth);
      
      setToken(newAccessToken);
      isRefreshing.current = false;
      return newAccessToken;

    } catch (err: any) {
      console.error('❌ Token System Failure:', err);
      setError(err.message);
      isRefreshing.current = false;
      return null;
    }
  }, [token]);

  useEffect(() => {
    // Initial handshake
    refreshToken().finally(() => setLoading(false));

    // Monitor signal every 5 minutes to ensure no drop-outs
    const interval = setInterval(refreshToken, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [refreshToken]);

  return { token, loading, error, refreshToken };
};