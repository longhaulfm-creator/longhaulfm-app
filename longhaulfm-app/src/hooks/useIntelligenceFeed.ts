import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface IntelAlert {
  id: string;
  category: string;
  location: string;
  message: string;
  is_active: boolean;
  is_verified: boolean;
  province: string;
  alert_type: string;
  created_at: string;
}

export interface PartnerContent {
  id: string;
  brand_name: string;
  campaign_name: string;
  media_url: string;
  cta_text: string;
}

export const useIntelligenceFeeds = () => {
  const [verifiedAlerts, setVerifiedAlerts] = useState<IntelAlert[]>([]);
  const [partnerContent, setPartnerContent] = useState<PartnerContent[]>([]);
  const [loading, setLoading] = useState(true);
  
  const channelRef = useRef<any>(null);

  const fetchInitialFeeds = useCallback(async () => {
    try {
      // 1. Fetch Verified Intel from road_alerts
      const { data: alerts } = await supabase
        .from('road_alerts')
        .select('*')
        .eq('is_verified', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

      // 2. Fetch Partner Content from ad_campaigns/advertisers
      // Assuming a join or flat table for simplicity based on your schema
      const { data: partners } = await supabase
        .from('ad_campaigns')
        .select(`
          id,
          campaign_name,
          media_url,
          cta_text,
          advertisers (brand_name)
        `)
        .limit(5);

      if (alerts) setVerifiedAlerts(alerts);
      if (partners) {
        // Flattening the advertiser join for the UI
        const formattedPartners = partners.map((p: any) => ({
          id: p.id,
          brand_name: p.advertisers?.brand_name || 'Partner',
          campaign_name: p.campaign_name,
          media_url: p.media_url,
          cta_text: p.cta_text
        }));
        setPartnerContent(formattedPartners);
      }
    } catch (err) {
      console.error('📊 Feed Initialization Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialFeeds();

    // Prevent multiple subscriptions in Dev Strict Mode
    if (channelRef.current) return;

    // Initialize the Multi-Stream Channel
    const channel = supabase.channel('intelligence_hub');

    // Listener A: Verified Intel Updates
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'road_alerts' },
      (payload) => {
        if (payload.new && (payload.new as IntelAlert).is_verified) {
          console.log('🚨 REALTIME INTEL UPLINK:', payload.new);
          setVerifiedAlerts((prev) => {
            const filtered = prev.filter(a => a.id !== payload.new.id);
            return [payload.new as IntelAlert, ...filtered].slice(0, 10);
          });
        }
      }
    );

    // Listener B: Partner/Ad Campaign Updates
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'ad_campaigns' },
      (payload) => {
        console.log('💰 PARTNER NETWORK UPDATE:', payload.new);
        // Refresh the whole partner set to ensure joined data stays consistent
        fetchInitialFeeds();
      }
    );

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('📡 Intelligence Feeds: ONLINE');
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchInitialFeeds]);

  return { verifiedAlerts, partnerContent, loading, refresh: fetchInitialFeeds };
};