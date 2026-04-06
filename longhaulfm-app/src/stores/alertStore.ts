import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export const useAlertStore = create((set) => ({
  alerts: [],
  isLoading: false,

  fetchAlerts: async () => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase
        .from('road_alerts')
        .select('*')
        .eq('is_active', true)
        .eq('province', 'KwaZulu-Natal')
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ alerts: data || [], isLoading: false })
    } catch (err) {
      console.error('Alert Store Error:', err)
      set({ alerts: [], isLoading: false })
    }
  }
}))