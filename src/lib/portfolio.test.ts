import { describe, expect, it } from "vite-plus/test";
import dayjs from "dayjs";
import {
  activeAmount,
  averageRate,
  bankDistribution,
  bankNames,
  bankStats,
  cumulativeInterestByMonth,
  interestPerDay,
  maturityTimeline,
  pendingInterest,
  receivedInterest,
  recentlyMatured,
  splitActive,
  termDistribution,
  upcomingDeposits,
  yearChartData,
  yearSummary,
} from "./portfolio";
import type { Bank, DepositWithBank } from "../types";

const banks: Bank[] = [
  { id: "b1", user_id: "u", name: "HSBC", created_at: "2024-01-01" },
  { id: "b2", user_id: "u", name: "ZA Bank", created_at: "2024-01-01" },
];
const bankMap = bankNames(banks);
const noBanks = bankNames([]);

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

/** A deposit that matured a month ago, for splitting against the active ones. */
const maturedDep = () =>
  dep({
    id: "old",
    amount: 5000,
    interest: 100,
    end_date: dayjs().subtract(1, "month").format("YYYY-MM-DD"),
  });

describe("bankNames", () => {
  it("maps bank ids to names", () => {
    expect(bankMap.get("b1")).toBe("HSBC");
    expect(bankMap.get("b2")).toBe("ZA Bank");
  });
});

describe("totals", () => {
  it("splits active from matured", () => {
    const { active, matured } = splitActive([dep(), maturedDep()]);
    expect(active).toHaveLength(1);
    expect(matured).toHaveLength(1);
    expect(activeAmount(active)).toBe(10000);
    expect(pendingInterest(active)).toBe(150);
    expect(receivedInterest(matured)).toBe(100);
  });

  it("computes a weighted average rate", () => {
    const { active } = splitActive([
      dep({ id: "a", amount: 10000, interest_rate: 2 }),
      dep({ id: "b", amount: 30000, interest_rate: 4 }),
    ]);
    expect(averageRate(active)).toBeCloseTo(3.5, 5);
  });

  it("returns zero metrics for an empty list", () => {
    const { active, matured } = splitActive([]);
    expect(activeAmount(active)).toBe(0);
    expect(pendingInterest(active)).toBe(0);
    expect(receivedInterest(matured)).toBe(0);
    expect(averageRate(active)).toBe(0);
    expect(interestPerDay(active)).toBe(0);
  });

  it("computes interest per day on a 365-day year", () => {
    const { active } = splitActive([dep({ amount: 365000, interest_rate: 3.65 })]);
    expect(interestPerDay(active)).toBeCloseTo(36.5, 5);
  });
});

describe("bankDistribution", () => {
  const twoBanks = () => [
    dep({ id: "a", bank_id: "b1", amount: 7500, interest: 100 }),
    dep({ id: "b", bank_id: "b2", amount: 2500, interest: 50 }),
  ];

  it("sorts by amount descending and assigns colors", () => {
    const items = bankDistribution(twoBanks(), bankMap, "amount", "active");
    expect(items.map((i) => i.name)).toEqual(["HSBC", "ZA Bank"]);
    expect(items.map((i) => i.value)).toEqual([7500, 2500]);
    expect(items.map((i) => i.pct)).toEqual([75, 25]);
    expect(items[0].color).toBe("blue.4");
    expect(items[1].color).toBe("cyan.6");
  });

  it("groups by interest instead of amount", () => {
    const items = bankDistribution(twoBanks(), bankMap, "interest", "active");
    expect(items.map((i) => i.value)).toEqual([100, 50]);
  });

  it("includes matured deposits when scope is all", () => {
    const withMatured = [
      ...twoBanks(),
      dep({
        id: "c",
        bank_id: "b2",
        amount: 10000,
        interest: 300,
        end_date: dayjs().subtract(1, "day").format("YYYY-MM-DD"),
      }),
    ];
    const active = bankDistribution(withMatured, bankMap, "amount", "active");
    const all = bankDistribution(withMatured, bankMap, "amount", "all");
    expect(active.find((i) => i.name === "ZA Bank")?.value).toBe(2500);
    expect(all.find((i) => i.name === "ZA Bank")?.value).toBe(12500);
  });

  it("falls back to 未知 for unknown bank ids", () => {
    const items = bankDistribution([dep({ bank_id: "missing" })], bankMap, "amount", "active");
    expect(items[0].name).toBe("未知");
  });

  it("returns empty when no banks are loaded", () => {
    expect(bankDistribution(twoBanks(), noBanks, "amount", "active")).toEqual([]);
  });
});

