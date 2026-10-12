import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { Bank, DepositWithBank } from "../types";

const mock = vi.hoisted(() => {
  const state: {
    select?: { data?: unknown; error?: unknown };
    insert?: { data?: unknown; error?: unknown };
    update?: { data?: unknown; error?: unknown };
    delete?: { data?: unknown; error?: unknown };
    session: { user: { id: string } } | null;
  } = { session: { user: { id: "user-1" } } };

  const chain = (result: { data?: unknown; error?: unknown } | undefined) => {
    const resolved = () => Promise.resolve(result ?? { data: null, error: null });
    const c: Record<string, unknown> = {
      select: () => c,
      order: () => c,
      eq: () => c,
      // oxlint-disable-next-line unicorn/no-thenable -- the Supabase query builder is thenable by design
      then: (f?: (v: unknown) => unknown, r?: (e: unknown) => unknown) => resolved().then(f, r),
    };
    c.single = () => resolved();
    return c;
  };

  const from = vi.fn(() => ({
    select: () => chain(state.select),
    insert: () => chain(state.insert),
    update: () => chain(state.update),
    delete: () => chain(state.delete),
  }));

  return { state, from };
});

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: mock.from,
    auth: {
      getSession: vi.fn(async () => ({ data: { session: mock.state.session } })),
    },
  },
}));

const { useBanksStore } = await import("./banks");

const bank = (over: Partial<Bank> = {}): Bank => ({
  id: "b1",
  user_id: "user-1",
  name: "HSBC 匯豐銀行",
  created_at: "2024-01-01",
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  mock.state.session = { user: { id: "user-1" } };
  useBanksStore.setState({ banks: [], loading: false, error: null, lastFetched: 0 });
});

describe("fetchBanks", () => {
  it("stores fetched banks", async () => {
    mock.state.select = { data: [bank(), bank({ id: "b2", name: "ZA Bank" })], error: null };
    await useBanksStore.getState().fetchBanks();
    expect(useBanksStore.getState().banks).toHaveLength(2);
    expect(useBanksStore.getState().loading).toBe(false);
  });

  it("skips refetch within the stale window", async () => {
    useBanksStore.setState({ banks: [], lastFetched: Date.now() });
    mock.state.select = { data: [bank()], error: null };
    await useBanksStore.getState().fetchBanks();
    expect(mock.from).not.toHaveBeenCalled();
  });

  it("refetches when forced", async () => {
    useBanksStore.setState({ banks: [], lastFetched: Date.now() });
    mock.state.select = { data: [bank()], error: null };
    await useBanksStore.getState().fetchBanks(true);
    expect(mock.from).toHaveBeenCalled();
  });

  it("keeps data on error", async () => {
    useBanksStore.setState({ banks: [bank()] });
    mock.state.select = { data: null, error: new Error("boom") };
    await useBanksStore.getState().fetchBanks();
    expect(useBanksStore.getState().banks).toHaveLength(1);
    expect(useBanksStore.getState().loading).toBe(false);
  });

  it("says a fetch failed instead of leaving stale rows looking current", async () => {
    mock.state.select = { data: null, error: new Error("boom") };
    await useBanksStore.getState().fetchBanks();
    expect(useBanksStore.getState().error).toBe("操作失敗，請稍後再試");
  });

  it("clears the error once a fetch succeeds", async () => {
    mock.state.select = { data: null, error: new Error("boom") };
    await useBanksStore.getState().fetchBanks();
    mock.state.select = { data: [bank()], error: null };
    await useBanksStore.getState().fetchBanks(true);
    expect(useBanksStore.getState().error).toBeNull();
  });
});

describe("clear", () => {
  it("empties the store so no account sees another's banks", () => {
    useBanksStore.setState({
      banks: [bank()],
      loading: true,
      error: "boom",
      lastFetched: Date.now(),
    });
    useBanksStore.getState().clear();
    expect(useBanksStore.getState()).toMatchObject({
      banks: [],
      loading: false,
      error: null,
      lastFetched: 0,
    });
  });

  it("drops a request that was already on its way", async () => {
    // The previous account's fetch is still in flight when clear() runs. Its
    // response must not repopulate the store or stamp it fresh.
    const pending = useBanksStore.getState().fetchBanks();
    useBanksStore.getState().clear();
    mock.state.select = { data: [bank()], error: null };
    await pending;
    expect(useBanksStore.getState().banks).toEqual([]);
    expect(useBanksStore.getState().lastFetched).toBe(0);
  });
});

