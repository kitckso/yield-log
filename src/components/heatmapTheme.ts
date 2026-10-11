export type Level = 0 | 1 | 2 | 3 | 4;

export interface DayCell {
  date: string;
  amount: number;
  count: number;
  level: Level;
  isToday: boolean;
}

export const LEVEL_COLORS: Record<Level, string> = {
  0: "light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
  1: "light-dark(var(--mantine-color-orange-1), var(--mantine-color-orange-8))",
  2: "light-dark(var(--mantine-color-orange-3), var(--mantine-color-orange-6))",
  3: "light-dark(var(--mantine-color-orange-6), var(--mantine-color-orange-4))",
  4: "light-dark(var(--mantine-color-orange-8), var(--mantine-color-orange-2))",
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
export const WEEKS_PER_YEAR = 53;
