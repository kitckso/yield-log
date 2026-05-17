import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  getSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return error.message;

    if (data.user) {
      set({
        user: { id: data.user.id, email: data.user.email ?? "" },
      });
      // Copy default banks for new user
      const defaults = [
        "HSBC 匯豐銀行",
        "Standard Chartered 渣打銀行",
        "Bank of China 中國銀行",
        "Hang Seng Bank 恒生銀行",
        "ZA Bank",
        "Mox Bank",
      ];
      for (const name of defaults) {
        await supabase.from("banks").insert({ user_id: data.user.id, name });
      }
    }
    return null;
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;

    if (data.user) {
      set({
        user: { id: data.user.id, email: data.user.email ?? "" },
      });
    }
    return null;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },

  getSession: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      set({
        user: { id: data.session.user.id, email: data.session.user.email ?? "" },
        loading: false,
      });
    } else {
      set({ loading: false });
    }
  },
}));
