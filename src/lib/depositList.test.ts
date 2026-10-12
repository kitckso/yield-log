import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import dayjs from "dayjs";
import {
  DEFAULT_SORT,
  SORT_OPTIONS,
  buildListUrlParams,
  compareDeposits,
  filterAndSortDeposits,
  groupByMonthField,
  isDateSort,
  parseListUrlState,
  sortFieldFor,
} from "./depositList";
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
    end_date: dayjs().add(6, "month").format("YYYY-MM-DD"),
    created_at: "2024-01-01",
    bank_name: "HSBC",
    ...over,
  };
}

const matured = (over: Partial<DepositWithBank> = {}) =>
  dep({ end_date: dayjs().subtract(1, "day").format("YYYY-MM-DD"), ...over });

const active = (over: Partial<DepositWithBank> = {}) =>
  dep({ end_date: dayjs().add(6, "month").format("YYYY-MM-DD"), ...over });

describe("isDateSort", () => {
  it("is true for the four date sorts", () => {
    expect(isDateSort("end_asc")).toBe(true);
    expect(isDateSort("end_desc")).toBe(true);
    expect(isDateSort("start_asc")).toBe(true);
    expect(isDateSort("start_desc")).toBe(true);
  });

  it("is false for numeric sorts and unknown values", () => {
    expect(isDateSort("amount_asc")).toBe(false);
    expect(isDateSort("rate_desc")).toBe(false);
    expect(isDateSort("nonsense")).toBe(false);
  });
});

describe("sortFieldFor", () => {
  it("picks the start date for start sorts", () => {
    expect(sortFieldFor("start_asc")).toBe("start_date");
    expect(sortFieldFor("start_desc")).toBe("start_date");
  });

  it("picks the end date otherwise", () => {
    expect(sortFieldFor("end_asc")).toBe("end_date");
    expect(sortFieldFor("amount_asc")).toBe("end_date");
  });
});

