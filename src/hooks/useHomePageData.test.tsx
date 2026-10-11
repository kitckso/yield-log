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

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: () => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        order: () => chain,
        eq: () => chain,
        single: () => Promise.resolve({ data: null, error: null }),
        // oxlint-disable-next-line unicorn/no-thenable -- the Supabase query builder is thenable by design
        then: (f?: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(f),
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
type HomePageData = ReturnType<typeof useHomePageData>;

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
): HomePageData {
  let captured: HomePageData | undefined;
  function Probe() {
    captured = useHomePageData(...args);
    return null;
  }
  renderToString(createElement(Probe));
  if (!captured) throw new Error("hook did not run");
  return captured;
}

beforeEach(() => {
  useDepositsStore.setState({ deposits: [], loading: false, lastFetched: Date.now() });
  useBanksStore.setState({ banks, loading: false, lastFetched: Date.now() });
});

describe("totals", () => {
  it("splits active and matured deposits", () => {
    const matured = dep({
      id: "old",
      amount: 5000,
      interest: 100,
      end_date: dayjs().subtract(1, "month").format("YYYY-MM-DD"),
    });
    const data = renderHook();
    expect(data.activeDeposits).toHaveLength(0);
    expect(data.maturedDeposits).toHaveLength(0);

    useDepositsStore.setState({ deposits: [dep(), matured] });
    const next = renderHook();
    expect(next.activeDeposits).toHaveLength(1);
    expect(next.maturedDeposits).toHaveLength(1);
    expect(next.activeAmount).toBe(10000);
    expect(next.pendingInterest).toBe(150);
    expect(next.totalReceivedInterest).toBe(100);
  });

  it("computes a weighted average rate", () => {
    useDepositsStore.setState({
      deposits: [
        dep({ id: "a", amount: 10000, interest_rate: 2 }),
        dep({ id: "b", amount: 30000, interest_rate: 4 }),
      ],
    });
    expect(renderHook().avgRate).toBeCloseTo(3.5, 5);
  });

  it("returns zero metrics for an empty list", () => {
    const data = renderHook();
    expect(data.avgRate).toBe(0);
    expect(data.interestPerDay).toBe(0);
    expect(data.activeAmount).toBe(0);
  });

  it("computes interest per day", () => {
    useDepositsStore.setState({ deposits: [dep({ amount: 365000, interest_rate: 3.65 })] });
    expect(renderHook().interestPerDay).toBeCloseTo(36.5, 5);
  });
});

describe("bankDistribution", () => {
  beforeEach(() => {
    useDepositsStore.setState({
      deposits: [
        dep({ id: "a", bank_id: "b1", amount: 7500, interest: 100 }),
        dep({ id: "b", bank_id: "b2", amount: 2500, interest: 50 }),
      ],
    });
  });

  it("sorts by amount descending and assigns colors", () => {
    const items = renderHook(["amount", "active", "start", "amount"]).bankDistribution;
    expect(items.map((i) => i.name)).toEqual(["HSBC", "ZA Bank"]);
    expect(items.map((i) => i.value)).toEqual([7500, 2500]);
    expect(items.map((i) => i.pct)).toEqual([75, 25]);
    expect(items[0].color).toBe("blue.4");
    expect(items[1].color).toBe("cyan.6");
  });

  it("groups by interest instead of amount", () => {
    const items = renderHook(["interest", "active", "start", "amount"]).bankDistribution;
    expect(items.map((i) => i.value)).toEqual([100, 50]);
  });

  it("includes matured deposits when scope is all", () => {
    const withMatured = [
      ...useDepositsStore.getState().deposits,
      dep({
        id: "c",
        bank_id: "b2",
        amount: 10000,
        interest: 300,
        end_date: dayjs().subtract(1, "day").format("YYYY-MM-DD"),
      }),
    ];
    useDepositsStore.setState({ deposits: withMatured });
    const active = renderHook(["amount", "active", "start", "amount"]).bankDistribution;
    const all = renderHook(["amount", "all", "start", "amount"]).bankDistribution;
    expect(active.find((i) => i.name === "ZA Bank")?.value).toBe(2500);
    expect(all.find((i) => i.name === "ZA Bank")?.value).toBe(12500);
  });

  it("falls back to 未知 for unknown bank ids", () => {
    useDepositsStore.setState({ deposits: [dep({ bank_id: "missing" })] });
    expect(renderHook().bankDistribution[0].name).toBe("未知");
  });

  it("returns empty when no banks exist", () => {
    useBanksStore.setState({ banks: [] });
    expect(renderHook().bankDistribution).toEqual([]);
  });
});

