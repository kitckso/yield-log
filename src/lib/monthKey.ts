import dayjs from "dayjs";
import type { DepositWithBank } from "../types";

/**
 * A month has one identity and two labels. `YYYY-MM` is the identity — sortable,
 * comparable, and the key everything else is built on. `2026年7月` is how a list
 * that spans years says it; `7月` is how a view already scoped to one year says
 * it. Those were three separate ideas spread over five files; this is the one
 * place they are spelled.
 */

export interface MonthGroup {
  /** `YYYY-MM`, e.g. "2026-07". */
  key: string;
  deposits: DepositWithBank[];
  totalAmount: number;
  totalInterest: number;
}

/** The month a date falls in, as a key. */
export function monthKeyOf(date: dayjs.Dayjs): string {
  return date.format("YYYY-MM");
}

/** The same key, read off a date as the database stores it. */
export function monthKey(date: string): string {
  return monthKeyOf(dayjs(date));
}

export function yearOf(key: string): number {
  return Number(key.slice(0, 4));
}

/** Zero-based, matching dayjs. */
export function monthOf(key: string): number {
  return Number(key.slice(5, 7)) - 1;
}

/** For a list that spans years, so the reader knows which year they are looking at. */
export function monthLabel(key: string): string {
  return `${yearOf(key)}年${monthOf(key) + 1}月`;
}

/** For a view already scoped to one year. */
export function monthLabelShort(key: string): string {
  return `${monthOf(key) + 1}月`;
}

/**
 * All twelve months of a year, in order — the spine a year-scoped view fills in.
 * Months with nothing in them still get a row.
 */
export function yearMonthKeys(year: number): string[] {
  return Array.from({ length: 12 }, (_, m) => monthKeyOf(dayjs(`${year}-01-01`).month(m)));
}

export function emptyMonth(key: string): MonthGroup {
  return { key, deposits: [], totalAmount: 0, totalInterest: 0 };
}

/**
 * Deposits grouped by the month they open in, or the month they mature in.
 * Empty months are left out, and the order the deposits arrived in is kept
 * within each group: the caller already chose that order, by sorting or not.
 */
export function groupByMonth(
  deposits: DepositWithBank[],
  field: "start_date" | "end_date",
): MonthGroup[] {
  const grouped = new Map<string, DepositWithBank[]>();
  deposits.forEach((d) => {
    const key = monthKey(d[field]);
    const entry = grouped.get(key);
    if (entry) entry.push(d);
    else grouped.set(key, [d]);
  });
  return Array.from(grouped, ([key, items]) => ({
    key,
    deposits: items,
    totalAmount: items.reduce((s, d) => s + d.amount, 0),
    totalInterest: items.reduce((s, d) => s + d.interest, 0),
  }));
}
