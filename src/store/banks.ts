import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { Bank } from "../types";

const STALE_TIME = 5 * 60 * 1000;

interface BanksState {
  banks: Bank[];
  loading: boolean;
  lastFetched: number;
  fetchBanks: (force?: boolean) => Promise<void>;
  addBank: (name: string) => Promise<void>;
  updateBank: (id: string, name: string) => Promise<void>;
  deleteBank: (id: string) => Promise<void>;
}

export const useBanksStore = create<BanksState>((set, get) => ({
  banks: [],
  loading: false,
  lastFetched: 0,

  fetchBanks: async (force) => {
    const { banks, lastFetched } = get();
    if (!force && banks.length > 0 && Date.now() - lastFetched < STALE_TIME) {
      return;
    }
    set({ loading: true });
    const { data, error } = await supabase.from("banks").select("*").order("name");
    if (!error && data) {
      set({ banks: data, lastFetched: Date.now() });
    }
    set({ loading: false });
  },

  addBank: async (name: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { data, error } = await supabase
      .from("banks")
      .insert({ user_id: session.user.id, name })
      .select()
      .single();
    if (!error && data) {
      set({ banks: [...get().banks, data] });
    }
  },

  updateBank: async (id: string, name: string) => {
    const { data, error } = await supabase
      .from("banks")
      .update({ name })
      .eq("id", id)
      .select()
      .single();
    if (!error && data) {
      set({ banks: get().banks.map((b) => (b.id === id ? data : b)) });
    }
  },

  deleteBank: async (id: string) => {
    await supabase.from("banks").delete().eq("id", id);
    set({ banks: get().banks.filter((b) => b.id !== id) });
  },
}));