describe("bankStats", () => {
  it("splits active and matured per bank and sorts by total amount", () => {
    const stats = bankStats(
      [
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
      bankMap,
    );
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
    expect(bankStats([dep({ bank_id: "nope" })], bankMap)[0].bankName).toBe("未知");
  });

  it("returns empty when no banks are loaded", () => {
    expect(bankStats([dep()], noBanks)).toEqual([]);
  });
});

describe("termDistribution", () => {
  it("buckets deposits into short, medium and long by month equivalent", () => {
    const { active } = splitActive([
      dep({ id: "a", period_value: 3, period_unit: "months", amount: 100 }),
      dep({ id: "b", period_value: 9, period_unit: "months", amount: 200 }),
      dep({ id: "c", period_value: 2, period_unit: "years", amount: 300 }),
      dep({ id: "d", period_value: 20, period_unit: "days", amount: 400 }),
    ]);
    const buckets = termDistribution(active);
    expect(buckets.map((b) => b.name)).toEqual([
      "短期（<6個月）",
      "中期（6-12個月）",
      "長期（1年以上）",
    ]);
    expect(buckets.map((b) => b.value)).toEqual([500, 200, 300]);
  });

  it("treats weeks as 7/30 month", () => {
    const { active } = splitActive([dep({ period_value: 26, period_unit: "weeks", amount: 1000 })]);
    const buckets = termDistribution(active);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].name).toBe("中期（6-12個月）");
  });

  it("omits empty buckets", () => {
    const { active } = splitActive([dep({ period_value: 3, period_unit: "months", amount: 100 })]);
    expect(termDistribution(active).map((b) => b.name)).toEqual(["短期（<6個月）"]);
  });
});

describe("cumulativeInterestByMonth", () => {
  it("returns empty for no deposits", () => {
    expect(cumulativeInterestByMonth([])).toEqual([]);
  });

  it("spans from the first start month to the last end month", () => {
    const growth = cumulativeInterestByMonth([
      dep({
        id: "a",
        start_date: dayjs().subtract(2, "month").startOf("month").format("YYYY-MM-DD"),
        end_date: dayjs().format("YYYY-MM-DD"),
        interest: 100,
      }),
    ]);
    expect(growth[0].month).toBe(dayjs().subtract(2, "month").format("YYYY-MM"));
    expect(growth[growth.length - 1].month).toBe(dayjs().format("YYYY-MM"));
  });

  it("accumulates fully matured interest and pro-rates partial months", () => {
    const past = dayjs().subtract(3, "month");
    const growth = cumulativeInterestByMonth([
      dep({
        id: "a",
        start_date: past.startOf("month").format("YYYY-MM-DD"),
        end_date: past.add(1, "month").endOf("month").format("YYYY-MM-DD"),
        interest: 100,
      }),
    ]);
    expect(growth[0].累計利息).toBeGreaterThan(0);
    expect(growth[1].累計利息).toBeGreaterThan(growth[0].累計利息);
    expect(growth[1].累計利息).toBeLessThanOrEqual(100);
  });
});

