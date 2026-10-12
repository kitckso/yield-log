import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { permissionError } from "../lib/settings";
import { createListQuery } from "./listQuery";
import { useDepositsStore } from "./deposits";
import type { Bank } from "../types";

async function loadBanks(): Promise<Bank[]> {
  const { data, error } = await supabase.from("banks").select("*").order("name");
  if (error) throw error;
  return data;
}

/** fetchBanks returns banks in name order, so a new one belongs in that order. */
const byName = (a: Bank, b: Bank) => a.name.localeCompare(b.name);

interface BanksState {
  banks: Bank[];
  loading: boolean;
  error: string | null;
  lastFetched: number;
  fetchBanks: (force?: boolean) => Promise<void>;
  addBank: (name: string) => Promise<void>;
  updateBank: (id: string, name: string) => Promise<void>;
  deleteBank: (id: string) => Promise<void>;
  /** Nothing cached belongs to an account any more. */
  clear: () => void;
}

export const useBanksStore = create<BanksState>((set, get) => {
  const query = createListQuery<Bank>({
    set,
    get,
    load: loadBanks,
    replace: (banks) => set({ banks }),
  });

  return {
    banks: [],
    ...query.initial,
    fetchBanks: query.fetch,

    addBank: async (name) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("banks")
        .insert({ user_id: session.user.id, name })
        .select()
        .single();
      if (error) throw error;
      set({ banks: [...get().banks, data].sort(byName) });
      query.invalidate();
    },

    updateBank: async (id, name) => {
      const { data, error } = await supabase
        .from("banks")
        .update({ name })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      set({
        banks: get()
          .banks.map((b) => (b.id === id ? data : b))
          .sort(byName),
      });
      query.invalidate();
    },

    deleteBank: async (id) => {
      const { data, error } = await supabase.from("banks").delete().eq("id", id).select();
      if (error) throw error;
      if (!data || data.length === 0) {
        throw permissionError();
      }
      set({ banks: get().banks.filter((b) => b.id !== id) });
      // fixed_deposits.bank_id is ON DELETE CASCADE, so the Deposits that used
      // this Bank are gone server-side too. Drop them here rather than leaving
      // rows pointing at a Bank that no longer exists.
      useDepositsStore.getState().forgetBank(id);
      query.invalidate();
    },

    clear: () => set({ banks: [], loading: false, error: null, lastFetched: 0 }),
  };
});
