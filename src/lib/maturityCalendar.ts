import dayjs from "dayjs";
import type { DepositWithBank } from "../types";
import { hasDepositsInYear } from "./calendar";

/**
 * The 到期日曆: one year of deposits, split into Maturity Buckets at a chosen
 * granularity. Callers hand over raw deposits and get back something they can
 * draw without knowing any calendar rules. See GLOSSARY.md.
 */

export type MaturityMode = "day" | "week" | "month";

/** Depth of a Maturity Bucket, 0 meaning empty. Derived from pooled BandBounds. */
export type Band = 0 | 1 | 2 | 3;

/** Numeric cut-points separating the bands. Shared across years so colours hold still. */
export interface BandBounds {
  q1: number;
  q2: number;
}

export interface MaturityBucket {
  /** Identifier: the period start, except month buckets which use `YYYY-MM`. */
  key: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  count: number;
  interest: number;
  band: Band;
  isCurrent: boolean;
}

/** A day bucket also knows where it sits in the Sunday-start grid. */
export interface DayBucket extends MaturityBucket {
  /** 0-based week column. */
  column: number;
  /** 0-based weekday row, Sunday first. */
  row: number;
  inYear: boolean;
}

export interface MonthLabel {
  column: number;
  label: string;
}

export interface MaturitySummary {
  /** Sum of every deposit maturing in the year. */
  totalAmount: number;
  /** Largest single bucket in the year. */
  peakAmount: number;
  /** How many distinct buckets hold at least one deposit. */
  activePeriods: number;
}

interface MaturityCalendarBase {
  year: number;
  /** Whether any deposit matures in this year at all. */
  hasDeposits: boolean;
  /** Cut-points for the legend, or null when nothing has an amount. */
  bandBounds: BandBounds | null;
  summary: MaturitySummary;
}

export interface DayCalendar extends MaturityCalendarBase {
  mode: "day";
  /** Row-major, `row * columnCount + column`. Includes padding cells outside the year. */
  buckets: DayBucket[];
  columnCount: number;
  monthLabels: MonthLabel[];
  /** Week column holding today, or null when today is outside this year. */
  scrollToColumn: number | null;
}

export interface WeekCalendar extends MaturityCalendarBase {
  mode: "week";
  monthGroups: { label: string; buckets: MaturityBucket[] }[];
}

export interface MonthCalendar extends MaturityCalendarBase {
  mode: "month";
  buckets: MaturityBucket[];
}

export type MaturityCalendar = DayCalendar | WeekCalendar | MonthCalendar;

/** Weeks needed to lay out a whole year, Sunday-start. 54 when Jan 1 is a Saturday. */
export function weeksInYear(year: number): number {
  const yearStart = dayjs(`${year}-01-01`, "YYYY-MM-DD", true);
  const yearEnd = dayjs(`${year}-12-31`, "YYYY-MM-DD", true);
  const firstSunday = yearStart.subtract(yearStart.day(), "day");
  const lastWeekSunday = yearEnd.subtract(yearEnd.day(), "day");
  return Math.floor(lastWeekSunday.diff(firstSunday, "day") / 7) + 1;
}

/** Years holding at least one maturity, always including the current year. */
export function availableMaturityYears(
  deposits: DepositWithBank[],
  currentYear: number = dayjs().year(),
): number[] {
  const years = new Set<number>();
  deposits.forEach((d) => years.add(Number(d.end_date.slice(0, 4))));
  years.add(currentYear);
  return Array.from(years).sort((a, b) => a - b);
}

export function buildMaturityCalendar(
  deposits: DepositWithBank[],
  year: number,
  mode: MaturityMode,
): MaturityCalendar {
  const base: MaturityCalendarBase = {
    year,
    hasDeposits: hasDepositsInYear(deposits, year),
    bandBounds: pooledBandBounds(deposits, mode),
    summary: summarise(deposits, year, mode),
  };
  const totals = bucketTotals(deposits, year, mode);
  if (mode === "month") {
    return { ...base, mode, buckets: monthBuckets(totals, year, base.bandBounds) };
  }
  if (mode === "week") {
    const weeks = weekBuckets(totals, year, base.bandBounds);
    return { ...base, mode, monthGroups: groupWeeksByMonth(weeks, year) };
  }
  return { ...base, mode, ...dayCalendar(totals, year, base.bandBounds) };
}

