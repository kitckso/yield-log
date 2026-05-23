import { useEffect, useMemo } from "react";
import { useDepositsStore } from "../store/deposits";
import { useBanksStore } from "../store/banks";
import { isMatured } from "./useCalculations";
import dayjs from "dayjs";

const chartColors = [
  "blue.6",
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

interface TermBucket {
  name: string;
  value: number;
  color: string;
}

interface GrowthItem {
  month: string;
  累計利息: number;
}

interface MaturityMonth {
  month: string;
  金額: number;
}

interface YearSummaryItem {
  year: string;
  count: number;
  amount: number;
  pending: number;
  received: number;
}

interface BankStat {
  bankId: string;
  bankName: string;
  activeCount: number;
  activeAmount: number;
  maturedCount: number;
  maturedAmount: number;
  pendingInterest: number;
  receivedInterest: number;
}

export interface HomePageData {
  loading: boolean;
  bankMap: Map<string, string>;
  activeDeposits: import("../types").DepositWithBank[];
  maturedDeposits: import("../types").DepositWithBank[];
  activeAmount: number;
  pendingInterest: number;
  totalReceivedInterest: number;
  avgRate: number;
  bankDistribution: BankDistributionItem[];
  termDistribution: TermBucket[];
  growthData: GrowthItem[];
  maturityTimeline: MaturityMonth[];
  upcoming: import("../types").DepositWithBank[];
  recentlyMatured: import("../types").DepositWithBank[];
  yearSummary: YearSummaryItem[];
  yearChartData: { year: string; amount: number }[];
  bankStats: BankStat[];
}

export function useHomePageData(
  groupBy: "amount" | "interest",
  scope: "active" | "all",
  yearGroupMode: "start" | "end",
): HomePageData {
  const { deposits, loading, fetchDeposits } = useDepositsStore();
  const { banks, fetchBanks } = useBanksStore();

  useEffect(() => {
    void fetchDeposits();
    void fetchBanks();
  }, [fetchDeposits, fetchBanks]);

  const bankMap = useMemo(() => {
    const map = new Map<string, string>();
    banks.forEach((b) => map.set(b.id, b.name));
    return map;
  }, [banks]);

  const activeDeposits = useMemo(() => deposits.filter((d) => !isMatured(d.end_date)), [deposits]);

  const maturedDeposits = useMemo(() => deposits.filter((d) => isMatured(d.end_date)), [deposits]);

  const activeAmount = useMemo(
    () => activeDeposits.reduce((sum, d) => sum + d.amount, 0),
    [activeDeposits],
  );

  const pendingInterest = useMemo(
    () => activeDeposits.reduce((sum, d) => sum + d.interest, 0),
    [activeDeposits],
  );

  const totalReceivedInterest = useMemo(
    () => maturedDeposits.reduce((sum, d) => sum + d.interest, 0),
    [maturedDeposits],
  );

  const avgRate = useMemo(() => {
    if (activeDeposits.length === 0) return 0;
    const weighted = activeDeposits.reduce((sum, d) => sum + d.interest_rate * d.amount, 0);
    const total = activeDeposits.reduce((sum, d) => sum + d.amount, 0);
    return weighted / total;
  }, [activeDeposits]);

  const bankDistribution = useMemo(() => {
    const source = scope === "active" ? activeDeposits : deposits;
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
  }, [deposits, activeDeposits, bankMap, groupBy, scope]);

  const termDistribution = useMemo(() => {
    const monthMap: Record<string, number> = {
      days: 1 / 30,
      weeks: 7 / 30,
      months: 1,
      years: 12,
    };
    const buckets: Record<string, TermBucket> = {
      short: { name: "短期（<6個月）", value: 0, color: "green.6" },
      medium: { name: "中期（6-12個月）", value: 0, color: "blue.6" },
      long: { name: "長期（1年以上）", value: 0, color: "grape.6" },
    };
    activeDeposits.forEach((d) => {
      const months = d.period_value * (monthMap[d.period_unit] ?? 1);
      if (months < 6) buckets.short.value += d.amount;
      else if (months < 12) buckets.medium.value += d.amount;
      else buckets.long.value += d.amount;
    });
    return Object.values(buckets).filter((b) => b.value > 0);
  }, [activeDeposits]);

  const growthData = useMemo(() => {
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
  }, [deposits]);

  const maturityTimeline = useMemo(() => {
    const now = dayjs();
    const grouped = new Map<string, number>();
    deposits.forEach((d) => {
      const monthKey = dayjs(d.end_date).format("YYYY-MM");
      grouped.set(monthKey, (grouped.get(monthKey) ?? 0) + d.amount);
    });
    const months: MaturityMonth[] = [];
    for (let i = 0; i < 6; i++) {
      const m = now.add(i, "month");
      const key = m.format("YYYY-MM");
      months.push({ month: m.format("M月"), 金額: grouped.get(key) ?? 0 });
    }
    return months;
  }, [deposits]);

  const upcoming = useMemo(
    () => [...activeDeposits].sort((a, b) => a.end_date.localeCompare(b.end_date)).slice(0, 5),
    [activeDeposits],
  );

  const recentlyMatured = useMemo(() => {
    const weekAgo = dayjs().subtract(7, "day");
    return maturedDeposits
      .filter((d) => dayjs(d.end_date, "YYYY-MM-DD", true).isAfter(weekAgo))
      .sort((a, b) => b.end_date.localeCompare(a.end_date))
      .slice(0, 5);
  }, [maturedDeposits]);

  const yearDateField = yearGroupMode === "start" ? "start_date" : "end_date";

  const yearSummary = useMemo(() => {
    const grouped = new Map<
      string,
      { count: number; amount: number; pending: number; received: number }
    >();
    deposits.forEach((d) => {
      const year = dayjs(d[yearDateField as keyof typeof d] as string).format("YYYY");
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
  }, [deposits, yearDateField]);

  const yearChartData = useMemo(
    () => yearSummary.map((y) => ({ year: y.year, amount: y.amount })),
    [yearSummary],
  );

  const bankStats = useMemo(() => {
    const grouped = new Map<
      string,
      {
        activeCount: number;
        activeAmount: number;
        maturedCount: number;
        maturedAmount: number;
        pendingInterest: number;
        receivedInterest: number;
      }
    >();
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
  }, [deposits, bankMap]);

  return {
    loading,
    bankMap,
    activeDeposits,
    maturedDeposits,
    activeAmount,
    pendingInterest,
    totalReceivedInterest,
    avgRate,
    bankDistribution,
    termDistribution,
    growthData,
    maturityTimeline,
    upcoming,
    recentlyMatured,
    yearSummary,
    yearChartData,
    bankStats,
  };
}