describe("maturityTimeline", () => {
  const NOW = dayjs("2026-06-15", "YYYY-MM-DD", true);

  it("covers the current month plus the next five", () => {
    expect(maturityTimeline([], "amount", NOW)).toEqual([
      { month: "6月", value: 0 },
      { month: "7月", value: 0 },
      { month: "8月", value: 0 },
      { month: "9月", value: 0 },
      { month: "10月", value: 0 },
      { month: "11月", value: 0 },
    ]);
  });

  it("sums by end month and switches to interest when requested", () => {
    const deposits = [
      dep({ id: "a", amount: 100, interest: 10, end_date: "2026-06-30" }),
      dep({ id: "b", amount: 200, interest: 20, end_date: "2026-06-20" }),
      dep({ id: "c", amount: 400, interest: 40, end_date: "2026-08-15" }),
    ];
    expect(maturityTimeline(deposits, "amount", NOW)[0].value).toBe(300);
    expect(maturityTimeline(deposits, "amount", NOW)[2].value).toBe(400);
    expect(maturityTimeline(deposits, "interest", NOW)[0].value).toBe(30);
  });

  it("rolls the window over a year boundary", () => {
    const december = dayjs("2026-12-20", "YYYY-MM-DD", true);
    const timeline = maturityTimeline([dep({ end_date: "2027-01-15" })], "amount", december);
    expect(timeline.map((m) => m.month)).toEqual(["12月", "1月", "2月", "3月", "4月", "5月"]);
    expect(timeline[1].value).toBeGreaterThan(0);
  });
});

describe("upcomingDeposits and recentlyMatured", () => {
  const NOW = dayjs("2026-06-15", "YYYY-MM-DD", true);

  it("sorts upcoming by ascending end date", () => {
    expect(
      upcomingDeposits([
        dep({ id: "late", end_date: "2026-11-20" }),
        dep({ id: "soon", end_date: "2026-07-15" }),
      ]).map((d) => d.id),
    ).toEqual(["soon", "late"]);
  });

  it("counts back to the cutoff, and no further", () => {
    const matured = recentlyMatured(
      [
        dep({ id: "fresh", end_date: "2026-06-14" }),
        dep({ id: "sixDays", end_date: "2026-06-09" }),
        dep({ id: "cutoff", end_date: "2026-06-08" }),
        dep({ id: "old", end_date: "2026-06-07" }),
      ],
      NOW,
    );
    // The cutoff is exclusive: maturing exactly a week ago is already out.
    expect(matured.map((d) => d.id)).toEqual(["sixDays", "fresh"]);
  });
});

describe("yearSummary", () => {
  it("groups by start year or end year", () => {
    const deposits = [
      dep({
        id: "a",
        start_date: "2024-01-05",
        end_date: "2027-04-05",
        amount: 1000,
        interest: 50,
      }),
    ];
    expect(yearSummary(deposits, "start")[0].year).toBe("2024");
    expect(yearSummary(deposits, "end")[0].year).toBe("2027");
    expect(yearSummary(deposits, "start")[0]).toMatchObject({
      count: 1,
      amount: 1000,
      pending: 50,
      received: 0,
    });
  });

  it("splits pending and received interest", () => {
    const { matured } = splitActive([dep(), maturedDep()]);
    const [row] = yearSummary([...matured], "start");
    expect(row.pending).toBe(0);
    expect(row.received).toBe(100);
    expect(row.amount).toBe(5000);
  });

  it("sorts years ascending and feeds yearChartData", () => {
    const summary = yearSummary(
      [
        dep({ id: "a", start_date: "2022-01-01", end_date: "2022-06-01", amount: 100 }),
        dep({ id: "b", start_date: "2020-01-01", end_date: "2020-06-01", amount: 200 }),
      ],
      "start",
    );
    expect(summary.map((y) => y.year)).toEqual(["2020", "2022"]);
    expect(yearChartData(summary)).toEqual([
      { year: "2020", amount: 200 },
      { year: "2022", amount: 100 },
    ]);
  });
});
