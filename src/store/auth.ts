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
  /** Subscribes to the session ending on its own. Returns the unsubscribe. */
  watchSession: () => () => void;
}

/**
 * Cached rows belong to whoever was signed in when they were fetched, so every
 * point where a different account becomes the signed-in one has to drop them:
 * signing in as somebody else, signing up as a new account, or a session that
 * lapsed and left nobody. Otherwise the next page to ask reads the previous
 * account's rows straight out of a cache that is still inside its fresh window.
 */
function forgetCachedAccount() {
  useDepositsStore.getState().clear();
  useBanksStore.getState().clear();
}

/**
 * A session can end without anyone pressing 登出: the refresh token fails, or
 * another tab signs out over the localStorage the session lives in. Supabase
 * then has nobody signed in, but this store would keep the user and the cached
 * rows, so the next person to open the app on that device would be shown the
 * previous account's dashboard without ever being asked to sign in.
 *
 * Only SIGNED_OUT is acted on. INITIAL_SESSION fires the moment this is
 * subscribed, and treating it as a sign-out would clear the cache on every boot.
 *
 * Nothing in here awaits Supabase: the callback runs inside its own auth lock,
 * and a round trip made from within it can deadlock.
 */

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
      // Register is a public route, so this can be reached while another account
      // is still signed in with its rows cached. The new account is about to
      // become the signed-in one, which is a boundary like any other.
      forgetCachedAccount();
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
      forgetCachedAccount();
      set({
        user: { id: data.user.id, email: data.user.email ?? "" },
      });
    }
    return null;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    forgetCachedAccount();
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
      forgetCachedAccount();
      set({ loading: false });
    }
  },

  watchSession: () => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_OUT") return;
      forgetCachedAccount();
      set({ user: null });
    });
    return () => subscription.unsubscribe();
  },
}));
