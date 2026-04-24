import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { SpotifyAuth } from '../types';

const MASTER_DJ_TOKEN_ID = '6ba16792-7108-4d64-964c-f1e6005d5e2e';

export const useSpotifyToken = () => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const channelRef = useRef<any>(null);
  const isRefreshing = useRef(false); 

  const triggerRefresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || isRefreshing.current) return;

    isRefreshing.current = true;
    console.log('🔄 Triggering Edge Function: spotify-sync');
    
    try {
      const { data, error: refreshError } = await supabase.functions.invoke('spotify-sync', {
        body: { userId: MASTER_DJ_TOKEN_ID }
      });
      if (refreshError) throw refreshError;
      
      // Edge Function returns get_spotify_token_99 now
      if (data?.get_spotify_token_99) {
        setToken(data.get_spotify_token_99);
      }
      return data;
    } catch (err: any) {
      console.error('❌ Edge Function Refresh Failed:', err.message);
      return null;
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

      const { data: { session } } = await supabase.auth.getSession();

      if (data) {
        const now = new Date();
        const expiry = new Date(data.expires_at);
        
        if (now >= new Date(expiry.getTime() - 300000) && session) {
          await triggerRefresh();
        } else {
          setToken(data.get_spotify_token_99);
        }
      } else if (session) {
        await triggerRefresh();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [triggerRefresh]);

  useEffect(() => {
    let mounted = true;
    const channelName = `token_sync_${MASTER_DJ_TOKEN_ID}`;

    const setupSync = async () => {
      await fetchCurrentMasterToken();
      if (!mounted) return;

      // 1. Remove existing channel with the same name to prevent the 'after subscribe' crash
      // This is the critical fix for React Strict Mode
      const existingChannel = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
      if (existingChannel) {
        await supabase.removeChannel(existingChannel);
      }

      // 2. Setup new channel
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
          console.log('✅ Realtime Token Update Received');
          if (payload.new?.get_spotify_token_99) {
            setToken(payload.new.get_spotify_token_99);
          }
        }
      );

      // 3. Subscribe LAST
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('📡 Token Sync Active');
        }
      });

      channelRef.current = channel;
    };

    setupSync();

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchCurrentMasterToken]); 

  const takeControlAsDJ = async (newAuth: any) => {
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
      if (newAuth.get_spotify_token_99) setToken(newAuth.get_spotify_token_99);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return { token, loading, error, takeControlAsDJ, refreshLocal: fetchCurrentMasterToken };
};