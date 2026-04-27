import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const MASTER_DJ_TOKEN_ID = '6ba16792-7108-4d64-964c-f1e6005d5e2e';

export const useSpotifyToken = () => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const channelRef = useRef<any>(null);
  const isRefreshing = useRef(false);

  // 1. Programmatic Refresh via Edge Function
  const triggerRefresh = useCallback(async () => {
    // Only refresh if we aren't already doing it
    if (isRefreshing.current) return null;
    isRefreshing.current = true;

    console.log('🔄 Syncing with Spotify Cloud API...');
    
    try {
      // We call the function. It handles the Spotify 'refresh_token' flow internally.
      const { data, error: refreshError } = await supabase.functions.invoke('spotify-sync', {
        body: { userId: MASTER_DJ_TOKEN_ID }
      });

      if (refreshError) throw refreshError;
      
      // We expect the Edge Function to return the updated access token
      if (data?.get_spotify_token_99) {
        setToken(data.get_spotify_token_99);
        return data.get_spotify_token_99;
      }
    } catch (err: any) {
      console.error('❌ Spotify Sync Failed:', err.message);
      setError(`Auth Sync Error: ${err.message}`);
      return null;
    } finally {
      // Debounce the refresh to prevent spamming the Edge Function
      setTimeout(() => { isRefreshing.current = false; }, 2000);
    }
  }, []);

  // 2. Initial Fetch & Expiry Check
  const fetchCurrentMasterToken = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('spotify_auth')
        .select('get_spotify_token_99, expires_at')
        .eq('id', MASTER_DJ_TOKEN_ID)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        const now = new Date();
        const expiry = new Date(data.expires_at);
        
        // Refresh if within 5 minutes of expiry
        if (now >= new Date(expiry.getTime() - 300000)) {
          console.log('⏰ Token near expiry, refreshing...');
          await triggerRefresh();
        } else {
          setToken(data.get_spotify_token_99);
        }
      } else {
        // No record found, attempt initial sync
        await triggerRefresh();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [triggerRefresh]);

  // 3. Realtime Subscription Logic
  useEffect(() => {
    let mounted = true;
    const channelName = `token_sync_${MASTER_DJ_TOKEN_ID}`;

    const setupSync = async () => {
      await fetchCurrentMasterToken();
      if (!mounted) return;

      // Clean up any stale channels from previous renders
      const existingChannel = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
      if (existingChannel) {
        await supabase.removeChannel(existingChannel);
      }

      const channel = supabase.channel(channelName);
      
      channel.on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'spotify_auth',
          filter: `id=eq.${MASTER_DJ_TOKEN_ID}` 
        },
        (payload) => {
          if (payload.new?.get_spotify_token_99) {
            console.log('⚡ New Master Token Received via Realtime');
            setToken(payload.new.get_spotify_token_99);
          }
        }
      );

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('📡 Realtime Auth Channel: ONLINE');
        }
      });

      channelRef.current = channel;
    };

    setupSync();

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchCurrentMasterToken]); 

  // 4. Manually Take Control (e.g., when the DJ logs in fresh)
  const takeControlAsDJ = async (newAuth: { get_spotify_token_99: string, refresh_token: string }) => {
    try {
      const { error } = await supabase
        .from('spotify_auth')
        .update({
          get_spotify_token_99: newAuth.get_spotify_token_99,
          refresh_token: newAuth.refresh_token,
          expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', MASTER_DJ_TOKEN_ID);

      if (error) throw error;
      setToken(newAuth.get_spotify_token_99);
    } catch (err: any) {
      setError(`Failed to seize Master Token: ${err.message}`);
    }
  };

  return { 
    token, 
    loading, 
    error, 
    takeControlAsDJ, 
    refreshLocal: fetchCurrentMasterToken 
  };
};