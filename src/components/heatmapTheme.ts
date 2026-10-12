import type { Band } from "../lib/maturityCalendar";

export const BAND_COLORS: Record<Band, string> = {
  0: "light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
  1: "light-dark(var(--mantine-color-orange-3), var(--mantine-color-orange-9))",
  2: "light-dark(var(--mantine-color-orange-6), var(--mantine-color-orange-6))",
  3: "light-dark(var(--mantine-color-orange-9), var(--mantine-color-orange-3))",
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
