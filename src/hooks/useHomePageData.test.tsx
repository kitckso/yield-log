import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import dayjs from "dayjs";
import type { Bank, DepositWithBank } from "../types";

vi.mock("zustand", () => ({
  create: (initializer: (set: unknown, get: unknown) => unknown) => {
    let state: Record<string, unknown> = {};
    const setState = (partial: unknown) => {
      const next = typeof partial === "function" ? partial(state) : partial;
      state = { ...state, ...(next as Record<string, unknown>) };
    };
    const getState = () => state;
    state = initializer(setState, getState) as Record<string, unknown>;
    const useStore = (selector?: (s: Record<string, unknown>) => unknown) =>
      selector ? selector(state) : state;
    return Object.assign(useStore, {
      getState,
      setState,
      getInitialState: getState,
      subscribe: () => () => {},
    });
  },
}));

const supabaseMock = vi.hoisted(() => ({
  selectCalls: 0,
  latest: [] as unknown[],
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: () => {
      const chain: Record<string, unknown> = {
        select: () => {
          supabaseMock.selectCalls += 1;
          return chain;
        },
        order: () => chain,
        eq: () => chain,
        single: () => Promise.resolve({ data: null, error: null }),
        // oxlint-disable-next-line unicorn/no-thenable -- the Supabase query builder is thenable by design
        then: (f?: (v: unknown) => unknown) =>
          Promise.resolve({ data: supabaseMock.latest, error: null }).then(f),
      };
      return chain;
    },
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
    },
  },
}));

const { useHomePageData } = await import("./useHomePageData");
const { useDepositsStore } = await import("../store/deposits");
const { useBanksStore } = await import("../store/banks");

const banks: Bank[] = [
  { id: "b1", user_id: "u", name: "HSBC", created_at: "2024-01-01" },
  { id: "b2", user_id: "u", name: "ZA Bank", created_at: "2024-01-01" },
];

function dep(over: Partial<DepositWithBank> = {}): DepositWithBank {
  return {
    id: "d1",
    user_id: "u",
    bank_id: "b1",
    amount: 10000,
    period_value: 3,
    period_unit: "months",
    interest_rate: 3,
    interest: 150,
    start_date: dayjs().subtract(2, "month").format("YYYY-MM-DD"),
    end_date: dayjs().add(1, "month").format("YYYY-MM-DD"),
    created_at: "2024-01-01",
    bank_name: "HSBC",
    ...over,
  };
}

function renderHook(
  args: Parameters<typeof useHomePageData> = ["amount", "active", "start", "amount"],
): ReturnType<typeof useHomePageData> {
  let captured: ReturnType<typeof useHomePageData> | undefined;
  function Probe() {
    captured = useHomePageData(...args);
    return null;
  }
  renderToString(createElement(Probe));
  if (!captured) throw new Error("hook did not run");
  return captured;
}

beforeEach(() => {
  supabaseMock.selectCalls = 0;
  supabaseMock.latest = [];
  useDepositsStore.setState({ deposits: [], loading: false, error: null, lastFetched: 0 });
  useBanksStore.setState({ banks, loading: false, error: null, lastFetched: 0 });
});

describe("useHomePageData", () => {
  it("passes the store's loading and error through untouched", () => {
    useDepositsStore.setState({ loading: true, error: "boom" });
    const data = renderHook();
    expect(data.loading).toBe(true);
    expect(data.error).toBe("boom");
  });

  it("retries by forcing a fetch, ignoring the warm cache", async () => {
    useDepositsStore.setState({ lastFetched: Date.now() });
    const data = renderHook();
    expect(supabaseMock.selectCalls).toBe(0);
    await data.retry();
    expect(supabaseMock.selectCalls).toBe(1);
  });

  it("hands groupBy to the distribution, not the totals", () => {
    useDepositsStore.setState({
      deposits: [dep({ bank_id: "b1", amount: 1000, interest: 10 })],
    });
    const byAmount = renderHook(["amount", "active", "start", "amount"]);
    const byInterest = renderHook(["interest", "active", "start", "amount"]);
    expect(byAmount.bankDistribution[0].value).toBe(1000);
    expect(byInterest.bankDistribution[0].value).toBe(10);
    // The summary is independent of it either way.
    expect(byAmount.activeAmount).toBe(byInterest.activeAmount);
  });

  it("hands scope to the distribution only", () => {
    useDepositsStore.setState({
      deposits: [
        dep({ id: "a", bank_id: "b1", amount: 100 }),
        dep({
          id: "b",
          bank_id: "b2",
          amount: 900,
          end_date: dayjs().subtract(1, "day").format("YYYY-MM-DD"),
        }),
      ],
    });
    const active = renderHook(["amount", "active", "start", "amount"]);
    const all = renderHook(["amount", "all", "start", "amount"]);
    expect(active.bankDistribution.map((i) => i.name)).toEqual(["HSBC"]);
    expect(all.bankDistribution).toHaveLength(2);
  });

  it("hands yearGroupMode to the year summary only", () => {
    useDepositsStore.setState({
      deposits: [dep({ start_date: "2024-01-05", end_date: "2026-04-05" })],
    });
    const byStart = renderHook(["amount", "active", "start", "amount"]);
    const byEnd = renderHook(["amount", "active", "end", "amount"]);
    expect(byStart.yearSummary[0].year).toBe("2024");
    expect(byEnd.yearSummary[0].year).toBe("2026");
    expect(byStart.yearChartData).toEqual(
      byStart.yearSummary.map((y) => ({ year: y.year, amount: y.amount })),
    );
  });

  it("hands maturityGroupBy to the timeline only", () => {
    const thisMonth = dayjs().format("YYYY-MM-DD");
    useDepositsStore.setState({
      deposits: [dep({ amount: 500, interest: 5, end_date: thisMonth })],
    });
    const byAmount = renderHook(["amount", "active", "start", "amount"]);
    const byInterest = renderHook(["amount", "active", "start", "interest"]);
    const label = dayjs().format("M月");
    expect(byAmount.maturityTimeline[0]).toEqual({ month: label, value: 500 });
    expect(byInterest.maturityTimeline[0]).toEqual({ month: label, value: 5 });
  });

  it("builds the bank map the cards read names from", () => {
    expect(renderHook().bankMap.get("b1")).toBe("HSBC");
    expect(renderHook().bankMap.get("b2")).toBe("ZA Bank");
  });
});
