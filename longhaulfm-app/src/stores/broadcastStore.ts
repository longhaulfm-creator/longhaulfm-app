// src/stores/broadcastStore.ts
import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { BroadcastSource, BroadcastState, NowPlaying, Caller } from '@/types'

interface BroadcastStore {
  state:        BroadcastState | null
  nowPlaying:   NowPlaying | null
  callers:      Caller[]
  isSwitching:  boolean
  fadeDuration: number   // seconds
  elapsed:      number   // local tick for progress bar

  setFadeDuration:     (s: number) => void
  switchSource:        (source: BroadcastSource, showId?: string) => Promise<void>
  toggleOnAir:         () => Promise<void>
  updateCallerStatus:  (id: string, status: Caller['status']) => Promise<void>
  addCaller:           (caller: Omit<Caller, 'id' | 'queued_at' | 'answered_at' | 'ended_at'>) => Promise<void>
  fetchInitial:        () => Promise<void>
  subscribeRealtime:   () => () => void
  tickElapsed:         () => void
}

export const useBroadcastStore = create<BroadcastStore>((set, get) => ({
  state:        null,
  nowPlaying:   null,
  callers:      [],
  isSwitching:  false,
  fadeDuration: 4,
  elapsed:      0,

  setFadeDuration: (s) => set({ fadeDuration: s }),

  tickElapsed: () => {
    const { nowPlaying, elapsed } = get()
    if (!nowPlaying?.duration_secs) return
    set({ elapsed: Math.min(elapsed + 1, nowPlaying.duration_secs) })
  },

  fetchInitial: async () => {
    const [{ data: state }, { data: np }, { data: callers }] = await Promise.all([
      supabase.from('broadcast_state').select('*').eq('id', 1).single(),
      supabase.from('now_playing').select('*').eq('id', 1).single(),
      supabase.from('call_queue')
        .select('*')
        .in('status', ['waiting', 'on_air'])
        .order('queued_at'),
    ])
    set({
      state:      state as BroadcastState,
      nowPlaying: np as NowPlaying,
      callers:    (callers ?? []) as Caller[],
      elapsed:    (np as NowPlaying)?.elapsed_secs ?? 0,
    })
  },

  switchSource: async (source, showId) => {
    set({ isSwitching: true })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.rpc('switch_broadcast_source', {
        p_source:   source,
        p_operator: user?.id ?? null,
        p_show_id:  showId ?? null,
      })
      if (error) throw error
      set(s => ({ state: s.state ? { ...s.state, current_source: source } : s.state }))
    } finally {
      set({ isSwitching: false })
    }
  },

  toggleOnAir: async () => {
    const current = get().state?.is_on_air ?? true
    await supabase
      .from('broadcast_state')
      .update({ is_on_air: !current, updated_at: new Date().toISOString() })
      .eq('id', 1)
    set(s => ({ state: s.state ? { ...s.state, is_on_air: !current } : s.state }))
  },

  updateCallerStatus: async (id, status) => {
    const updates: Record<string, string> = { status }
    if (status === 'on_air')  updates.answered_at = new Date().toISOString()
    if (status === 'done' || status === 'dropped') updates.ended_at = new Date().toISOString()
    await supabase.from('call_queue').update(updates).eq('id', id)
    set(s => ({
      callers: s.callers.map(c => c.id === id ? { ...c, status, ...updates } : c)
    }))
  },

  addCaller: async (caller) => {
    const { data, error } = await supabase
      .from('call_queue')
      .insert(caller)
      .select()
      .single()
    if (error) throw error
    set(s => ({ callers: [...s.callers, data as Caller] }))
  },

  subscribeRealtime: () => {
    const channel = supabase
      .channel('broadcast-ops')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'now_playing', filter: 'id=eq.1' },
        ({ new: data }) => {
          set({ nowPlaying: data as NowPlaying, elapsed: (data as NowPlaying).elapsed_secs ?? 0 })
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'broadcast_state', filter: 'id=eq.1' },
        ({ new: data }) => set({ state: data as BroadcastState })
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'call_queue' },
        async () => {
          const { data } = await supabase
            .from('call_queue')
            .select('*')
            .in('status', ['waiting', 'on_air'])
            .order('queued_at')
          set({ callers: (data ?? []) as Caller[] })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  },
}))
