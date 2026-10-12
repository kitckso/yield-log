import dayjs from "dayjs";
import { isMatured, splitByMaturity } from "./depositLifecycle";
import { monthKey, monthKeyOf, monthLabelShort } from "./monthKey";
import { periodInMonths } from "./period";
import type { Bank, DepositWithBank } from "../types";

/**
 * The read models the dashboard renders: each one is a pure function of the same
 * deposit list, answering a different question about it. Nothing here fetches,
 * stores or renders — the shapes are what the cards draw.
 */

/** Bank names, keyed by id, for turning a deposit's bank_id into something readable. */
export function bankNames(banks: Bank[]): Map<string, string> {
  const map = new Map<string, string>();
  banks.forEach((b) => map.set(b.id, b.name));
  return map;
}

/** Deposits still running, and deposits whose Maturity has passed. */
export function splitActive(deposits: DepositWithBank[]): {
  active: DepositWithBank[];
  matured: DepositWithBank[];
} {
  return splitByMaturity(deposits);
}

export function activeAmount(activeDeposits: DepositWithBank[]): number {
  return activeDeposits.reduce((sum, d) => sum + d.amount, 0);
}

/** Interest the active Deposits will pay, if each reaches its Maturity. */
export function pendingInterest(activeDeposits: DepositWithBank[]): number {
  return activeDeposits.reduce((sum, d) => sum + d.interest, 0);
}

/** Interest already banked by the matured Deposits. */
export function receivedInterest(maturedDeposits: DepositWithBank[]): number {
  return maturedDeposits.reduce((sum, d) => sum + d.interest, 0);
}

/** The active portfolio's rate, weighted by principal rather than averaged flat. */
export function averageRate(activeDeposits: DepositWithBank[]): number {
  if (activeDeposits.length === 0) return 0;
  const weighted = activeDeposits.reduce((sum, d) => sum + d.interest_rate * d.amount, 0);
  const total = activeDeposits.reduce((sum, d) => sum + d.amount, 0);
  return weighted / total;
}

/** What the active portfolio earns on a typical day, on a 365-day year. */
export function interestPerDay(activeDeposits: DepositWithBank[]): number {
  if (activeDeposits.length === 0) return 0;
  return activeDeposits.reduce((sum, d) => {
    return sum + (d.amount * (d.interest_rate / 100)) / 365;
  }, 0);
}

const chartColors = [
  "blue.4",
  "cyan.6",
  "teal.6",
  "grape.6",
  "pink.6",
  "orange.6",
  "yellow.6",
  "lime.6",
  "green.6",
  "violet.6",
];

export interface BankDistributionItem {
  name: string;
  value: number;
  color: string;
  pct: number;
}

/**
 * Principal or interest per Bank, biggest first, with each slice's share of the
 * whole. A Bank whose name is unknown still gets a wedge: no banks loaded yet is
 * not the same as no deposits.
 */
export function bankDistribution(
  deposits: DepositWithBank[],
  bankMap: Map<string, string>,
  groupBy: "amount" | "interest",
  scope: "active" | "all",
): BankDistributionItem[] {
  if (bankMap.size === 0) return [];
  const source = scope === "active" ? splitActive(deposits).active : deposits;
  const grouped = new Map<string, number>();
  source.forEach((d) => {
    const val = groupBy === "amount" ? d.amount : d.interest;
    grouped.set(d.bank_id, (grouped.get(d.bank_id) ?? 0) + val);
  });
  const total = Array.from(grouped.values()).reduce((s, v) => s + v, 0);
  return Array.from(grouped.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([bankId, value], i) => ({
      name: bankMap.get(bankId) ?? "未知",
      value,
      color: chartColors[i % chartColors.length],
      pct: total > 0 ? Math.round((value / total) * 100) : 0,
    }));
}

export interface BankStat {
  bankId: string;
  bankName: string;
  activeCount: number;
  activeAmount: number;
  maturedCount: number;
  maturedAmount: number;
  pendingInterest: number;
  receivedInterest: number;
}

/** The same split as the distribution, but per Bank and not merged away. */
export function bankStats(deposits: DepositWithBank[], bankMap: Map<string, string>): BankStat[] {
  if (bankMap.size === 0) return [];
  const grouped = new Map<string, Omit<BankStat, "bankId" | "bankName">>();
  deposits.forEach((d) => {
    const entry = grouped.get(d.bank_id) ?? {
      activeCount: 0,
      activeAmount: 0,
      maturedCount: 0,
      maturedAmount: 0,
      pendingInterest: 0,
      receivedInterest: 0,
    };
    if (isMatured(d.end_date)) {
      entry.maturedCount += 1;
      entry.maturedAmount += d.amount;
      entry.receivedInterest += d.interest;
    } else {
      entry.activeCount += 1;
      entry.activeAmount += d.amount;
      entry.pendingInterest += d.interest;
    }
    grouped.set(d.bank_id, entry);
  });
  return Array.from(grouped.entries())
    .map(([bankId, data]) => ({
      bankId,
      bankName: bankMap.get(bankId) ?? "未知",
      ...data,
    }))
    .sort((a, b) => b.activeAmount + b.maturedAmount - (a.activeAmount + a.maturedAmount));
}

export interface TermBucket {
  name: string;
  value: number;
  color: string;
}

