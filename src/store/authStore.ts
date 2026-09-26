import { create } from "zustand"
import { supabase, type Profile } from "../lib/supabase"
import type { User } from "@supabase/supabase-js"

interface AuthState {
  user: User | null
  profile: Profile | null
  profileError: string | null
  loading: boolean
  initialized: boolean
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  fetchProfile: (userId: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  profileError: null,
  loading: true,
  initialized: false,

  setUser: (user) => set((state) => ({
    user,
    ...(state.user?.id !== user?.id ? { profile: null, profileError: null } : {}),
  })),
  setProfile: (profile) => set({ profile, profileError: null }),

  fetchProfile: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle()
      // Auth can change while this request is in flight. Never let an older
      // request replace the profile for the newly signed-in user.
      if (get().user?.id !== userId) return
      if (error) {
        set({ profile: null, profileError: error.message })
      } else if (!data) {
        set({
          profile: null,
          profileError: "No Safiri profile was found for this account. Try signing out and signing in again.",
        })
      } else {
        set({ profile: data as Profile, profileError: null })
      }
    } catch (error) {
      if (get().user?.id !== userId) return
      set({
        profile: null,
        profileError: error instanceof Error ? error.message : "A network error prevented us from loading your profile.",
      })
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null, profileError: null })
  },
}))
