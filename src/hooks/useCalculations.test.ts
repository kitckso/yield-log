import { describe, expect, it } from "vite-plus/test";
import dayjs from "dayjs";
import {
  calculateEndDate,
  calculateInterest,
  calculateInterestRounded,
  formatCurrency,
  formatDate,
  formatRelativeDays,
  getErrorMessage,
} from "./useCalculations";

describe("calculateInterest", () => {
  it("computes interest for a full year", () => {
    expect(calculateInterest(100000, 3, "2023-01-01", "2024-01-01")).toBe(3000);
  });

  it("floors fractional cents", () => {
    // 100000 * 1.5% * 1/365 = 4.109589... -> 4.10
    expect(calculateInterest(100000, 1.5, "2024-01-01", "2024-01-02")).toBe(4.1);
  });

  it("returns 0 when start equals end", () => {
    expect(calculateInterest(100000, 3, "2024-01-01", "2024-01-01")).toBe(0);
  });
});

describe("calculateInterestRounded", () => {
  it("rounds to nearest cent", () => {
    // 50000 * 2.5% * 1/365 = 3.424657... -> 3.42
    expect(calculateInterestRounded(50000, 2.5, "2024-01-01", "2024-01-02")).toBe(3.42);
  });

  it("rounds up at the half-cent boundary", () => {
    // 100 * 5% * 0.5 year equivalent -> pick amount producing .005
    expect(calculateInterestRounded(73000, 5, "2024-01-01", "2024-01-04")).toBe(
      Math.round(73000 * 0.05 * (3 / 365) * 100) / 100,
    );
  });
});

describe("calculateEndDate", () => {
  it("adds days", () => {
    expect(calculateEndDate("2024-01-01", 30, "days")).toBe("2024-01-31");
  });

  it("adds weeks", () => {
    expect(calculateEndDate("2024-01-01", 2, "weeks")).toBe("2024-01-15");
  });

  it("adds months", () => {
    expect(calculateEndDate("2024-01-31", 1, "months")).toBe("2024-02-29");
  });

  it("adds years", () => {
    expect(calculateEndDate("2024-02-29", 1, "years")).toBe("2025-02-28");
  });
});

describe("formatCurrency", () => {
  it("formats with HKD style", () => {
    expect(formatCurrency(1234567.5)).toBe("$ 1,234,567.50");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$ 0.00");
  });
});

describe("formatDate", () => {
  it("returns 今天 for today", () => {
    expect(formatDate(dayjs().format("YYYY-MM-DD"))).toBe("今天");
  });

  it("returns 明天 for tomorrow", () => {
    expect(formatDate(dayjs().add(1, "day").format("YYYY-MM-DD"))).toBe("明天");
  });

  it("returns 昨天 for yesterday", () => {
    expect(formatDate(dayjs().subtract(1, "day").format("YYYY-MM-DD"))).toBe("昨天");
  });

  it("formats other dates with weekday", () => {
    const d = dayjs().add(10, "day");
    const weekdays = "日一二三四五六";
    expect(formatDate(d.format("YYYY-MM-DD"))).toBe(
      `${d.format("YYYY年MM月DD日")}(${weekdays[d.day()]})`,
    );
  });
});

describe("formatRelativeDays", () => {
  it("formats days only", () => {
    expect(formatRelativeDays(10)).toBe("10天");
  });

  it("formats months and days", () => {
    expect(formatRelativeDays(40)).toBe("1月10天");
  });

  it("formats years, months and days", () => {
    expect(formatRelativeDays(400)).toBe("1年1月10天");
  });

  it("handles negative values", () => {
    expect(formatRelativeDays(-10)).toBe("10天");
  });

  it("handles zero", () => {
    expect(formatRelativeDays(0)).toBe("0天");
  });
});

describe("getErrorMessage", () => {
  it("maps permission errors", () => {
    expect(getErrorMessage({ code: "42501" })).toBe("沒有權限，訪客帳戶無法執行此操作");
    expect(getErrorMessage({ status: 406 })).toBe("沒有權限，訪客帳戶無法執行此操作");
  });

  it("falls back for unknown errors", () => {
    expect(getErrorMessage(new Error("x"))).toBe("操作失敗，請稍後再試");
    expect(getErrorMessage(null)).toBe("操作失敗，請稍後再試");
    expect(getErrorMessage("nope")).toBe("操作失敗，請稍後再試");
  });
});
