import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user: any | null
  profile: any | null
  spotifyToken: string | null
  isLoading: boolean
  signUp: (email: string, pass: string) => Promise<string | null>
  signIn: (email: string, pass: string) => Promise<string | null>
  signInWithSocial: (provider: 'google' | 'facebook') => Promise<string | null>
  signOut: () => Promise<void>
  setSpotifyToken: (token: string) => void
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      spotifyToken: null,
      isLoading: true,

      initialize: async () => {
        try {
          // 1. Get current session
          const { data: { session } } = await supabase.auth.getSession()
          
          let spotifyToken = null
          let userProfile = null

          // 2. Only fetch the token if a session exists to prevent 400 errors for guests
          if (session) {
            const { data: authData } = await supabase
              .from('spotify_auth')
              .select('get_spotify_token_99')
              .limit(1)
              .maybeSingle()

            spotifyToken = authData?.get_spotify_token_99 || null

            // 3. Fetch the user profile
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
            spotifyToken: spotifyToken,
            isLoading: false 
          })

          // 4. Listen for auth changes
          supabase.auth.onAuthStateChange(async (event, session) => {
            if (session) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()
              
              // Only re-fetch token if we don't have it yet
              if (!get().spotifyToken) {
                const { data: authData } = await supabase
                  .from('spotify_auth')
                  .select('get_spotify_token_99')
                  .limit(1)
                  .maybeSingle()
                
                set({ user: session.user, profile, spotifyToken: authData?.get_spotify_token_99 })
              } else {
                set({ user: session.user, profile })
              }
            } else {
              set({ user: null, profile: null, spotifyToken: null })
            }
          })
        } catch (error) {
          console.error("Auth initialization failed:", error)
          set({ isLoading: false })
        }
      },

      signUp: async (email, password) => {
        set({ isLoading: true })
        try {
          const { data, error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
              // Ensure the metadata is passed if needed for triggers
              data: {
                email: email
              }
            }
          })
          if (error) throw error
          
          set({ isLoading: false })
          return null
        } catch (err: any) {
          set({ isLoading: false })
          return err.message
        }
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

          // Also grab the token on sign in
          const { data: authData } = await supabase
            .from('spotify_auth')
            .select('get_spotify_token_99')
            .limit(1)
            .maybeSingle()

          set({ 
            user: data.user, 
            profile, 
            spotifyToken: authData?.get_spotify_token_99 || null,
            isLoading: false 
          })
          return null
        } catch (err: any) {
          set({ isLoading: false })
          return err.message
        }
      },

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
          .from('spotify_auth')
          .upsert({ 
            id: 1, 
            get_spotify_token_99: token,
            updated_at: new Date().toISOString()
          })
      },

      signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, profile: null, spotifyToken: null })
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