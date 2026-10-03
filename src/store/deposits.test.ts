import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { DepositWithBank } from "../types";

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

const { useDepositsStore } = await import("./deposits");

const row = (over: Record<string, unknown> = {}) => ({
  id: "d1",
  user_id: "user-1",
  bank_id: "b1",
  amount: 10000,
  period_value: 3,
  period_unit: "months",
  interest_rate: 3,
  interest: 150,
  start_date: "2024-01-01",
  end_date: "2024-04-01",
  created_at: "2024-01-01",
  banks: { name: "HSBC 匯豐銀行" },
  ...over,
});

const newDeposit = () => ({
  user_id: "",
  bank_id: "b1",
  amount: 1000,
  period_value: 1,
  period_unit: "months" as const,
  interest_rate: 2,
  interest: 5,
  start_date: "2024-01-01",
  end_date: "2024-02-01",
});

beforeEach(() => {
  vi.clearAllMocks();
  mock.state.session = { user: { id: "user-1" } };
  useDepositsStore.setState({ deposits: [], loading: false, lastFetched: 0 });
});

describe("fetchDeposits", () => {
  it("flattens the banks join into bank_name", async () => {
    mock.state.select = { data: [row()], error: null };
    await useDepositsStore.getState().fetchDeposits();
    const [d] = useDepositsStore.getState().deposits;
    expect(d.bank_name).toBe("HSBC 匯豐銀行");
    expect(useDepositsStore.getState().loading).toBe(false);
    expect(useDepositsStore.getState().lastFetched).toBeGreaterThan(0);
  });

  it("falls back to empty bank_name when join is null", async () => {
    mock.state.select = { data: [row({ banks: null })], error: null };
    await useDepositsStore.getState().fetchDeposits();
    expect(useDepositsStore.getState().deposits[0].bank_name).toBe("");
  });

  it("skips refetch within the stale window", async () => {
    useDepositsStore.setState({ deposits: [], lastFetched: Date.now() });
    mock.state.select = { data: [row()], error: null };
    await useDepositsStore.getState().fetchDeposits();
    expect(mock.from).not.toHaveBeenCalled();
  });

  it("refetches when forced even if fresh", async () => {
    useDepositsStore.setState({ deposits: [], lastFetched: Date.now() });
    mock.state.select = { data: [row()], error: null };
    await useDepositsStore.getState().fetchDeposits(true);
    expect(mock.from).toHaveBeenCalled();
    expect(useDepositsStore.getState().deposits).toHaveLength(1);
  });

  it("refetches when the cache is stale", async () => {
    useDepositsStore.setState({ deposits: [], lastFetched: Date.now() - 6 * 60 * 1000 });
    mock.state.select = { data: [row()], error: null };
    await useDepositsStore.getState().fetchDeposits();
    expect(mock.from).toHaveBeenCalled();
  });

  it("keeps existing data on error and clears loading", async () => {
    useDepositsStore.setState({ deposits: [row() as unknown as DepositWithBank] });
    mock.state.select = { data: null, error: { message: "boom" } };
    await useDepositsStore.getState().fetchDeposits();
    expect(useDepositsStore.getState().deposits).toHaveLength(1);
    expect(useDepositsStore.getState().loading).toBe(false);
  });
});

describe("addDeposit", () => {
  it("throws when unauthenticated", async () => {
    mock.state.session = null;
    await expect(useDepositsStore.getState().addDeposit(newDeposit())).rejects.toThrow(
      "Not authenticated",
    );
  });

  it("prepends the created deposit", async () => {
    mock.state.insert = { data: row({ id: "d2" }), error: null };
    await useDepositsStore.getState().addDeposit(newDeposit());
    const { deposits } = useDepositsStore.getState();
    expect(deposits).toHaveLength(1);
    expect(deposits[0].id).toBe("d2");
    expect(deposits[0].bank_name).toBe("HSBC 匯豐銀行");
  });

  it("propagates insert errors", async () => {
    mock.state.insert = { data: null, error: new Error("insert failed") };
    await expect(useDepositsStore.getState().addDeposit(newDeposit())).rejects.toThrow(
      "insert failed",
    );
  });
});

describe("updateDeposit", () => {
  it("replaces only the matching deposit", async () => {
    useDepositsStore.setState({
      deposits: [
        { ...(row({ id: "d1" }) as unknown as DepositWithBank), bank_name: "HSBC" },
        { ...(row({ id: "d2" }) as unknown as DepositWithBank), bank_name: "BOCHK" },
      ],
    });
    mock.state.update = { data: row({ id: "d2", amount: 999 }), error: null };
    await useDepositsStore.getState().updateDeposit("d2", { amount: 999 });
    const { deposits } = useDepositsStore.getState();
    expect(deposits.find((d) => d.id === "d1")?.amount).toBe(10000);
    expect(deposits.find((d) => d.id === "d2")?.amount).toBe(999);
  });

  it("propagates update errors", async () => {
    mock.state.update = { data: null, error: new Error("update failed") };
    await expect(useDepositsStore.getState().updateDeposit("d1", { amount: 1 })).rejects.toThrow(
      "update failed",
    );
  });
});

describe("deleteDeposit", () => {
  it("removes the deposit", async () => {
    useDepositsStore.setState({
      deposits: [
        { ...(row({ id: "d1" }) as unknown as DepositWithBank), bank_name: "a" },
        { ...(row({ id: "d2" }) as unknown as DepositWithBank), bank_name: "b" },
      ],
    });
    mock.state.delete = { data: [row({ id: "d1" })], error: null };
    await useDepositsStore.getState().deleteDeposit("d1");
    expect(useDepositsStore.getState().deposits.map((d) => d.id)).toEqual(["d2"]);
  });

  it("throws a 42501 error when nothing was deleted", async () => {
    mock.state.delete = { data: [], error: null };
    await expect(useDepositsStore.getState().deleteDeposit("d1")).rejects.toMatchObject({
      code: "42501",
    });
  });

  it("propagates delete errors", async () => {
    mock.state.delete = { data: null, error: new Error("delete failed") };
    await expect(useDepositsStore.getState().deleteDeposit("d1")).rejects.toThrow("delete failed");
  });
});
