import { describe, expect, it } from "vite-plus/test";
import dayjs from "dayjs";
import {
  INITIAL_SHOW,
  classifyMaturity,
  groupByMonth,
  shouldRenderTimeline,
  truncateForDisplay,
} from "./maturityTimeline";
import type { DepositWithBank } from "../types";

const TODAY = dayjs("2026-07-15", "YYYY-MM-DD", true);
const fmt = (d: dayjs.Dayjs) => d.format("YYYY-MM-DD");

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
    start_date: "2026-01-01",
    end_date: fmt(TODAY),
    created_at: "2026-01-01",
    bank_name: "HSBC",
    ...over,
  };
}

describe("classifyMaturity", () => {
  it("treats today as already matured, but still labelled today", () => {
    const result = classifyMaturity(fmt(TODAY), TODAY);
    expect(result.daysDiff).toBe(0);
    expect(result.isToday).toBe(true);
    expect(result.matured).toBe(true);
    expect(result.label).toBe("今日到期");
    expect(result.dimmed).toBe(false);
  });

  it("labels yesterday explicitly", () => {
    const result = classifyMaturity(fmt(TODAY.subtract(1, "day")), TODAY);
    expect(result.isYesterday).toBe(true);
    expect(result.matured).toBe(true);
    expect(result.dimmed).toBe(true);
    expect(result.label).toBe("昨日到期");
  });

  it("labels tomorrow explicitly", () => {
    const result = classifyMaturity(fmt(TODAY.add(1, "day")), TODAY);
    expect(result.isTomorrow).toBe(true);
    expect(result.matured).toBe(false);
    expect(result.label).toBe("明天到期");
  });

  it("uses the relative wording for earlier dates", () => {
    const result = classifyMaturity(fmt(TODAY.subtract(10, "day")), TODAY);
    expect(result.label).toBe("10天前到期");
  });

  it("uses the relative wording for later dates", () => {
    expect(classifyMaturity(fmt(TODAY.add(10, "day")), TODAY).label).toBe("10天後到期");
  });

  it("spells out years and months in the relative wording", () => {
    expect(classifyMaturity(fmt(TODAY.subtract(400, "day")), TODAY).label).toBe("1年1月10天前到期");
  });

  it("never dims today's item, even though today is the boundary", () => {
    expect(classifyMaturity(fmt(TODAY), TODAY).dimmed).toBe(false);
  });

  it("dims every matured item other than today", () => {
    expect(classifyMaturity(fmt(TODAY.subtract(3, "day")), TODAY).dimmed).toBe(true);
    expect(classifyMaturity(fmt(TODAY.subtract(30, "day")), TODAY).dimmed).toBe(true);
  });

  it("does not dim future items", () => {
    expect(classifyMaturity(fmt(TODAY.add(3, "day")), TODAY).dimmed).toBe(false);
  });

  it("ignores the time of day when diffing", () => {
    const lateToday = classifyMaturity(`${fmt(TODAY)}T23:59:00`, TODAY);
    expect(lateToday.isToday).toBe(true);
  });
});

describe("groupByMonth", () => {
  it("groups by YYYY年M月 preserving arrival order", () => {
    const groups = groupByMonth([
      dep({ id: "a", end_date: "2026-07-03" }),
      dep({ id: "b", end_date: "2026-07-20" }),
      dep({ id: "c", end_date: "2026-08-01" }),
    ]);
    expect(groups.map(([key]) => key)).toEqual(["2026年7月", "2026年8月"]);
    expect(groups[0][1].map((d) => d.id)).toEqual(["a", "b"]);
  });

  it("does not pad the month number", () => {
    const groups = groupByMonth([dep({ end_date: "2026-01-05" })]);
    expect(groups[0][0]).toBe("2026年1月");
  });

  it("returns nothing for no items", () => {
    expect(groupByMonth([])).toEqual([]);
  });
});

describe("truncateForDisplay", () => {
  const recent = Array.from({ length: 7 }, (_, i) => dep({ id: `r${i}` }));
  const upcoming = Array.from({ length: 3 }, (_, i) => dep({ id: `u${i}` }));

  it("shows five of each by default", () => {
    const result = truncateForDisplay(recent, upcoming, false);
    expect(result.recent).toHaveLength(INITIAL_SHOW);
    expect(result.upcoming).toHaveLength(3);
  });

  it("signals more items when either side overflows", () => {
    expect(truncateForDisplay(recent, upcoming, false).hasMore).toBe(true);
  });

  it("shows everything when expanded", () => {
    const result = truncateForDisplay(recent, upcoming, true);
    expect(result.recent).toHaveLength(7);
    expect(result.upcoming).toHaveLength(3);
  });

  it("does not signal more when both sides fit", () => {
    expect(truncateForDisplay(upcoming, upcoming, false).hasMore).toBe(false);
  });

  it("keeps the first items, not the last", () => {
    const result = truncateForDisplay(recent, [], false);
    expect(result.recent[0].id).toBe("r0");
  });
});

describe("shouldRenderTimeline", () => {
  it("is false only when both lists are empty", () => {
    expect(shouldRenderTimeline([], [])).toBe(false);
    expect(shouldRenderTimeline([dep()], [])).toBe(true);
    expect(shouldRenderTimeline([], [dep()])).toBe(true);
  });
});
