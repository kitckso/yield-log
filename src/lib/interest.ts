import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { addPeriod } from "./period";

dayjs.extend(customParseFormat);

/**
 * What a Deposit earns, and when it matures. Interest accrues on a 365-day
 * year; the two rounding policies differ only in what they do with a fraction
 * of a cent.
 */

/** Interest accrued over a term, floored to the cent. */
export function calculateInterest(
  amount: number,
  rate: number,
  startDate: string,
  endDate: string,
): number {
  return floorToCent(accruedInterest(amount, rate, startDate, endDate));
}

/** Interest accrued over a term, rounded to the nearest cent. */
export function calculateInterestRounded(
  amount: number,
  rate: number,
  startDate: string,
  endDate: string,
): number {
  return roundToCent(accruedInterest(amount, rate, startDate, endDate));
}

/** The Maturity date a Term after `startDate` reaches. */
export function calculateEndDate(
  startDate: string,
  periodValue: number,
  periodUnit: string,
): string {
  const start = dayjs(startDate, "YYYY-MM-DD", true);
  return addPeriod(start, periodValue, periodUnit).format("YYYY-MM-DD");
}

function accruedInterest(amount: number, rate: number, startDate: string, endDate: string): number {
  const start = dayjs(startDate, "YYYY-MM-DD", true);
  const end = dayjs(endDate, "YYYY-MM-DD", true);
  const days = end.diff(start, "day");
  return amount * (rate / 100) * (days / 365);
}

function floorToCent(amount: number): number {
  return Math.floor(amount * 100) / 100;
}

function roundToCent(amount: number): number {
  return Math.round(amount * 100) / 100;
}
