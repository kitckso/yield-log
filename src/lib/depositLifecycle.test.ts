import { describe, expect, it } from "vite-plus/test";
import dayjs from "dayjs";
import { isMatured, maturityStatus, splitByMaturity } from "./depositLifecycle";
import type { DepositWithBank } from "../types";

function deposit(id: string, endDate: string): DepositWithBank {
  return {
    id,
    user_id: "u",
    bank_id: "b",
    amount: 1000,
    period_value: 3,
    period_unit: "months",
    interest_rate: 3,
    interest: 25,
    start_date: "2024-01-01",
    end_date: endDate,
    created_at: "2024-01-01",
    bank_name: "HSBC",
  };
}

const TODAY = dayjs("2024-06-15", "YYYY-MM-DD", true);
const on = (offset: number) => TODAY.add(offset, "day").format("YYYY-MM-DD");

describe("isMatured", () => {
  it("is true once the maturity date is behind today", () => {
    expect(isMatured("2020-01-01", TODAY)).toBe(true);
    expect(isMatured(on(-1), TODAY)).toBe(true);
  });

  it("is true on the maturity date itself", () => {
    // The maturity date counts as reached once the day begins.
    expect(isMatured(on(0), TODAY)).toBe(true);
  });

  it("is false for a future date", () => {
    expect(isMatured(on(1), TODAY)).toBe(false);
    expect(isMatured(on(30), TODAY)).toBe(false);
  });

  it("defaults to the real today", () => {
    expect(isMatured(dayjs().format("YYYY-MM-DD"))).toBe(true);
    expect(isMatured(dayjs().add(1, "day").format("YYYY-MM-DD"))).toBe(false);
  });
});

describe("maturityStatus", () => {
  const status = (offset: number) => maturityStatus(on(offset), TODAY);

  it("classifies the four relations", () => {
    expect(status(-5).relation).toBe("past");
    expect(status(0).relation).toBe("today");
    expect(status(1).relation).toBe("tomorrow");
    expect(status(30).relation).toBe("future");
  });

  it("counts days signed from today", () => {
    expect(status(0).daysDiff).toBe(0);
    expect(status(-3).daysDiff).toBe(-3);
    expect(status(7).daysDiff).toBe(7);
  });

  it("words the three nearby days individually", () => {
    expect(status(-1).label).toBe("昨日到期");
    expect(status(0).label).toBe("今日到期");
    expect(status(1).label).toBe("明天到期");
  });

  it("words everything else as a distance", () => {
    expect(status(-5).label).toBe("5天前到期");
    expect(status(30).label).toBe("1月後到期");
  });

  it("ignores a time component on the maturity date", () => {
    expect(maturityStatus(`${on(0)}T23:59:00`, TODAY).maturesToday).toBe(true);
    expect(isMatured(`${on(0)}T23:59:00`, TODAY)).toBe(true);
  });

  it("treats today as already matured but still marked as today", () => {
    expect(status(0).isMatured).toBe(true);
    expect(status(0).maturesToday).toBe(true);
    expect(status(0).relation).toBe("today");
  });

  it("dims only what is strictly in the past", () => {
    expect(status(-5).dimmed).toBe(true);
    expect(status(0).dimmed).toBe(false);
    expect(status(1).dimmed).toBe(false);
  });

  it("agrees with isMatured on every day of the week", () => {
    for (let offset = -3; offset <= 3; offset++) {
      expect(maturityStatus(on(offset), TODAY).isMatured, `offset ${offset}`).toBe(
        isMatured(on(offset), TODAY),
      );
    }
  });
});

describe("splitByMaturity", () => {
  const deposits = [
    deposit("past", on(-5)),
    deposit("yesterday", on(-1)),
    deposit("today", on(0)),
    deposit("tomorrow", on(1)),
  ];

  it("counts a deposit maturing today as matured", () => {
    const { matured, active } = splitByMaturity(deposits, TODAY);
    expect(matured.map((d) => d.id)).toEqual(["past", "yesterday", "today"]);
    expect(active.map((d) => d.id)).toEqual(["tomorrow"]);
  });

  it("keeps every deposit on one side or the other", () => {
    const { matured, active } = splitByMaturity(deposits, TODAY);
    expect(matured.length + active.length).toBe(deposits.length);
  });

  it("puts everything in active for an empty portfolio", () => {
    expect(splitByMaturity([], TODAY)).toEqual({ matured: [], active: [] });
  });
});
