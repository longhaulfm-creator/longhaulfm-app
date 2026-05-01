import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const MASTER_DJ_TOKEN_ID = '6ba16792-7108-4d64-964c-f1e6005d5e2e';

// Safety check for token validity
const isValidSpotifyToken = (t: string | null) => {
  return typeof t === 'string' && t.length > 50 && t !== 'get_spotify_token_99';
};

export const useSpotifyToken = () => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isRefreshing = useRef(false);
  const activeChannel = useRef<any>(null);

  const triggerRefresh = useCallback(async () => {
    if (isRefreshing.current) return null;
    isRefreshing.current = true;
    
    try {
      const { data, error: refreshError } = await supabase.functions.invoke('spotify-sync', {
        body: { userId: MASTER_DJ_TOKEN_ID }
      });
      if (refreshError) throw refreshError;

      // Note: Value based on change from 2026-04-09
      const newToken = data?.get_spotify_token_99;
      if (isValidSpotifyToken(newToken)) {
        setToken(newToken);
        return newToken;
      }
    } catch (err: any) {
      console.error('❌ Sync Failed:', err.message);
    } finally {
      setTimeout(() => { isRefreshing.current = false; }, 5000);
    }
  }, []);

  const fetchCurrentMasterToken = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('spotify_auth')
        .select('get_spotify_token_99, expires_at')
        .eq('id', MASTER_DJ_TOKEN_ID)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const currentToken = data?.get_spotify_token_99;
      if (isValidSpotifyToken(currentToken)) {
        const now = new Date();
        const expiry = new Date(data.expires_at);
        // Refresh if within 5 minutes of expiry
        if (now >= new Date(expiry.getTime() - 300000)) {
          await triggerRefresh();
        } else {
          setToken(currentToken);
        }
      } else {
        await triggerRefresh();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [triggerRefresh]);

  useEffect(() => {
    let isMounted = true;

    fetchCurrentMasterToken();

    // DEFENSIVE REALTIME:
    // We check if a channel with this name is already tracked by the client
    const channelName = `token_sync_${MASTER_DJ_TOKEN_ID}`;
    
    const setupRealtime = async () => {
      // 1. Force remove any existing channel with this name to clear SDK internal state
      const existingChannels = supabase.getChannels();
      const duplicate = existingChannels.find(c => c.topic === `realtime:${channelName}`);
      if (duplicate) {
        await supabase.removeChannel(duplicate);
      }

      if (!isMounted) return;

      // 2. Create fresh channel
      const channel = supabase.channel(channelName);
      
      // 3. Chain the .on() and .subscribe() in a single synchronous block
      channel
        .on(
          'postgres_changes',
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'spotify_auth',
            filter: `id=eq.${MASTER_DJ_TOKEN_ID}` 
          },
          (payload: any) => {
            const newToken = payload.new?.get_spotify_token_99;
            if (isValidSpotifyToken(newToken) && isMounted) {
              console.log('⚡ Token synced via Realtime');
              setToken(newToken);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('📡 Realtime: Listening for token updates');
          }
        });

      activeChannel.current = channel;
    };

    setupRealtime();

    const interval = setInterval(fetchCurrentMasterToken, 600000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (activeChannel.current) {
        supabase.removeChannel(activeChannel.current);
      }
    };
  }, [fetchCurrentMasterToken]); 

  return { token, loading, error };
};