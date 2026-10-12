import { describe, expect, it } from "vite-plus/test";
import dayjs from "dayjs";
import { formatDate, formatRelativeDays } from "./dateFormat";

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
