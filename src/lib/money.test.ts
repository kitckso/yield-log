import { describe, expect, it } from "vite-plus/test";
import { formatAxisMoney, formatBandMoney, formatMoney } from "./money";

describe("formatMoney", () => {
  it("groups thousands and keeps two decimals", () => {
    expect(formatMoney(1234567.5)).toBe("$1,234,567.50");
  });

  it("puts no space between the symbol and the figure", () => {
    expect(formatMoney(0)).toBe("$0.00");
    expect(formatMoney(500)).toBe("$500.00");
  });

  it("rounds to the cent", () => {
    expect(formatMoney(1.005)).toBe("$1.01");
    expect(formatMoney(1.004)).toBe("$1.00");
  });
});

describe("formatAxisMoney", () => {
  it("keeps a plain figure below 萬", () => {
    expect(formatAxisMoney(0)).toBe("$0");
    expect(formatAxisMoney(500)).toBe("$500");
  });

  it("abbreviates tens of thousands", () => {
    expect(formatAxisMoney(12_000)).toBe("$1.2萬");
  });

  it("always shows one decimal so ticks line up", () => {
    expect(formatAxisMoney(120_000)).toBe("$12.0萬");
  });

  it("switches to 億 at a hundred million", () => {
    expect(formatAxisMoney(100_000_000)).toBe("$1.0億");
    expect(formatAxisMoney(1_234_000_000)).toBe("$12.3億");
  });
});

describe("formatBandMoney", () => {
  it("drops the trailing zero a cut-point never needs", () => {
    expect(formatBandMoney(120_000)).toBe("$12萬");
    expect(formatBandMoney(150_000)).toBe("$15萬");
  });

  it("keeps a decimal that carries information", () => {
    expect(formatBandMoney(1_234_000)).toBe("$123.4萬");
  });

  it("switches to 億 at a hundred million", () => {
    expect(formatBandMoney(100_000_000)).toBe("$1億");
  });

  it("groups plain figures below 萬", () => {
    expect(formatBandMoney(500)).toBe("$500");
    expect(formatBandMoney(1_000)).toBe("$1,000");
  });

  it("rounds rather than truncating", () => {
    expect(formatBandMoney(500.4)).toBe("$500");
    expect(formatBandMoney(500.6)).toBe("$501");
  });
});
