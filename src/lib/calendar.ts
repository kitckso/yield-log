import dayjs from "dayjs";
import { addPeriod, periodInDays } from "./period";
import { isMatured, splitByMaturity } from "./depositLifecycle";
import { emptyMonth, groupByMonth, monthKey, yearMonthKeys, yearOf } from "./monthKey";
import type { MonthGroup } from "./monthKey";
import type { DepositWithBank } from "../types";

export interface MonthSplit {
  passed: DepositWithBank[];
  future: DepositWithBank[];
  passedAmount: number;
  passedInterest: number;
  futureAmount: number;
  futureInterest: number;
}

/**
 * Every month of a year, whether or not anything matures in it — a year-scoped
 * calendar wants a row for each. Within a month, deposits run in maturity order.
 */
export function buildMonthGroups(deposits: DepositWithBank[], year: number): MonthGroup[] {
  const byKey = new Map(groupByMonth(deposits, "end_date").map((g) => [g.key, g]));
  return yearMonthKeys(year).map((key) => {
    const group = byKey.get(key);
    if (!group) return emptyMonth(key);
    return {
      ...group,
      deposits: [...group.deposits].sort((a, b) => a.end_date.localeCompare(b.end_date)),
    };
  });
}

export function sumYearTotals(months: MonthGroup[]): {
  yearTotalAmount: number;
  yearTotalInterest: number;
} {
  return {
    yearTotalAmount: months.reduce((s, m) => s + m.totalAmount, 0),
    yearTotalInterest: months.reduce((s, m) => s + m.totalInterest, 0),
  };
}

/**
 * Advances a deposit by one term and returns the maturity date plus the number
 * of days that term covers. Months and years use actual elapsed days so the
 * rollover interest stays consistent with month lengths and leap years.
 */
function advanceTerm(
  currentEnd: dayjs.Dayjs,
  periodValue: number,
  periodUnit: DepositWithBank["period_unit"],
): { nextEnd: dayjs.Dayjs; termDays: number } {
  return {
    nextEnd: addPeriod(currentEnd, periodValue, periodUnit),
    termDays: periodInDays(periodValue, periodUnit),
  };
}

/**
 * Total interest projected to Dec 31 of `year`: interest already maturing that
 * year plus every rollover cycle of an active deposit that matures again before
 * year end. Returns null when `year` is not the current year, since the
 * projection is only meaningful going forward.
 */
export function projectDec31Interest(
  deposits: DepositWithBank[],
  year: number,
  yearTotalInterest: number,
  currentYear: number = dayjs().year(),
): number | null {
  if (year !== currentYear) return null;

  const yearEnd = dayjs().year(year).endOf("year");
  let rolloverTotal = 0;

  deposits.forEach((d) => {
    if (isMatured(d.end_date)) return;
    const end = dayjs(d.end_date);
    if (end.isAfter(yearEnd)) return;

    let currentEnd = end;
    for (;;) {
      const { nextEnd, termDays: fixedDays } = advanceTerm(
        currentEnd,
        d.period_value,
        d.period_unit,
      );
      const termDays = fixedDays || nextEnd.diff(currentEnd, "day");
      if (nextEnd.isAfter(yearEnd)) break;
      rolloverTotal += d.amount * (d.interest_rate / 100) * (termDays / 365);
      currentEnd = nextEnd;
    }
  });

  return Math.round((yearTotalInterest + rolloverTotal) * 100) / 100;
}

export function splitMonthByToday(deposits: DepositWithBank[]): MonthSplit {
  const { matured, active } = splitByMaturity(deposits);
  return {
    passed: matured,
    future: active,
    passedAmount: matured.reduce((s, d) => s + d.amount, 0),
    passedInterest: matured.reduce((s, d) => s + d.interest, 0),
    futureAmount: active.reduce((s, d) => s + d.amount, 0),
    futureInterest: active.reduce((s, d) => s + d.interest, 0),
  };
}

export function isPastMonth(
  year: number,
  month: number,
  currentYear: number,
  currentMonth: number,
) {
  return year < currentYear || (year === currentYear && month < currentMonth);
}

export function hasDepositsInYear(deposits: DepositWithBank[], year: number): boolean {
  return deposits.some((d) => yearOf(monthKey(d.end_date)) === year);
}
