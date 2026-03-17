// src/stores/alertStore.ts
import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { RoadAlert, AlertCategory, AlertSeverity } from '@/types'

interface AlertStore {
  alerts:    RoadAlert[]
  isLoading: boolean

  fetchAlerts:     () => Promise<void>
  addAlert:        (alert: NewAlert) => Promise<void>
  deactivateAlert: (id: string) => Promise<void>
  subscribeRealtime: () => () => void
}

export interface NewAlert {
  route:      string
  detail:     string
  category:   AlertCategory
  severity:   AlertSeverity
  province?:  string
  lat?:       number
  lng?:       number
  expires_at?: string
}

export const useAlertStore = create<AlertStore>((set, get) => ({
  alerts:    [],
  isLoading: false,

  fetchAlerts: async () => {
    set({ isLoading: true })
    const { data } = await supabase.rpc('get_active_alerts', {
      p_province: 'KwaZulu-Natal',
    })
    set({ alerts: (data ?? []) as RoadAlert[], isLoading: false })
  },

  addAlert: async (alert) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('road_alerts')
      .insert({
        ...alert,
        province:    alert.province ?? 'KwaZulu-Natal',
        reported_by: user?.id,
        source:      'presenter',
      })
      .select()
      .single()
    if (error) throw error
    set(s => ({ alerts: [data as RoadAlert, ...s.alerts] }))
  },

  deactivateAlert: async (id) => {
    await supabase
      .from('road_alerts')
      .update({ is_active: false })
      .eq('id', id)
    set(s => ({ alerts: s.alerts.filter(a => a.id !== id) }))
  },

  subscribeRealtime: () => {
    const channel = supabase
      .channel('alerts-ops')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'road_alerts' },
        ({ new: data }) => {
          set(s => ({ alerts: [data as RoadAlert, ...s.alerts] }))
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'road_alerts' },
        ({ new: data }) => {
          const alert = data as RoadAlert
          if (!alert.is_active) {
            set(s => ({ alerts: s.alerts.filter(a => a.id !== alert.id) }))
          } else {
            set(s => ({ alerts: s.alerts.map(a => a.id === alert.id ? alert : a) }))
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  },
}))
