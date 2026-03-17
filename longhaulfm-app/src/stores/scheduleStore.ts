// src/stores/scheduleStore.ts
import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { ScheduleSlot } from '@/types'

interface ScheduleStore {
  slots:       ScheduleSlot[]
  currentSlot: ScheduleSlot | null
  nextSlot:    ScheduleSlot | null
  isLoading:   boolean

  fetchToday:  () => Promise<void>
  computeCurrent: () => void
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  slots:       [],
  currentSlot: null,
  nextSlot:    null,
  isLoading:   false,

  fetchToday: async () => {
    set({ isLoading: true })
    const today = new Date().getDay()
    const { data, error } = await supabase
      .from('schedule')
      .select('*, show:shows(*)')
      .eq('day_of_week', today)
      .order('start_time')
    if (!error) {
      set({ slots: (data ?? []) as ScheduleSlot[], isLoading: false })
      get().computeCurrent()
    } else {
      set({ isLoading: false })
    }
  },

  computeCurrent: () => {
    const { slots } = get()
    const now = new Date()
    const nowMins = now.getHours() * 60 + now.getMinutes()

    let current: ScheduleSlot | null = null
    let next: ScheduleSlot | null = null

    for (const slot of slots) {
      const start = timeToMinutes(slot.start_time)
      const end   = timeToMinutes(slot.end_time)
      if (nowMins >= start && nowMins < end) {
        current = slot
      } else if (nowMins < start && !next) {
        next = slot
      }
    }

    set({ currentSlot: current, nextSlot: next })
  },
}))