/** Active principal, grouped by Term length. Empty buckets are left out. */
export function termDistribution(activeDeposits: DepositWithBank[]): TermBucket[] {
  const buckets: Record<string, TermBucket> = {
    short: { name: "短期（<6個月）", value: 0, color: "green.6" },
    medium: { name: "中期（6-12個月）", value: 0, color: "blue.4" },
    long: { name: "長期（1年以上）", value: 0, color: "grape.6" },
  };
  activeDeposits.forEach((d) => {
    const months = periodInMonths(d.period_value, d.period_unit);
    if (months < 6) buckets.short.value += d.amount;
    else if (months < 12) buckets.medium.value += d.amount;
    else buckets.long.value += d.amount;
  });
  return Object.values(buckets).filter((b) => b.value > 0);
}

export interface GrowthItem {
  month: string;
  累計利息: number;
}

/**
 * Interest earned to the end of each month, running from the earliest date any
 * Deposit touches to the latest. A Deposit still running contributes the slice
 * of its interest that falls in the month so far, pro-rated across its Term.
 */
export function cumulativeInterestByMonth(deposits: DepositWithBank[]): GrowthItem[] {
  if (deposits.length === 0) return [];
  const sorted = [...deposits]
    .flatMap((d) => [dayjs(d.start_date), dayjs(d.end_date)])
    .sort((a, b) => a.valueOf() - b.valueOf());
  const minDate = sorted[0].startOf("month");
  const maxDate = sorted[sorted.length - 1].endOf("month");
  const result: GrowthItem[] = [];
  let cursor = minDate;
  while (cursor.isBefore(maxDate) || cursor.isSame(maxDate, "month")) {
    const monthEnd = cursor.endOf("month");
    let cumulative = 0;
    deposits.forEach((d) => {
      const start = dayjs(d.start_date, "YYYY-MM-DD", true);
      const end = dayjs(d.end_date, "YYYY-MM-DD", true);
      if (end.isBefore(monthEnd) || end.isSame(monthEnd, "day")) {
        cumulative += d.interest;
      } else if (start.isBefore(monthEnd) || start.isSame(monthEnd, "day")) {
        const totalDays = end.diff(start, "day");
        const elapsedDays = monthEnd.diff(start, "day");
        if (totalDays > 0) cumulative += d.interest * Math.min(elapsedDays / totalDays, 1);
      }
    });
    result.push({
      month: cursor.format("YYYY-MM"),
      累計利息: Math.round(cumulative * 100) / 100,
    });
    cursor = cursor.add(1, "month");
  }
  return result;
}

export interface MaturityMonth {
  month: string;
  value: number;
}

/** How much matures in this month and the next five, zero included. */
export function maturityTimeline(
  deposits: DepositWithBank[],
  maturityGroupBy: "amount" | "interest",
  now: dayjs.Dayjs = dayjs(),
): MaturityMonth[] {
  const grouped = new Map<string, number>();
  deposits.forEach((d) => {
    const val = maturityGroupBy === "amount" ? d.amount : d.interest;
    const key = monthKey(d.end_date);
    grouped.set(key, (grouped.get(key) ?? 0) + val);
  });
  const months: MaturityMonth[] = [];
  for (let i = 0; i < 6; i++) {
    const key = monthKeyOf(now.add(i, "month"));
    months.push({ month: monthLabelShort(key), value: grouped.get(key) ?? 0 });
  }
  return months;
}

/** Active Deposits, soonest Maturity first. */
export function upcomingDeposits(activeDeposits: DepositWithBank[]): DepositWithBank[] {
  return [...activeDeposits].sort((a, b) => a.end_date.localeCompare(b.end_date));
}

/** Deposits that matured in the last seven days, earliest first. */
export function recentlyMatured(
  maturedDeposits: DepositWithBank[],
  now: dayjs.Dayjs = dayjs(),
): DepositWithBank[] {
  const weekAgo = now.subtract(7, "day");
  return maturedDeposits
    .filter((d) => dayjs(d.end_date, "YYYY-MM-DD", true).isAfter(weekAgo))
    .sort((a, b) => a.end_date.localeCompare(b.end_date));
}

export interface YearSummaryItem {
  year: string;
  count: number;
  amount: number;
  pending: number;
  received: number;
}

/**
 * Deposits grouped by the calendar year they start in or mature in, each row
 * splitting its interest into what has been received and what is still pending.
 */
export function yearSummary(
  deposits: DepositWithBank[],
  yearGroupMode: "start" | "end",
): YearSummaryItem[] {
  const yearDateField = yearGroupMode === "start" ? "start_date" : "end_date";
  const grouped = new Map<
    string,
    { count: number; amount: number; pending: number; received: number }
  >();
  deposits.forEach((d) => {
    const year = dayjs(d[yearDateField]).format("YYYY");
    const entry = grouped.get(year) ?? { count: 0, amount: 0, pending: 0, received: 0 };
    entry.count += 1;
    entry.amount += d.amount;
    if (isMatured(d.end_date)) {
      entry.received += d.interest;
    } else {
      entry.pending += d.interest;
    }
    grouped.set(year, entry);
  });
  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, data]) => ({ year, ...data }));
}

/** The summary reduced to what the year chart draws. */
export function yearChartData(summary: YearSummaryItem[]): { year: string; amount: number }[] {
  return summary.map((y) => ({ year: y.year, amount: y.amount }));
}
