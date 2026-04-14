import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user: any | null
  profile: any | null
  spotifyToken: string | null
  isLoading: boolean
  signIn: (email: string, pass: string) => Promise<string | null>
  // NEW: Social login handler
  signInWithSocial: (provider: 'google' | 'facebook') => Promise<string | null>
  signOut: () => Promise<void>
  setSpotifyToken: (token: string) => void
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      spotifyToken: null,
      isLoading: true,

      initialize: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          
          const { data: broadcastData } = await supabase
            .from('broadcast_state')
            .select('spotify_token')
            .eq('id', 1)
            .single()

          let userProfile = null
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()
            userProfile = profile
          }

          set({ 
            user: session?.user ?? null, 
            profile: userProfile,
            spotifyToken: broadcastData?.spotify_token || null,
            isLoading: false 
          })

          supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()
              set({ user: session.user, profile })
            } else {
              set({ user: null, profile: null })
            }
          })
        } catch (error) {
          console.error("Auth initialization failed:", error)
          set({ isLoading: false })
        }
      },

      // NEW SOCIAL SIGN IN LOGIC
      signInWithSocial: async (provider) => {
        set({ isLoading: true })
        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
              redirectTo: window.location.origin,
            },
          })
          if (error) throw error
          return null
        } catch (err: any) {
          set({ isLoading: false })
          return err.message
        }
      },

      setSpotifyToken: async (token: string) => {
        set({ spotifyToken: token })
        await supabase
          .from('broadcast_state')
          .upsert({ 
            id: 1, 
            spotify_token: token,
            updated_at: new Date().toISOString()
          })
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

          set({ user: data.user, profile, isLoading: false })
          return null
        } catch (err: any) {
          set({ isLoading: false })
          return err.message
        }
      },

      signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, profile: null })
      },
    }),
    {
      name: 'longhaul-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        spotifyToken: state.spotifyToken,
        user: state.user,
        profile: state.profile
      }),
    }
  )
)