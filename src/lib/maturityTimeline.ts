import dayjs from "dayjs";
import { maturityStatus } from "./depositLifecycle";
import type { DepositWithBank } from "../types";

export const INITIAL_SHOW = 5;

export function groupByMonth(items: DepositWithBank[]): [string, DepositWithBank[]][] {
  const groups = new Map<string, DepositWithBank[]>();
  for (const d of items) {
    const key = dayjs(d.end_date, "YYYY-MM-DD", true).format("YYYY年M月");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  }
  return Array.from(groups.entries());
}

export interface RelativeMaturity {
  daysDiff: number;
  isYesterday: boolean;
  isToday: boolean;
  isTomorrow: boolean;
  matured: boolean;
  /** Dimmed styling applies to matured items other than today. */
  dimmed: boolean;
  label: string;
}

export function classifyMaturity(endDate: string, today: dayjs.Dayjs = dayjs()): RelativeMaturity {
  const status = maturityStatus(endDate, today);
  return {
    daysDiff: status.daysDiff,
    isYesterday: status.wasYesterday,
    isToday: status.maturesToday,
    isTomorrow: status.maturesTomorrow,
    matured: status.isMatured,
    dimmed: status.dimmed,
    label: status.label,
  };
}

export interface TruncateResult {
  recent: DepositWithBank[];
  upcoming: DepositWithBank[];
  hasMore: boolean;
}

export function truncateForDisplay(
  recentlyMatured: DepositWithBank[],
  upcoming: DepositWithBank[],
  showAll: boolean,
  initial = INITIAL_SHOW,
): TruncateResult {
  return {
    recent: showAll ? recentlyMatured : recentlyMatured.slice(0, initial),
    upcoming: showAll ? upcoming : upcoming.slice(0, initial),
    hasMore: recentlyMatured.length > initial || upcoming.length > initial,
  };
}

export function shouldRenderTimeline(
  recentlyMatured: DepositWithBank[],
  upcoming: DepositWithBank[],
): boolean {
  return recentlyMatured.length > 0 || upcoming.length > 0;
}
