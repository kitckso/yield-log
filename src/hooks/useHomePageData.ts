import { useEffect, useMemo } from "react";
import { useDepositsStore } from "../store/deposits";
import { useBanksStore } from "../store/banks";
import {
  activeAmount,
  averageRate,
  bankDistribution,
  bankNames,
  bankStats,
  cumulativeInterestByMonth,
  interestPerDay,
  maturityTimeline,
  pendingInterest,
  receivedInterest,
  recentlyMatured,
  splitActive,
  termDistribution,
  upcomingDeposits,
  yearChartData,
  yearSummary,
  type BankDistributionItem,
  type BankStat,
  type GrowthItem,
  type MaturityMonth,
  type TermBucket,
  type YearSummaryItem,
} from "../lib/portfolio";
import type { DepositWithBank } from "../types";

export interface HomePageData {
  loading: boolean;
  /** Why the last fetch failed, or null. */
  error: string | null;
  /** Fetches again, ignoring the cache. */
  retry: () => Promise<void>;
  bankMap: Map<string, string>;
  activeDeposits: DepositWithBank[];
  maturedDeposits: DepositWithBank[];
  activeAmount: number;
  pendingInterest: number;
  totalReceivedInterest: number;
  avgRate: number;
  interestPerDay: number;
  bankDistribution: BankDistributionItem[];
  termDistribution: TermBucket[];
  growthData: GrowthItem[];
  maturityTimeline: MaturityMonth[];
  upcoming: DepositWithBank[];
  recentlyMatured: DepositWithBank[];
  yearSummary: YearSummaryItem[];
  yearChartData: { year: string; amount: number }[];
  bankStats: BankStat[];
}

/**
 * Loads the portfolio and hands back every view the dashboard draws. The
 * arithmetic lives in lib/portfolio; this only fetches, memoises, and wires the
 * four options the user can switch.
 */
export function useHomePageData(
  groupBy: "amount" | "interest",
  scope: "active" | "all",
  yearGroupMode: "start" | "end",
  maturityGroupBy: "amount" | "interest",
): HomePageData {
  const { deposits, loading, error, fetchDeposits } = useDepositsStore();
  const { banks, fetchBanks } = useBanksStore();

  useEffect(() => {
    void fetchDeposits();
    void fetchBanks();
  }, [fetchDeposits, fetchBanks]);

  const bankMap = useMemo(() => bankNames(banks), [banks]);

  const { active: activeDeposits, matured: maturedDeposits } = useMemo(
    () => splitActive(deposits),
    [deposits],
  );

  const activeTotal = useMemo(() => activeAmount(activeDeposits), [activeDeposits]);
  const pending = useMemo(() => pendingInterest(activeDeposits), [activeDeposits]);
  const received = useMemo(() => receivedInterest(maturedDeposits), [maturedDeposits]);
  const avgRate = useMemo(() => averageRate(activeDeposits), [activeDeposits]);
  const perDay = useMemo(() => interestPerDay(activeDeposits), [activeDeposits]);

  const distribution = useMemo(
    () => bankDistribution(deposits, bankMap, groupBy, scope),
    [deposits, bankMap, groupBy, scope],
  );
  const stats = useMemo(() => bankStats(deposits, bankMap), [deposits, bankMap]);
  const terms = useMemo(() => termDistribution(activeDeposits), [activeDeposits]);
  const growth = useMemo(() => cumulativeInterestByMonth(deposits), [deposits]);
  const timeline = useMemo(
    () => maturityTimeline(deposits, maturityGroupBy),
    [deposits, maturityGroupBy],
  );
  const nextUp = useMemo(() => upcomingDeposits(activeDeposits), [activeDeposits]);
  const justMatured = useMemo(() => recentlyMatured(maturedDeposits), [maturedDeposits]);
  const byYear = useMemo(() => yearSummary(deposits, yearGroupMode), [deposits, yearGroupMode]);
  const byYearChart = useMemo(() => yearChartData(byYear), [byYear]);

  return {
    loading,
    error,
    retry: () => fetchDeposits(true),
    bankMap,
    activeDeposits,
    maturedDeposits,
    activeAmount: activeTotal,
    pendingInterest: pending,
    totalReceivedInterest: received,
    avgRate,
    interestPerDay: perDay,
    bankDistribution: distribution,
    termDistribution: terms,
    growthData: growth,
    maturityTimeline: timeline,
    upcoming: nextUp,
    recentlyMatured: justMatured,
    yearSummary: byYear,
    yearChartData: byYearChart,
    bankStats: stats,
  };
}