describe("addBank", () => {
  it("throws when unauthenticated", async () => {
    mock.state.session = null;
    await expect(useBanksStore.getState().addBank("ZA Bank")).rejects.toThrow("Not authenticated");
  });

  it("puts the created bank in name order, not at the end", async () => {
    useBanksStore.setState({ banks: [bank({ id: "b0", name: "Existing" })] });
    mock.state.insert = { data: bank({ id: "b2", name: "AAA Bank" }), error: null };
    await useBanksStore.getState().addBank("AAA Bank");
    expect(useBanksStore.getState().banks.map((b) => b.name)).toEqual(["AAA Bank", "Existing"]);
  });

  it("propagates insert errors", async () => {
    mock.state.insert = { data: null, error: new Error("insert failed") };
    await expect(useBanksStore.getState().addBank("ZA Bank")).rejects.toThrow("insert failed");
  });
});

describe("updateBank", () => {
  it("renames the bank and re-sorts it", async () => {
    useBanksStore.setState({
      banks: [bank({ id: "b1", name: "Old" }), bank({ id: "b2", name: "Keep" })],
    });
    mock.state.update = { data: bank({ id: "b1", name: "New" }), error: null };
    await useBanksStore.getState().updateBank("b1", "New");
    expect(useBanksStore.getState().banks.map((b) => b.name)).toEqual(["Keep", "New"]);
  });

  it("renames the deposits that carry a copy of the old name", async () => {
    const { useDepositsStore } = await import("./deposits");
    useBanksStore.setState({ banks: [bank({ id: "b1", name: "Old" })] });
    useDepositsStore.setState({
      deposits: [
        { id: "d1", bank_id: "b1", bank_name: "Old" },
        { id: "d2", bank_id: "b2", bank_name: "Other" },
      ] as DepositWithBank[],
    });
    mock.state.update = { data: bank({ id: "b1", name: "New" }), error: null };

    await useBanksStore.getState().updateBank("b1", "New");

    // The list prints the name the deposit row carries, not the banks store's.
    const rows = useDepositsStore.getState().deposits;
    expect(rows.map((d) => d.bank_name)).toEqual(["New", "Other"]);
  });

  it("propagates update errors", async () => {
    mock.state.update = { data: null, error: new Error("update failed") };
    await expect(useBanksStore.getState().updateBank("b1", "New")).rejects.toThrow("update failed");
  });
});

describe("deleteBank", () => {
  it("removes the bank", async () => {
    useBanksStore.setState({ banks: [bank({ id: "b1" }), bank({ id: "b2", name: "Keep" })] });
    mock.state.delete = { data: [bank({ id: "b1" })], error: null };
    await useBanksStore.getState().deleteBank("b1");
    expect(useBanksStore.getState().banks.map((b) => b.id)).toEqual(["b2"]);
  });

  it("throws a 42501 error when nothing was deleted", async () => {
    mock.state.delete = { data: [], error: null };
    await expect(useBanksStore.getState().deleteBank("b1")).rejects.toMatchObject({
      code: "42501",
    });
  });

  it("drops the deposits the database cascaded away with it", async () => {
    const { useDepositsStore } = await import("./deposits");
    useBanksStore.setState({ banks: [bank({ id: "b1" })] });
    useDepositsStore.setState({
      deposits: [
        { id: "d1", bank_id: "b1" },
        { id: "d2", bank_id: "b2" },
      ] as unknown as DepositWithBank[],
    });
    mock.state.delete = { data: [bank({ id: "b1" })], error: null };
    await useBanksStore.getState().deleteBank("b1");
    expect(useDepositsStore.getState().deposits.map((d) => d.id)).toEqual(["d2"]);
  });
});
