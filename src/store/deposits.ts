import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { permissionError } from "../lib/settings";
import { createListQuery } from "./listQuery";
import type { DepositWithBank } from "../types";

type DepositRow = Omit<DepositWithBank, "bank_name"> & {
  banks: { name: string } | null;
};

type DepositWrite = Omit<DepositWithBank, "id" | "created_at" | "bank_name">;

/** The banks(name) join comes back nested; the rest of the app wants a flat name. */
function withBankName(row: DepositRow): DepositWithBank {
  return { ...row, bank_name: row.banks?.name ?? "" };
}

async function loadDeposits(): Promise<DepositWithBank[]> {
  const { data, error } = await supabase
    .from("fixed_deposits")
    .select("*, banks(name)")
    .order("start_date", { ascending: false });
  if (error) throw error;
  return (data as DepositRow[]).map(withBankName);
}

interface DepositsState {
  deposits: DepositWithBank[];
  loading: boolean;
  error: string | null;
  lastFetched: number;
  fetchDeposits: (force?: boolean) => Promise<void>;
  addDeposit: (deposit: DepositWrite) => Promise<void>;
  updateDeposit: (id: string, deposit: Partial<DepositWrite>) => Promise<void>;
  deleteDeposit: (id: string) => Promise<void>;
  /** A Bank is gone, so the schema took its Deposits with it. */
  forgetBank: (bankId: string) => void;
  /** Nothing cached belongs to an account any more. */
  clear: () => void;
}

export const useDepositsStore = create<DepositsState>((set, get) => {
  const query = createListQuery<DepositWithBank>({
    set,
    get,
    load: loadDeposits,
    replace: (deposits) => set({ deposits }),
  });

  return {
    deposits: [],
    ...query.initial,
    fetchDeposits: query.fetch,

    // Every write patches the cached rows so the screen updates at once, then
    // marks them a guess: only the server knows the true order or what a
    // cascade removed.
    addDeposit: async (deposit) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("fixed_deposits")
        .insert({ ...deposit, user_id: session.user.id })
        .select("*, banks(name)")
        .single();
      if (error) throw error;
      set({ deposits: [withBankName(data as DepositRow), ...get().deposits] });
      query.invalidate();
    },

    updateDeposit: async (id, deposit) => {
      const { data, error } = await supabase
        .from("fixed_deposits")
        .update(deposit)
        .eq("id", id)
        .select("*, banks(name)")
        .single();
      if (error) throw error;
      const updated = withBankName(data as DepositRow);
      set({ deposits: get().deposits.map((d) => (d.id === id ? updated : d)) });
      query.invalidate();
    },

    deleteDeposit: async (id) => {
      const { data, error } = await supabase.from("fixed_deposits").delete().eq("id", id).select();
      if (error) throw error;
      if (!data || data.length === 0) {
        throw permissionError();
      }
      set({ deposits: get().deposits.filter((d) => d.id !== id) });
      query.invalidate();
    },

    forgetBank: (bankId) => {
      set({ deposits: get().deposits.filter((d) => d.bank_id !== bankId) });
      query.invalidate();
    },

    clear: () => set({ deposits: [], loading: false, error: null, lastFetched: 0 }),
  };
});
