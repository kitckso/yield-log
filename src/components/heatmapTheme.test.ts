import { describe, expect, it } from "vite-plus/test";
import { DEFAULT_THEME } from "@mantine/core";
import type { Band } from "../lib/maturityCalendar";
import { BAND_COLORS, BAND_TEXT_COLORS } from "./heatmapTheme";

type Mode = "light" | "dark";

/** Mantine ships these two outside the 10-shade tuples. */
const FLAT_COLORS: Record<string, string> = {
  "--mantine-color-black": "#000",
  "--mantine-color-white": "#fff",
};

const BANDS: Band[] = [0, 1, 2, 3];

/** Resolves one `var(--mantine-color-<hue>-<shade>)` against the real Mantine palette. */
function resolveVar(name: string): string {
  const flat = FLAT_COLORS[name];
  if (flat) return flat;
  const parts = /^--mantine-color-([a-z]+)-(\d+)$/.exec(name);
  if (!parts) throw new Error(`unresolvable colour: ${name}`);
  return DEFAULT_THEME.colors[parts[1]][Number(parts[2])];
}

/**
 * Picks the side `light-dark()` would take in `mode`, then resolves it to a hex.
 * Every colour in heatmapTheme is either a bare `var()` or a `light-dark()` of
 * two of them, so splitting on commas is safe — nothing nests a comma.
 */
function resolve(expr: string, mode: Mode): string {
  const wrapped = /^light-dark\((.*)\)$/.exec(expr.trim());
  const parts = (wrapped ? wrapped[1] : expr).split(",").map((s) => s.trim());
  const chosen = mode === "light" ? parts[0] : parts[parts.length - 1];
  const name = /^var\((--mantine-color-[\w-]+)\)$/.exec(chosen);
  if (!name) throw new Error(`unresolvable colour: ${chosen}`);
  return resolveVar(name[1]);
}

function luminance(hex: string): number {
  // Mantine writes black and white as #abc shorthand; expand to #aabbcc.
  const full = /^#([\da-f])([\da-f])([\da-f])$/i.exec(hex);
  if (full) hex = `#${full[1]}${full[1]}${full[2]}${full[2]}${full[3]}${full[3]}`;
  // #rrggbb — the red, green and blue pairs start at 1, 3 and 5.
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio, order-independent. */
function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

function bandContrast(band: Band, mode: Mode): number {
  return contrast(resolve(BAND_COLORS[band], mode), resolve(BAND_TEXT_COLORS[band], mode));
}

describe("heatmap band colours", () => {
  // Band 1 in dark mode tops out at 4.30:1: orange-9 is the darkest orange
  // Mantine ships, so no foreground reaches AA on it.
  it.each(BANDS)("keeps band %i legible in both colour schemes", (band) => {
    expect(bandContrast(band, "light")).toBeGreaterThanOrEqual(4);
    expect(bandContrast(band, "dark")).toBeGreaterThanOrEqual(4);
  });

  it("leaves light mode black, so nothing changes for light-theme users", () => {
    BANDS.forEach((band) => {
      expect(resolve(BAND_TEXT_COLORS[band], "light")).toBe("#000");
    });
  });

  it("keeps the dark ramp climbing in brightness, so more money still reads hotter", () => {
    const steps = BANDS.map((band) => luminance(resolve(BAND_COLORS[band], "dark")));
    steps.slice(1).forEach((value, i) => expect(value).toBeGreaterThan(steps[i]));
  });
});
