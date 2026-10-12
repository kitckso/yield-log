import { describe, expect, it } from "vite-plus/test";
import { formatBands, formatThreshold, niceBoundary } from "./heatmapLegend";

describe("formatThreshold", () => {
  it("leaves small figures plain", () => {
    expect(formatThreshold(500)).toBe("500");
  });

  it("abbreviates thousands", () => {
    expect(formatThreshold(120_000)).toBe("120K");
    expect(formatThreshold(1500)).toBe("1.5K");
  });

  it("abbreviates millions", () => {
    expect(formatThreshold(2_500_000)).toBe("2.5M");
  });
});

describe("niceBoundary", () => {
  it("snaps to a round figure a person would pick", () => {
    expect(niceBoundary(66_800)).toBe(70_000);
    expect(niceBoundary(250_000)).toBe(250_000);
  });

  it("picks the nearest step rather than always rounding up", () => {
    expect(niceBoundary(11_000)).toBe(10_000);
  });
});

describe("formatBands", () => {
  it("labels each band by its upper bound, top band last", () => {
    expect(formatBands({ q1: 70_000, q2: 150_000 })).toEqual(["≤70K", "≤150K", ">150K"]);
  });

  it("keeps labels strictly increasing when rounding would collide", () => {
    // Both cut-points round to 100K, so the second falls back to its raw value.
    const labels = formatBands({ q1: 99_000, q2: 100_000 });
    expect(labels).toHaveLength(3);
    expect(labels[0]).toBe("≤100K");
    expect(labels[1]).toBe("≤100K");
    expect(labels[2]).toBe(">100K");
  });

  it("always returns three labels, matching the three coloured bands", () => {
    expect(formatBands({ q1: 1000, q2: 2000 })).toHaveLength(3);
  });
});