/** Deposits maturing inside the bucket that `periodStart` identifies. */
export function depositsInBucket(
  deposits: DepositWithBank[],
  year: number,
  mode: MaturityMode,
  periodStart: string,
): DepositWithBank[] {
  const selected = dayjs(periodStart, "YYYY-MM-DD", true);
  const { start: yearStart, end: yearEnd } = yearBounds(year);
  return deposits
    .filter((d) => {
      const end = dayjs(d.end_date, "YYYY-MM-DD", true);
      if (mode === "day") return end.isSame(selected, "day");
      if (mode === "week") {
        const window = weekWindow(selected, yearStart, yearEnd);
        return !end.isBefore(window.start) && !end.isAfter(window.end);
      }
      return end.year() === selected.year() && end.month() === selected.month();
    })
    .sort((a, b) => a.end_date.localeCompare(b.end_date));
}

/** Modal heading for a bucket, worded per mode. */
export function bucketLabel(year: number, mode: MaturityMode, periodStart: string): string {
  const selected = dayjs(periodStart, "YYYY-MM-DD", true);
  if (mode === "day") return `${selected.format("YYYY年M月D日")} 到期記錄`;
  if (mode === "week") {
    const { start, end } = weekWindow(selected, yearBounds(year).start, yearBounds(year).end);
    return `${start.format("M月D日")} - ${end.format("M月D日")} 到期記錄`;
  }
  return `${selected.format("YYYY年M月")} 到期記錄`;
}

// ── calendar rules ───────────────────────────────────────────────────────────

function yearBounds(year: number): { start: dayjs.Dayjs; end: dayjs.Dayjs } {
  return {
    start: dayjs(`${year}-01-01`, "YYYY-MM-DD", true),
    end: dayjs(`${year}-12-31`, "YYYY-MM-DD", true),
  };
}

function bucketKey(d: dayjs.Dayjs, mode: MaturityMode): string {
  if (mode === "day") return d.format("YYYY-MM-DD");
  if (mode === "week") return d.subtract(d.day(), "day").format("YYYY-MM-DD");
  return d.format("YYYY-MM");
}

/**
 * The Sunday that starts the week containing `d`, clamped to the year bounds, so
 * a week hanging off either end of the year never reaches into a neighbouring one.
 */
