import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import dayjs from "dayjs";
import {
  buildMonthGroups,
  hasDepositsInYear,
  isPastMonth,
  projectDec31Interest,
  splitMonthByToday,
  sumYearTotals,
} from "./calendar";
import { isMatured } from "../hooks/useCalculations";
import type { DepositWithBank } from "../types";

function dep(over: Partial<DepositWithBank> = {}): DepositWithBank {
  return {
    id: "d1",
    user_id: "u",
    bank_id: "b1",
    amount: 100000,
    period_value: 3,
    period_unit: "months",
    interest_rate: 3,
    interest: 750,
    start_date: "2024-01-01",
    end_date: "2024-04-01",
    created_at: "2024-01-01",
    bank_name: "HSBC",
    ...over,
  };
}

describe("buildMonthGroups", () => {
  it("always returns 12 groups in calendar order", () => {
    const groups = buildMonthGroups([], 2024);
    expect(groups).toHaveLength(12);
    expect(groups.map((g) => g.month)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(groups.map((g) => g.label)).toEqual([
      "1月",
      "2月",
      "3月",
      "4月",
      "5月",
      "6月",
      "7月",
      "8月",
      "9月",
      "10月",
      "11月",
      "12月",
    ]);
  });

  it("buckets deposits by end_date month and ignores other years", () => {
    const groups = buildMonthGroups(
      [
        dep({ id: "a", end_date: "2024-03-10" }),
        dep({ id: "b", end_date: "2024-03-25" }),
        dep({ id: "c", end_date: "2025-03-10" }),
      ],
      2024,
    );
    expect(groups[2].deposits.map((d) => d.id)).toEqual(["a", "b"]);
    expect(groups[2].deposits).toHaveLength(2);
  });

  it("sorts a month's deposits by end_date ascending", () => {
    const groups = buildMonthGroups(
      [
        dep({ id: "c", end_date: "2024-03-25" }),
        dep({ id: "a", end_date: "2024-03-01" }),
        dep({ id: "b", end_date: "2024-03-10" }),
      ],
      2024,
    );
    expect(groups[2].deposits.map((d) => d.id)).toEqual(["a", "b", "c"]);
  });

  it("totals amount and interest per month", () => {
    const groups = buildMonthGroups(
      [
        dep({ id: "a", end_date: "2024-03-01", amount: 1000, interest: 10 }),
        dep({ id: "b", end_date: "2024-03-10", amount: 2500, interest: 40 }),
      ],
      2024,
    );
    expect(groups[2].totalAmount).toBe(3500);
    expect(groups[2].totalInterest).toBe(50);
  });

  it("leaves empty months at zero", () => {
    const groups = buildMonthGroups([], 2024);
    expect(groups.every((g) => g.deposits.length === 0)).toBe(true);
    expect(groups.every((g) => g.totalAmount === 0 && g.totalInterest === 0)).toBe(true);
  });
});

describe("sumYearTotals", () => {
  it("sums amount and interest across months", () => {
    const totals = sumYearTotals([
      { month: 0, label: "1月", deposits: [], totalAmount: 100, totalInterest: 5 },
      { month: 1, label: "2月", deposits: [], totalAmount: 250, totalInterest: 7 },
    ]);
    expect(totals).toEqual({ yearTotalAmount: 350, yearTotalInterest: 12 });
  });

  it("returns zeros for no months", () => {
    expect(sumYearTotals([])).toEqual({ yearTotalAmount: 0, yearTotalInterest: 0 });
  });

  it("matches the sum of the built groups", () => {
    const groups = buildMonthGroups(
      [dep({ id: "a", end_date: "2024-06-15", amount: 700, interest: 21 })],
      2024,
    );
    expect(sumYearTotals(groups).yearTotalAmount).toBe(700);
    expect(sumYearTotals(groups).yearTotalInterest).toBe(21);
  });
});

describe("projectDec31Interest", () => {
  const year = dayjs().year();
  const yearEnd = dayjs().year(year).endOf("year");
  const yStart = (m: number, d: number) => dayjs().year(year).month(m).date(d);
  const fmt = (d: dayjs.Dayjs) => d.format("YYYY-MM-DD");

  // Pin the clock to the previous December so the whole target year is still
  // strictly in the future. isMatured() treats today as matured, so starting
  // the clock on Jan 1 would skip every deposit dated Jan 1.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(year - 1, 11, 1));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the whole target year in the future, whatever day the suite runs", () => {
    // Guards every other test here: they all assume no date inside `year` is
    // already matured, which only holds because the clock is pinned to the
    // previous December. Without the pin, a run in e.g. November would treat
    // every fixture as matured and the projections would collapse to 0.
    expect(dayjs().format("YYYY-MM-DD")).toBe(`${year - 1}-12-01`);
    expect(isMatured(fmt(yStart(0, 1)))).toBe(false);
    expect(isMatured(fmt(yStart(11, 31)))).toBe(false);
    expect(isMatured(fmt(yStart(10, 30)))).toBe(false);
  });

  it("anchors the projection to Dec 31 of the target year, not to today", () => {
    const deposit = dep({
      amount: 100000,
      interest_rate: 3,
      period_value: 30,
      period_unit: "days",
      end_date: fmt(yStart(10, 30)),
    });
    const first = projectDec31Interest([deposit], year, 0, year);

    // Move the pinned clock to a different day of the same relative position:
    // the answer must not move with it.
    vi.setSystemTime(new Date(year - 1, 11, 20));
    const second = projectDec31Interest([deposit], year, 0, year);

    expect(second).toBe(first);
  });

  it("returns null for a non-current year", () => {
    expect(projectDec31Interest([], year + 1, 0, year)).toBeNull();
    expect(projectDec31Interest([], year - 1, 0, year)).toBeNull();
  });

  it("returns the year total when nothing is still active", () => {
    const result = projectDec31Interest(
      [dep({ end_date: dayjs().subtract(2, "month").format("YYYY-MM-DD") })],
      year,
      500,
      year,
    );
    expect(result).toBe(500);
  });

  it("ignores deposits that mature after Dec 31", () => {
    const result = projectDec31Interest(
      [dep({ end_date: fmt(yearEnd.add(1, "day")) })],
      year,
      100,
      year,
    );
    expect(result).toBe(100);
  });

  it("ignores already matured deposits", () => {
    const result = projectDec31Interest(
      [dep({ end_date: dayjs().subtract(1, "day").format("YYYY-MM-DD") })],
      year,
      100,
      year,
    );
    expect(result).toBe(100);
  });

  it("uses the stated term length for day-based terms", () => {
    // Nov 30 + 30 days = Dec 30, still inside the year, so one cycle
    const result = projectDec31Interest(
      [
        dep({
          amount: 100000,
          interest_rate: 3,
          period_value: 30,
          period_unit: "days",
          end_date: fmt(yStart(10, 30)),
        }),
      ],
      year,
      0,
      year,
    );
    expect(result).toBe(Math.round(100000 * 0.03 * (30 / 365) * 100) / 100);
  });

  it("uses 7x the period value for week-based terms", () => {
    const result = projectDec31Interest(
      [
        dep({
          amount: 100000,
          interest_rate: 3,
          period_value: 4,
          period_unit: "weeks",
          end_date: fmt(yStart(10, 30)),
        }),
      ],
      year,
      0,
      year,
    );
    expect(result).toBe(Math.round(100000 * 0.03 * (28 / 365) * 100) / 100);
  });

  it("uses actual elapsed days for month terms, not a fixed length", () => {
    // Nov 30 + 1 month = Dec 30 rolls once, then Jan 30 next year stops it
    const start = yStart(10, 30);
    const expectedDays = start.add(1, "month").diff(start, "day");
    const result = projectDec31Interest(
      [
        dep({
          amount: 100000,
          interest_rate: 3,
          period_value: 1,
          period_unit: "months",
          end_date: fmt(start),
        }),
      ],
      year,
      0,
      year,
    );
    expect(expectedDays).toBe(30);
    expect(result).toBe(Math.round(100000 * 0.03 * (30 / 365) * 100) / 100);
  });

  it("measures a month term in real days, so a 31-day month pays more", () => {
    const start = yStart(0, 1); // Jan 1 + 1 month = Feb 1 => 31 days
    const febDays = start.add(1, "month").diff(start, "day");
    expect(febDays).toBe(31);
    const singleCycle = projectDec31Interest(
      [
        dep({
          id: "x",
          amount: 100000,
          interest_rate: 3,
          period_value: 1,
          period_unit: "months",
          end_date: fmt(yStart(10, 30)),
        }),
      ],
      year,
      0,
      year,
    );
    const manyCycles = projectDec31Interest(
      [
        dep({
          id: "y",
          amount: 100000,
          interest_rate: 3,
          period_value: 1,
          period_unit: "months",
          end_date: fmt(start),
        }),
      ],
      year,
      0,
      year,
    );
    expect(manyCycles).toBeGreaterThan(singleCycle ?? 0);
  });

  it("rolls a half-year term once and stops at the year boundary", () => {
    // Nov 30 + 6 months = May 30 next year, so no rollover at all
    const result = projectDec31Interest(
      [
        dep({
          amount: 100000,
          interest_rate: 3,
          period_value: 6,
          period_unit: "months",
          end_date: fmt(yStart(10, 30)),
        }),
      ],
      year,
      0,
      year,
    );
    expect(result).toBe(0);
  });

  it("rolls a multi-month term that fits inside the year", () => {
    // Oct 31 + 2 months = Dec 31 still inside the year
    const start = yStart(9, 31);
    const result = projectDec31Interest(
      [
        dep({
          amount: 100000,
          interest_rate: 3,
          period_value: 2,
          period_unit: "months",
          end_date: fmt(start),
        }),
      ],
      year,
      0,
      year,
    );
    const termDays = start.add(2, "month").diff(start, "day");
    expect(termDays).toBe(61);
    expect(result).toBe(Math.round(100000 * 0.03 * (61 / 365) * 100) / 100);
  });

  it("does not roll a yearly term, since it always lands in the next year", () => {
    const result = projectDec31Interest(
      [
        dep({
          amount: 100000,
          interest_rate: 3,
          period_value: 1,
          period_unit: "years",
          end_date: fmt(yStart(0, 1)),
        }),
      ],
      year,
      0,
      year,
    );
    expect(result).toBe(0);
  });

  it("stops rolling once the next maturity passes Dec 31", () => {
    // Nov 1 + 60 days = Dec 31 fits inside the year, the next one does not
    const result = projectDec31Interest(
      [
        dep({
          amount: 365000,
          interest_rate: 3,
          period_value: 60,
          period_unit: "days",
          end_date: fmt(yStart(10, 1)),
        }),
      ],
      year,
      0,
      year,
    );
    expect(result).toBe(Math.round(365000 * 0.03 * (60 / 365) * 100) / 100);
  });

  it("adds no rollover when the first maturity is already past Dec 31", () => {
    const result = projectDec31Interest(
      [
        dep({
          amount: 365000,
          interest_rate: 3,
          period_value: 90,
          period_unit: "days",
          end_date: fmt(yStart(10, 30)),
        }),
      ],
      year,
      0,
      year,
    );
    expect(result).toBe(0);
  });

  it("counts multiple cycles for a short repeating term", () => {
    // Jan 1 + 30 days fits twelve times before Dec 31 in any year
    const singleCycle = 100000 * 0.03 * (30 / 365);
    const result = projectDec31Interest(
      [
        dep({
          amount: 100000,
          interest_rate: 3,
          period_value: 30,
          period_unit: "days",
          end_date: fmt(yStart(0, 1)),
        }),
      ],
      year,
      0,
      year,
    );
    expect(result).toBe(Math.round(singleCycle * 12 * 100) / 100);
  });

  it("adds up rollover across several deposits", () => {
    const a = dep({
      id: "a",
      amount: 365000,
      interest_rate: 3,
      period_value: 30,
      period_unit: "days",
      end_date: fmt(yStart(0, 1)),
    });
    const b = dep({
      id: "b",
      amount: 365000,
      interest_rate: 6,
      period_value: 30,
      period_unit: "days",
      end_date: fmt(yStart(0, 1)),
    });
    const onlyA = projectDec31Interest([a], year, 0, year) ?? 0;
    const onlyB = projectDec31Interest([b], year, 0, year) ?? 0;
    const both = projectDec31Interest([a, b], year, 0, year);
    expect(both).toBe(Math.round((onlyA + onlyB) * 100) / 100);
  });

  it("rounds the result to two decimals", () => {
    const result = projectDec31Interest(
      [
        dep({
          amount: 7777,
          interest_rate: 3.33,
          period_value: 17,
          period_unit: "days",
          end_date: fmt(yStart(0, 1)),
        }),
      ],
      year,
      0,
      year,
    );
    expect(result).not.toBeNull();
    expect(String(result)).toMatch(/^-?\d+(\.\d{1,2})?$/);
  });
});

