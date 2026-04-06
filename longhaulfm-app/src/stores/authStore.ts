import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'

interface AuthState {
  profile: any | null
  spotifyToken: string | null
  isLoading: boolean
  signIn: (email: string, pass: string) => Promise<string | null>
  signOut: () => Promise<void>
  setSpotifyToken: (token: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      profile: null,
      spotifyToken: null,
      isLoading: false,

      setSpotifyToken: (token: string) => {
        set({ spotifyToken: token })
        // Sync to Supabase so the whole station knows we are linked
        supabase
          .from('broadcast_state')
          .update({ spotify_token: token })
          .eq('id', 1)
          .then()
      },

      signIn: async (email, password) => {
        set({ isLoading: true })
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) throw error

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single()

          set({ profile, isLoading: false })
          return null
        } catch (err: any) {
          set({ isLoading: false })
          return err.message
        }
      },

      signOut: async () => {
        await supabase.auth.signOut()
        set({ profile: null, spotifyToken: null })
      },
    }),
    {
      name: 'longhaul-auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)