describe("compareDeposits", () => {
  const a = dep({
    id: "a",
    start_date: "2024-01-01",
    end_date: "2024-06-01",
    amount: 300,
    interest_rate: 5,
  });
  const b = dep({
    id: "b",
    start_date: "2024-03-01",
    end_date: "2024-04-01",
    amount: 100,
    interest_rate: 1,
  });

  it("sorts by end date ascending", () => {
    expect([a, b].sort((x, y) => compareDeposits(x, y, "end_asc")).map((d) => d.id)).toEqual([
      "b",
      "a",
    ]);
  });

  it("sorts by end date descending", () => {
    expect([b, a].sort((x, y) => compareDeposits(x, y, "end_desc")).map((d) => d.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("sorts by start date both ways", () => {
    expect([b, a].sort((x, y) => compareDeposits(x, y, "start_asc")).map((d) => d.id)).toEqual([
      "a",
      "b",
    ]);
    expect([a, b].sort((x, y) => compareDeposits(x, y, "start_desc")).map((d) => d.id)).toEqual([
      "b",
      "a",
    ]);
  });

  it("sorts by amount both ways", () => {
    expect([a, b].sort((x, y) => compareDeposits(x, y, "amount_asc")).map((d) => d.id)).toEqual([
      "b",
      "a",
    ]);
    expect([b, a].sort((x, y) => compareDeposits(x, y, "amount_desc")).map((d) => d.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("sorts by rate both ways", () => {
    expect([a, b].sort((x, y) => compareDeposits(x, y, "rate_asc")).map((d) => d.id)).toEqual([
      "b",
      "a",
    ]);
    expect([b, a].sort((x, y) => compareDeposits(x, y, "rate_desc")).map((d) => d.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("falls back to the default end-date sort for unknown values", () => {
    expect([a, b].sort((x, y) => compareDeposits(x, y, "garbage")).map((d) => d.id)).toEqual([
      "b",
      "a",
    ]);
  });

  it("treats start_desc as the exact reverse of start_asc", () => {
    const items = [
      dep({ id: "1", start_date: "2024-05-01" }),
      dep({ id: "2", start_date: "2024-01-01" }),
    ];
    const asc = [...items].sort((x, y) => compareDeposits(x, y, "start_asc")).map((d) => d.id);
    const desc = [...items].sort((x, y) => compareDeposits(x, y, "start_desc")).map((d) => d.id);
    expect(desc).toEqual([...asc].reverse());
  });
});

describe("filterAndSortDeposits", () => {
  const deposits = [
    active({ id: "a1", bank_id: "b1", end_date: "2030-03-01" }),
    active({ id: "a2", bank_id: "b2", end_date: "2030-01-01" }),
    matured({ id: "m1", bank_id: "b1", end_date: "2024-03-01" }),
    matured({ id: "m2", bank_id: "b2", end_date: "2024-01-01" }),
  ];

  it("keeps only active deposits by default", () => {
    const result = filterAndSortDeposits(deposits, {
      statusFilter: "active",
      bankFilter: null,
      sortBy: "end_asc",
    });
    expect(result.map((d) => d.id)).toEqual(["a2", "a1"]);
  });

  it("keeps only matured deposits when asked", () => {
    const result = filterAndSortDeposits(deposits, {
      statusFilter: "matured",
      bankFilter: null,
      sortBy: "end_asc",
    });
    expect(result.map((d) => d.id)).toEqual(["m2", "m1"]);
  });

  it("keeps everything for an unrecognised status", () => {
    const result = filterAndSortDeposits(deposits, {
      statusFilter: "all",
      bankFilter: null,
      sortBy: "end_asc",
    });
    expect(result).toHaveLength(4);
  });

  it("filters by bank", () => {
    const result = filterAndSortDeposits(deposits, {
      statusFilter: "all",
      bankFilter: "b2",
      sortBy: "end_asc",
    });
    expect(result.map((d) => d.id)).toEqual(["m2", "a2"]);
  });

  it("combines status and bank filters", () => {
    const result = filterAndSortDeposits(deposits, {
      statusFilter: "matured",
      bankFilter: "b1",
      sortBy: "end_asc",
    });
    expect(result.map((d) => d.id)).toEqual(["m1"]);
  });

  it("returns an empty list when nothing matches", () => {
    const result = filterAndSortDeposits(deposits, {
      statusFilter: "active",
      bankFilter: "nope",
      sortBy: "end_asc",
    });
    expect(result).toEqual([]);
  });

  it("does not mutate the source array", () => {
    const source = [...deposits];
    filterAndSortDeposits(source, { statusFilter: "all", bankFilter: null, sortBy: "amount_desc" });
    expect(source.map((d) => d.id)).toEqual(["a1", "a2", "m1", "m2"]);
  });
});

describe("parseListUrlState", () => {
  it("falls back to defaults when the query string is empty", () => {
    const state = parseListUrlState(new URLSearchParams(), 2026);
    expect(state).toEqual({
      statusFilter: "active",
      bankFilter: null,
      sortBy: DEFAULT_SORT,
      viewMode: "list",
      calendarYear: 2026,
    });
  });

  it("reads every parameter", () => {
    const params = new URLSearchParams(
      "status=matured&bankId=b2&sort=amount_desc&view=calendar&year=2024",
    );
    expect(parseListUrlState(params, 2026)).toEqual({
      statusFilter: "matured",
      bankFilter: "b2",
      sortBy: "amount_desc",
      viewMode: "calendar",
      calendarYear: 2024,
    });
  });

  it("ignores a non-numeric year", () => {
    expect(parseListUrlState(new URLSearchParams("year=abc"), 2026).calendarYear).toBe(2026);
  });
});

describe("buildListUrlParams", () => {
  const base = {
    statusFilter: "active",
    bankFilter: null,
    sortBy: "end_asc",
    viewMode: "list",
    calendarYear: 2026,
  };

  it("emits nothing for an all-default state", () => {
    expect(buildListUrlParams(base, 2026).toString()).toBe("");
  });

  it("emits only the fields that differ from the defaults", () => {
    const params = buildListUrlParams({ ...base, statusFilter: "matured" }, 2026);
    expect(params.toString()).toBe("status=matured");
  });

  it("includes the bank filter", () => {
    const params = buildListUrlParams({ ...base, bankFilter: "b3" }, 2026);
    expect(params.get("bankId")).toBe("b3");
  });

  it("omits the year outside calendar view", () => {
    const params = buildListUrlParams({ ...base, calendarYear: 2024 }, 2026);
    expect(params.get("year")).toBeNull();
  });

  it("includes a non-current year in calendar view", () => {
    const params = buildListUrlParams({ ...base, viewMode: "calendar", calendarYear: 2024 }, 2026);
    expect(params.get("year")).toBe("2024");
  });

  it("omits the current year even in calendar view", () => {
    const params = buildListUrlParams({ ...base, viewMode: "calendar", calendarYear: 2026 }, 2026);
    expect(params.get("year")).toBeNull();
  });

  it("round-trips a non-default state", () => {
    const state = {
      statusFilter: "matured",
      bankFilter: "b2",
      sortBy: "rate_asc",
      viewMode: "calendar",
      calendarYear: 2024,
    };
    expect(parseListUrlState(buildListUrlParams(state, 2026), 2026)).toEqual(state);
  });
});

describe("groupByMonthField", () => {
  it("groups by end month with subtotals", () => {
    const groups = groupByMonthField(
      [
        dep({ id: "a", end_date: "2024-03-05", amount: 100 }),
        dep({ id: "b", end_date: "2024-03-20", amount: 250 }),
        dep({ id: "c", end_date: "2024-04-01", amount: 50 }),
      ],
      "end_date",
    );
    expect(groups.map((g) => g.key)).toEqual(["2024年3月", "2024年4月"]);
    expect(groups[0].deposits.map((d) => d.id)).toEqual(["a", "b"]);
    expect(groups[0].totalAmount).toBe(350);
    expect(groups[1].totalAmount).toBe(50);
  });

  it("groups by start month when asked", () => {
    const groups = groupByMonthField(
      [dep({ id: "a", start_date: "2023-11-01", end_date: "2024-03-05" })],
      "start_date",
    );
    expect(groups[0].key).toBe("2023年11月");
  });

  it("does not pad the month number", () => {
    const groups = groupByMonthField([dep({ end_date: "2024-01-15" })], "end_date");
    expect(groups[0].key).toBe("2024年1月");
  });

  it("keeps the incoming order inside a group", () => {
    const groups = groupByMonthField(
      [dep({ id: "a", end_date: "2024-03-20" }), dep({ id: "b", end_date: "2024-03-01" })],
      "end_date",
    );
    expect(groups[0].deposits.map((d) => d.id)).toEqual(["a", "b"]);
  });

  it("returns nothing for no deposits", () => {
    expect(groupByMonthField([], "end_date")).toEqual([]);
  });
});

describe("SORT_OPTIONS", () => {
  it("offers all eight sorts with end_asc first", () => {
    expect(SORT_OPTIONS).toHaveLength(8);
    expect(SORT_OPTIONS[0].value).toBe("end_asc");
    expect(new Set(SORT_OPTIONS.map((o) => o.value)).size).toBe(8);
  });
});

describe("date handling is stable regardless of when the suite runs", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 15));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps a deposit maturing today out of the active list", () => {
    const today = dep({ id: "t", end_date: dayjs().format("YYYY-MM-DD") });
    const result = filterAndSortDeposits([today, active({ id: "f" })], {
      statusFilter: "active",
      bankFilter: null,
      sortBy: "end_asc",
    });
    expect(result.map((d) => d.id)).toEqual(["f"]);
  });

  it("counts a deposit maturing today as matured", () => {
    const today = dep({ id: "t", end_date: dayjs().format("YYYY-MM-DD") });
    const tomorrow = dep({ id: "n", end_date: dayjs().add(1, "day").format("YYYY-MM-DD") });
    const result = filterAndSortDeposits([today, tomorrow], {
      statusFilter: "matured",
      bankFilter: null,
      sortBy: "end_asc",
    });
    expect(result.map((d) => d.id)).toEqual(["t"]);
  });
});
