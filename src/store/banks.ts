import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { Bank } from "../types";

interface BanksState {
  banks: Bank[];
  loading: boolean;
  fetchBanks: () => Promise<void>;
  addBank: (name: string) => Promise<void>;
  updateBank: (id: string, name: string) => Promise<void>;
  deleteBank: (id: string) => Promise<void>;
}

export const useBanksStore = create<BanksState>((set, get) => ({
  banks: [],
  loading: false,

  fetchBanks: async () => {
    set({ loading: true });
    const { data, error } = await supabase.from("banks").select("*").order("name");
    if (!error && data) {
      set({ banks: data });
    }
    set({ loading: false });
  },

  addBank: async (name: string) => {
    const { data, error } = await supabase.from("banks").insert({ name }).select().single();
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