function weekWindow(
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

// ── bands ────────────────────────────────────────────────────────────────────

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
 * Ternary cut-points, or null when there are no amounts. Quantiles are taken
 * over the *distinct* values: a portfolio where most buckets hold the same amount
 * would otherwise collapse both cut-points together and leave the band between
 * them empty, so the legend would advertise a colour that never appears.
 */
function computeBandBounds(values: number[]): BandBounds | null {
  const distinct = [...new Set(values.filter((v) => v > 0))].sort((a, b) => a - b);
  if (distinct.length === 0) return null;
  return { q1: quantile(distinct, 1 / 3), q2: quantile(distinct, 2 / 3) };
}

function bandFor(amount: number, bounds: BandBounds): Band {
  if (amount <= 0) return 0;
  if (amount <= bounds.q1) return 1;
  if (amount <= bounds.q2) return 2;
  return 3;
}

/**
 * Cut-points pooled across every year, so changing the displayed year never
 * moves the colours. Scoped to `mode` because day, week and month buckets hold
 * different absolute amounts.
 */
function pooledBandBounds(deposits: DepositWithBank[], mode: MaturityMode): BandBounds | null {
  const totals = new Map<string, number>();
  deposits.forEach((d) => {
    const key = bucketKey(dayjs(d.end_date, "YYYY-MM-DD", true), mode);
    totals.set(key, (totals.get(key) ?? 0) + d.amount);
  });
  return computeBandBounds([...totals.values()]);
}

// ── buckets ──────────────────────────────────────────────────────────────────

interface Totals {
  amount: number;
  count: number;
  interest: number;
}

function bucketTotals(
  deposits: DepositWithBank[],
  year: number,
  mode: MaturityMode,
): Map<string, Totals> {
  const { start: yearStart, end: yearEnd } = yearBounds(year);
  const totals = new Map<string, Totals>();
  deposits.forEach((d) => {
    const end = dayjs(d.end_date, "YYYY-MM-DD", true);
    if (end.isBefore(yearStart) || end.isAfter(yearEnd)) return;
    const key = bucketKey(end, mode);
    const entry = totals.get(key) ?? { amount: 0, count: 0, interest: 0 };
    entry.amount += d.amount;
    entry.count += 1;
    entry.interest += d.interest;
    totals.set(key, entry);
  });
  return totals;
}

function dayCalendar(
  totals: Map<string, Totals>,
  year: number,
  bounds: BandBounds | null,
): Omit<DayCalendar, keyof MaturityCalendarBase | "mode"> {
  const { start: yearStart } = yearBounds(year);
  const firstSunday = yearStart.subtract(yearStart.day(), "day");
  const columnCount = weeksInYear(year);
  const today = dayjs().startOf("day");

  const buckets: DayBucket[] = [];
  for (let column = 0; column < columnCount; column++) {
    const cursor = firstSunday.add(column * 7, "day");
    for (let row = 0; row < 7; row++) {
      const date = cursor.add(row, "day");
      const inYear = date.year() === year;
      const key = date.format("YYYY-MM-DD");
      // Padding cells outside the year stay empty so the columns keep their shape.
      const entry = inYear ? totals.get(key) : undefined;
      const amount = entry?.amount ?? 0;
      buckets.push({
        key,
        periodStart: key,
        periodEnd: key,
        amount,
        count: entry?.count ?? 0,
        interest: entry?.interest ?? 0,
        band: bounds ? bandFor(amount, bounds) : 0,
        isCurrent: date.isSame(today, "day"),
        column,
        row,
        inYear,
      });
    }
  }

  const monthLabels: MonthLabel[] = [];
  let lastMonth = -1;
  for (let column = 0; column < columnCount; column++) {
    const date = firstSunday.add(column * 7, "day");
    if (date.year() !== year) continue;
    const month = date.month();
    if (month !== lastMonth) {
      monthLabels.push({ column, label: `${month + 1}月` });
      lastMonth = month;
    }
  }

  const daysSinceStart = today.diff(firstSunday, "day");
  return {
    buckets,
    columnCount,
    monthLabels,
    scrollToColumn:
      today.year() === year && daysSinceStart >= 0 ? Math.floor(daysSinceStart / 7) : null,
  };
}

function weekBuckets(
  totals: Map<string, Totals>,
  year: number,
  bounds: BandBounds | null,
): MaturityBucket[] {
  const { start: yearStart, end: yearEnd } = yearBounds(year);
  const firstSunday = yearStart.subtract(yearStart.day(), "day");
  const today = dayjs().startOf("day");
  const buckets: MaturityBucket[] = [];

  for (let column = 0; column < weeksInYear(year); column++) {
    const cursor = firstSunday.add(column * 7, "day");
    const key = cursor.format("YYYY-MM-DD");
    const window = weekWindow(cursor, yearStart, yearEnd);
    const entry = totals.get(key);
    const amount = entry?.amount ?? 0;
    buckets.push({
      key,
      periodStart: window.start.format("YYYY-MM-DD"),
      periodEnd: window.end.format("YYYY-MM-DD"),
      amount,
      count: entry?.count ?? 0,
      interest: entry?.interest ?? 0,
      band: bounds ? bandFor(amount, bounds) : 0,
      isCurrent: !today.isBefore(window.start) && !today.isAfter(window.end),
    });
  }
  return buckets;
}

/** Week buckets grouped under the month their period starts in, in calendar order. */
function groupWeeksByMonth(
  weeks: MaturityBucket[],
  year: number,
): { label: string; buckets: MaturityBucket[] }[] {
  const groups = new Map<string, MaturityBucket[]>();
  weeks.forEach((bucket) => {
    const start = dayjs(bucket.periodStart, "YYYY-MM-DD", true);
    if (start.year() !== year) return;
    const label = start.format("M月");
    const existing = groups.get(label);
    if (existing) existing.push(bucket);
    else groups.set(label, [bucket]);
  });
  return Array.from(groups, ([label, buckets]) => ({ label, buckets }));
}

function monthBuckets(
  totals: Map<string, Totals>,
  year: number,
  bounds: BandBounds | null,
): MaturityBucket[] {
  const { start: yearStart } = yearBounds(year);
  const now = dayjs();
  const buckets: MaturityBucket[] = [];
  for (let m = 0; m < 12; m++) {
    const monthDate = yearStart.month(m);
    const key = monthDate.format("YYYY-MM");
    const entry = totals.get(key);
    const amount = entry?.amount ?? 0;
    buckets.push({
      key,
      periodStart: monthDate.startOf("month").format("YYYY-MM-DD"),
      periodEnd: monthDate.endOf("month").format("YYYY-MM-DD"),
      amount,
      count: entry?.count ?? 0,
      interest: entry?.interest ?? 0,
      band: bounds ? bandFor(amount, bounds) : 0,
      isCurrent: monthDate.isSame(now, "month") && monthDate.year() === year,
    });
  }
  return buckets;
}

// ── summary ──────────────────────────────────────────────────────────────────

function summarise(deposits: DepositWithBank[], year: number, mode: MaturityMode): MaturitySummary {
  const periodTotals = new Map<string, number>();
  let totalAmount = 0;
  deposits.forEach((d) => {
    if (!d.end_date.startsWith(`${year}-`)) return;
    totalAmount += d.amount;
    const key = bucketKey(dayjs(d.end_date, "YYYY-MM-DD", true), mode);
    periodTotals.set(key, (periodTotals.get(key) ?? 0) + d.amount);
  });
  return {
    totalAmount,
    peakAmount: Math.max(0, ...periodTotals.values()),
    activePeriods: periodTotals.size,
  };
}