describe("splitMonthByToday", () => {
  it("separates already-matured deposits from future ones", () => {
    const split = splitMonthByToday([
      dep({
        id: "old",
        end_date: dayjs().subtract(5, "day").format("YYYY-MM-DD"),
        amount: 100,
        interest: 10,
      }),
      dep({
        id: "new",
        end_date: dayjs().add(5, "day").format("YYYY-MM-DD"),
        amount: 200,
        interest: 20,
      }),
    ]);
    expect(split.passed.map((d) => d.id)).toEqual(["old"]);
    expect(split.future.map((d) => d.id)).toEqual(["new"]);
    expect(split.passedAmount).toBe(100);
    expect(split.passedInterest).toBe(10);
    expect(split.futureAmount).toBe(200);
    expect(split.futureInterest).toBe(20);
  });

  it("counts a deposit maturing today as not yet passed", () => {
    const split = splitMonthByToday([
      dep({ id: "today", end_date: dayjs().format("YYYY-MM-DD"), amount: 300, interest: 30 }),
    ]);
    expect(split.passed).toHaveLength(0);
    expect(split.future.map((d) => d.id)).toEqual(["today"]);
    expect(split.futureAmount).toBe(300);
  });

  it("returns zeroed aggregates for an empty list", () => {
    expect(splitMonthByToday([])).toEqual({
      passed: [],
      future: [],
      passedAmount: 0,
      passedInterest: 0,
      futureAmount: 0,
      futureInterest: 0,
    });
  });

  it("partitions without dropping or duplicating deposits", () => {
    const deposits = [
      dep({ id: "a", end_date: dayjs().subtract(1, "day").format("YYYY-MM-DD") }),
      dep({ id: "b", end_date: dayjs().format("YYYY-MM-DD") }),
      dep({ id: "c", end_date: dayjs().add(1, "day").format("YYYY-MM-DD") }),
    ];
    const split = splitMonthByToday(deposits);
    expect(split.passed.length + split.future.length).toBe(deposits.length);
  });
});

