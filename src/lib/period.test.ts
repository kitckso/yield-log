import { describe, expect, it } from "vite-plus/test";
import dayjs from "dayjs";
import {
  addPeriod,
  formatPeriodLabel,
  PERIOD_UNITS,
  PERIOD_UNIT_OPTIONS,
  periodInDays,
  periodInMonths,
  periodUnit,
} from "./period";

describe("PERIOD_UNITS", () => {
  it("offers one label per unit, matching the dropdown", () => {
    expect(PERIOD_UNIT_OPTIONS).toEqual([
      { value: "days", label: "日" },
      { value: "weeks", label: "週" },
      { value: "months", label: "個月" },
      { value: "years", label: "年" },
    ]);
  });

  it("gives every unit a label and a month equivalent", () => {
    PERIOD_UNITS.forEach((unit) => {
      expect(unit.label, unit.value).not.toBe("");
      expect(unit.monthsEquivalent, unit.value).toBeGreaterThan(0);
    });
  });
});

describe("formatPeriodLabel", () => {
  it("words each unit", () => {
    expect(formatPeriodLabel(3, "days")).toBe("3日");
    expect(formatPeriodLabel(2, "weeks")).toBe("2週");
    expect(formatPeriodLabel(6, "months")).toBe("6個月");
    expect(formatPeriodLabel(1, "years")).toBe("1年");
  });

  it("shows an unrecognised unit as it came in", () => {
    expect(formatPeriodLabel(4, "decades")).toBe("4decades");
  });

  it("uses the same wording the dropdown offers", () => {
    PERIOD_UNIT_OPTIONS.forEach(({ value, label }) => {
      expect(formatPeriodLabel(1, value), value).toBe(`1${label}`);
    });
  });
});

describe("periodUnit", () => {
  it("finds a known unit", () => {
    expect(periodUnit("weeks")?.label).toBe("週");
  });

  it("returns nothing for an unknown unit", () => {
    expect(periodUnit("decades")).toBeUndefined();
  });
});

describe("periodInMonths", () => {
  it("is exact for months and years", () => {
    expect(periodInMonths(6, "months")).toBe(6);
    expect(periodInMonths(2, "years")).toBe(24);
  });

  it("assumes a 30-day month for days and weeks", () => {
    expect(periodInMonths(30, "days")).toBe(1);
    expect(periodInMonths(1, "weeks")).toBeCloseTo(7 / 30);
  });

  it("counts an unrecognised unit as months", () => {
    expect(periodInMonths(3, "decades")).toBe(3);
  });

  it("keeps a Term in order across units", () => {
    const lengths = [
      periodInMonths(1, "weeks"),
      periodInMonths(1, "months"),
      periodInMonths(1, "years"),
    ];
    expect(lengths[0]).toBeLessThan(lengths[1]);
    expect(lengths[1]).toBeLessThan(lengths[2]);
  });
});

describe("periodInDays", () => {
  it("is exact for days and weeks", () => {
    expect(periodInDays(30, "days")).toBe(30);
    expect(periodInDays(2, "weeks")).toBe(14);
  });

  it("reports 0 for a length the calendar decides", () => {
    expect(periodInDays(1, "months")).toBe(0);
    expect(periodInDays(1, "years")).toBe(0);
  });
});

describe("addPeriod", () => {
  const from = dayjs("2024-01-01", "YYYY-MM-DD", true);

  it("adds days and weeks", () => {
    expect(addPeriod(from, 30, "days").format("YYYY-MM-DD")).toBe("2024-01-31");
    expect(addPeriod(from, 2, "weeks").format("YYYY-MM-DD")).toBe("2024-01-15");
  });

  it("follows the calendar for months and years", () => {
    expect(
      addPeriod(dayjs("2024-01-31", "YYYY-MM-DD", true), 1, "months").format("YYYY-MM-DD"),
    ).toBe("2024-02-29");
    expect(
      addPeriod(dayjs("2024-02-29", "YYYY-MM-DD", true), 1, "years").format("YYYY-MM-DD"),
    ).toBe("2025-02-28");
  });

  it("does not move for an unrecognised unit", () => {
    expect(addPeriod(from, 3, "decades").format("YYYY-MM-DD")).toBe("2024-01-01");
  });
});
