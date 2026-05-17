import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { DepositWithBank } from "../types";

interface DepositsState {
  deposits: DepositWithBank[];
  loading: boolean;
  fetchDeposits: () => Promise<void>;
  addDeposit: (deposit: Omit<DepositWithBank, "id" | "created_at" | "bank_name">) => Promise<void>;
  updateDeposit: (
    id: string,
    deposit: Partial<Omit<DepositWithBank, "id" | "created_at" | "bank_name">>,
  ) => Promise<void>;
  deleteDeposit: (id: string) => Promise<void>;
}

export const useDepositsStore = create<DepositsState>((set, get) => ({
  deposits: [],
  loading: false,

  fetchDeposits: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from("fixed_deposits")
      .select("*, banks(name)")
      .order("start_date", { ascending: false });
    if (!error && data) {
      const withBankNames: DepositWithBank[] = data.map((d) => ({
        ...(d as Omit<DepositWithBank, "bank_name">),
        bank_name: (d.banks as unknown as { name: string })?.name ?? "",
      }));
      set({ deposits: withBankNames });
    }
    set({ loading: false });
  },

  addDeposit: async (deposit) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { data, error } = await supabase
      .from("fixed_deposits")
      .insert({ ...deposit, user_id: session.user.id })
      .select("*, banks(name)")
      .single();
    if (!error && data) {
      const withBank: DepositWithBank = {
        ...(data as Omit<DepositWithBank, "bank_name">),
        bank_name: (data.banks as unknown as { name: string })?.name ?? "",
      };
      set({ deposits: [withBank, ...get().deposits] });
    }
  },

  updateDeposit: async (id, deposit) => {
    const { data, error } = await supabase
      .from("fixed_deposits")
      .update(deposit)
      .eq("id", id)
      .select("*, banks(name)")
      .single();
    if (!error && data) {
      const withBank: DepositWithBank = {
        ...(data as Omit<DepositWithBank, "bank_name">),
        bank_name: (data.banks as unknown as { name: string })?.name ?? "",
      };
      set({
        deposits: get().deposits.map((d) => (d.id === id ? withBank : d)),
      });
    }
  },

  deleteDeposit: async (id: string) => {
    await supabase.from("fixed_deposits").delete().eq("id", id);
    set({ deposits: get().deposits.filter((d) => d.id !== id) });
  },
}));
