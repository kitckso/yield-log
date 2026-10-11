import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { useDepositsStore } from "./deposits";
import { useBanksStore } from "./banks";
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
    if (import.meta.env.VITE_ENABLE_REGISTRATION !== "true") {
      return "註冊已關閉";
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return error.message;

    if (data.user && data.session) {
      const newUser = data.user;
      set({
        user: { id: newUser.id, email: newUser.email ?? "" },
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
      // user_id comes from the authenticated session, matching banks.ts and
      // deposits.ts. The set_user_id() trigger only fills it when null, so
      // this stays authoritative, and RLS still rejects any row whose user_id
      // does not equal auth.uid().
      await Promise.all(
        defaults.map((name) => supabase.from("banks").insert({ user_id: newUser.id, name })),
      );
    } else if (data.user && !data.session) {
      return "請檢查電郵以確認註冊，然後登入";
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
    useDepositsStore.setState({ deposits: [], loading: false, lastFetched: 0 });
    useBanksStore.setState({ banks: [], loading: false, lastFetched: 0 });
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