describe("termDistribution", () => {
  it("buckets deposits into short, medium and long by month equivalent", () => {
    useDepositsStore.setState({
      deposits: [
        dep({ id: "a", period_value: 3, period_unit: "months", amount: 100 }),
        dep({ id: "b", period_value: 9, period_unit: "months", amount: 200 }),
        dep({ id: "c", period_value: 2, period_unit: "years", amount: 300 }),
        dep({ id: "d", period_value: 20, period_unit: "days", amount: 400 }),
      ],
    });
    const buckets = renderHook().termDistribution;
    expect(buckets.map((b) => b.name)).toEqual([
      "短期（<6個月）",
      "中期（6-12個月）",
      "長期（1年以上）",
    ]);
    expect(buckets.map((b) => b.value)).toEqual([500, 200, 300]);
  });

  it("treats weeks as 7/30 month", () => {
    useDepositsStore.setState({
      deposits: [dep({ period_value: 26, period_unit: "weeks", amount: 1000 })],
    });
    const buckets = renderHook().termDistribution;
    expect(buckets).toHaveLength(1);
    expect(buckets[0].name).toBe("中期（6-12個月）");
  });

  it("omits empty buckets", () => {
    useDepositsStore.setState({
      deposits: [dep({ period_value: 3, period_unit: "months", amount: 100 })],
    });
    expect(renderHook().termDistribution.map((b) => b.name)).toEqual(["短期（<6個月）"]);
  });
});

describe("growthData", () => {
  it("returns empty for no deposits", () => {
    expect(renderHook().growthData).toEqual([]);
  });

  it("spans from the first start month to the last end month", () => {
    useDepositsStore.setState({
      deposits: [
        dep({
          id: "a",
          start_date: dayjs().subtract(2, "month").startOf("month").format("YYYY-MM-DD"),
          end_date: dayjs().format("YYYY-MM-DD"),
          interest: 100,
        }),
      ],
    });
    const growth = renderHook().growthData;
    expect(growth[0].month).toBe(dayjs().subtract(2, "month").format("YYYY-MM"));
    expect(growth[growth.length - 1].month).toBe(dayjs().format("YYYY-MM"));
  });

  it("accumulates fully matured interest and pro-rates partial months", () => {
    const past = dayjs().subtract(3, "month");
    useDepositsStore.setState({
      deposits: [
        dep({
          id: "a",
          start_date: past.startOf("month").format("YYYY-MM-DD"),
          end_date: past.add(1, "month").endOf("month").format("YYYY-MM-DD"),
          interest: 100,
        }),
      ],
    });
    const growth = renderHook().growthData;
    const first = growth[0];
    const second = growth[1];
    expect(first.累計利息).toBeGreaterThan(0);
    expect(second.累計利息).toBeGreaterThan(first.累計利息);
    expect(second.累計利息).toBeLessThanOrEqual(100);
  });
});

describe("maturityTimeline", () => {
  it("covers the current month plus the next five", () => {
    const timeline = renderHook().maturityTimeline;
    expect(timeline).toHaveLength(6);
    expect(timeline[0].month).toBe(`${dayjs().month() + 1}月`);
  });

  it("sums by end month and switches to interest when requested", () => {
    useDepositsStore.setState({
      deposits: [
        dep({ id: "a", amount: 100, interest: 10, end_date: dayjs().format("YYYY-MM-DD") }),
        dep({ id: "b", amount: 200, interest: 20, end_date: dayjs().format("YYYY-MM-DD") }),
      ],
    });
    const byAmount = renderHook(["amount", "active", "start", "amount"]).maturityTimeline;
    const byInterest = renderHook(["amount", "active", "start", "interest"]).maturityTimeline;
    expect(byAmount[0].value).toBe(300);
    expect(byInterest[0].value).toBe(30);
  });

  it("reports zero for months without maturities", () => {
    expect(renderHook().maturityTimeline[5].value).toBe(0);
  });
});

