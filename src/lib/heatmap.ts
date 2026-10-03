import dayjs from "dayjs";
import type { DepositWithBank } from "../types";

export type HeatmapMode = "day" | "week" | "month";

export interface HeatmapCell {
  key: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  count: number;
  interest: number;
  level: 0 | 1 | 2 | 3 | 4;
  isCurrent: boolean;
  isFuture: boolean;
}

export function bucketKey(d: dayjs.Dayjs, mode: HeatmapMode): string {
  if (mode === "day") return d.format("YYYY-MM-DD");
  if (mode === "week") return d.subtract(d.day(), "day").format("YYYY-MM-DD");
  return d.format("YYYY-MM");
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (base + 1 < sorted.length) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

/**
 * The Sunday that starts the week containing `d`, clamped to the year bounds.
 * Weeks that hang off either end of the year are trimmed so a cell never
 * reaches into a neighbouring year.
 */
export function weekWindowClamped(
  d: dayjs.Dayjs,
  yearStart: dayjs.Dayjs,
  yearEnd: dayjs.Dayjs,
): { start: dayjs.Dayjs; end: dayjs.Dayjs } {
  const sunday = d.subtract(d.day(), "day");
  const saturday = sunday.add(6, "day");
  return {
    start: sunday.isBefore(yearStart) ? yearStart : sunday,
    end: saturday.isAfter(yearEnd) ? yearEnd : saturday,
  };
}

/** Deposits maturing inside the period that `selected` refers to. */
export function depositsInPeriod(
  deposits: DepositWithBank[],
  selected: dayjs.Dayjs,
  mode: HeatmapMode,
  yearStart: dayjs.Dayjs,
  yearEnd: dayjs.Dayjs,
): DepositWithBank[] {
  return deposits
    .filter((d) => {
      const end = dayjs(d.end_date, "YYYY-MM-DD", true);
      if (mode === "day") return end.isSame(selected, "day");
      if (mode === "week") {
        const { start, end: windowEnd } = weekWindowClamped(selected, yearStart, yearEnd);
        return !end.isBefore(start) && !end.isAfter(windowEnd);
      }
      return end.year() === selected.year() && end.month() === selected.month();
    })
    .sort((a, b) => a.end_date.localeCompare(b.end_date));
}

/** Years that have at least one deposit, always including the current year. */
export function availableYears(
  deposits: DepositWithBank[],
  currentYear: number = dayjs().year(),
): number[] {
  const years = new Set<number>();
  deposits.forEach((d) => years.add(Number(d.end_date.slice(0, 4))));
  years.add(currentYear);
  return Array.from(years).sort((a, b) => a - b);
}

export function computeLevels(values: number[]): (0 | 1 | 2 | 3 | 4)[] {
  const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return values.map(() => 0);
  const q1 = quantile(sorted, 0.25);
  const q2 = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  return values.map((v) => {
    if (v === 0) return 0;
    if (v <= q1) return 1;
    if (v <= q2) return 2;
    if (v <= q3) return 3;
    return 4;
  });
}

export function computeHeatmap(
  deposits: DepositWithBank[],
  year: number,
  mode: HeatmapMode,
): HeatmapCell[] {
  const yearStart = dayjs(`${year}-01-01`, "YYYY-MM-DD", true);
  const yearEnd = dayjs(`${year}-12-31`, "YYYY-MM-DD", true);
  const today = dayjs().startOf("day");
  const now = dayjs();

  const buckets = new Map<string, { amount: number; count: number; interest: number }>();
  deposits.forEach((d) => {
    const end = dayjs(d.end_date, "YYYY-MM-DD", true);
    if (end.isBefore(yearStart) || end.isAfter(yearEnd)) return;
    const key = bucketKey(end, mode);
    const entry = buckets.get(key) ?? { amount: 0, count: 0, interest: 0 };
    entry.amount += d.amount;
    entry.count += 1;
    entry.interest += d.interest;
    buckets.set(key, entry);
  });

  const cells: HeatmapCell[] = [];

  if (mode === "day" || mode === "week") {
    const firstSunday = yearStart.subtract(yearStart.day(), "day");
    const lastWeekSunday = yearEnd.subtract(yearEnd.day(), "day");
    const seen = new Set<string>();
    let cursor = firstSunday;
    while (cursor.isSame(lastWeekSunday) || cursor.isBefore(lastWeekSunday)) {
      if (mode === "day") {
        for (let row = 0; row < 7; row++) {
          const date = cursor.add(row, "day");
          if (date.year() !== year) continue;
          const key = date.format("YYYY-MM-DD");
          if (seen.has(key)) continue;
          seen.add(key);
          const bucket = buckets.get(key);
          cells.push({
            key,
            periodStart: key,
            periodEnd: key,
            amount: bucket?.amount ?? 0,
            count: bucket?.count ?? 0,
            interest: bucket?.interest ?? 0,
            level: 0,
            isCurrent: date.isSame(today, "day"),
            isFuture: date.isAfter(today, "day"),
          });
        }
      } else {
        const key = cursor.format("YYYY-MM-DD");
        const weekEnd = cursor.add(6, "day");
        const start = cursor.isBefore(yearStart) ? yearStart : cursor;
        const end = weekEnd.isAfter(yearEnd) ? yearEnd : weekEnd;
        const bucket = buckets.get(key);
        cells.push({
          key,
          periodStart: start.format("YYYY-MM-DD"),
          periodEnd: end.format("YYYY-MM-DD"),
          amount: bucket?.amount ?? 0,
          count: bucket?.count ?? 0,
          interest: bucket?.interest ?? 0,
          level: 0,
          isCurrent: !today.isBefore(start) && !today.isAfter(end),
          isFuture: start.isAfter(today, "day"),
        });
      }
      cursor = cursor.add(7, "day");
    }
  } else {
    for (let m = 0; m < 12; m++) {
      const monthDate = yearStart.month(m);
      const key = monthDate.format("YYYY-MM");
      const bucket = buckets.get(key);
      cells.push({
        key,
        periodStart: monthDate.startOf("month").format("YYYY-MM-DD"),
        periodEnd: monthDate.endOf("month").format("YYYY-MM-DD"),
        amount: bucket?.amount ?? 0,
        count: bucket?.count ?? 0,
        interest: bucket?.interest ?? 0,
        level: 0,
        isCurrent: monthDate.isSame(now, "month") && monthDate.year() === year,
        isFuture: monthDate.isAfter(now.startOf("month")),
      });
    }
  }

  const amounts = cells.map((c) => c.amount);
  const levels = computeLevels(amounts);
  cells.forEach((c, i) => {
    c.level = levels[i];
  });

  return cells;
}
