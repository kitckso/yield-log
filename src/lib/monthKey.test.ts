import { describe, expect, it } from "vite-plus/test";
import dayjs from "dayjs";
import {
  emptyMonth,
  groupByMonth,
  monthKey,
  monthKeyOf,
  monthLabel,
  monthLabelShort,
  monthOf,
  yearMonthKeys,
  yearOf,
} from "./monthKey";
import type { DepositWithBank } from "../types";

function dep(over: Partial<DepositWithBank> = {}): DepositWithBank {
  return {
    id: "d1",
    user_id: "u",
    bank_id: "b1",
    amount: 10000,
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

describe("monthKey", () => {
  it("reads the month off a date as stored", () => {
    expect(monthKey("2026-07-15")).toBe("2026-07");
    expect(monthKey("2026-12-31")).toBe("2026-12");
  });

  it("pads single-digit months so keys stay sortable", () => {
    expect(monthKey("2026-01-05")).toBe("2026-01");
    expect(monthKey("2026-09-05")).toBe("2026-09");
  });

  it("reads the same month off a dayjs", () => {
    expect(monthKeyOf(dayjs("2026-07-15"))).toBe("2026-07");
  });

  it("agrees with itself across a year boundary", () => {
    expect(monthKey("2026-01-01") < monthKey("2026-02-01")).toBe(true);
    expect(monthKey("2026-12-01") < monthKey("2027-01-01")).toBe(true);
  });
});

describe("month labels", () => {
  it("names a month with its year, for lists that span years", () => {
    expect(monthLabel("2026-07")).toBe("2026年7月");
    expect(monthLabel("2024-04")).toBe("2024年4月");
  });

  it("drops the year, for views already inside one year", () => {
    expect(monthLabelShort("2026-07")).toBe("7月");
    expect(monthLabelShort("2026-01")).toBe("1月");
    expect(monthLabelShort("2026-12")).toBe("12月");
  });

  it("does not pad the month number in either label", () => {
    expect(monthLabel("2026-01")).not.toContain("01");
    expect(monthLabelShort("2026-01")).toBe("1月");
  });
});

describe("yearOf and monthOf", () => {
  it("splits a key back into its parts", () => {
    expect(yearOf("2026-07")).toBe(2026);
    expect(monthOf("2026-07")).toBe(6);
  });

  it("counts months from zero, like dayjs", () => {
    expect(monthOf("2026-01")).toBe(0);
    expect(monthOf("2026-12")).toBe(11);
  });

  it("round-trips every month of a year", () => {
    yearMonthKeys(2026).forEach((key, index) => {
      expect(monthOf(key)).toBe(index);
      expect(yearOf(key)).toBe(2026);
      expect(monthLabelShort(key)).toBe(`${index + 1}月`);
    });
  });
});

describe("yearMonthKeys", () => {
  it("gives all twelve months of a year, in order", () => {
    expect(yearMonthKeys(2024)).toEqual([
      "2024-01",
      "2024-02",
      "2024-03",
      "2024-04",
      "2024-05",
      "2024-06",
      "2024-07",
      "2024-08",
      "2024-09",
      "2024-10",
      "2024-11",
      "2024-12",
    ]);
  });

  it("does not drift when the year started on a 31-day month", () => {
    // Building each month off January 1 keeps the day-of-month out of it, so a
    // February can never be pushed into March.
    expect(monthOf(yearMonthKeys(2024)[1])).toBe(1);
    expect(monthOf(yearMonthKeys(2028)[1])).toBe(1);
    expect(monthOf(yearMonthKeys(2026)[1])).toBe(1);
  });
});

describe("emptyMonth", () => {
  it("is a zeroed group under the given key", () => {
    expect(emptyMonth("2026-07")).toEqual({
      key: "2026-07",
      deposits: [],
      totalAmount: 0,
      totalInterest: 0,
    });
  });
});

describe("groupByMonth", () => {
  it("groups by maturity month with subtotals", () => {
    const groups = groupByMonth(
      [
        dep({ id: "a", end_date: "2024-03-05", amount: 100, interest: 10 }),
        dep({ id: "b", end_date: "2024-03-20", amount: 250, interest: 25 }),
        dep({ id: "c", end_date: "2024-04-01", amount: 50, interest: 5 }),
      ],
      "end_date",
    );
    expect(groups.map((g) => g.key)).toEqual(["2024-03", "2024-04"]);
    expect(groups[0].deposits.map((d) => d.id)).toEqual(["a", "b"]);
    expect(groups[0].totalAmount).toBe(350);
    expect(groups[0].totalInterest).toBe(35);
    expect(groups[1].totalAmount).toBe(50);
  });

  it("groups by start month when asked", () => {
    const groups = groupByMonth(
      [dep({ id: "a", start_date: "2023-11-01", end_date: "2024-03-05" })],
      "start_date",
    );
    expect(groups[0].key).toBe("2023-11");
  });

  it("keeps the incoming order inside a group", () => {
    const groups = groupByMonth(
      [dep({ id: "a", end_date: "2024-03-20" }), dep({ id: "b", end_date: "2024-03-01" })],
      "end_date",
    );
    expect(groups[0].deposits.map((d) => d.id)).toEqual(["a", "b"]);
  });

  it("leaves months with nothing in them out", () => {
    const groups = groupByMonth(
      [dep({ end_date: "2024-01-05" }), dep({ end_date: "2024-03-05" })],
      "end_date",
    );
    expect(groups.map((g) => g.key)).toEqual(["2024-01", "2024-03"]);
  });

  it("returns groups in the order the months were first seen", () => {
    const groups = groupByMonth(
      [dep({ end_date: "2024-05-01" }), dep({ end_date: "2024-02-01" })],
      "end_date",
    );
    expect(groups.map((g) => g.key)).toEqual(["2024-05", "2024-02"]);
  });

  it("returns nothing for no deposits", () => {
    expect(groupByMonth([], "end_date")).toEqual([]);
  });
});