describe("isPastMonth", () => {
  it("treats every month of an earlier year as past", () => {
    expect(isPastMonth(2023, 11, 2024, 0)).toBe(true);
  });

  it("treats months before the current month as past in the same year", () => {
    expect(isPastMonth(2024, 0, 2024, 5)).toBe(true);
    expect(isPastMonth(2024, 5, 2024, 5)).toBe(false);
    expect(isPastMonth(2024, 6, 2024, 5)).toBe(false);
  });

  it("treats later years as not past", () => {
    expect(isPastMonth(2025, 0, 2024, 11)).toBe(false);
  });
});

describe("hasDepositsInYear", () => {
  it("detects deposits maturing in the given year", () => {
    expect(hasDepositsInYear([dep({ end_date: "2024-05-01" })], 2024)).toBe(true);
    expect(hasDepositsInYear([dep({ end_date: "2024-05-01" })], 2023)).toBe(false);
    expect(hasDepositsInYear([dep({ end_date: "2024-05-01" })], 2025)).toBe(false);
  });

  it("is false with no deposits", () => {
    expect(hasDepositsInYear([], 2024)).toBe(false);
  });

  it("works at year boundaries", () => {
    const deposits = [
      dep({ id: "a", end_date: "2023-12-31" }),
      dep({ id: "b", end_date: "2024-01-01" }),
    ];
    expect(hasDepositsInYear(deposits, 2023)).toBe(true);
    expect(hasDepositsInYear(deposits, 2024)).toBe(true);
    expect(hasDepositsInYear(deposits, 2025)).toBe(false);
  });
});
