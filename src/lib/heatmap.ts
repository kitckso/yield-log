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
  level: 0 | 1 | 2 | 3;
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

export interface Thresholds {
  q1: number;
  q2: number;
}

/**
 * Ternary cut-points, or null when there are no amounts. Quantiles are taken
 * over the *distinct* values: a portfolio where most cells are the same amount
 * would otherwise collapse cut-points together and leave the band between them
 * empty, so the legend would advertise a colour that never appears.
 */
export function computeThresholds(values: number[]): Thresholds | null {
  const distinct = [...new Set(values.filter((v) => v > 0))].sort((a, b) => a - b);
  if (distinct.length === 0) return null;
  return {
    q1: quantile(distinct, 1 / 3),
    q2: quantile(distinct, 2 / 3),
  };
}

export function levelFor(amount: number, t: Thresholds): 0 | 1 | 2 | 3 {
  if (amount <= 0) return 0;
  if (amount <= t.q1) return 1;
  if (amount <= t.q2) return 2;
  return 3;
}

export function computeLevels(values: number[]): (0 | 1 | 2 | 3)[] {
  const t = computeThresholds(values);
  return values.map((v) => (t ? levelFor(v, t) : 0));
}

/**
 * Cut-points pooled across every year, so changing the displayed year never
 * moves the colours. Scoped to `mode` because day, week and month buckets hold
 * different absolute amounts.
 */
export function pooledThresholds(
  deposits: DepositWithBank[],
  mode: HeatmapMode,
): Thresholds | null {
  const totals = new Map<string, number>();
  deposits.forEach((d) => {
    const key = bucketKey(dayjs(d.end_date, "YYYY-MM-DD", true), mode);
    totals.set(key, (totals.get(key) ?? 0) + d.amount);
  });
  return computeThresholds([...totals.values()]);
}

/**
 * Builds the grid for `year`. `thresholds` is required rather than derived
 * from this year's cells on purpose: a per-year scale makes the same amount
 * land on a different colour in each year, so the legend stops meaning
 * anything. Pass `pooledThresholds(deposits, mode)`.
 */
export function computeHeatmap(
  deposits: DepositWithBank[],
  year: number,
  mode: HeatmapMode,
  thresholds: Thresholds | null,
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

  if (thresholds) {
    cells.forEach((c) => {
      c.level = levelFor(c.amount, thresholds);
    });
  }

  return cells;
}
