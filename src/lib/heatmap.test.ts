import { describe, expect, it } from "vite-plus/test";
import dayjs from "dayjs";
import {
  availableYears,
  bucketKey,
  computeHeatmap,
  computeLevels,
  depositsInPeriod,
  weekWindowClamped,
} from "./heatmap";
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

describe("bucketKey", () => {
  const d = dayjs("2024-03-13", "YYYY-MM-DD", true); // Wednesday

  it("day mode returns the date", () => {
    expect(bucketKey(d, "day")).toBe("2024-03-13");
  });

  it("week mode returns the Sunday of the week", () => {
    expect(bucketKey(d, "week")).toBe("2024-03-10");
  });

  it("month mode returns YYYY-MM", () => {
    expect(bucketKey(d, "month")).toBe("2024-03");
  });
});

describe("computeLevels", () => {
  it("returns all zeros for empty values", () => {
    expect(computeLevels([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it("keeps zero values at level 0", () => {
    const levels = computeLevels([0, 100, 200, 300, 400]);
    expect(levels[0]).toBe(0);
    expect(levels.slice(1).every((l) => l >= 1)).toBe(true);
  });

  it("assigns higher levels to larger values", () => {
    const levels = computeLevels([10, 50, 100, 1000]);
    expect(levels[0]).toBe(1);
    expect(levels[levels.length - 1]).toBe(4);
  });
});

describe("computeHeatmap", () => {
  it("produces 12 cells in month mode", () => {
    const cells = computeHeatmap([], 2024, "month");
    expect(cells).toHaveLength(12);
    expect(cells[0].key).toBe("2024-01");
    expect(cells[11].key).toBe("2024-12");
    expect(cells.every((c) => c.amount === 0 && c.level === 0)).toBe(true);
  });

  it("covers all days of the year in day mode", () => {
    const cells = computeHeatmap([], 2024, "day");
    expect(cells).toHaveLength(366); // 2024 is a leap year
    expect(cells[0].key).toBe("2024-01-01");
    expect(cells[cells.length - 1].key).toBe("2024-12-31");
  });

  it("aggregates deposits into their end-date bucket", () => {
    const deposits = [
      deposit({ amount: 5000, interest: 100, end_date: "2024-03-10" }),
      deposit({ id: "2", amount: 3000, interest: 60, end_date: "2024-03-20" }),
      deposit({ id: "3", amount: 9999, end_date: "2025-01-15" }), // out of range
    ];
    const cells = computeHeatmap(deposits, 2024, "month");
    const march = cells.find((c) => c.key === "2024-03");
    expect(march?.amount).toBe(8000);
    expect(march?.count).toBe(2);
    expect(march?.interest).toBe(160);
    expect(cells.every((c) => c.key !== "2025-01")).toBe(true);
  });

  it("buckets by week in week mode", () => {
    const deposits = [deposit({ end_date: "2024-03-13" })]; // Wednesday
    const cells = computeHeatmap(deposits, 2024, "week");
    const week = cells.find((c) => c.key === "2024-03-10");
    expect(week?.count).toBe(1);
    expect(week?.periodStart).toBe("2024-03-10");
    expect(week?.periodEnd).toBe("2024-03-16");
  });

  it("marks future cells", () => {
    const future = computeHeatmap([], dayjs().year() + 1, "month");
    expect(future.every((c) => c.isFuture)).toBe(true);
  });
});

describe("weekWindowClamped", () => {
  const yearStart = dayjs("2024-01-01", "YYYY-MM-DD", true);
  const yearEnd = dayjs("2024-12-31", "YYYY-MM-DD", true);
  const win = (date: string) =>
    weekWindowClamped(dayjs(date, "YYYY-MM-DD", true), yearStart, yearEnd);

  it("returns the Sunday-to-Saturday window for a mid-year date", () => {
    // 2024-03-13 is a Wednesday
    const { start, end } = win("2024-03-13");
    expect(start.format("YYYY-MM-DD")).toBe("2024-03-10");
    expect(end.format("YYYY-MM-DD")).toBe("2024-03-16");
  });

  it("treats Sunday itself as the window start", () => {
    const { start, end } = win("2024-03-10");
    expect(start.format("YYYY-MM-DD")).toBe("2024-03-10");
    expect(end.format("YYYY-MM-DD")).toBe("2024-03-16");
  });

  it("clamps a window starting before Jan 1", () => {
    const { start } = win("2024-01-03");
    expect(start.format("YYYY-MM-DD")).toBe("2024-01-01");
  });

  it("clamps a window ending after Dec 31", () => {
    const { end } = win("2024-12-30");
    expect(end.format("YYYY-MM-DD")).toBe("2024-12-31");
  });

  it("clamps both ends when a year is only a few days long", () => {
    const shortStart = dayjs("2024-01-01", "YYYY-MM-DD", true);
    const shortEnd = dayjs("2024-01-03", "YYYY-MM-DD", true);
    const { start, end } = weekWindowClamped(
      dayjs("2024-01-02", "YYYY-MM-DD", true),
      shortStart,
      shortEnd,
    );
    expect(start.format("YYYY-MM-DD")).toBe("2024-01-01");
    expect(end.format("YYYY-MM-DD")).toBe("2024-01-03");
  });
});

describe("depositsInPeriod", () => {
  const yearStart = dayjs("2024-01-01", "YYYY-MM-DD", true);
  const yearEnd = dayjs("2024-12-31", "YYYY-MM-DD", true);
  const deposits = [
    deposit({ id: "a", end_date: "2024-03-11" }),
    deposit({ id: "b", end_date: "2024-03-15" }),
    deposit({ id: "c", end_date: "2024-03-20" }),
    deposit({ id: "d", end_date: "2023-12-28" }),
    deposit({ id: "e", end_date: "2025-01-02" }),
  ];
  const sel = (date: string) =>
    depositsInPeriod(deposits, dayjs(date, "YYYY-MM-DD", true), "week", yearStart, yearEnd);

  it("returns only the deposits inside the selected week", () => {
    expect(sel("2024-03-13").map((d) => d.id)).toEqual(["a", "b"]);
  });

  it("sorts the result by end date", () => {
    expect(sel("2024-03-13").map((d) => d.end_date)).toEqual(["2024-03-11", "2024-03-15"]);
  });

  it("excludes deposits from the neighbouring years at the boundaries", () => {
    // The first and last weeks of the year are clamped, so 2023/2025 rows drop out
    const firstWeek = depositsInPeriod(
      deposits,
      dayjs("2024-01-03", "YYYY-MM-DD", true),
      "week",
      yearStart,
      yearEnd,
    );
    expect(firstWeek.map((d) => d.id)).not.toContain("d");
    const lastWeek = depositsInPeriod(
      deposits,
      dayjs("2024-12-30", "YYYY-MM-DD", true),
      "week",
      yearStart,
      yearEnd,
    );
    expect(lastWeek.map((d) => d.id)).not.toContain("e");
  });

  it("matches a single day in day mode", () => {
    const day = depositsInPeriod(
      deposits,
      dayjs("2024-03-11", "YYYY-MM-DD", true),
      "day",
      yearStart,
      yearEnd,
    );
    expect(day.map((d) => d.id)).toEqual(["a"]);
  });

  it("matches the whole month in month mode", () => {
    const month = depositsInPeriod(
      deposits,
      dayjs("2024-03-01", "YYYY-MM-DD", true),
      "month",
      yearStart,
      yearEnd,
    );
    expect(month.map((d) => d.id)).toEqual(["a", "b", "c"]);
  });

  it("ignores deposits in other months", () => {
    const month = depositsInPeriod(
      deposits,
      dayjs("2024-06-01", "YYYY-MM-DD", true),
      "month",
      yearStart,
      yearEnd,
    );
    expect(month).toEqual([]);
  });

  it("returns an empty list when nothing falls in the period", () => {
    expect(sel("2024-07-03")).toEqual([]);
  });
});

describe("availableYears", () => {
  it("collects the years present in the deposits", () => {
    const deposits = [
      deposit({ end_date: "2024-03-01" }),
      deposit({ id: "2", end_date: "2022-05-01" }),
      deposit({ id: "3", end_date: "2024-09-01" }),
    ];
    expect(availableYears(deposits, 2026)).toEqual([2022, 2024, 2026]);
  });

  it("always includes the current year", () => {
    expect(availableYears([], 2030)).toEqual([2030]);
  });

  it("does not duplicate the current year", () => {
    expect(availableYears([deposit({ end_date: "2026-01-01" })], 2026)).toEqual([2026]);
  });

  it("returns the current year alone for no deposits", () => {
    expect(availableYears([], 2026)).toEqual([2026]);
  });
});
