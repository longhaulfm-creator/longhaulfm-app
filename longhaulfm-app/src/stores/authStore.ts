// src/stores/authStore.ts
import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile, UserRole } from '@/types'

interface AuthStore {
  user:        User | null
  session:     Session | null
  profile:     Profile | null
  isLoading:   boolean
  isReady:     boolean

  signIn:      (email: string, password: string) => Promise<string | null>
  signOut:     () => Promise<void>
  loadProfile: () => Promise<void>
  init:        () => () => void
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user:      null,
  session:   null,
  profile:   null,
  isLoading: false,
  isReady:   false,

  signIn: async (email, password) => {
    set({ isLoading: true })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    set({ isLoading: false })
    if (error) return error.message
    await get().loadProfile()
    return null
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, profile: null })
  },

  loadProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    set({ profile: data as Profile })
  },

  init: () => {
    // Load initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, user: session?.user ?? null, isReady: true })
      if (session?.user) get().loadProfile()
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        set({ session, user: session?.user ?? null })
        if (session?.user) get().loadProfile()
        else set({ profile: null })
      }
    )

    return () => subscription.unsubscribe()
  },
}))

// Role helpers
export function hasRole(role: UserRole, allowed: UserRole[]): boolean {
  return allowed.includes(role)
}

export function isPresenter(role?: UserRole | null): boolean {
  return role === 'admin' || role === 'presenter'
}
