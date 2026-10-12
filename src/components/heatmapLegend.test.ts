import { describe, expect, it } from "vite-plus/test";
import { formatBands, niceBoundary } from "./heatmapLegend";

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
    expect(formatBands({ q1: 70_000, q2: 150_000 })).toEqual(["≤$7萬", "≤$15萬", ">$15萬"]);
  });

  it("keeps labels strictly increasing when rounding would collide", () => {
    // Both cut-points snap to 100K, so the second falls back to its raw value,
    // which happens to round to the same figure.
    const labels = formatBands({ q1: 99_000, q2: 100_000 });
    expect(labels).toHaveLength(3);
    expect(labels[0]).toBe("≤$10萬");
    expect(labels[1]).toBe("≤$10萬");
    expect(labels[2]).toBe(">$10萬");
  });

  it("groups plain figures when the whole portfolio is small", () => {
    expect(formatBands({ q1: 1000, q2: 2000 })).toEqual(["≤$1,000", "≤$2,000", ">$2,000"]);
  });

  it("always returns three labels, matching the three coloured bands", () => {
    expect(formatBands({ q1: 1000, q2: 2000 })).toHaveLength(3);
  });
});
