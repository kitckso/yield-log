import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { DepositWithBank } from "../types";

const mock = vi.hoisted(() => {
  const state: {
    select?: { data?: unknown; error?: unknown };
    insert?: { data?: unknown; error?: unknown };
    update?: { data?: unknown; error?: unknown };
    delete?: { data?: unknown; error?: unknown };
    session: { user: { id: string } } | null;
    /** When set, selects stay in flight until the test releases them. */
    holdSelects: boolean;
    pendingSelects: { resolve: (r: unknown) => void }[];
  } = { session: { user: { id: "user-1" } }, holdSelects: false, pendingSelects: [] };

  const chain = (result: { data?: unknown; error?: unknown } | undefined, isSelect = false) => {
    const resolved = () => {
      if (isSelect && state.holdSelects) {
        return new Promise((res) => state.pendingSelects.push({ resolve: res }));
      }
      return Promise.resolve(result ?? { data: null, error: null });
    };
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
    select: () => chain(state.select, true),
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

/** The shape the join actually returns, flattened the way the store stores it. */
const deposit = (over: Record<string, unknown> = {}): DepositWithBank =>
  row(over) as unknown as DepositWithBank;

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
  mock.state.holdSelects = false;
  mock.state.pendingSelects = [];
  useDepositsStore.setState({
    deposits: [],
    loading: false,
    error: null,
    lastFetched: 0,
  });
});

describe("when the account changes mid-fetch", () => {
  const hold = () => mock.state.pendingSelects;
  /** The query only reaches the builder on a microtask, so let it get there. */
  const settle = () => new Promise((r) => setTimeout(r, 0));

  it("does not write another account's rows into the store", async () => {
    mock.state.holdSelects = true;
    const pending = useDepositsStore.getState().fetchDeposits();
    await settle();
    // A signs out and B signs in while the request is still going.
    useDepositsStore.getState().clear();
    hold()[0].resolve({ data: [row({ id: "a" })], error: null });
    await pending;

    // A's rows must not become the list B is about to read.
    expect(useDepositsStore.getState().deposits).toEqual([]);
    // And a stamp here would freeze them in place for five minutes.
    expect(useDepositsStore.getState().lastFetched).toBe(0);
  });

  it("makes the next account ask again instead of joining the abandoned request", async () => {
    mock.state.holdSelects = true;
    const abandoned = useDepositsStore.getState().fetchDeposits();
    await settle();
    useDepositsStore.getState().clear();
    const fresh = useDepositsStore.getState().fetchDeposits();
    await settle();

    // Two queries went out, one per account, instead of one shared between them.
    expect(hold()).toHaveLength(2);
    hold()[0].resolve({ data: [row({ id: "a" })], error: null });
    hold()[1].resolve({ data: [row({ id: "b" })], error: null });
    await Promise.all([abandoned, fresh]);

    expect(useDepositsStore.getState().deposits.map((d) => d.id)).toEqual(["b"]);
  });

  it("keeps an optimistic row that a slower snapshot would have dropped", async () => {
    mock.state.holdSelects = true;
    mock.state.insert = { data: row({ id: "new" }), error: null };
    const pending = useDepositsStore.getState().fetchDeposits();
    await settle();
    // The insert lands first and patches the row in, then marks the rows a guess.
    await useDepositsStore.getState().addDeposit({ ...newDeposit(), amount: 999 });
    expect(useDepositsStore.getState().deposits.map((d) => d.id)).toEqual(["new"]);

    // The request that started before the insert answers with a snapshot that
    // does not contain it.
    hold()[0].resolve({ data: [row({ id: "stale" })], error: null });
    await pending;

    expect(useDepositsStore.getState().deposits.map((d) => d.id)).toEqual(["new"]);
    expect(useDepositsStore.getState().lastFetched).toBe(0);
  });
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
    useDepositsStore.setState({ deposits: [deposit()] });
    mock.state.select = { data: null, error: { message: "boom" } };
    await useDepositsStore.getState().fetchDeposits();
    expect(useDepositsStore.getState().deposits).toHaveLength(1);
    expect(useDepositsStore.getState().loading).toBe(false);
  });

  it("says a fetch failed instead of leaving stale rows looking current", async () => {
    mock.state.select = { data: null, error: { message: "boom" } };
    await useDepositsStore.getState().fetchDeposits();
    expect(useDepositsStore.getState().error).toBe("操作失敗，請稍後再試");
  });

  it("clears the error once a fetch succeeds", async () => {
    mock.state.select = { data: null, error: { message: "boom" } };
    await useDepositsStore.getState().fetchDeposits();
    mock.state.select = { data: [row()], error: null };
    await useDepositsStore.getState().fetchDeposits(true);
    expect(useDepositsStore.getState().error).toBeNull();
  });
});

describe("forgetBank", () => {
  it("drops the deposits the database took with the bank", () => {
    useDepositsStore.setState({
      deposits: [deposit({ id: "d1", bank_id: "b1" }), deposit({ id: "d2", bank_id: "b2" })],
      lastFetched: Date.now(),
    });
    useDepositsStore.getState().forgetBank("b1");
    expect(useDepositsStore.getState().deposits.map((d) => d.id)).toEqual(["d2"]);
    // The local guess is marked stale so a refetch can correct it either way.
    expect(useDepositsStore.getState().lastFetched).toBe(0);
  });
});

describe("clear", () => {
  it("empties the store so no account sees another's rows", () => {
    useDepositsStore.setState({
      deposits: [deposit()],
      loading: true,
      error: "boom",
      lastFetched: Date.now(),
    });
    useDepositsStore.getState().clear();
    expect(useDepositsStore.getState()).toMatchObject({
      deposits: [],
      loading: false,
      error: null,
      lastFetched: 0,
    });
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
