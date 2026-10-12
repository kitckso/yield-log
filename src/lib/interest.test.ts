import { describe, expect, it } from "vite-plus/test";
import { calculateEndDate, calculateInterest, calculateInterestRounded } from "./interest";

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

  it("agrees with the rounded figure once the cents are whole", () => {
    expect(calculateInterest(100000, 3, "2023-01-01", "2024-01-01")).toBe(
      calculateInterestRounded(100000, 3, "2023-01-01", "2024-01-01"),
    );
  });
});

describe("calculateInterestRounded", () => {
  it("rounds to nearest cent", () => {
    // 50000 * 2.5% * 1/365 = 3.424657... -> 3.42
    expect(calculateInterestRounded(50000, 2.5, "2024-01-01", "2024-01-02")).toBe(3.42);
  });

  it("rounds up at the half-cent boundary", () => {
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

  it("leaves the date alone for an unrecognised unit", () => {
    expect(calculateEndDate("2024-01-01", 3, "decades")).toBe("2024-01-01");
  });
});
