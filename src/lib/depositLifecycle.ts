import dayjs from "dayjs";
import { formatRelativeDays } from "../hooks/useCalculations";
import type { DepositWithBank } from "../types";

/**
 * Where a Deposit stands relative to today. This is the only place the app
 * decides whether a Deposit has matured — see GLOSSARY.md.
 *
 * A Deposit maturing *today* has matured: the Maturity date counts as reached
 * once the day begins. It shows as 已到期 and sits in the matured totals. The
 * timeline still words it 今日到期 rather than a relative distance, and leaves
 * it undimmed so it reads as the current boundary rather than a stale row.
 */

export type MaturityRelation = "past" | "today" | "tomorrow" | "future";

export interface MaturityStatus {
  /** Days from today to the maturity date. Negative once it is behind us. */
  daysDiff: number;
  relation: MaturityRelation;
  /** True only once the maturity date is strictly in the past. */
  isMatured: boolean;
  maturesToday: boolean;
  maturesTomorrow: boolean;
  /** True for yesterday, used by the timeline's wording table. */
  wasYesterday: boolean;
  /** Timeline wording, e.g. 今日到期 / 3天後到期 / 5天前到期. */
  label: string;
  /** Maturities in the past are shown greyed out. */
  dimmed: boolean;
}

export function maturityStatus(endDate: string, today: dayjs.Dayjs = dayjs()): MaturityStatus {
  const target = maturityDay(endDate);
  const daysDiff = target.diff(today.startOf("day"), "day");
  const wasYesterday = daysDiff === -1;
  const maturesToday = daysDiff === 0;
  const maturesTomorrow = daysDiff === 1;
  const isMatured = daysDiff <= 0;

  const label = maturesToday
    ? "今日到期"
    : wasYesterday
      ? "昨日到期"
      : maturesTomorrow
        ? "明天到期"
        : isMatured
          ? `${formatRelativeDays(daysDiff)}前到期`
          : `${formatRelativeDays(daysDiff)}後到期`;

  return {
    daysDiff,
    relation: maturesToday
      ? "today"
      : wasYesterday
        ? "past"
        : maturesTomorrow
          ? "tomorrow"
          : isMatured
            ? "past"
            : "future",
    isMatured,
    maturesToday,
    maturesTomorrow,
    wasYesterday,
    label,
    // Today is matured like any other, but the timeline leaves it undimmed:
    // the 今日到期 wording already says where it stands.
    dimmed: daysDiff < 0,
  };
}

/**
 * The maturity date as a day. Parsed leniently so a timestamp with a time
 * component still lands on the right day rather than becoming Invalid.
 */
function maturityDay(endDate: string): dayjs.Dayjs {
  return dayjs(endDate).startOf("day");
}

/** True once the maturity date has been reached — today counts as reached. */
export function isMatured(endDate: string, today: dayjs.Dayjs = dayjs()): boolean {
  return !maturityDay(endDate).isAfter(today.startOf("day"));
}

export interface MaturitySplit {
  matured: DepositWithBank[];
  /** Deposits whose maturity date is still ahead. */
  active: DepositWithBank[];
}

export function splitByMaturity(
  deposits: DepositWithBank[],
  today: dayjs.Dayjs = dayjs(),
): MaturitySplit {
  const matured: DepositWithBank[] = [];
  const active: DepositWithBank[] = [];
  const cutoff = today.startOf("day");
  deposits.forEach((d) => {
    (maturityDay(d.end_date).isAfter(cutoff) ? active : matured).push(d);
  });
  return { matured, active };
}
