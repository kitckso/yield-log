import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { DepositWithBank } from "../types";

const STALE_TIME = 5 * 60 * 1000;

interface DepositsState {
  deposits: DepositWithBank[];
  loading: boolean;
  lastFetched: number;
  fetchDeposits: (force?: boolean) => Promise<void>;
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
  lastFetched: 0,

  fetchDeposits: async (force) => {
    const { lastFetched } = get();
    if (!force && lastFetched && Date.now() - lastFetched < STALE_TIME) {
      return;
    }
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
      set({ deposits: withBankNames, lastFetched: Date.now() });
    }
    set({ loading: false });
  },

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
    const withBank: DepositWithBank = {
      ...(data as Omit<DepositWithBank, "bank_name">),
      bank_name: (data.banks as unknown as { name: string })?.name ?? "",
    };
    set({ deposits: [withBank, ...get().deposits] });
  },

  updateDeposit: async (id, deposit) => {
    const { data, error } = await supabase
      .from("fixed_deposits")
      .update(deposit)
      .eq("id", id)
      .select("*, banks(name)")
      .single();
    if (error) throw error;
    const withBank: DepositWithBank = {
      ...(data as Omit<DepositWithBank, "bank_name">),
      bank_name: (data.banks as unknown as { name: string })?.name ?? "",
    };
    set({
      deposits: get().deposits.map((d) => (d.id === id ? withBank : d)),
    });
  },

  deleteDeposit: async (id: string) => {
    const { data, error } = await supabase.from("fixed_deposits").delete().eq("id", id).select();
    if (error) throw error;
    if (!data || data.length === 0) {
      const e = new Error("No permission");
      (e as any).code = "42501";
      throw e;
    }
    set({ deposits: get().deposits.filter((d) => d.id !== id) });
  },
}));