describe("upcoming and recentlyMatured", () => {
  it("sorts upcoming by ascending end date", () => {
    useDepositsStore.setState({
      deposits: [
        dep({ id: "late", end_date: dayjs().add(5, "month").format("YYYY-MM-DD") }),
        dep({ id: "soon", end_date: dayjs().add(1, "month").format("YYYY-MM-DD") }),
      ],
    });
    expect(renderHook().upcoming.map((d) => d.id)).toEqual(["soon", "late"]);
  });

  it("includes only deposits matured within the last week", () => {
    useDepositsStore.setState({
      deposits: [
        dep({ id: "fresh", end_date: dayjs().subtract(2, "day").format("YYYY-MM-DD") }),
        dep({ id: "old", end_date: dayjs().subtract(30, "day").format("YYYY-MM-DD") }),
      ],
    });
    expect(renderHook().recentlyMatured.map((d) => d.id)).toEqual(["fresh"]);
  });
});

describe("yearSummary", () => {
  it("groups by start year or end year", () => {
    const start = dayjs().add(2, "month").startOf("year").format("YYYY-MM-DD");
    useDepositsStore.setState({
      deposits: [
        dep({
          id: "a",
          start_date: start,
          end_date: dayjs().add(3, "month").format("YYYY-MM-DD"),
          amount: 1000,
          interest: 50,
        }),
      ],
    });
    const byStart = renderHook(["amount", "active", "start", "amount"]).yearSummary;
    const byEnd = renderHook(["amount", "active", "end", "amount"]).yearSummary;
    expect(byStart[0].year).toBe(dayjs(start).format("YYYY"));
    expect(byStart[0].count).toBe(1);
    expect(byStart[0].pending).toBe(50);
    expect(byStart[0].received).toBe(0);
    expect(byEnd.length).toBeGreaterThan(0);
  });

  it("splits pending and received interest", () => {
    useDepositsStore.setState({
      deposits: [
        dep({ id: "a", interest: 100, end_date: dayjs().add(1, "month").format("YYYY-MM-DD") }),
        dep({
          id: "b",
          interest: 200,
          end_date: dayjs().subtract(1, "month").format("YYYY-MM-DD"),
        }),
      ],
    });
    const summary = renderHook().yearSummary;
    expect(summary[0].pending).toBe(100);
    expect(summary[0].received).toBe(200);
  });

  it("sorts years ascending and feeds yearChartData", () => {
    useDepositsStore.setState({
      deposits: [
        dep({
          id: "a",
          start_date: "2022-01-01",
          end_date: "2022-06-01",
          amount: 100,
        }),
        dep({ id: "b", start_date: "2020-01-01", end_date: "2020-06-01", amount: 200 }),
      ],
    });
    const data = renderHook();
    expect(data.yearSummary.map((y) => y.year)).toEqual(["2020", "2022"]);
    expect(data.yearChartData).toEqual([
      { year: "2020", amount: 200 },
      { year: "2022", amount: 100 },
    ]);
  });
});

describe("bankStats", () => {
  it("splits active and matured per bank and sorts by total amount", () => {
    useDepositsStore.setState({
      deposits: [
        dep({ id: "a", bank_id: "b1", amount: 1000, interest: 10 }),
        dep({
          id: "b",
          bank_id: "b1",
          amount: 500,
          interest: 50,
          end_date: dayjs().subtract(1, "month").format("YYYY-MM-DD"),
        }),
        dep({ id: "c", bank_id: "b2", amount: 300, interest: 5 }),
      ],
    });
    const stats = renderHook().bankStats;
    expect(stats.map((s) => s.bankName)).toEqual(["HSBC", "ZA Bank"]);
    const hsbc = stats[0];
    expect(hsbc.bankId).toBe("b1");
    expect(hsbc.activeCount).toBe(1);
    expect(hsbc.activeAmount).toBe(1000);
    expect(hsbc.pendingInterest).toBe(10);
    expect(hsbc.maturedCount).toBe(1);
    expect(hsbc.maturedAmount).toBe(500);
    expect(hsbc.receivedInterest).toBe(50);
  });

  it("uses 未知 for deposits whose bank is missing", () => {
    useDepositsStore.setState({ deposits: [dep({ bank_id: "nope" })] });
    expect(renderHook().bankStats[0].bankName).toBe("未知");
  });

  it("returns empty when no banks exist", () => {
    useBanksStore.setState({ banks: [] });
    expect(renderHook().bankStats).toEqual([]);
  });
});

describe("bankMap", () => {
  it("maps bank ids to names", () => {
    const map = renderHook().bankMap;
    expect(map.get("b1")).toBe("HSBC");
    expect(map.get("b2")).toBe("ZA Bank");
  });
});
