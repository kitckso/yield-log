import { describe, expect, it } from "vite-plus/test";
import dayjs from "dayjs";
import {
  availableMaturityYears,
  bucketLabel,
  buildMaturityCalendar,
  depositsInBucket,
  weeksInYear,
  type DayCalendar,
  type MonthCalendar,
  type WeekCalendar,
} from "./maturityCalendar";
import type { DepositWithBank } from "../types";

function deposit(overrides: Partial<DepositWithBank>): DepositWithBank {
  return {
    id: "1",
    user_id: "u",
    bank_id: "b",
    amount: 1000,
    period_value: 3,
    period_unit: "months",
    interest_rate: 3,
    interest: 25,
    start_date: "2024-01-01",
    end_date: "2024-04-01",
    created_at: "2024-01-01",
    bank_name: "HSBC",
    ...overrides,
  };
}

const day = (year: number, mode: "day" | "week" | "month") =>
  buildMaturityCalendar([], year, mode) as DayCalendar;

describe("weeksInYear", () => {
  it("needs 53 columns for an ordinary year", () => {
    expect(weeksInYear(2024)).toBe(53);
  });

  it("needs 54 columns when Jan 1 is a Saturday", () => {
    // 2028 starts on a Saturday, so the last week reaches into January.
    expect(weeksInYear(2028)).toBe(54);
  });

  it("puts Dec 31 inside the last column for every year", () => {
    for (const year of [2024, 2025, 2026, 2027, 2028, 2029, 2032, 2033]) {
      const yearStart = dayjs(`${year}-01-01`, "YYYY-MM-DD", true);
      const firstSunday = yearStart.subtract(yearStart.day(), "day");
      // Trailing columns spill into the next year and render empty, which is fine.
      // What must hold is that Dec 31 lands somewhere the grid actually draws.
      const lastCellOffset = (weeksInYear(year) - 1) * 7 + 6;
      const dec31 = dayjs(`${year}-12-31`, "YYYY-MM-DD", true).diff(firstSunday, "day");
      expect(dec31, `year ${year}`).toBeLessThanOrEqual(lastCellOffset);
      expect(dec31, `year ${year}`).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("buildMaturityCalendar — day mode", () => {
  it("lays out seven rows by the year's column count", () => {
    const cal = day(2024, "day");
    expect(cal.columnCount).toBe(53);
    expect(cal.buckets).toHaveLength(53 * 7);
  });

  it("gains a column in a year that starts on a Saturday", () => {
    const cal = day(2028, "day");
    expect(cal.columnCount).toBe(54);
    expect(cal.buckets).toHaveLength(54 * 7);
  });

  it("reaches Dec 31 in every year, including the 54-column ones", () => {
    for (const year of [2024, 2027, 2028, 2033]) {
      const cal = day(year, "day");
      const filled = cal.buckets.filter((b) => b.inYear);
      expect(filled.length, `year ${year}`).toBe(year % 4 === 0 ? 366 : 365);
      expect(filled[filled.length - 1].key, `year ${year}`).toBe(`${year}-12-31`);
    }
  });

  it("marks the padding cells outside the year as not in year, and empty", () => {
    const cal = day(2024, "day");
    const padding = cal.buckets.filter((b) => !b.inYear);
    expect(padding.length).toBeGreaterThan(0);
    expect(padding.every((b) => b.amount === 0 && b.count === 0 && b.band === 0)).toBe(true);
  });

  it("positions every cell on the grid exactly once", () => {
    const cal = day(2024, "day");
    const positions = cal.buckets.map((b) => `${b.column}/${b.row}`);
    expect(new Set(positions).size).toBe(cal.buckets.length);
    expect(cal.buckets.every((b) => b.column >= 0 && b.column < 53)).toBe(true);
    expect(cal.buckets.every((b) => b.row >= 0 && b.row < 7)).toBe(true);
  });

  it("aggregates deposits into the day they mature", () => {
    const deposits = [
      deposit({ amount: 5000, interest: 100, end_date: "2024-03-10" }),
      deposit({ id: "2", amount: 3000, interest: 60, end_date: "2024-03-20" }),
      deposit({ id: "3", amount: 9999, end_date: "2025-01-15" }), // out of range
    ];
    const cal = buildMaturityCalendar(deposits, 2024, "day") as DayCalendar;
    expect(cal.buckets.find((b) => b.key === "2024-03-10")?.amount).toBe(5000);
    expect(cal.buckets.find((b) => b.key === "2024-03-20")?.count).toBe(1);
    expect(cal.buckets.every((b) => b.key !== "2025-01-15")).toBe(true);
  });

  it("carries interest through, which the old day cell silently dropped", () => {
    const deposits = [deposit({ amount: 5000, interest: 123, end_date: "2024-03-10" })];
    const cal = buildMaturityCalendar(deposits, 2024, "day") as DayCalendar;
    expect(cal.buckets.find((b) => b.key === "2024-03-10")?.interest).toBe(123);
  });

  it("labels each month once, in calendar order", () => {
    const labels = day(2024, "day").monthLabels.map((m) => m.label);
    expect(labels).toEqual([
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

  it("points scrollToColumn at today only when today is in the year", () => {
    const currentYear = dayjs().year();
    expect(day(currentYear, "day").scrollToColumn).not.toBeNull();
    expect(day(currentYear + 5, "day").scrollToColumn).toBeNull();
  });
});

describe("buildMaturityCalendar — week mode", () => {
  it("starts weeks on Sunday and trims them at the year edges", () => {
    const cal = buildMaturityCalendar([], 2024, "week") as WeekCalendar;
    const weeks = cal.monthGroups.flatMap((g) => g.buckets);
    const first = weeks[0];
    expect(first.key).toBe("2023-12-31"); // the Sunday before Jan 1
    expect(first.periodStart).toBe("2024-01-01"); // clamped
    expect(first.periodEnd).toBe("2024-01-06");
  });

  it("groups weeks under the month their period starts in", () => {
    const cal = buildMaturityCalendar([], 2024, "week") as WeekCalendar;
    const labels = cal.monthGroups.map((g) => g.label);
    expect(labels[0]).toBe("1月");
    expect(labels).toEqual([
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

  it("keeps a whole year's weeks in range", () => {
    const cal = buildMaturityCalendar([], 2024, "week") as WeekCalendar;
    const weeks = cal.monthGroups.flatMap((g) => g.buckets);
    expect(weeks).toHaveLength(53);
    expect(weeks.every((w) => w.periodStart >= "2024-01-01" && w.periodEnd <= "2024-12-31")).toBe(
      true,
    );
  });
});

describe("buildMaturityCalendar — month mode", () => {
  it("always produces twelve buckets", () => {
    const cal = buildMaturityCalendar([], 2024, "month") as MonthCalendar;
    expect(cal.buckets).toHaveLength(12);
    expect(cal.buckets[0].key).toBe("2024-01");
    expect(cal.buckets[11].key).toBe("2024-12");
    expect(cal.buckets.every((b) => b.amount === 0 && b.band === 0)).toBe(true);
  });

  it("aggregates deposits into their maturity month", () => {
    const deposits = [
      deposit({ amount: 5000, interest: 100, end_date: "2024-03-10" }),
      deposit({ id: "2", amount: 3000, interest: 60, end_date: "2024-03-20" }),
      deposit({ id: "3", amount: 9999, end_date: "2025-01-15" }),
    ];
    const cal = buildMaturityCalendar(deposits, 2024, "month") as MonthCalendar;
    const march = cal.buckets.find((b) => b.key === "2024-03");
    expect(march?.amount).toBe(8000);
    expect(march?.count).toBe(2);
    expect(march?.interest).toBe(160);
    expect(cal.buckets.every((b) => b.key !== "2025-01")).toBe(true);
  });
});

describe("band bounds", () => {
  const spread = [
    deposit({ id: "x", amount: 100_000, end_date: "2024-03-05" }),
    deposit({ id: "y", amount: 100_000, end_date: "2024-03-20" }),
    deposit({ id: "z", amount: 300_000, end_date: "2024-06-10" }),
  ];

  it("returns null when nothing has an amount", () => {
    expect(buildMaturityCalendar([], 2024, "month").bandBounds).toBeNull();
  });

  it("leaves every bucket uncoloured when there are no bounds", () => {
    const cal = buildMaturityCalendar([], 2024, "month") as MonthCalendar;
    expect(cal.buckets.every((b) => b.band === 0)).toBe(true);
  });

  it("scales each mode separately, since buckets hold different sums", () => {
    // March collapses into one 200K month bucket, but spans two week buckets
    // alongside June, so the extra 100K values pull the week scale down.
    const month = buildMaturityCalendar(spread, 2024, "month").bandBounds!;
    const week = buildMaturityCalendar(spread, 2024, "week").bandBounds!;
    expect(month.q1).toBeGreaterThan(week.q1);
    expect(month.q2).toBeGreaterThan(week.q2);
  });

  it("spreads the bands out when most buckets repeat", () => {
    // A flat portfolio: eleven months hold the same 100K, one holds 400K. Over the
    // raw values both cut-points land on 100K, leaving band 2 empty and the legend
    // showing the same number twice.
    const deposits = [
      ...Array.from({ length: 11 }, (_, i) =>
        deposit({ id: `f${i}`, amount: 100_000, end_date: `2024-0${i + 1}-05` }),
      ),
      deposit({ id: "big", amount: 400_000, end_date: "2024-12-05" }),
    ];
    const cal = buildMaturityCalendar(deposits, 2024, "month") as MonthCalendar;
    expect(cal.bandBounds!.q2).toBeGreaterThan(cal.bandBounds!.q1);
    expect(cal.buckets.find((b) => b.key === "2024-01")!.band).toBe(1);
    expect(cal.buckets.find((b) => b.key === "2024-12")!.band).toBe(3);
  });
});

describe("band stability across years", () => {
  // A quiet year used to promote its lone deposit to the top band, because the
  // quantiles were derived from that year's buckets alone.
  const deposits = [
    deposit({ id: "a", amount: 100_000, end_date: "2024-03-01" }),
    deposit({ id: "b", amount: 400_000, end_date: "2025-03-01" }),
    deposit({ id: "c", amount: 100_000, end_date: "2026-03-01" }),
  ];
  const bandIn = (year: number) =>
    (buildMaturityCalendar(deposits, year, "month") as MonthCalendar).buckets.find(
      (b) => b.key === `${year}-03`,
    )?.band;

  it("does not let a quiet year promote its deposit to the top band", () => {
    expect(bandIn(2025)).toBe(3);
  });

  it("gives the same amount the same band in every year", () => {
    expect(bandIn(2024)).toBe(1);
    expect(bandIn(2026)).toBe(1);
  });
});

describe("summary", () => {
  const deposits = [
    deposit({ id: "a", amount: 100_000, end_date: "2024-03-01" }),
    deposit({ id: "b", amount: 300_000, end_date: "2024-03-20" }),
    deposit({ id: "c", amount: 50_000, end_date: "2024-06-10" }),
    deposit({ id: "d", amount: 999_000, end_date: "2025-01-01" }),
  ];

  it("totals, peaks and counts only the year on screen", () => {
    const { summary } = buildMaturityCalendar(deposits, 2024, "month");
    expect(summary.totalAmount).toBe(450_000);
    expect(summary.activePeriods).toBe(2);
  });

  it("counts periods at the granularity of the mode", () => {
    // March is one month bucket but two separate days.
    expect(buildMaturityCalendar(deposits, 2024, "day").summary.activePeriods).toBe(3);
    expect(buildMaturityCalendar(deposits, 2024, "month").summary.activePeriods).toBe(2);
  });

  it("reports a zero peak rather than -Infinity for an empty year", () => {
    expect(buildMaturityCalendar(deposits, 1999, "month").summary).toEqual({
      totalAmount: 0,
      peakAmount: 0,
      activePeriods: 0,
    });
  });

  it("reports whether the year holds anything at all", () => {
    expect(buildMaturityCalendar(deposits, 2024, "month").hasDeposits).toBe(true);
    expect(buildMaturityCalendar(deposits, 1999, "month").hasDeposits).toBe(false);
  });
});

describe("depositsInBucket", () => {
  const deposits = [
    deposit({ id: "a", end_date: "2024-03-11" }),
    deposit({ id: "b", end_date: "2024-03-15" }),
    deposit({ id: "c", end_date: "2024-03-20" }),
    deposit({ id: "d", end_date: "2023-12-28" }),
    deposit({ id: "e", end_date: "2025-01-02" }),
  ];

  it("returns only the deposits inside the selected week, sorted", () => {
    expect(depositsInBucket(deposits, 2024, "week", "2024-03-10").map((d) => d.id)).toEqual([
      "a",
      "b",
    ]);
    expect(depositsInBucket(deposits, 2024, "week", "2024-03-10").map((d) => d.end_date)).toEqual([
      "2024-03-11",
      "2024-03-15",
    ]);
  });

  it("excludes neighbouring years at the clamped boundaries", () => {
    // The first and last weeks of the year are trimmed, so 2023/2025 rows drop out
    expect(depositsInBucket(deposits, 2024, "week", "2023-12-31").map((d) => d.id)).not.toContain(
      "d",
    );
    expect(depositsInBucket(deposits, 2024, "week", "2024-12-30").map((d) => d.id)).not.toContain(
      "e",
    );
  });

  it("matches a single day in day mode", () => {
    expect(depositsInBucket(deposits, 2024, "day", "2024-03-11").map((d) => d.id)).toEqual(["a"]);
  });

  it("matches the whole month in month mode", () => {
    expect(depositsInBucket(deposits, 2024, "month", "2024-03-01").map((d) => d.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(depositsInBucket(deposits, 2024, "month", "2024-06-01")).toEqual([]);
  });

  it("returns an empty list when nothing falls in the period", () => {
    expect(depositsInBucket(deposits, 2024, "week", "2024-07-07")).toEqual([]);
  });
});

describe("bucketLabel", () => {
  it("words a day bucket with its full date", () => {
    expect(bucketLabel(2024, "day", "2024-03-11")).toBe("2024年3月11日 到期記錄");
  });

  it("words a week bucket as a range, trimmed at the year edges", () => {
    expect(bucketLabel(2024, "week", "2024-03-10")).toBe("3月10日 - 3月16日 到期記錄");
    expect(bucketLabel(2024, "week", "2023-12-31")).toBe("1月1日 - 1月6日 到期記錄");
  });

  it("words a month bucket with year and month", () => {
    expect(bucketLabel(2024, "month", "2024-03-01")).toBe("2024年3月 到期記錄");
  });
});

describe("availableMaturityYears", () => {
  it("collects the years present in the deposits", () => {
    const deposits = [
      deposit({ end_date: "2024-03-01" }),
      deposit({ id: "2", end_date: "2022-05-01" }),
      deposit({ id: "3", end_date: "2024-09-01" }),
    ];
    expect(availableMaturityYears(deposits, 2026)).toEqual([2022, 2024, 2026]);
  });

  it("always includes the current year, without duplicating it", () => {
    expect(availableMaturityYears([], 2030)).toEqual([2030]);
    expect(availableMaturityYears([deposit({ end_date: "2026-01-01" })], 2026)).toEqual([2026]);
  });
});
