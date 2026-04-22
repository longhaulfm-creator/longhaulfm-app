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
    // ONLY Admins/DJs can trigger the Edge Function
    if (!session || isRefreshing.current) return;

    isRefreshing.current = true;
    console.log('🔄 Triggering Edge Function: spotify-sync');
    
    try {
      const { data, error: refreshError } = await supabase.functions.invoke('spotify-sync', {
        body: { userId: MASTER_DJ_TOKEN_ID }
      });
      if (refreshError) throw refreshError;
      
      // If the function returns a new token, set it immediately
      if (data?.access_token) {
        setToken(data.access_token);
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
        .select('access_token, expires_at')
        .eq('id', MASTER_DJ_TOKEN_ID)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const { data: { session } } = await supabase.auth.getSession();

      if (data) {
        const now = new Date();
        const expiry = new Date(data.expires_at);
        
        // If expired and we are the Admin, fix it.
        if (now >= new Date(expiry.getTime() - 300000) && session) {
          await triggerRefresh();
        } else {
          setToken(data.access_token);
        }
      } else if (session) {
        // No row found at all? If admin, try to bootstrap it
        await triggerRefresh();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [triggerRefresh]);

  useEffect(() => {
    fetchCurrentMasterToken();

    if (!channelRef.current) {
      channelRef.current = supabase
        .channel(`token_sync_${MASTER_DJ_TOKEN_ID}`)
        .on(
          'postgres_changes',
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'spotify_auth',
            filter: `id=eq.${MASTER_DJ_TOKEN_ID}` 
          },
          (payload) => {
            console.log('✅ Realtime Token Update Received');
            setToken(payload.new.access_token);
          }
        )
        .subscribe();
    }

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [fetchCurrentMasterToken]); 

  const takeControlAsDJ = async (newAuth: Partial<SpotifyAuth>) => {
    try {
      const { error } = await supabase
        .from('spotify_auth')
        .update({
          access_token: newAuth.access_token,
          refresh_token: newAuth.refresh_token,
          expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', MASTER_DJ_TOKEN_ID);

      if (error) throw error;
      if (newAuth.access_token) setToken(newAuth.access_token);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return { token, loading, error, takeControlAsDJ, refreshLocal: fetchCurrentMasterToken };
};