import type { Band } from "../lib/maturityCalendar";

/**
 * Band fills, low to high. The ramp deliberately inverts in dark mode — brighter
 * means more money — which is why it cannot be read as a single per-mode text
 * colour: see BAND_TEXT_COLORS below.
 */
export const BAND_COLORS: Record<Band, string> = {
  0: "light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
  1: "light-dark(var(--mantine-color-orange-3), var(--mantine-color-orange-9))",
  2: "light-dark(var(--mantine-color-orange-6), var(--mantine-color-orange-6))",
  3: "light-dark(var(--mantine-color-orange-9), var(--mantine-color-orange-3))",
};

/**
 * Foreground for text drawn on top of a band fill. Light mode keeps the black
 * that --mantine-color-text already resolves to, so nothing changes there; dark
 * mode has to split, because the ramp inverts: band 1 is the darkest fill and
 * wants white, bands 2 and 3 are the brightest and want near-black.
 * The day grid paints no text and ignores this.
 */
export const BAND_TEXT_COLORS: Record<Band, string> = {
  0: "light-dark(var(--mantine-color-black), var(--mantine-color-gray-0))",
  1: "light-dark(var(--mantine-color-black), var(--mantine-color-white))",
  2: "light-dark(var(--mantine-color-black), var(--mantine-color-dark-9))",
  3: "light-dark(var(--mantine-color-black), var(--mantine-color-dark-9))",
};

export const CURRENT_COLOR = "light-dark(var(--mantine-color-blue-6), var(--mantine-color-blue-2))";
export const CURRENT_BORDER = `2px solid ${CURRENT_COLOR}`;
export const EMPTY_OPACITY = 0.5;

export const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export const DAY_CELL_SIZE = 14;
export const DAY_CELL_GAP = 2;
export const LABEL_COL = 14;
export const MONTH_LABEL_HEIGHT = 14;
export const WEEK_LABEL_COL = 28;
