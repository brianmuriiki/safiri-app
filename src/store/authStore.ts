import { create } from "zustand";
import { supabase, type Profile, type UserRole } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  fetchProfile: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateRole: (role: UserRole) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),

  fetchProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      set({ profile: null });
      return;
    }
    set({ profile: (data as Profile | null) ?? null });
  },

  updateRole: async (role: UserRole) => {
    const { user } = get();
    if (!user) return false;
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", user.id);
    if (error) return false;
    await get().fetchProfile(user.id);
    return true;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },
}));
